/* PoKreni programmes. Sessions alternate A, B, A, B whenever you train, so a moved gym day never breaks the plan.
   reps / secs: the target range for double progression. rest: seconds between sets. finisher: optional easy cardio. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_PROGRAMS = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  /* move: the drawing shown in the warm-up sheet; ex: the exercise whose full guide (videos, your clip) is one tap away. */
  const WARMUP = [
    { id: 'w-bike', move: 'bike_stationary', ex: 'bike_stationary', en: '5 min easy bike or treadmill walk', hr: '5 min laganog bicikla ili hodanja na traci',
      why: { en: 'Raises your pulse and warms muscles and joints, so the first sets feel smoother.', hr: 'Podiže puls i zagrijava mišiće i zglobove pa prve serije idu glađe.' },
      steps: { en: ['Use the bike, treadmill or cross-trainer, whichever is free.', 'Keep it easy: you can still talk in full sentences and feel slightly warm by the end.', 'Bike: seat at hip height, knee slightly bent at the bottom of the pedal stroke.', 'Treadmill: brisk walk without holding the rails; a small incline is fine.'],
               hr: ['Uzmi bicikl, traku ili orbitrek, što god je slobodno.', 'Lagano: možeš pričati u cijelim rečenicama, a na kraju ti je ugodno toplo.', 'Bicikl: sjedalo u visini kuka, koljeno malo savijeno kad je pedala dolje.', 'Traka: žustro hodanje bez držanja za rukohvate; mali nagib je u redu.'] } },
    { id: 'w-squat', areas: ['knee', 'hip'], move: 'box_squat', ex: 'box_squat', en: '8 squats to a box', hr: '8 čučnjeva na klupu',
      why: { en: 'Takes knees, hips and ankles through the range you will squat in.', hr: 'Provodi koljena, kukove i gležnjeve kroz opseg u kojem ćeš čučati.' },
      steps: { en: ['Stand just in front of a bench, feet shoulder-width, toes slightly out.', 'Sit back and down until you lightly touch the bench, then stand up.', 'Knees follow your toes; chest up, weight on the whole foot.', 'Go slow and easy: it is a rehearsal, not a work set.'],
               hr: ['Stani tik ispred klupe, stopala u širini ramena, prsti malo prema van.', 'Spusti se natrag i dolje dok lagano ne dotakneš klupu, pa ustani.', 'Koljena prate prste; prsa gore, težina na cijelom stopalu.', 'Polako i lagano: ovo je proba, ne radna serija.'] } },
    { id: 'w-hinge', areas: ['lower_back', 'hip'], move: 'hip_hinge', ex: 'db_rdl', en: '8 hip hinges with hands on hips', hr: '8 pregiba u kukovima s rukama na bokovima',
      why: { en: 'Wakes up the hamstrings and glutes and practises "hips back, back flat", the shape for deadlifts, rows and lifting things off the floor.', hr: 'Budi stražnju ložu i gluteuse i uvježbava "kukovi natrag, leđa ravna", oblik za mrtvo dizanje, veslanje i podizanje stvari s poda.' },
      steps: { en: ['Stand tall, feet hip-width, hands on your hips, knees soft.', 'Push your hips back as if closing a car door with your bum; your chest tips forward.', 'Keep your back flat and stop when you feel a stretch in the back of your thighs.', 'Squeeze your glutes to stand back up tall.'],
               hr: ['Stani uspravno, stopala u širini kukova, ruke na bokovima, koljena lagano savijena.', 'Gurni kukove natrag kao da stražnjicom zatvaraš vrata auta; prsa idu naprijed.', 'Leđa ostaju ravna; stani kad osjetiš istezanje na stražnjoj strani natkoljenica.', 'Stisni gluteuse i vrati se u uspravan stav.'] } },
    { id: 'w-push', areas: ['wrist', 'shoulders', 'elbow'], move: 'incline_pushup', ex: 'incline_pushup', en: '8 incline push-ups on a bench or bar', hr: '8 sklekova s rukama na klupi ili šipki',
      why: { en: 'Warms the shoulders, chest, elbows and wrists before any pushing or pressing.', hr: 'Zagrijava ramena, prsa, laktove i zapešća prije guranja i potisaka.' },
      steps: { en: ['Hands on a bench or bar, a bit wider than your shoulders.', 'Walk your feet back until your body is one straight line from head to heels.', 'Lower your chest to the edge with elbows about 45° from your body.', 'Push back up. The higher the bench, the easier it is.'],
               hr: ['Ruke na klupu ili šipku, malo šire od ramena.', 'Odmakni stopala natrag dok tijelo nije ravna linija od glave do peta.', 'Spusti prsa do ruba, laktovi oko 45° od tijela.', 'Odgurni se natrag gore. Što je klupa viša, to je lakše.'] } },
    { id: 'w-bridge', areas: ['hip'], move: 'glute_bridge', ex: 'glute_bridge', en: '10 glute bridges', hr: '10 mostova za gluteuse',
      why: { en: 'Switches on the glutes and gets the hips moving, which takes load off the lower back.', hr: 'Uključuje gluteuse i pokreće kukove, što rasterećuje donji dio leđa.' },
      steps: { en: ['Lie on your back, knees bent, feet flat and hip-width apart.', 'Press through your heels and lift your hips until knees, hips and shoulders line up.', 'Squeeze your glutes for a second at the top without arching your lower back.', 'Lower slowly and repeat.'],
               hr: ['Lezi na leđa, koljena savijena, stopala na podu u širini kukova.', 'Pritisni petama i podigni kukove dok koljena, kukovi i ramena nisu u liniji.', 'Na vrhu stisni gluteuse na sekundu, bez izvijanja donjeg dijela leđa.', 'Polako se spusti i ponovi.'] } },
    { id: 'w-ramp', en: 'First exercise: 1–2 light sets before the work sets', hr: 'Prva vježba: 1–2 lagane serije prije radnih',
      why: { en: 'Light ramp-up sets let you practise the movement and feel the weight before the sets that count.', hr: 'Lagane serije za zagrijavanje omogućuju da uvježbaš pokret i osjetiš težinu prije serija koje se broje.' },
      steps: { en: ['Do the first exercise with about half your working weight for 8–10 easy reps.', 'If the working weight feels heavy, add a second set at about three quarters of it for 3–5 reps.', 'Rest about a minute, then start your first work set.', 'You don\'t log these sets; they are just practice.'],
               hr: ['Napravi prvu vježbu s otprilike pola radne težine, 8–10 laganih ponavljanja.', 'Ako je radna težina teška, dodaj drugu seriju s oko tri četvrtine te težine, 3–5 ponavljanja.', 'Odmori oko minutu, pa kreni s prvom radnom serijom.', 'Ove serije ne upisuješ; one su samo vježba.'] } }
  ];  const FINISHER = { ex: 'bike_stationary', mins: 10, finisher: 1 };
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
