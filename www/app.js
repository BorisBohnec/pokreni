/* PoKreni: learn to train safely and log gym sessions. Plain JS, no build step. Pairs with Tanjur through Health Connect. */
(function () {
'use strict';
const PK = window.PK, EX = window.PK_EXERCISES, PR = window.PK_PROGRAMS, LS = window.PK_LESSONS, I18N = window.PK_I18N;
const { dkey, addDays, parseKey, weekStart, clamp, num, daysBetween } = PK;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = PK.pad;
const PKG_SELF = 'app.pokreni.trainer', PKG_TANJUR = 'app.tanjur.tracker';
const HC_PERMS = ['WRITE_EXERCISE', 'READ_EXERCISE', 'WRITE_ACTIVE_CALORIES_BURNED', 'READ_WEIGHT', 'READ_SLEEP', 'READ_STEPS', 'READ_NUTRITION'].map(p => 'android.permission.health.' + p);

/* ---------- language ---------- */
let LANG = 'en';
function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}
const tx = o => (o == null ? '' : typeof o === 'string' ? o : (o[LANG] ?? o.en ?? ''));
const nf = d => new Intl.NumberFormat(LANG === 'hr' ? 'hr-HR' : 'en-GB', { maximumFractionDigits: d });
const n0 = v => nf(0).format(Math.round(+v || 0));
const n1 = v => nf(1).format(Math.round((+v || 0) * 10) / 10);
const dayName = d => t('dow' + d.getDay());
const monName = d => t('mon' + d.getMonth());
const fullDate = k => { const d = parseKey(k); return LANG === 'hr' ? `${dayName(d)}, ${d.getDate()}. ${monName(d)}` : `${dayName(d)} ${d.getDate()} ${monName(d)}`; };
const shortDate = k => { const d = parseKey(k); return LANG === 'hr' ? `${d.getDate()}. ${monName(d)}` : `${d.getDate()} ${monName(d)}`; };
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const exName = id => (EX.byId[id] ? tx(EX.byId[id].name) : id);

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>',
  book: '<path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3 3 0 0 1 3-3h10"/>',
  chart: '<path d="M5 20v-6M12 20V5M19 20v-10M3 20.5h18"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/>',
  go: '<path d="M6 6l6 6-6 6"/><path d="M12 6l6 6-6 6"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>',
  swap: '<path d="M7 7h12l-3.5-3.5M17 17H5l3.5 3.5"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M9 12l2-4 3 1 2 3"/><path d="M12 8l-1 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  left: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  right: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  flag: '<path d="M6 21V4.5M6 5h11l-2.5 4L17 13H6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  minus: '<path d="M5 12h14"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  sync: '<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path d="M18.5 3.5v4h-4M5.5 20.5v-4h4"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const chip = (kind, label) => `<span class="status ${kind}">${icon(kind === 'good' ? 'check' : kind === 'info' ? 'info' : 'alert')}${esc(label)}</span>`;

/* ---------- native ---------- */
const Native = (() => {
  const C = window.Capacitor;
  const native = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  const get = name => {
    if (!native) return null;
    try { return typeof C.registerPlugin === 'function' ? C.registerPlugin(name) : (C.Plugins && C.Plugins[name]) || null; }
    catch (e) { return (C.Plugins && C.Plugins[name]) || null; }
  };
  return { native, Filesystem: get('Filesystem'), Notif: get('LocalNotifications'), Health: get('Health'), Bridge: get('HcBridge'), App: get('App'), Awake: get('KeepAwake'), Haptics: get('Haptics'), Share: get('Share') };
})();

/* Without @capacitor/core bundled, a native plugin's addListener() returns a plain { remove } object, not a Promise.
   Never chain .catch() on it directly; this wrapper works with either shape and never throws. */
function listen(plugin, event, cb) {
  if (!plugin || typeof plugin.addListener !== 'function') return null;
  try { const h = plugin.addListener(event, cb); if (h && typeof h.catch === 'function') h.catch(() => {}); return h; }
  catch (e) { return null; }
}
const call = (p, method, args) => { try { return p && typeof p[method] === 'function' ? Promise.resolve(p[method](args)) : Promise.reject(new Error('unavailable')); } catch (e) { return Promise.reject(e); } };

/* ---------- state ---------- */
const DATA_FILE = 'pokreni-data.json', LS_KEY = 'pokreni.data.v1';
const DEFAULT_PROFILE = () => ({ name: '', lang: /^hr\b/i.test(navigator.language || '') ? 'hr' : 'en', gymDays: [1, 3, 5], homeDays: [2, 4, 6], planSet: false, restSec: 90, sound: true });
const S = {
  profile: DEFAULT_PROFILE(), readiness: null, baselines: [], lessons: {}, quiz: {},
  program: { id: 'foundations', next: 0 }, lifts: {}, sessions: [], cardio: [], active: null,
  settings: { health: { on: false }, remind: { on: false, time: '16:30' } },
  hc: { weight: null, sleep: {}, steps: {}, protein: {}, ext: {}, syncedAt: 0, granted: [] },
  tanjur: null,
  savedAt: 0
};
const U = { tab: 'today', rest: null, tick: 0, sheets: [], hcBusy: false, tanjur: null, tjState: '', tjAt: 0, gradDismissed: false };

function applyData(d) {
  if (!d || typeof d !== 'object') return;
  S.profile = Object.assign(DEFAULT_PROFILE(), d.profile || {});
  S.readiness = d.readiness && typeof d.readiness === 'object' ? d.readiness : null;
  S.baselines = Array.isArray(d.baselines) ? d.baselines.filter(b => b && PK.isKey(b.date)) : [];
  S.lessons = d.lessons && typeof d.lessons === 'object' ? d.lessons : {};
  S.quiz = d.quiz && typeof d.quiz === 'object' ? d.quiz : {};
  S.program = d.program && PR.programs[d.program.id] ? d.program : { id: 'foundations', next: 0 };
  S.lifts = d.lifts && typeof d.lifts === 'object' ? d.lifts : {};
  S.sessions = Array.isArray(d.sessions) ? d.sessions.filter(s => s && s.id && s.end) : [];
  S.cardio = Array.isArray(d.cardio) ? d.cardio.filter(c => c && c.id && PK.isKey(c.date)) : [];
  S.active = d.active && d.active.items ? d.active : null;
  S.settings = Object.assign({ health: { on: false }, remind: { on: false, time: '16:30' } }, d.settings || {});
  S.hc = Object.assign({ weight: null, sleep: {}, steps: {}, protein: {}, ext: {}, syncedAt: 0, granted: [] }, d.hc || {});
  S.tanjur = d.tanjur && d.tanjur.app === 'tanjur' ? d.tanjur : null;
  S.savedAt = d.savedAt || 0;
}
function snapshot() {
  S.savedAt = Date.now();
  return JSON.stringify({ app: 'pokreni', version: 1, savedAt: S.savedAt, profile: S.profile, readiness: S.readiness, baselines: S.baselines, lessons: S.lessons, quiz: S.quiz,
    program: S.program, lifts: S.lifts, sessions: S.sessions, cardio: S.cardio, active: S.active, settings: S.settings, hc: S.hc, tanjur: S.tanjur });
}
let saveTimer = 0, saveChain = Promise.resolve(), dirty = false, warned = false;
function persist() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 300); }
function flushSave() {
  clearTimeout(saveTimer);
  if (!dirty) return saveChain;
  dirty = false;
  const json = snapshot();
  try { localStorage.setItem(LS_KEY, json); } catch (e) { /* the file is the main copy */ }
  if (Native.Filesystem) {
    saveChain = saveChain.then(() => Native.Filesystem.writeFile({ path: DATA_FILE, data: json, directory: 'DATA', encoding: 'utf8' }))
      .catch(() => { if (!warned) { warned = true; toast(t('saveFail')); } })
      .then(writeShare);
  }
  return saveChain;
}
/* share.json: the last 14 days of sessions and walks, read by Tanjur through the bridge's ShareProvider,
   so Tanjur counts them even without Health Connect. */
function shareJSON() {
  const from = addDays(today(), -14), w = [];
  S.sessions.filter(s => s.date >= from).forEach(s => w.push({ id: s.id, kind: 'session', title: tx(s.name), date: s.date, start: s.start, minutes: PK.sessionMinutes(s), kcal: s.kcal || 0, type: 'strength' }));
  S.cardio.filter(c => c.date >= from).forEach(c => w.push({ id: 'c-' + c.id, kind: 'cardio', title: exName(c.type), date: c.date, start: c.start, minutes: c.minutes, kcal: c.kcal || 0, type: (EX.byId[c.type] || {}).hc || 'other' }));
  return JSON.stringify({ app: 'pokreni', v: 1, at: new Date().toISOString(), workouts: w });
}
function writeShare() {
  if (!Native.Filesystem) return Promise.resolve();
  return call(Native.Filesystem, 'writeFile', { path: 'share.json', data: shareJSON(), directory: 'DATA', encoding: 'utf8' }).catch(() => {});
}
function loadLocal() { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
async function loadFile() {
  if (!Native.Filesystem) return null;
  try { const r = await Native.Filesystem.readFile({ path: DATA_FILE, directory: 'DATA', encoding: 'utf8' }); return JSON.parse(r.data); } catch (e) { return null; }
}

/* ---------- derived ---------- */
const today = () => dkey();
const readiness = () => PK.readiness(S.readiness);
const canGym = () => ['clear', 'cleared'].includes(readiness());
const program = () => PR.programs[S.program.id] || PR.programs.foundations;
const doneInProgram = () => PK.sessionsIn(S.sessions, S.program.id);
const nextTemplate = () => { const p = program(); return p.templates[(S.program.next || 0) % p.templates.length]; };
/* Weight comes from Tanjur first, then Health Connect; typing it in is only the fallback. */
function weightSource() {
  const tw = S.tanjur && S.tanjur.weight;
  if (tw && +tw.kg > 25) return { kg: +tw.kg, date: tw.date, src: 'tanjur' };
  if (S.hc.weight && +S.hc.weight.kg > 25) return { kg: +S.hc.weight.kg, date: S.hc.weight.date, src: 'hc' };
  const m = num(S.profile.kg); return m ? { kg: m, date: null, src: 'manual' } : null;
}
const bodyKg = () => { const w = weightSource(); return w ? w.kg : null; };
const displayName = () => S.profile.name || (S.tanjur && S.tanjur.profile && S.tanjur.profile.name) || '';
/* Today's food from Tanjur, or null when Tanjur hasn't shared anything for today. */
function tanjurToday() {
  const T = S.tanjur; if (!T) return null;
  const k = today();
  const day = (T.days && T.days[k]) || null;
  return { day, meals: T.today === k ? (T.meals || []) : [], targets: T.targets || null, at: T.at };
}
const extMinutes = () => S.hc.ext || {};
function lessonDone(id) {
  const l = LS.byId[id]; if (!l) return false;
  const c = l.check.type;
  if (c === 'readiness') return readiness() !== 'todo';
  if (c === 'baseline') return S.baselines.length > 0;
  if (c === 'plan') return !!S.profile.planSet;
  if (c === 'auto') { const r = PK.autoCheck(id, S, today(), extMinutes()); return !!(r && r.ok); }
  if (c === 'quiz') return !!(S.quiz[id] && S.quiz[id].passed);
  return !!(S.lessons[id] && S.lessons[id].done);
}
const nextLesson = () => LS.list.find(l => !lessonDone(l.id)) || null;
function planFor(tpl, lighter) {
  const n = doneInProgram();
  return tpl.items.map(it => {
    const ex = EX.byId[it.ex];
    return { item: it, ex, target: PK.target(ex, it, S.lifts[it.ex], { doneInProgram: n, lighter }) };
  });
}
function targetText(ex, item, tg) {
  if (item.mins) return t('minEasy', { m: item.mins });
  const range = item.reps ? `${item.reps[0]}–${item.reps[1]}` : `${item.secs[0]}–${item.secs[1]} s`;
  const per = ex.side ? ' ' + t('perSide') : '';
  const load = tg.kg != null ? ` · ${n1(tg.kg)} kg` : (ex.kind === 'load' || ex.kind === 'carry') ? ' · ' + t('pickKg') : '';
  return `${tg.sets} × ${range}${per}${load}`;
}
function estMinutes(tpl) { let m = 8; tpl.items.forEach(it => { m += it.mins ? it.mins : (it.sets * ((it.rest || 90) + 40)) / 60; }); return Math.round(m / 5) * 5; }

/* ---------- toast ---------- */
let toastTimer = 0;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-btn" id="toastAct">${esc(action.label)}</button>` : ''}`;
  el.hidden = false; requestAnimationFrame(() => el.classList.add('show'));
  if (action) $('#toastAct').onclick = () => { action.fn(); hideToast(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, action ? 6500 : 3400);
}
function hideToast() { const el = $('#toast'); el.classList.remove('show'); setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 220); }

