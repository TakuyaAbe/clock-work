(() => {
'use strict';

/* Komorebi Clock: the time, written in sunlight through leaves on a plaster wall. */

const canvas = document.getElementById('c');
const rootStyle = document.documentElement.style;

/* ------------------------------------------------------------------ */
/*  Time source (with #t=HH:MM and #debug hooks)                      */
/* ------------------------------------------------------------------ */

/* dbg.minutes, when set by the debug sequence bar, replaces the clock: minutes since midnight, fractional */
const dbg = { on: false, minutes: null, playing: false, speed: 60 };
let debugMin = null, debugDay = null;
function readHash() {
  const h = location.hash || '';
  const m = /t=(\d{1,2}):(\d{2})/.exec(h);
  debugMin = m ? (clampI(+m[1], 0, 23) * 60 + clampI(+m[2], 0, 59)) : null;
  const dm = /date=(\d{4})-(\d{2})-(\d{2})/.exec(h);                /* #date=YYYY-MM-DD: another day's sun and moon */
  const dd = dm && new Date(+dm[1], +dm[2] - 1, +dm[3], 12);
  debugDay = dd && dd.getFullYear() === +dm[1] && dd.getMonth() === +dm[2] - 1 && dd.getDate() === +dm[3] ? dd : null;   /* a real day */
  if (/debug/.test(h)) dbg.on = true;
}
function clampI(v, a, b) { return Math.min(b, Math.max(a, v | 0)); }
readHash();
window.addEventListener('hashchange', readHash);

const pad = n => (n < 10 ? '0' : '') + n;
/* ------------------------------------------------------------------ */
/*  The real sky: the sun and moon of the date, near where the browser is */
/* ------------------------------------------------------------------ */
/* No location permission: the browser's time zone stands in for a place. */
const ZONES = {
  'Asia/Tokyo': [35.68, 139.69], 'Asia/Seoul': [37.57, 126.98], 'Asia/Shanghai': [31.23, 121.47], 'Asia/Taipei': [25.03, 121.57],
  'Asia/Hong_Kong': [22.32, 114.17], 'Asia/Singapore': [1.35, 103.82], 'Asia/Bangkok': [13.76, 100.5], 'Asia/Jakarta': [-6.2, 106.85],
  'Asia/Kolkata': [28.61, 77.21], 'Asia/Dubai': [25.2, 55.27], 'Europe/Moscow': [55.76, 37.62], 'Europe/Istanbul': [41.01, 28.98],
  'Europe/Berlin': [52.52, 13.4], 'Europe/Paris': [48.86, 2.35], 'Europe/Madrid': [40.42, -3.7], 'Europe/Rome': [41.9, 12.5],
  'Europe/Amsterdam': [52.37, 4.9], 'Europe/Stockholm': [59.33, 18.07], 'Europe/London': [51.51, -0.13], 'Africa/Cairo': [30.04, 31.24],
  'Africa/Johannesburg': [-26.2, 28.05], 'America/New_York': [40.71, -74.01], 'America/Toronto': [43.65, -79.38],
  'America/Chicago': [41.88, -87.63], 'America/Denver': [39.74, -104.99], 'America/Los_Angeles': [34.05, -118.24],
  'America/Vancouver': [49.28, -123.12], 'America/Mexico_City': [19.43, -99.13], 'America/Sao_Paulo': [-23.55, -46.63],
  'America/Argentina/Buenos_Aires': [-34.6, -58.38], 'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96],
  'Australia/Perth': [-31.95, 115.86], 'Pacific/Auckland': [-36.85, 174.76], 'Pacific/Honolulu': [21.31, -157.86],
  'Europe/Warsaw': [52.23, 21.01], 'Europe/Zurich': [47.37, 8.54], 'Europe/Vienna': [48.21, 16.37], 'Europe/Brussels': [50.85, 4.35],
  'Europe/Prague': [50.08, 14.44], 'Europe/Copenhagen': [55.68, 12.57], 'Europe/Oslo': [59.91, 10.75], 'Europe/Helsinki': [60.17, 24.94],
  'Europe/Dublin': [53.35, -6.26], 'Europe/Lisbon': [38.72, -9.14], 'Europe/Athens': [37.98, 23.73], 'Asia/Manila': [14.6, 120.98],
  'Asia/Kuala_Lumpur': [3.14, 101.69], 'Asia/Karachi': [24.86, 67.0], 'Asia/Tehran': [35.69, 51.39], 'Asia/Riyadh': [24.71, 46.68],
  'Asia/Jerusalem': [31.77, 35.21], 'Asia/Dhaka': [23.81, 90.41], 'Africa/Lagos': [6.52, 3.38], 'Africa/Nairobi': [-1.29, 36.82],
  'Africa/Maputo': [-25.97, 32.57], 'America/Phoenix': [33.45, -112.07], 'America/Halifax': [44.65, -63.57],
  'America/Bogota': [4.71, -74.07], 'America/Lima': [-12.05, -77.04], 'America/Santiago': [-33.45, -70.67],
  'America/Montevideo': [-34.9, -56.19], 'Pacific/Fiji': [-18.14, 178.44],
  /* the older names that Chrome may report */
  'Asia/Calcutta': [28.61, 77.21], 'America/Buenos_Aires': [-34.6, -58.38], 'Asia/Saigon': [10.82, 106.63],
  'Asia/Ho_Chi_Minh': [10.82, 106.63], 'Asia/Katmandu': [27.72, 85.32], 'Asia/Kathmandu': [27.72, 85.32],
  'Europe/Kiev': [50.45, 30.52], 'Europe/Kyiv': [50.45, 30.52]
};
const PLACE = (() => {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* none */ }
  if (ZONES[tz]) return ZONES[tz];
  const south = /^(Australia|Antarctica)\/|Sao_Paulo|Buenos_Aires|Santiago|Montevideo|Asuncion|Lima|La_Paz|Johannesburg|Maputo|Harare|Windhoek|Lusaka|Gaborone|Luanda|Auckland|Fiji|Noumea|Chatham|Port_Moresby|Tongatapu|Apia|Easter|Mauritius|Reunion|Dili|Makassar|Jayapura/.test(tz);
  const y = new Date().getFullYear();     /* the zone's standard meridian: the larger offset of January and July is not summer time */
  const std = Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
  return [south ? -34 : 35, -std / 4];
})();
const RAD = Math.PI / 180;
/* the sun on a day (low-precision almanac formulas): ecliptic longitude, noon, sunrise and sunset in local hours */
function sunOn(day) {
  const T = (day.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;    /* Julian centuries from J2000 */
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const Om = (125.04 - 1934.136 * T) * RAD;
  const lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(Om)) * RAD;           /* apparent longitude: aberration, nutation */
  const eps = (23.439291 - 0.0130042 * T + 0.00256 * Math.cos(Om)) * RAD;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const e0 = (L0 - 0.0057183) * RAD - ra;
  const eot = Math.atan2(Math.sin(e0), Math.cos(e0)) / RAD * 4;             /* equation of time, minutes */
  const [lat, lon] = PLACE, phi = lat * RAD;
  const noon = 12 - eot / 60 - lon / 15 - day.getTimezoneOffset() / 60;
  const c = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  const half = c >= 1 ? 0 : c <= -1 ? 12 : Math.acos(c) / RAD / 15;
  return { lon: ((lam / RAD) % 360 + 360) % 360, noon, rise: noon - half, set: noon + half, alt: 90 - Math.abs(lat - dec / RAD) };
}
/* the new moon of lunation k (Meeus, Astronomical Algorithms ch. 49, main terms), as a Julian day */
function newMoonJD(k) {
  const T = k / 1236.85, E = 1 - 0.002516 * T;
  const M = (2.5534 + 29.10535670 * k) * RAD, Mp = (201.5643 + 385.81693528 * k) * RAD;
  const F = (160.7108 + 390.67050284 * k) * RAD, Om = (124.7746 - 1.56375588 * k) * RAD;
  return 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T
    - 0.40720 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M) + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(Om);
}
/* days since the last new moon */
function moonAge(ms) {
  const jd = ms / 86400000 + 2440587.5;
  let k = Math.floor((jd - 2451550.09766) / 29.530588861), nm = newMoonJD(k);
  if (nm > jd) nm = newMoonJD(--k);
  else if (newMoonJD(k + 1) <= jd) nm = newMoonJD(k + 1);
  return jd - nm;
}
/* the scene's light was tuned on one day (sunrise 5:30, sunset 19:00); the real day is stretched onto it */
const MODEL_RISE = 5.5, MODEL_SET = 19.0;
function modelHour(h, S) {
  h = ((h % 24) + 24) % 24;
  const len = S.set - S.rise;
  if (len >= 23.9) return 12.25;                    /* the midnight sun */
  if (len <= 0.1) return 0;                         /* polar night */
  const r = ((S.rise % 24) + 24) % 24, x = ((h - r) % 24 + 24) % 24;     /* hours since sunrise */
  if (x <= len) return MODEL_RISE + x / len * (MODEL_SET - MODEL_RISE);
  return (MODEL_SET + (x - len) / (24 - len) * (24 - (MODEL_SET - MODEL_RISE))) % 24;
}
let sunPeak = 56;                                   /* the sun's highest point over the wall, degrees; follows the season */
/* the year in 24 solar terms and 72 short seasons, from the sun's longitude (each 5 degrees, from 315: the start of spring) */
const SEKKI = [['立春','Beginning of Spring'],['雨水','Rain Water'],['啓蟄','Insects Awaken'],['春分','Spring Equinox'],['清明','Pure Brightness'],['穀雨','Grain Rain'],['立夏','Beginning of Summer'],['小満','Lesser Fullness'],['芒種','Grain in Ear'],['夏至','Summer Solstice'],['小暑','Lesser Heat'],['大暑','Greater Heat'],['立秋','Beginning of Autumn'],['処暑','End of Heat'],['白露','White Dew'],['秋分','Autumn Equinox'],['寒露','Cold Dew'],['霜降','Frost Descends'],['立冬','Beginning of Winter'],['小雪','Lesser Snow'],['大雪','Greater Snow'],['冬至','Winter Solstice'],['小寒','Lesser Cold'],['大寒','Greater Cold']];
const KO = [['東風解凍','East wind melts the ice'],['黄鶯睍睆','Bush warblers start singing'],['魚上氷','Fish emerge from the ice'],['土脉潤起','Rain moistens the soil'],['霞始靆','Mist starts to linger'],['草木萌動','Grass sprouts, trees bud'],['蟄虫啓戸','Hibernating insects surface'],['桃始笑','First peach blossoms'],['菜虫化蝶','Caterpillars become butterflies'],['雀始巣','Sparrows start to nest'],['桜始開','First cherry blossoms'],['雷乃発声','Distant thunder'],['玄鳥至','Swallows return'],['鴻雁北','Wild geese fly north'],['虹始見','First rainbows'],['葭始生','First reeds sprout'],['霜止出苗','Last frost, rice seedlings grow'],['牡丹華','Peonies bloom'],['蛙始鳴','Frogs start singing'],['蚯蚓出','Worms surface'],['竹笋生','Bamboo shoots sprout'],['蚕起食桑','Silkworms feast on mulberry leaves'],['紅花栄','Safflowers bloom'],['麦秋至','Wheat ripens'],['蟷螂生','Praying mantises hatch'],['腐草為螢','Fireflies rise from the grass'],['梅子黄','Plums turn yellow'],['乃東枯','Self-heal withers'],['菖蒲華','Irises bloom'],['半夏生','Crow-dipper sprouts'],['温風至','Warm winds blow'],['蓮始開','First lotus blossoms'],['鷹乃学習','Hawks learn to fly'],['桐始結花','Paulownia trees bear seeds'],['土潤溽暑','Earth is damp, air is humid'],['大雨時行','Great rains sometimes fall'],['涼風至','Cool winds blow'],['寒蝉鳴','Evening cicadas sing'],['蒙霧升降','Thick fog descends'],['綿柎開','Cotton flowers bloom'],['天地始粛','Heat starts to die down'],['禾乃登','Rice ripens'],['草露白','Dew glistens white on grass'],['鶺鴒鳴','Wagtails sing'],['玄鳥去','Swallows leave'],['雷乃収声','Thunder ceases'],['蟄虫坏戸','Insects hole up underground'],['水始涸','Farmers drain the fields'],['鴻雁来','Wild geese return'],['菊花開','Chrysanthemums bloom'],['蟋蟀在戸','Crickets chirp around the door'],['霜始降','First frost'],['霎時施','Light rains sometimes fall'],['楓蔦黄','Maple leaves and ivy turn yellow'],['山茶始開','Camellias bloom'],['地始凍','Land starts to freeze'],['金盞香','Daffodils bloom'],['虹蔵不見','Rainbows hide'],['朔風払葉','North wind blows the leaves from the trees'],['橘始黄','Tachibana citrus turns yellow'],['閉塞成冬','Cold sets in, winter begins'],['熊蟄穴','Bears start hibernating'],['鱖魚群','Salmon gather and swim upstream'],['乃東生','Self-heal sprouts'],['麋角解','Deer shed their antlers'],['雪下出麦','Wheat sprouts under the snow'],['芹乃栄','Parsley flourishes'],['水泉動','Springs thaw'],['雉始雊','Pheasants start to call'],['款冬華','Butterburs bud'],['水沢腹堅','Ice thickens on the streams'],['鶏始乳','Hens start laying eggs']];
const JA = /^ja\b/i.test(navigator.language || '');
const WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'], WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* the light of a moment: the tuned light at the stretched hour, and at night the moon's share of it */
function skyLight(sky) {
  const L = lightAt(sky.light), m = sky.light;
  const ease = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };  /* runs before smooth() exists */
  const night = m >= 12 ? ease(18.8, 20.2, m) : 1 - ease(4.6, 5.9, m);
  L.si *= 1 + (sky.moon - 1) * night;
  L.mote *= 1 + (sky.moon - 1) * night;          /* no glinting dust on a moonless night */
  return L;
}
/* the sky at a moment of today: where the scene's light stands, the moonlight, and a line for the corner */
function skyAt(d, hour, exact) {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const S = sunOn(day);
  sunPeak = Math.min(66, Math.max(40, 56 + 0.5 * (S.alt - 47)));       /* a gentle echo of the season's noon height */
  const at = exact != null ? exact : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, Math.round(hour * 3600000)).getTime();
  const age = moonAge(at);
  const lit = (1 - Math.cos(2 * Math.PI * age / 29.530588861)) / 2;   /* share of the disc in sunlight */
  const transit = (S.noon + age * 24 / 29.530588861) % 24;              /* the moon crosses the meridian later each day */
  const off = Math.abs(((hour - transit) % 24 + 36) % 24 - 12);
  const up = 1 - Math.min(1, Math.max(0, (off - 5) / 2));               /* above the horizon about six hours either side */
  /* like a printed calendar, a solar term or short season begins on the day it turns: read the sun at the day's end */
  const eod = sunOn(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const ko = Math.floor((((eod.lon - 315) % 360) + 360) % 360 / 5), sk = Math.floor(ko / 3);
  const y = d.getFullYear(), mo = d.getMonth(), dd = d.getDate(), wd = d.getDay(), a = age.toFixed(1);
  return {
    light: modelHour(hour, S),
    moon: 0.12 + 0.88 * lit * up,                                       /* a dark night without it */
    line: JA ? `${y}.${pad(mo + 1)}.${pad(dd)} ${WEEK_JA[wd]} · 月齢 ${a} · ${SEKKI[sk][0]} ${KO[ko][0]}`
             : `${WEEK_EN[wd]} ${dd} ${MON_EN[mo]} ${y} · moon, day ${a} · ${KO[ko][1]} (${SEKKI[sk][1]})`
  };
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function nowInfo() {
  const d = new Date();
  let hh, mm, hour;
  if (dbg.minutes !== null) {
    const M = ((dbg.minutes % 1440) + 1440) % 1440;
    hh = Math.floor(M / 60); mm = Math.floor(M % 60); hour = M / 60;
  } else if (debugMin !== null) {
    hh = Math.floor(debugMin / 60); mm = debugMin % 60; hour = hh + mm / 60;
  } else {
    hh = d.getHours(); mm = d.getMinutes(); hour = hh + mm / 60 + d.getSeconds() / 3600;
  }
  return {
    key: pad(hh) + ':' + pad(mm),
    hour,
    sky: skyAt(debugDay || d, hour, dbg.minutes === null && debugMin === null && !debugDay ? d.getTime() : null),
    date: d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + DAYS[d.getDay()]
  };
}

/* ------------------------------------------------------------------ */
/*  Light of the day: keyframes on the clock hour                     */
/* ------------------------------------------------------------------ */
/* h, sun rgb, sun intensity, ambient rgb, ellipse axis angle (deg),
   elongation, softness, canopy openness, mote amount, pool glow      */
const NIGHT = { sun: [0.62, 0.74, 1.0], si: 0.40, amb: [0.100, 0.115, 0.160], ang: 74, el: 1.25, soft: 0.50, open: 0.23, mote: 0.18, glow: 0.10 };
const KEYS = [
  [0.0, NIGHT],
  [4.5, NIGHT],
  [5.4, { sun: [0.86, 0.66, 0.80], si: 0.55, amb: [0.105, 0.095, 0.125], ang: 22, el: 2.3, soft: 0.46, open: 0.28, mote: 0.30, glow: 0.08 }],
  [6.3, { sun: [1.0, 0.58, 0.44], si: 0.85, amb: [0.215, 0.160, 0.165], ang: 18, el: 2.5, soft: 0.38, open: 0.32, mote: 0.75, glow: 0.05 }],
  [7.4, { sun: [1.0, 0.74, 0.50], si: 1.00, amb: [0.285, 0.250, 0.235], ang: 28, el: 2.0, soft: 0.32, open: 0.37, mote: 0.90, glow: 0.035 }],
  [9.5, { sun: [1.0, 0.90, 0.79], si: 1.08, amb: [0.345, 0.335, 0.340], ang: 52, el: 1.45, soft: 0.28, open: 0.39, mote: 0.75, glow: 0.03 }],
  [12.5, { sun: [1.0, 0.965, 0.91], si: 1.15, amb: [0.385, 0.375, 0.370], ang: 88, el: 1.06, soft: 0.25, open: 0.39, mote: 0.55, glow: 0.025 }],
  [15.0, { sun: [1.0, 0.90, 0.76], si: 1.10, amb: [0.330, 0.325, 0.335], ang: 124, el: 1.4, soft: 0.28, open: 0.39, mote: 0.75, glow: 0.03 }],
  [16.9, { sun: [1.0, 0.58, 0.20], si: 0.98, amb: [0.235, 0.215, 0.235], ang: 150, el: 2.15, soft: 0.30, open: 0.37, mote: 1.0, glow: 0.04 }],
  [18.3, { sun: [1.0, 0.44, 0.17], si: 0.92, amb: [0.145, 0.135, 0.170], ang: 162, el: 2.55, soft: 0.36, open: 0.32, mote: 0.85, glow: 0.06 }],
  [19.3, { sun: [0.86, 0.52, 0.58], si: 0.62, amb: [0.095, 0.090, 0.135], ang: 118, el: 1.8, soft: 0.46, open: 0.28, mote: 0.35, glow: 0.09 }],
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
let todL = skyLight(info.sky);
let fadeCol = applyWallCss(todL);          /* paints immediately, before WebGL is up */

/* ------------------------------------------------------------------ */
/*  WebGL                                                             */
/* ------------------------------------------------------------------ */

const gl = canvas.getContext('webgl', {
  antialias: false, alpha: false, depth: false, stencil: false,
  premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power'
});
function showFallback() { /* without WebGL the page stays a quiet wall */ }
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

/* Occlusion: 3D leaves and twigs, cast along the sun onto the plane of the wall.
   A point at distance z from the wall lands at P.xy - z * k, with k = s.xy / s.z. */
const VERT_OCC = `
attribute vec2 aQ;     /* corner: u along the blade (0..1), v across (-1..1) */
attribute vec3 aC;     /* leaf base / segment start: wall units, z = distance from the wall */
attribute vec3 aL;     /* length vector */
attribute vec3 aW;     /* half-width vector */
attribute vec4 aP;     /* cluster phase, leaf phase, kind (0 leaf, 1 twig), opacity */
uniform vec2 uK;
uniform vec4 uRect;    /* occlusion map: x0, y0, 1/w, 1/h */
uniform vec4 uTile;    /* canopy wrap: origin.xy, size.xy (size 0: no wrap) */
uniform vec4 uW1;      /* sway.xy, time, flutter */
uniform vec4 uW2;      /* gust x, gust amplitude, gust direction, - */
uniform vec4 uHole;    /* the clearing: centre.xy, radius, share of leaves that stay inside */
varying vec2 vQ;
varying float vKind;
varying float vOcc;
varying float vShape;
void main(){
  vec2 cp = aC.xy - aC.z * uK;                         /* where this leaf's shadow falls */
  if (uTile.z > 0.) cp = uTile.xy + mod(cp - uTile.xy, uTile.zw);
  float gx = (cp.x - uW2.x) * 1.5;
  float g = uW2.y * exp(-gx * gx);
  float ph = aP.x * 6.2832;
  vec2 sway = uW1.xy * (1. + .6 * sin(uW1.z * .9 + ph)) + vec2(uW2.z, .3) * g * .025;
  float fl = (uW1.w + .55 * g) * sin(uW1.z * (.8 + .9 * fract(aP.y * 7.31)) + aP.y * 40.);
  vec3 ln = normalize(aL);
  vec3 w = aW * cos(fl) + cross(ln, aW) * sin(fl);     /* leaves turn about their midrib in the wind */
  vec3 off = aQ.x * aL + aQ.y * w;
  vec2 wp = cp + sway + off.xy - off.z * uK;
  float occ = aP.w;
  if (uHole.z > 0.) {
    float n = fract(sin(aP.y * 91.7) * 43758.5);
    float d = length((cp - uHole.xy) * vec2(.88, 1.)) / (uHole.z * (1. + .34 * (fract(aP.x * 13.1) - .5)));
    if (n > uHole.w) occ *= smoothstep(.86, 1.14, d);    /* leaves thin out across the clearing's edge, never pop */
  }
  vQ = aQ; vKind = aP.z; vOcc = occ; vShape = aP.x;
  gl_Position = occ > .002 ? vec4((wp - uRect.xy) * uRect.zw * 2. - 1., 0., 1.) : vec4(2., 2., 2., 1.);
}`;
const FRAG_OCC = `
precision mediump float;
varying vec2 vQ;
varying float vKind;
varying float vOcc;
varying float vShape;
float aa(float e, float fw){
#ifdef HAS_DERIV
  return clamp(e / max(fw, 1e-4) + .5, 0., 1.);
#else
  return step(0., e);
#endif
}
void main(){
  float a = 1.;
  if (vKind < .5) {
    /* a leaf: a short petiole, then a pointed blade */
    float u = vQ.x;
    float ex = mix(.8, 1.2, fract(vShape * 7.13)), tip = mix(.12, .42, fract(vShape * 3.71));
    float blade = pow(max(sin(3.14159 * clamp((u - .1) / .9, 0., 1.)), 0.), ex) * (1. - tip * u);
    float w = u < .1 ? .07 : blade;
#ifdef HAS_DERIV
    a = aa(w - abs(vQ.y), fwidth(vQ.y));
#else
    a = aa(w - abs(vQ.y), 0.);
#endif
  } else if (vKind < 1.5) {
    /* a twig: soft-edged so thin ones don't crawl as they move, and round at its ends
       (vShape: the share of the quad each end cap takes) */
    float du = vShape > 0. ? max(max(vShape - vQ.x, vQ.x - (1. - vShape)), 0.) / vShape : 0.;
    float d = length(vec2(du, vQ.y));
#ifdef HAS_DERIV
    a = aa(1. - d, fwidth(d));
#else
    a = step(d, 1.);
#endif
  } else {
    /* a gap between leaves: an ellipse */
    float e = 1. - length(vec2(vQ.x * 2. - 1., vQ.y));
#ifdef HAS_DERIV
    a = aa(e, fwidth(e));
#else
    a = aa(e, 0.);
#endif
  }
  if (a <= 0.) discard;
  gl_FragColor = vec4(vOcc * a);
}`;

/* Light on the wall: the sun is a disc, so each layer's shadow is its occlusion
   averaged over the sun's image, an ellipse that grows with distance from the wall. */
const FRAG_LIGHT = `
precision highp float;
#ifdef HAS_LOD
#define CANLOD texture2DLodEXT
#else
#define CANLOD texture2D
#endif
uniform vec4 uView;    /* origin.xy (light px), scale (light px per unit), time */
uniform vec4 uRect;    /* occlusion maps: x0, y0, 1/w, 1/h */
uniform vec4 uSun;     /* projected sun direction xy (unit), elongation 1/s.z, - */
uniform vec4 uRad;     /* penumbra radius (wall units): nearer branches, farther branches, mid canopy, far canopy */
uniform vec4 uBias;    /* mip level: mid canopy, far canopy, farther branches, nearer branches */
uniform vec4 uPool;    /* the clearing: centre.xy, radius, strength */
uniform sampler2D uCan;    /* r: mid canopy, g: far canopy, b: farther branches, a: nearer branches (mipmapped) */
${NOISE}
vec2 tap(float i, float n, float rot){
  float r = sqrt((i + .5) / n);
  float a = i * 2.39996 + rot;
  return vec2(cos(a), sin(a)) * r;
}
void main(){
  vec2 p = (gl_FragCoord.xy - uView.xy) / uView.z;
  vec2 uv = (p - uRect.xy) * uRect.zw;
  mat2 E = mat2(uSun.xy * uSun.z, vec2(-uSun.y, uSun.x));
#ifdef HAS_LOD
  float rot = hash12(gl_FragCoord.xy) * 6.2832;   /* rotated per pixel: noise instead of banding */
#else
  float rot = 0.;                                 /* without explicit LOD, keep taps coherent so mips stay sane */
#endif
  vec2 sc = uRect.zw;
  float far = 0., mid = 0.;
  for (int i = 0; i < 40; i++) far += CANLOD(uCan, uv + E * tap(float(i), 40., rot) * uRad.w * sc, uBias.y).g;
  for (int i = 0; i < 28; i++) mid += CANLOD(uCan, uv + E * tap(float(i), 28., rot) * uRad.z * sc, uBias.x).r;
  float fb = 0.;
  for (int i = 0; i < 24; i++) fb += CANLOD(uCan, uv + E * tap(float(i), 24., rot) * uRad.y * sc, uBias.z).b;
  float nbr = 0.;
  for (int i = 0; i < 20; i++) nbr += CANLOD(uCan, uv + E * tap(float(i), 20., rot) * uRad.x * sc, uBias.w).a;
  float Vsoft = (1. - far / 40.) * (1. - mid / 28.);        /* the canopy: soft light that may split at its edges */
  float Vsharp = (1. - fb / 24.) * (1. - nbr / 20.);        /* branches: their shadows stay clean */   /* the sharper layers near the wall are done at full resolution */
  float dial = uPool.w * smoothstep(1.05, .55, length((p - uPool.xy) / uPool.z * vec2(.88, 1.)));
  float dith = (hash12(gl_FragCoord.xy + fract(uView.w * 7.3) * 91.7) - .5) / 255.;
  gl_FragColor = vec4(Vsoft * .5 + dith, Vsharp + dith, dial * .5, 1.);
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
uniform vec4 uFx;      /* dispersion along the light (uv), radial dispersion, bloom */
uniform sampler2D uLight;
uniform sampler2D uPlaster;
uniform sampler2D uNear;    /* r: the vine and the clock */
uniform vec3 uViewC;        /* wall units at full resolution: origin.xy, scale */
uniform vec4 uRectN;        /* near map: x0, y0, 1/w, 1/h */
uniform vec4 uSunN;         /* projected sun direction xy, elongation, - */
uniform vec3 uRadN;         /* blur radius of the clock layer, -, - */
${NOISE}
vec2 ntap(float i, float n, float rot){
  float r = sqrt((i + .5) / n);
  float a = i * 2.39996 + rot;
  return vec2(cos(a), sin(a)) * r;
}
float nearVis(){
  vec2 p = (gl_FragCoord.xy - uViewC.xy) / uViewC.z;
  vec2 uv = (p - uRectN.xy) * uRectN.zw;
  mat2 E = mat2(uSunN.xy * uSunN.z, vec2(-uSunN.y, uSunN.x));
  vec2 sc = uRectN.zw;
  float hd = 0.;             /* a fixed tap pattern: thin moving lines don't sparkle across a per-pixel noise */
  for (int i = 0; i < 24; i++) hd += texture2D(uNear, uv + E * ntap(float(i), 24., .7) * uRadN.x * sc).r;
  return 1. - hd / 24.;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 fromC = uv - .5;

  /* light splits at its edges: warm one way, cool the other (along the light, and outward like a lens).
     Each colour is spread over two taps, so the split melts into the soft edges instead of banding. */
  vec2 ca = fromC * uFx.z + uFx.xy;
  float Sr = texture2D(uLight, uv - ca * .55).r + texture2D(uLight, uv - ca * 1.45).r;   /* red lands outward */
  vec3  Lg = texture2D(uLight, uv).rgb;
  float Sg = Lg.r * 2.;
  float Sb = texture2D(uLight, uv + ca * .55).r + texture2D(uLight, uv + ca * 1.45).r;
  /* the split belongs to lit patches: where it is dim the channels come back together */
  float fw = smoothstep(.22, .75, max(max(Sr, Sg), Sb));
  vec3 S = min(mix(vec3(Sg), vec3(Sr, Sg, Sb), fw), 1.45) * Lg.g * nearVis();   /* g: the branches' clean shadows */
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
  col += alb * sunC * uGlow.x * halo * .2;

  /* bloom: bright patches spill softly into their surroundings */
  float bl = 0.;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * .7854 + .39;
    bl += texture2D(uLight, uv + vec2(cos(a), sin(a) * uRes.x / uRes.y) * .016).r;
  }
  col += alb * sunC * uFx.w * smoothstep(.45, 1.15, bl * 2. / 8.);
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

let progPlaster, progLight, progComp, progMote, progOcc, triBuf, moteBuf, quadIdx, canBuf, nearBuf, occAttr;
let canT = null, nearT = null, occRect = [-1, -1, 2, 2], lodMode = false;
let lightFBO = null, plasterFBO = null;

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
  const lodExt = gl.getExtension('EXT_shader_texture_lod');
  lodMode = !!lodExt;
  progLight = program(VERT, (lodExt ? '#extension GL_EXT_shader_texture_lod : enable\n#define HAS_LOD 1\n' : '') + FRAG_LIGHT);
  progComp = program(VERT, FRAG_COMP);
  progMote = program(VERT_MOTE, FRAG_MOTE);
  const deriv = gl.getExtension('OES_standard_derivatives');
  progOcc = program(VERT_OCC, (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n' : '') + FRAG_OCC);
  occAttr = ['aQ', 'aC', 'aL', 'aW', 'aP'].map(n => gl.getAttribLocation(progOcc.p, n));
  const idx = new Uint16Array(16384 * 6);
  for (let i = 0; i < 16384; i++) {
    const b = i * 4, o = i * 6;
    idx[o] = b; idx[o + 1] = b + 1; idx[o + 2] = b + 2; idx[o + 3] = b; idx[o + 4] = b + 2; idx[o + 5] = b + 3;
  }
  quadIdx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIdx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  canBuf = gl.createBuffer();
  nearBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nearBuf);
  gl.bufferData(gl.ARRAY_BUFFER, nearData.byteLength, gl.DYNAMIC_DRAW);
  triBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  moteBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
  gl.bufferData(gl.ARRAY_BUFFER, moteData.byteLength, gl.DYNAMIC_DRAW);
  gl.disable(gl.DEPTH_TEST);
  lightFBO = plasterFBO = canT = nearT = null;
  needsResize = true;
}

/* quads of 15 floats per corner: aQ2 aC3 aL3 aW3 aP4 */
function occAttribs(on) { for (const a of occAttr) if (a >= 0) (on ? gl.enableVertexAttribArray(a) : gl.disableVertexAttribArray(a)); }
function drawQuads(buf, first, count) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIdx);
  const sizes = [2, 3, 3, 3, 4], offs = [0, 8, 20, 32, 44];
  for (let q0 = 0; q0 < count; q0 += 16384) {
    const n = Math.min(16384, count - q0), base = (first + q0) * 4 * 60;
    for (let j = 0; j < 5; j++) if (occAttr[j] >= 0) gl.vertexAttribPointer(occAttr[j], sizes[j], gl.FLOAT, false, 60, base + offs[j]);
    gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
  }
}
function drawTri() {
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ------------------------------------------------------------------ */
/*  Sizing                                                            */
/* ------------------------------------------------------------------ */

let W = 1, H = 1, dpr = 1, cssW = 1, cssH = 1, layoutH = 1, lastCssW = -1;
let halfW = 0.5, yBot = -0.5, needsResize = true;
let plasterDirty = false, plasterTimer = 0;
let quality = 1, dprCap = 2;

function makeLightTarget() {
  const lh = Math.max(240, Math.round(Math.min(H, Math.max(520, Math.round(H * 0.5)), 900) * quality));
  const lw = Math.max(1, Math.round(lh * W / H));
  freeTarget(lightFBO);
  lightFBO = makeTarget(lw, lh);
  makeOccTargets();
}
/* the occlusion maps cover the visible wall plus a margin for the widest penumbra */
function makeOccTargets() {
  const m = 0.16;
  occRect = [-halfW - m, yBot - m, 2 * halfW + 2 * m, (0.5 - yBot) + 2 * m];
  freeTarget(canT); freeTarget(nearT);
  const cw = quality < 0.75 ? 512 : 1024;
  canT = makeTarget(cw, cw / 2);
  gl.bindTexture(gl.TEXTURE_2D, canT.tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  const maxT = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  const nh = Math.min(2048, Math.round(H * occRect[3] / (0.5 - yBot)));
  nearT = makeTarget(Math.min(maxT, Math.max(1, Math.round(nh * occRect[2] / occRect[3]))), nh);
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
  dpr = Math.min(window.devicePixelRatio || 1, dprCap);   /* native on Retina: the plaster stays crisp under the soft light */
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
  buildHourBranch();
  buildMoreBranches();
  buildCanopy();

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
/* The trees are set out afresh for each new tab; #seed=N fixes the layout (0 is the reference one). */
function hashSeed() { const m = /seed=(\d+)/.exec(location.hash || ''); return m ? +m[1] % 1000000 : null; }
let sceneSeed = hashSeed() ?? 1 + Math.floor(Math.random() * 999999);
const seeded = n => mulberry((n + Math.imul(sceneSeed, 0x9E3779B1)) | 0);
let sceneFlip = sceneSeed !== 0 && seeded(5)() < 0.5;      /* the dominant branch on the left */
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
/* smooth 1D noise: Catmull-Rom through random values, so motion never stops and starts at each knot */
function sn1(x) {
  const i = Math.floor(x), f = x - i, f2 = f * f, f3 = f2 * f;
  const p0 = h2(i - 1, 0.37), p1 = h2(i, 0.37), p2 = h2(i + 1, 0.37), p3 = h2(i + 2, 0.37);
  const v = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3);
  return v * 2 - 1;
}
function spring(s, target, omega, zeta, dt) {
  const acc = omega * omega * (target - s.x) - 2 * zeta * omega * s.v;
  s.v += acc * dt; s.x += s.v * dt;
}

/* ------------------------------------------------------------------ */
/*  Branches                                                          */
/* ------------------------------------------------------------------ */

function makeBranch(opts, nLeaves, seed) {
  const r = seeded(seed);
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
const OPTS_A = {
  lens: [0.13, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07],
  curve: [0.0, -0.10, -0.08, 0.06, 0.10, 0.08, 0.05],
  leafLen: 0.088, parallax: 0.02, flex: 1.0, cap: 0.20, seed: 3.7
};
const OPTS_B = {
  lens: [0.14, 0.12, 0.10, 0.09, 0.08],
  curve: [0.0, -0.10, -0.05, 0.08, 0.10],
  leafLen: 0.085, parallax: 0.035, flex: 0.7, cap: 0.16, seed: 9.1
};
let branchA = makeBranch(OPTS_A, 16, 71), branchB = makeBranch(OPTS_B, 12, 1337);

function layoutBranches() {
  const portrait = smooth(1.25, 0.65, 2 * halfW);
  branchA.sc = clamp(2 * halfW * 0.66 / 0.80, 0.45, 1);
  branchA.ax = halfW + 0.09 * branchA.sc;
  branchA.ay = 0.50 + 0.06 * portrait;
  branchA.a0 = Math.PI * (1.08 + 0.10 * portrait);
  branchB.sc = clamp(2 * halfW * 0.6 / 0.55, 0.5, 1);
  branchB.ax = -halfW - 0.03;
  branchB.ay = 0.60;
  branchB.a0 = -0.15 - 0.2 * portrait;
  for (const B of [branchA, branchB]) {             /* mirrored, they reach in from the other side */
    B.mir = sceneFlip ? -1 : 1;
    if (sceneFlip) { B.ax = -B.ax; B.a0 = Math.PI - B.a0; }
  }
}

const leafA = new Float32Array(16 * 4), leafWA = new Float32Array(8 * 4), jointA = new Float32Array(8 * 2);
const leafB = new Float32Array(12 * 4), leafWB = new Float32Array(6 * 4), jointB = new Float32Array(6 * 2);

function flutterAt(x) { return motion * 0.16 + 0.7 * clamp(gustAt(x) * 1.3, 0, 1); }

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
    a += B.mir * B.curve[i] + per * (0.25 + 0.22 * i);
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
    const flt = fl * (0.20 * sn1(t * L.fq * 0.35 + L.ph) + 0.05 * sn1(t * L.fq * 0.7 + L.ph * 3.1));
    let ang = B.ang[i] + B.mir * L.off + flt + leafBend;
    ang += Math.sin(down - ang) * L.droop * 1.3;   /* droop by the sine: no flip as a leaf sways past upright */
    const len = L.len * sc;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pet = len * 0.2;
    const twist = L.twist0 + fl * 0.7 * sn1(t * L.fq2 * 0.5 + L.ph * 2.3) + 0.2 * sn1(t * 0.25 + L.ph * 5.1);
    const ct = Math.cos(twist);
    const wf = L.wf * (0.45 + 0.55 * ct * ct);       /* smooth through edge-on: no flick */
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
  const r = seeded(9001);
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
/*  The light and what stands in its way                               */
/* ------------------------------------------------------------------ */
/* Everything on the wall is the shadow of something in front of it: a far
   canopy, a nearer one, two branches, and a sprig with two twigs that tells the
   time. A point at distance z from the wall lands at P.xy - z * k, where
   k = s.xy / s.z for the direction s toward the sun. The sun is a disc, so the
   farther a leaf is from the wall, the softer its shadow and the rounder the
   light that comes through its gaps.                                         */
const SUN_R = 0.0055;                        /* angular radius (rad), a little larger than the real sun's */
const SUNRISE = MODEL_RISE, SUNSET = MODEL_SET;
function arc(u, az, eLo, eHi) {
  const A = (-az + 2 * az * u) * Math.PI / 180;
  const E = (eLo + (eHi - eLo) * Math.sin(Math.PI * u)) * Math.PI / 180;
  return [Math.sin(A) * Math.cos(E), Math.sin(E), Math.cos(A) * Math.cos(E)];
}
/* toward the sun by day (low on the left in the morning, high at noon, low on
   the right in the evening) and toward the moon by night, blended at the edges */
function lightDir(h) {
  h = ((h % 24) + 24) % 24;
  const dayLen = SUNSET - SUNRISE;
  const uD = (h - SUNRISE) / dayLen;
  const uN = ((((h - SUNSET) % 24) + 24) % 24) / (24 - dayLen);
  const sun = arc(clamp(uD, 0, 1), 58, 10, sunPeak), moon = arc(clamp(uN, 0, 1), 50, 12, 36);
  const w = smooth(-0.04, 0.04, uD) * (1 - smooth(0.96, 1.04, uD));
  const v = sun.map((x, i) => x * w + moon[i] * (1 - w));
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map(x => x / n);
}

const FPV = 15;
const CORNERS = [[0, -1], [1, -1], [1, 1], [0, 1]];
function putQuad(arr, qi, c, l, w, p) {
  let o = qi * 4 * FPV;
  for (let j = 0; j < 4; j++) {
    const q = CORNERS[j];
    arr[o++] = q[0]; arr[o++] = q[1];
    arr[o++] = c[0]; arr[o++] = c[1]; arr[o++] = c[2];
    arr[o++] = l[0]; arr[o++] = l[1]; arr[o++] = l[2];
    arr[o++] = w[0]; arr[o++] = w[1]; arr[o++] = w[2];
    arr[o++] = p[0]; arr[o++] = p[1]; arr[o++] = p[2]; arr[o++] = p[3];
  }
}

/* The canopy: clusters of leaves at two depths. Leaf positions are kept as the
   shadow they cast with the sun straight on; as the sun moves through the day
   the canopy's shadow slides across the wall, wrapping around a tile.        */
let canMid = [0, 0], canFar = [0, 0], tile = [0, 0, 1, 1];
function buildCanopy() {
  const r = seeded(4242);
  const pad = 0.1;
  tile = [occRect[0] - pad, occRect[1] - pad, occRect[2] + 2 * pad, occRect[3] + 2 * pad];
  const area = tile[2] * tile[3];
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2832 * r());
  const leaves = [];
  const layer = (zLo, zHi, cover, l0, l1, sigma, perCluster, opacity) => {
    const mean = (l0 + l1) / 2;
    const leafArea = mean * mean * 0.60 * 0.62 * 0.62;
    const n = Math.round(-Math.log(1 - cover) * area / leafArea * 1.3);
    const start = leaves.length;
    let cx = 0, cy = 0, cz = 0, cph = 0;
    for (let i = 0; i < n; i++) {
      if (i % perCluster === 0) { cx = tile[0] + r() * tile[2]; cy = tile[1] + r() * tile[3]; cz = zLo + r() * (zHi - zLo); cph = r(); }
      const z = cz * (1 + (r() - 0.5) * 0.12);
      const len = l0 + r() * (l1 - l0);
      /* a leaf hangs at any angle; most turn their faces toward the light */
      const phi = r() * 6.2832, lz = (r() - 0.5) * 0.9, cl = Math.sqrt(1 - lz * lz);
      const Ld = [Math.cos(phi) * cl, Math.sin(phi) * cl, lz];
      let nr = [r() - 0.5, r() - 0.15, r() + 0.4];
      const d = nr[0] * Ld[0] + nr[1] * Ld[1] + nr[2] * Ld[2];
      nr = [nr[0] - d * Ld[0], nr[1] - d * Ld[1], nr[2] - d * Ld[2]];
      const nl = Math.hypot(nr[0], nr[1], nr[2]) || 1;
      nr = nr.map(x => x / nl);
      const wd = [Ld[1] * nr[2] - Ld[2] * nr[1], Ld[2] * nr[0] - Ld[0] * nr[2], Ld[0] * nr[1] - Ld[1] * nr[0]];
      const hw = len * (0.26 + 0.1 * r());
      leaves.push([[cx + gauss() * sigma, cy + gauss() * sigma, z], Ld.map(x => x * len), wd.map(x => x * hw), [cph, r(), 0, opacity]]);
    }
    return [start, leaves.length - start];
  };
  canMid = layer(1.9, 3.1, 0.30, 0.060, 0.100, 0.07, 10, 0.88);
  /* far: an almost closed roof of leaves; light comes through its gaps. Each gap
     is a few overlapping lobes; most are small, a few are wide.             */
  const fStart = leaves.length;
  const nGaps = Math.round(area * 62);
  for (let i = 0; i < nGaps; i++) {
    const gx = tile[0] + r() * tile[2], gy = tile[1] + r() * tile[3];
    const z = 3.4 + r() * 2.0;
    const rad = 0.014 + 0.040 * Math.pow(r(), 1.6);
    const lobes = 1 + Math.floor(r() * 3), ph = r(), depth = 0.65 + 0.35 * r();
    for (let l = 0; l < lobes; l++) {
      const ox = l ? gauss() * rad * 0.7 : 0, oy = l ? gauss() * rad * 0.7 : 0;
      const ra = rad * (l ? 0.45 + 0.4 * r() : 1), el = 0.6 + 0.4 * r(), an = r() * 6.2832;
      const ux = Math.cos(an), uy = Math.sin(an);
      leaves.push([[gx + ox - ux * ra, gy + oy - uy * ra, z], [ux * 2 * ra, uy * 2 * ra, 0], [-uy * ra * el, ux * ra * el, 0], [ph, r(), 2, depth]]);
    }
  }
  canFar = [fStart, leaves.length - fStart];
  const data = new Float32Array(leaves.length * 4 * FPV);
  leaves.forEach((lf, i) => putQuad(data, i, lf[0], lf[1], lf[2], lf[3]));
  gl.bindBuffer(gl.ARRAY_BUFFER, canBuf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

/* Things close to the wall are posed every frame. */
const NEAR_MAX = 720;
const nearData = new Float32Array(NEAR_MAX * 4 * FPV);
let nearQ = 0, kNow = [0, 0];
const proj = a => [a[0] - a[2] * kNow[0], a[1] - a[2] * kNow[1]];
function emitSeg(a, b, half, opacity) {
  if (nearQ >= NEAR_MAX) return;
  const pa = proj(a), pb = proj(b);
  let dx = pb[0] - pa[0], dy = pb[1] - pa[1];
  const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
  const ext = half / (Math.hypot(ex, ey, ez) || 1);        /* a round cap past both ends, so segments join */
  putQuad(nearData, nearQ++, [a[0] - ex * ext, a[1] - ey * ext, a[2] - ez * ext],
    [ex * (1 + 2 * ext), ey * (1 + 2 * ext), ez * (1 + 2 * ext)], [-dy * half, dx * half, 0], [ext / (1 + 2 * ext), 0, 1, opacity]);
}
function emitLeaf(base, L, Wv, opacity, shape) {
  if (nearQ >= NEAR_MAX) return;
  putQuad(nearData, nearQ++, base, L, Wv, [shape === undefined ? 0.5 : shape % 1, 0, 0, opacity]);
}
/* the clearing: overlapping wide gaps around the sprig, breathing slightly */
let CLEAR_LOBES = makeClearLobes();
function makeClearLobes() {
  const r = seeded(77);
  /* an uneven opening: a core that leans to one side, ragged lobes, a few stray gaps */
  const out = [[0.06, 0.04, 0.62, 0.78, 0.5], [-0.22, -0.12, 0.48, 0.7, 2.1], [0.24, -0.2, 0.42, 0.62, 1.2]];
  for (let i = 0; i < 16; i++) {
    const a = r() * 6.2832, d = 0.35 + 0.55 * Math.sqrt(r());
    out.push([Math.cos(a) * d, Math.sin(a) * d * 0.85, 0.14 + 0.26 * r() * (1.15 - d * 0.5), 0.45 + 0.5 * r(), r() * 6.2832]);
  }
  return out;
}
function emitClearing(c, R, t) {
  for (let i = 0; i < CLEAR_LOBES.length; i++) {
    const [ox, oy, rr, el, an0] = CLEAR_LOBES[i];
    const ra = R * rr * (1 + 0.04 * sn1(t * 0.07 + i * 3.1));
    const an = an0 + 0.1 * sn1(t * 0.05 + i);
    const ux = Math.cos(an), uy = Math.sin(an);
    const cx = c[0] + ox * R + 0.01 * sn1(t * 0.09 + i * 1.7), cy = c[1] + oy * R;
    if (nearQ >= NEAR_MAX) return;
    putQuad(nearData, nearQ++, [cx - ux * ra, cy - uy * ra, 0], [ux * 2 * ra, uy * 2 * ra, 0], [-uy * ra * el, ux * ra * el, 0], [0, 0, 2, 1]);
  }
}
/* a leaf in 3D: direction in the wall's plane plus a tilt, face toward the wall, turned about its midrib */
function emitLeaf3D(base, ang, tz, ll, wf, twist, opacity, shape) {
  let Ld = [Math.cos(ang), Math.sin(ang), tz];
  const n0 = Math.hypot(Ld[0], Ld[1], Ld[2]); Ld = Ld.map(x => x / n0);
  let nr = [-Ld[2] * Ld[0], -Ld[2] * Ld[1], 1 - Ld[2] * Ld[2]];
  const nn = Math.hypot(nr[0], nr[1], nr[2]) || 1; nr = nr.map(x => x / nn);
  nr = rotAbout(nr, Ld, twist);
  const Wd = [Ld[1] * nr[2] - Ld[2] * nr[1], Ld[2] * nr[0] - Ld[0] * nr[2], Ld[0] * nr[1] - Ld[1] * nr[0]];
  const hw = ll * 0.30 * wf;
  emitLeaf(base, Ld.map(x => x * ll * 1.1), Wd.map(x => x * hw), opacity, shape);
}

/* The hour hand is the branch itself. It reaches in from beyond the edge,
   close to the wall, and ends in the knot where the minute and second twigs
   grow, so from the knot outward it points at the hour. Its side twigs look
   much like the hands, so the time hides among them, but they keep clear of
   the knot.                                                                 */
let HOURB = null;
function buildHourBranch() {
  const r = seeded(909);
  const Rh = Math.min(0.31, halfW * 0.78) * 0.7;
  /* nodes as (along, across) from the knot, in the hand's own frame */
  const N = 22, nodes = [[0, 0]];
  for (let i = 1; i <= N; i++) {
    const u = i * 0.1;
    nodes.push([u, 0.02 * u * u + (r() - 0.5) * 0.016 * Math.min(1, u / 0.35)]);   /* a slight arch, crooked at each node */
  }
  const twigs = [], leaves = [];
  for (let i = 3; i < N; i++) {
    const [u, v] = nodes[i];
    if (u < Rh * 1.4 || r() < 0.35) continue;          /* the knot belongs to the hands */
    const side = twigs.length % 2 ? 1 : -1;
    const off = u < Rh * 2.4 ? 0.95 + 0.5 * r() : 0.5 + 0.6 * r();   /* near the knot they stand out sideways */
    const a = Math.PI + side * off, len = (0.05 + 0.07 * r()) * (Rh / 0.217);   /* growing toward the knot */
    if (Math.hypot(u + Math.cos(a) * len, v + Math.sin(a) * len) < Rh * 1.25) continue;
    twigs.push({ i, a, len, nl: 2 + Math.floor(r() * 3), side, ph: r() * 50 });
  }
  for (let i = 3; i < N; i += 2) if (nodes[i][0] >= Rh * 1.3) leaves.push({ i, side: i % 4 === 1 ? -1 : 1 });
  HOURB = { nodes, twigs, leaves };
}
function emitHourBranch(frac, t) {
  const B = HOURB, th = frac * Math.PI * 2;
  const d = [Math.sin(th), Math.cos(th)], n = [d[1], -d[0]];        /* 12 o'clock is up, clockwise */
  const W3 = (u, v) => [PIVOT.x + d[0] * u + n[0] * v, PIVOT.y + d[1] * u + n[1] * v, Z0 + 0.03 * Math.min(1, u * u)];
  const inView = (p, m) => { const q = proj(p); return q[0] > -halfW - m && q[0] < halfW + m && q[1] > yBot - m && q[1] < 0.5 + m; };
  const wa = a => Math.PI / 2 - th - a;               /* an angle in the hand's frame, as an angle on the wall */
  /* the branch: thicker than either twig, thickening toward the edge, until its shadow leaves the wall */
  let last = 0;
  for (let i = 0; i < B.nodes.length - 1; i++) {
    const b = W3(...B.nodes[i + 1]);
    emitSeg(W3(...B.nodes[i]), b, 0.0050 + 0.0016 * Math.min(1, B.nodes[i][0] / 0.9), 1);
    last = i + 1;
    if (!inView(b, 0.05)) break;
  }
  const fl = flutterAt(PIVOT.x + d[0] * 0.5);
  for (const tw of B.twigs) {
    const b = W3(...B.nodes[tw.i]);
    if (tw.i > last || !inView(b, 0.15)) continue;
    const a = wa(tw.a) + fl * 0.04 * sn1(t * 0.5 + tw.ph);
    const e = [b[0] + Math.cos(a) * tw.len, b[1] + Math.sin(a) * tw.len, b[2] + 0.01];
    const m = [(b[0] + e[0]) / 2 - Math.sin(a) * tw.len * 0.06, (b[1] + e[1]) / 2 + Math.cos(a) * tw.len * 0.06, b[2] + 0.005];
    emitSeg(b, m, 0.0028, 1); emitSeg(m, e, 0.0020, 1);
    for (let k = 0; k < tw.nl; k++) {
      const s = 0.4 + 0.6 * (k + 1) / tw.nl;
      const p = [b[0] + (e[0] - b[0]) * s, b[1] + (e[1] - b[1]) * s, b[2] + 0.01 * s];
      const side = k === tw.nl - 1 ? 0 : (k % 2 ? 1 : -1) * tw.side;
      const ll = 0.032 * (0.85 + 0.3 * ((k * 0.37 + tw.ph) % 1));
      emitLeaf3D(p, a + side * 0.72 + fl * 0.12 * sn1(t * 1.25 + tw.ph + k), 0.22 * (side || 0.6), ll, 0.8,
                 0.25 * (side || 1) + fl * 0.5 * sn1(t * (0.55 + 0.08 * k) + tw.ph * 1.7), 0.96, tw.ph * 0.173 + k * 0.29);
    }
  }
  /* a few leaves straight off the branch */
  for (const lf of B.leaves) {
    const b = W3(...B.nodes[lf.i]);
    if (lf.i > last || !inView(b, 0.1)) continue;
    emitLeaf3D(b, wa(Math.PI) + lf.side * 1.0, 0.2 * lf.side, 0.034, 0.85, 0.3 * lf.side + fl * 0.5 * sn1(t * 0.7 + lf.i), 0.95, 0.4 + lf.i * 0.13);
  }
}

/* the second hand: the thinnest bare twig, a little crooked at its nodes */
const SEC_KINKS = [0.05, -0.07, 0.04, -0.05, 0.06, -0.03];
function emitSecondTwig(frac, len, t, px) {
  let a = frac * Math.PI * 2 + 0.01 * sn1(t * 0.6 + 4.2);
  let p = [PIVOT.x, PIVOT.y, Z0];
  const n = SEC_KINKS.length, L0 = len / n, pts = [p], dirs = [];
  for (let i = 0; i < n; i++) {
    const f = (i + 1) / n;
    const d = a + SEC_KINKS[i];                         /* each node turns it a few degrees */
    const q = [p[0] + Math.sin(d) * L0, p[1] + Math.cos(d) * L0, Z0 + 0.016 * f];
    emitSeg(p, q, Math.max(0.0013 - 0.0005 * f, 1.0 * px), 1); p = q;
    pts.push(q); dirs.push(Math.PI / 2 - d);            /* direction in the wall's x/y angle convention */
  }
  /* a few small leaves, rounder than the minute hand's willow leaves */
  const fl = flutterAt(PIVOT.x), ll = 0.036 * (len / 0.341);
  const SEC_LEAVES = [[3, 1], [5, -1], [6, 0]];         /* node index, side (0: at the tip) */
  for (let k = 0; k < SEC_LEAVES.length; k++) {
    const [ni, side] = SEC_LEAVES[k];
    const ang = dirs[ni - 1] + side * 0.7 + fl * 0.12 * sn1(t * 1.1 + k * 2.3);
    emitLeaf3D(pts[ni], ang, 0.12 * (side || 0.5), ll * (side ? 0.9 : 1.05), 0.75,
               0.2 * (side || 1) + fl * 0.4 * sn1(t * 0.6 + k * 1.7), 0.95, 0.24 + 0.01 * k);
  }
}

/* More branches in front of the wall: some reach in from the edges close by
   (sharp shadows), some hang farther out (softer ones).                     */
let MORE = [];
function buildMoreBranches() {
  const r = seeded(31337);
  MORE = [];
  const hw = halfW, yb = yBot, R = Math.min(0.31, halfW * 0.78);
  const make = (x, y, ang, z, ch, ls = 1) => {          /* ls: a longer branch, as leafy along its length */
    const nSeg = 5 + Math.floor(r() * 3), segs = [], leaves = [];
    for (let i = 0; i < nSeg; i++) segs.push({ len: (0.05 + 0.05 * r()) * (1 - i / (nSeg + 3)) * ls, curve: (r() - 0.5) * 0.45 });
    const nl = Math.round((8 + Math.floor(r() * 8)) * ls);
    for (let k = 0; k < nl; k++) leaves.push({ s: 0.15 + 0.85 * (k + r() * 0.8) / nl, side: k % 2 ? 1 : -1, off: 0.45 + 0.5 * r(),
      len: (0.042 + 0.034 * r()) * (z > 1.0 ? 1.3 : 1.12), wf: 0.85 + 0.3 * r(), ph: r() * 90, tz: (r() - 0.5) * 0.6 });
    return { x, y, ang, z, ch, segs, leaves, flex: 0.6 + 0.6 * r(), ph: r() * 100 };
  };
  /* no branch may reach into the clock's sweep, or it reads as a longer hand */
  const clear = (B, minD) => {
    let x = B.x, y = B.y, a = B.ang;
    for (const sg of B.segs) {
      a += sg.curve; x += Math.cos(a) * sg.len; y += Math.sin(a) * sg.len;
      if (Math.hypot(x - PIVOT.x, y - PIVOT.y) < minD) return false;
    }
    return true;
  };
  const place = (gen, minD) => {
    for (let tries = 0; tries < 24; tries++) { const B = gen(); if (clear(B, minD)) { MORE.push(B); return; } }
  };
  for (let i = 0; i < 6; i++) {
    const side = i % 4;
    place(() => {
      const z = 0.55 + 0.4 * r();
      if (side === 0) return make(-hw - 0.04, yb + r() * (0.5 - yb), (r() - 0.5) * 1.2, z, 1);
      if (side === 1) return make(hw + 0.04, yb + r() * (0.5 - yb), Math.PI + (r() - 0.5) * 1.2, z, 1);
      if (side === 2) return make((r() * 2 - 1) * hw, 0.54, -Math.PI / 2 + (r() - 0.5) * 1.4, z, 1);
      return make((r() * 2 - 1) * hw, yb - 0.04, Math.PI / 2 + (r() - 0.5) * 1.4, z, 1);
    }, R * 1.4);
  }
  for (let i = 0; i < 6; i++) place(() => make((r() * 2 - 1) * hw * 1.05, yb + r() * (0.55 - yb), r() * 6.2832, 1.25 + 0.75 * r(), 2), R * 1.1);
  /* each corner: a nearer branch long enough to reach the light, and a farther one */
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const cx = sx * (hw + 0.03), cy = sy > 0 ? 0.53 : yb - 0.03;
    const inward = Math.atan2(PIVOT.y - cy, PIVOT.x - cx);
    for (const ch of [1, 2]) place(() => {
      const slide = (r() - 0.3) * 0.18, alongX = r() < 0.5;
      return make(cx - (alongX ? sx * slide : 0), cy - (alongX ? 0 : sy * slide), inward + (r() - 0.5) * 0.9,
                  ch === 1 ? 0.6 + 0.35 * r() : 1.3 + 0.6 * r(), ch, ch === 1 ? 1.7 : 1.2);
    }, ch === 1 ? R * 1.5 : R * 1.2);
  }
}
function emitMore(B, t, aK) {
  const fl = flutterAt(B.x);
  const bend = (wind.mid.x * 1.6 + 0.010 * sn1(t * 0.33 + B.ph)) * B.flex;
  let x = B.x, y = B.y, a = B.ang;
  const pts = [[x, y, a]];
  for (let i = 0; i < B.segs.length; i++) {
    a += B.segs[i].curve + bend * (0.3 + 0.25 * i);
    x += Math.cos(a) * B.segs[i].len; y += Math.sin(a) * B.segs[i].len;
    pts.push([x, y, a]);
  }
  const n = B.segs.length, z = B.z;
  const w3 = p => [p[0] + z * aK[0], p[1] + z * aK[1], z];
  for (let i = 0; i < n; i++) emitSeg(w3(pts[i]), w3(pts[i + 1]), (0.0055 - 0.0035 * i / n) * (z > 1.0 ? 1.5 : 1.25), 1);
  for (const L of B.leaves) {
    const f = L.s * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    const p = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
    let ang = pts[i + 1][2] + L.side * L.off + fl * (0.16 * sn1(t * 1.2 + L.ph) + 0.04 * sn1(t * 2.0 + L.ph * 2.1));
    ang += Math.sin(-Math.PI / 2 - ang) * 0.2;     /* leaves droop a little (by the sine: no flip past upright) */
    emitLeaf3D(w3(p), ang, L.tz, L.len, L.wf, 0.3 * L.side + fl * 0.55 * sn1(t * 0.7 + L.ph * 1.3), 0.95, L.ph * 0.137);
  }
}

function rotAbout(v, ax, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const d = ax[0] * v[0] + ax[1] * v[1] + ax[2] * v[2];
  const cx = ax[1] * v[2] - ax[2] * v[1], cy = ax[2] * v[0] - ax[0] * v[2], cz = ax[0] * v[1] - ax[1] * v[0];
  return [v[0] * c + cx * s + ax[0] * d * (1 - c), v[1] * c + cy * s + ax[1] * d * (1 - c), v[2] * c + cz * s + ax[2] * d * (1 - c)];
}

/* the two corner branches, posed as before and lifted off the wall */
function emitBranch(B, leafArr, wArr, jArr, zBase, zTip, aK, th0, th1) {
  const n = B.lens.length;
  const zAt = f => zBase + (zTip - zBase) * f;
  for (let i = 0; i < n; i++) {
    const z0 = zAt(i / n), z1 = zAt((i + 1) / n);
    emitSeg([jArr[i * 2] + z0 * aK[0], jArr[i * 2 + 1] + z0 * aK[1], z0],
            [jArr[i * 2 + 2] + z1 * aK[0], jArr[i * 2 + 3] + z1 * aK[1], z1],
            (th0 + (th1 - th0) * i / Math.max(1, n - 1)) * B.sc, 1);
  }
  for (let k = 0; k < B.leaves.length; k++) {
    const o = k * 4, lf = B.leaves[k], z = zAt(lf.s);
    const lx = leafArr[o + 2], ly = leafArr[o + 3], len = Math.hypot(lx, ly) || 1e-6;
    const ux = lx / len, uy = ly / len;
    const hw = len * 0.30 * wArr[(k >> 1) * 4 + (k & 1) * 2];
    emitLeaf([leafArr[o] - ux * len * 0.2 + z * aK[0], leafArr[o + 1] - uy * len * 0.2 + z * aK[1], z],
             [ux * len * 1.2, uy * len * 1.2, len * 0.22 * Math.sin(lf.ph * 1.7)], [-uy * hw, ux * hw, 0], 0.95, lf.ph * 0.211);
  }
}

/* The clock: the knot at the tip of the hour branch. A long slender twig grows
   from it toward the minute, and the thinnest one toward the second.
   No numerals, no dial.                                                      */
const PIVOT = { x: 0, y: -0.01 };
const Z0 = 0.014;                            /* the knot at the branch tip, about 2 cm out from the wall */
/* leaves along a twig: s along the stem (0..1), side, angle off the stem, length, width */
const MIN_LEAVES = [[0.58, -1, 0.65, 0.036, 0.50], [0.74, 1, 0.58, 0.040, 0.55], [0.88, -1, 0.50, 0.042, 0.55], [1.0, 0, 0.0, 0.048, 0.60]];
function handFracs() {
  const d = new Date();
  if (dbg.minutes !== null) {
    const M = ((dbg.minutes % 1440) + 1440) % 1440;
    const sec = dbg.playing ? (M * 60) % 60 : d.getSeconds() + d.getMilliseconds() / 1000;
    return { h: ((M / 60) % 12) / 12, m: (M % 60) / 60, s: sec / 60 };
  }
  let hh, mm, ss;
  if (debugMin !== null) { hh = Math.floor(debugMin / 60); mm = debugMin % 60; ss = 0; }
  else { hh = d.getHours(); mm = d.getMinutes(); ss = d.getSeconds() + d.getMilliseconds() / 1000; }
  const sec = d.getSeconds() + d.getMilliseconds() / 1000;      /* the second hand always follows the real seconds */
  return { h: ((hh % 12) + mm / 60 + ss / 3600) / 12, m: (mm + ss / 60) / 60, s: sec / 60 };
}
function emitHand(frac, len, bend, lift, th0, th1, leaves, t, sway, seed, scale) {
  const tilt = 0.28, turn = 0.35, flutterTurn = 0.55;
  const th = frac * Math.PI * 2 + sway;
  const dx = Math.sin(th), dy = Math.cos(th), nx = dy, ny = -dx;     /* 12 o'clock is up, clockwise */
  const K = [PIVOT.x, PIVOT.y, Z0];
  const C = [K[0] + dx * len * 0.5 + nx * len * bend * 1.6, K[1] + dy * len * 0.5 + ny * len * bend * 1.6, Z0 + lift * 0.5];
  const E = [K[0] + dx * len + nx * len * bend * 0.3, K[1] + dy * len + ny * len * bend * 0.3, Z0 + lift];
  const at = u => { const v = 1 - u; return [0, 1, 2].map(j => v * v * K[j] + 2 * v * u * C[j] + u * u * E[j]); };
  const tan = u => [0, 1, 2].map(j => 2 * (1 - u) * (C[j] - K[j]) + 2 * u * (E[j] - C[j]));
  let prev = K;
  for (let q = 1; q <= 3; q++) { const pt = at(q / 3); emitSeg(prev, pt, th0 + (th1 - th0) * (q - 1) / 2, 1); prev = pt; }
  const fl = flutterAt(PIVOT.x);
  for (let i = 0; i < leaves.length; i++) {
    const [sAt, side, off, ll0, wf] = leaves[i];
    const ll = ll0 * scale, base = at(sAt), T = tan(sAt), ph = seed + i * 7.31;
    let a = Math.atan2(T[1], T[0]) + side * off;
    a += fl * (0.14 * sn1(t * (1.1 + i * 0.21) + ph) + 0.04 * sn1(t * 1.9 + ph * 2.3));
    const tz = tilt * (side || 0.6) + 0.1 * sn1(t * 0.4 + ph);      /* tips lean off the wall, or toward it */
    let Ld = [Math.cos(a), Math.sin(a), tz];
    const n0 = Math.hypot(Ld[0], Ld[1], Ld[2]); Ld = Ld.map(x => x / n0);
    /* the blade faces the wall, turned about its midrib by the breeze */
    let nr = [-Ld[2] * Ld[0], -Ld[2] * Ld[1], 1 - Ld[2] * Ld[2]];
    const nn = Math.hypot(nr[0], nr[1], nr[2]) || 1; nr = nr.map(x => x / nn);
    nr = rotAbout(nr, Ld, turn * (side || 1) + fl * flutterTurn * sn1(t * (0.6 + i * 0.13) + ph * 1.7) + 0.2 * sn1(t * 0.2 + ph));
    const Wd = [Ld[1] * nr[2] - Ld[2] * nr[1], Ld[2] * nr[0] - Ld[0] * nr[2], Ld[0] * nr[1] - Ld[1] * nr[0]];
    const hw = ll * 0.30 * wf;
    emitLeaf(base, Ld.map(x => x * ll * 1.1), Wd.map(x => x * hw), 0.96, 0.22 + 0.01 * i);   /* a shape with a pointed tip */
  }
}

/* ------------------------------------------------------------------ */
/*  Each minute a cloud passes over                                   */
/* ------------------------------------------------------------------ */

let shownKey = info.key;
const trans = { active: false, t0: 0, to: '' };
function transTiming() {
  return motion === 1
    ? { down: 1.4, hold: 0.4, up: 2.2, lag: 0.6, depth: 0.42 }
    : { down: 0.3, hold: 0.0, up: 0.5, lag: 0.0, depth: 0.12 };
}
function startTransition(key) {
  trans.active = true; trans.t0 = clock; trans.to = key;
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
  } else if (avg > 0.026 && dprCap > 1.5 && (window.devicePixelRatio || 1) > 1.5) {
    dprCap = 1.5; needsResize = true; skipPerf = 3;         /* still slow at the lowest quality: fewer pixels */
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

let lastDraw = -1e9, lastInfoAt = -1e9;
/* a small serif time in the corner, the one crisp thing on the screen */
const tmEl = document.getElementById('tm');
let tmKey = '', tmLine = '', tmInk = -1, tmReady = false;
requestAnimationFrame(() => requestAnimationFrame(() => { tmReady = true; updateCaption(); }));   /* after first paint: it fades in */
if (tmEl) tmEl.lang = JA ? 'ja' : 'en';
function updateCaption() {
  if (!tmEl) return;
  if (info.key !== tmKey) { tmKey = info.key; tmEl.querySelector('.t').textContent = tmKey; }
  if (info.sky.line !== tmLine) { tmLine = info.sky.line; tmEl.querySelector('.a').textContent = tmLine; }
  const ink = Math.round(smooth(0.45, 0.85, todL.si) * 20) / 20;   /* dark ink by day, light by night */
  if (ink !== tmInk) { tmInk = ink; tmEl.style.setProperty('--day', ink); }
  tmEl.classList.toggle('on', tmReady && !dbg.on);                 /* the playground bar has its own */
}
function refreshInfo() {
  info = nowInfo();
  todL = skyLight(info.sky);                        /* at night the light is the moon's: its phase, and whether it is up */
  updateCaption();
  fadeCol = applyWallCss(todL);
  canvas.setAttribute('aria-label', info.key);
}
refreshInfo();

function frame(now) {
  requestAnimationFrame(frame);
  if (lost) return;
  /* ~30 fps throughout: the light moves slowly, and every frame is drawn at the screen's full resolution */
  const idle = true;
  const since = now - lastDraw;
  if (since < 1000 / 30 - 4) return;
  const raw = since / 1000;
  const dt = Math.min(0.05, Math.max(0, raw));
  lastDraw = now;
  clock += dt;
  const t = clock;

  if (dbg.playing && dbg.minutes !== null) dbg.minutes = (dbg.minutes + dt * dbg.speed / 60) % 1440;
  if (now - lastInfoAt > 250 || dbg.minutes !== null) { lastInfoAt = now; refreshInfo(); }
  if (!trans.active && info.key !== shownKey && !needsResize) {
    /* scrubbing or fast playback crosses minutes too quickly for a cloud each time */
    if (dbg.minutes !== null && (!dbg.playing || dbg.speed > 10)) shownKey = info.key;
    else startTransition(info.key);
  }
  if (dbgBar && dbg.on) updateDebugBar();

  let perturbed = false;
  if (needsResize) { resize(); perturbed = true; }
  if (plasterDirty) { renderPlaster(); perturbed = true; }
  adaptQuality(raw, t, perturbed, idle);

  /* minute change progress */
  const T = transTiming();
  let tt = 1e4;
  if (trans.active) {
    tt = t - trans.t0;
    if (tt > T.down + T.hold + T.up + T.lag + 0.1) {
      trans.active = false;
      shownKey = trans.to; tt = 1e4;
    }
  }

  const wt = motion === 1 ? t : t * 0.35;     /* reduced motion: the wind itself slows */
  updateWind(wt, dt * (motion === 1 ? 1 : 0.35));
  updateSun(t, dt);
  const L = todL;
  const cloud = smooth(0.66, 0.92, vn(t * 0.018, 7.3)) * 0.6;
  const fade = smooth(0, 1.5, t);
  const fadeE = 1 - Math.pow(1 - fade, 3);

  /* the light: a direction from the hour, nudged a touch by the pointer */
  const s0 = lightDir(info.sky.light);
  const k = [s0[0] / s0[2] + 0.04 * sunX.x, s0[1] / s0[2] + 0.04 * sunY.x];
  kNow = k;
  const sz = 1 / Math.hypot(k[0], k[1], 1);
  const kl = Math.hypot(k[0], k[1]);
  const sd = kl > 1e-4 ? [k[0] / kl, k[1] / kl] : [0, 1];
  const penum = z => z * SUN_R / sz;
  const lens = 1.5 * (0.5 - yBot) / H;           /* about 1.5 device pixels of defocus, in wall units */

  /* near the wall: the sprig that keeps time, and two branches */
  nearQ = 0;
  const R = Math.min(0.31, halfW * 0.78);
  const Rh = R * 0.7;                          /* the sprig is smaller than the clearing it sits in */
  const fr = handFracs();
  const sw = wind.mid.x * 1.1 + 0.6 * wind.far.x;
  emitHourBranch(fr.h, wt);
  emitHand(fr.m, Rh, -0.035, 0.016, 0.0034, 0.0018, MIN_LEAVES, wt, sw, 11.7, Rh / 0.31);
  emitSecondTwig(fr.s, Rh * 1.1, wt, (0.5 - yBot) / H);
  const handQ = nearQ;
  poseBranch(branchA, wt, 0, 0, leafA, leafWA, jointA);
  poseBranch(branchB, wt, 0, 0, leafB, leafWB, jointB);
  const aK = [0.93 * k[0], 0.93 * k[1]];      /* the branches hang so their shadows stay near the corners */
  emitBranch(branchA, leafA, leafWA, jointA, 0.85, 0.70, aK, 0.0060, 0.0024);
  emitBranch(branchB, leafB, leafWB, jointB, 1.00, 0.85, aK, 0.0072, 0.0034);
  for (const B of MORE) if (B.ch === 1) emitMore(B, wt, aK);
  const branchQ = nearQ - handQ;
  for (const B of MORE) if (B.ch === 2) emitMore(B, wt, aK);
  const farBrQ = nearQ - handQ - branchQ;
  const holeC = [PIVOT.x - Z0 * k[0], PIVOT.y - Z0 * k[1]];
  emitClearing(holeC, R * 1.12, wt);
  const clearQ = nearQ - handQ - branchQ - farBrQ;
  gl.bindBuffer(gl.ARRAY_BUFFER, nearBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, nearData.subarray(0, nearQ * 4 * FPV));

  /* occlusion maps: what stands between the sun and each point of the wall */
  const O = progOcc;
  gl.useProgram(O.p);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform2f(O.u('uK'), k[0], k[1]);
  gl.uniform4f(O.u('uRect'), occRect[0], occRect[1], 1 / occRect[2], 1 / occRect[3]);
  occAttribs(true);
  gl.bindFramebuffer(gl.FRAMEBUFFER, canT.fb);
  gl.viewport(0, 0, canT.w, canT.h);
  gl.clearColor(0, 0.97, 0, 0);               /* g: the far roof starts closed */
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform4f(O.u('uTile'), tile[0], tile[1], tile[2], tile[3]);
  gl.uniform4f(O.u('uW2'), wind.gustX, wind.gustAmp, wind.gustDir, 0);
  gl.colorMask(true, false, false, false);
  gl.uniform4f(O.u('uW1'), wind.mid.x * 1.4, wind.midY.x * 1.4, wt, 0.15 * motion);
  gl.uniform4f(O.u('uHole'), holeC[0], holeC[1], R * 1.4, 0.3);
  drawQuads(canBuf, canMid[0], canMid[1]);
  gl.colorMask(false, true, false, false);
  gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);  /* gaps are cut out of the roof */
  gl.uniform4f(O.u('uW1'), wind.far.x * 1.2, wind.farY.x * 1.2, wt * 0.9 + 17.0, 0.2 * motion);
  gl.uniform4f(O.u('uHole'), 0, 0, 0, 0);
  drawQuads(canBuf, canFar[0], canFar[1]);
  gl.uniform4f(O.u('uTile'), 0, 0, 0, 0);
  gl.uniform4f(O.u('uW1'), 0, 0, 0, 0);
  gl.uniform4f(O.u('uW2'), -99, 0, 1, 0);
  drawQuads(nearBuf, handQ + branchQ + farBrQ, clearQ);
  gl.blendEquation(gl.FUNC_ADD);
  gl.colorMask(false, false, true, false);      /* b: the farther branches */
  drawQuads(nearBuf, handQ + branchQ, farBrQ);
  gl.colorMask(false, false, false, true);      /* a: the nearer branches */
  drawQuads(nearBuf, handQ, branchQ);
  gl.colorMask(true, true, true, true);
  gl.bindFramebuffer(gl.FRAMEBUFFER, nearT.fb);
  gl.bindTexture(gl.TEXTURE_2D, canT.tex);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.viewport(0, 0, nearT.w, nearT.h);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform4f(O.u('uTile'), 0, 0, 0, 0);
  gl.uniform4f(O.u('uW1'), 0, 0, 0, 0);
  gl.uniform4f(O.u('uW2'), -99, 0, 1, 0);
  gl.uniform4f(O.u('uHole'), 0, 0, 0, 0);
  gl.colorMask(true, false, false, false); drawQuads(nearBuf, 0, handQ);
  gl.colorMask(true, true, true, true);
  occAttribs(false);
  gl.disable(gl.BLEND);

  /* light pass */
  gl.bindFramebuffer(gl.FRAMEBUFFER, lightFBO.fb);
  gl.viewport(0, 0, lightFBO.w, lightFBO.h);
  const P = progLight;
  const ls = lightFBO.h / cssH;
  gl.useProgram(P.p);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, canT.tex);
  gl.uniform1i(P.u('uCan'), 1);
  gl.uniform4f(P.u('uView'), 0.5 * lightFBO.w, (cssH - 0.5 * layoutH) * ls, layoutH * ls, wt);
  gl.uniform4f(P.u('uRect'), occRect[0], occRect[1], 1 / occRect[2], 1 / occRect[3]);
  gl.uniform4f(P.u('uSun'), sd[0], sd[1], 1 / sz, 0);
  const lpx = (0.5 - yBot) / lightFBO.h;
  const rMid = penum(2.5), rFar = penum(4.4);
  const rFb = Math.hypot(penum(1.6), lens), rNb = Math.hypot(penum(0.75), lens);
  gl.uniform4f(P.u('uRad'), rNb, rFb, rMid, rFar);
  const tpu = canT.h / occRect[3];
  /* mip level where neighbouring taps just overlap: log2 of the tap spacing in texels */
  const bias = (r, n) => Math.max(0, Math.log2(Math.sqrt(Math.PI * (r * tpu) * (r * tpu) / sz / n)) + (lodMode ? 0.2 : -0.5));
  gl.uniform4f(P.u('uBias'), bias(rMid, 28), bias(rFar, 40), bias(rFb, 24), bias(rNb, 20));
  gl.uniform4f(P.u('uPool'), holeC[0], holeC[1], R * 1.12, clamp(0.55 + 0.45 * L.si, 0.7, 1));
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
  gl.uniform1f(C.u('uGrainT'), 0);              /* grain stays put: it is the paper, not film */
  const sI = L.si * 1.8 * (0.96 + 0.04 * Math.sin(t * 0.07)) * (1 - 0.18 * cloud);
  gl.uniform3f(C.u('uSunC'), L.sun[0] * sI, L.sun[1] * sI, L.sun[2] * sI);
  gl.uniform3f(C.u('uAmb'), L.amb[0], L.amb[1], L.amb[2]);
  gl.uniform3f(C.u('uFadeC'), fadeCol[0], fadeCol[1], fadeCol[2]);
  gl.uniform1f(C.u('uFade'), fadeE);
  gl.uniform4f(C.u('uCloud'), tt, T.down, T.hold, T.up);
  gl.uniform2f(C.u('uCloud2'), T.depth, T.lag);
  gl.uniform2f(C.u('uRelD'), sd[0], sd[1]);
  const fs = smooth(0.45, 0.95, L.si) * 0.9 + 0.1;   /* moonlight hardly splits */
  gl.uniform4f(C.u('uFx'), sd[0] * 0.007 * fs, sd[1] * 0.007 * fs * W / H, 0.016 * fs, 0.22);
  const fpx = (0.5 - yBot) / H;                  /* one device pixel, in wall units */
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, nearT.tex);
  gl.uniform1i(C.u('uNear'), 2);
  gl.uniform3f(C.u('uViewC'), 0.5 * W, (cssH - 0.5 * layoutH) * (H / cssH), layoutH * (H / cssH));
  gl.uniform4f(C.u('uRectN'), occRect[0], occRect[1], 1 / occRect[2], 1 / occRect[3]);
  gl.uniform4f(C.u('uSunN'), sd[0], sd[1], 1 / sz, 0);
  gl.uniform3f(C.u('uRadN'), Math.hypot(penum(Z0 + 0.01), 2.2 / layoutH), 0, 0);   /* the clock out of focus by about 2.2 CSS px */
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

/* ------------------------------------------------------------------ */
/*  Debug: a sequence bar to scrub through the day and watch the clouds  */
/* ------------------------------------------------------------------ */
/* Shown with #debug in the URL or Shift+D. Not part of the normal page.  */
let dbgBar = null, dbgEls = null, dbgDrag = false, dbgLastUi = 0;
function litColor(L) {
  return ALB.map((a, j) => Math.pow(1 - Math.exp(-a * (L.amb[j] + L.sun[j] * L.si * 1.8 * 0.6) * 1.12), 1 / 2.2));
}
function setupDebugBar() {
  if (dbgBar) { dbgBar.style.display = dbg.on ? 'flex' : 'none'; return; }
  if (!dbg.on) return;
  const st = document.createElement('style');
  st.textContent = `
#kc-dbg{position:fixed;left:16px;right:56px;bottom:16px;display:flex;align-items:center;gap:10px;padding:10px 12px;
  background:rgba(20,22,26,.72);color:#eee;font:12px/1 -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;
  border-radius:10px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:10;user-select:none}
#kc-dbg button,#kc-dbg select{background:rgba(255,255,255,.12);color:#eee;border:1px solid rgba(255,255,255,.2);border-radius:6px;
  font:inherit;padding:5px 9px;cursor:pointer}
