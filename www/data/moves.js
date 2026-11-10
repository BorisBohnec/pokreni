/* PoKreni exercise drawings: key poses for each exercise (see anim.js for the angle convention).
   anchor/at pin one joint so feet or hands stay put; ik1/ik2 reach the ankles and iw1/iw2 the wrists to a point. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_MOVES = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const F = { k: 'floor' };
  const DB = [{ k: 'db', j: 'w2' }, { k: 'db', j: 'w1' }];
  const walk = (extra) => {
    const base = Object.assign({ anchor: 'hip', t: 182, a1: 3, f1: 0, a2: 3, f2: 0 }, extra || {});
    return [
      Object.assign({}, base, { at: [120, 106], l1: 24, s1: 14, p1: 104, l2: -20, s2: -38, p2: 58 }, extra && extra.armsA),
      Object.assign({}, base, { at: [120, 102], l1: 2, s1: 0, p1: 90, l2: 22, s2: -28, p2: 72 }),
      Object.assign({}, base, { at: [120, 106], l2: 24, s2: 14, p2: 104, l1: -20, s1: -38, p1: 58 }, extra && extra.armsC),
      Object.assign({}, base, { at: [120, 102], l2: 2, s2: 0, p2: 90, l1: 22, s1: -28, p1: 72 })
    ];
  };
  const M = {
    box_squat: { props: [F, { k: 'rect', x: 50, y: 146, w: 40, h: 40 }],
      frames: [{ anchor: 'a1', at: [114, 182], a1: 12, f1: 18 }, { anchor: 'a1', at: [114, 182], t: 140, l1: 82, s1: -28, a1: 92, f1: 92 }] },
    goblet_squat: { props: [F, { k: 'dbv', j: 'w1' }],
      frames: [{ anchor: 'a1', at: [114, 182], rel: true, a1: 22, f1: 168 }, { anchor: 'a1', at: [114, 182], rel: true, t: 148, l1: 98, s1: -32, a1: 22, f1: 168 }] },
    leg_press: { props: [F, { k: 'line', p: [62, 162, 22, 116], w: 9 }, { k: 'line', p: [56, 168, 104, 168], w: 7 }, { k: 'line', p: [96, 176, 214, 94], w: 4 }, { k: 'plate', j: 'a1', ang: 215, a: 20, b: 16 }],
      frames: [{ anchor: 'hip', at: [70, 156], t: 222, l1: 125, s1: 125, p1: 215, a1: 25, f1: 60 }, { anchor: 'hip', at: [70, 156], t: 222, l1: 186, s1: 60, p1: 215, a1: 25, f1: 60 }] },
    split_squat: { props: [F].concat(DB),
      frames: [{ anchor: 'a1', at: [152, 182], l1: 22, s1: -4, ik2: [86, 172], p2: 40 }, { anchor: 'a1', at: [152, 182], l1: 84, s1: -24, ik2: [86, 172], p2: 40 }] },
    step_up: { props: [F, { k: 'rect', x: 118, y: 160, w: 64, h: 26 }].concat(DB),
      frames: [{ anchor: 'a1', at: [140, 156], t: 166, l1: 62, s1: -12, ik2: [92, 182], p2: 90 }, { anchor: 'a1', at: [140, 156], l1: 0, s1: 0, l2: 28, s2: -24, p2: 70 }] },
    db_rdl: { props: [F].concat(DB),
      frames: [{ anchor: 'a1', at: [124, 182] }, { anchor: 'a1', at: [124, 182], t: 108, l1: 25, s1: -4, a1: 0, f1: 0 }] },
    /* Warm-up only: the same hinge with hands on hips (arm angles are relative to the trunk, so the hands stay put). */
    hip_hinge: { props: [F],
      frames: [{ anchor: 'a1', at: [124, 182], rel: true, a1: -35, f1: 47 }, { anchor: 'a1', at: [124, 182], rel: true, t: 108, l1: 25, s1: -4, a1: -35, f1: 47 }] },
    glute_bridge: { props: [F],
      frames: [{ anchor: 'neck', at: [64, 177], t: -90, hd: -90, ik1: [178, 181], a1: 92, f1: 92 }, { anchor: 'neck', at: [64, 177], t: -58, hd: -90, ik1: [178, 181], a1: 100, f1: 92 }] },
    hip_thrust: { props: [F, { k: 'rect', x: 8, y: 130, w: 62, h: 56 }, { k: 'disc', j: 'hip', off: [0, -13], r: 10 }],
      frames: [{ anchor: 'sh', at: [62, 125], t: -150, hd: -110, ik1: [148, 181], a1: -96, f1: -82 }, { anchor: 'sh', at: [62, 125], t: -92, hd: -100, ik1: [148, 181], a1: -96, f1: -82 }] },
    back_extension: { props: [F, { k: 'line', p: [60, 186, 120, 126], w: 5 }, { k: 'rect', x: 116, y: 112, w: 26, h: 12, ang: -45 }, { k: 'line', p: [60, 186, 92, 186], w: 5 }, { k: 'line', p: [62, 170, 80, 188], w: 6 }],
      frames: [{ anchor: 'a1', at: [70, 176], t: 135, l1: -45, s1: -45, p1: 45, rel: true, a1: 28, f1: 150 }, { anchor: 'a1', at: [70, 176], t: 35, l1: -45, s1: -45, p1: 45, rel: true, a1: 28, f1: 150 }] },
    leg_curl: { props: [F, { k: 'rect', x: 60, y: 132, w: 60, h: 12 }, { k: 'line', p: [70, 140, 58, 70], w: 9 }, { k: 'line', p: [90, 144, 90, 186], w: 5 }, { k: 'rect', x: 116, y: 106, w: 22, h: 10 }, { k: 'roller', j: 'a1', seg: 's1', rel: -90, d: 8, r: 7 }],
      frames: [{ anchor: 'hip', at: [86, 124], t: 192, l1: 88, s1: 82, p1: 170, a1: 15, f1: 70 }, { anchor: 'hip', at: [86, 124], t: 192, l1: 88, s1: -18, p1: 70, a1: 15, f1: 70 }] },
    leg_extension: { props: [F, { k: 'rect', x: 60, y: 132, w: 60, h: 12 }, { k: 'line', p: [66, 140, 56, 70], w: 9 }, { k: 'line', p: [90, 144, 90, 186], w: 5 }, { k: 'roller', j: 'a1', seg: 's1', rel: 90, d: 8, r: 7 }],
      frames: [{ anchor: 'hip', at: [86, 124], t: 186, l1: 88, s1: -6, p1: 90, a1: 15, f1: 70 }, { anchor: 'hip', at: [86, 124], t: 186, l1: 88, s1: 84, p1: 175, a1: 15, f1: 70 }] },
    calf_raise: { props: [F, { k: 'rect', x: 108, y: 168, w: 48, h: 18 }, { k: 'pad', j: 'sh', off: [0, -5], w: 24, h: 8 }],
      frames: [{ anchor: 't1', at: [152, 166], p1: 112, a1: 22, f1: 168 }, { anchor: 't1', at: [152, 166], p1: 52, a1: 22, f1: 168 }] },
    incline_pushup: { props: [F, { k: 'rect', x: 170, y: 140, w: 70, h: 12 }, { k: 'line', p: [182, 152, 182, 186], w: 5 }, { k: 'line', p: [228, 152, 228, 186], w: 5 }],
      frames: [{ anchor: 't1', at: [40, 184], t: 120, l1: -60, s1: -60, p1: 30, iw1: [186, 138] }, { anchor: 't1', at: [40, 184], t: 103, l1: -77, s1: -77, p1: 13, iw1: [186, 138] }] },
    pushup: { props: [F],
      frames: [{ anchor: 't1', at: [38, 184], t: 111, l1: -69, s1: -69, p1: 21, iw1: [168, 182] }, { anchor: 't1', at: [38, 184], t: 97, l1: -83, s1: -83, p1: 7, iw1: [168, 182] }] },
    chest_press: { props: [F, { k: 'line', p: [62, 146, 70, 80], w: 9 }, { k: 'rect', x: 56, y: 140, w: 54, h: 10 }, { k: 'line', p: [82, 150, 82, 186], w: 5 }, { k: 'grip', j: 'w1' }],
      frames: [{ anchor: 'hip', at: [82, 136], t: 184, l1: 86, s1: 0, a1: -35, f1: 88 }, { anchor: 'hip', at: [82, 136], t: 184, l1: 86, s1: 0, a1: 86, f1: 88 }] },
    db_bench: { props: [F, { k: 'rect', x: 34, y: 150, w: 104, h: 10 }, { k: 'line', p: [46, 160, 46, 186], w: 5 }, { k: 'line', p: [126, 160, 126, 186], w: 5 }].concat(DB),
      frames: [{ anchor: 'neck', at: [56, 144], t: -90, hd: -90, ik1: [168, 182], a1: 178, f1: 180 }, { anchor: 'neck', at: [56, 144], t: -90, hd: -90, ik1: [168, 182], a1: 28, f1: 178 }] },
    incline_db_press: { props: [F, { k: 'line', p: [82, 162, 34, 94], w: 9 }, { k: 'rect', x: 66, y: 156, w: 50, h: 9 }, { k: 'line', p: [86, 165, 86, 186], w: 5 }].concat(DB),
      frames: [{ anchor: 'hip', at: [88, 150], t: 215, l1: 80, s1: 0, a1: 172, f1: 176 }, { anchor: 'hip', at: [88, 150], t: 215, l1: 80, s1: 0, a1: 48, ak1: 0.6, f1: 178 }] },
    shoulder_press_machine: { props: [F, { k: 'line', p: [66, 146, 70, 60], w: 9 }, { k: 'rect', x: 58, y: 140, w: 50, h: 10 }, { k: 'line', p: [82, 150, 82, 186], w: 5 }, { k: 'grip', j: 'w1' }],
      frames: [{ anchor: 'hip', at: [82, 136], t: 182, l1: 88, s1: 0, a1: 50, f1: 175 }, { anchor: 'hip', at: [82, 136], t: 182, l1: 88, s1: 0, a1: 166, f1: 176 }] },
    db_shoulder_press: { view: 'front', props: [F, { k: 'rect', x: 100, y: 138, w: 60, h: 10 }, { k: 'line', p: [130, 148, 130, 186], w: 5 }].concat(DB),
      frames: [{ anchor: 'hip', at: [130, 132], lk1: 0.35, l1: 30, s1: 6, p1: 70, pk1: 0.5, a1: 96, f1: 182 }, { anchor: 'hip', at: [130, 132], lk1: 0.35, l1: 30, s1: 6, p1: 70, pk1: 0.5, a1: 162, f1: 190 }] },
    lateral_raise: { view: 'front', props: [F].concat(DB),
      frames: [{ anchor: 'a1', at: [116, 182], l1: 5, s1: 5, p1: 70, pk1: 0.5, a1: 10, f1: 12 }, { anchor: 'a1', at: [116, 182], l1: 5, s1: 5, p1: 70, pk1: 0.5, a1: 84, f1: 88 }] },
    triceps_pushdown: { props: [F, { k: 'line', p: [182, 186, 182, 20], w: 6 }, { k: 'cable', from: [176, 24], j: 'w1' }],
      frames: [{ anchor: 'a1', at: [108, 182], t: 172, a1: 8, f1: 150 }, { anchor: 'a1', at: [108, 182], t: 172, a1: 8, f1: 10 }] },
    lat_pulldown: { props: [F, { k: 'rect', x: 66, y: 140, w: 50, h: 10 }, { k: 'line', p: [90, 150, 90, 186], w: 5 }, { k: 'rect', x: 116, y: 118, w: 20, h: 9 }, { k: 'line', p: [150, 186, 150, 10], w: 6 }, { k: 'line', p: [92, 10, 150, 10], w: 5 }, { k: 'cable', from: [94, 14], j: 'w1' }, { k: 'grip', j: 'w1' }],
      frames: [{ anchor: 'hip', at: [90, 136], t: 190, l1: 90, s1: 0, a1: 170, f1: 170 }, { anchor: 'hip', at: [90, 136], t: 194, l1: 90, s1: 0, a1: -6, ak1: 0.85, f1: 150 }] },
    cable_row: { props: [F, { k: 'rect', x: 40, y: 150, w: 70, h: 10 }, { k: 'line', p: [74, 160, 74, 186], w: 5 }, { k: 'line', p: [158, 128, 158, 176], w: 6 }, { k: 'line', p: [214, 186, 214, 120], w: 6 }, { k: 'cable', from: [208, 146], j: 'w1' }, { k: 'grip', j: 'w1' }],
      frames: [{ anchor: 'hip', at: [74, 144], t: 170, l1: 86, s1: 72, p1: 172, a1: 86, f1: 88 }, { anchor: 'hip', at: [74, 144], t: 186, l1: 86, s1: 72, p1: 172, a1: -55, f1: 95 }] },
    db_row: { props: [F, { k: 'rect', x: 84, y: 140, w: 90, h: 10 }, { k: 'line', p: [96, 150, 96, 186], w: 5 }, { k: 'line', p: [162, 150, 162, 186], w: 5 }, { k: 'db', j: 'w1' }],
      frames: [{ anchor: 'k2', at: [104, 135], t: 92, l2: 0, s2: -90, p2: -100, iw2: [148, 138], ik1: [92, 182], p1: 90, a1: 2, f1: 0 }, { anchor: 'k2', at: [104, 135], t: 92, l2: 0, s2: -90, p2: -100, iw2: [148, 138], ik1: [92, 182], p1: 90, a1: -122, f1: -8 }] },
    face_pull: { props: [F, { k: 'line', p: [222, 186, 222, 20], w: 6 }, { k: 'cable', from: [216, 42], j: 'w1' }],
      frames: [{ anchor: 'a1', at: [100, 182], t: 186, a1: 96, f1: 98 }, { anchor: 'a1', at: [100, 182], t: 186, a1: 96, ak1: 0.22, f1: 150 }] },
    db_curl: { props: [F].concat(DB),
      frames: [{ anchor: 'a1', at: [118, 182], a1: 10, f1: 8 }, { anchor: 'a1', at: [118, 182], a1: 10, f1: 150 }] },
    dead_bug: { props: [F], dur: 4.4,
      frames: [
        { anchor: 'hip', at: [128, 178], t: -90, hd: -90, l1: 180, s1: 90, p1: 180, a1: 180, f1: 180 },
        { anchor: 'hip', at: [128, 178], t: -90, hd: -90, l1: 180, s1: 90, p1: 180, a1: -96, f1: -96, a2: 180, f2: 180, l2: 102, s2: 96, p2: 175 },
        { anchor: 'hip', at: [128, 178], t: -90, hd: -90, l1: 180, s1: 90, p1: 180, a1: 180, f1: 180 },
        { anchor: 'hip', at: [128, 178], t: -90, hd: -90, l1: 102, s1: 96, p1: 175, a1: 180, f1: 180, a2: -96, f2: -96, l2: 180, s2: 90, p2: 180 }] },
    bird_dog: { props: [F], dur: 4.4,
      frames: [
        { anchor: 'hip', at: [92, 143], t: 106, hd: 100, l1: 0, s1: -90, p1: -100, iw1: [140, 184] },
        { anchor: 'hip', at: [92, 143], t: 104, hd: 100, l1: 0, s1: -90, p1: -100, l2: -88, s2: -88, p2: -100, a1: 94, f1: 94, iw2: [140, 184] },
        { anchor: 'hip', at: [92, 143], t: 106, hd: 100, l1: 0, s1: -90, p1: -100, iw1: [140, 184] },
        { anchor: 'hip', at: [92, 143], t: 104, hd: 100, l2: 0, s2: -90, p2: -100, l1: -88, s1: -88, p1: -100, a2: 94, f2: 94, iw1: [140, 184] }] },
    plank: { props: [F], dur: 3.6,
      frames: [{ anchor: 't1', at: [38, 184], t: 95, hd: 100, l1: -85, s1: -85, p1: 5, a1: 0, f1: 90 }, { anchor: 't1', at: [38, 184], t: 96, hd: 101, l1: -84, s1: -84, p1: 6, a1: 1, f1: 90 }] },
    side_plank: { view: 'front', props: [F],
      frames: [{ anchor: 'a1', at: [200, 180], t: -118, hd: -112, l1: -72, s1: -72, p1: -150, pk1: 0.6, l2: 72, s2: 72, p2: 150, pk2: 0.6, a1: 0, f1: 0, fk1: 0.3, a2: 150, f2: 160 },
        { anchor: 'a1', at: [200, 180], t: -112, hd: -106, l1: -66, s1: -66, p1: -150, pk1: 0.6, l2: 66, s2: 66, p2: 150, pk2: 0.6, a1: 0, f1: 0, fk1: 0.3, a2: 170, f2: 175 }] },
    pallof: { view: 'front', props: [F, { k: 'line', p: [14, 186, 14, 60], w: 6 }, { k: 'cable', from: [20, 92], j: 'w1' }],
      frames: [{ anchor: 'a1', at: [120, 182], l1: 7, s1: 7, p1: 70, pk1: 0.5, a1: 16, f1: -100 }, { anchor: 'a1', at: [120, 182], l1: 7, s1: 7, p1: 70, pk1: 0.5, a1: 34, f1: -52, ak1: 0.55, fk1: 0.6 }] },
    farmer_carry: { props: [F].concat(DB), dur: 2, hold: 0, frames: walk() },
    treadmill_walk: { props: [{ k: 'rect', x: 44, y: 182, w: 176, h: 10, r: 5 }, { k: 'line', p: [212, 182, 230, 70], w: 5 }, { k: 'line', p: [222, 72, 196, 78], w: 6 }], dur: 2, hold: 0,
      frames: walk({ armsA: { a1: -22, f1: -12, a2: 26, f2: 50 }, armsC: { a2: -22, f2: -12, a1: 26, f1: 50 } }) },
    bike_stationary: { props: [F, { k: 'line', p: [96, 186, 164, 186], w: 7 }, { k: 'line', p: [124, 156, 124, 186], w: 6 }, { k: 'line', p: [90, 112, 120, 158], w: 4 }, { k: 'line', p: [124, 156, 150, 86], w: 4 }, { k: 'line', p: [78, 110, 100, 110], w: 7 }, { k: 'line', p: [144, 84, 162, 81], w: 6 }, { k: 'crank', c: [124, 156] }],
      dur: 1.6, fn: p => {
        const c = [124, 156], r = 16, ang = 360 * p;
        const ped = a => [c[0] + Math.sin(a * Math.PI / 180) * r, c[1] + Math.cos(a * Math.PI / 180) * r];
        return { anchor: 'hip', at: [88, 104], t: 150, hd: 140, ik1: ped(ang), ik2: ped(ang + 180), p1: 100, p2: 100, iw1: [156, 82], iw2: [156, 82] };
      } },
    rower: { props: [F, { k: 'line', p: [30, 168, 210, 168], w: 5 }, { k: 'line', p: [176, 168, 186, 140], w: 6 }, { k: 'line', p: [210, 186, 210, 140], w: 8 }, { k: 'cable', from: [206, 146], j: 'w1' }, { k: 'grip', j: 'w1' }], dur: 3.2, hold: 0.05,
      frames: [
        { anchor: 'hip', at: [120, 160], t: 150, hd: 130, ik1: [176, 156], p1: 160, a1: 105, f1: 100 },
        { anchor: 'hip', at: [98, 160], t: 160, hd: 140, ik1: [176, 156], p1: 160, a1: 100, f1: 98 },
        { anchor: 'hip', at: [96, 160], t: 205, hd: 175, ik1: [176, 156], p1: 160, a1: -40, f1: 95 },
        { anchor: 'hip', at: [100, 160], t: 165, hd: 145, ik1: [176, 156], p1: 160, a1: 100, f1: 98 }] }
  };
  return M;
});
