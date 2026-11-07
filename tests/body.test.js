/* Body map, ranks, injuries, focus blocks and workouts built by the app or the coach. */
const test = require('node:test');
const assert = require('node:assert/strict');
const PK = require('../www/logic.js');
const B = require('../www/data/body.js');
const EX = require('../www/data/exercises.js');
const PR = require('../www/data/programs.js');
const C = require('../www/coach.js');
const LS = require('../www/data/lessons.js');

const ctx = (injuries, extra) => Object.assign({ B, EX, PR, injuries: injuries || [], lifts: {}, prefer: [] }, extra || {});
const sess = (date, items) => ({ id: date + Math.random(), date, start: date + 'T17:00:00Z', end: date + 'T18:00:00Z', name: 'x', items });
const it = (ex, n, done = n) => ({ ex, sets: Array.from({ length: n }, (_, i) => ({ kg: 10, reps: 10, done: i < done })) });

test('body data: every strength exercise is tagged with real muscles and joints, every muscle is drawn and trainable', () => {
  for (const e of EX.list) if (e.kind !== 'cardio') assert.ok(B.EXM[e.id], 'untagged ' + e.id);
  for (const [id, g] of Object.entries(B.EXM)) {
    assert.ok(EX.byId[id], 'unknown exercise ' + id);
    assert.ok(g.p.length, 'no main muscle ' + id);
    g.p.concat(g.s).forEach(m => assert.ok(B.muscleIds.includes(m), `${id}: ${m}`));
    g.j.forEach(a => assert.ok(B.areaIds.includes(a), `${id}: ${a}`));
  }
  for (const m of B.MUSCLES) {
    assert.ok(m.en && m.hr);
    assert.ok(B.SHAPES.some(s => s.a === m.id && !s.joint), 'not drawn ' + m.id);
    assert.ok(Object.values(B.EXM).some(g => g.p.includes(m.id)), 'nothing trains ' + m.id);
  }
  for (const j of B.JOINTS) assert.ok(B.SHAPES.some(s => s.a === j.id && s.joint), 'no marker ' + j.id);
  B.SHAPES.forEach(s => assert.ok(B.byId[s.a] && ['L', 'R', 'C'].includes(s.side) && ['f', 'b'].includes(s.v)));
  PR.WARMUP.forEach(w => (w.areas || []).forEach(a => assert.ok(B.areaIds.includes(a), w.id)));
});

test('sets per muscle: main muscles count 1, supporting 0.5; unticked sets, finishers and other dates don\'t count', () => {
  const s = [sess('2026-11-02', [it('goblet_squat', 3, 2), { ex: 'bike_stationary', mins: 10, sets: [{ mins: 10, done: true }] }]), sess('2026-10-01', [it('goblet_squat', 3)])];
  const m = PK.muscleSets(s, B, '2026-10-27', '2026-11-08');
  assert.equal(m.quads, 2); assert.equal(m.glutes, 2); assert.equal(m.abs, 1); assert.equal(m.lower_back, 1); assert.equal(m.chest, 0);
  assert.deepEqual([0, 1, 3, 5, 7, 12].map(PK.muscleLevel), [0, 1, 2, 3, 4, 5]);
});

test('ranks: steady weeks build a streak; the week in progress doesn\'t break it yet', () => {
  const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
  const s = weeks.map(w => sess(w, [it('lat_pulldown', 3)]));
  let r = PK.muscleRanks(s, B, '2026-11-07').lats;
  assert.equal(r.streak, 5); assert.equal(r.rank, 'silver'); assert.deepEqual(r.next, { id: 'gold', need: 3 });
  r = PK.muscleRanks(s, B, '2026-11-10').lats; /* new week, nothing yet */
  assert.equal(r.streak, 5); assert.ok(r.atRisk);
  r = PK.muscleRanks(s, B, '2026-11-17').lats; /* a whole week missed */
  assert.equal(r.streak, 0); assert.equal(r.best, 5); assert.equal(r.rank, null);
  assert.equal(PK.muscleRanks(s, B, '2026-11-07').calves.ever, false);
  const thin = weeks.map(w => sess(w, [it('lat_pulldown', 2)])); /* biceps get 1 set a week: below 3 */
  assert.equal(PK.muscleRanks(thin, B, '2026-11-07').biceps.streak, 0);
});

