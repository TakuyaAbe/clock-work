(() => {
'use strict';

/* Catalog distribution notice:
 * Copyright (c) 2015, Olaf Frohn
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * 
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* Star Trail Clock. A pole-facing, stereographic long exposure. */
/* 300 brightest entries from d3-celestial's Hipparcos-derived stars.6.json.
 * RA/Dec in degrees (J2000), visual magnitude, B−V colour index.
 * https://github.com/ofrohn/d3-celestial (BSD-3-Clause; Olaf Frohn).
 * Catalog data: https://github.com/ofrohn/d3-celestial/blob/master/data/readme.md */
const CATALOG = [[101.2872,-16.7161,-1.44,0.009],[95.988,-52.6957,-0.62,0.164],[-146.0847,19.1824,-0.05,1.239],[-140.0979,-60.834,-0.01,0.71],[-80.7653,38.7837,0.03,-0.001],[79.1723,45.998,0.08,0.795],[78.6345,-8.2016,0.18,-0.03],[114.8255,5.225,0.4,0.432],[24.4285,-57.2368,0.45,-0.158],[88.7929,7.4071,0.45,1.5],[-149.0441,-60.373,0.61,-0.231],[-62.3042,8.8683,0.76,0.221],[-173.3504,-63.0991,0.77,-0.243],[68.9802,16.5093,0.87,1.538],[-158.7018,-11.1613,0.98,-0.235],[-112.6481,-26.432,1.06,1.865],[116.329,28.0262,1.16,0.991],[-15.5873,-29.6222,1.17,0.145],[-168.0697,-59.6888,1.25,-0.238],[-49.642,45.2803,1.25,0.092],[-140.1038,-60.8372,1.35,0.9],[152.093,11.9672,1.36,-0.087],[104.6565,-28.9721,1.5,-0.211],[113.6494,31.8883,1.58,0.034],[-172.2085,-57.1132,1.59,1.6],[-96.5978,-37.1038,1.62,-0.231],[81.2828,6.3497,1.64,-0.224],[81.573,28.6075,1.65,-0.13],[138.2999,-69.7172,1.67,0.07],[84.0534,-1.2019,1.69,-0.184],[-27.9417,-46.961,1.73,-0.07],[85.1897,-1.9426,1.74,-0.199],[122.3831,-47.3366,1.75,-0.145],[-166.4927,55.9598,1.76,-0.022],[51.0807,49.8612,1.79,0.481],[-83.957,-34.3846,1.79,-0.031],[165.932,61.751,1.81,1.061],[107.0979,-26.3932,1.83,0.671],[-153.1148,49.3133,1.85,-0.099],[125.6285,-59.5095,1.86,1.196],[-95.6703,-42.9978,1.86,0.406],[89.8822,44.9474,1.9,0.077],[-107.8338,-69.0277,1.91,1.447],[99.4279,16.3993,1.93,0.001],[131.1759,-54.7088,1.93,0.043],[-53.5881,-56.7351,1.94,-0.118],[37.9545,89.2641,1.97,0.636],[95.6749,-17.9559,1.98,-0.24],[141.8968,-8.6586,1.99,1.44],[31.7934,23.4624,2.01,1.151],[154.9931,19.8415,2.01,1.128],[10.8974,-17.9866,2.04,1.019],[-76.1836,-26.2967,2.05,-0.134],[-148.3294,-36.37,2.06,1.011],[2.0969,29.0904,2.07,-0.038],[17.433,35.6206,2.07,1.576],[86.9391,-9.6696,2.07,-0.168],[-137.3236,74.1555,2.07,1.465],[-19.3331,-46.8846,2.07,1.61],[-96.2664,12.56,2.08,0.155],[47.0422,40.9556,2.09,-0.003],[30.9748,42.3297,2.1,1.37],[177.2649,14.5721,2.14,0.09],[14.1772,60.7167,2.15,-0.046],[-169.6207,-48.9599,2.2,-0.023],[120.896,-40.0031,2.21,-0.269],[139.2725,-59.2752,2.21,0.189],[-126.328,26.7147,2.22,0.032],[136.999,-43.4326,2.23,1.665],[-159.0186,54.9254,2.23,0.057],[-54.4429,40.2567,2.23,0.673],[10.1268,56.5373,2.24,1.17],[-90.8485,51.4889,2.24,1.521],[83.0017,-0.2991,2.25,-0.175],[2.2945,59.1498,2.28,0.38],[-155.0281,-53.4664,2.29,-0.171],[-119.9166,-22.6217,2.29,-0.117],[-107.4591,-34.2932,2.29,1.144],[-139.5177,-47.3882,2.3,-0.154],[-141.1232,-42.1578,2.33,-0.157],[165.4603,56.3824,2.34,0.033],[-138.7533,27.0742,2.35,0.966],[-33.9535,9.875,2.38,1.52],[-94.378,-39.03,2.39,-0.171],[6.571,-42.306,2.4,1.083],[178.4577,53.6948,2.41,0.044],[-102.4055,-15.7249,2.43,0.059],[-14.0564,28.0828,2.44,1.655],[111.0238,-29.3031,2.45,-0.083],[-40.3551,62.5856,2.45,0.257],[140.5284,-55.0107,2.47,-0.141],[-48.4472,33.9703,2.48,1.021],[-13.8098,15.2053,2.49,-0.002],[45.5699,4.0897,2.54,1.63],[-110.7103,-10.5671,2.54,0.038],[-151.1151,-47.2884,2.55,-0.176],[168.5271,20.5237,2.56,0.128],[-118.6407,-19.8055,2.56,-0.065],[83.1826,-17.8223,2.58,0.211],[-177.9104,-50.7224,2.58,-0.128],[-176.0485,-17.5419,2.58,-0.107],[-74.347,-29.8801,2.6,0.062],[-130.7483,-9.3829,2.61,-0.071],[-123.933,6.4256,2.63,1.167],[28.66,20.808,2.64,0.165],[84.9122,-34.0741,2.65,-0.12],[89.9303,37.2126,2.65,-0.083],[-171.4032,-23.3968,2.65,0.893],[21.454,60.2353,2.66,0.16],[-151.3288,18.3977,2.68,0.58],[-135.367,-43.134,2.68,-0.184],[74.2484,33.1661,2.69,1.49],[161.6924,-49.4203,2.69,0.901],[-170.7041,-69.1356,2.69,-0.176],[-97.309,-37.2958,2.7,-0.179],[109.2857,-37.0975,2.71,1.616],[-84.7515,-29.8281,2.72,1.38],[-63.4351,10.6133,2.72,1.507],[-116.4136,-3.6943,2.73,1.584],[-114.0021,61.5142,2.73,0.91],[160.7392,-64.3945,2.74,-0.22],[-169.5848,-1.4494,2.74,0.368],[83.8583,-5.9099,2.75,-0.21],[-159.8508,-36.7123,2.75,0.068],[-137.2804,-16.0418,2.75,0.147],[-94.1319,4.5673,2.76,1.168],[76.9624,-5.0864,2.78,0.161],[-112.445,21.4896,2.78,0.947],[-101.3381,14.3903,2.78,1.164],[-176.2137,-58.7489,2.79,-0.193],[-97.3918,52.3014,2.79,0.954],[-126.2148,-41.1668,2.8,-0.216],[82.0613,-20.7594,2.81,0.807],[-109.6785,31.6027,2.81,0.65],[6.4378,-77.2542,2.82,0.618],[-111.0294,-28.216,2.82,-0.206],[-83.0073,-25.4217,2.82,1.025],[3.309,15.1836,2.83,-0.19],[121.886,-24.3043,2.83,0.458],[-121.2143,-63.4307,2.83,0.315],[58.533,31.8836,2.84,0.271],[-98.675,-55.5299,2.84,1.479],[-97.0396,-49.8761,2.84,-0.136],[56.8712,24.1051,2.85,-0.086],[-164.4558,10.9592,2.85,0.934],[-33.2398,-16.1273,2.85,0.18],[29.6925,-61.5699,2.86,0.29],[-63.7563,45.1308,2.86,-0.002],[95.7401,22.5136,2.87,1.621],[-130.2726,-68.6795,2.87,0.014],[-25.3746,-60.2596,2.87,1.39],[44.5653,-40.3047,2.88,0.128],[-72.559,-21.0236,2.88,0.377],[111.7877,8.2893,2.89,-0.097],[-165.9931,38.3184,2.89,-0.115],[-120.287,-26.1141,2.89,-0.18],[59.4635,40.0102,2.9,-0.199],[-114.7028,-25.5928,2.9,0.299],[-37.1103,-5.5712,2.9,0.828],[46.1991,53.5064,2.91,0.716],[146.7755,-65.072,2.92,0.273],[-19.2494,30.2212,2.93,0.852],[102.484,-50.6146,2.94,1.207],[-172.5339,-16.5154,2.94,-0.012],[-28.554,-0.3199,2.95,0.969],[59.5074,-13.5085,2.97,1.588],[84.4112,21.1425,2.97,-0.148],[146.4628,23.7743,2.97,0.808],[-88.548,-30.4241,2.98,0.981],[-160.2696,-23.1715,2.99,0.92],[-93.1038,-40.127,2.99,0.509],[-73.6475,13.8635,2.99,0.014],[32.3859,34.9873,3,0.14],[167.4159,44.4985,3,1.144],[-129.8179,71.834,3,0.058],[-107.0324,-38.0474,3,-0.2],[-31.5178,-37.3649,3,-0.084],[55.7313,47.7876,3.01,-0.125],[95.0783,-30.0634,3.02,-0.16],[105.7561,-23.8333,3.02,-0.077],[-177.4688,-22.6198,3.02,1.326],[75.4922,43.8233,3.03,0.537],[-168.43,-68.1081,3.04,-0.178],[-141.9805,38.3083,3.04,0.191],[-67.3197,27.9597,3.05,1.088],[-54.7472,-14.7814,3.05,0.79],[100.983,25.1311,3.06,1.377],[155.5823,41.4995,3.06,1.603],[-71.8612,67.6615,3.07,0.99],[-85.5932,-36.7617,3.1,1.582],[133.8484,5.9456,3.11,0.978],[162.4062,-16.1936,3.11,1.232],[173.9454,-63.0198,3.11,-0.044],[-50.6082,-47.2915,3.11,0.998],[87.74,-35.7683,3.12,1.146],[134.8019,48.0418,3.12,0.223],[-105.345,-55.9901,3.12,1.552],[-101.242,24.8392,3.12,0.08],[-135.2096,-42.1042,3.13,-0.208],[140.2638,34.3926,3.14,1.55],[142.8055,-57.0344,3.16,1.538],[-101.2382,36.8092,3.16,1.437],[99.4403,-43.1959,3.17,-0.103],[143.2143,51.6773,3.17,0.475],[-102.8034,65.7147,3.17,-0.12],[-78.5859,-26.9908,3.17,-0.107],[76.6287,41.2345,3.18,-0.148],[-139.3733,-64.9751,3.18,0.256],[72.46,6.9613,3.19,0.484],[76.3653,-22.371,3.19,1.46],[-105.5829,9.375,3.19,1.16],[-92.5355,-37.0433,3.19,1.192],[-41.7659,30.2269,3.21,0.99],[-5.1631,77.6323,3.21,1.031],[-129.657,-40.6475,3.22,-0.227],[-115.4196,-4.6925,3.23,0.966],[-84.6725,-2.8988,3.23,0.941],[-37.835,70.5607,3.23,-0.201],[102.0477,-61.9414,3.24,0.225],[-57.1738,-0.8215,3.24,-0.066],[112.3076,-43.3014,3.25,1.509],[-148.4071,-26.6824,3.25,1.091],[-133.9824,-25.282,3.25,1.674],[-75.2641,32.6896,3.25,-0.049],[56.8098,-74.239,3.26,1.59],[9.832,30.861,3.27,1.268],[-99.4976,-24.9995,3.27,-0.186],[-16.3374,-15.8208,3.27,0.066],[78.2329,-16.2055,3.29,-0.11],[153.4342,-70.0379,3.29,-0.074],[-128.7676,58.9661,3.29,1.166],[68.4991,-55.045,3.3,-0.079],[158.0061,-61.6853,3.3,-0.089],[93.7194,22.5068,3.31,1.6],[-98.6514,-56.3777,3.31,-0.15],[16.521,-46.7184,3.32,0.885],[46.2941,38.8403,3.32,1.528],[-176.1435,57.0326,3.32,0.077],[-101.9617,-43.2392,3.32,0.441],[-90.2434,-9.7736,3.32,0.987],[-73.265,-27.6704,3.32,1.169],[63.6062,-62.4739,3.33,0.915],[168.56,15.4296,3.33,-0.003],[117.3236,-24.8598,3.34,1.218],[28.5989,63.6701,3.35,-0.15],[81.1192,-2.3971,3.35,-0.24],[101.3224,12.8956,3.35,0.443],[127.5661,60.7182,3.35,0.856],[-68.6254,3.1148,3.36,0.319],[-129.3297,-44.6896,3.37,-0.191],[131.6938,6.4188,3.38,0.685],[-156.3267,-0.5958,3.38,0.114],[83.7845,9.9342,3.39,-0.16],[154.2707,-61.3323,3.39,1.541],[-166.0991,3.3975,3.39,1.571],[-27.2863,58.2013,3.39,1.558],[67.1656,15.8709,3.4,0.179],[22.0914,-43.3182,3.41,1.542],[60.1701,12.4903,3.41,-0.099],[-152.6238,-41.6877,3.41,-0.225],[-131.9288,-52.0992,3.41,0.918],[-48.6776,61.8388,3.41,0.912],[-19.6345,10.8314,3.41,-0.086],[28.2704,29.5788,3.42,0.488],[-119.9695,-38.3967,3.42,-0.206],[-93.3853,27.7207,3.42,0.75],[-48.7604,-66.2032,3.42,0.163],[137.742,-58.9669,3.43,-0.19],[154.1726,23.4173,3.43,0.307],[-73.4378,-4.8826,3.43,-0.096],[154.2741,42.9144,3.45,0.029],[12.2762,57.8152,3.46,0.587],[17.1475,-10.1823,3.46,1.161],[119.1946,-52.9824,3.46,-0.177],[-131.1243,33.3148,3.46,0.961],[40.8252,3.2358,3.47,0.093],[-152.5959,-42.4737,3.47,-0.17],[151.8331,16.7627,3.48,-0.031],[-109.276,38.9223,3.48,0.916],[26.017,-15.9375,3.49,0.727],[105.4298,-27.9348,3.49,1.729],[169.6197,33.0943,3.49,1.4],[-134.5135,40.3906,3.49,0.956],[-83.2566,-45.9685,3.49,-0.179],[-17.8613,-51.3169,3.49,0.083],[102.4602,-32.5085,3.5,-0.116],[110.0307,21.9823,3.5,0.374],[-17.5799,66.2004,3.5,1.053],[-60.3107,19.4921,3.51,1.571],[-17.4992,24.6016,3.51,0.933],[55.8121,-9.7634,3.52,0.915],[145.2876,9.8923,3.52,0.516],[149.2156,-54.5678,3.52,-0.067],[-77.48,33.3627,3.52,0.003],[-75.5675,-21.1067,3.52,1.151],[-27.4501,6.1979,3.52,0.086],[67.1542,19.1804,3.53,1.014],[124.1288,9.1855,3.53,1.481],[173.2505,-31.8576,3.54,0.947],[-122.595,-3.4302,3.54,-0.036]];

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
const RAD = Math.PI / 180, TAU = Math.PI * 2;
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d', { alpha: false });
const sky = document.createElement('canvas'), exposure = document.createElement('canvas');
const land = document.createElement('canvas'), old = document.createElement('canvas');
const finish = document.createElement('canvas');
const JA = /^ja\b/i.test(window.chrome?.i18n?.getUILanguage?.() || navigator.language || '');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hemisphere = PLACE[0] < 0 ? -1 : 1;
let W, H, dpr, cx, cy, scale, skyClip, stars = [], tips = [], seed = 1;
let fixedTime = null, fixedDay = null, secondKey = '', oldHour = '', frameAt = -Infinity;
let epoch = performance.now(), preview = null;
function randomFor(s) {
  let a = s >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1).replace(/#/g, '&'));
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(p.get('t') || '');
  fixedTime = m && +m[1] < 24 && +m[2] < 60 && +(m[3] || 0) < 60 ? [+m[1], +m[2], +(m[3] || 0)] : null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.get('date') || '');
  fixedDay = null;
  if (dm) {
    const d = new Date(0); d.setFullYear(+dm[1], +dm[2] - 1, +dm[3]); d.setHours(12, 0, 0, 0);
    if (d.getFullYear() === +dm[1] && d.getMonth() === +dm[2] - 1 && d.getDate() === +dm[3]) fixedDay = d;
  }
  seed = /^-?\d+$/.test(p.get('seed') || '') ? Number(p.get('seed')) >>> 0 : 7419;
  preview = null; epoch = performance.now(); secondKey = ''; oldHour = '';
  buildStars(); if (W) resize();
}
function now() {
  const d = new Date();
  if (fixedDay) d.setFullYear(fixedDay.getFullYear(), fixedDay.getMonth(), fixedDay.getDate());
  if (fixedTime) d.setHours(...fixedTime, 0);
  if (preview !== null) d.setHours(Math.floor(preview / 60), preview % 60, 0, 0);
  return d;
}
function colour(bv) {
  const t = clamp((bv + .25) / 2.1, 0, 1);
  return `${Math.round(170 + 77 * t)},${Math.round(198 + 16 * t)},${Math.round(245 - 86 * t)}`;
}
function buildStars() {
  const r = randomFor(seed);
  stars = CATALOG.map(([ra, dec, mag, bv]) => ({ra: ra * RAD, dec: dec * RAD, mag, rgb: colour(bv), phase: r() * TAU}));
  for (let i = 0; i < 2000; i++) stars.push({ra: r() * TAU, dec: Math.asin(r() * 2 - 1), mag: 4.5 + r() * 3.3, rgb: colour(r() * 1.8 - .2), phase: r() * TAU});
}
function layer(c) {
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g;
}
function ridge(x, back = false) {
  return H * ((back ? .827 : .878) + .018 * Math.sin(x / W * 7.2 + .3) + .012 * Math.sin(x / W * 15.7 + 1.8) + .004 * Math.sin(x / W * 37))
    + H / 800 * (1.1 * Math.sin(x * .071 + seed) + .65 * Math.sin(x * .193 + seed * .3) + .35 * Math.sin(x * .47));
}
function resize() {
  W = Math.max(1, innerWidth); H = Math.max(1, innerHeight); dpr = Math.min(devicePixelRatio || 1, 2);
  layer(canvas); const g = layer(sky), l = layer(land), finishCtx = layer(finish); layer(exposure); layer(old);
  skyClip = new Path2D(); skyClip.moveTo(0, 0); skyClip.lineTo(W, 0);
  for (let x = W; x > 0; x -= 2) skyClip.lineTo(x, ridge(x, true));
  skyClip.lineTo(0, ridge(0, true)); skyClip.closePath();
  cx = W * .43; cy = H * .31;
  /* A pole-centred stereographic lens preserves circular star paths. */
  /* Keep a wide field near the equator instead of zooming into an empty pole. */
  scale = Math.min(H * 1.3, H * .49 / (2 * Math.tan(Math.max(.7, Math.abs(PLACE[0])) * RAD / 2)));
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#05080f'); bg.addColorStop(.68, '#0a1220');
  bg.addColorStop(.77, '#101d24'); bg.addColorStop(.85, '#1b2928'); bg.addColorStop(1, '#080d13');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  /* Airglow follows the ridge, confined to the lowest fifteen percent of sky. */
  for (let x = 0; x < W; x += 4) {
    const horizon = ridge(x, true), depth = H * .12;
    const glow = g.createLinearGradient(0, horizon - depth, 0, horizon + 5);
    const warmth = x / W;
    const rgb = `${Math.round(55 + 40 * warmth)},${Math.round(83 - 13 * warmth)},55`;
    glow.addColorStop(0, `rgba(${rgb},0)`); glow.addColorStop(1, `rgba(${rgb},.16)`);
    g.fillStyle = glow; g.fillRect(x, horizon - depth, 4, depth + 5);
  }
  /* Cache a grain tile at one noise sample per device pixel, including the land. */
  const grain = document.createElement('canvas'); grain.width = grain.height = 256;
  const gg = grain.getContext('2d'), pixels = gg.createImageData(256, 256), r = randomFor(seed ^ 0xabc);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const v = r() > .5 ? 220 : 0;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v; pixels.data[i + 3] = 2 + r() * 6;
  }
  gg.putImageData(pixels, 0, 0);
  finishCtx.save(); finishCtx.setTransform(1, 0, 0, 1, 0, 0);
  finishCtx.fillStyle = finishCtx.createPattern(grain, 'repeat');
  finishCtx.fillRect(0, 0, finish.width, finish.height); finishCtx.restore();
  const vignette = finishCtx.createRadialGradient(cx, H * .43, H * .15, cx, H * .43, Math.max(W, H) * .8);
  vignette.addColorStop(0, '#00000000'); vignette.addColorStop(1, '#01030b99');
  finishCtx.fillStyle = vignette; finishCtx.fillRect(0, 0, W, H);
  const foot = finishCtx.createLinearGradient(0, H * .84, 0, H);
  foot.addColorStop(0, '#01030800'); foot.addColorStop(1, '#010308bb');
  finishCtx.fillStyle = foot; finishCtx.fillRect(0, H * .84, W, H * .16);
  for (const back of [true, false]) {
    l.beginPath(); l.moveTo(0, H); for (let x = 0; x <= W + 2; x += 2) l.lineTo(x, ridge(x, back)); l.lineTo(W, H); l.closePath();
    const earth = l.createLinearGradient(0, H * .8, 0, H);
    earth.addColorStop(0, back ? '#0b1318' : '#060b10'); earth.addColorStop(1, '#020409');
    l.fillStyle = earth; l.fill();
  }
  /* One weathered roof, its gable dark against the airglow. */
  const x = W * .77, y = ridge(x), u = 1.6 * Math.min(W / 1280, H / 800);   /* tall enough to break the far ridge's skyline */
  l.fillStyle = '#04080c'; l.beginPath(); l.moveTo(x - 26 * u, y); l.lineTo(x - 26 * u, y - 16 * u); l.lineTo(x - 34 * u, y - 16 * u); l.lineTo(x - 11 * u, y - 31 * u); l.lineTo(x - 4 * u, y - 30 * u); l.lineTo(x + 10 * u, y - 24 * u); l.lineTo(x + 31 * u, y - 17 * u); l.lineTo(x + 23 * u, y - 18 * u); l.lineTo(x + 23 * u, y + 6 * u); l.closePath(); l.fill();
  l.beginPath(); l.moveTo(x + 12 * u, y - 22 * u); l.lineTo(x + 11 * u, y - 29 * u);
  l.lineTo(x + 15 * u, y - 30 * u); l.lineTo(x + 16 * u, y - 20 * u); l.closePath(); l.fill();
  secondKey = ''; oldHour = '';
}
function sidereal(d) {
  const days = d.getTime() / 86400000 + 2440587.5 - 2451545;
  return (280.46061837 + 360.98564736629 * days + PLACE[1]) * RAD;
}
function drawExposure(target, d, seconds, collect) {
  const g = target.getContext('2d'); g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
  g.save();
  /* The photographed ridge is the visible horizon of this stylized lens. */
  g.clip(skyClip); g.lineCap = 'round';
  const lst = sidereal(d), length = seconds / 3600 * Math.PI / 2;
  /* Exposure length is exaggerated 6x: 90 degrees/hour. The leading tip
   * retains its actual sidereal position; historical trails are stylized. */
  if (collect) tips = [];
  for (const s of stars) {
    const dec = s.dec * hemisphere, radius = 2 * scale * Math.tan((Math.PI / 2 - dec) / 2);
    if (radius > Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 2) continue;
    const angle = hemisphere * (lst - s.ra), end = angle - Math.PI / 2, start = end - hemisphere * length;
    const floor = .085 + .035 * clamp((7.8 - s.mag) / 3.3, 0, 1);
    const alpha = clamp(.86 * Math.pow(10, -.27 * s.mag), floor, .92);
    /* Widths are CSS pixels; layer() applies DPR exactly once. */
    const width = s.mag < 1 ? 1.6 : s.mag < 1.5 ? 1.3 : s.mag < 3 ? .95 : s.mag < 4.5 ? .75 : .65;
    g.beginPath(); g.arc(cx, cy, radius, start, end, hemisphere < 0);
    if (s.mag < 3) {
      const b = clamp((3 - s.mag) / 3, 0, 1);   /* the brightest bloom like an emulsion: wider and stronger */
      g.save(); g.filter = `blur(${(1.2 + 1.6 * b) * dpr}px)`;
      g.strokeStyle = `rgba(${s.rgb},${.25 + .2 * b})`;
      g.lineWidth = 3.6 + 2.4 * b; g.stroke(); g.restore();
    }
    g.strokeStyle = `rgba(${s.rgb},${alpha})`; g.lineWidth = width; g.stroke();
    const x = cx + radius * Math.cos(end), y = cy + radius * Math.sin(end);
    if (x > -3 && x < W + 3 && y > -3 && y < ridge(x, true)) {
      /* Bright tips are drawn only in tick(), so the pulse is not buried. */
      if (s.mag >= 3 || !collect) {
        /* In the first minutes the arcs are too short to see, so the faint stars show as points instead. */
        const early = s.mag >= 4.5 ? 1 + 2.2 * clamp(1 - seconds / 180, 0, 1) : 1;
        g.fillStyle = `rgba(${s.rgb},${Math.min(.9, alpha * 1.6 * early)})`;
        g.beginPath(); g.arc(x, y, s.mag < 3 ? 1.3 : .7, 0, TAU); g.fill();
      }
      if (collect && s.mag < 5) tips.push({x, y, s, alpha});
    }
  }
  drawFlights(g, d, seconds);
  g.restore(); g.globalCompositeOperation = 'source-over';
}
/* Aircraft: in some twelve-minute slots (two or so an hour), one crossing, placed by the slot and the seed, so every tab and every
 * recording agrees. Its strobes stay in the exposure as a dashed line until the hour's exposure ends. */