/* ---------- render ---------- */
let rq = 0;
function scheduleRender() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; renderAll(); }); }
function renderAll() {
  document.documentElement.lang = LANG;
  paintChrome();
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + U.tab; });
  const views = { today: renderToday, learn: renderLearn, train: renderTrain, progress: renderProgress, profile: renderProfile };
  safely(views[U.tab], '#view-' + U.tab);
  safely(renderRestBar);
  if (U.sheets.length) safely(renderSheet, '#sheetBody');
}
/* One broken card never blanks the whole screen: the error is shown in place so it can be reported. */
function safely(fn, sel) {
  try { if (fn) fn(); }
  catch (e) { console.error(e); const el = sel && $(sel); if (el) el.innerHTML = `<section class="card callout warn"><h2>${icon('alert')}${esc(t('oops'))}</h2><p class="small">${esc(String(e && e.message || e))}</p><button class="btn" data-act="reload">${esc(t('reload'))}</button></section>`; }
}
function setTab(tab) {
  if (tab === 'train' && !S.active) tab = 'today';
  U.tab = tab; window.scrollTo(0, 0); scheduleRender();
}
function paintChrome() {
  $('#langBtn').textContent = LANG === 'hr' ? 'EN' : 'HR';
  $('#langBtn').setAttribute('aria-label', t('switchLang'));
  const tabs = [['today', 'home', t('tabToday')], ['learn', 'book', t('tabLearn')], ['progress', 'chart', t('tabProgress')], ['profile', 'user', t('tabProfile')]];
  tabs.forEach(([id, ic, label]) => { const b = $('#tab-' + id); b.innerHTML = icon(ic) + `<span>${esc(label)}</span>`; b.setAttribute('aria-current', U.tab === id ? 'page' : 'false'); });
  const go = $('#tabGo');
  go.innerHTML = icon(S.active ? 'play' : 'go') + `<span>${esc(S.active ? t('resume') : t('train'))}</span>`;
  go.classList.toggle('live', !!S.active);
  go.setAttribute('aria-current', U.tab === 'train' ? 'page' : 'false');
}

