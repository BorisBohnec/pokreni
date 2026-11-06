package app.borisbohnec.hcbridge

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import java.io.File

/**
 * Lets PoKreni and Tanjur read each other's summary directly, without Health Connect.
 *
 * Each app writes share.json into its private files folder (the same folder as its data file). This provider,
 * at content://<applicationId>.share/share, returns that file's text as a one-row cursor with a "json" column,
 * and only to the two companion apps. Everything else is refused.
 */
class ShareProvider : ContentProvider() {
    override fun onCreate(): Boolean = true

    private fun allowed(): Boolean {
        val caller = callingPackage ?: return false
        return caller in COMPANIONS || caller == context?.packageName
    }

    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor? {
        if (!allowed()) throw SecurityException("Not a companion app")
        val ctx = context ?: return null
        val file = File(ctx.filesDir, FILE_NAME)
        val cursor = MatrixCursor(arrayOf("json"))
        if (file.exists()) cursor.addRow(arrayOf(file.readText()))
        return cursor
    }

    override fun getType(uri: Uri): String = "application/json"
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0

    companion object {
        const val FILE_NAME = "share.json"
        val COMPANIONS = setOf("app.tanjur.tracker", "app.pokreni.trainer")
    }
}
