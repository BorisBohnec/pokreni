/* Exercise drawings, demo videos, and checks that the app text doesn't assume anything personal. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PK = require('../www/logic.js');
const ANIM = require('../www/anim.js');
const MOVES = require('../www/data/moves.js');
const VIDEOS = require('../www/data/videos.js');
const EX = require('../www/data/exercises.js');
const PR = require('../www/data/programs.js');

test('every strength exercise has a drawing that renders cleanly at every moment', () => {
  for (const e of EX.list) if (e.kind !== 'cardio') assert.ok(MOVES[e.id], 'no drawing for ' + e.id);
  for (const [id, spec] of Object.entries(MOVES)) {
    assert.ok(EX.byId[id] || PR.WARMUP.some(w => w.move === id), 'unknown exercise ' + id);
    for (let p = 0; p < 1; p += 0.05) {
      const svg = ANIM.frameSVG(spec, p);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${id} at ${p.toFixed(2)}`);
      const nums = [...svg.matchAll(/(?:x1|y1|x2|y2|cx|cy)="(-?[\d.]+)"/g)].map(m => +m[1]);
      assert.ok(nums.every(n => n > -30 && n < 290), `${id} draws off the canvas at ${p.toFixed(2)}`);
    }
  }
});

test('reach targets keep planted feet and hands where they were put', () => {
  const pose = ANIM.place({ anchor: 't1', at: [40, 184], t: 120, l1: -60, s1: -60, p1: 30, iw1: [186, 138] }).J;
  assert.ok(Math.hypot(pose.w1[0] - 186, pose.w1[1] - 138) < 0.5, 'hand on the bench');
  assert.ok(Math.hypot(pose.t1[0] - 40, pose.t1[1] - 184) < 0.5, 'toes on the floor');
  const bridge = ANIM.place({ anchor: 'neck', at: [64, 177], t: -58, ik1: [178, 181] }).J;
  assert.ok(Math.hypot(bridge.a1[0] - 178, bridge.a1[1] - 181) < 0.5 && Math.hypot(bridge.a2[0] - 178, bridge.a2[1] - 181) < 0.5, 'both feet planted');
});

test('demo videos: real exercises and well-formed YouTube ids; links are parsed', () => {
  for (const [id, v] of Object.entries(VIDEOS)) {
    assert.ok(EX.byId[id], 'unknown exercise ' + id);
    assert.match(v.v, /^[\w-]{11}$/, id);
  }
  for (const e of EX.list) if (e.kind !== 'cardio') assert.ok(VIDEOS[e.id], 'no video for ' + e.id);
  assert.equal(PK.ytId('https://www.youtube.com/watch?v=nfX7IFK9UNI&t=4s'), 'nfX7IFK9UNI');
  assert.equal(PK.ytId('https://youtu.be/WDIpL0pjun0?si=abc'), 'WDIpL0pjun0');
  assert.equal(PK.ytId('https://youtube.com/shorts/wqMYwk_-P14'), 'wqMYwk_-P14');
  assert.equal(PK.ytId('  QFbZevA7dps '), 'QFbZevA7dps');
  assert.equal(PK.ytId('https://example.com/video'), '');
});

test('nothing personal is built into the app; the coach only learns it from your notes', () => {
  const dir = path.join(__dirname, '..', 'www');
  const files = ['app.js', 'coach.js', 'i18n.js', 'data/lessons.js', 'data/exercises.js', 'data/programs.js'];
  const text = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  for (const bad of [/8[–-]16/, /very flexible|vrlo fleksibil/i, /standing still makes|od dugog stajanja bole/i, /office job/i, /saturday shift|subotnja smjena/i, /your back aches/i, /bole te leđa|leđa te bole/i])
    assert.doesNotMatch(text, bad);
});

test('animations move naturally: short way round, nothing through the floor, joints bend the right way', () => {
  const ANG = ['t', 'hd', 'a1', 'f1', 'a2', 'f2', 'l1', 's1', 'p1', 'l2', 's2', 'p2'];
  const norm = d => ((d % 360) + 540) % 360 - 180;
  for (const [id, spec] of Object.entries(MOVES)) {
    let prev = null;
    for (let i = 0; i <= 120; i++) {
      const q = ANIM.poseAt(spec, i / 120);
      if (prev) for (const k of ANG) assert.ok(Math.abs(norm(q[k] - prev[k])) < 25, `${id}: ${k} jumps at ${(i / 120).toFixed(2)}`);
      prev = q;
      const { J, q: r } = ANIM.place(q, spec.view);
      for (const k of ['head', 'neck', 'sh', 'hip', 'e1', 'e2', 'w1', 'w2', 'k1', 'k2']) assert.ok(J[k][1] <= ANIM.GY + 4, `${id}: ${k} goes through the floor at ${(i / 120).toFixed(2)}`);
      if (spec.view === 'front') continue;
      for (const s of [1, 2]) {
        const knee = norm(r['l' + s] - r['s' + s]), elbow = norm(r['f' + s] - r['a' + s]);
        assert.ok(knee > -8 && knee < 165, `${id}: knee ${s} bends backwards (${knee.toFixed(0)}°)`);
        if ((r['ak' + s] || 1) >= 0.8) assert.ok(elbow > -10 && elbow < 170, `${id}: elbow ${s} bends the wrong way (${elbow.toFixed(0)}°)`);
      }
    }
  }
  /* the dead bug's arm goes back overhead (+84°), never forward through the floor */
  const db = MOVES.dead_bug, mid = ANIM.poseAt(db, 0.125);
  assert.ok(mid.a1 > 180 && mid.a1 < 270, 'dead bug arm passes overhead');
});

test('every warm-up move explains itself and links to real drawings and exercises', () => {
  for (const w of PR.WARMUP) {
    for (const L of ['en', 'hr']) {
      assert.ok(w[L] && w.why && w.why[L], `${w.id} ${L} text`);
      assert.ok(w.steps && w.steps[L] && w.steps[L].length >= 3, `${w.id} ${L} steps`);
    }
    assert.equal(w.steps.en.length, w.steps.hr.length, w.id + ' steps match in both languages');
    if (w.move) assert.ok(MOVES[w.move], w.id + ' drawing');
    if (w.ex) assert.ok(EX.byId[w.ex], w.id + ' exercise');
  }
});
