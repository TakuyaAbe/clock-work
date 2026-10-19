(() => {
'use strict';

/* Sunlit Scale: the time, where a line of sunlight falls across three scales on a desk. An engraved 24-hour stock,
   an aluminium minute tape and an antiqued-brass seconds strip lie on a desk in soft shade, photographed through a
   macro lens. A narrow sheet of sunlight, through a gap in the blind to the left, falls across them, and they slide
   so that the hour, the minute and the second of now stand in it. Its colour follows the day: pale gold in the
   morning, white at noon, amber late in the afternoon; at night a desk lamp behind a slotted card, to the right,
   draws the line instead. Dust glints only in the beam. A few things from a working desk lie about, laid out afresh
   for each new tab. */

const canvas = document.getElementById('c');
const tmBox = document.getElementById('tm'), tmText = tmBox.querySelector('.t');
const pad = n => (n < 10 ? '0' : '') + n;
/* without WebGL 2, or if the GPU cannot build the picture, the small time is all there is */
let started = false, fellBack = false;
function fallback() {
  if (fellBack) return;
  fellBack = true;
  tmBox.classList.add('on');
  document.getElementById('pg').hidden = true;         /* nothing to play with */
  const tick = () => {
    const d = new Date(), T = frozen ?? d.getHours() * 3600 + d.getMinutes() * 60;
    tmText.textContent = pad(Math.floor(T / 3600)) + ':' + pad(Math.floor(T / 60) % 60);
    setTimeout(tick, 1000);
  };
  tick();
}
window.addEventListener('error', () => { if (!started) fallback(); });

/* ------------------------------------------------------------------ */
/*  Hash hooks                                                          */
/* ------------------------------------------------------------------ */
/* #t=HH:MM or #t=HH:MM:SS freezes the time. #seed=N fixes the things on the desk. #gui opens the playground. */
/* The lens: a 100 mm macro at f/14.6, focused once and never again, on the line of light (which drifts only a
   little through the day), its plane of focus square to the lens; the scales fall soft in front of it and behind
   it, the cloth and the things on the desk soft with their height. The plane passes through FOCUS (y, z), a hair
   beyond the line (VIEW0.focus). */
const FOCUS = [0.47, 0];
let frozen = null;
function hashSeed() { const m = /seed=(\d+)/.exec(location.hash || ''); return m ? +m[1] % 1000000 : null; }
let sceneSeed = hashSeed() ?? 1 + Math.floor(Math.random() * 999999);
function readHash() {
  const h = location.hash || '';
  const m = /t=(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(h);
  frozen = m ? (Math.min(23, +m[1]) * 3600 + Math.min(59, +m[2]) * 60 + Math.min(59, +(m[3] || 0))) : null;
  const n = hashSeed();
  if (ready && n !== null && n !== sceneSeed) { sceneSeed = n; buildDesk(); }
  if (ready && /gui/.test(h)) setPlayground(true);
  dirty = true;
}
let dirty = true, ready = false;
readHash();
window.addEventListener('hashchange', readHash);
/* reduced motion: the dust stands still, and there is less of it */
let still = false;
if (window.matchMedia) {
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => { still = rm.matches; dirty = true; };
  apply();
  if (rm.addEventListener) rm.addEventListener('change', apply);
}

/* ------------------------------------------------------------------ */
/*  The object, in scale units (one unit is one hour on the stock,      */
/*  one minute on the tape, one second on the strip; think of it as     */
/*  4 mm)                                                               */
/* ------------------------------------------------------------------ */
const STOCK = { x0: -2.30, x1: -0.06, top: 0.50 };
const TAPE = { x0: 0.06, x1: 2.10, top: 0.44 };
/* the seconds: a narrow brass strip beside the tape, thinner and lower, its figures small and quietly engraved */
const SEC = { x0: 2.22, x1: 3.20, top: 0.44 };
const Z0 = -8, Z1 = 22;
/* the camera, as it was tuned by eye: elev degrees above the desk, dist from where it looks, turned yaw about the
   vertical and roll about its own axis; zoom is the field of view (1 / ZOOM: below 1 a little wider), aim moves where
   it looks along the scales; f is the lens's f-number and focus where its plane of focus lies, beyond the line. The
   playground changes them and keeps the viewer's choice (loadView, below) */
const VIEW0 = { elev: 37, yaw: 15, roll: -4, dist: 28, zoom: 1 / 1.087, aim: -0.5, f: 14.6, focus: 0.21 };
/* each one's range in the playground: min, max, step */
const RANGE = { elev: [12, 75, 1], yaw: [-60, 60, 1], roll: [-45, 45, 1], dist: [12, 80, 1], zoom: [0.4, 2, 0.01], aim: [-8, 8, 0.1],
  f: [1.4, 22, 0], focus: [-1.5, 1.5, 0.01] };
const VIEW_KEY = 'sunlit.camera';
const view = { ...VIEW0 };
/* the viewer's camera, if they chose one: each value checked and held in its range */
function loadView() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null'); } catch (e) { v = null; }
  if (!v || typeof v !== 'object') return;
  for (const k in VIEW0) {
    const x = v[k];
    if (typeof x === 'number' && Number.isFinite(x)) view[k] = Math.min(RANGE[k][1], Math.max(RANGE[k][0], x));
  }
}
function saveView() {
  try {
    if (Object.keys(VIEW0).every(k => Math.abs(view[k] - VIEW0[k]) < 1e-9)) localStorage.removeItem(VIEW_KEY);
    else localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch (e) { /* private windows and blocked storage: the choice lasts this tab */ }
}
loadView();
let ELEV, DIST, ZOOM, AIMZ, YAW, ROLL, fNumber, focusDz;
function applyView() {
  const deg = Math.PI / 180;
  ELEV = view.elev * deg; YAW = view.yaw * deg; ROLL = view.roll * deg;
  DIST = view.dist; ZOOM = 1 / view.zoom; AIMZ = view.aim;
  fNumber = view.f; focusDz = view.focus;
}
applyView();
const FRAME_NEAR = -1.0, FRAME_FAR = 12.35;
const WIN = norm([-0.84, 0.40, 0.36]);                 /* the window as a broad source of skylight: low, to the left */
const SKY = norm([-0.50, 0.62, 0.60]);                 /* where the window shows in reflections */
/* the right side of the desk: a sheet of squared paper, turned a little */
const PAPER = { cx: 10.3, cz: 6.4, hw: 4.6, hl: 14, rot: -0.15 };
/* the index light. By day: a vertical slit in the blind, SLIT_X to the left (24 cm), SLIT_W half wide (1.8 mm); the
   sun's disc (SUN_R radians) blurs its edges in proportion to the distance from the slit. By night: a small lamp
   (LAMP_R radius) behind a card with a slot LSLOT_A from it, to the right */
const SLIT_X = -60, SLIT_W = 0.55, SUN_R = 0.00465;
const LAMP_R = 0.32, LSLOT_A = 11, LSPILL = 0.007;
const SLIT_Z = 4.43;                     /* where the slit stands (its z): the line pivots about it */
const SHADE = 0.10;                     /* the blind is down: the skylight reaching the desk */
const LAMP = { pos: [18, 6.5, 0], aim: [-1.6, 0, 5.0] };

/* longitudinal CA, in css px of blur radius: red and blue focus a hair behind green; kept subtle */
const CA = [0.15, 0, -0.15];
const CMAX = 42;
const GMAX = 96;
const GLINT = 0.03;     /* the glints of the metal things, against their physical energy: kept faint */
const HAZE = 0.006;     /* the dust in the air of the sheet */
const MOTE_E = 7.0;     /* a mote's light, against the disc's own normalisation */
const FPS = 30;

function norm(v) { const l = Math.hypot(...v); return v.map(x => x / l); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

/* ------------------------------------------------------------------ */
/*  Time: the plane of focus, the tape and the strip                    */
/* ------------------------------------------------------------------ */
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
const CREEP_H = 0.05, CREEP_M = 0.06;   /* small: the figures of now stay inside the narrow line */
const PULL = 2.4, RESET = 7.0, GLIDE = 1.3, TICK = 0.28;
/* the playground's clock: seconds since midnight while it is scrubbed or played, null for the real time */
const play = { t: null, on: false, speed: 60 };
function secondsNow() {
  if (play.t !== null) return play.t;
  if (frozen !== null) return frozen;
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
}
function timeState(T, fast) {
  const hh = Math.floor(T / 3600) % 24, h12 = hh % 12;
  const sh = T - Math.floor(T / 3600) * 3600, mm = Math.floor(sh / 60), ss = sh - mm * 60;
  const p = smooth((sh - (3600 - PULL)) / PULL);
  const creep = CREEP_H * sh / 3600;
  const H = (hh + creep) * (1 - p) + (hh + 1) * p;
  let Hc = (h12 + creep) * (1 - p) + (h12 + 1) * p;
  if (h12 === 0) Hc += 12 * (1 - smooth(sh / RESET));
  const g = smooth((ss - (60 - GLIDE)) / GLIDE);
  const mEff = (mm + CREEP_M * ss / 60) * (1 - g) + (mm + 1) * g;
  /* the seconds step, as an escapement does: each figure rests in the light, then a quick, soft glide */
  const si = Math.floor(ss);
  /* played fast, the seconds would only flicker past: the strip rests at 00 */
  const sEff = fast ? 0 : si + smooth((ss - si - (1 - TICK)) / TICK);
  return { hh, mm, ss, H, Hc, mEff, sEff };
}

/* ------------------------------------------------------------------ */
/*  The day's light, from the time of day alone                         */
/* ------------------------------------------------------------------ */
/* [hour, sun elevation (deg), sun azimuth (rad, + towards the far end), sun rgb, skylight rgb, room, exposure,
    where the band of sun crosses the scale (z), its half width] */
const DAY = [
  [0.0,  -30, 0.0,  [0, 0, 0],          [0.006, 0.008, 0.017], 0.10, 1.00, 4, 6],
  [4.9,  -12, 0.0,  [0, 0, 0],          [0.008, 0.011, 0.024], 0.10, 1.00, 4, 6],
  [5.8,   -3, -0.05,[0, 0, 0],          [0.075, 0.090, 0.150], 0.30, 1.25, 4, 6],
  [6.6,    3, 0.10, [1.70, 1.55, 1.35], [0.30, 0.33, 0.40],  0.60, 1.45, 4.0, 4.0],
  [7.8,   12, 0.22, [5.40, 4.50, 3.15], [0.54, 0.60, 0.71],  0.95, 1.80, 5.6, 3.2],
  [10.0,  34, 0.18, [4.60, 4.35, 3.90], [0.92, 0.90, 0.85],  1.10, 1.85, 6.0, 4.8],
  [12.5,  58, 0.30, [4.40, 4.28, 4.05], [1.10, 1.07, 1.01],  1.20, 1.72, 11.5, 4.4],
  [14.6,  38, 0.42, [4.20, 3.75, 3.10], [0.82, 0.75, 0.65],  1.05, 1.55, 8.0, 4.8],
  [16.3,  14, 0.52, [2.40, 1.36, 0.58], [0.20, 0.16, 0.13],  0.50, 1.05, 4.2, 6.0],
  [17.3,   5, 0.60, [2.60, 1.00, 0.32], [0.15, 0.12, 0.12],  0.40, 1.15, 2.5, 6.0],
  [18.0,   -2, 0.62,[0, 0, 0],          [0.095, 0.125, 0.25],  0.34, 1.40, 2.5, 6],
  [18.8,   -8, 0.62,[0, 0, 0],          [0.040, 0.052, 0.12],  0.22, 1.20, 4, 6],
  [20.2,  -20, 0.6, [0, 0, 0],          [0.008, 0.011, 0.024], 0.10, 1.00, 4, 6],
  [24.0,  -30, 0.0, [0, 0, 0],          [0.006, 0.008, 0.017], 0.10, 1.00, 4, 6]
];
/* The index: where the line of light crosses the desk (z at x = 0), as a position u on a 12-step range (bandAt). By
   day the sun's line pivots about the slit, so it drifts a little from far (morning) to near (evening); the azimuth is compressed: a real slit would sweep this frame in under an hour. At DUSK the lamp comes
   on exactly where the sun's line has arrived; at DAWN it goes off and the scales glide up to the sun's line. */
/* below HORIZON degrees the sun is behind the houses across the street: the line appears and goes out with it */
const HORIZON = 5.5, SWAP = 4;
function dayRow(h) {
  let i = 0;
  while (i < DAY.length - 2 && DAY[i + 1][0] <= h) i++;
  const a = DAY[i], b = DAY[i + 1], x = (h - a[0]) / (b[0] - a[0]);
  return { a, b, t: smooth(x) * 0.5 + x * 0.5 };
}
const elAt = h => { const r = dayRow(h); return lerp(r.a[1], r.b[1], r.t); };
let DAWN = 6, DUSK = 18;
for (let h = 5; h < 9; h += 1 / 3600) if (elAt(h) >= HORIZON + 0.6) { DAWN = h; break; }
for (let h = 15; h < 19; h += 1 / 3600) if (elAt(h) < HORIZON + 0.6) { DUSK = h; break; }
const U_MORN = 5.45, U_EVE = 5.25;
const uOfSun = h => U_MORN + (U_EVE - U_MORN) * (h - 6.5) / (DUSK - 6.5);
/* where the reading band crosses the desk for a 12-step position (fitted once to the camera's view) */
const bandAt = Hc => 2.23 + 0.393 * Hc + 0.0039 * Hc * Hc;
const Z_NIGHT = bandAt(U_EVE);
FOCUS[1] = bandAt((U_MORN + U_EVE) / 2);
LAMP.pos[2] = Z_NIGHT;                                      /* square to the scales: the line keeps one depth */
const LAMP_K = (LAMP.pos[2] - Z_NIGHT) / LAMP.pos[0];         /* the night line: z = Z_NIGHT + LAMP_K x */
const LAMP_N = norm([-LAMP_K, 1]);                            /* its normal, in the desk's xz */
const lum = c => 0.3 * c[0] + 0.5 * c[1] + 0.2 * c[2];
function dayLight(T) {
  const h = (T / 3600) % 24;
  const { a, b, t } = dayRow(h);
  const el = lerp(a[1], b[1], t) * Math.PI / 180;
  /* the sun's line: through the slit and the point zB on the scales; the sun is where that line comes from */
  const zB = bandAt(uOfSun(Math.min(18.5, Math.max(6.0, h))));
  const k = (zB - SLIT_Z) / (0 - SLIT_X);
  const tl = Math.hypot(1, k);
  const sun = [-Math.cos(el) / tl, Math.sin(el), -Math.cos(el) * k / tl];
  const up = smooth((el * 180 / Math.PI - HORIZON) / 0.6);
  const sunCol = [0, 1, 2].map(c => lerp(a[3][c], b[3][c], t) * up);
  const skyCol = [0, 1, 2].map(c => lerp(a[4][c], b[4][c], t) * SHADE);
  const room = lerp(a[5], b[5], t);
  const s = T % 86400, dusk = DUSK * 3600, dawn = DAWN * 3600;
  /* played fast in the playground, the lamp's switching and the glide at dawn are drawn out (lightStretch) so they
     still take a moment on the screen, together */
  const st = lightStretch, sw = SWAP * st;
  const on = dt => (st > 1 ? smooth(dt / sw) : warm(dt));
  let lamp;
  if (s >= dusk) lamp = on(s - dusk);
  else if (s < dawn) lamp = on(s + 86400 - dusk);
  else lamp = 1 - smooth((s - dawn) / (st > 1 ? sw : 0.25));
  const lampCol = [1.0, 0.62, 0.32].map(c => c * lamp * 330);
  /* the reading line: the lamp's by night, the sun's by day (a glide at dawn) */
  const w = s < dawn || s >= dusk ? 0 : smooth((s - dawn) / sw);
  if (st === 1 && s >= dawn && s < dawn + 0.3) lamp = Math.max(lamp, 1 - (s - dawn) / 0.3);
  const idx = { z0: lerp(Z_NIGHT, zB, w), k: lerp(LAMP_K, k, w) };
  /* exposure, metered on the lit line (as a photographer would): its light on the scales' tops */
  const lp = [0, STOCK.top, Z_NIGHT], dl = sub(LAMP.pos, lp), d2 = dot(dl, dl);
  /* the line's own peak: when the sun's image through the slit is wider than the slit, it never reaches full sun */
  const Dm = -SLIT_X / (Math.cos(el) / tl);
  const eSun = lum(sunCol) * 0.85 * Math.max(Math.sin(el), 0.16) * Math.max(slitJS(0, SLIT_W, Dm * SUN_R), 0.3);
  const eLamp = lum([1.0, 0.62, 0.32].map(c => c * 330)) / d2 * Math.max(dl[1] / Math.sqrt(d2), 0.16);
  const E = lerp(eLamp, eSun, w);
  const expo = Math.min(7, Math.max(0.6, KEY / Math.max(E, 1e-3)));
  /* what the lit line throws back into the room */
  const bounce = [0, 1, 2].map(c => sunCol[c] * Math.max(Math.sin(el), 0) * 0.85 * 0.010 + lampCol[c] / d2 * 0.006);
  return { sun, sunCol, skyCol, room, expo, lampCol, lamp, h, beam: [zB, k, Math.cos(el)], idx, bounce };
}
const KEY = 0.75;
const cdiscJS = u => { u = Math.min(1, Math.max(-1, u)); return 0.5 + (u * Math.sqrt(1 - u * u) + Math.asin(u)) / Math.PI; };
const slitJS = (d, w, r) => { r = Math.max(r, 1e-3); return cdiscJS((w - d) / r) - cdiscJS((-w - d) / r); };
let lightStretch = 1;
function warm(dt) { return dt < 0 ? 0 : 1 - Math.exp(-dt / 0.18); }

/* ------------------------------------------------------------------ */
/*  The desk: a few things, chosen and laid down by the seed            */
/* ------------------------------------------------------------------ */
/* a small random stream from a seed: a Weyl sequence through the murmur3 finaliser (neighbouring seeds give
   unrelated streams) */
function seeded(seed) {
  let s = Math.imul(seed | 0, 0x9E3779B1) ^ 0x2545F491;
  return () => {
    s = (s + 0x9E3779B9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
}
const f = x => (+x).toFixed(4);
const v3 = a => `vec3(${a.map(f).join(',')})`;
const UP = [0, 1, 0], DOWN = [0, -1, 0], XA = [1, 0, 0];
/* what the metal gives back, as the colour of its glint (f0) */
const STEEL = [0.62, 0.61, 0.58], CHROME = [0.76, 0.76, 0.75], BRASS = [0.86, 0.68, 0.38], GRAPHITE = [0.07, 0.07, 0.075];
/* glint candidates, in the thing's own frame: a small round cap (the normal anywhere within minCos of its axis), or a
   ring (a bent wire, a rim: the tube of radius r round a circle of radius R about the axis A, from e1 through sweep) */
const cap = (c, r, A, minCos, tint) => ({ k: 0, c, r, A, R: 0, e1: XA, sw: 0, minCos, tint });
const ring = (c, r, A, R, e1, sw, tint) => ({ k: 1, c, r, A, R, e1, sw, minCos: 0, tint });
const PRI = 0.875;

/* Each thing: its distance field and material (GLSL, in its own frame: x along it, y up, lying on the desk at y = 0),
   its box, the point that should show, its glints, and how much it likes being in front of the lens. */
const KINDS = {
  /* the green pencil, sharpened; a stub of 70 to 100 mm */
  pencil: { w: 2.0, make: r => {
    const L = 17 + 8 * r();
    return { sd: `sdPencil(q, ${f(L)})`, mat: `mPencil(q, n, ${f(L)}, foot)`, lo: [-0.05, 0, -1.02], hi: [L + 0.05, 1.76, 1.02],
      show: [[0.5, 0], [4, 0]], glints: [cap([0.07, PRI, 0], 0.07, UP, -0.3, GRAPHITE), cap([L, 2 * PRI - 0.05, 0], 0.05, UP, 0.2, [0.05, 0.05, 0.05])] };
  } },
  /* a white plastic eraser in a paper sleeve, one end worn round */
  eraser: { w: 1.4, make: () => ({ sd: 'sdEraser(q)', mat: 'mEraser(q, n, foot)', lo: [-4.05, 0, -1.92], hi: [4.05, 2.15, 1.92],
    show: [[2.5, 0], [-2.5, 0], [0, 0]], glints: [] }) },
  /* steel paper clips, one or two */
  clips: { w: 0.7, make: r => {
    const two = r() < 0.55, dz = 2.5 + 0.5 * r(), dx = (r() - 0.5) * 2.4, rot = (r() - 0.5) * 0.25;
    const k = [two ? 2 : 1, dz, dx, rot];
    const g = [];
    const add = (ox, oz, a) => {
      const c = Math.cos(a), s = Math.sin(a), P = (x, z) => [ox + c * x - s * z, 0.11, oz + s * x + c * z], V = (x, z) => [c * x - s * z, 0, s * x + c * z];
      /* the three bends (as rings about the vertical; DOWN makes the angle run from x towards z) and the cut ends */
      g.push(ring(P(1.0 - 4.1, 0), 0.11, DOWN, 0.89, V(0, 1), Math.PI, STEEL));
      g.push(ring(P(7.25 - 4.1, -0.21), 0.11, DOWN, 0.68, V(0, -1), Math.PI, STEEL));
      g.push(ring(P(1.9 - 4.1, 0), 0.11, DOWN, 0.47, V(0, 1), Math.PI, STEEL));
      g.push(cap(P(6.2 - 4.1, 0.89), 0.11, UP, 0.0, STEEL), cap(P(5.9 - 4.1, -0.47), 0.11, UP, 0.0, STEEL));
    };
    add(0, 0, 0);
    if (two) add(dx, dz, rot);
    const zs = two ? [-1.05, dz + 1.6] : [-1.05, 1.05], xs = two ? [Math.min(-4.15, dx - 4.6), Math.max(4.0, dx + 4.5)] : [-4.15, 4.0];
    return { sd: `sdClips(q, ${`vec4(${k.map(f).join(',')})`})`, mat: 'mk(vec3(0.), vec3(.62, .61, .58), .14)', lo: [xs[0], 0, zs[0]], hi: [xs[1], 0.23, zs[1]],
      show: [[0, 0], [3, 0], [-3, 0]], glints: g };
  } },
  /* a small black binder clip, its chrome handles folded down */
  binder: { w: 2.2, make: () => {
    const g = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.push(cap([sx * 1.3, 0.42, sz * 1.62], 0.12, norm([0, 0.5, sz]), -0.3, CHROME));
      g.push(cap([sx * 1.95, 2.22, sz * 0.44], 0.12, UP, 0.0, CHROME));
    }
    return { sd: 'sdBinder(q)', mat: 'mBinder(q, n, foot)', lo: [-2.42, 0, -1.8], hi: [2.42, 2.42, 1.8], show: [[0, 0]], glints: g };
  } },
  /* a 150 mm steel rule, etched in millimetres */
  rule: { w: 0.7, make: () => {
    const L = 37.5;
    return { sd: `sdRule(q, ${f(L)})`, mat: `mRule(q, n, ${f(L)}, foot)`, lo: [-0.02, 0, -1.65], hi: [L + 0.02, 0.13, 1.65],
      show: [[1.5, 0], [8, 0], [L - 2, 0]],
      glints: [ring([L - 1.4, 0.125, 0], 0.03, DOWN, 0.45, XA, 2 * Math.PI, STEEL), cap([0.03, 0.1, 1.6], 0.04, UP, -0.2, STEEL), cap([0.03, 0.1, -1.6], 0.04, UP, -0.2, STEEL)] };
  } },
  /* a drafting divider, lying open */
  divider: { w: 0.7, make: r => {
    const a = 0.05 + 0.08 * r(), Lg = 24, ca = Math.cos(a), sa = Math.sin(a);
    return { sd: `sdDivider(q, ${f(a)})`, mat: 'mDivider(q, n, foot)', lo: [-3.45, 0, -(Lg * sa + 0.35)], hi: [Lg * ca + 0.1, 0.92, Lg * sa + 0.35],
      show: [[0, 0], [Lg * ca - 1, 0]],
      glints: [ring([0, 0.86, 0], 0.05, DOWN, 0.9, XA, 2 * Math.PI, CHROME), cap([0, 0.9, 0], 0.3, UP, 0.92, CHROME),
               ring([-3.38, 0.45, 0], 0.03, XA, 0.28, UP, 2 * Math.PI, CHROME),
               cap([Lg * ca, 0.04, Lg * sa], 0.04, UP, -0.4, STEEL), cap([Lg * ca, 0.04, -Lg * sa], 0.04, UP, -0.4, STEEL)] };
  } },
  /* a precision screwdriver: dark anodised handle, polished swivel cap, chrome blade */
  driver: { w: 0.9, make: () => ({ sd: 'sdDriver(q)', mat: 'mDriver(q, n, foot)', lo: [-0.02, 0, -1.05], hi: [27.25, 2.05, 1.05],
    show: [[1, 0], [12, 0], [26, 0]],
    glints: [ring([27.0, 1.0, 0], 0.2, XA, 0.68, UP, 2 * Math.PI, STEEL), ring([9.2, 1.0, 0], 0.05, XA, 0.3, UP, 2 * Math.PI, CHROME),
             ring([10.3, 1.0, 0], 0.1, XA, 0.88, UP, 2 * Math.PI, [0.12, 0.12, 0.13]), cap([0.02, 1.0, 0.2], 0.03, UP, -0.3, CHROME), cap([0.02, 1.0, -0.2], 0.03, UP, -0.3, CHROME)] }) },
  /* tweezers, satin steel, lying on one blade */
  tweezers: { w: 0.8, make: r => {
    const o = 1.7 + 0.6 * r();
    return { sd: `sdTweezers(q, ${f(o)})`, mat: 'mTweezers(q, n, foot)', lo: [-0.02, 0, -1.25], hi: [28.1, o + 0.25, 1.25],
      show: [[2, 0], [25, 0]],
      glints: [cap([27.9, 0.1, 0], 0.06, UP, -0.3, STEEL), cap([27.9, o + 0.1, 0], 0.06, UP, -0.3, STEEL), cap([0.05, 0.45, 1.15], 0.08, UP, -0.2, STEEL), cap([0.05, 0.45, -1.15], 0.08, UP, -0.2, STEEL)] };
  } },
  /* a brass wedge pencil sharpener, its steel blade and screw */
  sharpener: { w: 2.4, make: () => {
    const sl = norm([0.16, 1, 0]), su = norm([1, -0.16, 0]);
    const scr = [-3.1 + su[0] * 2.55 + sl[0] * 0.14, 2.0 + su[1] * 2.55 + sl[1] * 0.14, 0.95];
    return { sd: 'sdSharpener(q)', mat: 'mSharpener(q, n, foot)', lo: [-3.15, 0, -1.65], hi: [3.15, 2.3, 1.65], show: [[0, 0]],
      glints: [cap(scr, 0.32, sl, 0.75, STEEL), ring([-3.1, 0.95, 0], 0.06, XA, 0.82, UP, 2 * Math.PI, BRASS),
               cap([-3.05, 1.95, 1.55], 0.08, norm([-0.4, 1, 0.4]), -0.1, BRASS), cap([-3.05, 1.95, -1.55], 0.08, norm([-0.4, 1, -0.4]), -0.1, BRASS)] };
  } }
};

/* where things may lie. The scales run through the whole picture, so the desk is used either side of them; the
   plane of focus visits the middle of the picture through the day (the desk from z 2.2 to 7.0), so the things sit in
   front of it (the bottom of the picture) or well beyond it (the top). Measured at 16:10. */
const FORBID = [-2.75, 3.55];                       /* the stock, the tape, the strip, and a little air */
const CORR = [2.0, 7.2];                            /* depths the plane of focus visits through the day */
const inFrame = (x, z, m = 0) => z > -0.5 + m && z < 13.2 - m && Math.abs(x) < 5.47 + (z + 0.5) * 0.175 - m;
const ZONES = [
  { x: [-7.0, -3.1], z: [-1.0, 12.0] }, { x: [3.8, 7.0], z: [-1.0, 12.0] }
];
function obb(o) {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), m = 0.2;
  const [x0, z0, x1, z1] = [o.lo[0] - m, o.lo[2] - m, o.hi[0] + m, o.hi[2] + m];
  return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [o.x + c * x - s * z, o.z + s * x + c * z]);
}
function overlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < 4; i++) {
    const a = P[i], b = P[(i + 1) % 4], nx = b[1] - a[1], nz = a[0] - b[0];
    const pa = A.map(p => p[0] * nx + p[1] * nz), pb = B.map(p => p[0] * nx + p[1] * nz);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
}
function hitBox(o, P, d, m) {
  const c = Math.cos(o.rot), s = Math.sin(o.rot);
  const lo = [o.lo[0] - m, -1, o.lo[2] - m], hi = [o.hi[0] + m, o.hi[1] + m, o.hi[2] + m];
  const p = [P[0] - o.x, P[1], P[2] - o.z];
  const pl = [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]], dl = [c * d[0] + s * d[2], d[1], -s * d[0] + c * d[2]];
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(dl[k]) < 1e-9) { if (pl[k] < lo[k] || pl[k] > hi[k]) return -1; continue; }
    let a = (lo[k] - pl[k]) / dl[k], b = (hi[k] - pl[k]) / dl[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  return t0 <= t1 ? t0 : -1;
}
/* through the day, half-hour by half-hour: the index light of that hour (the lamp at night, the sun through the slit
   by day) must reach the reading line and a step either side of it; a thing may shade the scales elsewhere */
const LIGHTS = [];
for (let h = 0; h < 24; h += 0.25) {
  const L = dayLight(h * 3600 + 450);
  if (L.lamp > 0.5) LIGHTS.push({ z0: Z_NIGHT, k: LAMP_K, lamp: true });
  if (L.sunCol[0] > 0.05 && L.sun[1] > 0.05) LIGHTS.push({ z0: L.beam[0], k: L.beam[1], sun: L.sun });
}
function shadesScales(o) {
  for (const li of LIGHTS) for (const dz of [-1.1, -0.5, 0, 0.5, 1.1]) for (const x of [-2.0, -1.4, -0.8, 0.4, 1.0, 1.6, 2.6, 3.0]) {
    const P = [x, 0.47, li.z0 + li.k * x + dz];
    if (li.lamp) { if (hitBox(o, P, sub(LAMP.pos, P), 0.25) >= 0) return true; continue; }
    if (hitBox(o, P, li.sun.map(v => v * 80), 0.3) >= 0) return true;
  }
  return false;
}
function arrange(seed) {
  const r = seeded(seed);
  const want = 2 + Math.floor(r() * 3);
  const pool = Object.keys(KINDS), placed = [];
  const forbid = [[FORBID[0], Z0 - 0.5], [FORBID[1], Z0 - 0.5], [FORBID[1], Z1 + 0.5], [FORBID[0], Z1 + 0.5]];
  while (placed.length < want && pool.length) {
    let tot = pool.reduce((s, k) => s + KINDS[k].w, 0), x = r() * tot, ki = 0;
    while (x > KINDS[pool[ki]].w && ki < pool.length - 1) x -= KINDS[pool[ki++]].w;
    const kind = pool.splice(ki, 1)[0], o = KINDS[kind].make(r);
    o.kind = kind;
    /* the first thing must be cut by the plane of focus somewhere through the day: a sharp sliver of it, melting
       both ways, is what makes it a thing you can name */
    const first = !placed.length;
    let ok = false;
    for (let tries = 0; tries < 700 && !ok; tries++) {
      const zn = ZONES[r() < 0.5 ? 0 : 1];
      const sp = o.show[Math.floor(r() * o.show.length)];
      const ax = lerp(zn.x[0], zn.x[1], r()), az = lerp(zn.z[0], zn.z[1], r());
      /* long things mostly lie along the depth of the desk, near to far, so the plane slices them */
      const rot = r() < (first ? 0.85 : 0.55) ? (r() < 0.5 ? 1 : -1) * Math.PI / 2 + (r() - 0.5) * 1.0 : r() * Math.PI * 2;
      const c = Math.cos(rot), s = Math.sin(rot);
      o.rot = rot; o.x = ax - (c * sp[0] - s * sp[1]); o.z = az - (s * sp[0] + c * sp[1]);
      let box = obb(o);
      /* pushed aside, clear of the scales */
      if (overlap(box, forbid)) {
        const xs = box.map(p => p[0]);
        o.x += ax > 0 ? FORBID[1] - Math.min(...xs) + 0.02 : FORBID[0] - Math.max(...xs) - 0.02;
        box = obb(o);
      }
      if (overlap(box, forbid) || placed.some(p => overlap(box, p.box))) continue;
      /* in the picture (it may run out of the frame, as macro framing crops things) */
      let seen = 0, corr = 0;
      const cell = (o.hi[0] - o.lo[0]) * (o.hi[2] - o.lo[2]) / (17 * 7);
      for (let i = 0; i <= 16; i++) for (let j = 0; j <= 6; j++) {
        const lx = lerp(o.lo[0], o.hi[0], i / 16), lz = lerp(o.lo[2], o.hi[2], j / 6);
        const wx = o.x + c * lx - s * lz, wz = o.z + s * lx + c * lz;
        if (!inFrame(wx, wz)) continue;
        seen++;
        if (wz > CORR[0] && wz < CORR[1]) corr++;
      }
      const sw = [o.x + c * sp[0] - s * sp[1], o.z + s * sp[0] + c * sp[1]];
      if (!inFrame(sw[0], sw[1], 0.3) || seen * cell < 3) continue;
      if (first && corr * cell < 2) continue;
      /* never a shadow over the reading figures */
      if (shadesScales(o)) continue;
      o.box = box; ok = true;
    }
    if (ok) placed.push(o);
  }
  return placed;
}

/* ------------------------------------------------------------------ */
/*  WebGL2                                                              */
/* ------------------------------------------------------------------ */
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
const cbf = gl && gl.getExtension('EXT_color_buffer_float');
if (!gl || !cbf) { fallback(); return; }
const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
`;
const FULL_VS = HEAD + `
const vec2 V[3] = vec2[3](vec2(-1., -1.), vec2(3., -1.), vec2(-1., 3.));
void main(){ gl_Position = vec4(V[gl_VertexID], 0., 1.); }`;

const COMMON = `
uniform vec3 uC, uR, uU, uF;
uniform vec4 uProj;
uniform float uK;
uniform vec3 uFoc;     /* 1 / the depth of the plane of focus, along the ray through ndc: a + b.x ndc.x + b.y ndc.y */
uniform vec3 uCA;
uniform vec3 uSun, uSunCol, uSkyCol, uLampCol;
uniform float uRoom;
uniform vec3 uBeam, uBounce;
const float CMAX = ${CMAX.toFixed(1)}, GMAX = ${GMAX.toFixed(1)};
const vec3 WIN = ${v3(WIN)}, SKYD = ${v3(SKY)};
const vec3 LAMPP = ${v3(LAMP.pos)};
const vec2 LAMPN = vec2(${f(LAMP_N[0])}, ${f(LAMP_N[1])});
float invzF(vec2 ndc){ return uFoc.x + uFoc.y * ndc.x + uFoc.z * ndc.y; }
vec3 coc(float invz, vec2 ndc){ return clamp(uK * (invzF(ndc) - invz) + uCA, -CMAX, CMAX); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
/* the share of a round source seen through a slit: a slit of half width w, the point d off its middle, the source's
   image r in radius (both measured across the sheet). The integral of a disc's chord: the penumbra is exactly as wide
   as the source's image, and when that is wider than the slit the line never reaches full brightness */
float cdisc(float u){ u = clamp(u, -1., 1.); return .5 + (u * sqrt(1. - u * u) + asin(u)) * .31830989; }
float slit(float d, float w, float r){ r = max(r, 1e-3); return cdisc((w - d) / r) - cdisc((-w - d) / r); }
/* the sun through the slit: a vertical sheet through the slit, so the same line at every height */
float winMask(vec3 p){
  if (uSun.y < .005) return 0.;
  float k = uBeam.y, cs = inversesqrt(1. + k * k);
  float d = (p.z - uBeam.x - p.x * k) * cs;
  float D = (p.x - ${f(SLIT_X)}) / (cs * uBeam.z);
  return slit(d, ${f(SLIT_W)}, D * ${f(SUN_R)});
}
/* the lamp behind its slotted card: the sheet fans out from the lamp, its edges blurred by the bulb's size */
float lampAt(vec3 p, out vec3 Ld){
  vec3 dl = LAMPP - p; float d2 = dot(dl, dl); Ld = dl * inversesqrt(d2);
  vec2 hq = p.xz - LAMPP.xz; float Dh = length(hq);
  float d = dot(hq, LAMPN);
  float w = ${f(SLIT_W)} * Dh / ${f(Math.hypot(LAMP.pos[0], LAMP.pos[2] - Z_NIGHT))};
  float m = slit(d, w, ${f(LAMP_R)} * max(Dh - ${f(LSLOT_A)}, 0.) / ${f(LSLOT_A)});
  return (m + ${f(LSPILL)}) / d2;
}
float keyFall(vec3 p){ return .16 + 1.5 * exp(-length(p.xz - vec2(-9.5, 10.)) / 7.); }
`;

/* ---- the things on the desk: distance fields and materials, each in its own frame ---- */
const OBJ_LIB = `
struct Mat { vec3 alb; vec3 f0; float rough; };
Mat mk(vec3 alb, vec3 f0, float rough){ Mat m; m.alb = alb; m.f0 = f0; m.rough = rough; return m; }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b - r) - r; }
float sdSeg2(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
float sdArc2(vec2 p, vec2 c, float R, float a0, float a1){
  vec2 d = p - c; float a = a0 + mod(atan(d.y, d.x) - a0, 6.2831853);
  if (a <= a1) return abs(length(d) - R);
  return min(length(d - R * vec2(cos(a0), sin(a0))), length(d - R * vec2(cos(a1), sin(a1))));
}
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)) - r; }
float sdRCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1. / l2;
  vec3 pa = p - a; float y = dot(pa, ba), z = y - l2;
  vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float sdCylX(vec3 p, float r, float h){ vec2 d = vec2(length(p.yz) - r, abs(p.x) - h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
float sdCylY(vec3 p, float r, float h){ vec2 d = vec2(length(p.xz) - r, abs(p.y) - h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
float sdHex(vec2 p, float r){
  const vec3 k = vec3(-.866025404, .5, .577350269);
  p = abs(p); p -= 2. * min(dot(k.xy, p), 0.) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

/* the pencil: a hexagonal prism (edges a little rounded) cut by the sharpening cone, its point at the origin */
const float PRI = ${f(PRI)}, PTAN = .2473;
float sdPencil(vec3 q, float L){
  vec2 cs = vec2(q.z, q.y - PRI);
  float hex = sdHex(cs, PRI - .05) - .05;
  float cone = (length(cs) - q.x * PTAN) * .9708;
  return max(max(hex, cone), q.x - L);
}
Mat mPencil(vec3 q, inout vec3 n, float L, float foot){
  vec2 cs = vec2(q.z, q.y - PRI);
  float hex = sdHex(cs, PRI - .05) - .05, rho = length(cs);
  float cone = (rho - q.x * PTAN) * .9708;
  float wood = smoothstep(-.03, .01, cone - hex);
  float lead = 1. - smoothstep(1.04, 1.16, q.x);
  float end = smoothstep(.6, .9, n.x) * step(L - .03, q.x);
  float grain = .85 + .15 * sin(q.x * 34. + vnoise(cs * 9.) * 3.);
  float rings = .84 + .16 * sin(rho * 46. + vnoise(cs * 5.) * 2.5);
  vec3 cedar = vec3(.66, .44, .28) * .62;
  vec3 alb = mix(vec3(.016, .042, .032), cedar * grain, wood);
  float face = end * (1. - smoothstep(-.07, -.04, hex));
  alb = mix(alb, cedar * rings * .9, face);
  float gr = max(lead, face * (1. - smoothstep(.24, .27, rho)));
  alb = mix(alb, vec3(.03, .03, .033), gr);
  float rough = mix(mix(.16, .7, max(wood, face)), .3, gr);
  return mk(alb, vec3(mix(mix(.05, .02, max(wood, face)), .07, gr)), rough);
}

/* the eraser: a white block, the worn end rounded, the middle in a paper sleeve */
float eraserRub(vec3 c, float x){ return sdRBox(c, vec3(4.0, 1.06, 1.875), x > 0. ? .6 : .14); }
float eraserSleeve(vec3 c, float x){
  vec2 dd = abs(c.yz) - vec2(.93, 1.745);
  float rect = length(max(dd, 0.)) + min(max(dd.x, dd.y), 0.) - .18;
  return max(abs(rect) - .04, abs(x + .9) - 2.4);
}
float sdEraser(vec3 q){ vec3 c = q - vec3(0., 1.06, 0.); return min(eraserRub(c, q.x), eraserSleeve(c, q.x)); }
Mat mEraser(vec3 q, inout vec3 n, float foot){
  vec3 c = q - vec3(0., 1.06, 0.);
  if (eraserSleeve(c, q.x) < eraserRub(c, q.x)){
    float u = abs(q.x + .9);
    float line = smoothstep(1.86, 1.90, u) * (1. - smoothstep(2.02, 2.06, u));
    vec3 alb = mix(vec3(.105, .15, .23), vec3(.74, .71, .64), line) * (.94 + .06 * vnoise(q.xz * 30. + q.y * 7.));
    return mk(alb, vec3(.035), .5);
  }
  float smudge = smoothstep(1.6, 4.0, q.x) * (.5 + .5 * vnoise(q.xz * 2.5 + q.y)) * .45;
  return mk(vec3(.74, .73, .70) * (1. - smudge * .55) * (.97 + .03 * vnoise(q.xz * 18.)), vec3(.03), .62);
}

/* a paper clip (33 mm, wire 0.9 mm): three bends and four legs, centred */
const float CR = .11;
float clip2(vec2 p){
  p.x += 4.1;
  float d = sdSeg2(p, vec2(1.0, .89), vec2(6.2, .89));
  d = min(d, sdSeg2(p, vec2(1.0, -.89), vec2(7.25, -.89)));
  d = min(d, sdSeg2(p, vec2(7.25, .47), vec2(1.9, .47)));
  d = min(d, sdSeg2(p, vec2(1.9, -.47), vec2(5.9, -.47)));
  d = min(d, sdArc2(p, vec2(1.0, 0.), .89, 1.5708, 4.7124));
  d = min(d, sdArc2(p, vec2(7.25, -.21), .68, -1.5708, 1.5708));
  d = min(d, sdArc2(p, vec2(1.9, 0.), .47, 1.5708, 4.7124));
  return d;
}
float sdClip1(vec3 q){ return length(vec2(clip2(q.xz), q.y - CR)) - CR; }
float sdClips(vec3 q, vec4 k){
  float d = sdClip1(q);
  if (k.x > 1.5){
    vec3 r = q - vec3(k.z, 0., k.y); float c = cos(k.w), s = sin(k.w);
    r.xz = vec2(c * r.x + s * r.z, -s * r.x + c * r.z);
    d = min(d, sdClip1(r));
  }
  return d;
}

/* a 19 mm binder clip on its back: a folded black sheet, the lips curled, two wire handles folded down */
float binderBody(vec3 q){
  vec2 p = vec2(abs(q.z), q.y);
  float d2 = min(sdSeg2(p, vec2(0., .045), vec2(1.15, .045)), sdSeg2(p, vec2(1.15, .045), vec2(.30, 2.12)));
  d2 = min(d2, abs(length(p - vec2(.44, 2.22)) - .15));
  return max(d2 - .045, abs(q.x) - 2.375);
}
float binderWire(vec3 q){
  vec3 h = vec3(abs(q.x), q.y, abs(q.z));
  float d = sdCap(h, vec3(1.95, 2.22, .44), vec3(1.3, .42, 1.62), .12);
  d = min(d, sdCap(h, vec3(0., .42, 1.62), vec3(1.3, .42, 1.62), .12));
  return min(d, sdCap(h, vec3(1.95, 2.22, .44), vec3(1.5, 2.22, .44), .12));
}
float sdBinder(vec3 q){ return min(binderBody(q), binderWire(q)); }
Mat mBinder(vec3 q, inout vec3 n, float foot){
  if (binderWire(q) < binderBody(q)) return mk(vec3(0.), vec3(.76, .76, .75), .06);
  return mk(vec3(.016, .016, .018), vec3(.05), .22);
}

/* the steel rule, 13 mm wide and half a millimetre thick, its zero at the origin, a hanging hole at the far end */
float sdRule(vec3 q, float L){
  float d = sdRBox(q - vec3(L * .5, .0625, 0.), vec3(L * .5, .0625, 1.625), .03);
  return max(d, .45 - length(q.xz - vec2(L - 1.4, 0.)));
}
Mat mRule(vec3 q, inout vec3 n, float L, float foot){
  vec3 f0 = vec3(.36, .355, .34) * (.88 + .12 * vnoise(vec2(q.x * 1.5, q.z * 40.)));
  if (n.y < .5) return mk(vec3(0.), f0, .25);
  float u = q.x / .25, iu = floor(u + .5), dx = abs(u - iu) * .25;
  float tl = mod(iu, 10.) < .5 ? 1.05 : (mod(iu, 5.) < .5 ? .72 : .46);
  float tk = (1. - smoothstep(.011, .011 + foot, dx)) * (1. - smoothstep(.4, 1.2, foot / .022));
  float span = step(-.01, q.x) * step(q.x, L - 2.6);
  float ink = tk * span * max(step(1.625 - q.z, tl), step(q.z + 1.625, tl * .62));
  /* the centimetre figures, in the same face as the stock's engraving (borrowed from its texture) */
  float kk = floor(q.x / 2.5 + .5);
  if (kk >= 1. && kk <= 14.){
    vec2 g = vec2(1.10 + (q.x - kk * 2.5) / .676, -(q.z - .2) / .676);
    if (abs(g.x - 1.10) < .5 && abs(g.y) < .42) ink = max(ink, texture(uHourTex, vec2(g.x / ${f(STOCK.x1 - STOCK.x0)}, (24. - kk + g.y) / 24.)).r);
  }
  return mk(vec3(.022) * ink, mix(f0, vec3(.045), ink), mix(.26, .5, ink));
}

/* a drafting divider lying open: the hinge head flat on the desk, the knurled stem, two legs to the needles */
float sdDivider(vec3 q, float a){
  float d = sdCylY(q - vec3(0., .45, 0.), .9, .4) - .05;
  d = min(d, sdCylX(q - vec3(-2.1, .45, 0.), .28, 1.3) - .02);
  vec3 t = vec3(cos(a) * 24., .04, sin(a) * 24.);
  vec3 h = vec3(q.x, q.y, abs(q.z));
  return min(d, sdRCone(h, vec3(.35, .45, .2), t, .25, .04));
}
Mat mDivider(vec3 q, inout vec3 n, float foot){
  vec3 f0 = vec3(.68, .67, .64);
  float rough = .09;
  if (q.x < -.75){
    float an = atan(q.z, q.y - .45);
    float kn = (.5 + .5 * sin(q.x * 38. + an * 9.)) * (.5 + .5 * sin(q.x * 38. - an * 9.));
    float fd = 1. - smoothstep(.3, 1., foot / .05);
    f0 *= mix(.82, .62 + .4 * kn, fd); rough = .22;
  } else if (q.x > 20.) { f0 *= .8; rough = .14; }
  return mk(vec3(0.), f0, rough);
}

/* a precision screwdriver lying on the desk: blade at the origin, along x */
float sdDriver(vec3 q){
  vec3 c = q - vec3(0., 1., 0.);
  float rho = length(c.yz);
  float th = mix(.045, .22, smoothstep(0., 1.4, c.x));
  float d = max(max(abs(c.y) - th, rho - .22), abs(c.x - 4.6) - 4.6);
  d = min(d, max(rho - mix(.3, .62, clamp((c.x - 9.2) / .7, 0., 1.)), abs(c.x - 9.75) - .55) * .9);
  float fl = .045 * (.5 + .5 * cos(8. * atan(c.z, c.y)));
  vec2 e = vec2(rho - (1.0 - fl - .13), abs(c.x - 18.) - (7.8 - .13));
  d = min(d, min(max(e.x, e.y), 0.) + length(max(e, 0.)) - .13);
  vec2 k = vec2(rho - (.88 - .2), abs(c.x - 26.55) - (.65 - .2));
  return min(d, min(max(k.x, k.y), 0.) + length(max(k, 0.)) - .2);
}
Mat mDriver(vec3 q, inout vec3 n, float foot){
  if (q.x < 10.15) return mk(vec3(0.), vec3(.70, .70, .69), .08);
  if (q.x > 25.85) return mk(vec3(0.), vec3(.66, .65, .63), .05);
  vec3 c = q - vec3(0., 1., 0.);
  float an = atan(c.z, c.y);
  float band = step(10.5, q.x) * step(q.x, 13.2);
  float kn = (.5 + .5 * sin(q.x * 30. + an * 16.)) * (.5 + .5 * sin(q.x * 30. - an * 16.));
  float fd = 1. - smoothstep(.3, 1., foot / .04);
  vec3 f0 = vec3(.055, .056, .062) * mix(1., mix(.9, .6 + .7 * kn, fd), band);
  return mk(vec3(.022, .022, .025), f0, mix(.34, .5, band));
}

/* tweezers, lying on one blade, the other rising from the joint to the tips */
float sdTweezers(vec3 q, float o){
  float x = q.x;
  float w = mix(1.2, .3, smoothstep(1., 26., x)) * mix(1., .45, smoothstep(25., 28.2, x));
  float lo = max(max(abs(q.z) - w, abs(q.y - .1) - .1), abs(x - 14.05) - 14.05);
  float yc = mix(.3, o, clamp((x - 1.6) / 26.4, 0., 1.));
  float hi = max(max(abs(q.z) - w, (abs(q.y - yc) - .1) * .997), abs(x - 14.05) - 14.05);
  float back = sdBox(q - vec3(.8, .25, 0.), vec3(.8, .25, 1.2));
  return min(min(lo, hi), back) - .015;
}
Mat mTweezers(vec3 q, inout vec3 n, float foot){
  vec3 f0 = vec3(.40, .395, .38) * (.88 + .12 * vnoise(vec2(q.x * 2., q.z * 30.)));
  float gr = step(9., q.x) * step(q.x, 15.) * (1. - smoothstep(.3, 1., foot / .05));
  float g = smoothstep(.55, .95, .5 + .5 * sin(q.x * 21.)) * gr;
  return mk(vec3(0.), f0 * (1. - .45 * g), mix(.26, .45, g));
}

/* a brass wedge sharpener: the top falls towards the thin end, the cone along x, a steel blade and its screw */
const vec2 SH_T = vec2(.98757, -.15801), SH_N = vec2(.15801, .98757);
float sharpBody(vec3 q){
  float d = sdRBox(q - vec3(0., 1., 0.), vec3(3.1, 1., 1.6), .07);
  vec2 rel = q.xy - vec2(-3.1, 2.);
  d = max(d, dot(rel, SH_N));
  float rr = mix(.82, .08, clamp((q.x + 3.1) / 6., 0., 1.));
  d = max(d, (rr - length(q.yz - vec2(.95, 0.))) * .95);
  return max(d, -sdBox(q - vec3(-.7, 1.55, .12), vec3(1.7, .45, .16)));
}
float sharpBlade(vec3 q){
  vec2 rel = q.xy - vec2(-3.1, 2.);
  float su = dot(rel, SH_T), sv = dot(rel, SH_N);
  float d = sdBox(vec3(su - 2.55, sv - .04, q.z - .72), vec3(1.95, .04, .76)) - .01;
  vec2 e = vec2(length(vec2(su - 2.55, q.z - .95)) - .26, abs(sv - .14) - .06);
  return min(d, min(max(e.x, e.y), 0.) + length(max(e, 0.)) - .05);
}
float sdSharpener(vec3 q){ return min(sharpBody(q), sharpBlade(q)); }
Mat mSharpener(vec3 q, inout vec3 n, float foot){
  if (sharpBlade(q) < sharpBody(q)) return mk(vec3(0.), vec3(.62, .61, .59), .12);
  float fd = 1. - smoothstep(.3, 1., foot / .05);
  if (abs(n.z) > .7 && q.x > .4 && q.x < 2.9) n = normalize(n + vec3(.35 * sin(q.x * 25.) * fd, 0., 0.));
  float tar = vnoise(q.xz * 3. + q.y * 2.);
  vec3 f0 = vec3(.80, .61, .32) * (.82 + .18 * tar);
  float inHole = 1. - smoothstep(.0, .03, length(q.yz - vec2(.95, 0.)) - mix(.82, .08, clamp((q.x + 3.1) / 6., 0., 1.)));
  return mk(vec3(0.), f0 * (1. - .7 * inHole), .11 + .07 * tar);
}
`;

/* the generated part of the scene shader: each thing at its place, its march, its shadow, its occlusion */
function deskGLSL(objs) {
  let s = '';
  objs.forEach((o, i) => {
    const c = Math.cos(o.rot), sn = Math.sin(o.rot);
    s += `
vec3 oL${i}(vec3 p){ vec2 d = p.xz - vec2(${f(o.x)}, ${f(o.z)}); return vec3(${f(c)} * d.x + ${f(sn)} * d.y, p.y, ${f(-sn)} * d.x + ${f(c)} * d.y); }
vec3 oR${i}(vec3 v){ return vec3(${f(c)} * v.x + ${f(sn)} * v.z, v.y, ${f(-sn)} * v.x + ${f(c)} * v.z); }
vec3 oW${i}(vec3 v){ return vec3(${f(c)} * v.x - ${f(sn)} * v.z, v.y, ${f(sn)} * v.x + ${f(c)} * v.z); }
float oD${i}(vec3 q){ return ${o.sd}; }
const vec3 oLO${i} = ${v3(o.lo)}, oHI${i} = ${v3(o.hi)};
float oM${i}(vec3 ro, vec3 rd, float tMax){
  vec3 ol = oL${i}(ro), d = oR${i}(rd);
  vec2 tt = slab(ol, d, oLO${i} - .01, oHI${i} + .01);
  if (tt.x > tt.y || tt.y < 0. || tt.x > tMax) return -1.;
  float t = max(tt.x, 0.), te = min(tt.y, tMax);
  for (int k = 0; k < 90; k++){
    float h = oD${i}(ol + d * t);
    if (h < 8e-4) return t;
    t += h * .92;
    if (t > te) break;
  }
  return -1.;
}
/* a soft shadow from a source 'sp' radians across: half lit where the ray grazes the thing, fully lit once it
   clears it by half the source */
float oS${i}(vec3 p, vec3 L, float sp){
  vec3 ol = oL${i}(p), d = oR${i}(L);
  float m = .1 + sp * 12.;
  vec2 tt = slab(ol, d, oLO${i} - m, oHI${i} + m);
  if (tt.x > tt.y || tt.y < 0.) return 1.;
  float t = max(tt.x, .02), res = 1., k = 2. / sp;
  for (int j = 0; j < 36; j++){
    float h = oD${i}(ol + d * t);
    res = min(res, k * h / t);
    if (res < -1.) return 0.;
    t += clamp(abs(h), .02, .5);
    if (t > tt.y) break;
  }
  return smoothstep(-1., 1., res);
}
vec3 oN${i}(vec3 q){
  const vec2 e = vec2(7e-4, 0.);
  return normalize(vec3(oD${i}(q + e.xyy) - oD${i}(q - e.xyy), oD${i}(q + e.yxy) - oD${i}(q - e.yxy), oD${i}(q + e.yyx) - oD${i}(q - e.yyx)));
}
`;
  });
  s += `
float objHit(vec3 ro, vec3 rd, float tMax, out int id){
  id = -1; float best = tMax, t;
${objs.map((o, i) => `  t = oM${i}(ro, rd, best); if (t > 0.) { best = t; id = ${i}; }`).join('\n')}
  return id < 0 ? -1. : best;
}
float objShadow(vec3 p, vec3 L, float k){
  float s = 1.;
${objs.map((o, i) => `  s *= oS${i}(p, L, k);`).join('\n')}
  return s;
}
float objAO(vec3 p){
  float a = 1.; vec3 q, e;
${objs.map((o, i) => `  q = oL${i}(p); e = max(max(oLO${i} - q, q - oHI${i}), 0.); if (dot(e, e) < .8) a *= mix(.55, 1., smoothstep(0., .8, oD${i}(q)));`).join('\n')}
  return a;
}
vec3 objShade(int id, vec3 p, vec3 rd, float foot, out vec3 nw){
  vec3 q, n; Mat m;
${objs.map((o, i) => `  ${i ? 'else ' : ''}if (id == ${i}){ q = oL${i}(p); n = oN${i}(q); m = ${o.mat}; nw = oW${i}(n); }`).join('\n')}
${objs.length ? '' : '  nw = vec3(0., 1., 0.); m = mk(vec3(0.), vec3(0.), 1.);'}
  Lit l = lightAt(p, nw);
  float cv = max(dot(nw, -rd), 1e-3);
  vec3 F = m.f0 + (1. - m.f0) * pow(1. - cv, 5.);
  return m.alb * envDiff(nw, l) + F * envSpec(reflect(rd, nw), m.rough, l);
}
`;
  return s;
}

/* ---- the sharp scene ---- */
const sceneFS = objs => HEAD + COMMON + `
uniform vec2 uRes;
uniform float uDpr, uOff, uOffH, uOffS;
uniform sampler2D uHourTex, uMinTex, uSecTex;
out vec4 o;
const vec3 S0 = vec3(${STOCK.x0}, 0., ${Z0}.), S1 = vec3(${STOCK.x1}, ${STOCK.top}, ${Z1}.);
const vec3 T0 = vec3(${TAPE.x0}, 0., ${Z0}.), T1 = vec3(${TAPE.x1}, ${TAPE.top}, ${Z1}.);
const vec3 U0 = vec3(${SEC.x0}, 0., ${Z0}.), U1 = vec3(${SEC.x1}, ${SEC.top}, ${Z1}.);
const vec2 PAC = vec2(${f(PAPER.cx)}, ${f(PAPER.cz)}); const vec2 PAH = vec2(${f(PAPER.hw)}, ${f(PAPER.hl)});
const mat2 PAR = mat2(${f(Math.cos(PAPER.rot))}, ${f(Math.sin(PAPER.rot))}, ${f(-Math.sin(PAPER.rot))}, ${f(Math.cos(PAPER.rot))});

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float box(vec3 ro, vec3 rd, vec3 b0, vec3 b1, out vec3 n){
  vec3 inv = 1. / rd;
  vec3 t0 = (b0 - ro) * inv, t1 = (b1 - ro) * inv;
  vec3 mn = min(t0, t1), mx = max(t0, t1);
  float tn = max(max(mn.x, mn.y), mn.z), tf = min(min(mx.x, mx.y), mx.z);
  n = vec3(0.);
  if (tn > tf || tf < 0.) return -1.;
  if (tn == mn.x) n.x = -sign(rd.x); else if (tn == mn.y) n.y = -sign(rd.y); else n.z = -sign(rd.z);
  return tn;
}
vec2 slab(vec3 o, vec3 d, vec3 lo, vec3 hi){
  d = mix(d, vec3(1e-6), lessThan(abs(d), vec3(1e-6)));
  vec3 t0 = (lo - o) / d, t1 = (hi - o) / d;
  vec3 mn = min(t0, t1), mx = max(t0, t1);
  return vec2(max(max(mn.x, mn.y), mn.z), min(min(mx.x, mx.y), mx.z));
}
${OBJ_LIB}
float objShadow(vec3 p, vec3 L, float k);
bool blocked(vec3 p, vec3 d){
  vec3 n;
  return box(p, d, S0, S1, n) > 0. || box(p, d, T0, T1, n) > 0. || box(p, d, U0, U1, n) > 0.;
}
float shadowDir(vec3 p, vec3 n, vec3 L, float spread){
  vec3 t = normalize(cross(L, vec3(0., 1., 0.)) + vec3(1e-4)), b = cross(t, L);
  float s = 0.;
  for (int i = 0; i < 4; i++){
    vec2 j = vec2(float(i & 1), float(i >> 1)) - .5;
    vec3 d = normalize(L + (t * j.x + b * j.y) * spread);
    s += blocked(p + n * 2e-3, d) ? 0. : 1.;
  }
  return s * .25 * objShadow(p + n * 4e-3, L, spread);
}

struct Lit { float shK, shS, shL, mask, kf, lampI; vec3 Ld; };
Lit lightAt(vec3 p, vec3 n){
  Lit l;
  l.kf = keyFall(p);
  l.shK = dot(uSkyCol, vec3(1.)) > .06 ? shadowDir(p, n, WIN, .16) : 1.;
  l.mask = dot(uSunCol, vec3(1.)) > .01 ? winMask(p) : 0.;
  l.shS = l.mask > .003 ? shadowDir(p, n, uSun, .02) : 0.;
  l.Ld = vec3(0., 1., 0.);
  l.lampI = dot(uLampCol, vec3(1.)) > .01 ? lampAt(p, l.Ld) : 0.;
  l.shL = l.lampI > 1e-5 ? shadowDir(p, n, l.Ld, .04) : 0.;
  return l;
}
vec3 envDiff(vec3 n, Lit l){
  vec3 sky = uSkyCol * max(dot(n, WIN), 0.) * l.kf * l.shK;
  vec3 sun = uSunCol * max(dot(n, uSun), 0.) * l.mask * l.shS * .85;
  vec3 lamp = uLampCol * max(dot(n, l.Ld), 0.) * l.lampI * l.shL;
  float fill = max(dot(n, normalize(vec3(.7, .35, -.6))), 0.);
  vec3 amb = uSkyCol * smoothstep(.45, 1.1, uRoom) * (.55 + .45 * n.y) * .42;
  return vec3(.024, .023, .022) * uRoom * (.6 + .4 * n.y) + sky + sun + lamp + amb + (uSkyCol + vec3(.06, .04, .02) * uRoom) * fill * .035
       + uBounce * (.55 + .45 * n.y);
}
float lobe(float c, float w){ return exp((c - 1.) / w) * (.04 / w + .3); }
vec3 envSpecA(vec3 r, float rough, Lit l, float an){
  vec3 sq = vec3(an, 1., 1.);
  float w = .05 + rough * rough * .9;
  vec3 room = (vec3(.016, .014, .012) + vec3(.05, .048, .046) * smoothstep(-.1, .9, r.y)) * uRoom * .4;
  vec3 c = room + uSkyCol * lobe(dot(r, SKYD), w) * 1.6 + uSkyCol * smoothstep(.45, 1.1, uRoom) * smoothstep(-.2, .8, r.y) * .30;
  float ws = .006 + rough * rough * .7;
  vec3 ra = normalize(r * sq);
  c += uSunCol * lobe(dot(ra, normalize(uSun * sq)), ws) * l.mask * l.shS * .22;
  c += uLampCol * l.lampI * lobe(dot(ra, normalize(l.Ld * sq)), ws * 1.4 + .01) * l.shL * .35;
  return c;
}
vec3 envSpec(vec3 r, float rough, Lit l){ return envSpecA(r, rough, l, 1.); }
float fresnel(float c, float f0){ return f0 + (1. - f0) * pow(1. - c, 5.); }
${deskGLSL(objs)}

void main(){
  vec2 ndc = gl_FragCoord.xy / uRes * 2. - 1.;
  vec3 rd = normalize(uF + (ndc.x * uProj.x + uProj.z) * uR + (ndc.y * uProj.y + uProj.w) * uU);
  vec3 ro = uC;
  float pixAng = 2. * uProj.y / uRes.y;

  vec3 ns, nt, nu;
  float tp = -ro.y / rd.y;
  float ts = box(ro, rd, S0, S1, ns), tt = box(ro, rd, T0, T1, nt), tu = box(ro, rd, U0, U1, nu);
  float t = tp; int id = 0; vec3 n = vec3(0., 1., 0.);
  if (ts > 0. && ts < t){ t = ts; id = 1; n = ns; }
  if (tt > 0. && tt < t){ t = tt; id = 2; n = nt; }
  if (tu > 0. && tu < t){ t = tu; id = 3; n = nu; }
  int oid; float to = objHit(ro, rd, t, oid);
  if (to > 0. && to < t){ t = to; id = 10 + oid; }
  vec3 p = ro + rd * t;
  vec3 v = -rd;
  float foot = t * pixAng / max(abs(dot(n, v)), .15);
  vec3 col;

  if (id >= 10){
    vec3 nw;
    col = objShade(id - 10, p, rd, t * pixAng, nw);
  } else if (id == 0){
    vec2 pq = PAR * (p.xz - PAC);
    vec2 pe = PAH - abs(pq);
    float onPaper = clamp(min(pe.x, pe.y) / max(foot, 1e-3) + .5, 0., 1.);
    float dS = max(max(S0.x - p.x, p.x - S1.x), 0.), dT = max(max(T0.x - p.x, p.x - U1.x), 0.);
    float ao = mix(.35, 1., smoothstep(0., .45, min(dS, dT))) * objAO(p);
    Lit l = lightAt(p, n);
    /* dark linen */
    float per = .055;
    vec2 q = p.xz / per;
    float fade = 1. - smoothstep(.25, .9, foot / per);
    float wx = .5 + .5 * sin(q.x * 6.2832) * (.7 + .3 * vnoise(vec2(q.x * .5, q.y * 4.)));
    float wz = .5 + .5 * sin(q.y * 6.2832) * (.7 + .3 * vnoise(vec2(q.y * .5, q.x * 4.) + 7.));
    float checker = step(.5, fract((floor(q.x) + floor(q.y)) * .5));
    float weave = mix(wx, wz, checker);
    float slub = vnoise(p.xz * vec2(1.3, 9.)) * .5 + vnoise(p.xz * vec2(11., 1.4)) * .5;
    float alb = .088 * (1. + fade * (.55 * (weave - .5)) + .25 * (slub - .5));
    vec2 wg = vec2(cos(q.x * 6.2832) * (1. - checker), cos(q.y * 6.2832) * checker) * fade;
    vec3 nl = normalize(vec3(wg.x * .1, 1., wg.y * .1));
    vec3 linen = vec3(.98, .94, .90) * alb * envDiff(nl, l) * ao + envSpec(reflect(rd, n), .8, l) * .012 * ao;
    if (onPaper > 0.){
      float g = 1.25;
      vec2 gq = abs(fract(pq / g + .5) - .5) * g;
      float lw = .018, gf = 1. - smoothstep(.4, 1.1, foot / lw);
      float grid = (1. - smoothstep(lw * .5, lw * .5 + foot, min(gq.x, gq.y))) * gf;
      float fib = vnoise(pq * 14.) * .5 + vnoise(pq * 41.) * .5;
      vec3 alb2 = vec3(.80, .765, .70) * .21 * (.96 + .08 * fib);
      alb2 = mix(alb2, alb2 * vec3(.80, .86, .93), grid * .55);
      float pl = abs(pq.x + 2.95) ; float pen = (1. - smoothstep(.006, .006 + foot, pl)) * step(-6., pq.y) * step(pq.y, 9.5) * .5;
      alb2 *= 1. - pen * .55;
      vec3 paper = alb2 * envDiff(n, l) * ao + fresnel(max(dot(n, v), 1e-3), .04) * envSpec(reflect(rd, n), .55, l) * .6 * ao;
      col = mix(linen, paper, onPaper);
    } else col = linen;
  } else {
    bool tape = id == 2, sec = id == 3;
    vec3 b0 = tape ? T0 : (sec ? U0 : S0), b1 = tape ? T1 : (sec ? U1 : S1);
    vec3 nn = n;
    vec2 paint = vec2(0.);
    float wall = 0.; vec3 nw = n;
    if (n.y > .5){
      float e0 = p.x - b0.x, e1 = b1.x - p.x, bev = .028;
      nn = normalize(n + vec3(-1., 0., 0.) * (1. - smoothstep(0., bev, e0)) * .9 + vec3(1., 0., 0.) * (1. - smoothstep(0., bev, e1)) * .9);
      float ux = (p.x - b0.x) / (b1.x - b0.x);
      if (tape) paint = texture(uMinTex, vec2(ux, 1. - (p.z + uOff) / 60.)).rg;
      else if (sec) paint = texture(uSecTex, vec2(ux, 1. - (p.z + uOffS) / 60.)).rg;
      else {
        vec2 uv = vec2(ux, 1. - (p.z + uOffH) / 24.);
        paint = texture(uHourTex, uv).rg;
        float e = .011, du = e / (b1.x - b0.x), dv = e / 24.;
        float gx = dot(texture(uHourTex, uv + vec2(du, 0.)).rg - texture(uHourTex, uv - vec2(du, 0.)).rg, vec2(1.));
        float gz = dot(texture(uHourTex, uv - vec2(0., dv)).rg - texture(uHourTex, uv + vec2(0., dv)).rg, vec2(1.));
        float fadeE = 1. - smoothstep(.5, 1.5, foot / e);
        wall = clamp(length(vec2(gx, gz)) * .6, 0., 1.) * fadeE;
        nw = normalize(vec3(gx, 0., gz) * 1.4 + vec3(0., .6, 0.));
        nn = normalize(nn + vec3(gx, 0., gz) * .25 * fadeE);
      }
    }
    Lit l = lightAt(p, nn);
    float cv = max(dot(nn, v), 1e-3);
    vec3 r = reflect(rd, nn);
    if (id == 1){
      float fade = 1. - smoothstep(.3, 1.2, foot / .012);
      float grain = mix(.5, vnoise(p.xz / .012), fade);
      vec3 base = vec3(.020, .021, .024) * (.85 + .3 * grain);
      vec3 ink = mix(base, vec3(.80, .78, .72), paint.r);
      ink = mix(ink, vec3(.86, .46, .16) * .85, paint.g);
      float rough = mix(.36 + .06 * grain, .62, max(paint.r, paint.g));
      float F = fresnel(cv, .045);
      col = ink * envDiff(nn, l) + F * envSpec(r, rough, l) * mix(.35 + .65 * l.shK, 1., .3);
      vec3 wl = uSkyCol * pow(max(dot(nw, WIN), 0.), 2.) * l.shK * l.kf
              + uSunCol * pow(max(dot(nw, uSun), 0.), 2.) * l.mask * l.shS
              + uLampCol * pow(max(dot(nw, l.Ld), 0.), 2.) * l.lampI * l.shL;
      col += wall * (vec3(.03) * uRoom + 1.1 * wl * vec3(1., .93, .84));
    } else if (tape){
      float fade = 1. - smoothstep(.3, 1.2, foot / .006);
      float s = p.z + uOff;
      float streak = mix(.5, vnoise(vec2(p.x / .006, s / .9)) * .6 + vnoise(vec2(p.x / .002, s / .3)) * .4, fade);
      float rough = .30 + .08 * streak;
      vec3 f0 = vec3(.56, .55, .53) * (.9 + .2 * streak);
      vec3 Fm = f0 + (1. - f0) * pow(1. - cv, 5.);
      /* satin aluminium: what it mirrors of the dim room is little; the light it scatters is most of what it shows */
      vec3 metal = Fm * envSpecA(r, rough, l, .4) * mix(.45 + .55 * l.shK, 1., .25) * .45 + f0 * .5 * envDiff(nn, l);
      float inkA = max(paint.r, paint.g);
      vec3 inkC = mix(vec3(.018, .017, .016), vec3(.42, .05, .03), paint.g / max(inkA, 1e-3));
      vec3 inkCol = inkC * envDiff(nn, l) + fresnel(cv, .04) * envSpec(r, .55, l);
      col = mix(metal, inkCol, inkA);
    } else {
      /* the seconds strip: drawn brass, engraved and filled with a dark wax, so its figures are quieter than the tape's */
      float fade = 1. - smoothstep(.3, 1.2, foot / .006);
      float s = p.z + uOffS;
      float streak = mix(.5, vnoise(vec2(p.x / .006, s / .9)) * .6 + vnoise(vec2(p.x / .002, s / .3)) * .4, fade);
      /* the seconds strip: brass, darkened to a brown patina; the figures and ticks are cut through it to the
         bright metal, so they read warm and quiet, never as loud as the tape's black figures */
      vec3 sh = mix(.45 + .55 * vec3(l.shK), vec3(1.), .25);
      vec3 pat = vec3(.068, .052, .036) * (.85 + .3 * streak) * envDiff(nn, l) + vec3(.10, .078, .055) * envSpecA(r, .5, l, .6) * sh;
      vec3 f0 = vec3(.56, .42, .24) * (.9 + .2 * streak);
      vec3 Fm = f0 + (1. - f0) * pow(1. - cv, 5.);
      vec3 cut = Fm * envSpecA(r, .30 + .08 * streak, l, .4) * sh + f0 * .55 * envDiff(nn, l);
      col = mix(pat, cut, paint.r);
    }
    if (n.y < .5) col *= .55;
  }
  float z = dot(p - ro, uF);
  o = vec4(col, 1. / z);
}`;

const DOWN_FS = HEAD + `
uniform sampler2D uSrc; uniform vec2 uSrcRes, uDstRes;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uDstRes, d = .25 / uDstRes;
  o = .25 * (texture(uSrc, uv + vec2(-d.x, -d.y)) + texture(uSrc, uv + vec2(d.x, -d.y)) + texture(uSrc, uv + vec2(-d.x, d.y)) + texture(uSrc, uv + vec2(d.x, d.y)));
}`;

const GATHER_FS = HEAD + COMMON + `
uniform sampler2D uSmall; uniform vec2 uSRes;
out vec4 o;
const int N = 56;
void main(){
  vec2 uv = gl_FragCoord.xy / uSRes;
  vec4 c0 = textureLod(uSmall, uv, 0.);
  vec3 cc = abs(coc(c0.a, uv * 2. - 1.)) * .5;
  float m = max(cc.r, max(cc.g, cc.b));
  float R = min(CMAX * .5 + 2., m * 1.25 + 1.5);
  float sp = R * sqrt(3.14159 / float(N));
  float lod = log2(max(sp * .9, 1.));
  vec3 w0 = 1. / max(cc * cc, vec3(1.));
  vec3 sum = c0.rgb * w0, wsum = w0;
  float rot = hash12(gl_FragCoord.xy) * 6.2832;
  for (int i = 0; i < N; i++){
    float fi = float(i) + .5;
    float r = sqrt(fi / float(N)) * R, th = fi * 2.39996323 + rot;
    vec2 off = r * vec2(cos(th), sin(th));
    vec4 s = textureLod(uSmall, uv + off / uSRes, lod);
    vec3 cs = abs(coc(s.a, (uv + off / uSRes) * 2. - 1.)) * .5;
    if (s.a < c0.a - 1e-6) cs = min(cs, cc);
    vec3 cov = clamp((cs - r) / sp + .5, 0., 1.);
    vec3 w = cov / max(cs * cs, vec3(1.));
    sum += s.rgb * w; wsum += w;
  }
  o = vec4(sum / wsum, m);
}`;

const COMP_FS = HEAD + COMMON + `
uniform sampler2D uScene, uBlur; uniform vec2 uRes; uniform float uDpr;
out vec4 o;
const float HAZE = ${f(HAZE)};
float sheetLen(vec3 ro, vec3 rd, float tS, vec2 n2, float c0){
  float d0 = dot(ro.xz, n2) - c0, dd = dot(rd.xz, n2);
  if (abs(dd) < 1e-5) dd = 1e-5;
  float len = 0.;
  for (int j = -1; j <= 1; j++){
    float hw = ${f(SLIT_W)} + float(j) * .3;
    float ta = (-hw - d0) / dd, tb = (hw - d0) / dd;
    len += max(min(max(ta, tb), tS) - max(min(ta, tb), 0.), 0.);
  }
  return len / 3.;
}
const int N = 28;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 s0 = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0);
  vec3 c = abs(coc(s0.a, uv * 2. - 1.));
  float m = max(c.r, max(c.g, c.b));
  float t = smoothstep(3.5, 6.5, m);
  vec3 col = s0.rgb;
  if (t < 1. && m * uDpr > .35){
    vec3 cd = c * uDpr;
    float R = m * uDpr + .5;
    float sp = R * sqrt(3.14159 / float(N));
    float lod = log2(max(sp * .8, 1.));
    vec3 sum = s0.rgb, wsum = vec3(1.);
    float rot = hash12(gl_FragCoord.xy + 17.) * 6.2832;
    for (int i = 0; i < N; i++){
      float fi = float(i) + .5;
      float r = sqrt(fi / float(N)) * R, th = fi * 2.39996323 + rot;
      vec2 off = r * vec2(cos(th), sin(th));
      vec3 sc = textureLod(uScene, uv + off / uRes, lod).rgb;
      vec3 w = clamp(cd - r + .5, 0., 1.);
      sum += sc * w; wsum += w;
    }
    col = sum / wsum;
  }
  if (t > 0.) col = mix(col, texture(uBlur, uv).rgb, t);
  /* the sheet of light in the air: the view ray's path inside it (three nested widths, for its soft edges),
     forward-scattering dust, very faint */
  {
    vec2 ndc = uv * 2. - 1.;
    vec3 rd = normalize(uF + (ndc.x * uProj.x + uProj.z) * uR + (ndc.y * uProj.y + uProj.w) * uU);
    float tS = (1. / s0.a) / dot(rd, uF);
    if (uSun.y > .005 && dot(uSunCol, vec3(1.)) > .01){
      vec2 n2 = normalize(vec2(-uBeam.y, 1.));
      float len = sheetLen(uC, rd, tS, n2, uBeam.x * n2.y);
      float g = .6, ph = (1. - g * g) / pow(1. + g * g - 2. * g * dot(uSun, rd), 1.5) * .25;
      col += uSunCol * len * ph * HAZE;
    }
    if (dot(uLampCol, vec3(1.)) > .01){
      float len = sheetLen(uC, rd, tS, LAMPN, dot(LAMPP.xz, LAMPN));
      vec2 hq = (uC + rd * min(tS, 60.)).xz;
      vec3 pm = uC + rd * clamp((dot(LAMPP.xz - uC.xz, normalize(rd.xz))), 0., tS);
      vec3 dl = LAMPP - pm; float d2 = dot(dl, dl);
      float g = .6, ph = (1. - g * g) / pow(1. + g * g - 2. * g * dot(-normalize(dl), rd), 1.5) * .25;
      col += uLampCol / d2 * len * ph * HAZE;
    }
  }
  o = vec4(col, 1.);
}`;

/* ---- the image of the aperture, shared by the glints and the dust ---- */
const DISC_FS = HEAD + `
in vec2 vP; in vec3 vCoc; in float vE; in vec2 vNdc; in vec3 vTint; in float vSoft;
uniform float uDpr, uAspect, uCat, uBlades, uRound;
out vec4 o;
float disc(float c){
  float cm = max(abs(c), .7);
  vec2 q = vP / cm;
  vec2 a = c < 0. ? -q : q;
  float seg = 6.2831853 / uBlades;
  float th = atan(a.y, a.x) + 1.5708;
  float poly = cos(seg * .5) / cos(mod(th, seg) - seg * .5);
  float d = length(q) / mix(poly, 1., uRound);
  float d2 = length(q + vNdc * vec2(uAspect, 1.) * uCat) / 1.18;
  float e = max(d, d2);
  float soft = max(1.1 / (cm * uDpr), c < 0. ? .22 : .07);
  soft = max(mix(.75, soft, smoothstep(3.4, 6., cm)), vSoft);
  float cov = clamp((1. - e) / soft + .5, 0., 1.);
  cov = mix(exp(-e * e * 1.8) * 1.15, cov, smoothstep(3.4, 6., cm));
  float prof = c > 0. ? .86 + .34 * smoothstep(.5, 1., d) : 1.18 - .42 * d * d;
  prof = mix(1., prof, smoothstep(1.5, 5., cm));
  return cov * prof / (3.14159 * cm * cm);
}
void main(){
  if (vE <= 0.) discard;
  vec3 I = vec3(disc(vCoc.r), disc(vCoc.g), disc(vCoc.b)) * vE * vTint;
  o = vec4(I, 1.);
}`;

/* ---- the glints of the metal things: where a small round edge or a bent wire turns the sun, the lamp or the
   window towards the lens. Each candidate is drawn three times, once for each light; nothing is placed by hand: if
   the light and the view do not meet on that curve, there is no glint ---- */
const GLINT_VS = HEAD + COMMON + `
in vec2 aQ; in vec4 aG; in vec4 aA; in vec4 aE; in vec4 aT;
uniform vec2 uRes; uniform float uDpr, uFpx, uGain;
out vec2 vP; out vec3 vCoc; out float vE; out vec2 vNdc; out vec3 vTint; out float vSoft;
void main(){
  int li = gl_InstanceID - (gl_InstanceID / 3) * 3;
  vec3 C0 = aG.xyz; float r = aG.w;
  vec3 v = normalize(uC - C0);
  vec3 L = vec3(0., 1., 0.), E = vec3(0.);
  float phys = 2.5;
  if (li == 0){ L = uSun; E = uSunCol * winMask(C0) * .85; }
  else if (li == 1){ float k = lampAt(C0, L); E = uLampCol * k; }
  else { L = WIN; E = uSkyCol * keyFall(C0); phys = .8; }
  vec3 h = normalize(L + v);
  float w = 0., r1 = r * r;
  vec3 P = C0;
  if (aE.w < .5){
    w = smoothstep(aT.w - .12, aT.w + .12, dot(h, aA.xyz));
    P = C0 + r * h;
  } else {
    vec3 A = aA.xyz, hp = h - A * dot(h, A);
    float lh = length(hp);
    if (lh > 1e-3){
      hp /= lh;
      vec3 e1 = aE.xyz, e2 = cross(A, e1);
      float ph = mod(atan(dot(hp, e2), dot(hp, e1)), 6.2831853);
      float o = ph > aT.w + 1e-4 ? min(ph - aT.w, 6.2831853 - ph) : 0.;
      w = 1. - smoothstep(0., .2, o);
      P = C0 + aA.w * hp + r * h;
      r1 = r * (aA.w + r);
    }
  }
  w *= step(0., dot(h, L)) * step(.005, P.y) * step(.001, dot(E, vec3(1.)));
  vec3 q = P - uC;
  float z = dot(q, uF);
  vec2 ndc = vec2((dot(q, uR) / z - uProj.z) / uProj.x, (dot(q, uU) / z - uProj.w) / uProj.y);
  vec3 c = clamp(uK * (invzF(ndc) - 1. / z) + uCA, -GMAX, GMAX);
  float m0 = max(abs(c.r), max(abs(c.g), abs(c.b)));
  c = sign(c + 1e-4) * sqrt(c * c + 2.6 * 2.6);
  float m = max(abs(c.r), max(abs(c.g), abs(c.b)));
  float hsz = max(m, .7) + 1.5 / uDpr;
  gl_Position = vec4(ndc + aQ * hsz * uDpr * 2. / uRes, 0., 1.);
  float px = uFpx / z;
  /* sharp, the highlight is in the scene itself; the sprite carries only the light the lens spreads out */
  vE = w * r1 * px * px * phys * uGain * smoothstep(2.5, 8., m0);
  vP = aQ * hsz; vCoc = c; vNdc = ndc; vTint = E * aT.rgb;
  /* the window is a broad source: its glint is a small patch, not a point, and its disc has no hard edge */
  vSoft = li == 2 ? .5 : 0.;
}`;

/* ---- dust in the air: motes drifting in a slab of air about the reading line; they are there all the time, but
   only those inside the sheet of light are seen, each a soft speck that brightens as it turns ---- */
const MOTE_VS = HEAD + COMMON + `
in vec2 aQ; in vec4 aM; in vec4 aV;
uniform vec2 uRes; uniform float uDpr, uFpx, uTime;
uniform vec2 uIdx;
out vec2 vP; out vec3 vCoc; out float vE; out vec2 vNdc; out vec3 vTint; out float vSoft;
float wrapf(float v, float a, float b){ return a + mod(v - a, b - a); }
void main(){
  float ph = aV.w;
  vec3 drift = aV.xyz * uTime + vec3(sin(uTime * .061 + ph), .6 * sin(uTime * .047 + ph * 1.7), sin(uTime * .053 + ph * 2.3)) * vec3(.9, .5, .45);
  vec3 W = aM.xyz + drift;
  float x = wrapf(W.x, -10., 10.), y = wrapf(W.y, .1, 3.2), dz = wrapf(W.z, -1.8, 1.8);
  float fade = smoothstep(-10., -8.5, x) * (1. - smoothstep(8.5, 10., x)) * smoothstep(.1, .4, y) * (1. - smoothstep(2.6, 3.2, y))
             * smoothstep(1.8, 1.2, abs(dz));
  vec3 P = vec3(x, y, uIdx.x + uIdx.y * x + dz);
  vec3 q = P - uC;
  float z = dot(q, uF);
  vec2 ndw = vec2((dot(q, uR) / z - uProj.z) / uProj.x, (dot(q, uU) / z - uProj.w) / uProj.y);
  vec3 toCam = normalize(uC - P);
  float g = .55;
  float hgS = .15 + (1. - g * g) / pow(1. + g * g - 2. * g * dot(-uSun, toCam), 1.5) * .25;
  vec3 Ld; float li = lampAt(P, Ld);
  float hgL = .15 + (1. - g * g) / pow(1. + g * g - 2. * g * dot(-Ld, toCam), 1.5) * .25;
  vec3 L = uSunCol * winMask(P) * hgS * .85 + uLampCol * max(li - ${f(LSPILL)} / dot(LAMPP - P, LAMPP - P), 0.) * hgL;
  float tw = .5 + .5 * sin(uTime * (.5 + .6 * fract(ph * 3.7)) + ph * 5.);
  float glint = .35 + 1.3 * pow(tw, 8.);
  vec3 c = clamp(uK * (invzF(ndw) - 1. / z) + uCA * .2, -GMAX, GMAX);
  float sz = max(.014 * uFpx / z, 1.9);
  c = sign(c + 1e-4) * sqrt(c * c + sz * sz);
  float m = max(abs(c.r), max(abs(c.g), abs(c.b)));
  float h = max(m, .7) + 1.5 / uDpr;
  gl_Position = vec4(ndw + aQ * h * uDpr * 2. / uRes, 0., 1.);
  float lum = dot(L, vec3(.3, .5, .2));
  vE = aM.w * glint * fade * step(.0005, lum);
  vP = aQ * h; vCoc = c; vNdc = ndw * 0.; vTint = L; vSoft = 0.;
}`;

const FINAL_FS = HEAD + `
uniform sampler2D uHdr, uGlow; uniform vec2 uRes; uniform float uAspect, uExpo;
out vec4 o;
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec3 x = (texelFetch(uHdr, ip, 0).rgb + texelFetch(uGlow, ip, 0).rgb) * 1.55 * uExpo;
  vec2 q = (gl_FragCoord.xy / uRes - .5) * vec2(uAspect, 1.);
  float r2 = dot(q, q) / (.25 * (uAspect * uAspect + 1.));
  x *= 1. / pow(1. + r2 * .55, 2.);
  vec3 y = x * (2.51 * x + .03) / (x * (2.43 * x + .59) + .14);
  y = pow(clamp(y, 0., 1.), vec3(1. / 2.2));
  float n = h(gl_FragCoord.xy) + h(gl_FragCoord.xy + 71.3) - 1.;
  o = vec4(y + n / 255., 1.);
}`;

const P = {
  down: program(FULL_VS, DOWN_FS),
  gather: program(FULL_VS, GATHER_FS),
  comp: program(FULL_VS, COMP_FS),
  glint: program(GLINT_VS, DISC_FS),
  mote: program(MOTE_VS, DISC_FS),
  final: program(FULL_VS, FINAL_FS)
};
const vao = gl.createVertexArray();

/* ------------------------------------------------------------------ */
/*  The engraving                                                       */
/* ------------------------------------------------------------------ */
const FONT = '"DIN Alternate","DIN Condensed","Avenir Next","Helvetica Neue",Arial,sans-serif';
function scaleTexture(kind) {
  const units = kind === 'h' ? 24 : 60;
  const widthU = kind === 'h' ? STOCK.x1 - STOCK.x0 : kind === 'm' ? TAPE.x1 - TAPE.x0 : SEC.x1 - SEC.x0;
  const maxT = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const D = Math.min(192, Math.floor(maxT / units));
  const W = Math.ceil(widthU * D), H = units * D;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'lighter';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const R = 'rgb(255,0,0)', G = 'rgb(0,255,0)';
  const at = (k, fn) => { for (const w of [-H, 0, H]) fn((units - k) * D + w); };
  const tick = (col, x0, x1, y, th) => { x.fillStyle = col; x.fillRect(x0 * D, y - th * D / 2, (x1 - x0) * D, th * D); };
  const text = (col, s, cx, y, size, weight = 500) => {
    x.fillStyle = col; x.font = `${weight} ${Math.round(size * D)}px ${FONT}`;
    x.fillText(s, cx * D, y + size * D * 0.04);
  };
  if (kind === 'h') {
    for (let k = 0; k < 24; k++) at(k, y => {
      tick(R, widthU - 0.62, widthU - 0.03, y, 0.034);
      text(R, String(k), 1.10, y, 0.74);
      if (k >= 12) text(G, String(k === 12 ? 12 : k - 12), 0.30, y, 0.34);
    });
    for (let k = 0; k < 24; k++) for (let j = 1; j < 6; j++) at(k + j / 6, y => tick(R, widthU - (j === 3 ? 0.40 : 0.24), widthU - 0.03, y, 0.022));
  } else if (kind === 'm') {
    for (let k = 0; k < 60; k++) at(k, y => {
      tick(k % 5 ? R : G, 0.03, 0.62, y, 0.034);
      text(k % 5 ? R : G, pad(k), 1.26, y, 0.70);
    });
    for (let k = 0; k < 60; k++) for (let j = 1; j < 4; j++) at(k + j / 4, y => tick(R, 0.03, j === 2 ? 0.36 : 0.22, y, 0.02));
  } else {
    /* the seconds: a fine tick at each second (longer every five), a shorter one at each half, small figures */
    for (let k = 0; k < 60; k++) at(k, y => {
      tick(R, 0.03, k % 5 ? 0.22 : 0.30, y, 0.024);
      text(R, pad(k), 0.62, y, 0.42);
    });
    for (let k = 0; k < 60; k++) at(k + 0.5, y => tick(R, 0.03, 0.13, y, 0.018));
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return tex;
}
const hourTex = scaleTexture('h'), minTex = scaleTexture('m'), secTex = scaleTexture('s');

/* ------------------------------------------------------------------ */
/*  The desk's program and its glints; the dust                         */
/* ------------------------------------------------------------------ */
const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
function instanced(prog, data, attrs, divisor = 1) {
  const va = gl.createVertexArray();
  gl.bindVertexArray(va);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  let loc = gl.getAttribLocation(prog.p, 'aQ');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.length ? data : [0]), gl.STATIC_DRAW);
  const stride = attrs.length * 16;
  attrs.forEach((name, i) => {
    loc = gl.getAttribLocation(prog.p, name);
    if (loc < 0) return;
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, i * 16); gl.vertexAttribDivisor(loc, divisor);
  });
  gl.bindVertexArray(null);
  return { va, buf };
}

let desk = [], sceneP = null, glintVao = null, NG = 0;
function buildDesk() {
  desk = arrange(sceneSeed);
  const next = program(FULL_VS, sceneFS(desk));
  if (sceneP) gl.deleteProgram(sceneP.p);
  sceneP = next;
  /* the glint candidates, carried into the room */
  const data = [];
  for (const o of desk) {
    const c = Math.cos(o.rot), s = Math.sin(o.rot);
    const V = a => [c * a[0] - s * a[2], a[1], s * a[0] + c * a[2]];
    for (const g of o.glints) {
      const p = V(g.c);
      data.push(p[0] + o.x, p[1], p[2] + o.z, g.r, ...V(g.A), g.R, ...V(g.e1), g.k, ...g.tint, g.k ? g.sw : g.minCos);
    }
  }
  if (glintVao) { gl.deleteVertexArray(glintVao.va); gl.deleteBuffer(glintVao.buf); }
  glintVao = instanced(P.glint, data, ['aG', 'aA', 'aE', 'aT'], 3);
  NG = data.length / 16;
  canvas.dataset.seed = sceneSeed;
  canvas.dataset.desk = desk.map(o => o.kind).join(' ');
  dirty = true;
}

/* the dust: motes in a slab of air about the reading line (most of them out of the light at any moment) */
let mseed = 31;
const rnd = () => { mseed = (mseed * 16807) % 2147483647; return (mseed - 1) / 2147483646; };
const motes = [];
const NM = 70, NM_STILL = 24;
for (let i = 0; i < NM; i++) {
  const e = MOTE_E * (0.25 + 0.75 * Math.pow(rnd(), 2.5));
  motes.push(rnd() * 20 - 10, 0.1 + rnd() * 3.1, rnd() * 3.6 - 1.8, e,
             (rnd() - 0.5) * 0.10, 0.008 + rnd() * 0.02, (rnd() - 0.5) * 0.05, rnd() * 100);
}
const moteVao = instanced(P.mote, motes, ['aM', 'aV']).va;

/* ------------------------------------------------------------------ */
/*  Targets                                                             */
/* ------------------------------------------------------------------ */
function target(w, h, mip) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const levels = mip ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA16F, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb, w, h };
}
let T = null, W = 0, H = 0, dpr = 1, cssW = 0, cssH = 0;
const cam = {};
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cssW = Math.max(1, window.innerWidth); cssH = Math.max(1, window.innerHeight);
  W = Math.round(cssW * dpr); H = Math.round(cssH * dpr);
  canvas.width = W; canvas.height = H;
  if (T) for (const k in T) { gl.deleteTexture(T[k].tex); gl.deleteFramebuffer(T[k].fb); }
  const sw = Math.max(1, Math.round(cssW / 2)), sh = Math.max(1, Math.round(cssH / 2));
  T = { scene: target(W, H, true), small: target(sw, sh, true), blur: target(sw, sh, false), hdr: target(W, H, false), glow: target(W, H, false) };
  fitCamera();
  dirty = true;
}

function fitCamera() {
  const F = [Math.sin(YAW) * Math.cos(ELEV), -Math.sin(ELEV), Math.cos(YAW) * Math.cos(ELEV)];
  const tgt = [0, STOCK.top, (FRAME_NEAR + FRAME_FAR) / 2 + AIMZ];
  const C = sub(tgt, F.map(v => v * DIST));
  const R0 = norm(cross([0, 1, 0], F)), U0 = cross(F, R0);
  const cr = Math.cos(ROLL), sr = Math.sin(ROLL);
  const R = R0.map((v, i) => v * cr + U0[i] * sr), U = U0.map((v, i) => v * cr - R0[i] * sr);
  const proj = p => { const q = sub(p, C), z = dot(q, F); return [dot(q, R) / z, dot(q, U) / z]; };
  const yn = proj([0, STOCK.top, FRAME_NEAR])[1], yf = proj([0, STOCK.top, FRAME_FAR])[1];
  const aspect = cssW / cssH;
  let tanY = (yf - yn) / 2, sy = (yf + yn) / 2;
  const need = Math.abs(proj([STOCK.x0 - 0.4, 0, FRAME_NEAR + 2])[0]) / 0.94;
  tanY = Math.max(tanY, need / aspect) * ZOOM;
  Object.assign(cam, { C, F, R, U, tanY, tanX: tanY * aspect, sx: 0, sy });
  cam.fpx = cssH / (2 * tanY);
}

/* ------------------------------------------------------------------ */
/*  Drawing                                                             */
/* ------------------------------------------------------------------ */
function setCommon(u, s) {
  gl.uniform3fv(u.uC, cam.C); gl.uniform3fv(u.uR, cam.R); gl.uniform3fv(u.uU, cam.U); gl.uniform3fv(u.uF, cam.F);
  gl.uniform4f(u.uProj, cam.tanX * s.br, cam.tanY * s.br, cam.sx, cam.sy * s.br);
  gl.uniform1f(u.uK, s.K); gl.uniform3fv(u.uFoc, s.foc); gl.uniform3fv(u.uCA, CA);
  const L = s.L;
  if (u.uSun) gl.uniform3fv(u.uSun, L.sun);
  if (u.uSunCol) gl.uniform3fv(u.uSunCol, L.sunCol);
  if (u.uSkyCol) gl.uniform3fv(u.uSkyCol, L.skyCol);
  if (u.uLampCol) gl.uniform3fv(u.uLampCol, L.lampCol);
  if (u.uRoom) gl.uniform1f(u.uRoom, L.room);
  if (u.uBeam) gl.uniform3fv(u.uBeam, L.beam);
  if (u.uBounce) gl.uniform3fv(u.uBounce, L.bounce);
}
function bindTex(unit, tex, u) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u, unit); }

let last = null, lastFull = null, lastDraw = -1e9;
const t0 = performance.now();
const moteEpoch = frozen !== null ? 400 : (Date.now() / 1000) % 20000;
function frame(now) {
  requestAnimationFrame(frame);
  /* about 30 frames a second is enough for the strip's glide; the GPU rests in between */
  if (now - lastDraw < 1000 / FPS - 4) return;
  /* the playground's clock runs on at its speed */
  if (play.on && play.t !== null) play.t = (play.t + Math.min(0.25, (now - lastDraw) / 1000) * play.speed) % 86400;
  lastDraw = now;
  const T_ = secondsNow();
  const fast = play.on && play.t !== null && play.speed >= 60;
  lightStretch = fast ? play.speed / 6 : 1;
  const st = timeState(T_, fast);
  const L = dayLight(T_);
  /* the scales slide so the figures of now stand in the line of light: z = z0 + k x at each one's middle */
  const lineZ = x => L.idx.z0 + L.idx.k * x;
  const zS = lineZ((STOCK.x0 + STOCK.x1) / 2), zT = lineZ((TAPE.x0 + TAPE.x1) / 2), zU = lineZ((SEC.x0 + SEC.x1) / 2);
  const offH = st.H - zS;
  const off = st.mEff - zT;
  const offS = st.sEff - zU;
  /* the lens: focused once; the blur radius is half the aperture's image */
  const br = 1;
  const A = 25 / fNumber;
  const K = 0.5 * A * cam.fpx / br;
  const foc = focusPlane(1 / Math.tan(ELEV));
  const s = { K, foc, invzF: foc[0] + foc[2], off, offH, offS, br, L };
  const key = pad(st.hh) + ':' + pad(st.mm);
  if (tmText.textContent !== key) { tmText.textContent = key; canvas.setAttribute('aria-label', key); }
  const lightMoved = !lastFull || Math.abs(lastFull.L.h - L.h) > 1 / 240 || Math.abs(lastFull.L.lamp - L.lamp) > 0.004
    || Math.abs(lastFull.L.idx.z0 - L.idx.z0) > 0.0015 || Math.abs(lastFull.L.beam[0] - L.beam[0]) > 0.0015;
  const full = dirty || !lastFull || lightMoved || Math.abs(lastFull.offH - offH) >= 0.0015 || Math.abs(lastFull.invzF - s.invzF) >= 1e-7;
  let drew = true;
  if (full) { dirty = false; lastFull = s; last = s; drawScene(s, null); }
  else if (Math.abs(last.off - off) > 1e-5 || Math.abs(last.offS - offS) > 1e-5) {
    /* only the tape and the strip have moved: their column is drawn again, with the reach of the blur about it */
    s.L = lastFull.L; last = s; drawScene(s, column(s));
  } else drew = false;
  /* the dust drifts on every frame; with reduced motion it stands still, and a still frame is not drawn again */
  if (drew || !still) drawLight(last, still ? 0 : (performance.now() - t0) / 1000);
  if (!started) { started = true; tmBox.classList.add('on'); }
  if (pgOpen) updatePlayground(T_);
}
/* the plane of focus y - sl z = const through FOCUS (sl, its slope against the desk, makes it square to the lens),
   as 1 / depth along the ray through ndc (linear in ndc) */
function focusPlane(sl) {
  const n = [0, 1, -sl], D = FOCUS[0] - sl * (FOCUS[1] + focusDz) - dot(n, cam.C);
  return [(dot(n, cam.F) + cam.sx * dot(n, cam.R) + cam.sy * dot(n, cam.U)) / D, cam.tanX * dot(n, cam.R) / D, cam.tanY * dot(n, cam.U) / D];
}
/* the columns of device pixels the tape and the strip cover (x0, x1), for the scene; with the blur's reach, for the rest */
function column(s) {
  let lo = Infinity, hi = -Infinity;
  for (const x of [TAPE.x0, SEC.x1]) for (const y of [0, STOCK.top]) for (const z of [-4, 18]) {
    const q = sub([x, y, z], cam.C), zz = dot(q, cam.F);
    const nx = (dot(q, cam.R) / zz - cam.sx) / (cam.tanX * s.br);
    const px = (nx * 0.5 + 0.5) * W;
    lo = Math.min(lo, px); hi = Math.max(hi, px);
  }
  const reach = (CMAX + 10) * dpr;
  return { x0: Math.max(0, Math.floor(lo - 2)), x1: Math.min(W, Math.ceil(hi + 2)),
           b0: Math.max(0, Math.floor(lo - 2 - reach)), b1: Math.min(W, Math.ceil(hi + 2 + reach)) };
}
function scissor(on, x0, x1, h, scale = 1) {
  if (!on) { gl.disable(gl.SCISSOR_TEST); return; }
  gl.enable(gl.SCISSOR_TEST);
  const a = Math.floor(x0 * scale), b = Math.ceil(x1 * scale);
  gl.scissor(a, 0, Math.max(0, b - a), h);
}

function drawScene(s, col) {
  gl.bindVertexArray(vao);
  gl.disable(gl.BLEND);
  const part = !!col;
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.scene.fb); gl.viewport(0, 0, W, H);
  scissor(part, part && col.x0, part && col.x1, H);
  let u = sceneP.u; gl.useProgram(sceneP.p); setCommon(u, s);
  gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uOff, s.off); gl.uniform1f(u.uOffH, s.offH); gl.uniform1f(u.uOffS, s.offS);
  bindTex(0, hourTex, u.uHourTex); bindTex(1, minTex, u.uMinTex); bindTex(2, secTex, u.uSecTex);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  scissor(false);
  gl.bindTexture(gl.TEXTURE_2D, T.scene.tex); gl.generateMipmap(gl.TEXTURE_2D);
  const ks = T.small.w / W;
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.small.fb); gl.viewport(0, 0, T.small.w, T.small.h);
  scissor(part, part && col.x0 - 4, part && col.x1 + 4, T.small.h, ks);
  u = P.down.u; gl.useProgram(P.down.p);
  gl.uniform2f(u.uSrcRes, W, H); gl.uniform2f(u.uDstRes, T.small.w, T.small.h);
  bindTex(0, T.scene.tex, u.uSrc);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  scissor(false);
  gl.bindTexture(gl.TEXTURE_2D, T.small.tex); gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.blur.fb); gl.viewport(0, 0, T.blur.w, T.blur.h);
  scissor(part, part && col.b0, part && col.b1, T.blur.h, ks);
  u = P.gather.u; gl.useProgram(P.gather.p); setCommon(u, s);
  gl.uniform2f(u.uSRes, T.small.w, T.small.h);
  bindTex(0, T.small.tex, u.uSmall);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.hdr.fb); gl.viewport(0, 0, W, H);
  scissor(part, part && col.b0, part && col.b1, H);
  u = P.comp.u; gl.useProgram(P.comp.p); setCommon(u, s);
  gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uDpr, dpr);
  bindTex(0, T.scene.tex, u.uScene); bindTex(1, T.blur.tex, u.uBlur);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  scissor(false);
}
function discUniforms(u) {
  gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uFpx, cam.fpx);
  gl.uniform1f(u.uAspect, cssW / cssH); gl.uniform1f(u.uCat, 0.40); gl.uniform1f(u.uBlades, 9); gl.uniform1f(u.uRound, 0.55);
}
function drawLight(s, time) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, T.glow.fb); gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  if (NG) {
    gl.bindVertexArray(glintVao.va);
    const u = P.glint.u; gl.useProgram(P.glint.p); setCommon(u, s); discUniforms(u);
    gl.uniform1f(u.uGain, GLINT);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, NG * 3);
  }
  /* the dust */
  {
    gl.bindVertexArray(moteVao);
    const u = P.mote.u; gl.useProgram(P.mote.p); setCommon(u, s); discUniforms(u);
    gl.uniform1f(u.uTime, time + moteEpoch);
    const ml = s.L.lamp > 0.5 || s.L.sunCol[0] < 0.02 ? [Z_NIGHT, LAMP_K] : [s.L.beam[0], s.L.beam[1]];
    gl.uniform2f(u.uIdx, ml[0], ml[1]);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, still ? NM_STILL : NM);
  }
  gl.disable(gl.BLEND);
  gl.bindVertexArray(vao);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
  const u = P.final.u; gl.useProgram(P.final.p);
  gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uAspect, cssW / cssH); gl.uniform1f(u.uExpo, s.L.expo);
  bindTex(0, T.hdr.tex, u.uHdr); bindTex(1, T.glow.tex, u.uGlow);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ------------------------------------------------------------------ */
/*  The playground: the day's time, and the camera                     */
/* ------------------------------------------------------------------ */
/* The faint ring in the lower right (aria-label "playground"), the G key or #gui open a bar: the time of day to
   scrub or play (x1 to x3600) with a button back to now, and the camera and lens. The camera is kept for the next
   tabs (localStorage, VIEW_KEY); the time is not: closing the bar goes back to the real time. */
const UI_LANG = (window.chrome && chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || navigator.language || '';
const JA = /^ja\b/i.test(UI_LANG);
const TX = JA
  ? { play: '再生', pause: '一時停止', speed: '速さ', time: '時刻', now: '現在', nowT: 'いまの時刻に戻す', reset: '元に戻す', resetT: 'カメラを最初の設定に戻す',
      elev: '角度', yaw: '向き', roll: '傾き', dist: '距離', zoom: '画角', aim: '位置', f: '絞り', focus: 'ピント', bar: 'プレイグラウンド' }
  : { play: 'Play', pause: 'Pause', speed: 'Speed', time: 'Time of day', now: 'now', nowT: 'Back to the current time', reset: 'reset', resetT: 'Back to the first camera',
      elev: 'angle', yaw: 'yaw', roll: 'roll', dist: 'distance', zoom: 'zoom', aim: 'aim', f: 'f-stop', focus: 'focus', bar: 'Playground' };
/* the f-stop slider moves in stops */
const F_STEPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const fToS = fn => { let i = 0; while (i < F_STEPS.length - 2 && F_STEPS[i + 1] <= fn) i++; return i + Math.log(fn / F_STEPS[i]) / Math.log(F_STEPS[i + 1] / F_STEPS[i]); };
const sToF = v => { const i = Math.min(F_STEPS.length - 2, Math.floor(v)); return F_STEPS[i] * Math.pow(F_STEPS[i + 1] / F_STEPS[i], v - i); };
const sgn = (x, d) => (x < 0 ? '−' : x > 0 && d !== undefined ? '+' : '') + Math.abs(x).toFixed(d || 0);
const CAM = [
  ['elev', v => v.toFixed(0) + '°'], ['yaw', v => sgn(v) + '°'], ['roll', v => sgn(v) + '°'], ['dist', v => v.toFixed(0)],
  ['zoom', v => v.toFixed(2) + '×'], ['aim', v => sgn(v, 1)], ['f', v => 'f/' + v.toFixed(1)], ['focus', v => sgn(v, 2)]
];
const pgBtn = document.getElementById('pg');
let pgOpen = false, pgBar = null, pgEls = null, pgDrag = false, pgLastUi = 0;
function buildPlayground() {
  const st = document.createElement('style');
  st.textContent = `
#sl-pg{position:fixed;left:16px;right:56px;bottom:16px;display:none;flex-direction:column;gap:10px;padding:10px 12px;
  background:rgba(20,22,26,.72);color:#eee;font:12px/1 -apple-system,BlinkMacSystemFont,"Helvetica Neue","Hiragino Sans",sans-serif;
  border-radius:10px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:10;user-select:none}