test('least trained: needs two sessions, then lists the muscles with the least work', () => {
  assert.equal(PK.leastTrained([sess('2026-11-02', [it('goblet_squat', 3)])], B, '2026-11-07').enough, false);
  const lt = PK.leastTrained([sess('2026-11-02', [it('goblet_squat', 3)]), sess('2026-11-04', [it('chest_press', 3)])], B, '2026-11-07');
  assert.ok(lt.enough); assert.equal(lt.list.length, 3); assert.ok(lt.list.every(m => lt.sets[m] === 0));
});

test('injuries: avoid swaps out what loads the area, ease off keeps it lighter, a supporting role is eased', () => {
  const A = PR.programs.foundations.templates[0].items;
  const knee = [{ area: 'knee', side: 'L', level: 'avoid' }];
  const r = PK.adjustForInjuries(A, knee, ctx(knee));
  assert.ok(!r.items.some(x => x.ex === 'goblet_squat'));
  assert.ok(r.items.every(x => x.finisher || PK.injuryHit(x.ex, knee, B).level !== 'avoid'), 'nothing loading the knee is left');
  const sw = r.items.find(x => x.inj && x.inj.how === 'swap');
  assert.equal(sw.inj.from, 'goblet_squat'); assert.deepEqual(sw.inj.areas, ['knee']);
  assert.equal(new Set(r.items.map(x => x.ex)).size, r.items.length, 'no duplicates');
  const back = [{ area: 'lower_back', level: 'ease' }];
  const rb = PK.adjustForInjuries(PR.programs.foundations.templates[1].items, back, ctx(back));
  assert.ok(rb.items.find(x => x.ex === 'db_rdl').ease);
  assert.ok(!rb.items.find(x => x.ex === 'cable_row').ease, 'ease off ignores a supporting role');
  assert.equal(PK.injuryHit('cable_row', [{ area: 'lower_back', level: 'avoid' }], B).level, 'ease', 'avoid + supporting = ease');
  assert.equal(PK.injuryHit('lat_pulldown', knee, B).level, null);
});

test('workout builder: trains what was asked, respects injuries, and doesn\'t stack the same movement on full body', () => {
  const knee = [{ area: 'knee', level: 'avoid' }];
  const back = PK.buildWorkout(B.groupById.back.m, ctx(knee));
  assert.ok(back.length >= 4);
  assert.ok(back.every(x => ['lats', 'upper_back'].some(m => B.EXM[x.ex].p.includes(m) || B.EXM[x.ex].s.includes(m))));
  assert.ok(back.some(x => x.ex === 'lat_pulldown'));
  const legs = PK.buildWorkout(B.groupById.legs.m, ctx(knee));
  assert.ok(legs.length >= 3 && legs.every(x => PK.injuryHit(x.ex, knee, B).level !== 'avoid'));
  const full = PK.buildWorkout(B.groupById.full.m, ctx(), 6);
  const big = full.map(x => EX.byId[x.ex].pattern).filter(p => !['iso', 'core', 'carry'].includes(p));
  assert.equal(new Set(big).size, big.length);
  assert.ok(full.every(x => x.sets >= 2 && (x.reps || x.secs)));
  const core = PK.buildWorkout(['abs'], ctx());
  assert.ok(core.every(x => B.EXM[x.ex].p.includes('abs')));
});

