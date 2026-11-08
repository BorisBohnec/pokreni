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

  /* ---------- body map ---------- */
  /* Sets per muscle from finished sessions dated from..to (inclusive). A set counts 1 for a main muscle and 0.5
     for a supporting one. B = PK_BODY. Cardio and finishers don't count. */
  function muscleSets(sessions, B, from, to) {
    const out = {}; B.muscleIds.forEach(m => { out[m] = 0; });
    (sessions || []).forEach(s => {
      if (!s || !s.end || s.date < from || s.date > to) return;
      (s.items || []).forEach(it => {
        if (!it || it.mins) return;
        const tag = B.EXM[it.ex]; if (!tag) return;
        const n = (it.sets || []).filter(x => x && x.done).length; if (!n) return;
        tag.p.forEach(m => { out[m] += n; }); tag.s.forEach(m => { out[m] += n / 2; });
      });
    });
    return out;
  }
  /* Colour level 0–5 from sets per week. */
  function muscleLevel(perWeek) { const v = +perWeek || 0; return v <= 0 ? 0 : v <= 2 ? 1 : v <= 4 ? 2 : v <= 6 ? 3 : v <= 9 ? 4 : 5; }

  /* Ranks reward steady weeks, not piles of sets: a week counts when a muscle gets RANK_SETS or more. */
  const RANKS = [{ id: 'start', weeks: 1 }, { id: 'bronze', weeks: 2 }, { id: 'silver', weeks: 4 }, { id: 'gold', weeks: 8 }, { id: 'diamond', weeks: 16 }];
  const RANK_SETS = 3;
  function rankFor(weeks) { let r = null; RANKS.forEach(x => { if (weeks >= x.weeks) r = x.id; }); return r; }
  function muscleRanks(sessions, B, today) {
    const fin = (sessions || []).filter(s => s && s.end && isKey(s.date));
    const thisWeek = weekStart(today);
    const out = {};
    const firstWeek = fin.length ? weekStart(fin.reduce((a, s) => (s.date < a ? s.date : a), fin[0].date)) : thisWeek;
    const n = Math.max(1, Math.round(daysBetween(firstWeek, thisWeek) / 7) + 1);
    const weeks = [];
    for (let i = 0; i < n; i++) { const w = addDays(firstWeek, 7 * i); weeks.push(muscleSets(fin, B, w, addDays(w, 6))); }
    B.muscleIds.forEach(m => {
      const met = weeks.map(w => w[m] >= RANK_SETS);
      const cur = met[n - 1];
      let streak = 0;
      for (let i = cur ? n - 1 : n - 2; i >= 0 && met[i]; i--) streak++;
      let best = 0, run = 0;
      met.forEach(x => { run = x ? run + 1 : 0; best = Math.max(best, run); });
      const rank = rankFor(streak);
      const nxt = RANKS.find(x => x.weeks > streak) || null;
      out[m] = { streak, best, rank, next: nxt ? { id: nxt.id, need: nxt.weeks - streak } : null,
        thisWeek: weeks[n - 1][m], metThisWeek: !!cur, atRisk: !cur && streak > 0, ever: weeks.some(w => w[m] > 0) };
    });
    return out;
  }
  /* The least-trained muscles over the last `days`, once there are at least 2 sessions to judge from. */
  function leastTrained(sessions, B, today, days) {
    days = days || 28;
    const from = addDays(today, -(days - 1));
    const sets = muscleSets(sessions, B, from, today);
    const count = (sessions || []).filter(s => s && s.end && s.date >= from && s.date <= today).length;
    const perWeekFloor = 1.5 * days / 7;
    const list = B.muscleIds.slice().sort((a, b) => sets[a] - sets[b] || B.muscleIds.indexOf(a) - B.muscleIds.indexOf(b))
      .filter(m => sets[m] < perWeekFloor).slice(0, 3);
    return { enough: count >= 2, sessions: count, sets, list };
  }

  /* ---------- injuries ---------- */
  /* injuries: [{ area, side, level: 'ease' | 'avoid', since, note }]. An exercise is hit hard when the area is one of
     its main muscles or loaded joints, lightly when it's a supporting muscle. Avoid + hard = leave it out;
     avoid + light or ease + hard = ease off; ease + light = fine. */
  function injuryHit(exId, injuries, B) {
    const tag = B.EXM[exId]; const res = { level: null, areas: [] };
    if (!tag || !injuries || !injuries.length) return res;
    injuries.forEach(inj => {
      if (!inj || !inj.area) return;
      const hard = tag.p.includes(inj.area) || tag.j.includes(inj.area), light = tag.s.includes(inj.area);
      let lv = null;
      if (inj.level === 'avoid') lv = hard ? 'avoid' : light ? 'ease' : null;
      else if (inj.level === 'ease') lv = hard ? 'ease' : null;
      if (!lv) return;
      if (!res.areas.includes(inj.area)) res.areas.push(inj.area);
      if (lv === 'avoid' || !res.level) res.level = lv;
    });
    return res;
  }
  /* The standard item for an exercise: taken from the programmes when it's in one, otherwise sensible defaults. */
  function defaultItem(exId, EX, PR) {
    const ex = EX.byId[exId]; if (!ex) return null;
    if (PR) for (const pid of Object.keys(PR.programs)) for (const tpl of PR.programs[pid].templates) {
      const it = tpl.items.find(x => x.ex === exId && !x.finisher);
      if (it) { const c = { ex: exId, sets: it.sets, rest: it.rest }; if (it.reps) c.reps = it.reps.slice(); if (it.secs) c.secs = it.secs.slice(); return c; }
    }
    const iso = ex.pattern === 'iso', core = ex.pattern === 'core';
    if (ex.kind === 'time') return { ex: exId, sets: 2, secs: [20, 40], rest: 45 };
    if (ex.kind === 'carry') return { ex: exId, sets: 2, secs: [30, 45], rest: 60 };
    if (core) return { ex: exId, sets: 2, reps: [6, 10], rest: 45 };
    if (iso) return { ex: exId, sets: 2, reps: [10, 15], rest: 60 };
    return { ex: exId, sets: 3, reps: [8, 12], rest: ex.kind === 'bw' ? 60 : 90 };
  }
  /* Apply injuries to a session's items. Returns { items, skipped }. Each changed item gets
     inj: { how: 'swap' | 'ease', areas, from } and ease: true when it should be lighter. */
  function adjustForInjuries(items, injuries, ctx) {
    const B = ctx.B, EX = ctx.EX, PR = ctx.PR;
    const out = [], skipped = [];
    const used = new Set(items.map(i => i.ex));
    items.forEach(orig => {
      const it = Object.assign({}, orig);
      if (it.finisher || it.mins) { out.push(it); return; }
      const hit = injuryHit(it.ex, injuries, B);
      if (!hit.level) { out.push(it); return; }
      if (hit.level === 'ease') { it.ease = true; it.inj = { how: 'ease', areas: hit.areas }; out.push(it); return; }
      const ex = EX.byId[it.ex];
      /* Same movement first, then anything that trains the same main muscles. */
      const prim = B.EXM[it.ex] ? B.EXM[it.ex].p : [];
      const shared = EX.list.filter(e => B.EXM[e.id] && B.EXM[e.id].p.some(m => prim.includes(m))).map(e => e.id);
      const cands = [...new Set([].concat(ex.alts || [], ex.easier ? [ex.easier] : [], EX.list.filter(e => e.pattern === ex.pattern).map(e => e.id), shared))]
        .filter(id => id !== it.ex && EX.byId[id] && EX.byId[id].kind !== 'cardio' && B.EXM[id] && !used.has(id));
      const scored = cands.map(id => ({ id, h: injuryHit(id, injuries, B) })).filter(c => c.h.level !== 'avoid');
      const pick = scored.find(c => !c.h.level) || scored[0];
      if (!pick) { skipped.push({ ex: it.ex, areas: hit.areas }); return; }
      const rep = Object.assign(defaultItem(pick.id, EX, PR), { sets: it.sets });
      if (it.focus) rep.focus = true;
      rep.inj = { how: 'swap', areas: hit.areas, from: it.ex };
      if (pick.h.level === 'ease') rep.ease = true;
      used.add(pick.id);
      out.push(rep);
    });
    return { items: out, skipped };
  }

  /* ---------- focus blocks and custom workouts ---------- */
  const focusActive = (f, today) => !!(f && f.muscle && f.ex && isKey(f.start) && today >= f.start && today < addDays(f.start, 7 * (f.weeks || 3)));
  const focusWeek = (f, today) => Math.floor(daysBetween(f.start, today) / 7) + 1;
  /* The add-on exercise for a focus block: trains the muscle directly, isn't blocked by an injury, and prefers
     small isolation moves and exercises you already have numbers for. */
  function pickFocusExercise(muscle, ctx, exclude) {
    const B = ctx.B, EX = ctx.EX, ex = new Set(exclude || []);
    const c = EX.list.filter(e => e.kind !== 'cardio' && B.EXM[e.id] && B.EXM[e.id].p.includes(muscle) && !ex.has(e.id))
      .map(e => { const h = injuryHit(e.id, ctx.injuries, B); return { e, h, score: (e.pattern === 'iso' || e.pattern === 'core' ? 2 : 0) + (ctx.lifts && ctx.lifts[e.id] ? 1 : 0) - (h.level === 'ease' ? 3 : 0) - B.EXM[e.id].p.length * 0.3 }; })
      .filter(x => x.h.level !== 'avoid').sort((a, b) => b.score - a.score);
    return c.length ? c[0].e.id : null;
  }
  /* Rule-based workout for some muscles: exercises that train them directly first, then ones that help,
     never one blocked by an injury, big lifts first. Returns items with sets, reps or secs and rest. */
  function buildWorkout(muscles, ctx, max) {
    const B = ctx.B, EX = ctx.EX, PR = ctx.PR, target = new Set(muscles || []);
    max = max || 5;
    const prefer = new Set(ctx.prefer || []);
    const cands = EX.list.filter(e => e.kind !== 'cardio' && B.EXM[e.id]).map(e => {
      const tag = B.EXM[e.id];
      const p = tag.p.filter(m => target.has(m)).length, s = tag.s.filter(m => target.has(m)).length;
      if (!p && !s) return null;
      const h = injuryHit(e.id, ctx.injuries, B);
      if (h.level === 'avoid') return null;
      const big = e.pattern !== 'iso' && e.pattern !== 'core' && e.pattern !== 'carry';
      const known = !!(ctx.lifts && ctx.lifts[e.id]) || prefer.has(e.id);
      /* Harder versions (push-up, split squat) only once you've done them or they're in your programme. */
      const tooHard = e.easier && !known;
      return { e, p, h, score: p * 2 + s * 0.5 + (ctx.lifts && ctx.lifts[e.id] ? 0.6 : 0) + (prefer.has(e.id) ? 0.5 : 0) + (big ? 0.4 : 0) - (tooHard ? 1 : 0) - (h.level === 'ease' ? 1 : 0), big };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    /* Full body: one exercise per movement so it isn't three squats. Legs or upper body: two. One area (back,
       chest): up to four, since a back day is mostly pulls. Small moves (isolation, core, carries): up to four. */
    const bigCap = target.size >= 7 ? 1 : target.size >= 3 ? 2 : 4;
    const picked = [], covered = new Set();
    const add = c => { picked.push(c); B.EXM[c.e.id].p.forEach(m => covered.add(m)); };
    const room = c => !picked.includes(c) && picked.filter(x => x.e.pattern === c.e.pattern).length < (c.big ? bigCap : 4);
    for (const m of muscles || []) {
      if (picked.length >= max) break;
      if (covered.has(m)) continue;
      const c = cands.find(x => x.p && room(x) && B.EXM[x.e.id].p.includes(m));
      if (c) add(c);
    }
    for (const c of cands) { if (picked.length >= max) break; if (c.p && room(c)) add(c); }
    for (const c of cands) { if (picked.length >= Math.min(4, max)) break; if (room(c)) add(c); }
    const order = c => (c.big ? 0 : c.e.pattern === 'iso' ? 1 : 2);
    picked.sort((a, b) => order(a) - order(b) || b.score - a.score);
    return picked.map((c, i) => {
      const it = defaultItem(c.e.id, EX, PR);
      it.sets = c.big && i < 2 ? 3 : 2;
      if (c.h.level === 'ease') { it.ease = true; it.inj = { how: 'ease', areas: c.h.areas }; }
      return it;
    });
  }
  /* Checks a workout the coach wrote: { title, items: [{ id, sets }] }. Unknown, duplicate, cardio and injury-blocked
     exercises are dropped; sets are kept to 1–4; reps and weights come from the app, not the AI. */
  function validateWorkout(w, ctx) {
    const B = ctx.B, EX = ctx.EX, PR = ctx.PR;
    const res = { ok: false, title: '', items: [], dropped: [] };
    if (!w || typeof w !== 'object' || !Array.isArray(w.items)) return res;
    res.title = String(w.title || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const seen = new Set();
    w.items.slice(0, 10).forEach(x => {
      const id = String((x && (x.id || x.ex)) || '').trim();
      if (!EX.byId[id] || !B.EXM[id]) { if (id) res.dropped.push({ id, why: 'unknown' }); return; }
      if (seen.has(id)) return;
      const h = injuryHit(id, ctx.injuries, B);
      if (h.level === 'avoid') { res.dropped.push({ id, why: 'injury', areas: h.areas }); return; }
      if (res.items.length >= 7) return;
      seen.add(id);
      const it = defaultItem(id, EX, PR);
      const sets = Math.round(+x.sets);
      if (sets >= 1) it.sets = clamp(sets, 1, 4);
      if (h.level === 'ease') { it.ease = true; it.inj = { how: 'ease', areas: h.areas }; }
      res.items.push(it);
    });
    res.ok = res.items.length >= 2;
    return res;
  }
  function validateFocus(f, ctx) {
    if (!f || typeof f !== 'object') return null;
    const muscle = String(f.muscle || '').trim();
    if (!ctx.B.muscleIds.includes(muscle)) return null;
    const ex = pickFocusExercise(muscle, ctx);
    if (!ex) return null;
    return { muscle, ex, weeks: clamp(Math.round(+f.weeks) || 3, 2, 4) };
  }
  /* Which muscle groups a request mentions ("back workout", "trening za noge"). "Lower back" isn't the back group. */
  function groupsIn(text, B) {
    const s = String(text || '').toLowerCase().replace(/lower back|low back|donj\w* (dio |dijel\w* )?le[dđ]\w*|kri[žz]\w*/g, ' ');
    return B.GROUPS.filter(g => g.re.test(s)).map(g => g.id);
  }

  /* A YouTube id from a link (watch, youtu.be, shorts, embed, live) or a bare 11-character id; '' if none. */
  function ytId(s) {
    s = String(s || '').trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  return { ytId, pad, dkey, isKey, parseKey, addDays, daysBetween, weekStart, clamp, num, READINESS_QS, bpHigh, readiness,
    sessionsIn, setsFor, roundKg, target, painZone, evaluate, activeKcal, STRENGTH_MET, sessionMinutes, finisherMinutes,
    weekStats, weeksBack, autoCheck, retestStatus, liftHistory,
    muscleSets, muscleLevel, RANKS, RANK_SETS, rankFor, muscleRanks, leastTrained,
    injuryHit, defaultItem, adjustForInjuries, focusActive, focusWeek, pickFocusExercise, buildWorkout, validateWorkout, validateFocus, groupsIn };
});
