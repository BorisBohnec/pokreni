/* PoKreni body map data: muscles, joints you can mark as injured, the figure's shapes, and which muscles and
   joints each exercise loads. p = main muscles (a set counts fully), s = supporting muscles (half a set),
   j = joints or areas the exercise puts real load on (used for injuries). Cardio isn't counted on the map. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_BODY = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const MUSCLES = [
    { id: 'chest', en: 'Chest', hr: 'Prsa' },
    { id: 'shoulders', en: 'Shoulders', hr: 'Ramena' },
    { id: 'upper_back', en: 'Upper back', hr: 'Gornja leđa' },
    { id: 'lats', en: 'Lats', hr: 'Široki leđni' },
    { id: 'lower_back', en: 'Lower back', hr: 'Donja leđa' },
    { id: 'biceps', en: 'Biceps', hr: 'Biceps' },
    { id: 'triceps', en: 'Triceps', hr: 'Triceps' },
    { id: 'forearms', en: 'Forearms and grip', hr: 'Podlaktice i stisak' },
    { id: 'abs', en: 'Abs and core', hr: 'Trbuh i trup' },
    { id: 'glutes', en: 'Glutes', hr: 'Gluteusi' },
    { id: 'quads', en: 'Front of thighs', hr: 'Prednja natkoljenica' },
    { id: 'hamstrings', en: 'Hamstrings', hr: 'Stražnja loža' },
    { id: 'calves', en: 'Calves', hr: 'Listovi' }
  ];
  /* Joints only matter for injuries. Shoulders and lower back are muscles and joints at once. */
  const JOINTS = [
    { id: 'neck', en: 'Neck', hr: 'Vrat' },
    { id: 'elbow', en: 'Elbow', hr: 'Lakat' },
    { id: 'wrist', en: 'Wrist', hr: 'Zapešće' },
    { id: 'hip', en: 'Hip', hr: 'Kuk' },
    { id: 'knee', en: 'Knee', hr: 'Koljeno' },
    { id: 'ankle', en: 'Ankle', hr: 'Gležanj' }
  ];

  const EXM = {
    box_squat: { p: ['quads', 'glutes'], s: ['abs'], j: ['knee', 'hip'] },
    goblet_squat: { p: ['quads', 'glutes'], s: ['abs', 'lower_back'], j: ['knee', 'hip'] },
    leg_press: { p: ['quads', 'glutes'], s: ['hamstrings'], j: ['knee', 'hip'] },
    split_squat: { p: ['quads', 'glutes'], s: ['hamstrings', 'forearms'], j: ['knee', 'hip', 'ankle'] },
    step_up: { p: ['quads', 'glutes'], s: ['hamstrings', 'calves'], j: ['knee', 'hip', 'ankle'] },
    db_rdl: { p: ['hamstrings', 'glutes'], s: ['lower_back', 'forearms', 'upper_back'], j: ['hip', 'lower_back'] },
    glute_bridge: { p: ['glutes'], s: ['hamstrings'], j: ['hip'] },
    hip_thrust: { p: ['glutes'], s: ['hamstrings', 'quads'], j: ['hip'] },
    back_extension: { p: ['lower_back', 'glutes'], s: ['hamstrings'], j: ['lower_back', 'hip'] },
    leg_curl: { p: ['hamstrings'], s: ['calves'], j: ['knee'] },
    leg_extension: { p: ['quads'], s: [], j: ['knee'] },
    calf_raise: { p: ['calves'], s: [], j: ['ankle'] },
    incline_pushup: { p: ['chest'], s: ['triceps', 'shoulders', 'abs'], j: ['wrist', 'shoulders', 'elbow'] },
    pushup: { p: ['chest'], s: ['triceps', 'shoulders', 'abs'], j: ['wrist', 'shoulders', 'elbow'] },
    chest_press: { p: ['chest'], s: ['triceps', 'shoulders'], j: ['shoulders', 'elbow'] },
    db_bench: { p: ['chest'], s: ['triceps', 'shoulders'], j: ['shoulders', 'elbow', 'wrist'] },
    incline_db_press: { p: ['chest', 'shoulders'], s: ['triceps'], j: ['shoulders', 'elbow', 'wrist'] },
    shoulder_press_machine: { p: ['shoulders'], s: ['triceps', 'upper_back'], j: ['shoulders', 'elbow'] },
    db_shoulder_press: { p: ['shoulders'], s: ['triceps', 'upper_back', 'abs'], j: ['shoulders', 'elbow', 'wrist'] },
    lateral_raise: { p: ['shoulders'], s: ['upper_back'], j: ['shoulders'] },
    triceps_pushdown: { p: ['triceps'], s: [], j: ['elbow'] },
    lat_pulldown: { p: ['lats'], s: ['biceps', 'upper_back', 'forearms'], j: ['shoulders', 'elbow'] },
    cable_row: { p: ['upper_back', 'lats'], s: ['biceps', 'shoulders', 'lower_back'], j: ['elbow'] },
    db_row: { p: ['lats', 'upper_back'], s: ['biceps', 'forearms', 'shoulders'], j: ['elbow'] },
    face_pull: { p: ['shoulders', 'upper_back'], s: [], j: ['shoulders'] },
    db_curl: { p: ['biceps'], s: ['forearms'], j: ['elbow', 'wrist'] },
    dead_bug: { p: ['abs'], s: [], j: [] },
    bird_dog: { p: ['abs', 'lower_back'], s: ['glutes', 'shoulders'], j: [] },
    plank: { p: ['abs'], s: ['shoulders'], j: ['shoulders'] },
    side_plank: { p: ['abs'], s: ['shoulders', 'glutes'], j: ['shoulders'] },
    pallof: { p: ['abs'], s: ['shoulders'], j: [] },
    farmer_carry: { p: ['forearms', 'upper_back'], s: ['abs', 'glutes'], j: ['wrist'] }
  };

  /* Muscle groups for "build me a … workout", with the words that ask for them (English and Croatian). */
  const GROUPS = [
    { id: 'back', en: 'Back', hr: 'Leđa', m: ['lats', 'upper_back'], re: /\b(back|le[dđ]a|le[dđ]ima)\b/ },
    { id: 'chest', en: 'Chest', hr: 'Prsa', m: ['chest'], re: /\b(chest|prsa|prsni\w*|prsima)\b/ },
    { id: 'legs', en: 'Legs', hr: 'Noge', m: ['quads', 'hamstrings', 'glutes', 'calves'], re: /\b(legs?|noge|nogu|nogama|lower body|donji dio tijela)\b/ },
    { id: 'shoulders', en: 'Shoulders', hr: 'Ramena', m: ['shoulders'], re: /\b(shoulders?|ramena|rame|ramenima)\b/ },
    { id: 'arms', en: 'Arms', hr: 'Ruke', m: ['biceps', 'triceps'], re: /\b(arms?|biceps|triceps|ruke|ruku|rukama)\b/ },
    { id: 'core', en: 'Core', hr: 'Trup', m: ['abs'], re: /\b(core|abs|trbu[hš]\w*|trup\w*)\b/ },
    { id: 'glutes', en: 'Glutes', hr: 'Gluteusi', m: ['glutes'], re: /\b(glutes?|gluteus\w*|guza|guzu|stra[žz]njic\w*)\b/ },
    { id: 'calves', en: 'Calves', hr: 'Listovi', m: ['calves'], re: /\b(calf|calves|listov\w*)\b/ },
    { id: 'upper', en: 'Upper body', hr: 'Gornji dio', m: ['chest', 'lats', 'upper_back', 'shoulders', 'biceps', 'triceps'], re: /\b(upper body|gornji dio|gornjeg dijela)\b/ },
    { id: 'full', en: 'Full body', hr: 'Cijelo tijelo', m: ['quads', 'glutes', 'hamstrings', 'chest', 'lats', 'upper_back', 'shoulders', 'abs'], re: /\b(full body|whole body|cijel[oa]g? tijel[oa])\b/ }
  ];

  /*
   * Figure shapes, 120 × 262 units per view. v: f = front, b = back. side: the person's own side
   * (on the front view their right is on your left). joint: a small marker you can tap to mark a joint.
   */
  const R = (a, v, side, x, y, w, h, rx) => ({ a, v, side, el: 'rect', x, y, w, h, rx });
  const E = (a, v, side, cx, cy, rx, ry) => ({ a, v, side, el: 'ellipse', cx, cy, rx, ry });
  const J = (a, v, side, cx, cy, r) => ({ a, v, side, el: 'circle', cx, cy, r, joint: true });
  const SHAPES = [];
  ['f', 'b'].forEach(v => {
    const L = v === 'f' ? 'R' : 'L', Rt = v === 'f' ? 'L' : 'R'; /* the side drawn on the viewer's left / right */
    SHAPES.push(E('shoulders', v, L, 34, 51, 11, 10), E('shoulders', v, Rt, 86, 51, 11, 10));
    if (v === 'f') {
      SHAPES.push(R('chest', v, L, 41, 43, 18, 25, 7), R('chest', v, Rt, 61, 43, 18, 25, 7));
      SHAPES.push(R('abs', v, 'C', 46, 71, 28, 45, 8));
      SHAPES.push(R('biceps', v, L, 22, 63, 11, 34, 5), R('biceps', v, Rt, 87, 63, 11, 34, 5));
      SHAPES.push(R('quads', v, L, 41, 121, 18, 67, 8), R('quads', v, Rt, 61, 121, 18, 67, 8));
    } else {
      SHAPES.push(R('upper_back', v, 'C', 42, 40, 36, 22, 7));
      SHAPES.push(R('lats', v, L, 40, 64, 19, 36, 7), R('lats', v, Rt, 61, 64, 19, 36, 7));
      SHAPES.push(R('lower_back', v, 'C', 47, 102, 26, 16, 6));
      SHAPES.push(R('triceps', v, L, 22, 63, 11, 34, 5), R('triceps', v, Rt, 87, 63, 11, 34, 5));
      SHAPES.push(E('glutes', v, L, 50, 132, 11, 12), E('glutes', v, Rt, 70, 132, 11, 12));
      SHAPES.push(R('hamstrings', v, L, 41, 146, 18, 42, 8), R('hamstrings', v, Rt, 61, 146, 18, 42, 8));
    }
    SHAPES.push(R('forearms', v, L, 18, 105, 10, 32, 5), R('forearms', v, Rt, 92, 105, 10, 32, 5));
    SHAPES.push(R('calves', v, L, 43, 196, 14, 50, 7), R('calves', v, Rt, 63, 196, 14, 50, 7));
    SHAPES.push(J('neck', v, 'C', 60, 34, 4));
    SHAPES.push(J('elbow', v, L, 27.5, 101, 4), J('elbow', v, Rt, 92.5, 101, 4));
    SHAPES.push(J('wrist', v, L, 23, 141, 3.5), J('wrist', v, Rt, 97, 141, 3.5));
    if (v === 'f') SHAPES.push(J('hip', v, L, 44, 119, 4), J('hip', v, Rt, 76, 119, 4));
    SHAPES.push(J('knee', v, L, 50, 192, 4.5), J('knee', v, Rt, 70, 192, 4.5));
    SHAPES.push(J('ankle', v, L, 50, 250, 3.5), J('ankle', v, Rt, 70, 250, 3.5));
  });
  /* The plain silhouette drawn underneath, per view. */
  const SILHOUETTE = [
    { el: 'circle', cx: 60, cy: 17, r: 12 }, { el: 'rect', x: 54, y: 27, w: 12, h: 12, rx: 4 },
    { el: 'rect', x: 37, y: 38, w: 46, h: 82, rx: 14 }, { el: 'rect', x: 39, y: 112, w: 42, h: 30, rx: 10 },
    { el: 'rect', x: 21, y: 46, w: 13, h: 56, rx: 6 }, { el: 'rect', x: 86, y: 46, w: 13, h: 56, rx: 6 },
    { el: 'rect', x: 17, y: 100, w: 12, h: 46, rx: 6 }, { el: 'rect', x: 91, y: 100, w: 12, h: 46, rx: 6 },
    { el: 'rect', x: 40, y: 120, w: 20, h: 130, rx: 9 }, { el: 'rect', x: 60, y: 120, w: 20, h: 130, rx: 9 },
    { el: 'rect', x: 42, y: 246, w: 14, h: 9, rx: 4 }, { el: 'rect', x: 64, y: 246, w: 14, h: 9, rx: 4 }
  ];

  const byId = {};
  MUSCLES.forEach(m => { byId[m.id] = Object.assign({ kind: 'muscle' }, m); });
  JOINTS.forEach(j => { byId[j.id] = Object.assign({ kind: 'joint' }, j); });
  const groupById = {}; GROUPS.forEach(g => { groupById[g.id] = g; });
  return { MUSCLES, JOINTS, EXM, GROUPS, groupById, SHAPES, SILHOUETTE, byId, muscleIds: MUSCLES.map(m => m.id), areaIds: MUSCLES.concat(JOINTS).map(a => a.id) };
});
