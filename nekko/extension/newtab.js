(() => {
'use strict';

/* Nekko (ねっこ): the time, written by roots in the dark soil under a small sprout. The ground is cut away like a
   page in a picture book: above, a strip of sky and grass in the light of the hour, and a seedling with two leaves;
   below, the soil, its grains and stones. From the seedling one taproot goes down and four roots run off it, and each
   one grows into the figure of a digit, a bundle of a few twisted strands with fine rootlets that reach downward. When
   a figure changes, its old roots darken and go back into the soil while new ones grow out along the new figure.
   The colon is two stones that the roots grow around. The seconds are a drop of rain: it leaves the surface at the
   top of the minute and seeps down between the grains, and reaches the stone as the minute turns. */

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const pad = n => (n < 10 ? '0' : '') + n;

/* ------------------------------------------------------------------ */
/*  Hash hooks: #t=HH:MM or #t=HH:MM:SS fixes the time, #seed=N the     */
/*  soil and the roots                                                  */
/* ------------------------------------------------------------------ */
let frozen = null;
var reseed = false;                           /* a new seed from the hash: the ground is laid again */
function hashSeed() { const m = /seed=(\d+)/.exec(location.hash || ''); return m ? +m[1] % 1000000 : null; }
let seed = hashSeed() ?? 1 + Math.floor(Math.random() * 999999);
function readHash() {
  const m = /t=(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/.exec(location.hash || '');
  frozen = m ? Math.min(23, +m[1]) * 3600 + Math.min(59, +m[2]) * 60 + Math.min(59.999, +(m[3] || 0)) : null;
  const n = hashSeed();
  if (n !== null && n !== seed) { seed = n; reseed = true; }
}
readHash();
window.addEventListener('hashchange', readHash);

let still = false;
if (window.matchMedia) {
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => { still = rm.matches; };
  apply();
  if (rm.addEventListener) rm.addEventListener('change', apply);
}

/* seconds of the day, with the fraction */
function clock() {
  if (frozen !== null) return frozen;
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
}
const anim = () => performance.now() / 1000;

/* ------------------------------------------------------------------ */
/*  Randomness                                                          */
/* ------------------------------------------------------------------ */
function rng(a) {
  a = a >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (...n) => n.reduce((h, x) => Math.imul(h ^ (x | 0), 0x9E3779B1) ^ (h >>> 13), 0x811C9DC5) >>> 0;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/* ------------------------------------------------------------------ */
/*  The figures: single lines in a unit box (x right, y down), drawn    */
/*  as a root would draw them. A stroke is a list of points through     */
/*  which a smooth curve passes; a sharp corner is where two strokes    */
/*  meet.                                                               */
/* ------------------------------------------------------------------ */
const ring = (cx, cy, rx, ry, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const a = -Math.PI / 2 + i / n * Math.PI * 2;
  return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
});
const GLYPHS = {
  0: [ring(0.5, 0.5, 0.40, 0.5)],
  1: [[[0.28, 0.2], [0.45, 0.1], [0.58, 0]], [[0.58, 0], [0.57, 0.5], [0.58, 1]]],
  2: [[[0.1, 0.24], [0.28, 0.04], [0.55, 0], [0.84, 0.13], [0.86, 0.38], [0.6, 0.62], [0.1, 1]], [[0.1, 1], [0.5, 0.99], [0.92, 1]]],
  3: [[[0.1, 0.13], [0.42, 0], [0.78, 0.08], [0.82, 0.32], [0.42, 0.47]],
      [[0.42, 0.47], [0.84, 0.6], [0.88, 0.84], [0.55, 1], [0.08, 0.88]]],
  4: [[[0.72, 0], [0.72, 0.5], [0.72, 1]], [[0.72, 0], [0.4, 0.34], [0.06, 0.7]], [[0.06, 0.7], [0.5, 0.7], [0.96, 0.7]]],
  5: [[[0.86, 0], [0.5, 0], [0.2, 0]], [[0.2, 0], [0.16, 0.44]],
      [[0.16, 0.44], [0.5, 0.36], [0.84, 0.5], [0.9, 0.78], [0.6, 1], [0.1, 0.9]]],
  6: [[[0.8, 0.04], [0.48, 0], [0.18, 0.24], [0.1, 0.62], [0.24, 0.94], [0.55, 1], [0.84, 0.88], [0.88, 0.62],
       [0.62, 0.44], [0.32, 0.46], [0.12, 0.64]]],
  7: [[[0.06, 0], [0.5, 0], [0.94, 0]], [[0.94, 0], [0.66, 0.4], [0.42, 1]]],
  8: [[[0.5, 0.46], [0.18, 0.3], [0.24, 0.05], [0.5, 0], [0.76, 0.05], [0.82, 0.3], [0.5, 0.46],
       [0.13, 0.66], [0.2, 0.94], [0.5, 1], [0.8, 0.94], [0.87, 0.66], [0.5, 0.46]]],
  9: [[[0.88, 0.36], [0.68, 0.53], [0.38, 0.54], [0.12, 0.38], [0.16, 0.08], [0.5, 0], [0.82, 0.1], [0.9, 0.38],
       [0.84, 0.72], [0.56, 1], [0.16, 0.94]]]
};

/* a Catmull-Rom curve through the points, as a dense polyline with a step of about `step` */
function spline(P, step) {
  const out = [];
  const n = P.length;
  if (n === 2) {
    const d = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), m = Math.max(2, Math.ceil(d / step));
    for (let i = 0; i <= m; i++) out.push([lerp(P[0][0], P[1][0], i / m), lerp(P[0][1], P[1][1], i / m)]);
    return out;
  }
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(2, Math.ceil(d / step));
    for (let j = i ? 1 : 0; j <= m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, e) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
/* a polyline with its running length */
function withLength(pts) {
  const cum = new Float32Array(pts.length);
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return cum;
}
function normals(pts) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
}

/* ------------------------------------------------------------------ */
/*  Layout                                                              */
/* ------------------------------------------------------------------ */
let W = 0, H = 0, DPR = 1;
let ySurf, DH, DW, yTop, digitX = [], colonX, sx, joint, SPEED;
const under = document.createElement('canvas'), uctx = under.getContext('2d');
const soil = document.createElement('canvas'), sctx = soil.getContext('2d');
const surfaceY = x => ySurf + H * (0.004 * Math.sin(x / W * 5.1 + seed) + 0.003 * Math.sin(x / W * 13.7 + seed * 0.3));

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  for (const c of [canvas, under, soil]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  ySurf = H * 0.25;
  DH = Math.min((H - ySurf) * 0.5, W * 0.19);
  DW = DH * 0.56;
  const gap = DH * 0.2, colW = DH * 0.42;
  const total = 4 * DW + 2 * gap + colW;
  const x0 = (W - total) / 2;
  digitX = [x0, x0 + DW + gap, x0 + 2 * DW + gap + colW, x0 + 3 * DW + 2 * gap + colW];
  colonX = x0 + 2 * DW + gap + colW / 2;
  yTop = ySurf + (H - ySurf - DH) * 0.56;
  sx = colonX;
  joint = [sx, ySurf + (yTop - ySurf) * 0.5];
  SPEED = DH * 0.42;                          /* how fast a root grows, in px a second */
  buildSoil();
  taproot = buildTaproot();
  /* the figures already there stand as they are; nothing grows again on a resize */
  const keep = sets.filter(s => !s.dying).map(s => s.digit);
  sets = [];
  if (keep.length === 4) keep.forEach((d, i) => sets.push(buildSet(i, d, -1e9, minuteKey)));
  dirty = true;
}

/* ------------------------------------------------------------------ */
/*  The soil: drawn once for each size and seed                         */
/* ------------------------------------------------------------------ */
const stones = [];
function buildSoil() {
  const c = sctx, r = rng(hash(seed, 7));
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.clearRect(0, 0, W, H);
  c.save();
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, surfaceY(x));
  c.lineTo(W, H);
  c.closePath();
  c.clip();
  /* topsoil warm and crumbly, the deeper earth darker and cooler */
  const g = c.createLinearGradient(0, ySurf, 0, H);
  g.addColorStop(0, '#4b3424');
  g.addColorStop(0.08, '#3a281b');
  g.addColorStop(0.45, '#2a1d14');
  g.addColorStop(1, '#17100b');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  /* soft strata, each a wavy band a shade apart */
  for (let i = 0; i < 6; i++) {
    const y = lerp(ySurf + 30, H, (i + r()) / 6), th = 10 + r() * 40, ph = r() * 9, fr = 2 + r() * 4;
    c.beginPath();
    for (let x = -10; x <= W + 10; x += 12) c.lineTo(x, y + Math.sin(x / W * fr + ph) * 10);
    for (let x = W + 10; x >= -10; x -= 12) c.lineTo(x, y + th + Math.sin(x / W * fr * 1.3 + ph) * 8);
    c.closePath();
    c.fillStyle = r() < 0.5 ? 'rgba(120,88,60,0.07)' : 'rgba(0,0,0,0.10)';
    c.fill();
  }
  /* grains */
  const n = Math.round(W * (H - ySurf) / 14);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = ySurf + Math.pow(r(), 0.9) * (H - ySurf), s = 0.5 + r() * r() * 2.2;
    const depth = (y - ySurf) / (H - ySurf);
    c.fillStyle = r() < 0.55
      ? `rgba(${150 - depth * 50 | 0},${112 - depth * 40 | 0},${80 - depth * 30 | 0},${0.10 + r() * 0.18})`
      : `rgba(8,5,3,${0.15 + r() * 0.25})`;
    c.fillRect(x, y, s, s * (0.6 + r() * 0.6));
  }
  /* fine grass roots in the top of the soil, a mat of hairs */
  c.lineCap = 'round';
  for (let i = 0; i < W / 2.2; i++) {
    let x = r() * W, y = surfaceY(x) - 1, a = Math.PI / 2 + (r() - 0.5) * 0.9;
    const len = 6 + r() * r() * 46;
    c.beginPath();
    c.moveTo(x, y);
    for (let s = 0; s < len; s += 3) { a += (r() - 0.5) * 0.5; a += (Math.PI / 2 - a) * 0.1; x += Math.cos(a) * 3; y += Math.sin(a) * 3; c.lineTo(x, y); }
    c.strokeStyle = `rgba(${190 + r() * 30 | 0},${165 + r() * 20 | 0},${120 + r() * 20 | 0},${0.10 + r() * 0.16})`;
    c.lineWidth = 0.4 + r() * 0.7;
    c.stroke();
  }
  /* stones, kept clear of the figures */
  stones.length = 0;
  const box = [digitX[0] - DH * 0.25, yTop - DH * 0.25, digitX[3] + DW + DH * 0.25, yTop + DH * 1.2];
  for (let i = 0; i < 70; i++) {
    const rad = 2 + Math.pow(r(), 3) * (DH * 0.12);
    const x = r() * W, y = ySurf + 14 + r() * (H - ySurf - 10);
    const near = x > box[0] - rad && x < box[2] + rad && y > box[1] - rad && y < box[3] + rad;
    if (near && rad > 3) continue;
    if (Math.abs(x - sx) < DH * 0.3 && y < yTop) continue;              /* nor across the taproot */
    stones.push([x, y, rad, rad * (0.55 + r() * 0.35), (r() - 0.5) * 1.2, r()]);
  }
  for (const s of stones) stone(c, ...s);
  /* the colon: two smooth stones in the middle */
  const cr = DH * 0.062;
  stone(c, colonX, yTop + DH * 0.3, cr, cr * 0.78, -0.2, 0.75, true);
  stone(c, colonX, yTop + DH * 0.74, cr, cr * 0.78, 0.15, 0.4, true);
  /* a dark rim where the ground is cut, and the edges falling into shadow */
  c.restore();
  const v = c.createRadialGradient(W / 2, (ySurf + H) / 2, Math.min(W, H) * 0.3, W / 2, (ySurf + H) / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.save();
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, surfaceY(x));
  c.lineTo(W, H);
  c.closePath();
  c.clip();
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);
  c.restore();
}
function stone(c, x, y, rx, ry, rot, tone, pale) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  /* a shadow under it, then the stone lit from above */
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(rx * 0.08, ry * 0.25, rx * 1.05, ry * 1.02, 0, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(-rx * 0.35, -ry * 0.45, rx * 0.1, 0, 0, rx * 1.1);
  const L = pale ? 150 + tone * 30 : 70 + tone * 60;
  g.addColorStop(0, `rgb(${L + 25 | 0},${L + 18 | 0},${L + 8 | 0})`);
  g.addColorStop(0.6, `rgb(${L * 0.72 | 0},${L * 0.66 | 0},${L * 0.58 | 0})`);
  g.addColorStop(1, `rgb(${L * 0.38 | 0},${L * 0.33 | 0},${L * 0.28 | 0})`);
  c.fillStyle = g;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/* ------------------------------------------------------------------ */
/*  Roots                                                               */
/* ------------------------------------------------------------------ */
/* A root is a polyline (xs, ys, its running length cum), a width at its base w0 and at its end w1, and when it
   grows: d0 is how far the growth front has to come from the joint before it starts, sp how fast it then grows (as a
   part of SPEED). A set is the roots of one figure, grown from t0 (an animation time). */
function makeRoot(pts, w0, w1, d0, sp, kind) {
  const cum = withLength(pts);
  return { xs: Float32Array.from(pts, p => p[0]), ys: Float32Array.from(pts, p => p[1]), cum, len: cum[cum.length - 1], w0, w1, d0, sp, kind };
}

/* rootlets off a base line: short, they turn down as they grow; a long one has rootlets of its own */
function rootlets(out, base, arrive, r, w, every, depth) {
  const nrm = normals(base);
  let next = every * (0.3 + r());
  const cum = withLength(base);
  for (let i = 2; i < base.length - 2; i++) {
    if (cum[i] < next) continue;
    next = cum[i] + every * (0.5 + r());
    if (r() < 0.25) continue;
    const side = r() < 0.5 ? -1 : 1;
    let a = Math.atan2(nrm[i][1] * side, nrm[i][0] * side);
    a += (Math.PI / 2 - a) * 0.25 * r();
    const len = DH * (depth ? 0.02 + r() * 0.05 : 0.04 + r() * r() * 0.16);
    const pts = [[base[i][0], base[i][1]]];
    let x = base[i][0], y = base[i][1];
    const st = Math.max(1.5, len / 24);
    for (let s = 0; s < len; s += st) {
      a += (r() - 0.5) * 0.35;
      /* gravity: the further it goes, the more it turns down */
      let da = Math.PI / 2 - a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      a += da * 0.04;
      x += Math.cos(a) * st; y += Math.sin(a) * st;
      pts.push([x, y]);
    }
    const wr = w * (0.35 + r() * 0.3);
    const root = makeRoot(pts, wr, 0.25, arrive[i], 0.3 + r() * 0.2, 'let');
    out.push(root);
    if (!depth && len > DH * 0.08) rootlets(out, pts, Array.from(withLength(pts), d => arrive[i] + d / root.sp), r, wr, len * 0.35, 1);
  }
}

/* one strand along a base line: a slow wander shared by the bundle (wob), and a twist of its own */
function strand(base, nrm, cum, wob, k, n, r) {
  const tw = DH * (0.006 + r() * 0.006), f = Math.PI * 2 / (DH * (0.22 + r() * 0.1)), ph = r() * 6.28;
  return base.map((p, i) => {
    const s = cum[i];
    const o = wob(s) + tw * Math.sin(s * f + ph + k / n * Math.PI * 2);
    return [p[0] + nrm[i][0] * o, p[1] + nrm[i][1] * o];
  });
}
function wobble(r, amp) {
  const f1 = Math.PI * 2 / (DH * (0.6 + r() * 0.5)), f2 = Math.PI * 2 / (DH * (0.17 + r() * 0.1)), p1 = r() * 6.28, p2 = r() * 6.28;
  return s => amp * (0.65 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
}
/* a bundle of strands along a base line, and its rootlets */
function bundle(out, base, arrive, r, w, n) {
  const cum = withLength(base), nrm = normals(base), wob = wobble(r, DH * 0.01);
  /* the line the bundle actually takes, for the rootlets */
  const mid = base.map((p, i) => [p[0] + nrm[i][0] * wob(cum[i]), p[1] + nrm[i][1] * wob(cum[i])]);
  for (let k = 0; k < n; k++) {
    const pts = strand(base, nrm, cum, wob, k, n, r);
    const ww = w * (k ? 0.65 + r() * 0.3 : 1);
    out.push(makeRoot(pts, ww, ww * 0.85, arrive[0], 1, 'main'));
  }
  rootlets(out, mid, arrive, r, w, DH * 0.09, 0);
}

let taproot = null;
function buildTaproot() {
  const r = rng(hash(seed, 3));
  const top = [sx, surfaceY(sx) - 1];
  const base = spline([top, [sx + DH * 0.02, lerp(top[1], joint[1], 0.5)], [joint[0], joint[1]],
    [sx - DH * 0.01, lerp(joint[1], yTop, 0.6)], [sx, yTop + DH * 0.08]], 2);
  const roots = [];
  const arrive = Array.from(withLength(base));
  bundle(roots, base, arrive, r, DH * 0.026, 3);
  /* the taproot always stands: it grew long ago */
  return { roots, t0: -1e9 };
}

/* the roots of one figure. Growth comes from the joint below the seedling along a feeder to the figure's highest
   point, and from there both ways along its stroke, then on into the strokes that meet it. */
function buildSet(pos, digit, t0, key) {
  const r = rng(hash(seed, pos, digit, key));
  const X = digitX[pos];
  const step = 2;
  let strokes = GLYPHS[digit].map(S => spline(S.map(([u, v]) => [X + u * DW, yTop + v * DH]), step));
  /* where it starts: the highest point, the one nearer the middle when they are level */
  let best = null;
  strokes.forEach((S, si) => S.forEach((p, i) => {
    const sc = p[1] + Math.abs(p[0] - sx) * 0.02;
    if (!best || sc < best.sc) best = { sc, si, i };
  }));
  const entry = strokes[best.si][best.i];
  /* the feeder: off the taproot at the joint, sweeping out and down into the entry */
  const jy = lerp(joint[1], yTop, 0.15 + r() * 0.2);
  const fb = spline([[sx, jy], [lerp(sx, entry[0], 0.35), jy + (entry[1] - jy) * 0.15 + DH * 0.04 * (r() - 0.3)],
    [lerp(sx, entry[0], 0.8), lerp(jy, entry[1], 0.55)], entry], step);
  const roots = [];
  const fArr = Array.from(withLength(fb));
  bundle(roots, fb, fArr, r, DH * 0.016, 2);
  const d1 = fArr[fArr.length - 1];
  /* split the first stroke at the entry, so it grows both ways */
  const first = strokes[best.si];
  const halves = [first.slice(0, best.i + 1).reverse(), first.slice(best.i)].filter(h => h.length > 2);
  const done = halves.map(h => ({ pts: h, arr: Array.from(withLength(h), d => d1 + d) }));
  let rest = strokes.filter((_, i) => i !== best.si);
  while (rest.length) {
    let pick = null;
    rest.forEach((S, si) => {
      for (const [end, rev] of [[S[0], false], [S[S.length - 1], true]]) {
        for (const D of done) for (let i = 0; i < D.pts.length; i += 2) {
          const d = Math.hypot(D.pts[i][0] - end[0], D.pts[i][1] - end[1]);
          if (!pick || d < pick.d) pick = { d, si, rev, at: D.arr[i] };
        }
      }
    });
    const S = rest[pick.si];
    const pts = pick.rev ? S.slice().reverse() : S;
    done.push({ pts, arr: Array.from(withLength(pts), d => pick.at + pick.d + d) });
    rest = rest.filter((_, i) => i !== pick.si);
  }
  for (const D of done) bundle(roots, D.pts, D.arr, r, DH * 0.022, 3);
  let end = 0;
  for (const R of roots) end = Math.max(end, R.d0 + R.len / R.sp);
  return { pos, digit, t0, roots, end, dying: null };
}

/* how much of a root stands at animation time t, and its width at s along it */
function grown(R, t0, t) { return clamp(((t - t0) * SPEED - R.d0) * R.sp, 0, R.len); }

function strokeRoots(c, list, pass) {
  for (const { R, l, alpha, wither } of list) {
    if (l <= 0.5) continue;
    const tip = Math.max(4, R.w0 * 5);
    const n = R.cum.length;
    let i = 0;
    /* in short runs, so the width can taper toward the end and the growing tip */
    while (i < n - 1 && R.cum[i] < l) {
      let j = Math.min(n - 1, i + 5);
      while (j > i + 1 && R.cum[j - 1] >= l) j--;
      const sm = (R.cum[i] + Math.min(l, R.cum[j])) / 2;
      let w = lerp(R.w0, R.w1, sm / Math.max(1, R.len)) * clamp((l - sm) / tip + 0.25, 0.25, 1);
      if (pass === 0) {
        c.strokeStyle = `rgba(10,6,3,${0.55 * alpha})`;
        c.lineWidth = w + 1.6 + w * 0.4;
      } else if (pass === 1) {
        const k = wither;
        c.strokeStyle = `rgba(${lerp(R.kind === 'let' ? 214 : 232, 82, k) | 0},${lerp(R.kind === 'let' ? 196 : 216, 60, k) | 0},${lerp(R.kind === 'let' ? 162 : 182, 42, k) | 0},${alpha})`;
        c.lineWidth = w;
      } else {
        if (w < 1.6) { i = j; continue; }
        c.strokeStyle = `rgba(255,248,228,${0.45 * alpha * (1 - wither)})`;
        c.lineWidth = w * 0.32;
      }
      const ox = pass === 2 ? -w * 0.18 : 0, oy = pass === 2 ? -w * 0.22 : 0;
      c.beginPath();
      c.moveTo(R.xs[i] + ox, R.ys[i] + oy);
      for (let k = i + 1; k <= j; k++) {
        if (R.cum[k] > l) {
          const f = (l - R.cum[k - 1]) / Math.max(1e-6, R.cum[k] - R.cum[k - 1]);
          c.lineTo(lerp(R.xs[k - 1], R.xs[k], f) + ox, lerp(R.ys[k - 1], R.ys[k], f) + oy);
          break;
        }
        c.lineTo(R.xs[k] + ox, R.ys[k] + oy);
      }
      c.stroke();
      i = j;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Time and the figures                                                */
/* ------------------------------------------------------------------ */
let sets = [], minuteKey = -1, dirty = true, shown = '';
const WITHER = 7;                             /* seconds for an old figure to go back into the soil */
function update(t, T) {
  const hh = Math.floor(T / 3600) % 24, mm = Math.floor(T / 60) % 60;
  const digits = [Math.floor(hh / 10), hh % 10, Math.floor(mm / 10), mm % 10];
  const key = Math.floor(T / 60);
  const live = [0, 1, 2, 3].map(p => sets.find(s => s.pos === p && !s.dying));
  for (let p = 0; p < 4; p++) {
    if (live[p] && live[p].digit === digits[p]) continue;
    if (live[p]) live[p].dying = t;
    /* on the first draw the figures grow one after another; later only the changed ones */
    const t0 = still ? -1e9 : (minuteKey < 0 ? t + 0.6 + p * 0.35 : t);
    sets.push(buildSet(p, digits[p], t0, key));
  }
  minuteKey = key;
  const n = sets.length;
  sets = sets.filter(s => !s.dying || t - s.dying < WITHER);
  if (sets.length !== n) dirty = true;
  const label = pad(hh) + ':' + pad(mm);
  if (label !== shown) { shown = label; canvas.setAttribute('aria-label', label); }
}
function busy(t) {
  return sets.some(s => s.dying || t - s.t0 < s.end / SPEED + 0.5);
}
function drawUnder(t) {
  const c = uctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, under.width, under.height);
  c.drawImage(soil, 0, 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const list = [];
  for (const R of taproot.roots) list.push({ R, l: R.len, alpha: 1, wither: 0 });
  /* the old ones first, under the new */
  const order = sets.slice().sort((a, b) => (b.dying ? 1 : 0) - (a.dying ? 1 : 0));
  for (const s of order) {
    const k = s.dying ? clamp((t - s.dying) / WITHER, 0, 1) : 0;
    const alpha = s.dying ? Math.pow(1 - k, 1.4) : 1;
    for (const R of s.roots) list.push({ R, l: grown(R, s.t0, t), alpha, wither: smooth(k * 2.2) });
  }
  for (let pass = 0; pass < 3; pass++) strokeRoots(c, list, pass);
}

/* ------------------------------------------------------------------ */
/*  The sky and the ground above                                        */
/* ------------------------------------------------------------------ */
/* the hour's sky, top and horizon, and how much daylight there is */
const SKY = [
  [0, '#0a0f1e', '#1a2033', 0], [4.5, '#0e1428', '#26263a', 0.02], [5.6, '#2b3560', '#a07a82', 0.2],
  [6.5, '#6c80ad', '#efc09a', 0.55], [8.5, '#86a9d2', '#e2e6e2', 0.9], [12, '#7ea6d4', '#dbe7ee', 1],
  [16, '#7d9fca', '#e8e0cc', 0.92], [17.6, '#58689c', '#f0a46e', 0.6], [18.6, '#2c3360', '#b4687a', 0.25],
  [19.6, '#141a36', '#3a3048', 0.05], [21, '#0b1122', '#1c2236', 0], [24, '#0a0f1e', '#1a2033', 0]
];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const SKYRGB = SKY.map(([h, a, b, d]) => [h, hex(a), hex(b), d]);
function sky(hour) {
  let i = 0;
  while (i < SKYRGB.length - 2 && SKYRGB[i + 1][0] <= hour) i++;
  const A = SKYRGB[i], B = SKYRGB[i + 1], k = smooth((hour - A[0]) / (B[0] - A[0]));
  const mix = (a, b) => a.map((x, j) => Math.round(lerp(x, b[j], k)));
  return { top: mix(A[1], B[1]), low: mix(A[2], B[2]), day: lerp(A[3], B[3], k) };
}
const rgb = (a, m = 1) => `rgb(${a[0] * m | 0},${a[1] * m | 0},${a[2] * m | 0})`;

let blades = [], starList = [];
function buildAbove() {
  const r = rng(hash(seed, 11));
  blades = [];
  for (let x = -4; x < W + 4; x += 1.6 + r() * 3) {
    if (Math.abs(x - sx) < DH * 0.09) continue;                       /* a clearing around the seedling */
    const h = (3 + r() * r() * 16) * (H / 800);
    blades.push([x, h, (r() - 0.3) * 0.5, r() * 6.28, 0.6 + r() * 0.8, r()]);
  }
  starList = Array.from({ length: Math.round(W * ySurf / 2500) }, () => [r() * W, r() * ySurf * 0.9, 0.4 + r() * 0.9, r() * 6.28]);
}

function drawAbove(c, t, T) {
  const s = sky(T / 3600 % 24);
  const g = c.createLinearGradient(0, 0, 0, ySurf);
  g.addColorStop(0, rgb(s.top));
  g.addColorStop(1, rgb(s.low));
  c.fillStyle = g;
  c.fillRect(0, 0, W, ySurf + H * 0.02);
  /* stars, when it is dark */
  const night = 1 - smooth(s.day * 5);
  if (night > 0.01) {
    for (const [x, y, a, ph] of starList) {
      c.fillStyle = `rgba(230,236,255,${night * a * (0.6 + 0.4 * Math.sin(t * 0.7 + ph)) * 0.7})`;
      c.fillRect(x, y, 1.2, 1.2);
    }
  }
  return s;
}
/* grass and the seedling, over the edge of the soil */
function drawGrowth(c, t, s) {
  const wind = still ? 0 : 1;
  const dl = 0.25 + 0.75 * s.day;
  const green = [lerp(30, 92, dl) | 0, lerp(40, 124, dl) | 0, lerp(38, 64, dl) | 0];
  c.lineCap = 'round';
  for (const [x, h, lean, ph, w, tone] of blades) {
    const y = surfaceY(x) + 1.5;
    const sway = wind * Math.sin(t * 1.3 + ph + x * 0.01) * h * 0.08;
    c.strokeStyle = rgb(green, 0.7 + tone * 0.45);
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + lean * h * 0.5, y - h * 0.6, x + lean * h + sway, y - h);
    c.stroke();
  }
  /* the seedling: a short stem, two round seed leaves, a first true leaf between them */
  const base = [sx, surfaceY(sx) + 1];
  const hgt = DH * 0.3;
  const sw = wind * Math.sin(t * 0.9) * 0.05 + wind * Math.sin(t * 2.3 + 1) * 0.015;
  const top = [base[0] + hgt * (0.06 + sw), base[1] - hgt];
  const ctrl = [base[0] - hgt * 0.08, base[1] - hgt * 0.55];
  c.strokeStyle = rgb([lerp(60, 140, dl), lerp(70, 160, dl), lerp(50, 90, dl)]);
  c.lineWidth = Math.max(2, DH * 0.016);
  c.beginPath(); c.moveTo(base[0], base[1]); c.quadraticCurveTo(ctrl[0], ctrl[1], top[0], top[1]); c.stroke();
  const leaf = (ang, len, wid, col) => {
    c.save();
    c.translate(top[0], top[1]);
    c.rotate(ang);
    const lg = c.createLinearGradient(0, 0, len, 0);
    lg.addColorStop(0, rgb(col, 0.8));
    lg.addColorStop(1, rgb(col, 1.15));
    c.fillStyle = lg;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.25, -wid, len * 0.85, -wid * 1.05, len, 0);
    c.bezierCurveTo(len * 0.85, wid * 0.9, len * 0.25, wid * 0.8, 0, 0);
    c.fill();
    c.strokeStyle = `rgba(20,40,10,${0.35})`;
    c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(len * 0.05, 0); c.lineTo(len * 0.85, 0); c.stroke();
    c.restore();
  };
  const lc = [lerp(40, 120, dl), lerp(60, 168, dl), lerp(30, 70, dl)];
  leaf(-0.35 + sw * 2, hgt * 0.42, hgt * 0.16, lc);
  leaf(Math.PI + 0.35 + sw * 2, hgt * 0.42, hgt * 0.16, lc);
  leaf(-Math.PI / 2 - 0.12 + sw * 3, hgt * 0.24, hgt * 0.08, lc.map(x => x * 1.05));
}

/* the seconds: a drop of rain going down through the soil to the upper stone */
function drawDrop(c, T) {
  const sec = T % 60, p = sec / 60;
  const r = rng(hash(seed, Math.floor(T / 60)));
  const x0 = sx + DH * (0.14 + r() * 0.12) * (r() < 0.5 ? -1 : 1), y0 = surfaceY(x0) + 3;
  const x1 = colonX + DH * 0.01, y1 = yTop + DH * 0.3 - DH * 0.062 * 0.78 - 3;
  const f1 = 2 + r() * 3, f2 = 5 + r() * 5, ph = r() * 6.28;
  const at = q => {
    const e = q;
    const wob = Math.sin(q * f1 * 3.14 + ph) * DH * 0.035 + Math.sin(q * f2 * 3.14 + ph * 2) * DH * 0.012;
    return [lerp(x0, x1, smooth(e) * 0.7 + e * 0.3) + wob * Math.sin(q * 3.14), lerp(y0, y1, e)];
  };
  /* the damp it leaves behind, drying from the top */
  c.lineCap = 'round';
  const n = Math.max(2, Math.ceil(p * 60));
  for (let i = 0; i < n; i++) {
    const qa = i / n * p, qb = (i + 1) / n * p;
    const age = p - qb;
    const a = 0.22 * Math.exp(-age * 9);
    if (a < 0.01) continue;
    const A = at(qa), B = at(qb);
    c.strokeStyle = `rgba(4,3,2,${a})`;
    c.lineWidth = Math.max(2, DH * 0.016);
    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
  }
  const [x, y] = at(p);
  const end = smooth((sec - 58.6) / 1.4);
  const rad = Math.max(3.5, DH * 0.024) * (1 - end * 0.85) * (1 + 0.05 * Math.sin(sec * 9));
  /* a faint wet sheen around it, then the bead */
  const halo = c.createRadialGradient(x, y, rad * 0.5, x, y, rad * 3.2);
  halo.addColorStop(0, 'rgba(150,185,210,0.28)');
  halo.addColorStop(1, 'rgba(150,185,210,0)');
  c.fillStyle = halo;
  c.beginPath(); c.arc(x, y, rad * 3.2, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - rad * 0.35, y - rad * 0.45, rad * 0.1, x, y, rad);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(170,200,220,0.75)');
  g.addColorStop(1, 'rgba(60,90,110,0.35)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(x, y, rad * 0.9, rad, 0, 0, Math.PI * 2); c.fill();
  /* in the first seconds of the minute, the last one soaks into the stone */
  if (sec < 2.5) {
    const k = sec / 2.5;
    c.strokeStyle = `rgba(190,215,230,${0.35 * (1 - k)})`;
    c.lineWidth = 1;
    c.beginPath(); c.ellipse(x1, y1 + 2, DH * (0.02 + k * 0.08), DH * (0.008 + k * 0.03), 0, 0, Math.PI * 2); c.stroke();
  }
}

/* ------------------------------------------------------------------ */
/*  The frame                                                           */
/* ------------------------------------------------------------------ */
function resize() { layout(); buildAbove(); }
window.addEventListener('resize', () => { resize(); });
resize();

let last = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  if (now - last < 31) return;               /* about 30 frames a second is enough for roots */
  last = now;
  if (reseed) { reseed = false; sets = []; minuteKey = -1; resize(); }
  const t = anim(), T = clock();
  update(t, T);
  if (dirty || busy(t)) { drawUnder(t); dirty = busy(t); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const s = drawAbove(ctx, t, T);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(under, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawDrop(ctx, T);
  drawGrowth(ctx, t, s);
}
requestAnimationFrame(frame);
})();
