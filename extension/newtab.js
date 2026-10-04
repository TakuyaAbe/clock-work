(() => {
'use strict';
const INK = '#151515', ACC = '#ff4a1c', BG = '#f0eee9';
const TAU = Math.PI * 2, HPI = Math.PI / 2;
const RAW = {
  0:['01110','10001','10001','10001','10001','10001','01110'],
  1:['00100','01100','00100','00100','00100','00100','01110'],
  2:['01110','10001','00001','00010','00100','01000','11111'],
  3:['11111','00010','00100','00010','00001','10001','01110'],
  4:['00010','00110','01010','10010','11111','00010','00010'],
  5:['11111','10000','11110','00001','00001','10001','01110'],
  6:['00110','01000','10000','11110','10001','10001','01110'],
  7:['11111','00001','00010','00100','01000','01000','01000'],
  8:['01110','10001','10001','01110','10001','10001','01110'],
  9:['01110','10001','10001','01111','00001','00010','01100']
};
const GLYPH = {};
for (const k in RAW) GLYPH[k] = RAW[k].join('').split('').map(ch => ch === '1');

/* accent -> ink ramp for freshly landed tiles (precomputed: no per-frame strings) */
const HOTC = [];
for (let i = 0; i <= 16; i++) {
  const u = i / 16, mix = (a, b) => Math.round(a + (b - a) * u);
  HOTC.push(`rgb(${mix(21, 255)},${mix(21, 74)},${mix(21, 28)})`);
}
const FONT_LABEL = '500 9px "Helvetica Neue", Helvetica, Arial, sans-serif', LS_LABEL = '1.4px';
const FONT_RULER = '500 8px "Helvetica Neue", Helvetica, Arial, sans-serif', LS_RULER = '1.3px';
const LABELS = ['HOURS', 'MINUTES', 'SECONDS'];
const RULER_LABELS = ['00', '15', '30', '45'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PILE_A = 0.3;           // pile outline alpha (secondary layer)
const LEAD = 0.75;            // seconds before the boundary that a seconds change starts
const FLY = 0.5;              // flight time of an incoming tile

const cv = document.getElementById('c');
const ctx = cv.getContext('2d', { alpha: false });
const HAS_LS = 'letterSpacing' in ctx;
const $date = document.getElementById('date'), $tz = document.getElementById('tz'), $sr = document.getElementById('sr');
const rootStyle = document.documentElement.style;

let W = 0, H = 0, DPR = 1, P = 20, TS = 16, GRAV = 2400, portrait = false;
let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
let rulerX0 = 0, rulerX1 = 0, rulerY = 0, rp = 1;
let floorY = 0, floorX0 = 0, floorX1 = 0, floorK = 0, cols = 0, maxH = 8;
let stacks = [];
const guideX = [], guideY = [];
let clock = 0, waveT0 = -99, tenT0 = -99, tenS = 10;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ---------- motion preferences + spring tuning ---------- */
const mqRM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let RM = !!(mqRM && mqRM.matches);
let K, C, KA, CA, KS, CS, KC, CC, KP, CP;
const KF = 42.25, CF = 2 * 0.79 * 6.5;       // flip: ~1 Hz, overshoots 2pi by ~6 deg
function tune() {
  const z = v => RM ? 1 : v;                    // reduced motion: critically damped
  K = 700;  C = 2 * z(0.7) * Math.sqrt(K);      // digit home: crisp, legible
  KA = 500; CA = 2 * z(0.7) * Math.sqrt(KA);    // tile angle
  KS = 1420; CS = 2 * z(0.5) * Math.sqrt(KS);   // squash: ~6 Hz, snappy
  KC = 300; CC = 2 * z(0.85) * Math.sqrt(KC);   // colon: heavy
  KP = 200; CP = 2 * z(0.6) * Math.sqrt(KP);    // pile: soft and slow
}
tune();
if (mqRM) {
  const f = () => { RM = mqRM.matches; tune(); };
  if (mqRM.addEventListener) mqRM.addEventListener('change', f); else if (mqRM.addListener) mqRM.addListener(f);
}
/* time for a flip spring to reach 90 deg: the minute sweep is timed to it */
const T_CROSS = (() => {
  let a = 0, v = 0, t = 0; const h = 1 / 240;
  while (a < HPI && t < 3) { v += (KF * (TAU - a) - CF * v) * h; a += v * h; t += h; }
  return t;
})();

/* ---------- model ---------- */
const mkTile = (r, c) => ({ r, c, hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, sq: 1, vsq: 0,
  alpha: 1, ink: 1, hot: 0, state: 0, on: false, delay: 0, land: 0, wind: -1, nd: 0, below: null, rest: false,
  flip: false, ft: 0, fa: 0, vfa: 0, toOn: false, fromOn: false, crossed: false, wd: 0,
  te: 0, fly: 0, x0: 0, y0: 0, vx0: 0, vy0: 0, g: 0, a0: 0 });
const digits = [];
for (let i = 0; i < 6; i++) {
  const d = { i, val: -1, x: 0, y: 0, u: 0, tiles: [] };
  for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) d.tiles.push(mkTile(r, c));
  d.tiles.forEach(t => { t.below = t.r < 6 ? d.tiles[(t.r + 1) * 5 + t.c] : null; });
  digits.push(d);
}
const colons = [[], []];
for (const cl of colons) for (let k = 0; k < 2; k++)
  cl.push({ hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, sq: 1, vsq: 0, hop: -1, alive: false, delay: 0 });
const debris = [], pool = [];
const trap = { v: 0, vel: 0, target: 0, closeAt: 0 };
const mk = { x: 0, v: 0, tx: 0, s: 0, c: 22 };
const ring = { x: -1e4, y: -1e4, r: 0 };

/* ---------- layout ---------- */
const markerX = s => rulerX0 + s * rp;
const colX = c => floorX0 + (c + 0.5) * P;
const colOf = x => clamp(Math.floor((x - floorX0) / P), 0, cols - 1);
const trapShut = () => trap.target === 0 && trap.v < 0.04;

function layout() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.max(1, Math.round(W * DPR)); cv.height = Math.max(1, Math.round(H * DPR));
  const M = W < 600 ? 16 : 28;
  // pick the arrangement that makes the clock meaningfully larger
  const Pl = Math.max(6, Math.floor(Math.min((W - 2 * M) * 0.84 / 41, (H - 150) / 20.2, H * 0.34 / 7)));
  const Pp = Math.max(6, Math.floor(Math.min((W - 2 * M) / 11, (H - 150) / 36.8)));
  portrait = Pp >= Pl * 1.75;
  P = portrait ? Pp : Pl;
  let dpos, floorIdeal;
  guideX.length = 0; guideY.length = 0;
  if (!portrait) {
    bx0 = Math.round((W - 41 * P) / 2); bx1 = bx0 + 41 * P;
    // digits sit at the optical centre of the tab (a touch above the geometric middle)
    by0 = Math.max(72, Math.round(H * 0.47 - 3.5 * P)); by1 = by0 + 7 * P;
    dpos = [0, 6, 15, 21, 30, 36].map(u => ({ u, x: bx0 + u * P, y: by0, g: 0 }));
    for (const u of [0, 11, 15, 26, 30, 41]) guideX.push(bx0 + u * P);
    guideY.push(by0, by1);
    [12.5, 27.5].forEach((u, k) => colons[k].forEach((t, j) => {
      t.hx = bx0 + (u + 0.5) * P; t.hy = by0 + (j ? 4.5 : 2.5) * P; t.alive = true;
    }));
    rulerY = by1 + Math.round(2.2 * P); floorIdeal = rulerY + 11 * P;
  } else {
    bx0 = Math.round((W - 11 * P) / 2); bx1 = bx0 + 11 * P;
    by0 = Math.max(72, Math.round(H * 0.47 - 13.5 * P)); by1 = by0 + 27 * P;
    dpos = [0, 1, 2, 3, 4, 5].map(i => ({ u: (i & 1) * 6, x: bx0 + (i & 1) * 6 * P, y: by0 + (i >> 1) * 10 * P, g: i >> 1 }));
    guideX.push(bx0, bx1);
    for (let g = 0; g < 3; g++) guideY.push(by0 + g * 10 * P, by0 + g * 10 * P + 7 * P);
    colons.forEach(cl => cl.forEach(t => { t.alive = false; }));
    rulerY = by1 + Math.round(1.8 * P); floorIdeal = rulerY + 8 * P;
  }
  TS = Math.max(3, Math.round(P * 0.8 * DPR) / DPR);     // whole device pixels
  GRAV = P * 120;
  rp = (bx1 - bx0) / 60;                    // 60 intervals: the 0 and 60 ticks sit on the clock's edge guides
  rulerX0 = bx0; rulerX1 = bx1;
  floorY = Math.round(Math.min(floorIdeal, H - Math.max(54, H * 0.075)) * DPR) / DPR;
  maxH = Math.max(2, Math.floor((floorY - rulerY - 2.5 * P) / P));
  // floor sits on the digit lattice
  floorK = Math.max(0, Math.floor((bx0 - M) / P));
  floorX0 = bx0 - floorK * P; floorX1 = bx1 + floorK * P; cols = (portrait ? 11 : 41) + 2 * floorK;

  digits.forEach((d, i) => {
    const p = dpos[i]; d.x = p.x; d.y = p.y; d.u = p.u;
    for (const t of d.tiles) {
      t.hx = p.x + (t.c + 0.5) * P; t.hy = p.y + (t.r + 0.5) * P;
      t.wd = portrait ? 0.1 + (p.g * 7 + t.r) * 0.03 + t.c * 0.012 + (i & 1) * 0.06
                      : 0.1 + (p.u + t.c) * 0.022 + t.r * 0.012;
      t.rest = false;                                     // spring to new home
    }
  });
  colons.forEach(cl => cl.forEach(t => { t.x = t.hx; t.y = t.delay > 0 ? -2 * P : t.hy; t.vx = t.vy = 0; }));
  // keep the pile: re-drop it onto the new floor
  for (const o of debris) {
    if (o.dead) continue;
    if (o.state === 'pile' || o.state === 'slide') {
      o.state = 'fall'; o.passed = false; o.bounces = 0; o.rest = false;
      o.x = clamp(o.x, floorX0 + P / 2, floorX1 - P / 2); o.y = Math.min(o.y, floorY - P);
      o.vx = 0; o.vy = 0;
    }
  }
  stacks = [];
  for (let c = 0; c < cols; c++) stacks.push([]);
  mk.tx = markerX(mk.s); mk.x = mk.tx; mk.v = 0;
  // corner UI sits on the clock edges, or on the floor edges when the clock is too narrow for it
  const wide = bx1 - bx0 >= 400;
  rootStyle.setProperty('--gx0', (wide ? bx0 : floorX0) + 'px');
  rootStyle.setProperty('--gx1', (W - (wide ? bx1 : floorX1)) + 'px');
}

/* ---------- audio ---------- */
let AC = null, master = null, noiseBuf = null, soundOn = false, lastTap = 0;
const quiet = p => { if (p && p.catch) p.catch(() => {}); };
function ensureAudio() {
  if (!AC) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    AC = new Ctor();
    master = AC.createGain(); master.gain.value = 0.9;
    const comp = AC.createDynamicsCompressor();
    master.connect(comp); comp.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.12), AC.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
  }
  if (AC.state === 'suspended') quiet(AC.resume());
  return true;
}
function noiseHit(t, freq, q, gain, dec) {
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + dec + 0.02);
}
function tone(t, f, gain, dec, type) {
  const o = AC.createOscillator(); o.type = type || 'sine'; o.frequency.value = f;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dec + 0.05);
}
const audible = () => soundOn && AC && AC.state === 'running';
function sTick(odd) {
  if (!audible()) return;
  const t = AC.currentTime + 0.005;
  noiseHit(t, odd ? 4200 : 3300, 7, 0.16, 0.04);
  tone(t, odd ? 1900 : 1500, 0.035, 0.03);
}
function sTen() {
  if (!audible()) return;
  const t = AC.currentTime + 0.005;
  noiseHit(t, 2600, 6, 0.2, 0.05); tone(t, 988, 0.05, 0.12);
  noiseHit(t + 0.06, 3600, 7, 0.1, 0.03);
}
// Landing taps share a small budget so a burst of tiles reads as a few clicks, not a rattle:
// at most 3 in a row, refilled at 8 per second, at least 60 ms apart, and none during the intro.
let tapTokens = 3;
function sTap(vol) {
  if (!audible() || clock < introUntil) return;
  tapTokens = Math.min(3, tapTokens + (clock - lastTap) * 8);
  if (tapTokens < 1 || clock - lastTap < 0.06) return;
  tapTokens -= 1; lastTap = clock;
  noiseHit(AC.currentTime + 0.002, rnd(1800, 5200), 9, 0.02 + 0.03 * Math.min(1, vol), 0.022);
}
function sChime() {
  if (!audible()) return;
  const t = AC.currentTime + 0.02;
  tone(t, 1318.5, 0.05, 1.8); tone(t + 0.11, 1975.5, 0.035, 1.6); tone(t + 0.11, 659.25, 0.02, 1.2, 'triangle');
}
const $snd = document.getElementById('snd');
$snd.addEventListener('click', e => {
  e.stopPropagation();
  soundOn = !soundOn;
  if (soundOn) {
    if (!ensureAudio()) soundOn = false;
    else { const t = AC.currentTime + 0.01; noiseHit(t, 4200, 7, 0.16, 0.04); }
  } else if (AC && AC.state === 'running') quiet(AC.suspend());
  $snd.classList.toggle('on', soundOn);
  $snd.setAttribute('aria-pressed', String(soundOn));
  $snd.lastChild.textContent = soundOn ? 'Sound on' : 'Sound off';
});
$snd.addEventListener('pointerdown', e => e.stopPropagation());

