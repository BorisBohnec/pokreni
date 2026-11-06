package app.borisbohnec.hcbridge

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.MealType
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Mass
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import java.time.ZoneOffset

/**
 * Health Connect add-on shared by PoKreni and Tanjur.
 *
 * @capgo/capacitor-health reads most things but can't write exercise sessions, and writes nutrition
 * as energy only. This plugin fills those gaps. Every record carries a clientRecordId, so writing the
 * same id again updates the record instead of duplicating it, and deleting by id removes it.
 */
@CapacitorPlugin(name = "HcBridge")
class HcBridgePlugin : Plugin() {
    private val scope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main.immediate +
            CoroutineExceptionHandler { _, t -> Log.e(TAG, "Unhandled failure", t) }
    )
    private val permissionContract = PermissionController.createRequestPermissionResultContract()

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.cancel()
    }

    private fun PluginCall.launchSafe(block: suspend PluginCall.() -> Unit) {
        val call = this
        scope.launch {
            try {
                call.block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: SecurityException) {
                call.reject(e.message ?: "Permission missing", "PERMISSION", e)
            } catch (e: Throwable) {
                Log.e(TAG, "Health Connect call failed", e)
                call.reject(e.message ?: "Health Connect call failed", "FAILED", e as? Exception ?: Exception(e))
            }
        }
    }

    private fun client(call: PluginCall): HealthConnectClient? {
        val status = HealthConnectClient.getSdkStatus(context)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is not available on this phone.", "UNAVAILABLE")
            return null
        }
        return HealthConnectClient.getOrCreate(context)
    }

    private fun offset(i: Instant): ZoneOffset = ZoneId.systemDefault().rules.getOffset(i)

    private fun meta(id: String, version: Long): Metadata = Metadata.manualEntry(clientRecordId = id, clientRecordVersion = version)

    private fun strings(arr: JSArray?): List<String> {
        if (arr == null) return emptyList()
        val out = ArrayList<String>()
        for (i in 0 until arr.length()) arr.optString(i)?.takeIf { it.isNotBlank() }?.let { out.add(it) }
        return out
    }

    private fun objects(arr: JSArray?): List<JSONObject> {
        if (arr == null) return emptyList()
        val out = ArrayList<JSONObject>()
        for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { out.add(it) }
        return out
    }

    // ---------- availability and permissions ----------

    @PluginMethod
    fun status(call: PluginCall) {
        val sdk = HealthConnectClient.getSdkStatus(context)
        val res = JSObject()
        res.put("available", sdk == HealthConnectClient.SDK_AVAILABLE)
        res.put("sdkStatus", sdk)
        if (sdk != HealthConnectClient.SDK_AVAILABLE) {
            res.put("granted", JSArray())
            call.resolve(res)
            return
        }
        call.launchSafe {
            val granted = HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
            res.put("granted", JSArray(granted.toList()))
            resolve(res)
        }
    }

    /** permissions: full names, e.g. "android.permission.health.WRITE_EXERCISE". */
    @PluginMethod
    fun requestHealthAccess(call: PluginCall) {
        val wanted = strings(call.getArray("permissions")).toSet()
        val c = client(call) ?: return
        call.launchSafe {
            val granted = c.permissionController.getGrantedPermissions()
            if (wanted.isEmpty() || granted.containsAll(wanted)) {
                resolve(JSObject().put("granted", JSArray(granted.toList())))
                return@launchSafe
            }
            val intent = permissionContract.createIntent(context, wanted)
            startActivityForResult(this, intent, "onAccessResult")
        }
    }

    @ActivityCallback
    private fun onAccessResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        call.launchSafe {
            val granted = HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
            resolve(JSObject().put("granted", JSArray(granted.toList())))
        }
    }

    // ---------- exercise sessions ----------

    private fun exerciseType(name: String?): Int = when (name) {
        "strength" -> ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
        "walking" -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
        "biking" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
        "bikingStationary" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY
        "elliptical" -> ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL
        "rowing" -> ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE
        else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
    }

    /**
     * { id, version, start, end (ISO instants), type, title?, notes?, kcal? }
     * Writes the session plus an active-calories record over the same span, so apps that read workouts
     * (Tanjur, Samsung Health) see the energy. Resolves { kcalWritten }.
     */
    @PluginMethod
    fun writeExercise(call: PluginCall) {
        val id = call.getString("id")
        val start = call.getString("start")?.let { Instant.parse(it) }
        val end = call.getString("end")?.let { Instant.parse(it) }
        if (id.isNullOrBlank() || start == null || end == null || !end.isAfter(start)) {
            call.reject("id, start and a later end are required", "ARGS")
            return
        }
        val version = call.getDouble("version")?.toLong() ?: System.currentTimeMillis()
        val c = client(call) ?: return
        call.launchSafe {
            val session = ExerciseSessionRecord(
                startTime = start,
                startZoneOffset = offset(start),
                endTime = end,
                endZoneOffset = offset(end),
                metadata = meta(id, version),
                exerciseType = exerciseType(getString("type")),
                title = getString("title")?.take(120),
                notes = getString("notes")?.take(1000)
            )
            val kcal = getDouble("kcal") ?: 0.0
            var kcalWritten = false
            if (kcal > 0) {
                val energy = ActiveCaloriesBurnedRecord(
                    startTime = start,
                    startZoneOffset = offset(start),
                    endTime = end,
                    endZoneOffset = offset(end),
                    energy = Energy.kilocalories(kcal.coerceAtMost(5000.0)),
                    metadata = meta("$id-kcal", version)
                )
                try {
                    c.insertRecords(listOf<Record>(session, energy))
                    kcalWritten = true
                } catch (e: SecurityException) {
                    // Calories permission not granted: still save the session itself.
                    c.insertRecords(listOf<Record>(session))
                }
            } else {
                c.insertRecords(listOf<Record>(session))
            }
            resolve(JSObject().put("kcalWritten", kcalWritten))
        }
    }

    /** { ids: [clientRecordId] } removes those sessions and their calorie records. */
    @PluginMethod
    fun deleteExercise(call: PluginCall) {
        val ids = strings(call.getArray("ids"))
        if (ids.isEmpty()) { call.resolve(); return }
        val c = client(call) ?: return
        call.launchSafe {
            c.deleteRecords(ExerciseSessionRecord::class, emptyList(), ids)
            try {
                c.deleteRecords(ActiveCaloriesBurnedRecord::class, emptyList(), ids.map { "$it-kcal" })
            } catch (e: SecurityException) { /* no calorie access: nothing of ours to remove */ }
            resolve()
        }
    }

    /** { start, end } ISO instants. Resolves { sessions: [{ id, clientId, app, title, type, start, end }] }. */
    @PluginMethod
    fun readSessions(call: PluginCall) {
        val start = call.getString("start")?.let { Instant.parse(it) }
        val end = call.getString("end")?.let { Instant.parse(it) } ?: Instant.now()
        if (start == null) { call.reject("start is required", "ARGS"); return }
        val c = client(call) ?: return
        call.launchSafe {
            val resp = c.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, TimeRangeFilter.between(start, end), pageSize = 500))
            val arr = JSArray()
            resp.records.forEach { r ->
                val o = JSObject()
                o.put("id", r.metadata.id)
                o.put("clientId", r.metadata.clientRecordId ?: "")
                o.put("app", r.metadata.dataOrigin.packageName)
                o.put("title", r.title ?: "")
                o.put("type", r.exerciseType)
                o.put("start", r.startTime.toString())
                o.put("end", r.endTime.toString())
                arr.put(o)
            }
            resolve(JSObject().put("sessions", arr))
        }
    }

    // ---------- nutrition ----------

    private fun mealType(name: String?): Int = when (name) {
        "breakfast" -> MealType.MEAL_TYPE_BREAKFAST
        "lunch" -> MealType.MEAL_TYPE_LUNCH
        "dinner" -> MealType.MEAL_TYPE_DINNER
        "snack" -> MealType.MEAL_TYPE_SNACK
        else -> MealType.MEAL_TYPE_UNKNOWN
    }

    private fun grams(o: JSONObject, key: String): Mass? =
        if (o.has(key) && !o.isNull(key)) o.optDouble(key).takeIf { !it.isNaN() && it >= 0 }?.let { Mass.grams(it.coerceAtMost(10000.0)) } else null

    /** { records: [{ id, version, time (ISO), name?, meal?, kcal, protein, carbs, fat, fiber?, sugar?, satfat? }] } */
    @PluginMethod
    fun writeNutrition(call: PluginCall) {
        val items = objects(call.getArray("records"))
        if (items.isEmpty()) { call.resolve(JSObject().put("written", 0)); return }
        val c = client(call) ?: return
        call.launchSafe {
            val records = items.mapNotNull { o ->
                val id = o.optString("id").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                val t = runCatching { Instant.parse(o.optString("time")) }.getOrNull() ?: return@mapNotNull null
                val kcal = o.optDouble("kcal").takeIf { !it.isNaN() && it >= 0 } ?: 0.0
                NutritionRecord(
                    startTime = t,
                    startZoneOffset = offset(t),
                    endTime = t.plusSeconds(60),
                    endZoneOffset = offset(t.plusSeconds(60)),
                    metadata = meta(id, o.optLong("version", System.currentTimeMillis())),
                    energy = Energy.kilocalories(kcal.coerceAtMost(20000.0)),
                    protein = grams(o, "protein"),
                    totalCarbohydrate = grams(o, "carbs"),
                    totalFat = grams(o, "fat"),
                    dietaryFiber = grams(o, "fiber"),
                    sugar = grams(o, "sugar"),
                    saturatedFat = grams(o, "satfat"),
                    name = o.optString("name").takeIf { it.isNotBlank() }?.take(100),
                    mealType = mealType(o.optString("meal"))
                )
            }
            records.chunked(100).forEach { c.insertRecords(it) }
            resolve(JSObject().put("written", records.size))
        }
    }

    @PluginMethod
    fun deleteNutrition(call: PluginCall) {
        val ids = strings(call.getArray("ids"))
        if (ids.isEmpty()) { call.resolve(); return }
        val c = client(call) ?: return
        call.launchSafe {
            ids.chunked(100).forEach { c.deleteRecords(NutritionRecord::class, emptyList(), it) }
            resolve()
        }
    }

    /** { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } inclusive, local days. Resolves { days: [{ date, kcal, protein }] }. */
    @PluginMethod
    fun readNutritionDays(call: PluginCall) {
        val from = call.getString("from")?.let { LocalDate.parse(it) }
        val to = call.getString("to")?.let { LocalDate.parse(it) }
        if (from == null || to == null || to.isBefore(from)) { call.reject("from and to are required", "ARGS"); return }
        val c = client(call) ?: return
        call.launchSafe {
            val groups = c.aggregateGroupByPeriod(
                AggregateGroupByPeriodRequest(
                    metrics = setOf(NutritionRecord.ENERGY_TOTAL, NutritionRecord.PROTEIN_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(from.atStartOfDay(), to.plusDays(1).atStartOfDay()),
                    timeRangeSlicer = Period.ofDays(1)
                )
            )
            val arr = JSArray()
            groups.forEach { g ->
                val kcal = g.result[NutritionRecord.ENERGY_TOTAL]?.inKilocalories
                val protein = g.result[NutritionRecord.PROTEIN_TOTAL]?.inGrams
                if (kcal == null && protein == null) return@forEach
                val o = JSObject()
                o.put("date", g.startTime.toLocalDate().toString())
                o.put("kcal", kcal ?: 0.0)
                o.put("protein", protein ?: 0.0)
                arr.put(o)
            }
            resolve(JSObject().put("days", arr))
        }
    }

    // ---------- weight ----------

    /** { records: [{ id, version, time (ISO), kg }] } */
    @PluginMethod
    fun writeWeight(call: PluginCall) {
        val items = objects(call.getArray("records"))
        if (items.isEmpty()) { call.resolve(JSObject().put("written", 0)); return }
        val c = client(call) ?: return
        call.launchSafe {
            val records = items.mapNotNull { o ->
                val id = o.optString("id").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                val t = runCatching { Instant.parse(o.optString("time")) }.getOrNull() ?: return@mapNotNull null
                val kg = o.optDouble("kg").takeIf { !it.isNaN() && it in 20.0..400.0 } ?: return@mapNotNull null
                WeightRecord(time = t, zoneOffset = offset(t), weight = Mass.kilograms(kg), metadata = meta(id, o.optLong("version", System.currentTimeMillis())))
            }
            records.chunked(100).forEach { c.insertRecords(it) }
            resolve(JSObject().put("written", records.size))
        }
    }

    @PluginMethod
    fun deleteWeight(call: PluginCall) {
        val ids = strings(call.getArray("ids"))
        if (ids.isEmpty()) { call.resolve(); return }
        val c = client(call) ?: return
        call.launchSafe {
            ids.chunked(100).forEach { c.deleteRecords(WeightRecord::class, emptyList(), it) }
            resolve()
        }
    }

    // ---------- the other app ----------

    /** { url } opens a deep link such as tanjur://today. Resolves { opened } instead of failing. */
    @PluginMethod
    fun openUrl(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) { call.reject("url is required", "ARGS"); return }
        val opened = try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
        call.resolve(JSObject().put("opened", opened))
    }

    /** { pkg } needs a matching <queries><package/></queries> entry in the app manifest. */
    @PluginMethod
    fun isInstalled(call: PluginCall) {
        val pkg = call.getString("pkg")
        val installed = !pkg.isNullOrBlank() && try {
            context.packageManager.getPackageInfo(pkg, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
        call.resolve(JSObject().put("installed", installed))
    }

    companion object {
        private const val TAG = "HcBridge"
    }
}