#kc-dbg button:hover,#kc-dbg select:hover{background:rgba(255,255,255,.22)}
#kc-dbg button:focus-visible,#kc-dbg select:focus-visible,#kc-dbg input:focus-visible{outline:2px solid #fff;outline-offset:1px}
#kc-dbg .lbl{font-variant-numeric:tabular-nums;min-width:40px;text-align:right;font-size:13px}
#kc-dbg .trk{position:relative;flex:1;height:26px;min-width:120px}
#kc-dbg .trk canvas{position:absolute;left:0;right:0;top:12px;width:100%;height:10px;border-radius:5px}
#kc-dbg .ticks{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;font-size:9px;opacity:.65;pointer-events:none}
#kc-dbg input[type=range]{position:absolute;left:0;right:0;top:8px;width:100%;height:18px;margin:0;background:transparent;-webkit-appearance:none;appearance:none}
#kc-dbg input[type=range]::-webkit-slider-runnable-track{height:18px;background:transparent}
#kc-dbg input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:4px;height:18px;background:#fff;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.45)}`;
  document.head.appendChild(st);
  const bar = document.createElement('div');
  bar.id = 'kc-dbg';
  bar.innerHTML = '<button data-k="play" title="play / pause">▶</button>' +
    '<select data-k="speed" title="speed"><option value="1">×1</option><option value="10">×10</option><option value="60" selected>×60</option><option value="600">×600</option><option value="3600">×3600</option></select>' +
    '<div class="trk"><div class="ticks"><span>0</span><span>3</span><span>6</span><span>9</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span></div>' +
    '<canvas width="576" height="10"></canvas><input data-k="time" type="range" min="0" max="1439" step="1" aria-label="time of day"></div>' +
    '<span class="lbl" data-k="label">--:--</span>' +
    '<button data-k="cloud" title="send a cloud across now">cloud</button>' +
    '<button data-k="now" title="back to the real time">now</button>' +
    '<button data-k="shuffle" title="set the trees out afresh">shuffle</button>' +
    '<span class="lbl" data-k="seed" title="#seed=N brings this layout back"></span>';
  document.body.appendChild(bar);
  const q = k => bar.querySelector(`[data-k="${k}"]`);
  dbgEls = { play: q('play'), speed: q('speed'), time: q('time'), label: q('label'), seed: q('seed') };
  dbgEls.track = bar.querySelector('canvas');
  drawTrack();
  dbgEls.speed.value = String(dbg.speed);
  const realMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  dbgEls.play.addEventListener('click', () => {
    if (dbg.minutes === null) dbg.minutes = realMinutes();
    dbg.playing = !dbg.playing;
  });
  dbgEls.speed.addEventListener('change', () => { dbg.speed = +dbgEls.speed.value; });
  dbgEls.time.addEventListener('input', () => { dbg.minutes = +dbgEls.time.value; dbgDrag = true; });
  dbgEls.time.addEventListener('change', () => { dbgDrag = false; });
  q('cloud').addEventListener('click', () => { trans.active = true; trans.t0 = clock; trans.to = info.key; });
  q('now').addEventListener('click', () => { dbg.minutes = null; dbg.playing = false; });
  q('shuffle').addEventListener('click', () => {
    reseed(1 + Math.floor(Math.random() * 999999));
    const parts = (location.hash || '').replace(/^#/, '').split('&').filter(p => p && !/^seed=/.test(p));
    history.replaceState(null, '', '#' + parts.concat('seed=' + sceneSeed).join('&'));
  });
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  dbgBar = bar;
}
/* the track shows the shown day's light: sun- or moon-lit wall colour hour by hour */
let trackDay = '';
function drawTrack() {
  const cv = dbgEls.track, c2 = cv.getContext('2d'), day = debugDay || new Date();
  trackDay = day.toDateString();
  for (let x = 0; x < cv.width; x++) {
    c2.fillStyle = css(litColor(skyLight(skyAt(day, x / cv.width * 24))));
    c2.fillRect(x, 0, 1, cv.height);
  }
}
function updateDebugBar() {
  if ((debugDay || new Date()).toDateString() !== trackDay) drawTrack();     /* another day: #date, or midnight */
  const t = performance.now();
  if (t - dbgLastUi < 80) return;
  dbgLastUi = t;
  const d = new Date();
  const M = dbg.minutes !== null ? ((dbg.minutes % 1440) + 1440) % 1440 : d.getHours() * 60 + d.getMinutes();
  if (!dbgDrag) dbgEls.time.value = String(Math.floor(M));
  dbgEls.label.textContent = pad(Math.floor(M / 60)) + ':' + pad(Math.floor(M % 60)) + (dbg.minutes === null ? '' : '*');
  dbgEls.play.textContent = dbg.playing ? '❚❚' : '▶';
  dbgEls.seed.textContent = 'seed ' + sceneSeed;
}
/* the faint ring in the lower right (aria-label "playground") and Shift+D open and close the bar */
const pgBtn = document.getElementById('pg');
function setDebug(on) {
  dbg.on = on;
  setupDebugBar();
  updateCaption();
  if (pgBtn) pgBtn.setAttribute('aria-expanded', String(dbg.on));
}
if (pgBtn) {
  pgBtn.addEventListener('click', () => setDebug(!dbg.on));
  pgBtn.addEventListener('pointerdown', e => e.stopPropagation());
}
window.addEventListener('keydown', e => {
  if (e.shiftKey && (e.key === 'D' || e.key === 'd')) setDebug(!dbg.on);
});
window.addEventListener('hashchange', () => {
  if (dbg.on) setDebug(true);
  const n = hashSeed();
  if (n !== null && n !== sceneSeed) reseed(n);
});
if (pgBtn) pgBtn.setAttribute('aria-expanded', String(dbg.on));
function reseed(n) {
  sceneSeed = n;
  sceneFlip = n !== 0 && seeded(5)() < 0.5;
  branchA = makeBranch(OPTS_A, 16, 71); branchB = makeBranch(OPTS_B, 12, 1337);
  CLEAR_LOBES = makeClearLobes();
  needsResize = true;                       /* lays out the rest again */
}
setupDebugBar();

try { initGL(); } catch (err) {
  console.warn(err);
  showFallback();
  return;
}
requestAnimationFrame(frame);
})();