/* ---------- pointer (primary pointer only) ---------- */
const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, active: false, t: 0, type: 'mouse' };
function ptrMove(e) {
  if (!e.isPrimary) return;
  const now = performance.now();
  if (ptr.active) {
    const dt = Math.max(8, now - ptr.t) / 1000, cap = 40 * P;
    ptr.vx = clamp(ptr.vx * 0.5 + ((e.clientX - ptr.x) / dt) * 0.5, -cap, cap);
    ptr.vy = clamp(ptr.vy * 0.5 + ((e.clientY - ptr.y) / dt) * 0.5, -cap, cap);
  } else { ring.x = e.clientX; ring.y = e.clientY; }
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; ptr.active = true; ptr.type = e.pointerType || 'mouse';
}
cv.addEventListener('pointermove', ptrMove);
cv.addEventListener('pointerdown', e => {
  if (!e.isPrimary) return;
  ptrMove(e);
  if (e.pointerType !== 'mouse') { ptr.vx = ptr.vy = 0; }
  burst(e.clientX, e.clientY);
});
const ptrOff = e => {
  if (e && !e.isPrimary) return;
  if (!e || e.type === 'pointerleave' || e.pointerType !== 'mouse') {
    ptr.active = false; ptr.x = ptr.y = -1e4; ptr.vx = ptr.vy = 0;
  }
};
cv.addEventListener('pointerup', ptrOff);
cv.addEventListener('pointercancel', ptrOff);
cv.addEventListener('pointerleave', ptrOff);
window.addEventListener('blur', () => ptrOff(null));

