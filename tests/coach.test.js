const test = require('node:test');
const assert = require('node:assert/strict');
const PK = require('../www/logic.js');
global.PK = PK;
const COACH = require('../www/coach.js');
const AIX = require('../www/ai.js');
const EX = require('../www/data/exercises.js');
const LS = require('../www/data/lessons.js');
const PR = require('../www/data/programs.js');

const D = {
  profile: { name: 'Boris', gymDays: [1, 3, 5], homeDays: [2, 4], notes: 'lower back aches after standing' },
  readiness: { answeredAt: '2026-11-06', answers: { heart: false, chest: false, dizzy: false, chronic: false, meds: false, joint: false, supervised: false } },
  baselines: [{ date: '2026-11-06', restHr: 72, chairStands: 11 }], program: { id: 'foundations', next: 1 },
  lifts: { goblet_squat: { kg: 12, reps: 9 } },
  sessions: [{ id: 's1', program: 'foundations', name: { en: 'Full body A', hr: 'Cijelo tijelo A' }, date: '2026-11-06', start: '2026-11-06T15:30:00Z', end: '2026-11-06T16:20:00Z', warmup: 6,
    items: [{ ex: 'goblet_squat', pain: 2, sets: [{ kg: 12, reps: 10, rir: 3, done: true }, { kg: 12, reps: 9, rir: 2, done: true }] }] }],
  cardio: [{ id: 'c1', date: '2026-11-05', type: 'walk_outdoor', minutes: 30, effort: 1 }],
  hc: { ext: {}, sleep: { '2026-11-07': 6.5 } },
  tanjur: { app: 'tanjur', at: '2026-11-07T12:00:00Z', today: '2026-11-07', profile: { sex: 'male', age: 27, height: 185, goal: 'lose' }, targets: { kcal: 2300, protein: 180, carbs: 250, fat: 75 },
    days: { '2026-11-07': { kcal: 1450, protein: 95, meals: 2 } }, meals: [{ time: '07:40', name: 'Zobene', kcal: 520, protein: 32 }] },
  coach: { msgs: [{ role: 'user', text: 'earlier question' }, { role: 'coach', text: 'earlier answer' }] }
};
const opts = q => ({ today: '2026-11-07', appLang: 'en', question: q, EX, LS, PR, lessonDone: id => id === 'L01', weight: { kg: 120.4, date: '2026-11-07', src: 'tanjur' },
  nextTemplate: { name: { en: 'Full body B' }, items: [{ ex: EX.byId.leg_press, text: '2 × 10–12 · pick a weight' }] } });

test('coach prompt carries the training log, food, notes, safety rules and history', () => {
  const { prompt, lang } = COACH.buildPrompt(D, opts('Am I progressing?'));
  assert.equal(lang, 'en');
  for (const s of ['Goblet squat: 12 kg × 10 reps @RIR 3', '120.4 kg (from Tanjur', 'daily targets 2300 kcal, protein 180 g', 'lower back aches after standing',
    'call 112', 'Next session: Full body B', 'Sleep last night (Health Connect): 6.5 h', 'User: earlier question', 'New question: Am I progressing?', 'gym Mon, Wed, Fri', 'all answers no'])
    assert.ok(prompt.includes(s), 'missing: ' + s);
});
test('coach answers in Croatian when asked in Croatian, and flags an uncleared readiness check', () => {
  const d = Object.assign({}, D, { readiness: { answeredAt: '2026-11-06', answers: { joint: true } } });
  const { prompt, lang } = COACH.buildPrompt(d, opts('Smijem li trenirati s prehladom?'));
  assert.equal(lang, 'hr');
  assert.ok(prompt.includes('NOT yet cleared by a doctor'));
  assert.ok(prompt.includes('Croatian (standard Croatian, ijekavica'));
  assert.equal(COACH.detectLang('What should I eat before the gym?', 'hr'), 'en');
  assert.equal(COACH.detectLang('ok', 'hr'), 'hr');
});
test('answers are escaped, lists kept, and only real lesson/exercise links become buttons', () => {
  const r = COACH.renderAnswer('Hi <script>x</script> **now**\n- one\n- two\nSee this. [[lesson:L07]] [[ex:goblet_squat]] [[ex:not_real]] [[lesson:L99]]', EX, LS);
  assert.ok(!r.html.includes('<script>'));
  assert.ok(r.html.includes('<b>now</b>'));
  assert.ok(r.html.includes('<ul><li>one</li><li>two</li></ul>'));
  assert.deepEqual(r.links, [{ kind: 'lesson', id: 'L07' }, { kind: 'ex', id: 'goblet_squat' }]);
  assert.ok(!r.html.includes('[['));
});
test('emergency phrases are caught before any AI call, in English and Croatian', () => {
  for (const q of ['I have chest pain on the treadmill', 'pain in my left arm and jaw', 'I almost fainted', 'bol u prsima kad hodam', 'Onesvijestio sam se', 'ne mogu disati']) assert.ok(AIX.isEmergency(q), q);
  for (const q of ['my chest press stalled', 'is soreness normal', 'bole me noge nakon čučnjeva']) assert.ok(!AIX.isEmergency(q), q);
});

function mockFetch(routes) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push(url);
    const r = routes(url, JSON.parse(init.body));
    return { status: r.status, json: async () => r.body };
  };
  return calls;
}
test('AI: Claude first; a rejected key falls back to the free models', async () => {
  const used = [];
  const ai = AIX.createAI({ keys: () => ({ claudeKey: 'sk-ant-x', orKey: 'sk-or-x' }), spent: () => 0, record: u => used.push(u) });
  const calls = mockFetch(url => url.includes('anthropic') ? { status: 401, body: { type: 'error', error: { message: 'bad' } } } : { status: 200, body: { model: 'google/gemma-4-31b-it:free', choices: [{ message: { content: 'Free answer' } }] } });
  const r = await ai.text('q');
  assert.equal(r.text, 'Free answer'); assert.equal(r.claudeErr, 'claude_key');
  assert.ok(calls[0].includes('anthropic') && calls[1].includes('openrouter'));
  assert.equal(used.length, 0);
});
test('AI: Claude answers and records the cost; the shared monthly limit skips Claude', async () => {
  const used = [];
  let spent = 0;
  const ai = AIX.createAI({ keys: () => ({ claudeKey: 'sk-ant-x', claudeCap: 2, orKey: 'sk-or-x' }), spent: () => spent, record: u => used.push(u) });
  mockFetch(url => url.includes('anthropic') ? { status: 200, body: { content: [{ type: 'text', text: 'Claude answer' }], usage: { input_tokens: 4000, output_tokens: 300 } } } : { status: 200, body: { choices: [{ message: { content: 'Free' } }] } });
  assert.equal((await ai.text('q')).text, 'Claude answer');
  assert.ok(used[0].cost > 0.005 && used[0].cost < 0.006);
  spent = 2.1;
  assert.equal(ai.source(), 'free');
  assert.equal((await ai.text('q')).text, 'Free');
});
test('AI: no keys means no network call', async () => {
  const ai = AIX.createAI({ keys: () => null, spent: () => 0, record: () => {} });
  const calls = mockFetch(() => ({ status: 200, body: {} }));
  await assert.rejects(ai.text('q'), e => e.code === 'no_key');
  assert.equal(calls.length, 0);
  assert.equal(ai.source(), 'none');
});
