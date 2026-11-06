/* PoKreni coach: builds the prompt from the training log, Tanjur's food summary and Health Connect, and turns
   the answer into safe HTML with lesson/exercise buttons. No DOM and no network, so tests can run it in Node. */
(function (root, factory) {
  const lib = factory(root.PK || (typeof require === 'function' ? require('./logic.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_COACH = lib;
})(typeof self !== 'undefined' ? self : this, function (PK) {
  'use strict';
  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const READINESS_EN = { heart: 'heart condition or high blood pressure', chest: 'chest pain', dizzy: 'dizziness or fainting', chronic: 'another long-term condition', meds: 'prescribed medicine for a long-term condition', joint: 'a bone, joint or muscle problem', supervised: 'told to exercise only under supervision' };
  const r1 = v => Math.round((+v || 0) * 10) / 10;
  const en = o => (o == null ? '' : typeof o === 'string' ? o : (o.en || ''));

  /* Croatian or English answer: the question's language wins, then the app's language. */
  const HR_HINTS = new Set('koliko što sto kako zašto zasto jesam jesi li trebam trebao mogu možeš mogu smijem smije je su da ne ili za na od do koji koja koje danas jučer jucer sutra tjedan tjedna trening treninga treniram vježba vjezba vježbe vjezbe serija serije ponavljanja čučanj cucanj leđa leda boli bol koljeno rame jesti jedem pojesti prije poslije nakon teretana teretanu teretani mišići misici upala dobro bolje previše premalo manje više vise gdje kad kada zbog mi meni moj moja moje imam nemam'.split(' '));
  function detectLang(text, appLang) {
    const t = String(text || '').toLowerCase();
    if (/[čćžšđ]/.test(t)) return 'hr';
    const words = t.match(/[a-z]+/g) || [];
    const hits = words.filter(w => HR_HINTS.has(w)).length;
    if (hits >= 2 || (hits >= 1 && words.length <= 3)) return 'hr';
    if (hits === 0 && words.length >= 3 && words.some(w => ['the', 'my', 'what', 'how', 'should', 'can', 'is', 'why', 'i'].includes(w))) return 'en';
    return appLang === 'hr' ? 'hr' : 'en';
  }
  function langLine(lang) {
    return lang === 'hr'
      ? 'Language: write the whole answer in Croatian (standard Croatian, ijekavica, Latin script). Never use Serbian or Bosnian forms: tjedan not nedelja, vrijeme not vreme, što not šta, kruh not hleb, mlijeko not mleko, tisuća not hiljada, "trebaš raditi" not "treba da radiš". Gym words: trening, serija, ponavljanje, čučanj, iskorak, sklek, teretana.'
      : 'Language: write the whole answer in English.';
  }

  function setText(s) {
    if (s.mins) return `${s.mins} min`;
    const parts = [];
    if (s.kg != null && s.kg !== '' && +s.kg > 0) parts.push(`${r1(s.kg)} kg`);
    if (s.reps) parts.push(`${s.reps} reps`);
    if (s.secs) parts.push(`${s.secs} s`);
    return parts.join(' × ') + (s.rir != null && s.rir !== '' ? ` @RIR ${s.rir}` : '');
  }
  const painWord = p => (p == null ? 'not rated' : p <= 3 ? 'fine' : p <= 5 ? `uncomfortable (${p}/10)` : `painful (${p}/10)`);

  /*
   * D: PoKreni state (profile, readiness, baselines, program, lifts, sessions, cardio, hc, tanjur, coach).
   * o: { today, appLang, question, EX, LS, PR, lessonDone(id), nextTemplate, targetText(ex, item, target), weight: { kg, date, src } }
   */
  function buildPrompt(D, o) {
    const EX = o.EX, LS = o.LS, PR = o.PR, today = o.today;
    const exn = id => (EX.byId[id] ? en(EX.byId[id].name) : id);
    const lang = detectLang(o.question, o.appLang);
    const L = [];
    const d = PK.parseKey(today);
    L.push(`Today: ${today} (${DOW[d.getDay()]}).`);

    const tp = (D.tanjur && D.tanjur.profile) || {};
    const who = [];
    const name = (D.profile && D.profile.name) || tp.name;
    if (name) who.push(name);
    if (tp.sex) who.push(tp.sex);
    if (tp.age) who.push(`${tp.age} years`);
    if (tp.height) who.push(`${tp.height} cm`);
    if (o.weight) who.push(`${r1(o.weight.kg)} kg (${o.weight.src === 'tanjur' ? 'from Tanjur' : o.weight.src === 'hc' ? 'from Health Connect' : 'typed in'}${o.weight.date ? ', ' + o.weight.date : ''})`);
    if (tp.goal) who.push(`weight goal in Tanjur: ${tp.goal}`);
    L.push(`Person: ${who.join(', ') || 'no profile details'}. Beginner who started training recently; works an office job (gym after work).`);
    const notes = String((D.profile && D.profile.notes) || '').trim();
    if (notes) L.push(`What they told the app about their body and health: "${notes.slice(0, 600)}"`);

    const R = D.readiness, rs = PK.readiness(R);
    if (rs === 'todo') L.push('Readiness check (PAR-Q style): not answered yet.');
    else {
      const yes = PK.READINESS_QS.filter(q => R.answers && R.answers[q] === true).map(q => READINESS_EN[q]);
      const bp = R.bpSys || R.bpDia ? ` Blood pressure ${R.bpSys || '?'}/${R.bpDia || '?'}${PK.bpHigh(R) ? ' (144/94 or higher)' : ''}.` : '';
      L.push(`Readiness check: ${rs === 'clear' ? 'all answers no, clear to train' : rs === 'cleared' ? `answered yes to: ${yes.join(', ') || 'blood pressure'}; their doctor has cleared them to train` : `answered yes to: ${yes.join(', ') || 'blood pressure'}; NOT yet cleared by a doctor, so only easy walking and cycling are planned`}.${bp}`);
    }

    const prog = PR.programs[(D.program && D.program.id) || 'foundations'] || PR.programs.foundations;
    const done = PK.sessionsIn(D.sessions, prog.id);
    L.push(`Programme: ${en(prog.name)} (${prog.weeks ? 'weeks ' + prog.weeks : ''}), ${done} sessions done. Sessions alternate A/B whenever they train. Rules the app applies: rep ranges like 8–12, stop most sets 2–3 reps before failure (RIR 2–3), add the smallest weight step only when every set reaches the top of the range, back off after two missed sessions, lighter day after poor sleep or pain.`);
    if (o.nextTemplate) L.push(`Next session: ${en(o.nextTemplate.name)}: ${o.nextTemplate.items.map(x => `${exn(x.ex.id)} ${x.text}`).join('; ')}.`);
    const days = ds => (ds || []).map(n => DOW[n].slice(0, 3)).join(', ') || 'none';
    if (D.profile) L.push(`Week plan: gym ${days(D.profile.gymDays)}; home walk or ride ${days(D.profile.homeDays)}.`);

    const sessions = (D.sessions || []).filter(s => s.end).sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 8);
    if (sessions.length) {
      L.push('Recent sessions (newest first):');
      sessions.forEach(s => {
        const items = (s.items || []).map(it => { const ds = (it.sets || []).filter(x => x.done); if (!ds.length) return ''; return `${exn(it.ex)}: ${ds.map(setText).join(', ')}${it.mins ? '' : `, felt ${painWord(it.pain)}`}`; }).filter(Boolean);
        L.push(`- ${s.date} ${en(s.name)}, ${PK.sessionMinutes(s)} min${s.lighter ? ', lighter day' : ''}, warm-up ${s.warmup || 0}/6 ticked: ${items.join('; ') || 'nothing ticked'}`);
      });
    } else L.push('Recent sessions: none yet.');
    const lifts = Object.keys(D.lifts || {}).map(id => { const l = D.lifts[id]; return `${exn(id)} ${l.kg != null ? r1(l.kg) + ' kg' : ''}${l.reps ? ' × ' + l.reps : ''}${l.secs ? ' ' + l.secs + ' s' : ''}`.trim(); });
    if (lifts.length) L.push(`Next-time targets the app set: ${lifts.join('; ')}.`);

    const weeks = PK.weeksBack(D, today, 4, (D.hc && D.hc.ext) || {});
    L.push(`Weekly activity (Monday-start weeks, oldest first, goal 150 active minutes and 2+ strength days): ${weeks.map(w => `${w.week}: ${w.strengthDays} strength days, ${w.cardioMin} active min`).join('; ')}.`);
    const from = PK.addDays(today, -14);
    const cardio = (D.cardio || []).filter(c => c.date >= from).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (cardio.length) L.push(`Walks and rides, last 14 days: ${cardio.map(c => `${c.date} ${exn(c.type)} ${c.minutes} min ${['easy', 'moderate', 'hard'][c.effort] || ''}`).join('; ')}.`);

    const B = D.baselines || [];
    if (B.length) {
      const f = b => ['restHr', 'waistCm', 'walkM', 'chairStands', 'pushReps', 'plankS'].filter(k => b[k] != null).map(k => `${k} ${b[k]}`).join(', ');
      L.push(`Tests: first ${B[0].date}: ${f(B[0])}${B.length > 1 ? `; latest ${B[B.length - 1].date}: ${f(B[B.length - 1])}` : ''}.`);
    }

    const doneL = LS.list.filter(l => o.lessonDone(l.id)), nextL = LS.list.find(l => !o.lessonDone(l.id));
    L.push(`Lessons done: ${doneL.map(l => l.id).join(', ') || 'none'}${nextL ? `; next: ${nextL.id} ${en(nextL.title)}` : ''}.`);

    const T = D.tanjur;
    if (T) {
      const tg = T.targets;
      L.push(`Food from Tanjur (updated ${T.at || '?'}): ${tg ? `daily targets ${tg.kcal} kcal, protein ${tg.protein} g, carbs ${tg.carbs} g, fat ${tg.fat} g` : 'no targets set'}.`);
      const dk = Object.keys(T.days || {}).sort().reverse().slice(0, 7);
      if (dk.length) L.push(`Logged days (newest first): ${dk.map(k => `${k}: ${T.days[k].kcal} kcal, P ${T.days[k].protein} g, ${T.days[k].meals} meals`).join('; ')}.`);
      if (T.today === today && (T.meals || []).length) L.push(`Meals today: ${T.meals.map(m => `${m.time} ${m.name} ${m.kcal} kcal P ${m.protein} g`).join('; ')}.`);
    } else L.push('Food: Tanjur data not available.');
    const H = D.hc || {};
    const sleep = H.sleep && H.sleep[today];
    if (sleep) L.push(`Sleep last night (Health Connect): ${sleep} h.`);
    if (D.active) L.push(`A session is in progress right now: ${en(D.active.name)}.`);

    const links = `Lesson ids: ${LS.list.map(l => `${l.id} ${en(l.title)}`).join('; ')}.\nExercise ids: ${EX.list.map(e => `${e.id} (${en(e.name)})`).join('; ')}.`;
    const hist = ((D.coach && D.coach.msgs) || []).filter(m => m.role === 'user' || m.role === 'coach').slice(-8)
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${String(m.text).slice(0, 1200)}`).join('\n');

    const prompt = `You are the coach inside PoKreni, a training app for a beginner. Be practical, warm and direct.
Rules:
- Base answers on the data below and quote their numbers. If the data can't answer, say what to log or try.
- Keep it short: under 180 words unless they ask for a plan or a list. Plain text; short "- " bullet lists are fine; no tables or headings.
- Safety first. If they describe chest pain or pressure, pain spreading to the arm or jaw, fainting, breathlessness that doesn't ease at rest, or dark urine with muscle weakness after training: tell them to stop and call 112 now, before anything else.
- Pain: 0-3/10 general ache is fine; 4-5/10 or pain that changes how they move means lighter weight, smaller range or a swap; sharp pain, pain in a joint, bone or tendon, swelling, numbness, or pain lasting over a week means stop that exercise and see a physiotherapist or doctor. Normal muscle soreness starts 12-24 h after training and fades within days.
- No diagnoses and no medication or supplement advice. For symptoms or conditions, give general information only and suggest a doctor or physiotherapist when it persists, worsens or worries them.
- If the readiness check says not yet cleared by a doctor, don't programme gym training; encourage the doctor visit and easy walking or cycling meanwhile.
- Training advice follows the app's rules above. Don't tell them to train to failure, jump weights, run or jump while joints adapt, or double up missed sessions. If you suggest changing a weight or exercise, say they can do it in the session (Swap, or typing another weight).
- Food advice stays within Tanjur's targets. Never suggest eating below the calorie target, below 1,500 kcal a day, skipping meals before training, or extreme diets.
- To point to a lesson or an exercise, put a tag such as [[lesson:L07]] or [[ex:goblet_squat]] at the end of a sentence. Use only ids from the lists below, at most 3 tags.
${langLine(lang)}

Data:
${L.join('\n')}

${links}
${hist ? `\nConversation so far (oldest first):\n${hist}\n` : ''}
New question: ${String(o.question || '').slice(0, 1500)}`;
    return { prompt, lang };
  }

  /* Answer → { html, links: [{ kind, id }] }. Text is escaped; "- " lines become a list; **bold** is kept. */
  function renderAnswer(text, EX, LS) {
    const links = [];
    const body = String(text || '').replace(/\[\[(lesson|ex):([A-Za-z0-9_]+)\]\]/g, (m, kind, id) => {
      const ok = kind === 'lesson' ? LS.byId[id] : EX.byId[id];
      if (ok && !links.some(l => l.kind === kind && l.id === id) && links.length < 4) links.push({ kind, id });
      return '';
    }).replace(/[ \t]+\n/g, '\n').trim();
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    const out = []; let list = [];
    const flush = () => { if (list.length) { out.push(`<ul>${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`); list = []; } };
    body.split('\n').forEach(line => {
      const m = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
      if (m) { list.push(m[1]); return; }
      flush();
      if (line.trim()) out.push(`<p>${inline(line.trim())}</p>`);
    });
    flush();
    return { html: out.join(''), links };
  }

  return { buildPrompt, renderAnswer, detectLang };
});
