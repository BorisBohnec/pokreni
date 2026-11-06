/* PoKreni training logic: plain functions with no DOM, so tests/logic.test.js can check them in Node. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const dkey = d => { d = d || new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k));
  const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
  /* Weeks start on Monday. */
  const weekStart = k => { const d = parseKey(k); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return dkey(d); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* ---------- readiness (PAR-Q style) ---------- */
  const READINESS_QS = ['heart', 'chest', 'dizzy', 'chronic', 'meds', 'joint', 'supervised'];
  /* Blood pressure at or above 144/94 also means "check with your doctor first". */
  function bpHigh(r) { const s = num(r && r.bpSys), d = num(r && r.bpDia); return (s != null && s >= 144) || (d != null && d >= 94); }
  function readiness(r) {
    if (!r || !r.answeredAt || !r.answers) return 'todo';
    const anyYes = READINESS_QS.some(q => r.answers[q] === true) || bpHigh(r);
    if (!anyYes) return 'clear';
    return r.cleared ? 'cleared' : 'doctor';
  }

  /* ---------- programme ---------- */
  function sessionsIn(sessions, programId) { return (sessions || []).filter(s => s && s.end && s.program === programId).length; }
  /* The first 4 sessions of a programme use at most 2 sets per exercise, then the full count. */
  function setsFor(item, doneInProgram) {
    if (item.finisher) return 1;
    return doneInProgram < 4 ? Math.min(2, item.sets) : item.sets;
  }
  function roundKg(kg, step) { const s = step || 1; return Math.max(0, Math.round(kg / s) * s); }

  /* What to aim for today. lift = the stored state for that exercise. */
  function target(ex, item, lift, opts) {
    opts = opts || {};
    lift = lift || {};
    let sets = setsFor(item, opts.doneInProgram || 0);
    if (opts.lighter && !item.finisher) sets = Math.max(1, sets - 1);
    const t = { sets, lighter: !!opts.lighter };
    if (item.mins) { t.mins = item.mins; return t; }
    if (ex.kind === 'load') { t.kg = lift.kg != null ? lift.kg : null; t.reps = clamp(lift.reps || item.reps[0], item.reps[0], item.reps[1]); }
    else if (ex.kind === 'bw') t.reps = clamp(lift.reps || item.reps[0], item.reps[0], item.reps[1]);
    else if (ex.kind === 'time') t.secs = clamp(lift.secs || item.secs[0], item.secs[0], item.secs[1]);
    else if (ex.kind === 'carry') { t.kg = lift.kg != null ? lift.kg : null; t.secs = clamp(lift.secs || item.secs[0], item.secs[0], item.secs[1]); }
    return t;
  }

  const painZone = p => (p == null || p <= 3 ? 'green' : p <= 5 ? 'yellow' : 'red');

  /*
   * Double progression. perf = { sets: [{ kg, reps, secs, rir, done }], planned, pain }.
   * Returns { lift, change: { code, ... } } where code is one of:
   * up (more weight next time), reps (aim for one more rep), hold, down (back off after two missed sessions),
   * pain-hold, pain-down, harder (ready for the harder variant), top (at the top of the range), none.
   */
  function evaluate(ex, item, lift, perf) {
    const prev = Object.assign({ misses: 0, hits: 0 }, lift || {});
    const done = (perf && perf.sets || []).filter(s => s && s.done);
    const pain = perf && perf.pain != null ? +perf.pain : 0;
    const planned = Math.max(1, (perf && perf.planned) || done.length || 1);
    if (!done.length || item.mins) return { lift: lift || null, change: { code: 'none' } };
    const step = ex.step || (ex.kind === 'carry' ? 2 : 2.5);
    const out = Object.assign({}, prev, { last: perf.date || prev.last || null });
    const failSet = s => s.rir === 0;

    if (ex.kind === 'load' || ex.kind === 'carry') {
      const workKg = num(done[done.length - 1].kg);
      const kg = workKg != null ? workKg : (prev.kg || 0);
      out.kg = kg;
      if (pain >= 6) { out.kg = roundKg(kg * 0.8, step); out.misses = 0; resetLow(out, item); return { lift: out, change: { code: 'pain-down', from: kg, to: out.kg } }; }
      if (pain >= 4) { keepTarget(out, prev, item); return { lift: out, change: { code: 'pain-hold', kg } }; }
      if (ex.kind === 'load') {
        const [lo, hi] = item.reps;
        const allTop = done.length >= planned && done.every(s => (+s.reps || 0) >= hi && !failSet(s));
        const fail = done.some(s => (+s.reps || 0) < lo || failSet(s));
        if (allTop) { out.kg = kg + step; out.reps = lo; out.misses = 0; return { lift: out, change: { code: 'up', from: kg, to: out.kg } }; }
        if (fail) return missed(out, kg, step, () => { out.reps = lo; }, { reps: prev.reps || lo });
        const minReps = Math.min(...done.map(s => +s.reps || 0));
        out.reps = clamp(minReps + 1, lo, hi); out.misses = 0;
        return { lift: out, change: { code: 'reps', reps: out.reps, kg } };
      }
      const [lo, hi] = item.secs;
      const allTop = done.length >= planned && done.every(s => (+s.secs || 0) >= hi && !failSet(s));
      if (allTop) { out.kg = kg + step; out.secs = lo; out.misses = 0; return { lift: out, change: { code: 'up', from: kg, to: out.kg } }; }
      const minS = Math.min(...done.map(s => +s.secs || 0));
      out.secs = clamp(Math.max(minS, prev.secs || lo) + 5, lo, hi);
      return { lift: out, change: { code: 'reps', secs: out.secs, kg } };
    }

    if (ex.kind === 'bw' || ex.kind === 'time') {
      const key = ex.kind === 'bw' ? 'reps' : 'secs';
      const [lo, hi] = item[key];
      const inc = key === 'reps' ? 1 : 5;
      if (pain >= 4) { out[key] = clamp(prev[key] || lo, lo, hi); return { lift: out, change: { code: pain >= 6 ? 'pain-down' : 'pain-hold' } }; }
      const vals = done.map(s => +s[key] || 0);
      const allTop = done.length >= planned && vals.every(v => v >= hi) && !done.some(failSet);
      if (allTop) {
        out[key] = hi; out.hits = (prev.hits || 0) + 1;
        if (ex.harder && out.hits >= 2) return { lift: out, change: { code: 'harder', to: ex.harder } };
        return { lift: out, change: { code: 'top' } };
      }
      out.hits = 0;
      if (vals.some(v => v < lo) || done.some(failSet)) { out[key] = clamp(prev[key] || lo, lo, hi); return { lift: out, change: { code: 'hold' } }; }
      out[key] = clamp(Math.min(...vals) + inc, lo, hi);
      return { lift: out, change: { code: 'reps', [key]: out[key] } };
    }
    return { lift: out, change: { code: 'none' } };
  }
  function resetLow(out, item) { if (item.reps) out.reps = item.reps[0]; if (item.secs) out.secs = item.secs[0]; }
  function keepTarget(out, prev, item) { if (item.reps) out.reps = clamp(prev.reps || item.reps[0], item.reps[0], item.reps[1]); if (item.secs) out.secs = clamp(prev.secs || item.secs[0], item.secs[0], item.secs[1]); }
  function missed(out, kg, step, reset, keep) {
    out.misses = (out.misses || 0) + 1;
    if (out.misses >= 2) { out.kg = roundKg(Math.max(0, kg - step), step); out.misses = 0; reset(); return { lift: out, change: { code: 'down', from: kg, to: out.kg } }; }
    Object.assign(out, keep);
    return { lift: out, change: { code: 'hold', kg } };
  }

  /* ---------- energy ---------- */
  /* Active kcal on top of resting: (MET - 1) × kg × hours. Strength training ~3.5 MET. */
  const activeKcal = (met, kg, minutes) => Math.max(0, Math.round((met - 1) * (kg || 80) * (minutes || 0) / 60));
  const STRENGTH_MET = 3.5;

  /* ---------- weeks ---------- */
  function sessionMinutes(s) { if (!s || !s.start || !s.end) return 0; return Math.max(0, Math.round((Date.parse(s.end) - Date.parse(s.start)) / 60000)); }
  function finisherMinutes(s) {
    let m = 0;
    (s.items || []).forEach(it => { if (it.mins) (it.sets || []).forEach(x => { if (x.done) m += +x.mins || +it.mins || 0; }); });
    return m;
  }
  /* ext: { 'YYYY-MM-DD': minutes } of workouts recorded by other apps (watch, Samsung Health). */
  function weekStats(data, weekKey, ext) {
    const end = addDays(weekKey, 7);
    const inWeek = k => k >= weekKey && k < end;
    const days = new Set(); let cardio = 0;
    (data.sessions || []).forEach(s => { if (s.end && inWeek(s.date)) { days.add(s.date); cardio += finisherMinutes(s); } });
    (data.cardio || []).forEach(c => { if (inWeek(c.date)) cardio += +c.minutes || 0; });
    if (ext) for (const k in ext) if (inWeek(k)) cardio += +ext[k] || 0;
    return { strengthDays: days.size, cardioMin: Math.round(cardio) };
  }
  function weeksBack(data, today, n, ext) {
    const ws = weekStart(today), out = [];
    for (let i = n - 1; i >= 0; i--) { const k = addDays(ws, -7 * i); out.push(Object.assign({ week: k }, weekStats(data, k, ext))); }
    return out;
  }

  /* ---------- lesson checks that the app can verify from your log ---------- */
  function autoCheck(id, data, today, ext) {
    const sessions = (data.sessions || []).filter(s => s.end);
    if (id === 'L11') {
      const byWeek = {};
      (data.cardio || []).forEach(c => { if ((+c.minutes || 0) >= 20) { const w = weekStart(c.date); byWeek[w] = (byWeek[w] || 0) + 1; } });
      if (ext) for (const k in ext) if ((+ext[k] || 0) >= 20) { const w = weekStart(k); byWeek[w] = (byWeek[w] || 0) + 1; }
      const best = Math.max(0, ...Object.values(byWeek));
      return { ok: best >= 3, have: Math.min(best, 3), need: 3 };
    }
    if (id === 'L12') return { ok: sessions.length >= 6, have: Math.min(sessions.length, 6), need: 6 };
    if (id === 'L15') {
      const best = Math.max(0, ...weeksBack(data, today, 12, ext).map(w => w.cardioMin));
      return { ok: best >= 150, have: Math.min(best, 150), need: 150 };
    }
    if (id === 'L18') { const n = (data.baselines || []).length; return { ok: n >= 2, have: Math.min(n, 2), need: 2 }; }
    return null;
  }

  function retestStatus(baselines, today) {
    if (!baselines || !baselines.length) return { code: 'baseline' };
    const last = baselines[baselines.length - 1].date;
    const days = daysBetween(last, today);
    return days >= 28 ? { code: 'due', days } : { code: 'ok', days, next: addDays(last, 28) };
  }

  /* Best set of each finished session for one exercise, oldest first. */
  function liftHistory(data, exId) {
    const out = [];
    (data.sessions || []).filter(s => s.end).sort((a, b) => (a.start < b.start ? -1 : 1)).forEach(s => {
      (s.items || []).forEach(it => {
        if (it.ex !== exId) return;
        const done = (it.sets || []).filter(x => x.done);
        if (!done.length) return;
        const best = done.reduce((a, b) => ((+b.kg || 0) > (+a.kg || 0) || ((+b.kg || 0) === (+a.kg || 0) && (+b.reps || +b.secs || 0) > (+a.reps || +a.secs || 0)) ? b : a));
        out.push({ date: s.date, kg: +best.kg || 0, reps: +best.reps || 0, secs: +best.secs || 0 });
      });
    });
    return out;
  }

  return { pad, dkey, isKey, parseKey, addDays, daysBetween, weekStart, clamp, num, READINESS_QS, bpHigh, readiness,
    sessionsIn, setsFor, roundKg, target, painZone, evaluate, activeKcal, STRENGTH_MET, sessionMinutes, finisherMinutes,
    weekStats, weeksBack, autoCheck, retestStatus, liftHistory };
});
