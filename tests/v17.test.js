/* PoKreni 1.7: watch workouts that repeat what you logged, and the coach's memory of earlier chats. */
const test = require('node:test');
const assert = require('node:assert/strict');
const PK = require('../www/logic.js');
global.PK = PK;
const COACH = require('../www/coach.js');
const EX = require('../www/data/exercises.js');
const LS = require('../www/data/lessons.js');
const PR = require('../www/data/programs.js');
const B = require('../www/data/body.js');

const Z = 'com.huami.watch.hmwatchmanager';
const ext = (id, date, from, to, typeName, app) => ({ id, date, start: `${date}T${from}:00.000Z`, end: `${date}T${to}:00.000Z`, mins: (Date.parse(`${date}T${to}:00Z`) - Date.parse(`${date}T${from}:00Z`)) / 60000, app: app || Z, typeName, title: '' });
const base = () => ({
  cardio: [{ id: 'c1', type: 'treadmill_walk', date: '2026-11-13', start: '2026-11-13T18:30:00.000Z', minutes: 40 }],
  sessions: [{ id: 's1', name: { en: 'Full body A' }, date: '2026-11-14', start: '2026-11-14T16:00:00.000Z', end: '2026-11-14T16:51:00.000Z', items: [] }],
  hc: { extAll: [] }, settings: {}
});

test('a watch walk logged by hand at another time of day counts once', () => {
  const d = base();
  d.hc.extAll = [ext('z1', '2026-11-13', '07:10', '07:49', 'walking'), ext('z2', '2026-11-10', '07:10', '07:15', 'other')];
  const v = PK.extView(d, EX), z1 = v.find(x => x.id === 'z1');
  assert.equal(z1.counted, false);
  assert.deepEqual([z1.dupOf.kind, z1.dupOf.id], ['cardio', 'c1']);
  assert.deepEqual(PK.extMinutes(v), { '2026-11-10': 5 });
  assert.equal(PK.weekStats(d, '2026-11-09', PK.extMinutes(v)).cardioMin, 45);
});

test('a different kind or length on the same day still counts', () => {
  const d = base();
  d.hc.extAll = [ext('z1', '2026-11-13', '07:00', '08:30', 'walking'), ext('z2', '2026-11-13', '12:00', '12:35', 'biking')];
  assert.deepEqual(PK.extView(d, EX).map(x => [x.id, x.counted]), [['z2', true], ['z1', true]]);
});

test('a watch workout during a PoKreni session is the same session', () => {
  const d = base();
  d.hc.extAll = [ext('z3', '2026-11-14', '16:05', '16:50', 'strength_training'), ext('z4', '2026-11-14', '16:20', '16:25', 'walking')];
  const v = PK.extView(d, EX);
  assert.ok(v.every(x => !x.counted && x.dupOf.kind === 'session'));
});

test('two apps recording the same walk count once; unknown kinds match within 3 hours', () => {
  const d = base(); d.cardio = [];
  d.hc.extAll = [ext('z1', '2026-11-12', '07:00', '07:40', 'walking'), ext('g1', '2026-11-12', '07:01', '07:41', 'walking', 'com.google.android.apps.fitness')];
  assert.deepEqual(PK.extView(d, EX).map(x => [x.id, x.counted]), [['g1', false], ['z1', true]]);
  const e = base();
  e.hc.extAll = [ext('z5', '2026-11-13', '17:00', '17:38', 'other'), ext('z6', '2026-11-13', '09:00', '09:38', 'other')];
  assert.deepEqual(PK.extView(e, EX).map(x => [x.id, x.counted]), [['z5', false], ['z6', true]]);
});

test('your choices win: hide, count anyway, rename', () => {
  const d = base();
  d.hc.extAll = [ext('z1', '2026-11-13', '07:10', '07:49', 'walking'), ext('z2', '2026-11-10', '07:10', '07:15', 'other')];
  d.settings.hcExt = { z1: { hide: false }, z2: { hide: true, name: 'Stairs' } };
  const v = PK.extView(d, EX);
  assert.deepEqual(v.map(x => [x.id, x.counted, x.hidden, x.forced, x.custom]), [['z1', true, false, true, ''], ['z2', false, true, false, 'Stairs']]);
  assert.equal(v[0].dupOf.id, 'c1');
});