/* ---------- today ---------- */
function renderToday() {
  const el = $('#view-today'), k = today(), d = new Date();
  const r = readiness();
  const hello = displayName() ? t('helloName', { name: displayName() }) : t('hello');
  let html = `<header class="view-head"><div><div class="eyebrow">${esc(fullDate(k))}</div><h1>${esc(hello)}</h1></div></header>`;
  if (r === 'todo') html += `<section class="card callout"><h2>${esc(t('firstThings'))}</h2><p>${esc(t('firstThingsBody'))}</p>
    <div class="row2"><button class="btn primary" data-act="readiness">${icon('heart')}${esc(t('readinessBtn'))}</button><button class="btn ghost" data-act="lesson" data-id="L01">${icon('book')}${esc(t('lesson1'))}</button></div></section>`;
  if (r === 'doctor') html += `<section class="card callout warn"><h2>${icon('alert')}${esc(t('doctorTitle'))}</h2><p>${esc(t('doctorBody'))}</p>
    <div class="row2"><button class="btn primary" data-act="cardio">${icon('walk')}${esc(t('logWalk'))}</button><button class="btn ghost" data-act="readiness">${esc(t('doctorCleared'))}</button></div></section>`;
  if (S.active) {
    const done = S.active.items.reduce((a, it) => a + it.sets.filter(s => s.done).length, 0);
    html += `<section class="card live-card"><div class="eyebrow">${esc(t('inProgress'))}</div><h2>${esc(tx(S.active.name))}</h2>
      <p class="muted">${esc(t('setsDoneN', { n: done }))} · ${esc(t('startedAt', { time: clock(new Date(S.active.start)) }))}</p>
      <button class="btn primary block" data-act="tab" data-tab="train">${icon('play')}${esc(t('resume'))}</button></section>`;
  } else if (canGym()) html += nextSessionCard(d);
  html += weekCard(k);
  const nl = nextLesson();
  if (nl) html += `<section class="card lesson-next" data-act="lesson" data-id="${nl.id}" role="button" tabindex="0"><div class="eyebrow">${esc(t('nextLesson'))} · ${esc(tx(LS.PHASES[nl.phase].name))}</div>
    <h2>${esc(t('lessonN', { n: +nl.id.slice(1) }))}: ${esc(tx(nl.title))}</h2><p class="muted">${esc(tx(nl.task))}</p></section>`;
  html += foodCard(k);
  const rt = PK.retestStatus(S.baselines, k);
  if (canGym() && rt.code === 'due') html += `<section class="card"><h2>${esc(t('retestDue'))}</h2><p class="muted">${esc(t('retestDueBody', { d: rt.days }))}</p><button class="btn" data-act="baseline">${esc(t('retestBtn'))}</button></section>`;
  el.innerHTML = html;
}
function nextSessionCard(d) {
  const tpl = nextTemplate(), p = program(), plan = planFor(tpl, false);
  const isGym = (S.profile.gymDays || []).includes(d.getDay());
  const isHome = (S.profile.homeDays || []).includes(d.getDay());
  const sub = isGym ? t('gymDay') : isHome ? t('homeDay') : t('restDay');
  const grad = p.next && doneInProgram() >= p.graduateAfter && !U.gradDismissed;
  return `${grad ? `<section class="card callout good"><h2>${esc(t('gradTitle', { name: tx(PR.programs[p.next].name) }))}</h2><p>${esc(t('gradBody', { n: doneInProgram(), from: tx(p.name), to: tx(PR.programs[p.next].name) }))}</p>
      <div class="row2"><button class="btn primary" data-act="graduate">${esc(t('gradYes'))}</button><button class="btn ghost" data-act="grad-later">${esc(t('notYet'))}</button></div></section>` : ''}
    <section class="card next">
      <div class="next-head"><div><div class="eyebrow">${esc(tx(p.name))} · ${esc(t('sessionN', { n: doneInProgram() + 1 }))}</div><h2>${esc(tx(tpl.name))}</h2></div>
        <span class="pill">${icon('clock')}${esc(t('aboutMin', { m: estMinutes(tpl) }))}</span></div>
      <p class="day-note ${isGym ? 'gym' : ''}">${esc(sub)}</p>
      <ol class="plan">${plan.map(({ item, ex, target }) => `<li class="${item.finisher ? 'opt' : ''}"><button class="plan-row" data-act="ex" data-id="${ex.id}">
        <span class="thumb">${ex.img ? `<img src="img/ex/${ex.id}_0.jpg" alt="" loading="lazy">` : icon(ex.kind === 'cardio' ? 'walk' : 'go')}</span>
        <span class="plan-main"><span class="plan-name">${esc(tx(ex.name))}${item.finisher ? ` <small>${esc(t('optional'))}</small>` : ''}</span><span class="plan-meta">${esc(targetText(ex, item, target))}</span></span></button></li>`).join('')}</ol>
      <button class="btn primary block big" data-act="start">${icon('go')}${esc(t('startSession'))}</button>
    </section>`;
}
function weekCard(k) {
  const ws = weekStart(k), w = PK.weekStats(S, ws, extMinutes());
  const goal = Math.max(2, (S.profile.gymDays || []).length);
  const items = [];
  S.sessions.filter(s => s.date >= ws).forEach(s => items.push({ date: s.date, t: s.start, label: tx(s.name), meta: `${PK.sessionMinutes(s)} min`, ic: 'go', act: `data-act="hist" data-id="${s.id}"` }));
  S.cardio.filter(c => c.date >= ws).forEach(c => items.push({ date: c.date, t: c.start || c.date, label: exName(c.type), meta: `${c.minutes} min`, ic: 'walk', act: `data-act="cardio" data-id="${c.id}"` }));
  for (const d in extMinutes()) if (d >= ws) items.push({ date: d, t: d, label: t('fromWatch'), meta: `${extMinutes()[d]} min`, ic: 'heart', act: '' });
  items.sort((a, b) => (a.t < b.t ? 1 : -1));
  const pct = clamp(w.cardioMin / 150 * 100, 0, 100);
  return `<section class="card week"><div class="card-head"><h2>${esc(t('thisWeek'))}</h2><button class="btn small ghost" data-act="cardio">${icon('plus')}${esc(t('logCardio'))}</button></div>
    <div class="week-stats">
      <div class="stat"><div class="stat-num">${w.strengthDays}<small>/ ${goal}</small></div><div class="stat-lab">${esc(t('strengthDays'))}</div>
        <div class="dots">${Array.from({ length: goal }, (_, i) => `<i class="${i < w.strengthDays ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="stat"><div class="stat-num">${n0(w.cardioMin)}<small>/ 150 min</small></div><div class="stat-lab">${esc(t('activeMinutes'))}</div>
        <div class="meter" role="img" aria-label="${n0(w.cardioMin)} / 150"><span style="width:${pct}%"></span></div></div>
    </div>
    ${items.length ? `<ul class="act-list">${items.slice(0, 8).map(i => `<li><button class="act-row" ${i.act}>${icon(i.ic)}<span class="act-main">${esc(i.label)}<small>${esc(shortDate(i.date))}</small></span><span class="act-meta">${esc(i.meta)}</span></button></li>`).join('')}</ul>` : `<p class="muted small">${esc(t('weekEmpty'))}</p>`}
  </section>`;
}
function foodCard(k) {
  const tj = tanjurToday();
  const btns = `<div class="row2"><button class="btn" data-act="tanjur" data-path="add">${esc(t('logMeal'))}</button><button class="btn ghost" data-act="tanjur" data-path="today">${esc(t('openTanjur'))}</button></div>`;
  const head = `<div class="card-head"><h2>${icon('plate')}${esc(t('fuel'))}</h2><span class="muted small">Tanjur${tj && tj.at ? ' · ' + esc(clock(new Date(tj.at))) : ''}</span></div>`;
  if (tj) {
    const d = tj.day || { kcal: 0, protein: 0 }, T = tj.targets;
    const meter = (v, goal) => `<div class="meter"><span style="width:${goal ? clamp(v / goal * 100, 0, 100) : 0}%"></span></div>`;
    const meals = tj.meals.length ? `<ul class="act-list food-list">${tj.meals.map(m => `<li><div class="act-row"><span class="food-time">${esc(m.time || '')}</span><span class="act-main">${esc(m.name || '')}<small>P ${n0(m.protein)} g</small></span><span class="act-meta">${n0(m.kcal)} kcal</span></div></li>`).join('')}</ul>` : `<p class="muted small">${esc(t('noMealsToday'))}</p>`;
    return `<section class="card tanjur">${head}
      <div class="fuel-grid"><div><div class="fuel-num">${n0(d.protein)}<small>${T && T.protein ? ' / ' + n0(T.protein) : ''} g</small></div><div class="stat-lab">${esc(t('protein'))}</div>${T && T.protein ? meter(d.protein, T.protein) : ''}</div>
        <div><div class="fuel-num">${n0(d.kcal)}<small>${T && T.kcal ? ' / ' + n0(T.kcal) : ''} kcal</small></div><div class="stat-lab">${esc(t('energy'))}</div>${T && T.kcal ? meter(d.kcal, T.kcal) : ''}</div></div>
      ${meals}${btns}</section>`;
  }
  const p = S.hc.protein && S.hc.protein[k];
  const msg = p ? `<p class="fuel-line"><b>${n0(p.protein)} g</b> ${esc(t('proteinToday'))} · ${n0(p.kcal)} kcal</p>` : `<p class="muted small">${esc(U.tjState === 'refused' ? t('tanjurRefused') : t('tanjurNotYet'))}</p>`;
  return `<section class="card tanjur">${head}${msg}${btns}</section>`;
}

/* ---------- learn ---------- */
function renderLearn() {
  const el = $('#view-learn');
  const done = LS.list.filter(l => lessonDone(l.id)).length;
  let html = `<header class="view-head"><div><div class="eyebrow">${esc(t('lessonsDone', { n: done, total: LS.list.length }))}</div><h1>${esc(t('tabLearn'))}</h1></div></header>
    <section class="card flags" data-act="redflags" role="button" tabindex="0"><h2>${icon('flag')}${esc(t('redFlags'))}</h2><p>${esc(t('redFlagsShort'))}</p></section>`;
  LS.PHASES.forEach(ph => {
    const ls = LS.list.filter(l => l.phase === ph.n);
    html += `<section class="card phase"><div class="card-head"><h2>${esc(tx(ph.name))}</h2><span class="muted small">${esc(tx(ph.when))}</span></div><ol class="lessons">
      ${ls.map(l => { const d = lessonDone(l.id); const cur = !d && nextLesson() === l; return `<li><button class="lesson-row ${d ? 'done' : ''} ${cur ? 'current' : ''}" data-act="lesson" data-id="${l.id}">
        <span class="lnum">${d ? icon('check') : +l.id.slice(1)}</span><span class="lmain"><span class="lname">${esc(tx(l.title))}</span><span class="lmeta">${esc(tx(l.task))}</span></span>${icon('right', 'chev')}</button></li>`; }).join('')}
    </ol></section>`;
  });
  html += `<section class="card"><h2>${esc(t('library'))}</h2><p class="muted small">${esc(t('libraryBody'))}</p><div class="chips wrap">${EX.list.map(e => `<button class="chip-btn" data-act="ex" data-id="${e.id}">${esc(tx(e.name))}</button>`).join('')}</div></section>`;
  el.innerHTML = html;
}

/* ---------- train (live session) ---------- */
function startSession() {
  if (S.active) { setTab('train'); return; }
  if (readiness() === 'todo') { openSheet('readiness'); return; }
  if (!canGym()) { toast(t('doctorFirst')); return; }
  openSheet('checkin');
}
function beginSession(lighter, painToday) {
  const tpl = nextTemplate(), p = program();
  const plan = planFor(tpl, lighter);
  S.active = {
    id: uid(), program: p.id, template: tpl.key, name: tpl.name, date: today(), start: new Date().toISOString(),
    lighter: !!lighter, painToday: !!painToday, warmup: {}, warmOpen: true,
    items: plan.map(({ item, ex, target }) => ({ ex: ex.id, orig: ex.id, item: clone(item), target, sets: mkSets(ex, item, target), pain: null, open: false }))
  };
  const first = S.active.items.find(it => !it.item.finisher); if (first) first.open = true;
  persist(); keepAwake(true); askNotifPermission();
  closeAllSheets(); setTab('train');
}
function mkSets(ex, item, tg) {
  if (item.mins) return [{ mins: item.mins, done: false }];
  return Array.from({ length: tg.sets }, () => ({ kg: tg.kg != null ? tg.kg : '', reps: tg.reps != null ? tg.reps : '', secs: tg.secs != null ? tg.secs : '', rir: '', done: false }));
}
function renderTrain() {
  const el = $('#view-train'), A = S.active;
  if (!A) { el.innerHTML = ''; return; }
  const elapsed = (Date.now() - Date.parse(A.start)) / 1000;
  let html = `<header class="train-head"><div><div class="eyebrow">${esc(tx(program().name))}${A.lighter ? ' · ' + esc(t('lighterDay')) : ''}</div><h1>${esc(tx(A.name))}</h1></div>
    <div class="elapsed" id="elapsed">${mmss(elapsed)}</div></header>`;
  if (A.lighter) html += `<p class="banner info">${icon('info')}${esc(t('lighterBody'))}</p>`;
  html += `<section class="card warm"><button class="warm-head" data-act="warm-toggle"><h2>${esc(t('warmup'))}</h2><span class="muted small">${Object.values(A.warmup).filter(Boolean).length}/${PR.WARMUP.length}</span>${icon(A.warmOpen ? 'up' : 'down', 'chev')}</button>
    ${A.warmOpen ? `<ul class="checklist">${PR.WARMUP.map(w => `<li><label><input type="checkbox" data-warm="${w.id}" ${A.warmup[w.id] ? 'checked' : ''}><span>${esc(tx(w))}</span></label></li>`).join('')}</ul>` : ''}</section>`;
  A.items.forEach((it, i) => { html += trainItem(it, i); });
  html += `<div class="train-foot"><button class="btn primary block big" data-act="finish">${icon('check')}${esc(t('finishSession'))}</button>
    <button class="btn ghost block" data-act="discard">${esc(t('discardSession'))}</button></div>`;
  el.innerHTML = html;
}
function trainItem(it, i) {
  const ex = EX.byId[it.ex], item = it.item;
  const done = it.sets.filter(s => s.done).length, all = it.sets.length;
  const complete = done === all;
  const head = `<button class="ti-head" data-act="ti-toggle" data-i="${i}">
      <span class="thumb">${ex.img ? `<img src="img/ex/${ex.id}_0.jpg" alt="" loading="lazy">` : icon(ex.kind === 'cardio' ? 'walk' : 'go')}</span>
      <span class="ti-main"><span class="ti-name">${esc(tx(ex.name))}${item.finisher ? ` <small>${esc(t('optional'))}</small>` : ''}</span><span class="ti-meta">${esc(targetText(ex, item, it.target))}</span></span>
      <span class="ti-count ${complete ? 'ok' : ''}">${complete ? icon('check') : `${done}/${all}`}</span></button>`;
  if (!it.open) return `<section class="card ti ${complete ? 'complete' : ''}">${head}</section>`;
  const firstTime = (ex.kind === 'load' || ex.kind === 'carry') && it.target.kg == null && !done;
  const rows = it.sets.map((s, j) => setRow(ex, item, s, i, j)).join('');
  const swap = (ex.alts || []).length ? `<button class="btn small ghost" data-act="swap" data-i="${i}">${icon('swap')}${esc(t('swap'))}</button>` : '';
  const pain = done && !item.mins ? `<div class="pain"><span>${esc(t('howFelt'))}</span><div class="seg small">
      ${[[2, 'painFine'], [5, 'painMeh'], [7, 'painSharp']].map(([v, k]) => `<button data-act="pain" data-i="${i}" data-v="${v}" aria-pressed="${it.pain === v}">${esc(t(k))}</button>`).join('')}</div>
      ${it.pain >= 6 ? `<p class="banner crit">${icon('alert')}${esc(t('painRedAdvice'))}</p>` : it.pain >= 4 ? `<p class="banner warn">${icon('info')}${esc(t('painYellowAdvice'))}</p>` : ''}</div>` : '';
  return `<section class="card ti open ${complete ? 'complete' : ''}">${head}
    ${ex.note ? `<p class="banner info">${icon('info')}${esc(tx(ex.note))}</p>` : ''}
    ${firstTime ? `<p class="hint">${esc(t('firstLoadHint'))}</p>` : ''}
    <div class="sets">${setHeader(ex, item)}${rows}</div>
    <div class="ti-tools"><button class="btn small ghost" data-act="ex" data-id="${ex.id}">${icon('info')}${esc(t('howTo'))}</button>${swap}${!item.mins ? `<button class="btn small ghost" data-act="add-set" data-i="${i}">${icon('plus')}${esc(t('addSet'))}</button>${it.sets.length > 1 ? `<button class="btn small ghost" data-act="del-set" data-i="${i}">${icon('minus')}${esc(t('removeSet'))}</button>` : ''}` : ''}</div>
    ${pain}</section>`;
}
function setHeader(ex, item) {
  if (item.mins) return `<div class="set-row head"><span>#</span><span>${esc(t('minutes'))}</span><span></span><span></span><span></span></div>`;
  const a = ex.kind === 'load' || ex.kind === 'carry' ? 'kg' : '';
  const b = ex.kind === 'time' || ex.kind === 'carry' ? t('seconds') : t('reps');
  return `<div class="set-row head"><span>#</span><span>${a}</span><span>${esc(b)}</span><span>RIR</span><span></span></div>`;
}
function setRow(ex, item, s, i, j) {
  const attrs = f => `data-i="${i}" data-j="${j}" data-f="${f}"`;
  const inp = (f, v, step, ph) => `<input class="num" type="number" inputmode="decimal" step="${step}" min="0" value="${esc(v)}" placeholder="${esc(ph || '')}" ${attrs(f)} ${s.done ? 'disabled' : ''} aria-label="${esc(f)} ${j + 1}">`;
  const check = `<button class="set-done ${s.done ? 'on' : ''}" data-act="set-done" data-i="${i}" data-j="${j}" aria-label="${esc(s.done ? t('undoSet') : t('setDone'))}">${icon('check')}</button>`;
  if (item.mins) return `<div class="set-row ${s.done ? 'done' : ''}"><span class="sn">${j + 1}</span>${inp('mins', s.mins, 1)}<span></span><span></span>${check}</div>`;
  const kgCell = ex.kind === 'load' || ex.kind === 'carry' ? inp('kg', s.kg, ex.step && ex.step < 2 ? 0.5 : 1, 'kg') : '<span class="bw">BW</span>';
  const second = ex.kind === 'time' || ex.kind === 'carry' ? inp('secs', s.secs, 5, 's') : inp('reps', s.reps, 1);
  const rir = `<select class="rir" ${attrs('rir')} ${s.done ? 'disabled' : ''} aria-label="RIR ${j + 1}"><option value="">–</option>${['4', '3', '2', '1', '0'].map(v => `<option value="${v}" ${String(s.rir) === v ? 'selected' : ''}>${v === '4' ? '4+' : v}</option>`).join('')}</select>`;
  return `<div class="set-row ${s.done ? 'done' : ''}"><span class="sn">${j + 1}</span>${kgCell}${second}${rir}${check}</div>`;
}
function onTrainInput(e) {
  const el = e.target, A = S.active; if (!A) return;
  if (el.dataset.warm) { A.warmup[el.dataset.warm] = el.checked; persist(); return; }
  const i = +el.dataset.i, j = +el.dataset.j, f = el.dataset.f;
  if (!f || !A.items[i] || !A.items[i].sets[j]) return;
  const v = f === 'rir' ? (el.value === '' ? '' : +el.value) : el.value;
  A.items[i].sets[j][f] = v;
  /* Typing a weight in the first set fills the empty sets below it. */
  if (f === 'kg' && j === 0) A.items[i].sets.forEach((s, k) => { if (k > 0 && !s.done && (s.kg === '' || s.kg == null)) { s.kg = v; const o = $(`input[data-i="${i}"][data-j="${k}"][data-f="kg"]`); if (o) o.value = v; } });
  persist();
}
function toggleSet(i, j) {
  const A = S.active, it = A.items[i], s = it.sets[j], ex = EX.byId[it.ex];
  if (!s.done) {
    if ((ex.kind === 'load' || ex.kind === 'carry') && (s.kg === '' || num(s.kg) == null)) { toast(t('enterKg')); const o = $(`input[data-i="${i}"][data-j="${j}"][data-f="kg"]`); if (o) o.focus(); return; }
    s.done = true; s.at = Date.now();
    haptic(30);
    const last = it.sets.every(x => x.done);
    if (!it.item.mins) startRest(it.item.rest || S.profile.restSec || 90, last ? nextItemName(i) : tx(ex.name));
    if (last) { const nxt = A.items.findIndex((x, k) => k > i && x.sets.some(y => !y.done)); if (nxt >= 0) { A.items[nxt].open = true; } }
  } else { s.done = false; }
  persist(); renderTrain(); paintChrome();
}
function nextItemName(i) { const n = S.active.items.find((x, k) => k > i && x.sets.some(y => !y.done)); return n ? t('nextUp', { name: exName(n.ex) }) : t('lastOneDone'); }
function swapExercise(i, newId) {
  const it = S.active.items[i], ex = EX.byId[newId]; if (!ex) return;
  const item = Object.assign({}, it.item, { ex: newId });
  if ((ex.kind === 'time' || ex.kind === 'carry') && !item.secs) { item.secs = [20, 40]; delete item.reps; }
  if ((ex.kind === 'load' || ex.kind === 'bw') && !item.reps) { item.reps = [8, 12]; delete item.secs; }
  const tg = PK.target(ex, item, S.lifts[newId], { doneInProgram: doneInProgram(), lighter: S.active.lighter });
  Object.assign(it, { ex: newId, item, target: tg, sets: mkSets(ex, item, tg), pain: null, open: true });
  persist(); closeAllSheets(); renderTrain();
}
function finishSession() {
  const A = S.active; if (!A) return;
  const anyDone = A.items.some(it => it.sets.some(s => s.done));
  if (!anyDone) { openSheet('confirm', { msg: t('nothingDone'), yes: t('discardSession'), act: 'discard-yes' }); return; }
  const end = new Date().toISOString();
  const changes = [];
  A.items.forEach(it => {
    const ex = EX.byId[it.ex];
    const sets = it.sets.map(s => ({ kg: num(s.kg), reps: num(s.reps), secs: num(s.secs), mins: num(s.mins), rir: s.rir === '' || s.rir == null ? null : +s.rir, done: !!s.done }));
    it.done = sets;
    if (it.item.mins || !sets.some(s => s.done)) return;
    const r = PK.evaluate(ex, it.item, S.lifts[it.ex], { sets, planned: it.sets.length, pain: it.pain, date: A.date });
    if (A.lighter && r.change.code === 'up') { r.lift.kg = r.change.from; r.lift.reps = it.item.reps ? it.item.reps[1] : r.lift.reps; r.change = { code: 'hold-light' }; }
    if (r.lift) S.lifts[it.ex] = r.lift;
    changes.push({ ex: it.ex, change: r.change, lift: r.lift });
  });
  const session = {
    id: A.id, program: A.program, template: A.template, name: A.name, date: A.date, start: A.start, end, lighter: A.lighter,
    warmup: Object.values(A.warmup).filter(Boolean).length,
    items: A.items.map(it => ({ ex: it.ex, orig: it.orig, mins: it.item.mins || undefined, reps: it.item.reps, secs: it.item.secs, pain: it.pain, sets: it.done })),
    changes
  };
  const mins = PK.sessionMinutes(session), kg = bodyKg() || 90;
  session.kcal = PK.activeKcal(PK.STRENGTH_MET, kg, mins);
  S.sessions.push(session);
  S.program.next = ((S.program.next || 0) + 1) % program().templates.length;
  S.active = null; U.rest = null; cancelRestNotif();
  persist(); keepAwake(false);
  writeSessionHC(session);
  setTab('today');
  openSheet('summary', { id: session.id });
}
function discardSession() { S.active = null; U.rest = null; cancelRestNotif(); keepAwake(false); persist(); closeAllSheets(); setTab('today'); toast(t('discarded')); }
function changeText(c) {
  const ch = c.change, ex = EX.byId[c.ex];
  switch (ch.code) {
    case 'up': return t('chUp', { kg: n1(ch.to), d: n1(ch.to - ch.from) });
    case 'reps': return ch.secs ? t('chSecs', { s: ch.secs }) : t('chReps', { r: ch.reps });
    case 'hold': return t('chHold');
    case 'hold-light': return t('chHoldLight');
    case 'down': return t('chDown', { kg: n1(ch.to) });
    case 'pain-hold': return t('chPainHold');
    case 'pain-down': return ex.kind === 'load' || ex.kind === 'carry' ? t('chPainDown', { kg: n1(ch.to) }) : t('chPainSwap');
    case 'harder': return t('chHarder', { name: exName(ch.to) });
    case 'top': return t('chTop');
    default: return '';
  }
}

