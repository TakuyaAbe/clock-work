// Width Clock: each number is as wide as the time it counts.
// The hours, minutes, seconds and hundredths of a second are four rows, each its own number repeated
// across the page.
// The digits are hairlines that move along one path through a variable font's axes, from
// condensed at zero to extended at the maximum, so a small number fills its row with many
// narrow copies and a large one with a few wide ones.
//
// Hash, for checking and for pictures:
//   t=HH:MM[:SS]             stop the clock at this time
//   lo=wdth,XTRA,YTFI,wght   the axes at zero        (default 25,456,788,100)
//   hi=wdth,XTRA,YTFI,wght   the axes at the maximum (default 151,603,788,100)
//   ls=-0.12  gap=-0.006     letter-spacing and the space between rows, in em
//   pad=0.1                  the space above and below, as a part of the page's height
//   gui                      open the playground
// The playground (the faint ring in the lower right, or the G key) changes the same values and
// keeps them for the next tab (localStorage); the hash wins over what was kept.
(() => {
  "use strict";
  const q = new URLSearchParams(location.hash.slice(1));
  const JA = (navigator.language || "en").startsWith("ja");
  const AXES = ["wdth", "XTRA", "YTFI", "wght"];     // width, counter width, figure height, weight
  const RANGE = [[25, 151, 1], [323, 603, 1], [560, 788, 1], [100, 1000, 10]];   // the font's own limits
  const P0 = { lo: [25, 456, 788, 100], hi: [151, 603, 788, 100], ls: -0.12, gap: -0.006, pad: 0.1 };
  const KEY = "wdth.params";
  const P = JSON.parse(JSON.stringify(P0));
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v) for (const k in P0) if (k in v && (Array.isArray(P0[k]) ? Array.isArray(v[k]) && v[k].length === 4 && v[k].every(isFinite) : isFinite(v[k]))) P[k] = v[k];
  } catch (e) {}
  for (const k of ["lo", "hi"]) { const v = (q.get(k) || "").split(",").map(Number); if (v.length === 4 && v.every(isFinite)) P[k] = v; }
  for (const k of ["ls", "gap", "pad"]) if (q.has(k) && isFinite(+q.get(k))) P[k] = +q.get(k);
  const keep = () => {
    try {
      if (JSON.stringify(P) === JSON.stringify(P0)) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(P));
    } catch (e) {}
  };

  const STEPS = 64;
  const at = p => AXES.map((a, i) => `"${a}" ${(P.lo[i] + (P.hi[i] - P.lo[i]) * p).toFixed(2)}`).join(",");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  // The playground's clock: seconds since midnight while the time is set by hand, null for the real time.
  let held = (() => {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(q.get("t") || "");
    return m ? (+m[1] % 24) * 3600 + (+m[2] % 60) * 60 + +(m[3] || 0) % 60 : null;
  })();

  const clock = document.getElementById("clock");
  // hours, minutes, seconds, hundredths of a second: how many digits, and how fast a wrap decays (s)
  const units = [[2, 0.16], [2, 0.16], [2, 0.16], [2, 0.045]].map(([n, tau]) => {
    const num = document.createElement("div"); num.className = "num";
    clock.append(num);
    return { n, tau, num, text: "", off: 0, last: null };
  });
  const ROWS = units.length;

  // The advance of one digit, in em, along the path: measured, then inverted.
  const probe = document.getElementById("probe");
  let table = [], rising = true;
  function measure() {
    table = [];
    for (let i = 0; i <= STEPS; i++) {
      probe.style.fontVariationSettings = at(i / STEPS);
      table.push(probe.getBoundingClientRect().width / 2000);
    }
    rising = table.every((a, i) => i === 0 || a >= table[i - 1]) && table[STEPS] > table[0];
  }
  function pathFor(adv, g) {                         // em advance -> place on the path, 0 to 1
    if (!rising) return g;                           // a path that does not widen all the way: by value, not by width
    if (adv <= table[0]) return 0;
    for (let i = 1; i <= STEPS; i++)
      if (adv <= table[i]) return (i - 1 + (adv - table[i - 1]) / (table[i] - table[i - 1] || 1)) / STEPS;
    return 1;
  }

  // Four rows, hours, minutes, seconds and hundredths, filling the page. Each row is its number, repeated
  // from the middle of the page until it runs off both edges: the smaller the number, the
  // thinner the digits and the more of them. The digits get shorter as they widen, so the font
  // size follows the four heights: together the rows are always as tall as the page.
  const BASE = 0.842;                                // em: the baseline below the top of a box whose line-height is 1
  const height = p => (P.lo[2] + (P.hi[2] - P.lo[2]) * p) / 1000 - 0.012;   // em: the digits' height, from the figure height axis
  let W = 0, H = 0, e0 = 0, e1 = 0;                  // the page; the width of one digit at 0 and at the maximum, in em
  function layout() {
    W = innerWidth; H = innerHeight;
    e0 = Math.max(0.01, table[0] + P.ls); e1 = Math.max(0.01, table[STEPS] + P.ls);
    clock.style.letterSpacing = P.ls + "em";
    units.forEach(u => { u.text = ""; });
  }

  const two = n => String(n).padStart(2, "0");
  const digits = (v, n) => String(v).padStart(n, "0");
  const sr = document.getElementById("sr");
  let minuteShown = -1, prev = 0, onFrame = null;
  function frame(now) {
    const dt = Math.min(0.1, (now - prev) / 1000 || 0); prev = now;
    const d = new Date();
    const t = held !== null
      ? { h: Math.floor(held / 3600), m: Math.floor(held / 60) % 60, s: Math.floor(held) % 60, ms: 0 }
      : { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), ms: still.matches ? 0 : d.getMilliseconds() };
    const sec = t.s + t.ms / 1000, min = t.m + sec / 60, hr = t.h + min / 60;
    const vals = [[t.h, hr / 24], [t.m, min / 60], [t.s, sec / 60], [Math.floor(t.ms / 10), t.ms / 1000]];
    let sum = 0;
    units.forEach((u, i) => {
      const f = vals[i][1];
      // When a number wraps, it does not jump back: the difference decays away.
      if (u.last !== null && Math.abs(f - u.last) > 0.05 && !still.matches) u.off += u.last - f;
      u.last = f;
      u.off *= Math.exp(-dt / u.tau);
      if (Math.abs(u.off) < 1e-4) u.off = 0;
      const g = Math.min(1, Math.max(0, f + u.off));
      const em = e0 + (e1 - e0) * g;                 // the width of one digit
      u.em = em * u.n;                               // and of the number
      u.p = pathFor(em - P.ls, g);
      sum += u.h = height(u.p);
    });
    const gaps = (ROWS - 1) * P.gap, pad = H * P.pad;
    const fs = Math.min((H - 2 * pad) / (sum + gaps), W / (2 * Math.max(e0, e1)));
    let y = (H - (sum + gaps) * fs) / 2;
    units.forEach((u, i) => {
      const st = u.num.style;
      st.fontSize = fs + "px";
      st.top = y + (u.h - BASE) * fs + "px";
      st.fontVariationSettings = at(u.p);
      y += (u.h + P.gap) * fs;
      // An odd number of copies, so one stands in the middle and the rest leave in pairs, off the page.
      const s = digits(vals[i][0], u.n).repeat(Math.min(401, 2 * Math.ceil(W / 2 / (u.em * fs) + 0.5) + 1));
      if (s !== u.text) u.num.textContent = u.text = s;
    });
    if (t.m !== minuteShown) { minuteShown = t.m; sr.textContent = two(t.h) + ":" + two(t.m); }
    if (onFrame) onFrame(t);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /*  The playground: the time, the two ends of the path, the spacing    */
  /* ------------------------------------------------------------------ */
  // The faint ring in the lower right (aria-label "playground"), the G key or #gui open a bar.
  // The axes and the spacing are kept for the next tab; the time is not: "now" goes back to it.
  const TX = JA
    ? { bar: "調整", time: "時刻", now: "いま", lo: "ゼロのとき", hi: "最大のとき", reset: "戻す", copy: "値をコピー", copied: "コピーしました",
        axes: ["幅", "字の中", "高さ", "太さ"], ls: "字間", gap: "行間", pad: "余白" }
    : { bar: "Playground", time: "Time", now: "Now", lo: "At zero", hi: "At the most", reset: "Reset", copy: "Copy values", copied: "Copied",
        axes: ["Width", "Counter", "Height", "Weight"], ls: "Tracking", gap: "Row gap", pad: "Margin" };
  const pgBtn = document.getElementById("pg");
  let bar = null;
  function build() {
    const css = document.createElement("style");
    css.textContent = `
#wd-pg{position:fixed;left:16px;right:56px;bottom:16px;z-index:10;display:none;flex-direction:column;gap:8px;padding:10px 14px;border-radius:10px;
  background:rgba(20,22,26,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#eee;
  font:12px/1.2 -apple-system,BlinkMacSystemFont,"Helvetica Neue","Hiragino Sans",sans-serif;font-variant-numeric:tabular-nums}
#wd-pg.on{display:flex}
#wd-pg .row{display:grid;grid-template-columns:6.5em repeat(4,minmax(0,1fr));gap:6px 16px;align-items:center}
#wd-pg .row>span{opacity:.6;white-space:nowrap}
#wd-pg label{display:grid;grid-template-columns:4.2em minmax(40px,1fr) 3.4em;gap:8px;align-items:center}
#wd-pg label span{opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wd-pg label b{font-weight:400;text-align:right}
#wd-pg .end{display:flex;gap:8px;justify-content:flex-end}
#wd-pg button{background:rgba(255,255,255,.12);color:#eee;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 10px;font:inherit;cursor:pointer;white-space:nowrap}
#wd-pg button:hover{background:rgba(255,255,255,.22)}
#wd-pg button.off{background:rgba(255,226,180,.85);border-color:rgba(255,226,180,.9);color:#1b1815}
#wd-pg button:focus-visible,#wd-pg input:focus-visible{outline:2px solid #fff;outline-offset:1px}
#wd-pg input[type=range]{width:100%;height:18px;margin:0;background:transparent;-webkit-appearance:none;appearance:none}
#wd-pg input[type=range]::-webkit-slider-runnable-track{height:18px;background:linear-gradient(rgba(255,255,255,.28),rgba(255,255,255,.28)) center/100% 2px no-repeat}
#wd-pg input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:4px;height:18px;background:#fff;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.45)}
@media (max-width:860px){#wd-pg .row{grid-template-columns:repeat(2,minmax(0,1fr))} #wd-pg .row>span{grid-column:1 / -1}}`;
    document.head.append(css);
    bar = document.createElement("div");
    bar.id = "wd-pg"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", TX.bar);
    const sliders = [];
    const slider = (name, min, max, step, get, set, show) => {
      const l = document.createElement("label"), s = document.createElement("span"), i = document.createElement("input"), b = document.createElement("b");
      s.textContent = name; i.type = "range"; i.min = min; i.max = max; i.step = step;
      const sync = () => { i.value = get(); b.textContent = show ? show(get()) : get(); };
      i.addEventListener("input", () => { set(+i.value); b.textContent = show ? show(+i.value) : +i.value; });
      l.append(s, i, b); sliders.push(sync); sync();
      return l;
    };
    const row = (title, ...kids) => {
      const r = document.createElement("div"); r.className = "row";
      const s = document.createElement("span"); s.textContent = title;
      r.append(s, ...kids); bar.append(r);
      return r;
    };
    const changed = remeasure => { if (remeasure) measure(); layout(); keep(); };

    // the time of day
    const clockStr = v => two(Math.floor(v / 3600)) + ":" + two(Math.floor(v / 60) % 60) + ":" + two(Math.floor(v) % 60);
    const now = document.createElement("button"); now.type = "button"; now.textContent = TX.now;
    let shown = 0;
    const time = slider(TX.time, 0, 86399, 1, () => shown, v => { held = v; now.classList.add("off"); }, clockStr);
    time.style.gridColumn = "2 / span 3";
    time.style.gridTemplateColumns = "4.2em minmax(40px,1fr) 5em";
    now.addEventListener("click", () => { held = null; now.classList.remove("off"); });
    now.classList.toggle("off", held !== null);
    const tEnd = document.createElement("div"); tEnd.className = "end"; tEnd.append(now);
    row("", time, tEnd);
    const tIn = time.querySelector("input"), tOut = time.querySelector("b");
    onFrame = t => {
      if (!bar.classList.contains("on") || held !== null && document.activeElement === tIn) return;
      shown = t.h * 3600 + t.m * 60 + t.s; tIn.value = shown; tOut.textContent = clockStr(shown);
    };

    // the two ends of the path, axis by axis
    for (const k of ["lo", "hi"])
      row(TX[k], ...AXES.map((a, i) => slider(TX.axes[i], RANGE[i][0], RANGE[i][1], RANGE[i][2], () => P[k][i], v => { P[k][i] = v; changed(true); })));

    // the spacing
    const reset = document.createElement("button"); reset.type = "button"; reset.textContent = TX.reset;
    reset.addEventListener("click", () => { Object.assign(P, JSON.parse(JSON.stringify(P0))); changed(true); sliders.forEach(f => f()); });
    const copy = document.createElement("button"); copy.type = "button"; copy.textContent = TX.copy;
    copy.addEventListener("click", () => {
      const s = `lo=${P.lo.join(",")}&hi=${P.hi.join(",")}&ls=${P.ls}&gap=${P.gap}&pad=${P.pad}`;
      (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(
        () => { copy.textContent = TX.copied; setTimeout(() => { copy.textContent = TX.copy; }, 1200); },
        () => { prompt(TX.copy, s); });
    });
    const end = document.createElement("div"); end.className = "end"; end.append(copy, reset);
    row("",
      slider(TX.ls, -0.12, 0.12, 0.005, () => P.ls, v => { P.ls = v; changed(false); }),
      slider(TX.gap, -0.15, 0.2, 0.002, () => P.gap, v => { P.gap = v; changed(false); }),
      slider(TX.pad, 0, 0.1, 0.002, () => P.pad, v => { P.pad = v; changed(false); }),
      end);
    document.body.append(bar);
  }
  function toggle(on) {
    if (!bar) build();
    on = on === undefined ? !bar.classList.contains("on") : on;
    bar.classList.toggle("on", on);
    pgBtn.setAttribute("aria-expanded", on);
  }
  pgBtn.setAttribute("aria-label", TX.bar);
  pgBtn.addEventListener("click", () => toggle());
  addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "g" || e.key === "G") toggle();
    else if (e.key === "Escape" && bar && bar.classList.contains("on")) toggle(false);
  });

  document.documentElement.lang = navigator.language || "en";
  document.fonts.load('100px "Flex Digits"', "0123456789").then(() => {
    measure(); layout();
    addEventListener("resize", layout);
    clock.classList.add("ready");
    if (q.has("gui")) toggle(true);
    requestAnimationFrame(frame);
  });
})();
