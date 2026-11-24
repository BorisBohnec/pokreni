/* Every exercise drawing, checked at 48 moments: joints only bend the way joints bend, nothing goes through the floor
   or out of the frame, the figure doesn't jump, and reach targets (hands on handles, feet on plates) are met.
   The exceptions below are real positions, not bugs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../www/anim.js');
const M = require('../www/data/moves.js');

const norm = d => ((d % 360) + 540) % 360 - 180;
const ang = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI;
/* raised: seated, on a box, step or machine, so no joint needs to be near the floor */
const RAISED = ['leg_press', 'leg_curl', 'leg_extension', 'calf_raise', 'chest_press', 'shoulder_press_machine', 'lat_pulldown', 'cable_row', 'step_up', 'dead_bug', 'bike_stationary', 'rower'];
const EXCEPT = {
  split_squat: { hipMin: -40 },           /* the back leg in a split stance */
  db_row: { ankleSkip: [2] },             /* kneeling on the bench: that foot points back */
  bird_dog: { ankleSkip: [1, 2] },        /* on hands and knees */
  rower: { hipMax: 160 }                  /* the catch: knees up to the chest */
};

for (const id of Object.keys(M)) {
  test(`drawing: ${id}`, () => {
    const spec = M[id], side = spec.view !== 'front', x = EXCEPT[id] || {};
    const hasFloor = (spec.props || []).some(p => p.k === 'floor');
    let prev = null, nearest = 1e9;
    for (let k = 0; k < 48; k++) {
      const ph = k / 48, q = A.poseAt(spec, ph), { J } = A.place(q, spec.view), at = `${id} @${ph.toFixed(2)}`;
      if (side) for (const i of [1, 2]) {
        const knee = norm(ang(J['h' + i], J['k' + i]) - ang(J['k' + i], J['a' + i]));
        assert.ok(knee >= -8 && knee <= 165, `${at} knee ${i} bends ${knee.toFixed(0)}°`);
        const elbow = norm(ang(J['e' + i], J['w' + i]) - ang(J['s' + i], J['e' + i]));
        assert.ok(elbow >= -12 && elbow <= 168, `${at} elbow ${i} bends ${elbow.toFixed(0)}°`);
        if (!(x.ankleSkip || []).includes(i)) { const ankle = norm(ang(J['a' + i], J['t' + i]) - ang(J['k' + i], J['a' + i])); assert.ok(ankle >= 30 && ankle <= 165, `${at} ankle ${i} ${ankle.toFixed(0)}°`); }
        const hip = norm(ang(J['h' + i], J['k' + i]) - (q.t - 180));
        assert.ok(hip >= (x.hipMin == null ? -30 : x.hipMin) && hip <= (x.hipMax || 145), `${at} hip ${i} ${hip.toFixed(0)}°`);
      }
      assert.ok(Math.abs(norm(q.hd - q.t)) <= 65, `${at} neck`);
      for (const j in J) {
        const [px, py] = J[j];
        assert.ok(px >= 2 && px <= A.W - 2 && py >= 2 && py <= A.H - 1, `${at} ${j} leaves the frame`);
        if (hasFloor) { assert.ok(py <= A.GY + 2.5, `${at} ${j} is ${(py - A.GY).toFixed(1)} below the floor`); nearest = Math.min(nearest, A.GY - py); }
      }
      if (prev) for (const j in J) assert.ok(Math.hypot(J[j][0] - prev[j][0], J[j][1] - prev[j][1]) <= 14, `${at} ${j} jumps`);
      prev = J;
    }
    if (hasFloor && !RAISED.includes(id)) assert.ok(nearest <= 6, `${id} floats ${nearest.toFixed(1)} above the floor`);
    (spec.frames || []).forEach((f, fi) => {
      const { J } = A.place(f, spec.view);
      for (const i of [1, 2]) for (const [t, j] of [['ik', 'a'], ['iw', 'w']]) {
        const target = f[t + i]; if (!target) continue;
        const d = Math.hypot(J[j + i][0] - target[0], J[j + i][1] - target[1]);
        assert.ok(d <= 5, `${id} key pose ${fi}: ${j}${i} misses its target by ${d.toFixed(1)}`);
      }
    });
  });
}
