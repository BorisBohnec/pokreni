const test = require('node:test');
const assert = require('node:assert/strict');
const PK = require('../www/logic.js');
const EX = require('../www/data/exercises.js');
const PR = require('../www/data/programs.js');

const ex = id => EX.byId[id];
const set = (kg, reps, rir) => ({ kg, reps, rir, done: true });

test('readiness: no answers, all no, a yes, cleared, high blood pressure', () => {
  assert.equal(PK.readiness(null), 'todo');
  const no = Object.fromEntries(PK.READINESS_QS.map(q => [q, false]));
  assert.equal(PK.readiness({ answeredAt: '2026-11-07', answers: no }), 'clear');
  assert.equal(PK.readiness({ answeredAt: '2026-11-07', answers: { ...no, joint: true } }), 'doctor');
  assert.equal(PK.readiness({ answeredAt: '2026-11-07', answers: { ...no, joint: true }, cleared: true }), 'cleared');
  assert.equal(PK.readiness({ answeredAt: '2026-11-07', answers: no, bpSys: 150, bpDia: 85 }), 'doctor');
  assert.equal(PK.readiness({ answeredAt: '2026-11-07', answers: no, bpSys: 130, bpDia: 85 }), 'clear');
});

test('first four sessions use at most two sets', () => {
  const item = { ex: 'goblet_squat', sets: 3, reps: [8, 12] };
  assert.equal(PK.setsFor(item, 0), 2);
  assert.equal(PK.setsFor(item, 3), 2);
  assert.equal(PK.setsFor(item, 4), 3);
  assert.equal(PK.target(ex('goblet_squat'), item, null, { doneInProgram: 5, lighter: true }).sets, 2);
});

test('double progression: all sets at the top of the range adds weight and resets reps', () => {
  const item = { ex: 'goblet_squat', sets: 3, reps: [8, 12] };
  const r = PK.evaluate(ex('goblet_squat'), item, { kg: 12, reps: 11 }, { sets: [set(12, 12, 2), set(12, 12, 2), set(12, 12, 1)], planned: 3, pain: 0 });
  assert.equal(r.change.code, 'up');
  assert.equal(r.lift.kg, 14);
  assert.equal(r.lift.reps, 8);
});

test('double progression: inside the range aims for one more rep at the same weight', () => {
  const item = { ex: 'chest_press', sets: 3, reps: [8, 12] };
  const r = PK.evaluate(ex('chest_press'), item, { kg: 30, reps: 8 }, { sets: [set(30, 10, 2), set(30, 9, 2), set(30, 9, 1)], planned: 3, pain: 0 });
  assert.equal(r.change.code, 'reps');
  assert.equal(r.lift.kg, 30);
  assert.equal(r.lift.reps, 10);
});

test('not all planned sets done: no weight increase even at the top', () => {
  const item = { ex: 'chest_press', sets: 3, reps: [8, 12] };
  const r = PK.evaluate(ex('chest_press'), item, { kg: 30 }, { sets: [set(30, 12, 2), set(30, 12, 2)], planned: 3 });
  assert.notEqual(r.change.code, 'up');
});

test('a failed set holds once, then backs off after a second miss', () => {
  const item = { ex: 'lat_pulldown', sets: 3, reps: [10, 12] };
  const first = PK.evaluate(ex('lat_pulldown'), item, { kg: 40, reps: 10 }, { sets: [set(40, 10, 1), set(40, 8, 0)], planned: 2 });
  assert.equal(first.change.code, 'hold');
  assert.equal(first.lift.kg, 40);
  const second = PK.evaluate(ex('lat_pulldown'), item, first.lift, { sets: [set(40, 9, 0), set(40, 8, 0)], planned: 2 });
  assert.equal(second.change.code, 'down');
  assert.equal(second.lift.kg, 35);
  assert.equal(second.lift.misses, 0);
});

test('pain: 4-5 holds, 6+ drops the weight by about 20%', () => {
  const item = { ex: 'leg_press', sets: 3, reps: [10, 12] };
  const y = PK.evaluate(ex('leg_press'), item, { kg: 100, reps: 11 }, { sets: [set(100, 12, 2), set(100, 12, 2), set(100, 12, 2)], planned: 3, pain: 5 });
  assert.equal(y.change.code, 'pain-hold');
  assert.equal(y.lift.kg, 100);
  const r = PK.evaluate(ex('leg_press'), item, { kg: 100, reps: 11 }, { sets: [set(100, 12, 2)], planned: 3, pain: 7 });
  assert.equal(r.change.code, 'pain-down');
  assert.equal(r.lift.kg, 80);
  assert.equal(PK.painZone(2), 'green'); assert.equal(PK.painZone(4), 'yellow'); assert.equal(PK.painZone(6), 'red');
});

