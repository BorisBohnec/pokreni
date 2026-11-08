/* PoKreni demo clips: one short YouTube video per exercise, played inside the exercise sheet when you're online.
   by = the channel, shown under the player when it's a well-known source. You can swap any clip in the app. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_VIDEOS = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    box_squat: { v: '7LpLZOdz68A' },
    goblet_squat: { v: 'nfX7IFK9UNI', by: 'NASM' },
    leg_press: { v: 'VFk3RzndUEc', by: "Gold's Gym" },
    split_squat: { v: 'Wcmg-3iHwjQ' },
    step_up: { v: 'Zp7RG4jFScw', by: 'OPEX' },
    db_rdl: { v: 'QFbZevA7dps', by: 'NASM' },
    glute_bridge: { v: 'wQQ6N5piDG0' },
    hip_thrust: { v: '6ombApkDsf4', by: "Gold's Gym" },
    back_extension: { v: 'Vq8OJJo1y9s' },
    leg_curl: { v: 'G5iP_YcDQdE', by: 'NASM' },
    leg_extension: { v: '2lvdnQg04PM' },
    calf_raise: { v: 'ucy86plaufg' },
    incline_pushup: { v: '0JUrOH--Kdk', by: 'NASM' },
    pushup: { v: 'WDIpL0pjun0', by: 'NASM' },
    chest_press: { v: 'SMiaPFf9DyI' },
    db_bench: { v: 'AuNRCrdhquE', by: 'NASM' },
    incline_db_press: { v: 'JKnpHchOWPU', by: 'NASM' },
    shoulder_press_machine: { v: 'Anu8s_nkNpM' },
    db_shoulder_press: { v: 'WKEl69bIGus' },
    lateral_raise: { v: 'XPPfnSEATJA', by: 'NASM' },
    triceps_pushdown: { v: 'y6EdXBdL75A' },
    lat_pulldown: { v: 'U3Y_NsyDq60' },
    cable_row: { v: 'q4boNkB4uaM' },
    db_row: { v: 'AL4AqxZNN0U', by: 'GoodLife Fitness' },
    face_pull: { v: 'cuTBqxntdso' },
    db_curl: { v: 'MtXdEcW3Eog' },
    dead_bug: { v: 'bxn9FBrt4-A', by: 'NASM' },
    bird_dog: { v: 'ZdAHe9_HeEw', by: 'NASM' },
    plank: { v: 'mwlp75MS6Rg', by: 'NASM' },
    side_plank: { v: '44ND4bOB-T0', by: 'NASM' },
    pallof: { v: '2sW5qodcOak' },
    farmer_carry: { v: 'D1r4dzFMIsA' },
    bike_stationary: { v: 'VJpAj936QEo' },
    rower: { v: '4zWu1yuJ0_g', by: 'Concept2' }
  };
});