const SLOT = 720000;
function flight(k) {
  const r = randomFor(seed * 7919 ^ k * 2654435761);
  if (r() < .55) return null;
  const t0 = k * SLOT + r() * (SLOT - 40000), dur = 26000 + r() * 12000, ltr = r() < .5;
  const y0 = .3 + .32 * r(), y1 = y0 + (r() - .55) * .22;
  return { t0, dur, x0: ltr ? -.03 : 1.03, x1: ltr ? 1.03 : -.03, y0, y1 };
}
const along = (f, p) => [(f.x0 + (f.x1 - f.x0) * p) * W, (f.y0 + (f.y1 - f.y0) * p) * H];
function drawFlights(g, d, seconds) {
  const end = d.getTime(), begin = end - seconds * 1000;
  for (let k = Math.floor(begin / SLOT) - 1; k <= Math.floor(end / SLOT); k++) {
    const f = flight(k); if (!f) continue;
    const a = Math.max(f.t0, begin), b = Math.min(f.t0 + f.dur, end);
    if (b <= a) continue;
    /* a faint steady line, and the strobe every 1.2 s: white, with the red beacon between */
    const [ax, ay] = along(f, (a - f.t0) / f.dur), [bx, by] = along(f, (b - f.t0) / f.dur);
    g.strokeStyle = 'rgba(214,222,226,.07)'; g.lineWidth = .8;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    for (let t = Math.ceil((a - f.t0) / 1200) * 1200; f.t0 + t <= b; t += 1200) {
      const [x, y] = along(f, t / f.dur), red = (t / 1200) % 2 === 1;
      g.fillStyle = red ? 'rgba(255,120,96,.42)' : 'rgba(232,240,250,.5)';
      g.fillRect(x - 1.6, y - .5, 3.2, 1);
    }
  }
}
function aircraft(d, ms) {
  const k = Math.floor(d.getTime() / SLOT);
  for (const f of [flight(k - 1), flight(k)]) {
    if (!f || d.getTime() < f.t0 || d.getTime() > f.t0 + f.dur) continue;
    const t = d.getTime() - f.t0, [x, y] = along(f, t / f.dur), phase = t % 1200;
    if (phase > 180 && !(phase > 600 && phase < 760)) continue;
    const rgb = phase < 180 ? '230,241,255' : '255,115,90';
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 6);
    halo.addColorStop(0, `rgba(${rgb},.6)`); halo.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = halo; ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = `rgba(${rgb},.95)`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
  }
}
function tick(ms) {
  requestAnimationFrame(tick);
  if (document.hidden || ms - frameAt < (motion.matches ? 100 : 15)) return;
  frameAt = ms;
  const d = now(), seconds = d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
  const key = Math.floor(d.getTime() / 1000), hour = Math.floor(d.getTime() / 3600000);
  if (key !== secondKey) {
    drawExposure(exposure, d, seconds, true); secondKey = key;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    document.querySelector('#tm .t').textContent = time;
    document.querySelector('#tm .a').textContent = JA ? `露光 ${pad(d.getMinutes())} 分` : `EXPOSURE ${pad(d.getMinutes())} MIN`;
    canvas.setAttribute('aria-label', JA ? `${time}、丘の上に星の軌跡。正時からの分数が弧の長さに表れます。` : `${time}. Star trails above a hillside. Arc length shows minutes since the hour.`);
  }
  ctx.drawImage(sky, 0, 0, W, H);
  if (seconds < 4) {
    if (oldHour !== hour) { drawExposure(old, new Date(d.getTime() - seconds * 1000 - 1), 3600, false); oldHour = hour; }
    ctx.globalAlpha = (1 - seconds / 4) * (fixedTime || preview !== null ? Math.max(0, 1 - (ms - epoch) / 4000) : 1);
    ctx.drawImage(old, 0, 0, W, H); ctx.globalAlpha = 1;
  }
  ctx.drawImage(exposure, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.save(); ctx.clip(skyClip);
  for (const {x, y, s, alpha} of tips) {
    const pulse = motion.matches ? 1 : 1 + .22 * Math.sin(ms * .0017 + s.phase) + .08 * Math.sin(ms * .0041 + s.phase);
    const bright = s.mag < 3, radius = s.mag < 1 ? 1.65 : bright ? 1.3 : .7;
    if (bright) {
      const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
      halo.addColorStop(0, `rgba(${s.rgb},${alpha * pulse * .32})`); halo.addColorStop(1, `rgba(${s.rgb},0)`);
      ctx.fillStyle = halo; ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
    }
    ctx.fillStyle = `rgba(${s.rgb},${Math.min(.95, alpha * pulse * (bright ? .85 : .35))})`;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  }
  if (!motion.matches) aircraft(d, ms);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(land, 0, 0, W, H);
  ctx.drawImage(finish, 0, 0, W, H);
}
/* The small playground only changes the preview, never stored preferences. */
$('pg').setAttribute('aria-label', JA ? '時刻を試す' : 'Playground');
$('explain').textContent = JA ? '毎正時、新しい露光が始まります。分が進むほど、星の弧が長くなります。' : 'A new exposure begins each hour. As minutes pass, the arcs grow longer.';
$('hour-label').textContent = JA ? '時' : 'Hour'; $('minute-label').textContent = JA ? '分' : 'Minute';
$('live').textContent = JA ? '現在の時刻に戻る' : 'Return to current time';
$('pg').addEventListener('click', () => {
  const open = $('playground').hidden; $('playground').hidden = !open; $('pg').setAttribute('aria-expanded', String(open));
  if (open) { const d = now(); $('hour').value = d.getHours(); $('minute').value = d.getMinutes(); }
});
for (const id of ['hour', 'minute']) $(id).addEventListener('input', () => { preview = clamp(Math.floor(Number($('hour').value) || 0), 0, 23) * 60 + Number($('minute').value); epoch = performance.now(); secondKey = ''; oldHour = ''; });
$('live').addEventListener('click', () => { const p = new URLSearchParams(location.hash.slice(1).replace(/#/g, '&')); p.delete('t'); p.delete('date'); preview = null; fixedTime = null; fixedDay = null; location.hash = p.toString(); secondKey = ''; });
window.addEventListener('keydown', e => { if (e.key === 'Escape') { $('playground').hidden = true; $('pg').setAttribute('aria-expanded', 'false'); $('pg').focus(); } });
window.addEventListener('hashchange', readHash); window.addEventListener('resize', resize);
document.documentElement.lang = JA ? 'ja' : 'en'; document.title = JA ? '星の軌跡の時計' : 'Star Trail Clock';
readHash(); resize(); requestAnimationFrame(tick);
})();