test('bodyweight: reps climb, then two sessions at the top suggest the harder version', () => {
  const item = { ex: 'incline_pushup', sets: 2, reps: [8, 12] };
  const bw = (reps, rir = 2) => ({ reps, rir, done: true });
  const a = PK.evaluate(ex('incline_pushup'), item, null, { sets: [bw(9), bw(8)], planned: 2 });
  assert.equal(a.change.code, 'reps'); assert.equal(a.lift.reps, 9);
  const b = PK.evaluate(ex('incline_pushup'), item, a.lift, { sets: [bw(12), bw(12)], planned: 2 });
  assert.equal(b.change.code, 'top');
  const c = PK.evaluate(ex('incline_pushup'), item, b.lift, { sets: [bw(12), bw(12)], planned: 2 });
  assert.equal(c.change.code, 'harder'); assert.equal(c.change.to, 'pushup');
});

test('timed holds add 5 seconds', () => {
  const item = { ex: 'plank', sets: 2, secs: [20, 40] };
  const r = PK.evaluate(ex('plank'), item, { secs: 20 }, { sets: [{ secs: 25, done: true }, { secs: 22, done: true }], planned: 2 });
  assert.equal(r.lift.secs, 27);
});

test('carries: reach the time target, then add weight', () => {
  const item = { ex: 'farmer_carry', sets: 2, secs: [30, 45] };
  const r = PK.evaluate(ex('farmer_carry'), item, { kg: 16, secs: 40 }, { sets: [{ kg: 16, secs: 45, done: true }, { kg: 16, secs: 45, done: true }], planned: 2 });
  assert.equal(r.change.code, 'up'); assert.equal(r.lift.kg, 18); assert.equal(r.lift.secs, 30);
});

test('week stats count strength days, cardio minutes, finishers and other apps', () => {
  const data = {
    sessions: [
      { date: '2026-11-09', start: '2026-11-09T16:30:00Z', end: '2026-11-09T17:20:00Z', items: [{ ex: 'bike_stationary', mins: 10, sets: [{ mins: 10, done: true }] }] },
      { date: '2026-11-11', start: '2026-11-11T16:30:00Z', end: '2026-11-11T17:15:00Z', items: [] },
      { date: '2026-11-16', start: '2026-11-16T16:30:00Z', end: '2026-11-16T17:15:00Z', items: [] }
    ],
    cardio: [{ date: '2026-11-10', minutes: 30 }, { date: '2026-11-15', minutes: 25 }]
  };
  const w = PK.weekStats(data, '2026-11-09', { '2026-11-12': 40 });
  assert.deepEqual(w, { strengthDays: 2, cardioMin: 105 });
  assert.equal(PK.weekStart('2026-11-15'), '2026-11-09');
  assert.equal(PK.weekStart('2026-11-09'), '2026-11-09');
});

test('automatic lesson checks', () => {
  const data = { sessions: [], cardio: [{ date: '2026-11-09', minutes: 20 }, { date: '2026-11-10', minutes: 25 }, { date: '2026-11-12', minutes: 30 }], baselines: [{ date: '2026-11-07' }] };
  assert.equal(PK.autoCheck('L11', data, '2026-11-12').ok, true);
  assert.equal(PK.autoCheck('L12', data, '2026-11-12').ok, false);
  assert.equal(PK.autoCheck('L18', data, '2026-11-12').ok, false);
  assert.equal(PK.retestStatus(data.baselines, '2026-12-05').code, 'due');
  assert.equal(PK.retestStatus(data.baselines, '2026-11-20').code, 'ok');
});

test('active kcal estimate', () => {
  assert.equal(PK.activeKcal(3.5, 120, 60), 300);
  assert.equal(PK.activeKcal(1, 120, 60), 0);
});