function near(x, y) {
  if (!ptr.active || RM) return false;
  const R = P * 5.2, dx = x - ptr.x, dy = y - ptr.y;
  return dx * dx + dy * dy < R * R;
}
function push(o, h, s) {
  if (!ptr.active || RM) return;
  const R = P * 4.2, dx = o.x - ptr.x, dy = o.y - ptr.y, d2 = dx * dx + dy * dy;
  if (d2 > R * R) return;
  const d = Math.sqrt(d2) + 0.01, f = 1 - d / R, f2 = f * f;
  o.vx += (dx / d * f2 * P * 320 + ptr.vx * f2 * 5) * h * s;
  o.vy += (dy / d * f2 * P * 320 + ptr.vy * f2 * 5) * h * s;
  if (o.va !== undefined) o.va += ((dx * ptr.vy - dy * ptr.vx) / (R * R)) * f2 * 40 * h * s + (dx / d) * f2 * 6 * h * s;
}
function burst(x, y) {
  if (RM) return;
  const R = P * 7;
  const hit = o => {
    const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy) + 0.01;
    if (d > R) return false;
    const f = 1 - d / R;
    o.vx += dx / d * f * P * 34; o.vy += dy / d * f * P * 34 - f * P * 6;
    if (o.va !== undefined) o.va += (dx >= 0 ? 1 : -1) * 12 * f;
    o.vsq -= 6 * f; o.rest = false; return true;
  };
  let n = 0;
  for (const d of digits) for (const t of d.tiles) if ((t.state === 3 || t.state === 4) && hit(t)) n++;
  for (const cl of colons) for (const t of cl) if (t.alive && t.delay <= 0) hit(t);
  for (const o of debris) if (!o.dead && (o.state === 'pile' || o.state === 'fall' || o.state === 'slide')) hit(o);
  if (n) sTap(1);
}

/* ---------- debris / pile ---------- */
function spawnDebris(t, fl, vfl, vx, vy, va) {
  const o = pool.pop() || {};
  o.x = t.x; o.y = t.y; o.vx = vx; o.vy = vy; o.a = t.a; o.va = va; o.fl = fl; o.vfl = vfl;
  o.sq = t.sq; o.vsq = t.vsq; o.o = 0; o.state = 'fall'; o.passed = false; o.bounces = 0;
  o.col = -1; o.slot = 0; o.tx = 0; o.ty = 0; o.at = 0; o.delay = 0; o.rest = false; o.dead = false; o.dir = 0;
  debris.push(o);
  return o;
}
/* take the top tile of the pile column nearest to x */
function popPile(x) {
  const c0 = colOf(x);
  for (let k = 0; k < cols; k++) {
    for (let sg = -1; sg <= 1; sg += 2) {
      const c = c0 + sg * k;
      if (c >= 0 && c < cols && stacks[c].length) { const o = stacks[c].pop(); o.dead = true; return o; }
      if (k === 0) break;
    }
  }
  return null;
}
function landAt(o, c) {
  const st = stacks[c];
  o.state = 'pile'; o.col = c; o.slot = st.length; st.push(o);
  o.tx = colX(c); o.ty = floorY - (o.slot + 0.5) * P;
  o.at = Math.round(o.a / HPI) * HPI;
  o.vsq -= Math.min(6, Math.abs(o.vy) / P * 0.12);
  sTap(Math.abs(o.vy) / (P * 30) + 0.3);
  o.vy *= 0.2; o.rest = false;
}
function hop(o, hc, best) {
  o.bounces++;
  o.y = floorY - (hc + 0.5) * P;
  const dxh = colX(best) - o.x;
  o.vy = -Math.abs(o.vy) * 0.25 - P * 3 - Math.min(Math.abs(dxh), P * 20) * 1.5;
  const drop = Math.max(0, (hc - stacks[best].length) * P);
  const tf = (-o.vy + Math.sqrt(o.vy * o.vy + 2 * GRAV * drop)) / GRAV;
  o.vx = dxh / Math.max(0.12, tf);
  o.va += (o.vx / P) * 0.6; o.vsq -= 2;
  sTap(0.2);
}
function slide(o) {
  o.state = 'slide'; o.y = floorY - (maxH + 0.5) * P; o.vy = 0;
  o.dir = o.x < (floorX0 + floorX1) / 2 ? -1 : 1;
  o.vx = o.dir * Math.max(P * 4, Math.abs(o.vx));
}
function settle(o, c, hc) {
  let best = -1, bh = maxH;
  for (let k = 1; k <= 4; k++) for (let sg = -1; sg <= 1; sg += 2) {
    const n = c + sg * k;
    if (n < 0 || n >= cols) continue;
    const hn = stacks[n].length;
    if (hn < bh) { best = n; bh = hn; }
  }
  if (hc < maxH && (best < 0 || bh >= hc)) { landAt(o, c); return; }
  if (best < 0) {                      // column and neighbours full: look further out
    for (let k = 5; k < cols && best < 0; k++) for (let sg = -1; sg <= 1; sg += 2) {
      const n = c + sg * k;
      if (n >= 0 && n < cols && stacks[n].length < maxH) { best = n; break; }
    }
  }
  if (best < 0) { slide(o); return; }  // floor full: slide off an end, never through the floor
  if (o.bounces < 3) hop(o, hc, best); else landAt(o, best);
}

