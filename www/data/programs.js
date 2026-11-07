/* PoKreni programmes. Sessions alternate A, B, A, B whenever you train, so a moved gym day never breaks the plan.
   reps / secs: the target range for double progression. rest: seconds between sets. finisher: optional easy cardio. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_PROGRAMS = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const WARMUP = [
    { id: 'w-bike', en: '5 min easy bike or treadmill walk', hr: '5 min laganog bicikla ili hodanja na traci' },
    { id: 'w-squat', areas: ['knee', 'hip'], en: '8 squats to a box', hr: '8 čučnjeva na klupu' },
    { id: 'w-hinge', areas: ['lower_back', 'hip'], en: '8 hip hinges with hands on hips', hr: '8 pregiba u kukovima s rukama na bokovima' },
    { id: 'w-push', areas: ['wrist', 'shoulders', 'elbow'], en: '8 incline push-ups on a bench or bar', hr: '8 sklekova s rukama na klupi ili šipki' },
    { id: 'w-bridge', areas: ['hip'], en: '10 glute bridges', hr: '10 mostova za gluteuse' },
    { id: 'w-ramp', en: 'First exercise: 1–2 light sets before the work sets', hr: 'Prva vježba: 1–2 lagane serije prije radnih' }
  ];
  const FINISHER = { ex: 'bike_stationary', mins: 10, finisher: 1 };
  const P = {
    foundations: {
      id: 'foundations', weeks: '1–4',
      name: { en: 'Foundations', hr: 'Temelji' },
      about: { en: 'Machines and simple free weights, full body, 2–3 times a week. Learn the six movement patterns with loads you control.',
               hr: 'Sprave i jednostavni slobodni utezi, cijelo tijelo, 2–3 puta tjedno. Nauči šest obrazaca pokreta s opterećenjem koje kontroliraš.' },
      next: 'build', graduateAfter: 8,
      templates: [
        { key: 'A', name: { en: 'Full body A', hr: 'Cijelo tijelo A' }, items: [
          { ex: 'goblet_squat', sets: 3, reps: [8, 12], rest: 90 },
          { ex: 'chest_press', sets: 3, reps: [8, 12], rest: 90 },
          { ex: 'lat_pulldown', sets: 3, reps: [10, 12], rest: 90 },
          { ex: 'glute_bridge', sets: 2, reps: [10, 15], rest: 60 },
          { ex: 'dead_bug', sets: 2, reps: [6, 10], rest: 45 },
          { ex: 'farmer_carry', sets: 2, secs: [30, 45], rest: 60 },
          FINISHER
        ] },
        { key: 'B', name: { en: 'Full body B', hr: 'Cijelo tijelo B' }, items: [
          { ex: 'leg_press', sets: 3, reps: [10, 12], rest: 90 },
          { ex: 'cable_row', sets: 3, reps: [10, 12], rest: 90 },
          { ex: 'db_rdl', sets: 2, reps: [8, 12], rest: 90 },
          { ex: 'shoulder_press_machine', sets: 2, reps: [8, 12], rest: 90 },
          { ex: 'back_extension', sets: 2, reps: [8, 12], rest: 60 },
          { ex: 'plank', sets: 2, secs: [20, 40], rest: 45 },
          FINISHER
        ] }
      ]
    },
    build: {
      id: 'build', weeks: '5–12',
      name: { en: 'Build', hr: 'Izgradnja' },
      about: { en: 'More free weights, single-leg work and a bit more volume. Same A/B queue.',
               hr: 'Više slobodnih utega, rad na jednoj nozi i malo veći volumen. Isti A/B redoslijed.' },
      next: null,
      templates: [
        { key: 'A', name: { en: 'Build A', hr: 'Izgradnja A' }, items: [
          { ex: 'goblet_squat', sets: 3, reps: [8, 12], rest: 120 },
          { ex: 'db_bench', sets: 3, reps: [8, 12], rest: 120 },
          { ex: 'lat_pulldown', sets: 3, reps: [8, 12], rest: 90 },
          { ex: 'split_squat', sets: 2, reps: [8, 10], rest: 90 },
          { ex: 'face_pull', sets: 2, reps: [12, 15], rest: 60 },
          { ex: 'pallof', sets: 2, reps: [8, 12], rest: 45 },
          FINISHER
        ] },
        { key: 'B', name: { en: 'Build B', hr: 'Izgradnja B' }, items: [
          { ex: 'db_rdl', sets: 3, reps: [8, 10], rest: 120 },
          { ex: 'incline_db_press', sets: 3, reps: [8, 12], rest: 90 },
          { ex: 'db_row', sets: 3, reps: [8, 12], rest: 90 },
          { ex: 'step_up', sets: 2, reps: [8, 10], rest: 90 },
          { ex: 'side_plank', sets: 2, secs: [20, 30], rest: 45 },
          { ex: 'farmer_carry', sets: 2, secs: [40, 60], rest: 60 },
          FINISHER
        ] }
      ]
    }
  };
  /* Without the doctor's OK after a "yes" on the readiness check, only this easy plan is offered. */
  const WALK_ONLY = { id: 'walk', name: { en: 'Walking plan', hr: 'Plan hodanja' },
    about: { en: 'Easy walking or cycling, 10–20 minutes, until your doctor clears you for the gym.', hr: 'Lagano hodanje ili bicikl, 10–20 minuta, dok ti liječnik ne odobri teretanu.' } };
  return { WARMUP, programs: P, WALK_ONLY, order: ['foundations', 'build'] };
});
