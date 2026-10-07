(() => {
'use strict';

/* Komorebi Clock: the time, written in sunlight through leaves on a plaster wall. */

const canvas = document.getElementById('c');
const $date = document.getElementById('date');
const rootStyle = document.documentElement.style;

/* ------------------------------------------------------------------ */
/*  Time source (with #t=HH:MM debug hook)                            */
/* ------------------------------------------------------------------ */

let debugMin = null;
function readHash() {
  const m = /^#t=(\d{1,2}):(\d{2})$/.exec(location.hash || '');
  debugMin = m ? (clampI(+m[1], 0, 23) * 60 + clampI(+m[2], 0, 59)) : null;
}
function clampI(v, a, b) { return Math.min(b, Math.max(a, v | 0)); }
readHash();
window.addEventListener('hashchange', readHash);

const pad = n => (n < 10 ? '0' : '') + n;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function nowInfo() {
  const d = new Date();
  let hh, mm, hour;
  if (debugMin !== null) {
    hh = Math.floor(debugMin / 60); mm = debugMin % 60; hour = hh + mm / 60;
  } else {
    hh = d.getHours(); mm = d.getMinutes(); hour = hh + mm / 60 + d.getSeconds() / 3600;
  }
  return {
    key: pad(hh) + ':' + pad(mm),
    hour,
    date: d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + DAYS[d.getDay()]
  };
}

/* ------------------------------------------------------------------ */
/*  Light of the day: keyframes on the clock hour                     */
/* ------------------------------------------------------------------ */
/* h, sun rgb, sun intensity, ambient rgb, ellipse axis angle (deg),
   elongation, softness, outside openness, mote amount, digit glow     */
const NIGHT = { sun: [0.62, 0.74, 1.0], si: 0.62, amb: [0.050, 0.062, 0.092], ang: 74, el: 1.25, soft: 0.50, open: 0.20, mote: 0.18, glow: 0.10 };
const KEYS = [
  [0.0, NIGHT],
  [4.5, NIGHT],
  [5.4, { sun: [0.86, 0.66, 0.80], si: 0.55, amb: [0.105, 0.095, 0.125], ang: 22, el: 2.3, soft: 0.46, open: 0.24, mote: 0.30, glow: 0.08 }],
  [6.3, { sun: [1.0, 0.58, 0.44], si: 0.85, amb: [0.215, 0.160, 0.165], ang: 18, el: 2.5, soft: 0.38, open: 0.28, mote: 0.75, glow: 0.05 }],
  [7.4, { sun: [1.0, 0.74, 0.50], si: 1.00, amb: [0.285, 0.250, 0.235], ang: 28, el: 2.0, soft: 0.32, open: 0.32, mote: 0.90, glow: 0.035 }],
  [9.5, { sun: [1.0, 0.90, 0.79], si: 1.08, amb: [0.345, 0.335, 0.340], ang: 52, el: 1.45, soft: 0.28, open: 0.34, mote: 0.75, glow: 0.03 }],
  [12.5, { sun: [1.0, 0.965, 0.91], si: 1.15, amb: [0.385, 0.375, 0.370], ang: 88, el: 1.06, soft: 0.25, open: 0.34, mote: 0.55, glow: 0.025 }],
  [15.0, { sun: [1.0, 0.90, 0.76], si: 1.10, amb: [0.330, 0.325, 0.335], ang: 124, el: 1.4, soft: 0.28, open: 0.34, mote: 0.75, glow: 0.03 }],
  [16.9, { sun: [1.0, 0.58, 0.20], si: 0.98, amb: [0.265, 0.205, 0.170], ang: 150, el: 2.15, soft: 0.30, open: 0.32, mote: 1.0, glow: 0.04 }],
  [18.3, { sun: [1.0, 0.44, 0.17], si: 0.92, amb: [0.165, 0.125, 0.140], ang: 162, el: 2.55, soft: 0.36, open: 0.28, mote: 0.85, glow: 0.06 }],
  [19.3, { sun: [0.86, 0.52, 0.58], si: 0.62, amb: [0.095, 0.090, 0.135], ang: 118, el: 1.8, soft: 0.46, open: 0.24, mote: 0.35, glow: 0.09 }],
  [20.2, NIGHT],
  [24.0, NIGHT]
];
const lerp = (a, b, u) => a + (b - a) * u;
function lightAt(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const [h0, A] = KEYS[i], [h1, B] = KEYS[i + 1];
  let u = (h - h0) / (h1 - h0);
  u = u * u * (3 - 2 * u);                      /* eased between keyframes: no kinks */
  const o = {};
  for (const k in A) o[k] = Array.isArray(A[k]) ? A[k].map((v, j) => lerp(v, B[k][j], u)) : lerp(A[k], B[k], u);
  return o;
}

/* JS mirror of the composite for the shaded wall (CSS background, date colour, fade colour). */
const ALB = [0.85, 0.815, 0.76];
function shadeColor(L) {
  return ALB.map((a, j) => Math.pow(1 - Math.exp(-a * L.amb[j] * 1.12), 1 / 2.2));
}
const css = c => `rgb(${c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(',')})`;
function applyWallCss(L) {
  const w = shadeColor(L);
  const lum = 0.299 * w[0] + 0.587 * w[1] + 0.114 * w[2];
  const ink = lum < 0.42 ? w.map(v => v + (1 - v) * 0.30) : w.map(v => v * 0.58);
  rootStyle.setProperty('--wall', css(w));
  rootStyle.setProperty('--ink', css(ink));
  return w;
}

let info = nowInfo();
let todL = lightAt(info.hour);
let fadeCol = applyWallCss(todL);          /* paints immediately, before WebGL is up */

/* ------------------------------------------------------------------ */
/*  WebGL                                                             */
/* ------------------------------------------------------------------ */

const gl = canvas.getContext('webgl', {
  antialias: false, alpha: false, depth: false, stencil: false,
  premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power'
});
function showFallback() {
  const d = document.createElement('div'); d.className = 'fallback';
  const tick = () => { d.textContent = nowInfo().key; };
  tick(); setInterval(tick, 1000);
  document.body.appendChild(d);
  $date.textContent = nowInfo().date; $date.classList.add('on');
}
if (!gl) { showFallback(); return; }

const NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  float a = hash12(i), b = hash12(i + vec2(1., 0.)), c = hash12(i + vec2(0., 1.)), d = hash12(i + vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float s = 0., a = .5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = m * p; a *= .5; }
  return s;
}`;

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0., 1.); }`;

/* Plaster height + normal, rendered once per (debounced) resize. */
const FRAG_PLASTER = `
precision highp float;
uniform float uDpr;
uniform float uH;
${NOISE}
float height(vec2 q){
  float h = 0.52 * fbm(q / 300.);
  vec2 r = vec2(q.x * .82 + q.y * .57, -q.x * .57 + q.y * .82);
  h += 0.22 * fbm(r / vec2(84., 17.));
  h += 0.14 * vnoise(q / 5.2);
  h += 0.05 * vnoise(q / 1.7);
  float pit = smoothstep(.80, .93, vnoise(q / 3.4 + 19.7));
  h -= 0.16 * pit * vnoise(q / 11. + 3.);
  return h;
}
void main(){
  vec2 q = vec2(gl_FragCoord.x, uH - gl_FragCoord.y) / uDpr;
  float e = .8;
  float h0 = height(q);
  float hx = height(q + vec2(e, 0.));
  float hy = height(q - vec2(0., e));
  vec2 n = vec2(h0 - hx, h0 - hy) * 4.2;
  float mottle = fbm(q / 520. + vec2(7.3, 1.1));
  gl_FragColor = vec4(clamp(h0, 0., 1.), clamp(n * .5 + .5, 0., 1.), mottle);
}`;

/* Digit mask crossfade: an organic dissolve, as if leaves rearranged. */
const FRAG_MIX = `
precision mediump float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec3 uX;   /* progress, aspect, unused */
uniform vec2 uRes;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 q = uv * vec2(uX.y, 1.);
  float n = .68 * vnoise(q * 4.5 + 2.3) + .32 * vnoise(q * 13. + 7.1);
  float k = smoothstep(n - .25, n + .25, uX.x * 1.5 - .25);
  gl_FragColor = mix(texture2D(uA, uv), texture2D(uB, uv), k);
}`;

/* Light field: direct light through the canopy, with the time opening it. */
const FRAG_LIGHT = `
precision highp float;
uniform vec4 uView;    /* origin.xy (light px), scale (light px per unit), time */
uniform vec4 uSunG;    /* parallax.xy, gustX, gustAmp */
uniform vec4 uSway;    /* far.xy, mid.xy */
uniform vec4 uMisc;    /* gustDir, flutterBase, haze, outside openness */
uniform vec4 uAxis;    /* ellipse axis.xy, sqrt(elongation), softness */
uniform vec4 uMaskM;   /* halfW, yBot, 1/(2 halfW), 1/(0.5 - yBot) */
uniform vec4 uShad;    /* near shadow offset.xy, near blur, breathing */
uniform vec2 uBrSc;
uniform vec4 uLA[16];
uniform vec4 uWA[8];
uniform vec4 uJA[4];
uniform vec4 uLB[12];
uniform vec4 uWB[6];
uniform vec4 uJB[3];
uniform sampler2D uMask;
${NOISE}

float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(hash11(i), hash11(i + 1.), f); }
float gapLo(vec2 p){
  vec2 x = p * .92 + vec2(3.1, 7.7);
  return .5 * vnoise(x) + .25 * vnoise(mat2(1.6, 1.2, -1.2, 1.6) * x) + .094;
}
vec2 muv(vec2 q){ return vec2((q.x + uMaskM.x) * uMaskM.z, (q.y - uMaskM.y) * uMaskM.w); }

/* one pinhole image: area-preserving ellipse along the sun axis, soft rim */
float spot(vec2 dv, vec2 ax, float sel, float r, float soft){
  vec2 pr = vec2(-ax.y, ax.x);
  float e = length(vec2(dot(dv, ax) / sel, dot(dv, pr) * sel)) / r;
  return (1. - smoothstep(1. - soft, 1., e)) * (1. - .08 * e * e);
}

/* sparse canopy pinholes */
float spots(vec2 p, vec2 toGap, float sc, float rmin, float rmax, float soft, float seed,
            vec2 ax, float sel, float flut, float t, float open){
  vec2 q = p * sc;
  vec2 ci = floor(q), cf = fract(q);
  float acc = 0.;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 c = ci + o;
      float k = hash12(c * 1.37 + seed * 3.1);
      float dens = (.16 + .84 * smoothstep(.40, .58, gapLo((c + .5) / sc + toGap))) * open;
      if (k > dens * .85) continue;
      vec2 h = hash22(c + seed);
      float ph = k * 61.7;
      vec2 wob = vec2(n1(t * (1.1 + h.x) + ph), n1(t * (.9 + h.y) + ph + 17.)) * 2. - 1.;
      vec2 dv = o + .5 + (h - .5) * .72 + flut * .07 * wob - cf;
      float fl = n1(t * (.5 + 1.4 * h.x) + ph * 1.7);
      float opn = 1. - (.10 + .55 * flut) * smoothstep(.45, .9, fl) * step(.45, h.x);
      acc += spot(dv, ax, sel, mix(rmin, rmax, h.y), soft) * opn * (.55 + .45 * fract(k * 13.7 + h.x * 3.1));
    }
  }
  return acc;
}

/* dense pinholes where the canopy opens into the digits; existence per cell from the mask */
float dspots(vec2 p, vec2 toMask, float sc, float seed, vec2 ax, float sel, float soft, float flut, float t){
  vec2 q = p * sc;
  vec2 ci = floor(q), cf = fract(q);
  float acc = 0.;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 c = ci + o;
      vec2 h = hash22(c + seed);
      vec2 jit = (h - .5) * .86;
      float md = texture2D(uMask, muv((c + .5 + jit) / sc + toMask)).r;
      float k = hash12(c * 1.37 + seed * 3.1);
      if (k > smoothstep(.12, .60, md) * .9) continue;
      float ph = k * 61.7;
      vec2 wob = vec2(n1(t * (1.1 + h.x) + ph), n1(t * (.9 + h.y) + ph + 17.)) * 2. - 1.;
      vec2 dv = o + .5 + jit + flut * .09 * wob - cf;
      float fl = n1(t * (.6 + 1.2 * h.y) + ph * 1.3);
      float opn = 1. - (.08 + .4 * flut) * smoothstep(.5, .92, fl) * step(.5, h.y);
      float r = mix(.24, .62, h.y * h.y * h.y);
      acc += spot(dv, ax, sel, r, min(soft * 1.7, .8)) * opn * (.38 + .62 * fract(k * 13.7 + h.x * 3.1)) * (.5 + .5 * smoothstep(.25, .8, md));
    }
  }
  return acc;
}

float clusters(vec2 p, float sc, float seed, float flut, float t){
  vec2 q = p * sc;
  vec2 ci = floor(q), cf = fract(q);
  float cov = 0.;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 c = ci + o;
      float k = hash12(c * 1.71 + seed);
      float dn = vnoise(c * .23 + seed * .7);
      if (k > smoothstep(.22, .78, dn) * .95) continue;
      vec2 h = hash22(c * 1.13 + seed);
      vec2 wob = vec2(n1(t * .8 + k * 40.), n1(t * .7 + k * 57.)) * 2. - 1.;
      vec2 dv = cf - (o + .5 + (h - .5) * .8 + flut * .05 * wob);
      float ang = h.x * 6.283 + .22 * flut * (n1(t * .6 + k * 23.) * 2. - 1.);
      vec2 cs = vec2(cos(ang), sin(ang));
      vec2 rv = vec2(dot(dv, cs), dot(dv, vec2(-cs.y, cs.x)));
      float rx = mix(.45, .80, h.y);
      float ry = rx * mix(.35, .62, k / .95);
      float e = length(rv / vec2(rx, ry));
      cov = max(cov, 1. - smoothstep(.55, 1., e));
    }
  }
  return cov;
}

float leafCov(vec2 p, vec4 L, vec2 W, float soft){
  float len = length(L.zw);
  vec2 cs = L.zw / len;
  vec2 d = p - L.xy;
  vec2 bc = d - cs * (len * .4);
  float rr = len * .64 + soft * 2.;
  if (dot(bc, bc) > rr * rr) return 0.;
  vec2 q = vec2(cs.x * d.x + cs.y * d.y, -cs.y * d.x + cs.x * d.y);
  float u = clamp(q.x / len, 0., 1.);
  float w = len * .74 * W.x * pow(max(u, 1e-4), .5) * pow(max(1. - u, 1e-4), .85);
  float qy = q.y - len * W.y * u * u * .3;
  float dl = max(abs(qy) - w, max(-q.x, q.x - len));
  float pet = len * .2;
  float dp = max(abs(q.y) - .0011, max(-q.x - pet, q.x));
  return 1. - smoothstep(-soft, soft, min(dl, dp));
}

float segCov(vec2 p, vec2 a, vec2 b, float th, float soft){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return 1. - smoothstep(-soft, soft, length(pa - ba * h) - th);
}

void main(){
  vec2 p = (gl_FragCoord.xy - uView.xy) / uView.z;
  float t = uView.w;
  vec2 sun = uSunG.xy;
  float gdir = uMisc.x;
  float open = uMisc.w;

  float gx = (p.x - uSunG.z) * 1.5;
  float g = uSunG.w * exp(-gx * gx) * (.7 + .6 * vnoise(p * 1.4 - vec2(t * .21 * gdir, 0.)));
  vec2 gv = vec2(gdir, .32) * g;
  float flut = uMisc.y + .78 * clamp(g * 1.3, 0., 1.);

  vec2 ax = uAxis.xy;
  float sel = uAxis.z;
  float soft = uAxis.w + .2 * uMisc.z;
  vec2 drift = vec2(t * .0009, t * .0004);

  /* the written time sways and breathes with the mid canopy */
  vec2 br = vec2(vnoise(p * 2.3 + vec2(t * .11, 1.3)), vnoise(p * 2.3 + vec2(4.7, -t * .09))) - .5;
  vec2 woff = uSway.zw * 1.2 + gv * .03 + br * .03 * uShad.w;
  vec4 M = texture2D(uMask, muv(p + woff));
  float m = smoothstep(.12, .80, M.r);
  /* leaf clusters thin the opening unevenly, so the digits are only ever half there */
  float er = vnoise(p * 3.1 + vec2(t * .015, 2.7)) * .65 + vnoise(p * 7.3 + 5.1) * .35;
  m *= .55 + .45 * smoothstep(.25, .66, er);
  float halo = M.g;
  float zone = smoothstep(.04, .42, M.b);

  /* far canopy: gaps + sparse pinholes, kept away from the digits' surroundings */
  vec2 pf = p + sun * .10 + uSway.xy + gv * .016 + drift;
  float gapN = fbm(pf * .92 + vec2(3.1, 7.7)) + .05 * p.x + .03 * p.y;
  float gap = smoothstep(.64, .82, gapN) * (.25 + 1.2 * open) * (1. - .5 * max(zone, halo));
  float s1 = spots(pf, vec2(0.), 5.2, .31, .36, soft, 1., ax, sel, flut, t, open) * .8 * (1. - .85 * max(halo, .75 * zone));
  vec2 pf2 = p + sun * .07 + uSway.xy * 1.45 + gv * .026 + drift * .7;
  float s2 = spots(pf2, pf - pf2, 10.5, .31, .36, soft, 17., ax, sel * .97, flut, t, open) * (1. - .6 * max(halo, .45 * zone));
  float far = gap + (1. - gap) * (s1 + .7 * s2);

  /* the opening: many small pinhole images clustered inside the digits */
  vec2 pd = p + sun * .05 + uSway.zw * .9 + gv * .02 + drift * .5;
  float ds = .8 * dspots(pd, p - pd + woff, 23., 5., ax, sel, soft, flut, t);
  float fillN = .6 * vnoise(pd * 9. + 3.) + .4 * vnoise(pd * 23. + 11.);
  float fill = m * (.10 + .12 * smoothstep(.3, .85, fillN));
  far += (ds + fill) * (1. - .45 * min(far, 1.));

  vec2 pm = p + sun * .05 + uSway.zw + gv * .03 + drift * .5;
  float mid = max(clusters(pm, 4.2, 3.7, flut, t), .9 * clusters(pm + vec2(.37, .11), 8.6, 11.3, flut, t));
  mid *= (.55 + .45 * (1. - open)) * (1. - .4 * m);

  /* near branches; their shadows stretch with a low sun */
  vec2 pn = p + uShad.xy;
  float nA = 0., nB = 0.;
  float sA = .0030 * uShad.z, sB = .018 * uShad.z;
  for (int i = 0; i < 8; i++) {
    vec4 W = uWA[i];
    nA = max(nA, leafCov(pn, uLA[2 * i], W.xy, sA));
    nA = max(nA, leafCov(pn, uLA[2 * i + 1], W.zw, sA));
  }
  for (int i = 0; i < 3; i++) {
    vec4 J = uJA[i], K = uJA[i + 1];
    float f0 = float(2 * i);
    nA = max(nA, segCov(pn, J.xy, J.zw, mix(.0052, .0018, f0 / 6.) * uBrSc.x, .0026 * uShad.z));
    nA = max(nA, segCov(pn, J.zw, K.xy, mix(.0052, .0018, (f0 + 1.) / 6.) * uBrSc.x, .0026 * uShad.z));
  }
  nA = max(nA, segCov(pn, uJA[3].xy, uJA[3].zw, .0018 * uBrSc.x, .0026 * uShad.z));
  vec2 pnB = p + uShad.xy * 1.6;
  for (int i = 0; i < 6; i++) {
    vec4 W = uWB[i];
    nB = max(nB, leafCov(pnB, uLB[2 * i], W.xy, sB));
    nB = max(nB, leafCov(pnB, uLB[2 * i + 1], W.zw, sB));
  }
  for (int i = 0; i < 2; i++) {
    vec4 J = uJB[i], K = uJB[i + 1];
    float f0 = float(2 * i);
    nB = max(nB, segCov(pnB, J.xy, J.zw, mix(.0065, .003, f0 / 4.) * uBrSc.y, .016 * uShad.z));
    nB = max(nB, segCov(pnB, J.zw, K.xy, mix(.0065, .003, (f0 + 1.) / 4.) * uBrSc.y, .016 * uShad.z));
  }
  nB = max(nB, segCov(pnB, uJB[2].xy, uJB[2].zw, .003 * uBrSc.y, .016 * uShad.z));
  nA *= 1. - .12 * m;
  nB *= 1. - .18 * m;

  float S = far * (1. - mid * .88) * (1. - nA * .9) * (1. - nB * .45);
  float tr = min(far, 1.) * (1. - mid) * max(nA * .9, nB * .3);

  float dith = (hash12(gl_FragCoord.xy + fract(t * 7.3) * 91.7) - .5) / 255.;
  gl_FragColor = vec4(S * .5 + dith, tr + dith, halo, 1.);
}`;

/* Composite: plaster, sky fill, sun of the hour, passing cloud, lens, grain. */
const FRAG_COMP = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uPl;
uniform float uDpr;
uniform float uGrainT;
uniform vec3 uSunC;
uniform vec3 uAmb;
uniform vec3 uFadeC;
uniform float uFade;
uniform vec4 uCloud;   /* seconds since change, down, hold, up */
uniform vec2 uCloud2;  /* depth, sweep lag */
uniform vec2 uRelD;
uniform vec2 uGlow;    /* bounce glow, vignette */
uniform sampler2D uLight;
uniform sampler2D uPlaster;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 fromC = uv - .5;

  vec2 ca = fromC * .0022;
  float Sr = texture2D(uLight, uv + ca).r * 2.;
  vec3  Lg = texture2D(uLight, uv).rgb;
  float Sg = Lg.r * 2.;
  float Sb = texture2D(uLight, uv - ca).r * 2.;
  vec3 S = min(vec3(Sr, Sg, Sb), 1.45);
  float tr = Lg.g;
  float halo = Lg.b;

  vec2 pc = vec2(gl_FragCoord.x, uPl.y - (uRes.y - gl_FragCoord.y));
  vec4 P = texture2D(uPlaster, pc / uPl);
  float h = P.r;
  vec2 n = P.gb * 2. - 1.;
  float mottle = P.a;
  float relief = dot(n, uRelD);

  vec3 alb = vec3(.85, .815, .76) * (.955 + .09 * h);
  alb *= mix(vec3(1.0, .985, .955), vec3(.965, .972, .985), smoothstep(.3, .7, mottle));

  vec3 amb = uAmb * (1. + .10 * n.y + .06 * (h - .5));
  amb *= mix(vec3(1.05, 1.0, .93), vec3(.97, 1.0, 1.045), smoothstep(0., 1., uv.y));

  /* a cloud passes on the minute: its soft edge sweeps across the wall */
  float s = uCloud.x - uCloud2.y * (uv.x * .85 + .15 * (1. - uv.y) + .12 * mottle);
  float env = smoothstep(0., uCloud.y, s) * (1. - smoothstep(uCloud.y + uCloud.z, uCloud.y + uCloud.z + uCloud.w, s));
  vec3 sunC = uSunC * (1. - uCloud2.x * env);

  float Sc = clamp(Sg, 0., 1.);
  float pen = 4. * Sc * (1. - Sc);
  vec3 sunP = sunC * mix(vec3(1.), vec3(1.05, .965, .88), pen);
  vec3 direct = S * clamp(1. + relief * 1.1, .5, 1.6);

  vec3 col = alb * (amb + sunP * direct);
  col += alb * vec3(.34, .40, .07) * tr * .16 * dot(sunC, vec3(.33));
  col += alb * sunC * uGlow.x * halo * .2;

  col = vec3(1.) - exp(-col * 1.12);
  col = pow(col, vec3(1. / 2.2));

  vec2 vc = fromC * vec2(uRes.x / uRes.y, 1.) * .9;
  col *= 1. - uGlow.y * pow(dot(vc, vc), 1.15);

  float lum = dot(col, vec3(.299, .587, .114));
  vec2 gp = floor(gl_FragCoord.xy / (uDpr * 1.5));
  float gr = hash12(gp + fract(uGrainT * .1373) * 173.1) + hash12(gp * 1.31 - fract(uGrainT * .0719) * 91.3) - 1.;
  col += gr * .011 * (1. - lum * .6);

  col = mix(uFadeC, col, uFade);
  gl_FragColor = vec4(col, 1.);
}`;

const VERT_MOTE = `
attribute vec4 aPos;
varying float vA;
void main(){ gl_Position = vec4(aPos.xy, 0., 1.); gl_PointSize = aPos.z; vA = aPos.w; }`;
const FRAG_MOTE = `
precision mediump float;
uniform vec3 uCol;
varying float vA;
void main(){
  float r = length(gl_PointCoord - .5) * 2.;
  float a = 1. - smoothstep(.0, 1., r);
  a *= a;
  gl_FragColor = vec4(uCol * a * vA, 1.);
}`;

/* ------------------------------------------------------------------ */
/*  GL plumbing                                                       */
/* ------------------------------------------------------------------ */

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(log);
  }
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const cache = {};
  return { p, u: name => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(p, name))) };
}

let progPlaster, progLight, progComp, progMote, progMix, triBuf, moteBuf;
let lightFBO = null, plasterFBO = null, mixFBO = null, maskTex = [null, null];

function texParams() {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
function makeTarget(w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  texParams();
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb, w, h };
}
function freeTarget(t) { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } }

function initGL() {
  progPlaster = program(VERT, FRAG_PLASTER);
  progLight = program(VERT, FRAG_LIGHT);
  progComp = program(VERT, FRAG_COMP);
  progMix = program(VERT, FRAG_MIX);
  progMote = program(VERT_MOTE, FRAG_MOTE);
  triBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  moteBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
  gl.bufferData(gl.ARRAY_BUFFER, moteData.byteLength, gl.DYNAMIC_DRAW);
  for (let i = 0; i < 2; i++) {
    maskTex[i] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, maskTex[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    texParams();
  }
  gl.disable(gl.DEPTH_TEST);
  lightFBO = plasterFBO = mixFBO = null;
  needsResize = true;
}

function drawTri() {
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ------------------------------------------------------------------ */
/*  The time, drawn as a mask                                         */
/* ------------------------------------------------------------------ */

const FONT_STACK = '"Avenir Next", "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif';
const mcv = document.createElement('canvas');
const mctx = mcv.getContext('2d');
const MASK_H = 360;

function drawMask(key) {
  const mh = MASK_H, mw = Math.max(64, Math.min(1400, Math.round(MASK_H * cssW / cssH)));
  if (mcv.width !== mw) mcv.width = mw;
  if (mcv.height !== mh) mcv.height = mh;
  const c = mctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
  c.fillStyle = '#000';
  c.fillRect(0, 0, mw, mh);

  /* measure at 100px, then scale: digits ~31% of the height, at most 84% of the width */
  c.font = `600 100px ${FONT_STACK}`;
  let adv = 0;
  for (let d = 0; d < 10; d++) adv = Math.max(adv, c.measureText(String(d)).width);
  const mt = c.measureText('0');
  const asc = mt.actualBoundingBoxAscent || 72;
  const colW = c.measureText(':').width;
  const track = 4;
  const colAdv = colW + 14;
  const total100 = adv * 4 + colAdv + track * 3;
  const fs = Math.min((0.31 * mh) / (asc / 100), (0.84 * mw) / (total100 / 100));
  const k = fs / 100;
  const baseline = 0.455 * mh + (asc * k) / 2;
  let x = mw / 2 - (total100 * k) / 2;
  const glyphs = [];
  for (let i = 0; i < key.length; i++) {
    const ch = key[i];
    const w = ch === ':' ? colAdv * k : adv * k;
    const cw = c.measureText(ch).width * k;
    glyphs.push([ch, x + (w - cw) / 2]);
    x += w + (ch === ':' ? 0 : track * k);
  }
  const paint = (style, blur, extra) => {
    c.font = `600 ${fs}px ${FONT_STACK}`;
    c.filter = blur > 0 ? `blur(${blur}px)` : 'none';
    c.fillStyle = style; c.strokeStyle = style;
    c.lineJoin = 'round'; c.lineWidth = extra;
    for (const [ch, gx] of glyphs) {
      c.fillText(ch, gx, baseline);
      if (extra > 0) c.strokeText(ch, gx, baseline);
    }
  };
  /* R: the letterform, slightly rounded and softened; G: a halo; B: a broad zone */
  paint('rgb(255,0,0)', fs * 0.055, fs * 0.02);
  c.globalCompositeOperation = 'lighter';
  paint('rgb(0,255,0)', fs * 0.14, fs * 0.05);
  paint('rgb(0,0,255)', fs * 0.34, fs * 0.12);   /* B: a broad zone kept clear of big gaps */
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
}
function uploadMask(i, key) {
  drawMask(key);
  gl.bindTexture(gl.TEXTURE_2D, maskTex[i]);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mcv);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  if (!mixFBO || mixFBO.w !== mcv.width || mixFBO.h !== mcv.height) {
    freeTarget(mixFBO);
    mixFBO = makeTarget(mcv.width, mcv.height);
  }
  mixDirty = true;
}

/* ------------------------------------------------------------------ */
/*  Sizing                                                            */
/* ------------------------------------------------------------------ */

let W = 1, H = 1, dpr = 1, cssW = 1, cssH = 1, layoutH = 1, lastCssW = -1;
let halfW = 0.5, yBot = -0.5, needsResize = true;
let plasterDirty = false, plasterTimer = 0, mixDirty = true;
let quality = 1;

function makeLightTarget() {
  const lh = Math.max(240, Math.round(Math.min(H, Math.max(520, Math.round(H * 0.5)), 900) * quality));
  const lw = Math.max(1, Math.round(lh * W / H));
  freeTarget(lightFBO);
  lightFBO = makeTarget(lw, lh);
}
function renderPlaster() {
  freeTarget(plasterFBO);
  plasterFBO = makeTarget(W, H);
  gl.bindFramebuffer(gl.FRAMEBUFFER, plasterFBO.fb);
  gl.viewport(0, 0, W, H);
  gl.useProgram(progPlaster.p);
  gl.uniform1f(progPlaster.u('uDpr'), dpr);
  gl.uniform1f(progPlaster.u('uH'), H);
  drawTri();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  plasterDirty = false;
}
function resize() {
  needsResize = false;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  cssW = Math.max(1, canvas.clientWidth || window.innerWidth);
  cssH = Math.max(1, canvas.clientHeight || window.innerHeight);
  if (!(cssW === lastCssW && Math.abs(cssH - layoutH) / layoutH < 0.2)) layoutH = cssH;
  lastCssW = cssW;
  halfW = 0.5 * cssW / layoutH;
  yBot = 0.5 - cssH / layoutH;

  const nW = Math.max(1, Math.round(cssW * dpr)), nH = Math.max(1, Math.round(cssH * dpr));
  const changed = nW !== W || nH !== H;
  W = nW; H = nH;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;

  makeLightTarget();
  layoutBranches();
  uploadMask(0, shownKey);
  if (trans.active) uploadMask(1, trans.to);

  if (!plasterFBO) plasterDirty = true;
  else if (changed) {
    clearTimeout(plasterTimer);
    plasterTimer = setTimeout(() => { plasterDirty = true; }, 150);
  }
}
window.addEventListener('resize', () => { needsResize = true; });
function watchDpr() {
  if (!window.matchMedia) return;
  try {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const onChange = () => { needsResize = true; watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange, { once: true });
  } catch (e) { /* ignore */ }
}
watchDpr();

/* reduced motion: much slower wind, no gusts, near-instant change of minute */
let motion = 1;
if (window.matchMedia) {
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => { motion = rm.matches ? 0.25 : 1; };
  apply();
  if (rm.addEventListener) rm.addEventListener('change', apply);
}

/* ------------------------------------------------------------------ */
/*  Small math                                                        */
/* ------------------------------------------------------------------ */

function mulberry(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function h2(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
function vn(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function sn1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = h2(i, 0.37), b = h2(i + 1, 0.37);
  return (a + (b - a) * u) * 2 - 1;
}
function spring(s, target, omega, zeta, dt) {
  const acc = omega * omega * (target - s.x) - 2 * zeta * omega * s.v;
  s.v += acc * dt; s.x += s.v * dt;
}

/* ------------------------------------------------------------------ */
/*  Branches                                                          */
/* ------------------------------------------------------------------ */

function makeBranch(opts, nLeaves, seed) {
  const r = mulberry(seed);
  const leaves = [];
  for (let k = 0; k < nLeaves; k++) {
    const s = clamp(0.14 + 0.86 * (k + 0.9 * r()) / nLeaves, 0, 0.995);
    const tip = s > 0.9;
    const side = (k % 2 === 0 ? 1 : -1) * (r() < 0.18 ? -1 : 1);
    leaves.push({
      s, side,
      off: side * (tip ? 0.1 + 0.35 * r() : 0.4 + 0.75 * r()),
      len: opts.leafLen * (0.66 + 0.5 * r()) * (1 - 0.15 * s),
      wf: 0.8 + 0.4 * r(),
      curl: (r() - 0.5) * 0.7,
      twist0: (r() - 0.5) * 1.2,
      fq: 2.2 + 3.0 * r(),
      fq2: 0.7 + 0.9 * r(),
      ph: r() * 97.3,
      droop: 0.10 + 0.22 * r(),
    });
  }
  const n = opts.lens.length;
  let wsum = 0;
  for (let i = 0; i < n; i++) wsum += 0.25 + 0.22 * i;
  return Object.assign({ leaves, bend: { x: 0, v: 0 }, wsum, ang: new Float32Array(n), sc: 1, ax: 0, ay: 0, a0: 0 }, opts);
}

/* a dominant branch from the upper-right corner, a softer one along the top-left */
const branchA = makeBranch({
  lens: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07],
  curve: [0.0, -0.10, -0.08, 0.06, 0.10, 0.08, 0.05],
  leafLen: 0.088, parallax: 0.02, flex: 1.0, cap: 0.20, seed: 3.7
}, 16, 71);
const branchB = makeBranch({
  lens: [0.14, 0.12, 0.10, 0.09, 0.08],
  curve: [0.0, -0.10, -0.05, 0.08, 0.10],
  leafLen: 0.085, parallax: 0.035, flex: 0.7, cap: 0.16, seed: 9.1
}, 12, 1337);

function layoutBranches() {
  const portrait = smooth(1.25, 0.65, 2 * halfW);
  branchA.sc = clamp(2 * halfW * 0.66 / 0.80, 0.45, 1);
  branchA.ax = halfW + 0.09 * branchA.sc;
  branchA.ay = 0.46 + 0.06 * portrait;
  branchA.a0 = Math.PI * (1.08 + 0.10 * portrait);
  branchB.sc = clamp(2 * halfW * 0.6 / 0.55, 0.5, 1);
  branchB.ax = -halfW - 0.03;
  branchB.ay = 0.60;
  branchB.a0 = -0.15 - 0.2 * portrait;
}

const leafA = new Float32Array(16 * 4), leafWA = new Float32Array(8 * 4), jointA = new Float32Array(8 * 2);
const leafB = new Float32Array(12 * 4), leafWB = new Float32Array(6 * 4), jointB = new Float32Array(6 * 2);

function flutterAt(x) { return motion * 0.22 + 0.78 * clamp(gustAt(x) * 1.3, 0, 1); }

function poseBranch(B, t, sunX, sunY, leafArr, wArr, jArr) {
  const sc = B.sc, n = B.lens.length;
  let x = B.ax + sunX * B.parallax, y = B.ay + sunY * B.parallax, a = B.a0;
  const fB = flutterAt(B.ax);
  const micro = fB * (0.010 * sn1(t * 0.9 + B.seed) + 0.005 * sn1(t * 2.1 + B.seed * 7.3));
  const total = (B.bend.x + micro) * B.flex * B.wsum;
  const capped = B.cap * Math.tanh(total / B.cap);
  const per = capped / B.wsum;
  jArr[0] = x; jArr[1] = y;
  for (let i = 0; i < n; i++) {
    a += B.curve[i] + per * (0.25 + 0.22 * i);
    B.ang[i] = a;
    x += Math.cos(a) * B.lens[i] * sc;
    y += Math.sin(a) * B.lens[i] * sc;
    jArr[(i + 1) * 2] = x; jArr[(i + 1) * 2 + 1] = y;
  }
  const leafBend = per * 2.4;
  const down = -Math.PI / 2;
  const leaves = B.leaves;
  for (let k = 0; k < leaves.length; k++) {
    const L = leaves[k];
    const fs = L.s * n;
    const i = Math.min(n - 1, Math.floor(fs)), f = fs - i;
    const x0 = jArr[i * 2], y0 = jArr[i * 2 + 1];
    const px = x0 + (jArr[i * 2 + 2] - x0) * f, py = y0 + (jArr[i * 2 + 3] - y0) * f;
    const fl = flutterAt(px);
    const flt = fl * (0.22 * sn1(t * L.fq * 0.55 + L.ph) + 0.08 * sn1(t * L.fq * 1.6 + L.ph * 3.1));
    let ang = B.ang[i] + L.off + flt + leafBend;
    ang += Math.atan2(Math.sin(down - ang), Math.cos(down - ang)) * L.droop;
    const len = L.len * sc;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pet = len * 0.2;
    const twist = L.twist0 + fl * 1.1 * sn1(t * L.fq2 * 0.8 + L.ph * 2.3) + 0.25 * sn1(t * 0.3 + L.ph * 5.1);
    const wf = L.wf * (0.45 + 0.55 * Math.abs(Math.cos(twist)));
    const o = k * 4;
    leafArr[o] = px + ca * pet; leafArr[o + 1] = py + sa * pet;
    leafArr[o + 2] = ca * len; leafArr[o + 3] = sa * len;
    const w = (k >> 1) * 4 + (k & 1) * 2;
    wArr[w] = wf; wArr[w + 1] = L.curl;
  }
}

/* ------------------------------------------------------------------ */
/*  Wind                                                              */
/* ------------------------------------------------------------------ */

const wind = {
  gustX: -99, gustAmp: 0, gustStart: 0, gustDur: 6, gustA: 0, nextGust: 6 + Math.random() * 6, gustDir: 1,
  far: { x: 0, v: 0 }, farY: { x: 0, v: 0 }, mid: { x: 0, v: 0 }, midY: { x: 0, v: 0 }
};
function baseWind(t) {
  return 0.55 * Math.sin(t * 0.21) + 0.30 * Math.sin(t * 0.53 + 1.3) + 0.15 * Math.sin(t * 1.17 + 0.4) + 0.25 * (vn(t * 0.15, 3.7) - 0.5);
}
function gustAt(x) { const d = (x - wind.gustX) * 1.5; return wind.gustAmp * Math.exp(-d * d); }
const push = { x: 0, y: 0 };   /* wind nudged by the pointer */
function updateWind(t, dt) {
  if (motion === 1 && t > wind.nextGust && wind.gustAmp < 0.001) {
    wind.gustStart = t;
    wind.gustDur = 5.5 + Math.random() * 3.5;
    wind.gustA = 0.55 + Math.random() * 0.45;
    wind.gustDir = Math.random() < 0.78 ? 1 : -1;
    wind.nextGust = t + wind.gustDur + 9 + Math.random() * 14;
  }
  const prog = (t - wind.gustStart) / wind.gustDur;
  const span = halfW + 0.9;
  if (prog >= 0 && prog <= 1) {
    wind.gustX = wind.gustDir * (-span + 2 * span * prog);
    wind.gustAmp = motion * wind.gustA * Math.pow(Math.sin(Math.PI * prog), 0.8);
  } else { wind.gustAmp = 0; wind.gustX = -99; }

  push.x *= Math.exp(-dt / 1.6); push.y *= Math.exp(-dt / 1.6);
  const amp = motion === 1 ? 1 : 0.45;
  const b = baseWind(t) * amp, b2 = baseWind(t * 0.83 + 40) * amp;
  const gMid = gustAt(0);
  spring(wind.far, 0.010 * b + 0.012 * gMid * wind.gustDir + 0.006 * push.x, 0.7, 0.55, dt);
  spring(wind.farY, 0.004 * b2 + 0.004 * gMid + 0.003 * push.y, 0.6, 0.55, dt);
  spring(wind.mid, 0.013 * b + 0.018 * gMid * wind.gustDir + 0.009 * push.x, 1.1, 0.55, dt);
  spring(wind.midY, 0.005 * b2 + 0.005 * gMid + 0.004 * push.y, 0.9, 0.55, dt);

  spring(branchA.bend, 0.030 * b + 0.05 * gustAt(branchA.ax - 0.3 * branchA.sc) * wind.gustDir + 0.02 * push.x, 1.9, 0.55, dt);
  spring(branchB.bend, -0.024 * b2 - 0.035 * gustAt(branchB.ax + 0.3 * branchB.sc) * wind.gustDir - 0.015 * push.x, 1.4, 0.55, dt);
}

/* ------------------------------------------------------------------ */
/*  Dust motes                                                        */
/* ------------------------------------------------------------------ */

const MOTES = 48;
const moteData = new Float32Array(MOTES * 4);
const motes = [];
{
  const r = mulberry(9001);
  for (let i = 0; i < MOTES; i++) {
    motes.push({ x: (r() - 0.5) * 3, y: r() - 0.5, z: r(), ph: r() * 6.283, ph2: r() * 6.283, sp: 0.4 + r() * 0.8, gl: r() * 6.283 });
  }
}
function updateMotes(t, dt, amt) {
  const hw = halfW + 0.05;
  const yLo = yBot - 0.05, yHi = 0.55, ySpan = yHi - yLo;
  const yRange = 0.5 - yBot;
  for (let i = 0; i < MOTES; i++) {
    const m = motes[i];
    const depth = 0.45 + m.z * 1.1;
    const vx = (0.0045 * Math.sin(t * 0.11 * m.sp + m.ph) + 0.0025 * Math.sin(t * 0.37 * m.sp + m.ph2)) * depth
             + gustAt(m.x) * 0.035 * wind.gustDir * depth + push.x * 0.004 * depth;
    const vy = (0.0028 + 0.004 * Math.sin(t * 0.14 * m.sp + m.ph2) + 0.0015 * Math.sin(t * 0.51 + m.ph)) * depth;
    m.x += vx * dt * motion; m.y += vy * dt * motion;
    if (m.x > hw) m.x -= 2 * hw;
    if (m.x < -hw) m.x += 2 * hw;
    if (m.y > yHi) { m.y -= ySpan; m.x = (Math.random() - 0.5) * 2 * hw; }
    if (m.y < yLo) m.y += ySpan;
    const blur = Math.abs(m.z - 0.38);
    const size = (1.1 + blur * blur * 70 + m.z * 1.2) * dpr;
    const beam = smooth(0.54, 0.74, vn(m.x * 1.3 + t * 0.012, m.y * 1.3 - t * 0.008 + 5.1));
    const glint = 0.55 + 0.45 * Math.pow(Math.sin(t * (0.6 + m.sp) + m.gl) * 0.5 + 0.5, 3);
    const energy = 0.36 / (1 + blur * blur * 26);
    moteData[i * 4] = m.x / halfW;
    moteData[i * 4 + 1] = ((m.y - yBot) / yRange) * 2 - 1;
    moteData[i * 4 + 2] = size;
    moteData[i * 4 + 3] = beam * glint * energy * amt;
  }
}

/* ------------------------------------------------------------------ */
/*  Pointer: a light touch on the wind and the sun                    */
/* ------------------------------------------------------------------ */

const pointer = { x: 0, y: 0, last: -1e9, px: null, py: null, pt: 0 };
const sunX = { x: 0, v: 0 }, sunY = { x: 0, v: 0 };
let engage = 0, clock = 0;
function onPoint(cx, cy) {
  const x = clamp((cx / cssW) * 2 - 1, -1, 1);
  const y = clamp(-((cy / cssH) * 2 - 1), -1, 1);
  const now = performance.now();
  if (pointer.px !== null) {
    const dtp = Math.max(16, now - pointer.pt) / 1000;
    push.x = clamp(push.x + clamp((x - pointer.px) / dtp, -4, 4) * 0.08, -1, 1);
    push.y = clamp(push.y + clamp((y - pointer.py) / dtp, -4, 4) * 0.05, -1, 1);
  }
  pointer.px = x; pointer.py = y; pointer.pt = now;
  pointer.x = x; pointer.y = y; pointer.last = clock;
}
window.addEventListener('pointermove', e => onPoint(e.clientX, e.clientY), { passive: true });

function updateSun(t, dt) {
  const bx = 0.10 * Math.sin(t * 0.047) + 0.04 * Math.sin(t * 0.113 + 2.0);
  const by = 0.06 * Math.sin(t * 0.036 + 1.0);
  const want = (t - pointer.last) < 4 ? 1 : 0;
  engage = clamp(engage + clamp(want - engage, -dt / 2.2, dt / 2.2), 0, 1);
  const e = engage * engage * (3 - 2 * engage);
  spring(sunX, bx + pointer.x * 0.16 * e, 1.0, 1.0, dt);
  spring(sunY, by + pointer.y * 0.12 * e, 1.0, 1.0, dt);
}

/* ------------------------------------------------------------------ */
/*  Minute change: a cloud passes                                     */
/* ------------------------------------------------------------------ */

let shownKey = info.key;
const trans = { active: false, t0: 0, to: '' };
function transTiming() {
  return motion === 1
    ? { down: 0.8, hold: 0.3, up: 1.2, lag: 0.35, depth: 0.74, x0: 0.55, x1: 1.45 }
    : { down: 0.12, hold: 0.0, up: 0.25, lag: 0.0, depth: 0.2, x0: 0.0, x1: 0.25 };
}
function startTransition(key) {
  trans.active = true; trans.t0 = clock; trans.to = key;
  uploadMask(1, key);
}

/* ------------------------------------------------------------------ */
/*  Adaptive quality                                                  */
/* ------------------------------------------------------------------ */

let perfAcc = 0, perfN = 0, goodWins = 0, needGood = 4, lastUp = false, skipPerf = 0;
function adaptQuality(raw, t, perturbed, idle) {
  if (perturbed) { skipPerf = 3; return; }
  if (skipPerf > 0) { skipPerf--; return; }
  if (t < 4 || raw > 0.25 || raw <= 0) return;
  perfAcc += raw - (idle ? 1 / 30 - 1 / 60 : 0); perfN++;
  if (perfN < 60) return;
  const avg = perfAcc / perfN;
  perfAcc = 0; perfN = 0;
  if (avg > 0.026 && quality > 0.56) {
    quality = Math.max(0.55, quality * 0.85);
    if (lastUp) needGood = Math.min(64, needGood * 2);
    lastUp = false; goodWins = 0;
    makeLightTarget(); skipPerf = 3;
  } else if (avg < 0.0185) {
    if (quality < 1 && ++goodWins >= needGood) {
      quality = Math.min(1, quality / 0.85);
      lastUp = true; goodWins = 0;
      makeLightTarget(); skipPerf = 3;
    }
  } else goodWins = 0;
}

/* ------------------------------------------------------------------ */
/*  Frame                                                             */
/* ------------------------------------------------------------------ */

let lost = false;
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });
canvas.addEventListener('webglcontextrestored', () => {
  try { initGL(); lost = false; } catch (err) { console.warn(err); }
});

let lastDraw = -1e9, lastInfoAt = -1e9, shownDate = '';
function refreshInfo() {
  info = nowInfo();
  todL = lightAt(info.hour);
  fadeCol = applyWallCss(todL);
  if (info.date !== shownDate) { shownDate = info.date; $date.textContent = info.date; }
  canvas.setAttribute('aria-label', info.key);
}
refreshInfo();
setTimeout(() => $date.classList.add('on'), 900);

function frame(now) {
  requestAnimationFrame(frame);
  if (lost) return;
  /* ~30 fps when nothing is happening; full rate while arriving, changing or being touched */
  const idle = clock > 2.5 && !trans.active && (clock - pointer.last) > 2.5;
  const since = now - lastDraw;
  if (idle && since < 1000 / 30 - 4) return;
  const raw = since / 1000;
  const dt = Math.min(0.05, Math.max(0, raw));
  lastDraw = now;
  clock += dt;
  const t = clock;

  if (now - lastInfoAt > 250) { lastInfoAt = now; refreshInfo(); }
  if (!trans.active && info.key !== shownKey && !needsResize) startTransition(info.key);

  let perturbed = false;
  if (needsResize) { resize(); perturbed = true; }
  if (plasterDirty) { renderPlaster(); perturbed = true; }
  adaptQuality(raw, t, perturbed, idle);

  /* minute change progress */
  const T = transTiming();
  let tt = 1e4, xf = 0;
  if (trans.active) {
    tt = t - trans.t0;
    xf = smooth(T.x0, T.x1, tt);
    if (tt > T.down + T.hold + T.up + T.lag + 0.1) {
      trans.active = false;
      const tmp = maskTex[0]; maskTex[0] = maskTex[1]; maskTex[1] = tmp;
      shownKey = trans.to; xf = 0; tt = 1e4; mixDirty = true;
    } else mixDirty = true;
  }

  /* mask crossfade pass (only when something changed) */
  if (mixDirty) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, mixFBO.fb);
    gl.viewport(0, 0, mixFBO.w, mixFBO.h);
    gl.useProgram(progMix.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex[0]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex[1]);
    gl.uniform1i(progMix.u('uA'), 0);
    gl.uniform1i(progMix.u('uB'), 1);
    gl.uniform3f(progMix.u('uX'), xf, mixFBO.w / mixFBO.h, 0);
    gl.uniform2f(progMix.u('uRes'), mixFBO.w, mixFBO.h);
    drawTri();
    mixDirty = false;
  }

  const wt = motion === 1 ? t : t * 0.35;     /* reduced motion: the wind itself slows */
  updateWind(wt, dt * (motion === 1 ? 1 : 0.35));
  updateSun(t, dt);
  const L = todL;

  /* sun of the hour: ellipse axis, elongation, shadow throw */
  const ang = L.ang * Math.PI / 180;
  const axx = Math.cos(ang), axy = -Math.sin(ang);
  const sel = Math.sqrt(L.el);
  const throwLen = 0.022 * (L.el - 1);
  const sx = sunX.x + axx * (L.el - 1) * 0.08, sy = sunY.x + axy * (L.el - 1) * 0.08;
  const cloud = smooth(0.66, 0.92, vn(t * 0.018, 7.3)) * 0.6;
  const fade = smooth(0, 1.5, t);
  const fadeE = 1 - Math.pow(1 - fade, 3);

  poseBranch(branchA, wt, sunX.x, sunY.x, leafA, leafWA, jointA);
  poseBranch(branchB, wt, sunX.x, sunY.x, leafB, leafWB, jointB);

  /* light pass */
  gl.bindFramebuffer(gl.FRAMEBUFFER, lightFBO.fb);
  gl.viewport(0, 0, lightFBO.w, lightFBO.h);
  const P = progLight;
  const ls = lightFBO.h / cssH;
  gl.useProgram(P.p);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, mixFBO.tex);
  gl.uniform1i(P.u('uMask'), 2);
  gl.uniform4f(P.u('uView'), 0.5 * lightFBO.w, (cssH - 0.5 * layoutH) * ls, layoutH * ls, wt);
  gl.uniform4f(P.u('uSunG'), sx, sy, wind.gustX, wind.gustAmp);
  gl.uniform4f(P.u('uSway'), wind.far.x, wind.farY.x, wind.mid.x, wind.midY.x);
  gl.uniform4f(P.u('uMisc'), wind.gustDir, 0.22 * motion, cloud, L.open);
  gl.uniform4f(P.u('uAxis'), axx, axy, sel, L.soft);
  gl.uniform4f(P.u('uMaskM'), halfW, yBot, 1 / (2 * halfW), 1 / (0.5 - yBot));
  gl.uniform4f(P.u('uShad'), axx * throwLen, axy * throwLen, (0.8 + 0.7 * (L.el - 1)) * (1 + 5 * (L.soft - 0.25)), motion === 1 ? 1 : 0.4);
  gl.uniform2f(P.u('uBrSc'), branchA.sc, branchB.sc);
  gl.uniform4fv(P.u('uLA'), leafA);
  gl.uniform4fv(P.u('uWA'), leafWA);
  gl.uniform4fv(P.u('uJA'), jointA);
  gl.uniform4fv(P.u('uLB'), leafB);
  gl.uniform4fv(P.u('uWB'), leafWB);
  gl.uniform4fv(P.u('uJB'), jointB);
  drawTri();

  /* composite */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  const C = progComp;
  gl.useProgram(C.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, lightFBO.tex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, plasterFBO.tex);
  gl.uniform1i(C.u('uLight'), 0);
  gl.uniform1i(C.u('uPlaster'), 1);
  gl.uniform2f(C.u('uRes'), W, H);
  gl.uniform2f(C.u('uPl'), plasterFBO.w, plasterFBO.h);
  gl.uniform1f(C.u('uDpr'), dpr);
  gl.uniform1f(C.u('uGrainT'), motion < 1 ? 0 : Math.floor(t * 24) % 100000);
  const sI = L.si * 1.8 * (0.96 + 0.04 * Math.sin(t * 0.07)) * (1 - 0.18 * cloud);
  gl.uniform3f(C.u('uSunC'), L.sun[0] * sI, L.sun[1] * sI, L.sun[2] * sI);
  gl.uniform3f(C.u('uAmb'), L.amb[0], L.amb[1], L.amb[2]);
  gl.uniform3f(C.u('uFadeC'), fadeCol[0], fadeCol[1], fadeCol[2]);
  gl.uniform1f(C.u('uFade'), fadeE);
  gl.uniform4f(C.u('uCloud'), tt, T.down, T.hold, T.up);
  gl.uniform2f(C.u('uCloud2'), T.depth, T.lag);
  const rl = Math.hypot(-axx * 0.5 - 0.3, axy * 0.5 + 0.8) || 1;
  gl.uniform2f(C.u('uRelD'), (-axx * 0.5 - 0.3) / rl, (axy * 0.5 + 0.8) / rl);
  gl.uniform2f(C.u('uGlow'), L.glow, 0.20 + 0.10 * (1 - L.si));
  drawTri();

  /* motes */
  let dim = 1;
  if (tt < 100) dim = 1 - T.depth * smooth(0, T.down, tt) * (1 - smooth(T.down + T.hold, T.down + T.hold + T.up, tt - T.lag * 0.5));
  updateMotes(wt, dt, L.mote * fadeE * dim * (1 - 0.3 * cloud));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(progMote.p);
  gl.uniform3f(progMote.u('uCol'), 0.5 + 0.5 * L.sun[0], 0.45 + 0.5 * L.sun[1], 0.35 + 0.5 * L.sun[2]);
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, moteData);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.POINTS, 0, MOTES);
  gl.disable(gl.BLEND);
}

try { initGL(); } catch (err) {
  console.warn(err);
  showFallback();
  return;
}
requestAnimationFrame(frame);
})();