/* ---------- transitions ---------- */
function launch(t) {
  const tau = Math.max(0.22, t.land);
  const o = trapShut() ? popPile(t.hx) : null;
  t.state = 2; t.te = 0; t.fly = tau; t.sq = 1; t.vsq = 0; t.rest = false;
  if (o) {
    // thrown from the pile on an arc that peaks just above the slot and lands at t = tau
    t.x0 = o.x; t.y0 = o.y; t.ink = Math.max(0, 1 - o.o);
    const U = Math.max(0, o.y - t.hy), ha = P * 1.2;
    const sg = (Math.sqrt(2 * (U + ha)) + Math.sqrt(2 * ha)) / tau;
    t.g = sg * sg;
    t.vy0 = (t.hy - t.y0 - 0.5 * t.g * tau * tau) / tau;
    const dx = t.hx - o.x, turns = Math.abs(dx) > 6 * P ? 2 : 1;
    t.vx0 = dx / tau;
    t.a0 = o.a;
    t.va = (Math.round(o.a / HPI) * HPI + (dx >= 0 ? 1 : -1) * turns * HPI - o.a) / tau;
  } else {
    // pile empty: drop in from above the top edge
    t.x0 = t.hx; t.y0 = -TS; t.ink = 1; t.g = GRAV;
    t.vx0 = 0; t.vy0 = (t.hy - t.y0 - 0.5 * t.g * tau * tau) / tau;
    t.a0 = (t.c - 2) * 0.08; t.va = 0;
  }
  t.x = t.x0; t.y = t.y0; t.a = t.a0; t.vx = t.vx0; t.vy = t.vy0;
}
function landTile(t) {
  const imp = Math.max(0, t.vy);
  t.state = 3; t.x = t.hx; t.y = t.hy; t.vx = 0; t.vy = -imp * 0.04;
  t.a = t.a - Math.round(t.a / HPI) * HPI; t.va = t.a * -4;
  t.ink = 1; t.hot = 1; t.rest = false;
  t.vsq = -Math.min(12, imp / P * 0.3);
  const b = t.below;
  if (b && b.state === 3 && !b.flip) { b.vy += imp * 0.05; b.vsq -= 2; b.rest = false; }
  sTap(imp / (P * 45));
}
function rmSet(t, was, is) {
  t.flip = false; t.wind = -1;
  if (is) {
    if (t.state !== 3) {
      t.state = 3; t.x = t.hx; t.y = t.hy; t.vx = t.vy = 0; t.a = t.va = 0;
      t.sq = 1; t.vsq = 0; t.alpha = 0; t.ink = 1; t.hot = 0;
    }
    t.rest = false;
  } else if (was && t.state >= 2) { t.state = 5; t.rest = false; }
  else if (t.state !== 5) t.state = 0;
}
/* rem: seconds until the boundary; every incoming tile is scheduled to land by then */
function dropTo(d, v, rem, intro) {
  const g = GLYPH[v]; d.val = v;
  for (const t of d.tiles) {
    const was = t.on, is = g[t.r * 5 + t.c]; t.on = is;
    if (RM) { rmSet(t, was, is); continue; }
    if (was && !is) {
      if (t.state === 3 && !t.flip) {
        t.state = 4; t.rest = false; t.wind = -1;
        t.delay = (6 - t.r) * 0.012 + Math.abs(t.c - 2) * 0.006;
      } else if (t.state === 2) {
        const o = spawnDebris(t, 0, 0, t.vx, t.vy, t.va); o.o = 1 - t.ink; t.state = 0;
      } else if (t.state !== 4) { t.state = 0; t.flip = false; }
    } else if (!was && is) {
      if (t.state === 4) { t.state = 3; t.wind = -1; }
      else if (t.state === 0 || t.state === 5) {
        t.state = 1; t.flip = false; t.alpha = 1;
        // bottom rows land first; the top-centre tile lands exactly on the boundary
        t.land = intro ? 0.4 + (d.i * 5 + t.c) * 0.01 + (6 - t.r) * 0.03
                       : Math.max(0.06, rem - t.r * 0.02 - Math.abs(t.c - 2) * 0.006);
        t.delay = Math.max(0, t.land - FLY);
      }
    } else if (was && is && t.state === 3 && !intro) {
      t.nd = Math.max(0.001, rem); t.rest = false;
    }
  }
}
function flipTo(d, v) {
  const g = GLYPH[v]; d.val = v;
  for (const t of d.tiles) {
    const was = t.on, is = g[t.r * 5 + t.c]; t.on = is;
    if (RM) { rmSet(t, was, is); continue; }
    if (!was && !is) continue;
    const vis = was && t.state >= 2;
    if (!vis && !is) { t.state = 0; continue; }
    if (t.state !== 3 && t.state !== 4) { t.x = t.hx; t.y = t.hy; t.vx = t.vy = 0; t.a = 0; t.va = 0; }
    t.state = 3; t.alpha = 1; t.ink = 1; t.rest = false; t.wind = -1;
    t.flip = true; t.ft = -t.wd; t.fa = 0; t.vfa = 0; t.crossed = false;
    t.fromOn = vis; t.toOn = is;
  }
}
function openTrap() {
  trap.target = 1; trap.closeAt = clock + 1.9;
  const cx = (floorX0 + floorX1) / 2, hw = Math.max(1, (floorX1 - floorX0) / 2);
  for (let c = 0; c < cols; c++) {
    const st = stacks[c];
    for (let j = 0; j < st.length; j++) {
      const o = st[j];
      o.state = 'rel'; o.rest = false; o.delay = Math.abs(o.tx - cx) / hw * 0.28 + j * 0.01;
    }
    st.length = 0;
  }
}
function tenEvent(s) {
  tenT0 = clock; tenS = s;
  if (RM) return;
  for (const d of digits) for (const t of d.tiles) {
    if (t.state === 3 && !t.flip) { t.nd = 0.001 + t.wd * 0.45; t.rest = false; }
  }
}