test('coach workouts are checked: unknown, injury-blocked and repeated exercises are dropped, sets kept to 1–4', () => {
  const knee = [{ area: 'knee', level: 'avoid' }];
  const v = PK.validateWorkout({ title: '  Back   day ', items: [{ id: 'lat_pulldown', sets: 9 }, { id: 'nope', sets: 3 }, { id: 'step_up', sets: 2 }, { id: 'cable_row', sets: '2' }, { id: 'lat_pulldown' }, { id: 'walk_outdoor' }] }, ctx(knee));
  assert.ok(v.ok); assert.equal(v.title, 'Back day');
  assert.deepEqual(v.items.map(x => [x.ex, x.sets]), [['lat_pulldown', 4], ['cable_row', 2]]);
  assert.deepEqual(v.dropped.map(d => d.why).sort(), ['injury', 'unknown', 'unknown']);
  assert.equal(PK.validateWorkout({ items: [{ id: 'lat_pulldown' }] }, ctx()).ok, false);
  assert.equal(PK.validateWorkout('nope', ctx()).ok, false);
  assert.deepEqual(PK.validateFocus({ muscle: 'calves', weeks: 9 }, ctx()), { muscle: 'calves', ex: 'calf_raise', weeks: 4 });
  assert.equal(PK.validateFocus({ muscle: 'quads' }, ctx([{ area: 'knee', level: 'avoid' }])), null);
  assert.equal(PK.validateFocus({ muscle: 'nose' }, ctx()), null);
});

test('focus blocks run for their weeks; requests name muscle groups in English and Croatian', () => {
  const f = { muscle: 'calves', ex: 'calf_raise', start: '2026-11-07', weeks: 3 };
  assert.ok(PK.focusActive(f, '2026-11-07')); assert.ok(PK.focusActive(f, '2026-11-27')); assert.ok(!PK.focusActive(f, '2026-11-28'));
  assert.equal(PK.focusWeek(f, '2026-11-15'), 2);
  assert.deepEqual(PK.groupsIn('Make me a back workout', B), ['back']);
  assert.deepEqual(PK.groupsIn('složi mi trening za leđa i ruke', B), ['back', 'arms']);
  assert.deepEqual(PK.groupsIn('a workout that is easy on my lower back', B), []);
  assert.deepEqual(PK.groupsIn('trening nogu, cijelo tijelo', B), ['legs', 'full']);
});

test('coach: injuries, body map and the catalogue reach the prompt; blocks become cards, not text', () => {
  const D = { profile: { name: 'Boris', gymDays: [1, 3, 5], homeDays: [] }, readiness: null, program: { id: 'foundations' }, lifts: {}, cardio: [], baselines: [],
    sessions: [sess('2026-11-02', [it('goblet_squat', 3)]), sess('2026-11-04', [it('lat_pulldown', 3)])],
    injuries: [{ area: 'knee', side: 'L', level: 'avoid', since: '2026-11-07', note: 'twisted it' }], focus: { muscle: 'calves', ex: 'calf_raise', start: '2026-11-07', weeks: 3 } };
  const o = q => ({ today: '2026-11-07', appLang: 'en', question: q, EX, LS, PR, B, lessonDone: () => false });
  const p1 = C.buildPrompt(D, o('Make me a back workout')).prompt;
  assert.match(p1, /left knee: AVOID/); assert.match(p1, /twisted it/); assert.match(p1, /Body map \(sets per muscle/);
  assert.match(p1, /Focus block running: calves/); assert.match(p1, /Exercise catalogue/); assert.match(p1, /<workout>/);
  const p2 = C.buildPrompt(D, o('Why does my knee hurt?')).prompt;
  assert.doesNotMatch(p2, /Exercise catalogue/); assert.match(p2, /<focus>/);
  const b = C.extractBlocks('Here.\n<workout>{"title":"X","items":[{"id":"lat_pulldown","sets":3},]}</workout>\n<focus>{"muscle":"calves","weeks":3}</focus>');
  assert.equal(b.text, 'Here.'); assert.equal(b.workout.items[0].id, 'lat_pulldown'); assert.equal(b.focus.muscle, 'calves');
  assert.equal(C.extractBlocks('Cut off <workout>{"title":').workout, 'bad');
  const r = C.renderAnswer('Try this.\n<workout>{"items":[]}</workout>', EX, LS);
  assert.doesNotMatch(r.html, /workout|items/);
});