/* ---------- rest timer ---------- */
function startRest(sec, label) {
  U.rest = { end: Date.now() + sec * 1000, total: sec, label, alerted: false };
  scheduleRestNotif(U.rest.end, label);
  renderRestBar(); ensureTick();
}
function renderRestBar() {
  const bar = $('#restBar');
  const show = !!U.rest && U.tab === 'train';
  document.body.classList.toggle('resting', show);
  if (!show) { bar.hidden = true; return; }
  const left = (U.rest.end - Date.now()) / 1000;
  bar.hidden = false;
  bar.classList.toggle('over', left <= 0);
  bar.innerHTML = `<div class="rest-fill" style="width:${clamp((1 - left / U.rest.total) * 100, 0, 100)}%"></div>
    <div class="rest-in"><span class="rest-lab">${esc(left > 0 ? t('rest') : t('restDone'))}<small>${esc(U.rest.label || '')}</small></span><span class="rest-time">${left > 0 ? mmss(left) : '0:00'}</span>
    <button class="btn small" data-act="rest-add">+30 s</button><button class="btn small ghost" data-act="rest-skip">${esc(left > 0 ? t('skip') : t('close'))}</button></div>`;
}
function ensureTick() {
  if (U.tick) return;
  U.tick = setInterval(() => {
    if (!S.active) { clearInterval(U.tick); U.tick = 0; return; }
    const e = $('#elapsed'); if (e) e.textContent = mmss((Date.now() - Date.parse(S.active.start)) / 1000);
    if (U.rest) {
      if (!U.rest.alerted && Date.now() >= U.rest.end) { U.rest.alerted = true; restAlert(); }
      if (U.tab === 'train') renderRestBar();
    }
  }, 250);
}
let audioCtx = null;
function restAlert() {
  haptic(500);
  if (!S.profile.sound || document.visibilityState !== 'visible') return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22, 0.44].forEach(off => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      const t0 = audioCtx.currentTime + off; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.start(t0); o.stop(t0 + 0.2);
    });
  } catch (e) { /* sound is optional */ }
}
const REST_NOTIF = 9001;
async function scheduleRestNotif(at, label) {
  if (!Native.Notif) return;
  try {
    await cancelRestNotif();
    await Native.Notif.schedule({ notifications: [{ id: REST_NOTIF, title: t('restDone'), body: label || '', schedule: { at: new Date(at), allowWhileIdle: true }, channelId: 'rest', smallIcon: 'ic_stat_pokreni' }] });
  } catch (e) { /* the in-app timer still works */ }
}
async function cancelRestNotif() { if (!Native.Notif) return; try { await Native.Notif.cancel({ notifications: [{ id: REST_NOTIF }] }); } catch (e) { /* none scheduled */ } }
async function askNotifPermission() {
  if (!Native.Notif) return;
  try {
    const p = await Native.Notif.checkPermissions();
    if (p.display !== 'granted') await Native.Notif.requestPermissions();
    await Native.Notif.createChannel({ id: 'rest', name: t('restChannel'), importance: 5, vibration: true, visibility: 1 });
  } catch (e) { /* optional */ }
}
function haptic(ms) { if (Native.Haptics) Native.Haptics.vibrate({ duration: ms }).catch(() => {}); else if (navigator.vibrate) navigator.vibrate(ms); }
function keepAwake(on) { if (!Native.Awake) return; (on ? Native.Awake.keepAwake() : Native.Awake.allowSleep()).catch(() => {}); }

/* ---------- reminders on gym days ---------- */
async function scheduleReminders() {
  if (!Native.Notif) return;
  try {
    const ids = Array.from({ length: 7 }, (_, i) => ({ id: 100 + i }));
    await Native.Notif.cancel({ notifications: ids });
    const r = S.settings.remind; if (!r || !r.on) return;
    const [h, m] = String(r.time || '16:30').split(':').map(Number);
    const notifications = (S.profile.gymDays || []).map(d => ({ id: 100 + d, title: t('remindTitle'), body: t('remindBody'), schedule: { on: { weekday: d + 1, hour: h, minute: m }, allowWhileIdle: true }, smallIcon: 'ic_stat_pokreni', extra: { url: 'pokreni://today' } }));
    if (notifications.length) await Native.Notif.schedule({ notifications });
  } catch (e) { /* optional */ }
}