/* ---------- clock ---------- */
let started = false, introUntil = 0, nextSec = 0, preDone = false, lastM = -1;
const pad = n => String(n).padStart(2, '0');
const valsOf = (d, out) => {
  const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  out[0] = h / 10 | 0; out[1] = h % 10; out[2] = m / 10 | 0; out[3] = m % 10; out[4] = s / 10 | 0; out[5] = s % 10;
  return out;
};
const VALS = [0, 0, 0, 0, 0, 0];
function updateText(d) {
  $date.textContent = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${DAYS[d.getDay()]}`;
  const off = -d.getTimezoneOffset(), sg = off >= 0 ? '+' : '-', ao = Math.abs(off);
  $tz.textContent = `UTC${sg}${pad(ao / 60 | 0)}:${pad(ao % 60)}`;
  $sr.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function startIntro(now) {
  const d = new Date(now);
  valsOf(d, VALS);
  digits.forEach((dg, i) => dropTo(dg, VALS[i], 0, true));
  colons.forEach((cl, k) => cl.forEach((t, j) => {
    t.delay = RM ? 0 : 0.25 + k * 0.1 + j * 0.04;
    t.x = t.hx; t.y = RM ? t.hy : -2 * P; t.vx = t.vy = 0;
  }));
  mk.s = d.getSeconds(); mk.x = rulerX0; mk.tx = markerX(mk.s);
  lastM = d.getMinutes(); updateText(d);
  introUntil = clock + (RM ? 0.3 : 1.0);           // seconds changes wait for the intro
  nextSec = Math.floor(now / 1000) * 1000 + 1000; preDone = false;
}
function preSecond(ts, now) {
  const s = new Date(ts).getSeconds(), rem = Math.max(0, (ts - now) / 1000);
  const v4 = s / 10 | 0, v5 = s % 10;
  if (digits[4].val !== v4) dropTo(digits[4], v4, rem, false);
  if (digits[5].val !== v5) dropTo(digits[5], v5, rem, false);
}
function onSecond(ts) {
  const d = new Date(ts), m = d.getMinutes(), s = d.getSeconds();
  valsOf(d, VALS);
  if (digits[4].val !== VALS[4]) dropTo(digits[4], VALS[4], 0, false);
  if (digits[5].val !== VALS[5]) dropTo(digits[5], VALS[5], 0, false);
  if (m !== lastM) {
    for (let i = 0; i < 4; i++) flipTo(digits[i], VALS[i]);
    if (!RM) { openTrap(); waveT0 = clock; }
    sTick(false); sChime(); updateText(d);
  } else if (s % 10 === 0) { tenEvent(s); sTen(); }
  else sTick(s % 2 === 1);
  if (!RM) colons.forEach((cl, k) => cl.forEach((t, j) => { t.hop = 0.02 + j * 0.07 + k * 0.03; }));
  mk.c = s === 0 ? 44 : 22; mk.s = s; mk.tx = markerX(s);
  lastM = m;
}
function timeTick() {
  const now = Date.now();
  if (!started) { started = true; startIntro(now); return; }
  if (clock < introUntil) return;
  if (now >= nextSec + 1000) { nextSec = Math.floor(now / 1000) * 1000; preDone = false; }   // stalled tab
  if (!preDone && now >= nextSec - LEAD * 1000) { preDone = true; preSecond(nextSec, now); }
  if (now >= nextSec) { onSecond(nextSec); nextSec += 1000; preDone = false; }
}

/* ---------- simulation ---------- */
function updTile(t, h) {
  if (t.state === 0) return;
  if (t.state === 5) { t.alpha -= h * 6; if (t.alpha <= 0) { t.alpha = 1; t.state = 0; } return; }
  if (t.state === 1) { t.delay -= h; t.land -= h; if (t.delay > 0) return; launch(t); }
  if (t.state === 2) {
    t.te += h;
    const te = Math.min(t.te, t.fly);
    t.x = t.x0 + t.vx0 * te; t.y = t.y0 + t.vy0 * te + 0.5 * t.g * te * te;
    t.vx = t.vx0; t.vy = t.vy0 + t.g * te; t.a = t.a0 + t.va * te;
    if (t.ink < 1) t.ink = Math.min(1, t.ink + h * 4);
    if (t.te >= t.fly) landTile(t);
    return;
  }
  // 3 / 4 : sprung at home
  if (t.rest) { if (!near(t.x, t.y)) return; t.rest = false; }
  if (t.hot > 0) t.hot = Math.max(0, t.hot - h * 2.5);
  if (t.alpha < 1) t.alpha = Math.min(1, t.alpha + h * 6);
  if (t.nd > 0) { t.nd -= h; if (t.nd <= 0) { t.vsq -= 2.6; t.vy += P * 2.5; } }
  push(t, h, 1);
  t.vx += (-K * (t.x - t.hx) - C * t.vx) * h;
  t.vy += (-K * (t.y - t.hy) - C * t.vy) * h;
  t.va += (-KA * t.a - CA * t.va) * h;
  t.vsq += (-KS * (t.sq - 1) - CS * t.vsq) * h;
  t.x += t.vx * h; t.y += t.vy * h; t.a += t.va * h; t.sq += t.vsq * h;
  if (t.state === 4) {
    if (t.wind < 0) {
      t.delay -= h;
      if (t.delay <= 0) { t.wind = 0.08; t.vsq -= 3; t.vy += P * 4; }        // anticipation dip
    } else {
      t.wind -= h;
      if (t.wind <= 0) {
        spawnDebris(t, 0, 0, t.vx + (t.c - 2) * P * 1.4, Math.min(t.vy, 0) - P * 10,
          (t.c - 2) * 2.2 + (t.r & 1 ? 1.2 : -1.2));
        t.state = 0; t.wind = -1; return;
      }
    }
  }
  if (t.flip) {
    t.ft += h;
    if (t.ft > 0) {
      t.vfa += (KF * (TAU - t.fa) - CF * t.vfa) * h; t.fa += t.vfa * h;
      if (!t.crossed && t.fa >= HPI) {
        t.crossed = true;
        if (!t.toOn) {
          spawnDebris(t, t.fa, t.vfa * 0.6, t.vx + (t.c - 2) * P * 0.8, t.vy - P * 4, (t.c - 2) * 1.5);
          t.state = 0; t.flip = false; t.fa = 0; t.vfa = 0; return;
        }
        if (!t.fromOn) sTap(0.4);
      }
      if (Math.abs(TAU - t.fa) < 0.004 && Math.abs(t.vfa) < 0.05) { t.flip = false; t.fa = 0; t.vfa = 0; t.vsq -= 3; }
    }
  }
  if (t.state === 3 && !t.flip && t.nd <= 0 && t.hot === 0 && t.alpha >= 1 &&
      Math.abs(t.x - t.hx) < 0.03 && Math.abs(t.y - t.hy) < 0.03 && Math.abs(t.vx) < 0.3 && Math.abs(t.vy) < 0.3 &&
      Math.abs(t.a) < 0.002 && Math.abs(t.va) < 0.02 && Math.abs(t.sq - 1) < 0.002 && Math.abs(t.vsq) < 0.02 &&
      !near(t.x, t.y)) {
    t.rest = true; t.x = t.hx; t.y = t.hy; t.vx = t.vy = 0; t.a = t.va = 0; t.sq = 1; t.vsq = 0;
  }
}
function updColon(t, h) {
  if (!t.alive) return;
  if (t.delay > 0) { t.delay -= h; if (t.delay > 0) return; }
  if (t.hop >= 0) { t.hop -= h; if (t.hop < 0 && t.y >= t.hy - 1) { t.vy = -P * 6.5; t.vsq += 2.5; } }
  push(t, h, 0.6);
  t.vx += (-KC * (t.x - t.hx) - CC * t.vx) * h; t.x += t.vx * h;
  if (t.y < t.hy - 0.01 || t.vy < 0) {
    t.vy += GRAV * h; t.y += t.vy * h;
    if (t.y >= t.hy && t.vy > 0) {
      const imp = t.vy; t.y = t.hy; t.vsq -= Math.min(10, imp / P * 0.25);
      t.vy = imp > P * 4 ? -imp * 0.12 : 0;                        // heavy, low bounce
    }
  } else if (t.y > t.hy + 0.01 || t.vy > 0) {
    t.vy += (-KC * (t.y - t.hy) - CC * t.vy) * h; t.y += t.vy * h;
  }
  t.vsq += (-KS * (t.sq - 1) - CS * t.vsq) * h; t.sq += t.vsq * h;
}
function updDebris(h) {
  const shut = trapShut();
  const cx = (floorX0 + floorX1) / 2, hw = Math.max(1, (floorX1 - floorX0) / 2);
  for (let i = 0; i < debris.length; i++) {
    const o = debris[i];
    if (o.dead) continue;
    if (o.state === 'rel') {
      o.delay -= h;
      if (o.delay > 0) continue;
      o.state = 'fall'; o.passed = true; o.va = (o.col & 1 ? 1 : -1) * 4;
      o.vy = P * 0.5; o.vx = (cx - o.x) / hw * P * 2;
    }
    if (o.state === 'slide') {
      o.vx += o.dir * P * 24 * h; o.x += o.vx * h; o.a += o.vx / TS * h;
      o.vsq += (-KS * (o.sq - 1) - CS * o.vsq) * h; o.sq += o.vsq * h;
      if (o.x < floorX0 - TS * 0.5 || o.x > floorX1 + TS * 0.5) { o.state = 'fall'; o.passed = true; }
      continue;
    }
    if (o.state === 'fall') {
      push(o, h, 0.5);
      o.vy += GRAV * h; o.vx *= (1 - h * 0.4); o.vfl *= (1 - h * 0.6);
      o.x += o.vx * h; o.y += o.vy * h; o.a += o.va * h; o.fl += o.vfl * h;
      o.vsq += (-KS * (o.sq - 1) - CS * o.vsq) * h; o.sq += o.vsq * h;
      if (!o.passed && o.vy > 0) {
        if (o.x < floorX0 || o.x >= floorX1) { if (o.y > floorY) o.passed = true; }
        else if (!shut) { if (o.y > floorY - P) o.passed = true; }
        else {
          const c = colOf(o.x), hc = stacks[c].length;
          if (o.y >= floorY - (hc + 0.5) * P) settle(o, c, hc);
        }
      }
      if (o.y > H + P * 3 || o.x < -P * 4 || o.x > W + P * 4) o.dead = true;
      continue;
    }
    // pile
    if (o.rest) { if (!near(o.x, o.y)) continue; o.rest = false; }
    push(o, h, 0.8);
    o.vx += (-KP * (o.x - o.tx) - CP * o.vx) * h;
    o.vy += (-KP * (o.y - o.ty) - CP * o.vy) * h;
    o.va += (-KA * (o.a - o.at) - CA * o.va) * h;
    const ft = Math.round(o.fl / TAU) * TAU;
    o.vfl += (-120 * (o.fl - ft) - 12 * o.vfl) * h;
    o.vsq += (-KS * (o.sq - 1) - CS * o.vsq) * h;
    o.x += o.vx * h; o.y += o.vy * h; o.a += o.va * h; o.fl += o.vfl * h; o.sq += o.vsq * h;
    o.o = Math.min(1, o.o + h * 1.6);
    if (o.o >= 1 && Math.abs(o.x - o.tx) < 0.03 && Math.abs(o.y - o.ty) < 0.03 &&
        Math.abs(o.vx) < 0.3 && Math.abs(o.vy) < 0.3 && Math.abs(o.a - o.at) < 0.002 && Math.abs(o.va) < 0.02 &&
        Math.abs(o.fl - ft) < 0.002 && Math.abs(o.vfl) < 0.02 && Math.abs(o.sq - 1) < 0.002 && Math.abs(o.vsq) < 0.02 &&
        !near(o.x, o.y)) {
      o.rest = true; o.x = o.tx; o.y = o.ty; o.vx = o.vy = 0; o.a = o.at; o.va = 0; o.fl = 0; o.vfl = 0; o.sq = 1; o.vsq = 0;
    }
  }
}
function compact() {
  if (debris.length > 1200) {
    let ex = debris.length - 1200;
    for (let i = 0; i < debris.length && ex > 0; i++) {
      const o = debris[i];
      if (!o.dead && o.state !== 'pile') { o.dead = true; ex--; }
    }
  }
  let j = 0;
  for (let i = 0; i < debris.length; i++) {
    const o = debris[i];
    if (o.dead) pool.push(o); else debris[j++] = o;
  }
  debris.length = j;
}
function step(h) {
  for (const d of digits) for (const t of d.tiles) updTile(t, h);
  for (const cl of colons) for (const t of cl) updColon(t, h);
  updDebris(h);
  trap.vel += (150 * (trap.target - trap.v) - 10 * trap.vel) * h;
  trap.v += trap.vel * h;
  if (trap.v < -0.05) { trap.v = -0.05; trap.vel *= -0.35; }
  const mc = RM ? 2 * Math.sqrt(420) : mk.c;
  mk.v += (420 * (mk.tx - mk.x) - mc * mk.v) * h; mk.x += mk.v * h;
}

/* ---------- render ---------- */
const crisp = v => (Math.floor(v * DPR) + 0.5) / DPR;     // centre of a device pixel (hairlines)
const snap = v => Math.round(v * DPR) / DPR;               // device-pixel edge (fills)
const snapW = v => Math.max(1, Math.round(v * DPR)) / DPR; // whole device pixels, at least one
function quad(x, y, w, hh, a, yOff) {
  const c = Math.cos(a) * DPR, s = Math.sin(a) * DPR;
  ctx.setTransform(c, s, -s, c, x * DPR, y * DPR);
  ctx.fillRect(-w / 2, -hh / 2 + yOff, w, hh);
}
function outline(x, y, w, hh, a, hl) {
  const c = Math.cos(a) * DPR, s = Math.sin(a) * DPR;
  ctx.setTransform(c, s, -s, c, x * DPR, y * DPR);
  ctx.strokeRect(-w / 2 + hl / 2, -hh / 2 + hl / 2, Math.max(0, w - hl), Math.max(0, hh - hl));
}
/* a card turning about its vertical axis, drawn in perspective */
function card(x, y, w, hh, a, yOff, fa) {
  const c = Math.cos(a) * DPR, s = Math.sin(a) * DPR;
  ctx.setTransform(c, s, -s, c, x * DPR, y * DPR);
  const cf = Math.cos(fa), sf = Math.sin(fa) * 0.15;
  const xl = -w / 2 * cf, xr = w / 2 * cf, hL = hh / 2 * (1 + sf), hR = hh / 2 * (1 - sf);
  ctx.beginPath();
  ctx.moveTo(xl, yOff - hL); ctx.lineTo(xr, yOff - hR); ctx.lineTo(xr, yOff + hR); ctx.lineTo(xl, yOff + hL);
  ctx.closePath(); ctx.fill();
}
function tileVisible(t) {
  if (t.state < 2) return false;
  if (t.flip) return t.crossed ? t.toOn : t.fromOn;
  return true;
}
function draw(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const hl = 1 / DPR, lw = snapW(1);
  ctx.lineWidth = hl;

  /* guides: group edges only */
  ctx.strokeStyle = 'rgba(21,21,21,0.09)';
  ctx.beginPath();
  for (let i = 0; i < guideX.length; i++) { const x = crisp(guideX[i]); ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let i = 0; i < guideY.length; i++) { const y = crisp(guideY[i]); ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  /* empty slot marks */
  ctx.strokeStyle = 'rgba(21,21,21,0.2)';
  const m = Math.max(1.5, P * 0.1);
  ctx.beginPath();
  for (const d of digits) for (const t of d.tiles) {
    if (t.state >= 3 && tileVisible(t)) continue;
    const x = crisp(t.hx), y = crisp(t.hy);
    ctx.moveTo(x - m, y); ctx.lineTo(x + m, y); ctx.moveTo(x, y - m); ctx.lineTo(x, y + m);
  }
  ctx.stroke();

  /* labels */
  ctx.font = FONT_LABEL; if (HAS_LS) ctx.letterSpacing = LS_LABEL;
  ctx.fillStyle = 'rgba(21,21,21,0.42)';
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  for (let g = 0; g < 3; g++) {
    const d = digits[g * 2];
    ctx.fillText(LABELS[g], d.x, d.y - Math.max(8, P * 0.55));
  }

  /* ruler */
  const s = mk.s, ry = crisp(rulerY);
  ctx.beginPath(); ctx.strokeStyle = 'rgba(21,21,21,0.18)';
  ctx.moveTo(rulerX0, ry); ctx.lineTo(rulerX1, ry); ctx.stroke();
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    ctx.strokeStyle = pass ? 'rgba(21,21,21,0.7)' : 'rgba(21,21,21,0.2)';
    for (let i = 0; i <= 60; i++) {
      if ((i <= s) !== (pass === 1)) continue;
      const x = crisp(markerX(i)), tl = i % 15 === 0 ? 9 : i % 5 === 0 ? 6 : 3;
      ctx.moveTo(x, ry); ctx.lineTo(x, ry - tl);
    }
    ctx.stroke();
  }
  ctx.font = FONT_RULER; if (HAS_LS) ctx.letterSpacing = LS_RULER;
  ctx.fillStyle = 'rgba(21,21,21,0.38)';
  for (let k = 0; k < 4; k++) ctx.fillText(RULER_LABELS[k], markerX(k * 15) + 3, rulerY + 13);
  ctx.textAlign = 'right'; ctx.fillText('60', rulerX1, rulerY + 13); ctx.textAlign = 'left';
  // ten-second segment
  const tt = clock - tenT0;
  if (tt >= 0 && tt < 0.8) {
    ctx.globalAlpha = 1 - tt / 0.8; ctx.fillStyle = INK;
    const xa = snap(markerX(tenS - 10)), xb = snap(markerX(tenS));
    ctx.fillRect(xa, snap(rulerY) - lw, xb - xa, lw * 2);
    ctx.globalAlpha = 1;
  }
  // seconds marker (accent: "now")
  ctx.fillStyle = ACC;
  const stretch = Math.min(10, Math.abs(mk.v) / 120);
  ctx.fillRect(snap(mk.x - 1 - (mk.v > 0 ? stretch : 0)), snap(rulerY - 14), snapW(2 + stretch), snapW(14));

  /* floor + trapdoor */
  const Lh = (floorX1 - floorX0) / 2, ext = Lh * clamp(1 - trap.v, 0, 1.04);
  const fy = snap(floorY), fx0 = snap(floorX0), fx1 = snap(floorX1);
  ctx.fillStyle = INK;
  const le = snap(floorX0 + ext), re = snap(floorX1 - ext);
  if (le > fx0) ctx.fillRect(fx0, fy, le - fx0, lw);
  if (fx1 > re) ctx.fillRect(re, fy, fx1 - re, lw);
  if (trap.v > 0.02) {
    ctx.fillRect(le - lw, fy - snap(3), lw * 2, snap(6) + lw);
    ctx.fillRect(re - lw, fy - snap(3), lw * 2, snap(6) + lw);
  }
  ctx.fillRect(fx0, fy - snap(4), lw, snap(8) + lw);
  ctx.fillRect(fx1 - lw, fy - snap(4), lw, snap(8) + lw);
  const tickA = Math.max(0, 1 - Math.abs(trap.v) * 6);
  if (tickA > 0.01) {
    ctx.globalAlpha = 0.28 * tickA; ctx.strokeStyle = INK;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const q = ((c - floorK) % 5 + 5) % 5;
      if (q) continue;
      const x = crisp(floorX0 + c * P), major = ((c - floorK) % 10 + 10) % 10 === 0;
      ctx.moveTo(x, fy + 3); ctx.lineTo(x, fy + (major ? 7 : 5));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* minute sweep (accent), timed to the flip crossing */
  const wt = clock - waveT0;
  if (!RM && wt > 0 && wt < 2) {
    ctx.fillStyle = ACC;
    if (!portrait) {
      const gm = (wt - 0.1 - T_CROSS) / 0.022;
      const a = clamp(Math.min((gm + 3) / 4, (29 - gm) / 4), 0, 1);
      if (a > 0) {
        ctx.globalAlpha = a;
        ctx.fillRect(snap(bx0 + (gm + 0.5) * P), snap(by0 - P * 1.2), lw, snap(9.4 * P));
      }
    } else {
      const ri = (wt - 0.1 - T_CROSS) / 0.03;
      const a = clamp(Math.min((ri + 3) / 4, (16 - ri) / 4), 0, 1);
      if (a > 0) {
        ctx.globalAlpha = a;
        const y = by0 + (ri + 3 * Math.floor(Math.max(0, ri) / 7) + 0.5) * P;
        ctx.fillRect(snap(bx0 - 1.2 * P), snap(y), snap(13.4 * P), lw);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* pile: resting outlines in one path */
  ctx.globalAlpha = PILE_A; ctx.strokeStyle = INK; ctx.lineWidth = hl;
  ctx.beginPath();
  for (let i = 0; i < debris.length; i++) {
    const o = debris[i];
    if (o.dead || !o.rest) continue;
    ctx.rect(snap(o.tx - TS / 2) + hl / 2, snap(o.ty - TS / 2) + hl / 2, TS - hl, TS - hl);
  }
  ctx.stroke();
  /* moving debris */
  for (let i = 0; i < debris.length; i++) {
    const o = debris[i];
    if (o.dead || o.rest) continue;
    const cf = Math.cos(o.fl), w = TS * Math.abs(cf) * (1 + (1 - o.sq) * 0.5), hh = TS * o.sq;
    const fa = 1 - o.o;
    if (fa > 0.01) {
      ctx.globalAlpha = fa; ctx.fillStyle = cf < 0 ? ACC : INK;
      quad(o.x, o.y, w, hh, o.a, 0);
    }
    if (o.o > 0.01) { ctx.globalAlpha = o.o * PILE_A; outline(o.x, o.y, w, hh, o.a, hl); }
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalAlpha = 1;

  /* digit tiles: resting ones in one path, snapped to the device grid */
  ctx.fillStyle = INK;
  ctx.beginPath();
  for (const d of digits) for (const t of d.tiles) {
    if (t.rest && t.state === 3) ctx.rect(snap(t.hx - TS / 2), snap(t.hy - TS / 2), TS, TS);
  }
  ctx.fill();
  for (const d of digits) for (const t of d.tiles) {
    if (t.rest || !tileVisible(t)) continue;
    const w = TS * (1 + (1 - t.sq) * 0.55), hh = TS * t.sq, yOff = (TS - hh) / 2;
    if (t.flip && t.ft > 0) {
      const l = Math.abs(Math.sin(t.fa / 2)), k = 1 + 0.14 * l;
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = Math.cos(t.fa) < 0 ? ACC : INK;
      card(t.x, t.y - P * 0.35 * l, w * k, hh * k, t.a, yOff, t.fa);
      continue;
    }
    ctx.fillStyle = t.hot > 0 ? HOTC[Math.round(t.hot * 16)] : INK;
    const fillA = t.alpha * t.ink;
    if (fillA > 0.01) { ctx.globalAlpha = fillA; quad(t.x, t.y, w, hh, t.a, yOff); }
    if (t.ink < 1) { ctx.globalAlpha = (1 - t.ink) * PILE_A; ctx.strokeStyle = INK; outline(t.x, t.y, w, hh, t.a, hl); }
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalAlpha = 1;

  /* colons (ink) */
  ctx.fillStyle = INK;
  for (const cl of colons) for (const t of cl) {
    if (!t.alive || t.delay > 0) continue;
    const hh = TS * t.sq, w = TS * (1 + (1 - t.sq) * 0.55);
    quad(t.x, t.y, w, hh, 0, (TS - hh) / 2);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  /* touch/pen ring (mice already have the crosshair) */
  const touchy = ptr.active && ptr.type !== 'mouse' && !RM;
  const kr = 1 - Math.pow(0.82, dt * 60), kp = 1 - Math.pow(0.75, dt * 60);
  ring.r += ((touchy ? P * 0.9 : 0) - ring.r) * kr;
  if (ptr.active) { ring.x += (ptr.x - ring.x) * kp; ring.y += (ptr.y - ring.y) * kp; }
  if (ring.r > 0.5) {
    ctx.strokeStyle = 'rgba(21,21,21,0.5)'; ctx.lineWidth = hl;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, TAU); ctx.stroke();
  }
}

/* ---------- loop ---------- */
let lastT = performance.now();
function frame(now) {
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 0.05);
  clock += dt;
  timeTick();
  if (trap.target === 1 && clock > trap.closeAt) trap.target = 0;
  const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
  for (let i = 0; i < n; i++) step(h);
  const kd = Math.pow(0.86, dt * 60);
  ptr.vx *= kd; ptr.vy *= kd;
  compact();
  draw(dt);
  requestAnimationFrame(frame);
}
let rzq = 0;
const scheduleLayout = () => { cancelAnimationFrame(rzq); rzq = requestAnimationFrame(layout); };
window.addEventListener('resize', scheduleLayout);
/* backing store follows DPR changes (e.g. moving to another monitor at the same size) */
let dprMQ = null;
function onDPR() { scheduleLayout(); watchDPR(); }
function watchDPR() {
  if (!window.matchMedia) return;
  if (dprMQ) { try { dprMQ.removeEventListener('change', onDPR); } catch (e) { /* old Safari */ } }
  dprMQ = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  try { dprMQ.addEventListener('change', onDPR, { once: true }); }
  catch (e) { if (dprMQ.addListener) dprMQ.addListener(onDPR); }
}
watchDPR();
layout();
requestAnimationFrame(t => { lastT = t; frame(t); });
})();
