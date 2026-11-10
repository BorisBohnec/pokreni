/* PoKreni 1.6: exercise search, exercises named in a question, watch data through Health Connect. */
const test = require('node:test');
const assert = require('node:assert/strict');
const PK = require('../www/logic.js');
global.PK = PK;
const COACH = require('../www/coach.js');
const EX = require('../www/data/exercises.js');
const LS = require('../www/data/lessons.js');
const PR = require('../www/data/programs.js');
const B = require('../www/data/body.js');

const extra = e => { const m = B.EXM[e.id]; return m ? m.p.concat(m.s).map(id => `${B.byId[id].en} ${B.byId[id].hr}`).join(' ') : ''; };
const ids = (q, x) => PK.searchExercises(EX.list, q, x).map(e => e.id);

test('search finds exercises by either language, without accents, by muscle, in any word order', () => {
  assert.equal(PK.fold('Čučanj Đak ŠĆŽ'), 'cucanj dak scz');
  assert.deepEqual(ids('cucanj'), ['box_squat', 'goblet_squat']);
  assert.deepEqual(ids('ČUČANJ'), ['box_squat', 'goblet_squat']);
  assert.deepEqual(ids('bench'), ['db_bench']);
  assert.ok(ids('push up').includes('pushup') && ids('push up').includes('incline_pushup'));
  assert.ok(ids('sklek').includes('pushup'));
  assert.deepEqual(ids('row dumbbell'), ids('dumbbell row'));
  for (const q of ['chest', 'prsa']) assert.ok(ids(q, extra).includes('chest_press'), q);
  assert.ok(ids('hamstrings', extra).includes('db_rdl'));
  assert.equal(ids('').length, EX.list.length);
  assert.deepEqual(ids('zzzz'), []);
});

test('exercises named in a question are found, the longest name wins', () => {
  const f = q => PK.exercisesIn(q, EX.list).map(e => e.id);
  assert.deepEqual(f('Explain the Incline push-up exercise and what weight you recommend for me.'), ['incline_pushup']);
  assert.deepEqual(f('Objasni vježbu Goblet čučanj i koju težinu mi preporučuješ.'), ['goblet_squat']);
  assert.deepEqual(f('Explain the Push-up exercise'), ['pushup']);
  assert.deepEqual(f('How was my week?'), []);
});

test('watch: Zepp records are recognised, steps are summed and averaged', () => {
  assert.equal(PK.watchStatus({}), null);
  assert.equal(PK.watchStatus({ sources: { 'com.sec.android.app.shealth|steps': '2026-11-10T08:00:00.000Z' } }), null);
  const w = PK.watchStatus({ sources: { 'com.huami.watch.hmwatchmanager|steps': '2026-11-10T08:00:00.000Z', 'com.huami.watch.hmwatchmanager|sleep': '2026-11-10T05:10:00.000Z' } });
  assert.equal(w.app, 'Zepp (Amazfit)');
  assert.equal(w.last, '2026-11-10T08:00:00.000Z');
  assert.deepEqual(Object.keys(w.kinds).sort(), ['sleep', 'steps']);
  assert.deepEqual(PK.stepsSummary({ '2026-11-10': 3200, '2026-11-09': 8000, '2026-11-08': 6000, '2026-11-01': 9999 }, '2026-11-10'), { today: 3200, avg: 7000, days: 2 });
  assert.deepEqual(PK.stepsSummary(null, '2026-11-10'), { today: 0, avg: 0, days: 0 });
  assert.equal(PK.appName('com.example.fitapp'), 'fitapp');
});

test('coach gets the asked exercise\'s history and the watch data', () => {
  const D = {
    profile: {}, readiness: null, baselines: [], program: { id: 'foundations', next: 0 }, lifts: { goblet_squat: { kg: 14, reps: 8 } }, cardio: [], injuries: [],
    sessions: [{ id: 's1', name: { en: 'A' }, date: '2026-11-03', start: '2026-11-03T15:00:00Z', end: '2026-11-03T16:00:00Z', items: [{ ex: 'goblet_squat', sets: [{ kg: 12, reps: 10, done: true }, { kg: 12, reps: 9, done: true }] }] },
      { id: 's2', name: { en: 'A' }, date: '2026-11-07', start: '2026-11-07T15:00:00Z', end: '2026-11-07T16:00:00Z', items: [{ ex: 'goblet_squat', sets: [{ kg: 14, reps: 8, done: true }] }] }],
    hc: { sleep: { '2026-11-10': 5.4 }, steps: { '2026-11-10': 4100, '2026-11-09': 9000 }, rhr: { bpm: 61, date: '2026-11-10', low: false },
      extList: [{ date: '2026-11-08', start: '2026-11-08T09:00:00Z', mins: 42, app: 'com.huami.watch.hmwatchmanager', title: '' }],
      sources: { 'com.huami.watch.hmwatchmanager|sleep': '2026-11-10T05:00:00.000Z' } },
    coach: { msgs: [] }
  };
  const o = q => ({ today: '2026-11-10', appLang: 'en', question: q, EX, LS, PR, B, lessonDone: () => false, nextTemplate: { name: { en: 'Full body B' }, items: [] } });
  const p = COACH.buildPrompt(D, o('Explain the Goblet squat exercise and what weight you recommend for me.')).prompt;
  for (const s of ['They asked about Goblet squat', '2026-11-07 14 kg × 8; 2026-11-03 12 kg × 10', "The app's next target: 14 kg × 8",
    'Sleep last night (from their Zepp (Amazfit) watch via Health Connect): 5.4 h', 'Steps (from their Zepp (Amazfit) watch via Health Connect): 4100 so far today; 9000 a day',
    'Resting heart rate 61 bpm', '2026-11-08 workout 42 min (Zepp (Amazfit))'])
    assert.ok(p.includes(s), 'missing: ' + s);
  const q = COACH.buildPrompt(D, o('Explain the Hip thrust exercise and what weight you recommend for me.')).prompt;
  assert.ok(q.includes("They asked about Hip thrust (weight × reps, usual jump") && q.includes("haven't logged it yet"));
});