/* ---------- progress ---------- */
function renderProgress() {
  const el = $('#view-progress'), k = today();
  const weeks = PK.weeksBack(S, k, 8, extMinutes());
  let html = `<header class="view-head"><div><div class="eyebrow">${esc(t('last8'))}</div><h1>${esc(t('tabProgress'))}</h1></div></header>`;
  html += `<section class="card"><h2>${esc(t('weeksTitle'))}</h2>${weeksChart(weeks)}<p class="muted small">${esc(t('weeksNote'))}</p></section>`;
  const exIds = [...new Set(S.sessions.flatMap(s => (s.items || []).filter(i => !i.mins && i.sets && i.sets.some(x => x.done)).map(i => i.ex)))];
  html += `<section class="card"><h2>${esc(t('liftsTitle'))}</h2>${exIds.length ? `<ul class="lift-list">${exIds.map(id => liftRow(id)).join('')}</ul>` : `<p class="muted small">${esc(t('liftsEmpty'))}</p>`}</section>`;
  html += testsCard(k);
  const hist = S.sessions.map(s => ({ kind: 's', d: s.date, t: s.start, o: s })).concat(S.cardio.map(c => ({ kind: 'c', d: c.date, t: c.start || c.date, o: c }))).sort((a, b) => (a.t < b.t ? 1 : -1));
  html += `<section class="card"><h2>${esc(t('history'))}</h2>${hist.length ? `<ul class="act-list">${hist.slice(0, 40).map(h => h.kind === 's'
    ? `<li><button class="act-row" data-act="hist" data-id="${h.o.id}">${icon('go')}<span class="act-main">${esc(tx(h.o.name))}<small>${esc(fullDate(h.d))}</small></span><span class="act-meta">${PK.sessionMinutes(h.o)} min</span></button></li>`
    : `<li><button class="act-row" data-act="cardio" data-id="${h.o.id}">${icon('walk')}<span class="act-main">${esc(exName(h.o.type))}<small>${esc(fullDate(h.d))}</small></span><span class="act-meta">${h.o.minutes} min</span></button></li>`).join('')}</ul>` : `<p class="muted small">${esc(t('historyEmpty'))}</p>`}</section>`;
  el.innerHTML = html;
}
function weeksChart(weeks) {
  const W = 320, H = 150, padL = 30, padB = 22, top = 10, max = Math.max(180, ...weeks.map(w => w.cardioMin));
  const bw = (W - padL) / weeks.length;
  const y = v => top + (H - top - padB) * (1 - v / max);
  const bars = weeks.map((w, i) => {
    const x = padL + i * bw + bw * 0.18, h = (H - padB) - y(w.cardioMin);
    const d = parseKey(w.week);
    return `<rect x="${x.toFixed(1)}" y="${y(w.cardioMin).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" class="bar ${w.cardioMin >= 150 ? 'hit' : ''}"><title>${w.cardioMin} min</title></rect>
      ${Array.from({ length: Math.min(w.strengthDays, 4) }, (_, k) => `<circle cx="${(x + bw * 0.32).toFixed(1)}" cy="${(y(w.cardioMin) - 7 - k * 9).toFixed(1)}" r="3.2" class="sdot"/>`).join('')}
      <text x="${(x + bw * 0.32).toFixed(1)}" y="${H - 6}" class="axis" text-anchor="middle">${d.getDate()}.${d.getMonth() + 1}.</text>`;
  }).join('');
  return `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('weeksTitle'))}">
    <line x1="${padL}" x2="${W}" y1="${y(150).toFixed(1)}" y2="${y(150).toFixed(1)}" class="goal"/><text x="${padL - 4}" y="${(y(150) + 4).toFixed(1)}" class="axis" text-anchor="end">150</text>
    <text x="${padL - 4}" y="${(H - padB + 4)}" class="axis" text-anchor="end">0</text>${bars}</svg>
    <div class="legend"><span><i class="k bar"></i>${esc(t('activeMinutes'))}</span><span><i class="k dot"></i>${esc(t('strengthDays'))}</span></div>`;
}
function liftRow(id) {
  const ex = EX.byId[id], h = PK.liftHistory(S, id).slice(-12), lift = S.lifts[id] || {};
  const vals = h.map(x => (ex.kind === 'load' || ex.kind === 'carry') ? x.kg : (ex.kind === 'time' ? x.secs : x.reps));
  const now = ex.kind === 'load' ? `${n1(lift.kg ?? vals[vals.length - 1] ?? 0)} kg × ${lift.reps ?? ''}` : ex.kind === 'carry' ? `${n1(lift.kg ?? 0)} kg · ${lift.secs ?? ''} s` : ex.kind === 'time' ? `${lift.secs ?? vals[vals.length - 1] ?? ''} s` : `${lift.reps ?? vals[vals.length - 1] ?? ''} ${t('reps')}`;
  return `<li><button class="lift-row" data-act="ex" data-id="${id}"><span class="lift-main">${esc(tx(ex.name))}<small>${esc(t('nextTime'))}: ${esc(now)}</small></span>${spark(vals)}</button></li>`;
}
function spark(vals) {
  if (vals.length < 2) return '<span class="spark-empty"></span>';
  const W = 90, H = 30, mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * (W - 4) + 2).toFixed(1)},${(H - 3 - (v - mn) / r * (H - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
const TESTS = [['restHr', 'tRestHr', 'bpm', -1], ['waistCm', 'tWaist', 'cm', -1], ['walkM', 'tWalk', 'm', 1], ['chairStands', 'tChair', '', 1], ['pushReps', 'tPush', '', 1], ['plankS', 'tPlank', 's', 1]];
function testsCard(k) {
  const b = S.baselines, first = b[0], last = b[b.length - 1], rt = PK.retestStatus(b, k);
  const row = ([key, lab, unit, better]) => {
    const a = first && num(first[key]), z = last && num(last[key]);
    const diff = a != null && z != null && b.length > 1 ? z - a : null;
    const good = diff != null && diff * better > 0;
    return `<tr><th>${esc(t(lab))}</th><td>${a != null ? n1(a) + ' ' + unit : '–'}</td><td>${z != null && b.length > 1 ? n1(z) + ' ' + unit : '–'}</td><td class="${diff ? (good ? 'up' : 'down') : ''}">${diff ? (diff > 0 ? '+' : '') + n1(diff) : ''}</td></tr>`;
  };
  return `<section class="card"><div class="card-head"><h2>${esc(t('testsTitle'))}</h2><button class="btn small" data-act="baseline">${icon('plus')}${esc(b.length ? t('retestBtn') : t('baselineBtn'))}</button></div>
    ${b.length ? `<table class="tests"><thead><tr><th></th><th>${esc(shortDate(first.date))}</th><th>${b.length > 1 ? esc(shortDate(last.date)) : ''}</th><th></th></tr></thead><tbody>${TESTS.map(row).join('')}</tbody></table>
      <p class="muted small">${esc(rt.code === 'due' ? t('retestDueBody', { d: rt.days }) : t('retestNext', { date: shortDate(rt.next) }))}</p>` : `<p class="muted small">${esc(t('baselineEmpty'))}</p>`}</section>`;
}

/* ---------- profile ---------- */
function renderProfile() {
  const el = $('#view-profile'), P = S.profile, r = readiness();
  const days = [1, 2, 3, 4, 5, 6, 0];
  const dayBtns = (key) => days.map(d => `<button data-act="day" data-k="${key}" data-d="${d}" aria-pressed="${(P[key] || []).includes(d)}">${esc(t('dowS' + d))}</button>`).join('');
  const hs = S.settings.health || {};
  const rState = { todo: ['warn', t('rTodo')], clear: ['good', t('rClear')], doctor: ['crit', t('rDoctor')], cleared: ['good', t('rCleared')] }[r];
  el.innerHTML = `<header class="view-head"><div><div class="eyebrow">PoKreni</div><h1>${esc(t('tabProfile'))}</h1></div></header>
    <section class="card"><h2>${esc(t('you'))}</h2>
      <label class="field"><span>${esc(t('name'))}</span><input id="pf-name" value="${esc(P.name)}" placeholder="${esc(displayName())}" autocomplete="given-name"></label>
      <label class="field"><span>${esc(t('language'))}</span><select id="pf-lang"><option value="en" ${LANG === 'en' ? 'selected' : ''}>English</option><option value="hr" ${LANG === 'hr' ? 'selected' : ''}>Hrvatski</option></select></label>
      ${weightField()}
    </section>
    <section class="card"><div class="card-head"><h2>${esc(t('readinessTitle'))}</h2>${chip(rState[0], rState[1])}</div>
      <p class="muted small">${esc(S.readiness && S.readiness.answeredAt ? t('answeredOn', { date: fullDate(S.readiness.answeredAt) }) : t('readinessWhy'))}</p>
      <button class="btn" data-act="readiness">${esc(S.readiness ? t('redoReadiness') : t('readinessBtn'))}</button></section>
    <section class="card"><h2>${esc(t('weekPlan'))}</h2>
      <div class="field"><span>${esc(t('gymDays'))}</span><div class="seg days">${dayBtns('gymDays')}</div></div>
      <div class="field"><span>${esc(t('homeDays'))}</span><div class="seg days">${dayBtns('homeDays')}</div></div>
      <p class="muted small">${esc(t('weekPlanNote'))}</p>
      ${!P.planSet ? `<button class="btn primary" data-act="plan-save">${esc(t('planSave'))}</button>` : `<p class="small">${chip('good', t('planSaved'))}</p>`}</section>
    <section class="card"><h2>${esc(t('training'))}</h2>
      <label class="field"><span>${esc(t('restDefault'))}</span><select id="pf-rest">${[60, 90, 120, 150, 180].map(s => `<option value="${s}" ${+P.restSec === s ? 'selected' : ''}>${mmss(s)}</option>`).join('')}</select><small class="muted">${esc(t('restNote'))}</small></label>
      <label class="switch"><input type="checkbox" id="pf-sound" ${P.sound ? 'checked' : ''}><span>${esc(t('soundOn'))}</span></label>
      <label class="switch"><input type="checkbox" id="pf-remind" ${S.settings.remind.on ? 'checked' : ''}><span>${esc(t('remindOn'))}</span></label>
      ${S.settings.remind.on ? `<label class="field"><span>${esc(t('remindTime'))}</span><input type="time" id="pf-remind-time" value="${esc(S.settings.remind.time || '16:30')}"></label>` : ''}
      <p class="muted small">${esc(t('programNow', { name: tx(program().name), n: doneInProgram() }))}</p>
      ${program().id !== 'foundations' ? `<button class="btn small ghost" data-act="program" data-id="foundations">${esc(t('backToFoundations'))}</button>` : ''}</section>
    <section class="card"><div class="card-head"><h2>Health Connect</h2>${chip(hs.on ? 'good' : 'info', hs.on ? t('on') : t('off'))}</div>
      ${hcBody()}</section>
    <section class="card"><div class="card-head"><h2>Tanjur</h2>${S.tanjur ? chip('good', t('linked')) : chip('warn', t('notLinked'))}</div>
      <p class="muted small">${esc(S.tanjur ? t('tanjurLinkedAbout', { time: S.tanjur.at ? shortDate(dkey(new Date(S.tanjur.at))) + ', ' + clock(new Date(S.tanjur.at)) : '' }) : U.tanjur === false ? t('tanjurMissing') : U.tjState === 'refused' ? t('tanjurRefused') : t('tanjurNotYet'))}</p>
      <div class="row2"><button class="btn" data-act="tanjur" data-path="today">${esc(t('openTanjur'))}</button><button class="btn ghost" data-act="tj-refresh">${icon('sync')}${esc(t('refresh'))}</button></div></section>
    <section class="card"><h2>${esc(t('backup'))}</h2><p class="muted small">${esc(t('backupAbout'))}</p>
      <div class="row2"><button class="btn" data-act="export">${esc(t('exportBtn'))}</button><label class="btn ghost file-btn">${esc(t('importBtn'))}<input type="file" id="importFile" accept="application/json,.json" hidden></label></div></section>
    <section class="card"><h2>${esc(t('aboutTitle'))}</h2><p class="muted small">${esc(t('aboutBody'))}</p><p class="muted small">${esc(t('imgCredit'))}</p></section>
    <p class="about">PoKreni 1.1 · ${esc(t('aboutLine'))}</p>`;
}
function weightField() {
  const w = weightSource();
  if (w && w.src !== 'manual') return `<div class="field"><span>${esc(t('weightKg'))}</span><div class="readonly-val"><b>${n1(w.kg)} kg</b><small>${esc(t(w.src === 'tanjur' ? 'weightFromTanjur' : 'weightFromHcShort', { date: w.date ? shortDate(w.date) : '' }))}</small></div></div>`;
  return `<label class="field"><span>${esc(t('weightKg'))}</span><input id="pf-kg" type="number" inputmode="decimal" step="0.1" value="${esc(S.profile.kg ?? '')}"><small class="muted">${esc(t('weightManual'))}</small></label>`;
}
function hcBody() {
  const hs = S.settings.health || {};
  if (!Native.Bridge) return `<p class="muted small">${esc(t('hcWeb'))}</p>`;
  const when = S.hc.syncedAt ? new Date(S.hc.syncedAt) : null;
  if (!hs.on) return `<p class="muted small">${esc(t('hcAbout'))}</p><button class="btn primary block" data-act="hc-connect">${esc(t('hcConnect'))}</button>`;
  const missing = HC_PERMS.filter(p => !(S.hc.granted || []).includes(p));
  return `<p class="muted small">${esc(t('hcOnAbout'))}${when ? ' ' + esc(t('lastSync', { date: shortDate(dkey(when)), time: clock(when) })) : ''}</p>
    ${missing.length ? `<p class="banner warn">${icon('info')}${esc(t('hcMissing'))}</p>` : ''}
    <div class="row2"><button class="btn" data-act="hc-sync" ${U.hcBusy ? 'disabled' : ''}>${esc(U.hcBusy ? t('syncing') : t('syncNow'))}</button><button class="btn ghost" data-act="hc-manage">${esc(t('manageAccess'))}</button></div>
    ${missing.length ? `<button class="btn ghost block" data-act="hc-connect" style="margin-top:8px">${esc(t('hcAskAgain'))}</button>` : ''}
    <button class="btn ghost block" data-act="hc-off" style="margin-top:8px">${esc(t('hcStop'))}</button>`;
}

/* ---------- sheets ---------- */
/* replace: swap the top sheet for this one (exercise → easier/harder exercise), so Back returns to where you started. */
function openSheet(kind, args, replace) {
  if (replace && U.sheets.length) { U.sheets[U.sheets.length - 1] = { kind, args: args || {} }; renderSheet(); $('#sheetPanel').scrollTop = 0; return; }
  U.sheets.push({ kind, args: args || {} });
  try { history.pushState({ sheet: U.sheets.length }, ''); } catch (e) { /* optional */ }
  const el = $('#sheet');
  renderSheet();
  if (el.hidden) { el.hidden = false; document.body.classList.add('locked'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open'))); }
  $('#sheetPanel').scrollTop = 0;
}
let popClosing = false;
function closeSheet() {
  if (!U.sheets.length) return;
  if (!popClosing) { try { if (history.state && history.state.sheet) { history.back(); return; } } catch (e) { /* fall through */ } }
  U.sheets.pop();
  if (U.sheets.length) { renderSheet(); return; }
  const el = $('#sheet'); el.classList.remove('open');
  setTimeout(() => { if (!U.sheets.length) { el.hidden = true; document.body.classList.remove('locked'); } }, 260);
}
function closeAllSheets() {
  const n = U.sheets.length; if (!n) return;
  U.sheets = [];
  U.ignorePop = true;
  try { history.go(-n); } catch (e) { U.ignorePop = false; }
  const el = $('#sheet'); el.classList.remove('open'); el.hidden = true; document.body.classList.remove('locked');
}
function renderSheet() {
  const top = U.sheets[U.sheets.length - 1]; if (!top) return;
  const r = SHEETS[top.kind](top.args) || {};
  $('#sheetTitle').textContent = r.title || '';
  $('#sheetSub').textContent = r.sub || '';
  $('#sheetSub').hidden = !r.sub;
  $('#sheetBack').hidden = U.sheets.length < 2;
  $('#sheetBody').innerHTML = r.body || '';
}
const SHEETS = {
  ex({ id }) {
    const ex = EX.byId[id]; if (!ex) return {};
    const lift = S.lifts[id];
    const imgs = ex.img ? `<div class="ex-imgs"><img src="img/ex/${id}_0.jpg" alt="${esc(t('startPos'))}"><img src="img/ex/${id}_1.jpg" alt="${esc(t('endPos'))}"></div>` : '';
    const rel = [['easier', ex.easier], ['harder', ex.harder]].filter(x => x[1]).map(([k, v]) => `<button class="chip-btn" data-act="ex" data-id="${v}">${esc(t(k))}: ${esc(exName(v))}</button>`).join('');
    const hist = PK.liftHistory(S, id).slice(-6).reverse();
    return { title: tx(ex.name), sub: tx(ex.muscles), body: `${imgs}
      ${ex.note ? `<p class="banner info">${icon('info')}${esc(tx(ex.note))}</p>` : ''}
      <h3>${esc(t('howTo'))}</h3><ol class="cues">${tx(ex.cues).map(c => `<li>${esc(c)}</li>`).join('')}</ol>
      ${tx(ex.mistakes).length ? `<h3>${esc(t('commonMistakes'))}</h3><ul class="cues warn">${tx(ex.mistakes).map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${rel ? `<div class="chips wrap">${rel}</div>` : ''}
      ${lift && (lift.kg != null || lift.reps || lift.secs) ? `<h3>${esc(t('nextTime'))}</h3><p>${lift.kg != null ? n1(lift.kg) + ' kg' : ''}${lift.reps ? ' × ' + lift.reps : ''}${lift.secs ? ' · ' + lift.secs + ' s' : ''}</p>` : ''}
      ${hist.length ? `<h3>${esc(t('recent'))}</h3><ul class="mini-hist">${hist.map(h => `<li><span>${esc(shortDate(h.date))}</span><span>${h.kg ? n1(h.kg) + ' kg × ' : ''}${h.reps || (h.secs ? h.secs + ' s' : '')}</span></li>`).join('')}</ul>` : ''}` };
  },
  swap({ i }) {
    const it = S.active && S.active.items[i]; if (!it) return {};
    const ex = EX.byId[it.ex];
    const opts = [...new Set([it.orig].concat(EX.byId[it.orig].alts || [], ex.alts || []))].filter(x => x !== it.ex && EX.byId[x]);
    return { title: t('swapTitle'), sub: tx(ex.name), body: `<p class="muted small">${esc(t('swapNote'))}</p><ul class="pick-list">${opts.map(o => `<li><button class="plan-row" data-act="swap-pick" data-i="${i}" data-id="${o}">
      <span class="thumb">${EX.byId[o].img ? `<img src="img/ex/${o}_0.jpg" alt="">` : icon('go')}</span><span class="plan-main"><span class="plan-name">${esc(exName(o))}</span><span class="plan-meta">${esc(tx(EX.byId[o].muscles))}</span></span></button></li>`).join('')}</ul>` };
  },
  checkin() {
    return { title: t('checkinTitle'), sub: tx(nextTemplate().name), body: `
      <div class="field"><span>${esc(t('sleepQ'))}</span><div class="seg" id="ciSleep"><button data-act="ci" data-k="sleep" data-v="ok" aria-pressed="true">${esc(t('sleepOk'))}</button><button data-act="ci" data-k="sleep" data-v="short" aria-pressed="false">${esc(t('sleepShort'))}</button></div></div>
      <div class="field"><span>${esc(t('painQ'))}</span><div class="seg" id="ciPain"><button data-act="ci" data-k="pain" data-v="no" aria-pressed="true">${esc(t('painNo'))}</button><button data-act="ci" data-k="pain" data-v="yes" aria-pressed="false">${esc(t('painYes'))}</button></div></div>
      <p class="muted small" id="ciNote">${esc(t('checkinNote'))}</p>
      <p class="banner crit">${icon('flag')}${esc(t('stopRule'))}</p>
      <button class="btn primary block big" data-act="begin">${icon('go')}${esc(t('letsGo'))}</button>` };
  },
  readiness() {
    const R = U.draftR || (U.draftR = clone(S.readiness) || { answers: {} });
    const q = id => `<li class="rq"><span>${esc(t('rq_' + id))}</span><div class="seg small"><button data-act="rq" data-q="${id}" data-v="0" aria-pressed="${R.answers[id] === false}">${esc(t('no'))}</button><button data-act="rq" data-q="${id}" data-v="1" aria-pressed="${R.answers[id] === true}">${esc(t('yes'))}</button></div></li>`;
    const anyYes = PK.READINESS_QS.some(x => R.answers[x] === true) || PK.bpHigh(R);
    const complete = PK.READINESS_QS.every(x => typeof R.answers[x] === 'boolean');
    return { title: t('readinessTitle'), sub: t('readinessSub'), body: `<p class="small">${esc(t('readinessIntro'))}</p>
      <ol class="rqs">${PK.READINESS_QS.map(q).join('')}</ol>
      <div class="field"><span>${esc(t('bpLabel'))}</span><div class="bp"><input type="number" inputmode="numeric" id="rBpS" placeholder="120" value="${esc(R.bpSys ?? '')}"><b>/</b><input type="number" inputmode="numeric" id="rBpD" placeholder="80" value="${esc(R.bpDia ?? '')}"><em>mmHg</em></div><small class="muted">${esc(t('bpNote'))}</small></div>
      ${anyYes ? `<p class="banner warn">${icon('alert')}${esc(t('readinessYes'))}</p><label class="switch"><input type="checkbox" id="rCleared" ${R.cleared ? 'checked' : ''}><span>${esc(t('clearedLabel'))}</span></label>` : complete ? `<p class="banner good">${icon('check')}${esc(t('readinessAllNo'))}</p>` : ''}
      <p class="muted small">${esc(t('parqLink'))} <a href="https://eparmedx.com" target="_blank" rel="noopener">eparmedx.com</a></p>
      <button class="btn primary block" data-act="readiness-save" ${complete ? '' : 'disabled'}>${esc(t('save'))}</button>` };
  },
  baseline() {
    const prev = S.baselines[S.baselines.length - 1] || {};
    const f = ([key, lab, unit]) => `<label class="field"><span>${esc(t(lab))}${unit ? ` (${unit})` : ''}</span><input type="number" inputmode="decimal" step="0.1" id="b-${key}" placeholder="${esc(prev[key] ?? '')}"><small class="muted">${esc(t(lab + 'How'))}</small></label>`;
    return { title: S.baselines.length ? t('retestBtn') : t('baselineBtn'), sub: t('baselineSub'), body: `${TESTS.map(f).join('')}
      <label class="field"><span>${esc(t('pushLevel'))}</span><select id="b-pushLevel">${['wall', 'bench', 'floor'].map(v => `<option value="${v}" ${prev.pushLevel === v ? 'selected' : ''}>${esc(t('push_' + v))}</option>`).join('')}</select></label>
      <button class="btn primary block" data-act="baseline-save">${esc(t('save'))}</button>` };
  },
  cardio({ id }) {
    const c = id ? S.cardio.find(x => x.id === id) : null;
    const draft = U.draftC || (U.draftC = c ? clone(c) : { type: 'walk_outdoor', minutes: 30, effort: 1, date: today(), time: clock(new Date()) });
    const kcal = cardioKcal(draft);
    return { title: c ? t('editCardio') : t('logCardio'), sub: t('cardioSub'), body: `
      <label class="field"><span>${esc(t('activity'))}</span><select id="c-type">${EX.cardio.map(x => `<option value="${x}" ${draft.type === x ? 'selected' : ''}>${esc(exName(x))}</option>`).join('')}</select></label>
      <label class="field"><span>${esc(t('minutes'))}</span><input type="number" inputmode="numeric" id="c-min" min="1" max="600" value="${esc(draft.minutes)}"></label>
      <div class="field"><span>${esc(t('effort'))}</span><div class="seg">${[0, 1, 2].map(v => `<button data-act="c-effort" data-v="${v}" aria-pressed="${draft.effort === v}">${esc(t('effort' + v))}</button>`).join('')}</div><small class="muted">${esc(t('effortNote'))}</small></div>
      <div class="row2"><label class="field"><span>${esc(t('date'))}</span><input type="date" id="c-date" max="${today()}" value="${esc(draft.date)}"></label><label class="field"><span>${esc(t('time'))}</span><input type="time" id="c-time" value="${esc(draft.time || '18:00')}"></label></div>
      <p class="muted small" id="c-kcal">${esc(t('kcalEst', { kcal: n0(kcal) }))}</p>
      <button class="btn primary block" data-act="cardio-save">${esc(t('save'))}</button>
      ${c ? `<button class="btn ghost block danger" data-act="cardio-del" data-id="${c.id}">${icon('trash')}${esc(t('delete'))}</button>` : ''}` };
  },
  lesson({ id }) {
    const l = LS.byId[id]; if (!l) return {};
    const body = tx(l.body).map(b => typeof b === 'string' ? `<p>${esc(b)}</p>` : b.h ? `<h3>${esc(b.h)}</h3>` : `<ul>${b.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
    const links = (l.links || []).length ? `<div class="chips wrap">${l.links.map(x => `<button class="chip-btn" data-act="ex" data-id="${x}">${esc(exName(x))}</button>`).join('')}</div>` : '';
    return { title: `${t('lessonN', { n: +id.slice(1) })}: ${tx(l.title)}`, sub: tx(LS.PHASES[l.phase].name), body: `<div class="lesson-body">${body}</div>${links}
      <div class="task"><div class="eyebrow">${esc(t('yourTask'))}</div><p>${esc(tx(l.task))}</p>${lessonCheck(l)}</div>
      ${id === 'L13' ? `<p class="small"><button class="link" data-act="redflags">${esc(t('redFlags'))}</button></p>` : ''}` };
  },
  redflags() {
    return { title: t('redFlags'), sub: t('redFlagsSub'), body: `
      <div class="flag-row emergency"><h3>${esc(t('emergency'))}</h3><p>${esc(t('emergencyBody'))}</p><a class="btn danger-solid block" href="tel:112">${esc(t('call112'))}</a></div>
      <div class="flag-row red"><h3>${esc(t('zoneRed'))}</h3><p>${esc(t('zoneRedBody'))}</p></div>
      <div class="flag-row yellow"><h3>${esc(t('zoneYellow'))}</h3><p>${esc(t('zoneYellowBody'))}</p></div>
      <div class="flag-row green"><h3>${esc(t('zoneGreen'))}</h3><p>${esc(t('zoneGreenBody'))}</p></div>
      <p class="muted small">${esc(t('notMedical'))}</p>` };
  },
  summary({ id }) {
    const s = S.sessions.find(x => x.id === id); if (!s) return {};
    const sets = s.items.reduce((a, it) => a + (it.sets || []).filter(x => x.done).length, 0);
    const reds = s.items.filter(it => it.pain >= 6);
    return { title: t('wellDone'), sub: tx(s.name), body: `
      <div class="sum-stats"><div><b>${PK.sessionMinutes(s)}</b><span>min</span></div><div><b>${sets}</b><span>${esc(t('sets'))}</span></div><div><b>${n0(s.kcal)}</b><span>kcal</span></div></div>
      ${reds.length ? `<p class="banner crit">${icon('alert')}${esc(t('summaryRed', { names: reds.map(r => exName(r.ex)).join(', ') }))}</p>` : ''}
      <h3>${esc(t('nextTime'))}</h3><ul class="changes">${(s.changes || []).map(c => `<li><span>${esc(exName(c.ex))}</span><span>${esc(changeText(c))}</span></li>`).join('') || `<li>${esc(t('noChanges'))}</li>`}</ul>
      <p class="muted small">${esc(S.settings.health && S.settings.health.on ? t('summaryHc') : t('summaryNoHc'))}</p>
      <div class="row2"><button class="btn primary" data-act="tanjur" data-path="add">${icon('plate')}${esc(t('logMeal'))}</button><button class="btn ghost" data-act="sheet-close">${esc(t('close'))}</button></div>` };
  },
  hist({ id }) {
    const s = S.sessions.find(x => x.id === id); if (!s) return {};
    return { title: tx(s.name), sub: `${fullDate(s.date)} · ${clock(new Date(s.start))} · ${PK.sessionMinutes(s)} min`, body: `
      ${s.items.map(it => { const done = (it.sets || []).filter(x => x.done); if (!done.length) return ''; return `<div class="hist-ex"><h3>${esc(exName(it.ex))}${it.pain >= 4 ? ' ' + chip(it.pain >= 6 ? 'crit' : 'warn', t('pain') + ' ' + it.pain) : ''}</h3>
        <p class="small">${done.map(x => x.mins ? `${x.mins} min` : `${x.kg ? n1(x.kg) + ' kg × ' : ''}${x.reps ?? ''}${x.secs ? x.secs + ' s' : ''}${x.rir != null ? ` @${x.rir}` : ''}`).join(' · ')}</p></div>`; }).join('')}
      <button class="btn ghost block danger" data-act="hist-del" data-id="${s.id}">${icon('trash')}${esc(t('deleteSession'))}</button>` };
  },
  confirm({ msg, yes, act, id }) { return { title: t('sure'), body: `<p>${esc(msg)}</p><div class="row2"><button class="btn danger-solid" data-act="${act}" data-id="${esc(id || '')}">${esc(yes)}</button><button class="btn ghost" data-act="sheet-close">${esc(t('cancel'))}</button></div>` }; }
};
function lessonCheck(l) {
  const done = lessonDone(l.id), c = l.check.type;
  const ok = `<p>${chip('good', t('lessonDone'))}</p>`;
  if (c === 'readiness') return done ? ok : `<button class="btn primary" data-act="readiness">${esc(t('readinessBtn'))}</button>`;
  if (c === 'baseline') return done ? ok : `<button class="btn primary" data-act="baseline">${esc(t('baselineBtn'))}</button>`;
  if (c === 'plan') return done ? ok : `<button class="btn primary" data-act="goto-plan">${esc(t('planGo'))}</button>`;
  if (c === 'auto') { const r = PK.autoCheck(l.id, S, today(), extMinutes()); return done ? ok : `<div class="meter" role="img" aria-label="${r.have}/${r.need}"><span style="width:${clamp(r.have / r.need * 100, 0, 100)}%"></span></div><p class="muted small">${esc(t('autoProgress', { have: n0(r.have), need: n0(r.need) }))}</p>`; }
  if (c === 'quiz') {
    const st = S.quiz[l.id] || { answers: {} };
    const zones = ['green', 'yellow', 'red', 'emergency'];
    const qs = l.quiz.map((q, i) => { const a = st.answers[i]; const right = a === q.a; return `<li class="quiz-q"><p>${esc(tx(q.q))}</p><div class="seg small quiz">${zones.map(z => `<button data-act="quiz" data-id="${l.id}" data-q="${i}" data-v="${z}" class="z-${z} ${a === z ? (right ? 'right' : 'wrong') : ''}" aria-pressed="${a === z}">${esc(t('z_' + z))}</button>`).join('')}</div></li>`; }).join('');
    return `<ol class="quiz-list">${qs}</ol>${done ? ok : `<p class="muted small">${esc(t('quizNote'))}</p>`}`;
  }
  const label = l.check.label ? tx(l.check.label) : t('markDone');
  return `<label class="switch"><input type="checkbox" data-lesson="${l.id}" ${done ? 'checked' : ''}><span>${esc(label)}</span></label>`;
}
function cardioKcal(c) { const ex = EX.byId[c.type]; return ex && ex.met ? PK.activeKcal(ex.met[clamp(+c.effort || 0, 0, 2)], bodyKg() || 90, +c.minutes || 0) : 0; }
function saveCardio() {
  const d = U.draftC; if (!d) return;
  d.type = $('#c-type').value; d.minutes = Math.round(num($('#c-min').value) || 0); d.date = $('#c-date').value || today(); d.time = $('#c-time').value || '18:00';
  if (d.minutes < 1 || d.minutes > 600) { toast(t('minutesRange')); return; }
  if (d.date > today()) d.date = today();
  const [h, m] = d.time.split(':').map(Number); const st = parseKey(d.date); st.setHours(h || 0, m || 0, 0, 0);
  d.start = st.toISOString(); d.kcal = cardioKcal(d);
  if (!d.id) d.id = uid();
  S.cardio = S.cardio.filter(x => x.id !== d.id).concat([d]);
  const saved = d; U.draftC = null;
  persist(); closeSheet(); scheduleRender(); writeCardioHC(saved);
  toast(t('cardioSaved', { m: saved.minutes }));
}

/* ---------- Health Connect ---------- */
async function connectHealth() {
  const B = Native.Bridge; if (!B) { toast(t('hcWeb')); return; }
  try {
    const st = await B.status();
    if (!st.available) { toast(t('hcUnavailable')); return; }
    const r = await B.requestHealthAccess({ permissions: HC_PERMS });
    S.hc.granted = r.granted || [];
    if (!S.hc.granted.some(p => HC_PERMS.includes(p))) { toast(t('hcDenied')); return; }
    S.settings.health = { on: true };
    persist(); await syncHealth(true);
    S.sessions.forEach(s => { if (!s.hc) writeSessionHC(s); });
    S.cardio.forEach(c => { if (!c.hc) writeCardioHC(c); });
  } catch (e) { toast(t('hcFailed')); }
  scheduleRender();
}
async function syncHealth(manual) {
  const B = Native.Bridge, H = Native.Health;
  if (!B || !S.settings.health || !S.settings.health.on || U.hcBusy) return;
  if (!manual && Date.now() - (S.hc.syncedAt || 0) < 10 * 60000) return;
  U.hcBusy = true; if (U.tab === 'profile') scheduleRender();
  const k = today();
  try { const st = await B.status(); S.hc.granted = st.granted || []; } catch (e) { /* keep last */ }
  const has = p => (S.hc.granted || []).includes('android.permission.health.' + p);
  if (H && has('READ_WEIGHT')) {
    try {
      const r = await H.readSamples({ dataType: 'weight', startDate: new Date(parseKey(addDays(k, -60))).toISOString(), endDate: new Date().toISOString(), limit: 200, ascending: false });
      const s = (r && r.samples || [])[0];
      if (s && +s.value > 25) S.hc.weight = { kg: Math.round(+s.value * 10) / 10, date: dkey(new Date(s.startDate)) };
    } catch (e) { /* skip */ }
  }
  if (H && has('READ_SLEEP')) {
    try {
      const from = parseKey(addDays(k, -1)); from.setHours(18, 0, 0, 0);
      const r = await H.readSamples({ dataType: 'sleep', startDate: from.toISOString(), endDate: new Date().toISOString(), limit: 50 });
      const mins = (r && r.samples || []).reduce((a, s) => a + (+s.value || 0), 0);
      S.hc.sleep = { [k]: mins ? Math.round(mins / 6) / 10 : null };
    } catch (e) { /* skip */ }
  }
  if (has('READ_NUTRITION')) {
    try { const r = await B.readNutritionDays({ from: addDays(k, -7), to: k }); const p = {}; (r.days || []).forEach(d => { p[d.date] = { protein: d.protein, kcal: d.kcal }; }); S.hc.protein = p; } catch (e) { /* skip */ }
  }
  if (has('READ_EXERCISE')) {
    try {
      const r = await B.readSessions({ start: new Date(parseKey(addDays(weekStart(k), -63))).toISOString(), end: new Date().toISOString() });
      const ext = {};
      (r.sessions || []).forEach(s => { if (s.app === PKG_SELF) return; const d = dkey(new Date(s.start)); ext[d] = (ext[d] || 0) + Math.round((Date.parse(s.end) - Date.parse(s.start)) / 60000); });
      S.hc.ext = ext;
    } catch (e) { /* skip */ }
  }
  S.hc.syncedAt = Date.now(); U.hcBusy = false;
  persist(); scheduleRender();
  if (manual) toast(t('synced'));
}
function hcWriteOk() { return Native.Bridge && S.settings.health && S.settings.health.on && (S.hc.granted || []).includes('android.permission.health.WRITE_EXERCISE'); }
async function writeSessionHC(s) {
  if (!hcWriteOk()) return;
  const title = `PoKreni · ${tx(s.name)}`;
  const notes = s.items.filter(it => (it.sets || []).some(x => x.done)).map(it => `${exName(it.ex)}: ${(it.sets || []).filter(x => x.done).map(x => x.mins ? x.mins + ' min' : `${x.kg ? x.kg + 'kg×' : ''}${x.reps || x.secs || ''}`).join(', ')}`).join('\n');
  try { await Native.Bridge.writeExercise({ id: 'pokreni-' + s.id, version: Date.now(), start: s.start, end: s.end, type: 'strength', title, notes, kcal: s.kcal || 0 }); s.hc = true; persist(); } catch (e) { /* retried on next connect */ }
}
async function writeCardioHC(c) {
  if (!hcWriteOk()) return;
  const ex = EX.byId[c.type];
  const end = new Date(Date.parse(c.start) + c.minutes * 60000).toISOString();
  try { await Native.Bridge.writeExercise({ id: 'pokreni-c-' + c.id, version: Date.now(), start: c.start, end, type: ex.hc || 'other', title: `PoKreni · ${exName(c.type)}`, kcal: c.kcal || 0 }); c.hc = true; persist(); } catch (e) { /* retried later */ }
}
async function deleteHC(ids) { if (!hcWriteOk() || !ids.length) return; try { await Native.Bridge.deleteExercise({ ids }); } catch (e) { /* ignore */ } }

/* ---------- Tanjur ---------- */
/* Reads Tanjur's share.json (weight, targets, today's meals, last 14 days) straight from Tanjur through the
   bridge's ShareProvider. No Health Connect needed. Runs on start and whenever PoKreni comes back to the front. */
async function readTanjur(force) {
  if (!Native.Bridge || typeof Native.Bridge.readShared !== 'function') return;
  if (!force && Date.now() - (U.tjAt || 0) < 3000) return;
  U.tjAt = Date.now();
  try {
    const r = await Native.Bridge.readShared({ pkg: PKG_TANJUR });
    if (r && r.found && r.json) {
      const d = JSON.parse(r.json);
      if (d && d.app === 'tanjur') { S.tanjur = d; U.tjState = 'ok'; U.tanjur = true; persist(); scheduleRender(); return; }
    }
    U.tjState = (r && r.reason) || 'missing';
  } catch (e) { U.tjState = 'missing'; }
  scheduleRender();
}
async function openTanjur(path) {
  const url = 'tanjur://' + (path || 'today');
  if (!Native.Bridge) { toast(t('tanjurPhone')); return; }
  try { const r = await Native.Bridge.openUrl({ url }); if (!r.opened) { U.tanjur = false; toast(t('tanjurMissing')); } else U.tanjur = true; } catch (e) { toast(t('tanjurMissing')); }
}
async function checkTanjur() { if (!Native.Bridge) return; try { const r = await Native.Bridge.isInstalled({ pkg: PKG_TANJUR }); U.tanjur = !!r.installed; } catch (e) { /* unknown */ } }

/* ---------- deep links: pokreni://today, pokreni://train, pokreni://cardio, pokreni://learn ---------- */
function route(url) {
  const m = /^pokreni:\/\/([a-z]+)/i.exec(String(url || '')); if (!m) return;
  const where = m[1].toLowerCase();
  const had = U.sheets.length; closeAllSheets();
  const later = fn => setTimeout(fn, had ? 120 : 0);
  if (where === 'train') { if (S.active) setTab('train'); else { setTab('today'); later(startSession); } }
  else if (where === 'cardio') { setTab('today'); U.draftC = null; later(() => openSheet('cardio', {})); }
  else if (['today', 'learn', 'progress', 'profile'].includes(where)) setTab(where);
}

/* ---------- backup ---------- */
async function exportBackup() {
  const json = snapshot(), name = `pokreni-backup-${today()}.json`;
  if (Native.Filesystem && Native.Share) {
    try {
      const w = await Native.Filesystem.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
      await Native.Share.share({ title: name, url: w.uri, dialogTitle: t('exportBtn') });
      return;
    } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function onImport(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!d || d.app !== 'pokreni') throw new Error('x');
      openSheet('confirm', { msg: t('importConfirm', { n: (d.sessions || []).length }), yes: t('importYes'), act: 'import-yes' });
      U.pendingImport = d;
    } catch (e) { toast(t('importBad')); }
    input.value = '';
  };
  rd.readAsText(f);
}

/* ---------- actions ---------- */
function handleAct(act, b) {
  const id = b.dataset.id;
  switch (act) {
    case 'tab': setTab(b.dataset.tab); break;
    case 'reload': location.reload(); break;
    case 'go': if (S.active) setTab('train'); else startSession(); break;
    case 'start': startSession(); break;
    case 'lang': setLang(LANG === 'hr' ? 'en' : 'hr'); break;
    case 'sheet-close': closeSheet(); break;
    case 'sheet-back': closeSheet(); break;
    case 'ex': { const top = U.sheets[U.sheets.length - 1]; openSheet('ex', { id }, top && top.kind === 'ex'); break; }
    case 'lesson': openSheet('lesson', { id }); break;
    case 'redflags': openSheet('redflags'); break;
    case 'readiness': U.draftR = null; openSheet('readiness'); break;
    case 'rq': { U.draftR.answers[b.dataset.q] = b.dataset.v === '1'; U.draftR.bpSys = num($('#rBpS').value); U.draftR.bpDia = num($('#rBpD').value); const cl = $('#rCleared'); if (cl) U.draftR.cleared = cl.checked; renderSheet(); break; }
    case 'readiness-save': saveReadiness(); break;
    case 'baseline': openSheet('baseline'); break;
    case 'baseline-save': saveBaseline(); break;
    case 'cardio': U.draftC = null; openSheet('cardio', { id }); break;
    case 'c-effort': readCardioDraft(); U.draftC.effort = +b.dataset.v; renderSheet(); break;
    case 'cardio-save': saveCardio(); break;
    case 'cardio-del': { const c = S.cardio.find(x => x.id === id); S.cardio = S.cardio.filter(x => x.id !== id); if (c) deleteHC(['pokreni-c-' + c.id]); persist(); closeSheet(); scheduleRender(); toast(t('deleted')); break; }
    case 'checkin': break;
    case 'ci': { const g = b.parentElement; $$('button', g).forEach(x => x.setAttribute('aria-pressed', String(x === b))); const light = $('#ciSleep [data-v="short"]').getAttribute('aria-pressed') === 'true' || $('#ciPain [data-v="yes"]').getAttribute('aria-pressed') === 'true'; $('#ciNote').textContent = light ? t('checkinLighter') : t('checkinNote'); break; }
    case 'begin': { const short = $('#ciSleep [data-v="short"]').getAttribute('aria-pressed') === 'true', pain = $('#ciPain [data-v="yes"]').getAttribute('aria-pressed') === 'true'; beginSession(short || pain, pain); break; }
    case 'warm-toggle': S.active.warmOpen = !S.active.warmOpen; persist(); renderTrain(); break;
    case 'ti-toggle': { const it = S.active.items[+b.dataset.i]; it.open = !it.open; persist(); renderTrain(); break; }
    case 'set-done': toggleSet(+b.dataset.i, +b.dataset.j); break;
    case 'del-set': {
      const it = S.active.items[+b.dataset.i];
      let j = -1; for (let x = it.sets.length - 1; x >= 0; x--) if (!it.sets[x].done) { j = x; break; }
      if (it.sets.length <= 1) break;
      if (j < 0) { toast(t('untickFirst')); break; }
      it.sets.splice(j, 1); persist(); renderTrain(); break;
    }
    case 'add-set': { const it = S.active.items[+b.dataset.i], last = it.sets[it.sets.length - 1] || {}; it.sets.push({ kg: last.kg ?? '', reps: last.reps ?? '', secs: last.secs ?? '', rir: '', done: false }); persist(); renderTrain(); break; }
    case 'swap': openSheet('swap', { i: +b.dataset.i }); break;
    case 'swap-pick': swapExercise(+b.dataset.i, id); break;
    case 'pain': { const it = S.active.items[+b.dataset.i], v = +b.dataset.v; it.pain = it.pain === v ? null : v; persist(); renderTrain(); break; }
    case 'rest-add': if (U.rest) { U.rest.end = Math.max(U.rest.end, Date.now()) + 30000; U.rest.total += 30; U.rest.alerted = false; scheduleRestNotif(U.rest.end, U.rest.label); renderRestBar(); } break;
    case 'rest-skip': U.rest = null; cancelRestNotif(); renderRestBar(); break;
    case 'finish': finishSession(); break;
    case 'discard': openSheet('confirm', { msg: t('discardConfirm'), yes: t('discardSession'), act: 'discard-yes' }); break;
    case 'discard-yes': discardSession(); break;
    case 'graduate': S.program = { id: program().next, next: 0 }; persist(); scheduleRender(); toast(t('switched', { name: tx(program().name) })); break;
    case 'grad-later': U.gradDismissed = true; scheduleRender(); break;
    case 'program': S.program = { id, next: 0 }; persist(); scheduleRender(); break;
    case 'hist': openSheet('hist', { id }); break;
    case 'hist-del': openSheet('confirm', { msg: t('deleteSessionConfirm'), yes: t('delete'), act: 'hist-del-yes', id }); break;
    case 'hist-del-yes': { S.sessions = S.sessions.filter(s => s.id !== id); deleteHC(['pokreni-' + id]); persist(); closeAllSheets(); scheduleRender(); toast(t('deleted')); break; }
    case 'quiz': { const st = S.quiz[id] || (S.quiz[id] = { answers: {} }); st.answers[b.dataset.q] = b.dataset.v; const l = LS.byId[id]; st.passed = l.quiz.every((q, i) => st.answers[i] === q.a); persist(); renderSheet(); if (st.passed) toast(t('quizPassed')); break; }
    case 'goto-plan': closeAllSheets(); setTab('profile'); break;
    case 'day': { const key = b.dataset.k, d = +b.dataset.d, arr = new Set(S.profile[key] || []); if (arr.has(d)) arr.delete(d); else arr.add(d); S.profile[key] = [...arr].sort(); const other = key === 'gymDays' ? 'homeDays' : 'gymDays'; if (arr.has(d)) S.profile[other] = (S.profile[other] || []).filter(x => x !== d); persist(); scheduleRender(); scheduleReminders(); break; }
    case 'plan-save': if (!(S.profile.gymDays || []).length) { toast(t('pickGymDay')); break; } S.profile.planSet = true; persist(); scheduleRender(); toast(t('planSaved')); break;
    case 'hc-connect': connectHealth(); break;
    case 'tj-refresh': readTanjur(true).then(() => toast(S.tanjur ? t('synced') : t('tanjurNotYet'))); break;
    case 'hc-sync': syncHealth(true); break;
    case 'hc-manage': if (Native.Health) Native.Health.openHealthConnectSettings().catch(() => toast(t('hcFailed'))); break;
    case 'hc-off': S.settings.health = { on: false }; persist(); scheduleRender(); toast(t('hcStopped')); break;
    case 'tanjur': openTanjur(b.dataset.path); break;
    case 'export': exportBackup(); break;
    case 'import-yes': if (U.pendingImport) { applyData(U.pendingImport); U.pendingImport = null; LANG = S.profile.lang; persist(); closeAllSheets(); scheduleRender(); toast(t('imported')); } break;
  }
}
function readCardioDraft() { const d = U.draftC; if (!d) return; const ty = $('#c-type'); if (!ty) return; d.type = ty.value; d.minutes = Math.round(num($('#c-min').value) || 0); d.date = $('#c-date').value; d.time = $('#c-time').value; }
function saveReadiness() {
  const R = U.draftR; if (!R) return;
  R.bpSys = num($('#rBpS').value); R.bpDia = num($('#rBpD').value);
  const cl = $('#rCleared'); R.cleared = !!(cl && cl.checked);
  if (R.cleared && !R.clearedAt) R.clearedAt = today();
  R.answeredAt = today();
  S.readiness = R; U.draftR = null;
  persist(); closeSheet(); scheduleRender();
  const r = readiness();
  toast(r === 'doctor' ? t('savedDoctor') : t('savedClear'));
}
function saveBaseline() {
  const b = { date: today() }; let any = false;
  TESTS.forEach(([key]) => { const v = num($('#b-' + key).value); if (v != null && v >= 0) { b[key] = v; any = true; } });
  b.pushLevel = $('#b-pushLevel').value;
  if (!any) { toast(t('baselineNeedOne')); return; }
  S.baselines = S.baselines.filter(x => x.date !== b.date).concat([b]).sort((a, z) => (a.date < z.date ? -1 : 1));
  persist(); closeSheet(); scheduleRender(); toast(t('baselineSaved'));
}
function setLang(l) { LANG = l === 'hr' ? 'hr' : 'en'; S.profile.lang = LANG; persist(); scheduleRender(); scheduleReminders(); }

/* ---------- events ---------- */
function bindEvents() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    if (b.tagName === 'BUTTON' || b.classList.contains('scrim')) e.preventDefault();
    handleAct(b.dataset.act, b);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && U.sheets.length) closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); handleAct(e.target.dataset.act, e.target); }
  });
  $('#view-train').addEventListener('input', onTrainInput);
  $('#view-train').addEventListener('change', onTrainInput);
  document.addEventListener('change', e => {
    const el = e.target; if (!el) return;
    if (el.dataset.lesson) { S.lessons[el.dataset.lesson] = { done: el.checked, at: today() }; persist(); renderSheet(); scheduleRender(); return; }
    switch (el.id) {
      case 'pf-name': S.profile.name = el.value.trim().slice(0, 40); persist(); break;
      case 'pf-lang': setLang(el.value); break;
      case 'pf-kg': { const v = num(el.value); S.profile.kg = v && v > 30 && v < 350 ? v : null; persist(); break; }
      case 'pf-rest': S.profile.restSec = +el.value; persist(); break;
      case 'pf-sound': S.profile.sound = el.checked; persist(); break;
      case 'pf-remind': S.settings.remind = Object.assign({}, S.settings.remind, { on: el.checked }); persist(); if (el.checked) askNotifPermission(); scheduleReminders(); scheduleRender(); break;
      case 'pf-remind-time': S.settings.remind = Object.assign({}, S.settings.remind, { time: el.value || '16:30' }); persist(); scheduleReminders(); break;
      case 'importFile': onImport(el); break;
      case 'rCleared': if (U.draftR) { U.draftR.cleared = el.checked; } break;
      case 'c-type': case 'c-min': readCardioDraft(); { const k = $('#c-kcal'); if (k) k.textContent = t('kcalEst', { kcal: n0(cardioKcal(U.draftC)) }); } break;
    }
  });
  document.addEventListener('input', e => {
    const el = e.target; if (!el) return;
    if (el.id === 'c-min') { readCardioDraft(); const k = $('#c-kcal'); if (k) k.textContent = t('kcalEst', { kcal: n0(cardioKcal(U.draftC)) }); }
    if (el.id === 'rBpS' || el.id === 'rBpD') { if (U.draftR) { U.draftR.bpSys = num($('#rBpS').value); U.draftR.bpDia = num($('#rBpD').value); } }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flushSave(); return; }
    readTanjur(); syncHealth(false); checkTanjur();
    if (U.rest && Date.now() >= U.rest.end) U.rest.alerted = true;
    scheduleRender();
  });
  window.addEventListener('pagehide', () => flushSave());
  window.addEventListener('popstate', () => { if (U.ignorePop) { U.ignorePop = false; return; } if (U.sheets.length) { popClosing = true; closeSheet(); popClosing = false; } });
  listen(Native.App, 'appUrlOpen', ev => route(ev && ev.url));
  listen(Native.App, 'backButton', onBack);
  listen(Native.Notif, 'localNotificationActionPerformed', ev => { const u = ev && ev.notification && ev.notification.extra && ev.notification.extra.url; if (u) route(u); else if (S.active) setTab('train'); });
}
/* Android Back: close the open sheet, then go back to Today, then leave the app. A running session is kept. */
function onBack() {
  if (U.sheets.length) { closeSheet(); return; }
  if (U.tab !== 'today') { setTab('today'); return; }
  flushSave();
  call(Native.App, 'exitApp').catch(() => {});
}

/* ---------- boot ---------- */
async function boot() {
  applyData(loadLocal() || {});
  LANG = S.profile.lang || 'en';
  if (S.active) U.tab = 'train';
  bindEvents();
  renderAll();
  if (S.active) { ensureTick(); keepAwake(true); }
  const fromFile = await loadFile();
  if (fromFile && (fromFile.savedAt || 0) > (S.savedAt || 0)) { applyData(fromFile); LANG = S.profile.lang || 'en'; if (S.active) { U.tab = 'train'; ensureTick(); } renderAll(); }
  try { const l = await call(Native.App, 'getLaunchUrl'); if (l && l.url) route(l.url); } catch (e) { /* opened normally */ }
  readTanjur(true); checkTanjur(); syncHealth(false); scheduleReminders(); writeShare();
}
function start() {
  boot().catch(e => { console.error(e); safely(() => { throw e; }, '#view-today'); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
