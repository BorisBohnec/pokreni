/* PoKreni exercise drawings: a simple figure posed by joint angles and animated between key poses.
   Angles are in degrees with 0 = straight down, 90 = forward (to the right), 180 = up, -90 = back.
   Side view faces right. Front view faces you: side 1 is on your left and its angles are mirrored,
   so the same number means "outward" on both sides. Works offline; nothing is downloaded. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib; else root.PK_ANIM = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const LEN = { torso: 50, neck: 7, head: 10, ua: 29, fa: 27, th: 41, sh: 39, ft: 13 };
  const W = 260, H = 200, GY = 186;
  const rad = d => d * Math.PI / 180;
  const dir = a => [Math.sin(rad(a)), Math.cos(rad(a))];
  const add = (p, a, l) => { const d = dir(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; };
  const angTo = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI;
  const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const KEYS = ['t', 'hd', 'a1', 'f1', 'a2', 'f2', 'l1', 's1', 'p1', 'l2', 's2', 'p2', 'ak1', 'fk1', 'ak2', 'fk2', 'lk1', 'sk1', 'pk1', 'lk2', 'sk2', 'pk2'];

  /* Two-bone reach from root to target. bend +1 turns the middle joint towards larger angles. */
  function ik(root, target, l1, l2, bend) {
    let d = dist(root, target);
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
    const base = angTo(root, target);
    const c = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const a1 = base + (bend || 1) * Math.acos(c) * 180 / Math.PI;
    const mid = add(root, a1, l1);
    return [a1, angTo(mid, target)];
  }

  function fill(p) {
    const q = Object.assign({ t: 180, a1: 0, f1: 0, l1: 0, s1: 0, p1: 90 }, p);
    ['a', 'f', 'l', 's', 'p', 'ak', 'fk', 'lk', 'sk', 'pk'].forEach(k => { if (q[k + '2'] == null && q[k + '1'] != null) q[k + '2'] = q[k + '1']; });
    ['ak', 'fk', 'lk', 'sk', 'pk'].forEach(k => { if (q[k + '1'] == null) { q[k + '1'] = 1; q[k + '2'] = q[k + '2'] == null ? 1 : q[k + '2']; } });
    if (q.hd == null) q.hd = q.t;
    return q;
  }

  /* Joint positions for a filled pose with the hip at 0,0. */
  function rawJoints(q, view) {
    const J = { hip: [0, 0] };
    J.neck = add(J.hip, q.t, LEN.torso);
    J.sh = add(J.hip, q.t, LEN.torso - 5);
    J.head = add(J.neck, q.hd, LEN.neck + LEN.head);
    const front = view === 'front', perp = dir(q.t - 90);
    const rel = q.rel ? q.t - 180 : 0;
    for (const i of [1, 2]) {
      const m = front ? (i === 1 ? -1 : 1) : 1;
      const ang = a => (front ? m * a : a);
      const S = front ? [J.sh[0] + perp[0] * 14 * m, J.sh[1] + perp[1] * 14 * m] : J.sh;
      const Hp = front ? [perp[0] * 8 * m, perp[1] * 8 * m] : J.hip;
      J['s' + i] = S; J['h' + i] = Hp;
      J['e' + i] = add(S, ang(q['a' + i] + rel), LEN.ua * q['ak' + i]);
      J['w' + i] = add(J['e' + i], ang(q['f' + i] + rel), LEN.fa * q['fk' + i]);
      J['k' + i] = add(Hp, ang(q['l' + i]), LEN.th * q['lk' + i]);
      J['a' + i] = add(J['k' + i], ang(q['s' + i]), LEN.sh * q['sk' + i]);
      J['t' + i] = add(J['a' + i], ang(q['p' + i]), LEN.ft * q['pk' + i]);
    }
    return J;
  }
  const shift = (J, dx, dy) => { const o = {}; for (const k in J) o[k] = [J[k][0] + dx, J[k][1] + dy]; return o; };
  /* Places a pose: anchor joint at `at`, then reaches any ik targets (legs: ik1/ik2 for ankles, arms: iw1/iw2 for wrists). */
  function place(p, view) {
    /* A reach given for one side only applies to both, unless the other side has its own angles. */
    p = Object.assign({}, p);
    if (p.ik1 && p.ik2 == null && p.l2 == null) p.ik2 = p.ik1;
    if (p.iw1 && p.iw2 == null && p.a2 == null) p.iw2 = p.iw1;
    if (p.iw2 && p.iw1 == null && p.a1 == null) p.iw1 = p.iw2;
    const q = fill(p);
    const anchorPos = J => J[q.anchor || 'hip'];
    let J = rawJoints(q, view);
    const at = q.at || [W / 2, 100];
    let a = anchorPos(J); J = shift(J, at[0] - a[0], at[1] - a[1]);
    let changed = false;
    for (const i of [1, 2]) {
      const m = view === 'front' ? (i === 1 ? -1 : 1) : 1;
      if (q['ik' + i]) { const r = ik(J['h' + i], q['ik' + i], LEN.th * q['lk' + i], LEN.sh * q['sk' + i], q['bend' + i] || 1); q['l' + i] = m * r[0]; q['s' + i] = m * r[1]; changed = true; }
      if (q['iw' + i]) { const rr = q.rel ? q.t - 180 : 0; const r = ik(J['s' + i], q['iw' + i], LEN.ua * q['ak' + i], LEN.fa * q['fk' + i], q['wbend' + i] || -1); q['a' + i] = m * r[0] - rr; q['f' + i] = m * r[1] - rr; changed = true; }
    }
    if (changed) { J = rawJoints(q, view); a = anchorPos(J); J = shift(J, at[0] - a[0], at[1] - a[1]); }
    return { q, J };
  }
  /* Key poses are resolved once (ik and all), then animated by blending their angles and anchor points. */
  function resolve(spec) {
    if (spec._res) return spec._res;
    spec._res = (spec.frames || []).map(f => place(f, spec.view).q);
    return spec._res;
  }
  const ease = u => 0.5 - 0.5 * Math.cos(Math.PI * u);
  function poseAt(spec, phase) {
    if (spec.fn) return fill(spec.fn(phase));
    const R = resolve(spec), n = R.length;
    if (n === 1) return R[0];
    const segs = n === 2 ? 2 : n, x = (phase % 1) * segs, i = Math.floor(x), local = x - i;
    const A = R[i % n], B = R[(i + 1) % n];
    const hold = spec.hold == null ? 0.18 : spec.hold;
    const u = ease(Math.min(1, Math.max(0, (local - hold / 2) / (1 - hold))));
    const o = Object.assign({}, A);
    KEYS.forEach(k => { if (typeof A[k] === 'number' && typeof B[k] === 'number') o[k] = A[k] + (B[k] - A[k]) * u; });
    const aa = A.at || [W / 2, 100], bb = B.at || aa;
    o.at = [aa[0] + (bb[0] - aa[0]) * u, aa[1] + (bb[1] - aa[1]) * u];
    ['ik1', 'ik2', 'iw1', 'iw2'].forEach(k => { delete o[k]; });
    return o;
  }

  const f1 = n => Math.round(n * 10) / 10;
  const ln = (p, q, cls, w) => `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" class="${cls}"${w ? ` stroke-width="${w}"` : ''}/>`;
  const circ = (p, r, cls) => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" class="${cls}"/>`;
  function prop(pr, J) {
    const j = pr.j ? J[pr.j] : null;
    switch (pr.k) {
      case 'floor': return ln([8, GY], [W - 8, GY], 'fg-floor');
      case 'rect': { const c = [pr.x + pr.w / 2, pr.y + pr.h / 2]; return `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="${pr.r == null ? 3 : pr.r}" class="fg-prop"${pr.ang ? ` transform="rotate(${pr.ang} ${c[0]} ${c[1]})"` : ''}/>`; }
      case 'line': return ln([pr.p[0], pr.p[1]], [pr.p[2], pr.p[3]], 'fg-frame', pr.w);
      case 'db': return j ? `${circ(j, 7.5, 'fg-weight')}${circ(j, 2.6, 'fg-hole')}` : '';
      case 'dbv': return j ? `${ln([j[0], j[1] - 9], [j[0], j[1] + 9], 'fg-handle')}<rect x="${f1(j[0] - 8)}" y="${f1(j[1] - 14)}" width="16" height="7" rx="2" class="fg-weight"/><rect x="${f1(j[0] - 8)}" y="${f1(j[1] + 7)}" width="16" height="7" rx="2" class="fg-weight"/>` : '';
      case 'cable': return j ? `${ln(pr.from, j, 'fg-cable')}${circ(pr.from, 5, 'fg-pulley')}` : '';
      case 'grip': return j ? circ(j, 4, 'fg-grip') : '';
      case 'plate': return j ? ln(add(j, pr.ang, pr.a), add(j, pr.ang + 180, pr.b), 'fg-frame', 6) : '';
      case 'roller': { if (!j) return ''; const q = pr.q; const c = add(j, q[pr.seg] + pr.rel, pr.d); return circ(c, pr.r || 7, 'fg-pad'); }
      case 'disc': return j ? circ([j[0] + (pr.off ? pr.off[0] : 0), j[1] + (pr.off ? pr.off[1] : 0)], pr.r || 9, 'fg-weight') : '';
      case 'pad': return j ? `<rect x="${f1(j[0] + pr.off[0] - pr.w / 2)}" y="${f1(j[1] + pr.off[1] - pr.h / 2)}" width="${pr.w}" height="${pr.h}" rx="3" class="fg-pad"/>` : '';
      case 'crank': return pr.c ? `${ln(pr.c, J.a1, 'fg-frame', 3)}${ln(pr.c, J.a2, 'fg-frame', 3)}${circ(pr.c, 5, 'fg-pulley')}` : '';
      default: return '';
    }
  }
  /* SVG markup for one moment of an exercise. */
  function frameSVG(spec, phase) {
    const q = poseAt(spec, phase || 0);
    const { J } = place(q, spec.view);
    const props = spec.props || [];
    const pass = layer => props.filter(p => (p.layer || (p.j ? 'front' : 'back')) === layer).map(p => prop(Object.assign({}, p, { q }), J)).join('');
    const limb = (i, cls) => {
      const leg = ln(J['h' + i], J['k' + i], cls, 9) + ln(J['k' + i], J['a' + i], cls, 8) + ln(J['a' + i], J['t' + i], cls, 6);
      const arm = ln(J['s' + i], J['e' + i], cls, 8) + ln(J['e' + i], J['w' + i], cls, 7) + circ(J['w' + i], 3.6, cls === 'fg-near' ? 'fg-hand' : 'fg-hand-far');
      return { leg, arm };
    };
    const front = spec.view === 'front';
    const far = limb(2, front ? 'fg-near' : 'fg-far'), near = limb(1, 'fg-near');
    const farProps = props.filter(p => p.j && /2$/.test(p.j)).map(p => prop(Object.assign({}, p, { q }), J)).join('');
    const nearProps = props.filter(p => p.j && !/2$/.test(p.j)).map(p => prop(Object.assign({}, p, { q }), J)).join('');
    const torso = ln(J.hip, J.neck, 'fg-near', 15) + ln(J.neck, add(J.neck, q.hd, LEN.neck), 'fg-near', 7) + circ(J.head, LEN.head, 'fg-head');
    /* Front view: both sides are equally near; draw legs, then torso, then arms. */
    if (front) return `${pass('back')}${far.leg}${near.leg}${torso}${farProps}${far.arm}${near.arm}${nearProps}`;
    return `${pass('back')}${farProps}${far.leg}${far.arm}${torso}${near.leg}${near.arm}${nearProps}`;
  }
  function svg(spec, phase, cls) {
    return `<svg class="${cls || 'move'}" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${frameSVG(spec, phase)}</svg>`;
  }
  /* Plays an exercise in an <svg> element. Returns a stop function. */
  function play(el, spec) {
    let raf = 0, t0 = 0;
    const dur = (spec.dur || 2.8) * 1000;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = ts => {
      if (!el.isConnected) return;
      if (!t0) t0 = ts;
      el.innerHTML = frameSVG(spec, ((ts - t0) % dur) / dur);
      raf = requestAnimationFrame(tick);
    };
    if (reduce) el.innerHTML = frameSVG(spec, 0.25); else raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }
  return { LEN, W, H, GY, ik, place, poseAt, frameSVG, svg, play, dir, add };
});
