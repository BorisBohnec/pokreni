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

test('every strength exercise has a drawing that renders cleanly at every moment', () => {
  for (const e of EX.list) if (e.kind !== 'cardio') assert.ok(MOVES[e.id], 'no drawing for ' + e.id);
  for (const [id, spec] of Object.entries(MOVES)) {
    assert.ok(EX.byId[id], 'unknown exercise ' + id);
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