#sl-pg.on{display:flex}
#sl-pg .row{display:flex;align-items:center;gap:10px}
#sl-pg button,#sl-pg select{background:rgba(255,255,255,.12);color:#eee;border:1px solid rgba(255,255,255,.2);border-radius:6px;
  font:inherit;padding:5px 9px;cursor:pointer}
#sl-pg button:hover,#sl-pg select:hover{background:rgba(255,255,255,.22)}
#sl-pg button[data-k=play]{min-width:32px}
#sl-pg button.off{background:rgba(255,226,180,.85);border-color:rgba(255,226,180,.9);color:#1b1815}   /* the time is not now */
#sl-pg button:focus-visible,#sl-pg select:focus-visible,#sl-pg input:focus-visible{outline:2px solid #fff;outline-offset:1px}
#sl-pg .lbl{font-variant-numeric:tabular-nums;min-width:40px;text-align:right;font-size:13px}
#sl-pg .trk{position:relative;flex:1;height:26px;min-width:120px}
#sl-pg .trk canvas{position:absolute;left:0;right:0;top:12px;width:100%;height:10px;border-radius:5px}
#sl-pg .ticks{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;font-size:9px;opacity:.65;pointer-events:none}
#sl-pg input[type=range]{width:100%;height:18px;margin:0;background:transparent;-webkit-appearance:none;appearance:none}
#sl-pg .trk input[type=range]{position:absolute;left:0;right:0;top:8px}
#sl-pg input[type=range]::-webkit-slider-runnable-track{height:18px;background:transparent}
#sl-pg .cam input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(rgba(255,255,255,.28),rgba(255,255,255,.28)) center/100% 2px no-repeat}
#sl-pg input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:4px;height:18px;background:#fff;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.45)}
#sl-pg .cam{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto;gap:6px 18px;align-items:center}
#sl-pg .cam label{display:grid;grid-template-columns:4.6em minmax(40px,1fr) 3.6em;gap:8px;align-items:center}
#sl-pg .cam label span{opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sl-pg .cam b{font-weight:400;font-variant-numeric:tabular-nums;text-align:right}
#sl-pg .cam button{grid-column:5;grid-row:1 / span 2}
@media (max-width:860px){#sl-pg .cam{grid-template-columns:repeat(2,minmax(0,1fr))} #sl-pg .cam button{grid-column:auto;grid-row:auto;justify-self:start}}`;
  document.head.appendChild(st);
  const bar = document.createElement('div');
  bar.id = 'sl-pg'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', TX.bar);
  const speeds = [1, 10, 60, 600, 3600].map(v => `<option value="${v}">×${v}</option>`).join('');
  bar.innerHTML = `<div class="row"><button type="button" data-k="play" title="${TX.play}" aria-label="${TX.play}">▶</button>` +
    `<select data-k="speed" title="${TX.speed}" aria-label="${TX.speed}">${speeds}</select>` +
    '<div class="trk"><div class="ticks"><span>0</span><span>3</span><span>6</span><span>9</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span></div>' +
    `<canvas width="576" height="10"></canvas><input data-k="time" type="range" min="0" max="1439" step="1" aria-label="${TX.time}"></div>` +
    '<span class="lbl" data-k="label">--:--</span>' +
    `<button type="button" data-k="now" title="${TX.nowT}">${TX.now}</button></div>` +
    '<div class="cam">' + CAM.map(([k]) => {
      const [lo, hi, step] = k === 'f' ? [0, F_STEPS.length - 1, 0.05] : RANGE[k];
      return `<label><span>${TX[k]}</span><input type="range" data-c="${k}" min="${lo}" max="${hi}" step="${step}"><b data-v="${k}"></b></label>`;
    }).join('') + `<button type="button" data-k="reset" title="${TX.resetT}">${TX.reset}</button></div>`;
  document.body.appendChild(bar);
  const q = k => bar.querySelector(`[data-k="${k}"]`);
  pgEls = { play: q('play'), speed: q('speed'), time: q('time'), label: q('label'), now: q('now'), track: bar.querySelector('canvas'), cam: {} };
  for (const [k, show] of CAM) pgEls.cam[k] = { inp: bar.querySelector(`[data-c="${k}"]`), out: bar.querySelector(`[data-v="${k}"]`), show };
  pgEls.speed.value = String(play.speed);
  pgEls.play.addEventListener('click', () => {
    if (play.t === null) play.t = secondsNow();
    play.on = !play.on;
    updatePlayground(secondsNow(), true);
  });
  pgEls.speed.addEventListener('change', () => { play.speed = +pgEls.speed.value; });
  pgEls.time.addEventListener('input', () => { play.t = +pgEls.time.value * 60; pgDrag = true; });
  pgEls.time.addEventListener('change', () => { pgDrag = false; });
  pgEls.now.addEventListener('click', () => { play.t = null; play.on = false; updatePlayground(secondsNow(), true); });
  for (const k in pgEls.cam) {
    const c = pgEls.cam[k];
    c.inp.addEventListener('input', () => {
      view[k] = k === 'f' ? sToF(+c.inp.value) : +c.inp.value;
      applyView(); fitCamera(); dirty = true; showCam();
    });
    c.inp.addEventListener('change', saveView);
  }
  q('reset').addEventListener('click', () => { Object.assign(view, VIEW0); applyView(); fitCamera(); dirty = true; saveView(); showCam(true); });
  drawTrack();
  showCam(true);
  pgBar = bar;
}
function showCam(sliders) {
  for (const k in pgEls.cam) {
    const c = pgEls.cam[k];
    if (sliders) c.inp.value = String(k === 'f' ? fToS(view[k]) : view[k]);
    c.out.textContent = c.show(view[k]);
  }
}
/* the track: the colour of the day's light, hour by hour */
function drawTrack() {
  const cv = pgEls.track, c2 = cv.getContext('2d');
  for (let x = 0; x < cv.width; x++) {
    const L = dayLight(x / cv.width * 86400);
    const c = [0, 1, 2].map(j => {
      const e = L.sunCol[j] * 0.16 + L.skyCol[j] * 6 + L.lampCol[j] / 330 * [0.30, 0.19, 0.11][j] * L.lamp;
      return Math.round(255 * Math.pow(Math.min(1, e * 0.9), 1 / 2.2));
    });
    c2.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    c2.fillRect(x, 0, 1, cv.height);
  }
}
function updatePlayground(T, force) {
  const t = performance.now();
  if (!force && t - pgLastUi < 80) return;
  pgLastUi = t;
  const M = Math.floor(((T % 86400) + 86400) % 86400 / 60);
  if (!pgDrag) pgEls.time.value = String(M);
  pgEls.label.textContent = pad(Math.floor(M / 60)) + ':' + pad(M % 60);
  const ps = play.on ? TX.pause : TX.play;
  pgEls.play.textContent = play.on ? '❚❚' : '▶';
  if (pgEls.play.title !== ps) { pgEls.play.title = ps; pgEls.play.setAttribute('aria-label', ps); }
  pgEls.now.classList.toggle('off', play.t !== null);
}
function setPlayground(on) {
  if (on === pgOpen) return;
  pgOpen = on;
  if (!pgBar) buildPlayground();
  pgBar.classList.toggle('on', on);
  tmBox.style.visibility = on ? 'hidden' : '';          /* the bar has its own time */
  if (!on) { play.t = null; play.on = false; }        /* the playground's time ends with it */
  else updatePlayground(secondsNow(), true);
  pgBtn.setAttribute('aria-expanded', String(on));
  dirty = true;
}
pgBtn.addEventListener('click', () => setPlayground(!pgOpen));
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'g' || e.key === 'G') setPlayground(!pgOpen);
  else if (e.key === 'Escape' && pgOpen) setPlayground(false);
});

let rt = 0;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 60); });
canvas.addEventListener('webglcontextlost', e => e.preventDefault());
canvas.addEventListener('webglcontextrestored', () => location.reload());
resize();
buildDesk();
ready = true;
if (/gui/.test(location.hash)) setPlayground(true);
requestAnimationFrame(frame);

})();