test('chat memory: only saved when asked, and only the unsaved part', () => {
  const now = Date.parse('2026-11-14T18:00:00Z');
  const m = (role, at, text) => ({ role, at, text: text || role });
  const C = { msgs: [m('user', now - 10 * 60000, 'How heavy should I squat?'), m('coach', now - 9 * 60000, 'Start at 12 kg <workout>{}</workout>')], mem: [], memOn: true, sumAt: 0 };
  assert.equal(COACH.canSave(C), true);
  assert.equal(COACH.canSave({ msgs: [m('user', now)], mem: [], sumAt: 0 }), false, 'needs an answer too');
  const saved = Object.assign({}, C, { sumAt: now - 9 * 60000 });
  assert.equal(COACH.canSave(saved), false, 'nothing new since the last save');
  saved.msgs = saved.msgs.concat([m('user', now - 60000, 'And lunges?'), m('coach', now, 'Bodyweight first.')]);
  assert.deepEqual(COACH.pendingMsgs(saved).map(x => x.text), ['And lunges?', 'Bodyweight first.']);
  assert.equal(typeof COACH.shouldSummarize, 'undefined', 'no automatic saving');
  const p = COACH.summaryPrompt(C.msgs, [{ text: '- Wants to squat 20 kg by spring' }], 'hr');
  assert.ok(p.includes('in Croatian') && p.includes('Person: How heavy should I squat?') && p.includes('[workout card]') && p.includes('Already remembered:\n- Wants to squat 20 kg'));
  assert.equal(COACH.cleanSummary('Sure! Here it is:\n- Goal: squat 20 kg\n* Left knee 3/10 on stairs\n- Gym 3x a week\n- Mornings\n- Fifth point'), '- Goal: squat 20 kg\n- Left knee 3/10 on stairs\n- Gym 3x a week\n- Mornings');
  assert.equal(COACH.cleanSummary('They want to train mornings.'), '- They want to train mornings.');
  assert.equal(COACH.cleanSummary(''), '');
});

test('memory goes into the prompt in your order, top first, cut from the bottom', () => {
  const mem = Array.from({ length: 30 }, (_, i) => ({ id: 'm' + i, from: '2026-10-' + String(i + 1).padStart(2, '0'), to: '2026-10-' + String(i + 1).padStart(2, '0'), text: `- note ${i} ` + 'x'.repeat(80) }));
  const C = { mem, memOn: true }, used = COACH.memoryUsed(C), lines = COACH.memoryLines(C);
  assert.ok(used > 5 && used < 30);
  assert.ok(lines.length <= 2400 && lines.includes('note 0 ') && lines.includes(`note ${used - 1} `) && !lines.includes(`note ${used} `));
  assert.ok(lines.indexOf('note 0 ') < lines.indexOf('note 1 '), 'top note first');
  const moved = { mem: [mem[29]].concat(mem.slice(0, 29)), memOn: true };
  assert.ok(COACH.memoryLines(moved).startsWith('2026-10-30:\n- note 29'), 'a note dragged to the top is used first');
  assert.equal(COACH.memoryLines({ mem, memOn: false }), '');
  assert.equal(COACH.memoryUsed({ mem, memOn: false }), 0);
  const D = { profile: {}, readiness: null, baselines: [], program: { id: 'foundations', next: 0 }, lifts: {}, cardio: [], sessions: [], injuries: [], hc: {},
    coach: { msgs: [], mem: [{ id: 'a', from: '2026-11-10', to: '2026-11-11', text: '- Left knee aches on stairs (3/10)\n- Agreed to box squats for two weeks' }], memOn: true } };
  const prompt = COACH.buildPrompt(D, { today: '2026-11-14', appLang: 'en', question: 'Can I squat normally again?', EX, LS, PR, B, lessonDone: () => false, nextTemplate: null }).prompt;
  assert.ok(prompt.includes('most important first') && prompt.includes('2026-11-10 to 2026-11-11:\n- Left knee aches on stairs'));
});