test('data: every programme exercise and alternative exists, with both languages', () => {
  for (const p of Object.values(PR.programs)) for (const t of p.templates) for (const it of t.items) {
    assert.ok(EX.byId[it.ex], `${p.id}/${t.key}: ${it.ex}`);
    const e = EX.byId[it.ex];
    if (!it.mins) assert.ok(e.kind === 'cardio' || it.reps || it.secs, `${it.ex} needs reps or secs`);
    if (e.kind === 'load' || e.kind === 'bw') assert.ok(it.reps, `${it.ex} needs reps`);
    if (e.kind === 'time' || e.kind === 'carry') assert.ok(it.secs, `${it.ex} needs secs`);
  }
  for (const e of EX.list) {
    for (const f of ['name', 'muscles', 'cues', 'mistakes']) { assert.ok(e[f] && e[f].en != null && e[f].hr != null, `${e.id}.${f}`); }
    assert.equal(e.cues.en.length, e.cues.hr.length, `${e.id} cue count`);
    assert.equal(e.mistakes.en.length, e.mistakes.hr.length, `${e.id} mistake count`);
    for (const a of (e.alts || []).concat(e.easier || [], e.harder || [])) assert.ok(EX.byId[a], `${e.id} -> ${a}`);
    if (e.kind === 'cardio') assert.equal(e.met.length, 3);
  }
});

test('i18n: English and Croatian have the same keys, and every key the app uses exists', () => {
  const I = require('../www/i18n.js');
  const fs = require('node:fs');
  const en = Object.keys(I.en).sort(), hr = Object.keys(I.hr).sort();
  assert.deepEqual(hr.filter(k => !I.en[k]), [], 'keys only in hr');
  assert.deepEqual(en.filter(k => !(k in I.hr)), [], 'keys missing in hr');
  const src = fs.readFileSync(require.resolve('../www/app.js'), 'utf8');
  const used = [...src.matchAll(/\bt\('([A-Za-z0-9_]+)'\s*[,)]/g)].map(m => m[1]);
  const dynamic = [];
  for (let i = 0; i < 7; i++) dynamic.push('dow' + i, 'dowS' + i);
  for (let i = 0; i < 12; i++) dynamic.push('mon' + i);
  [0, 1, 2].forEach(i => dynamic.push('effort' + i));
  ['wall', 'bench', 'floor'].forEach(v => dynamic.push('push_' + v));
  PK.READINESS_QS.forEach(q => dynamic.push('rq_' + q));
  ['green', 'yellow', 'red', 'emergency'].forEach(z => dynamic.push('z_' + z));
  ['painFine', 'painMeh', 'painSharp', 'easier', 'harder', 'tRestHr', 'tWaist', 'tWalk', 'tChair', 'tPush', 'tPlank'].forEach(k => dynamic.push(k));
  ['tRestHr', 'tWaist', 'tWalk', 'tChair', 'tPush', 'tPlank'].forEach(k => dynamic.push(k + 'How'));
  const missing = [...new Set(used.concat(dynamic))].filter(k => !(k in I.en));
  assert.deepEqual(missing, []);
});

test('lessons: 19 lessons, both languages, quiz answers valid, linked exercises exist', () => {
  const L = require('../www/data/lessons.js');
  assert.equal(L.list.length, 19);
  for (const l of L.list) {
    assert.ok(l.title.en && l.title.hr && l.task.en && l.task.hr, l.id);
    assert.equal(l.body.en.length, l.body.hr.length, `${l.id} block count`);
    l.body.en.forEach((b, i) => { const h = l.body.hr[i]; assert.equal(typeof b, typeof h, `${l.id} block ${i}`); if (b.list) assert.equal(b.list.length, h.list.length, `${l.id} list ${i}`); });
    (l.links || []).forEach(x => assert.ok(EX.byId[x], `${l.id} -> ${x}`));
    if (l.check.type === 'quiz') l.quiz.forEach(q => assert.ok(['green', 'yellow', 'red', 'emergency'].includes(q.a)));
    if (l.check.type === 'auto') assert.ok(PK.autoCheck(l.id, { sessions: [], cardio: [], baselines: [] }, '2026-11-07'), `${l.id} has an auto check`);
  }
});

test('native listeners only go through listen(): addListener() is not a Promise on Android', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(require.resolve('../www/app.js'), 'utf8');
  const uses = src.split('\n').filter(l => /\.addListener\(/.test(l) && !/plugin\.addListener/.test(l) && !/function listen/.test(l));
  assert.deepEqual(uses, []);
});
