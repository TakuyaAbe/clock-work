// The real sky of newtab.js, run in node: the place, sunrise and sunset, the new moons, the solar terms and the corner's line.
//
//   node --test komorebi/test/sky.test.mjs
//
// The section from "The real sky" up to nowInfo() is cut out of the page and run in Tokyo's time zone.
process.env.TZ = "Asia/Tokyo";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../extension/newtab.js", import.meta.url), "utf8");
const from = src.lastIndexOf("/* ----", src.indexOf("/*  The real sky")), to = src.indexOf("function nowInfo");
const pad = n => (n < 10 ? "0" : "") + n;
const sky = language => new Function("pad", "navigator", "window",
  src.slice(from, to) + "; return { PLACE, sunOn, newMoonJD, modelHour, skyAt, MODEL_RISE, MODEL_SET };")(pad, { language }, {});
const ja = sky("ja"), en = sky("en-US");
const minutes = h => Math.round(h * 60);

test("the place comes from the time zone", () => {
  assert.deepEqual(ja.PLACE, [35.68, 139.69]);
});

test("sunrise and sunset in Tokyo on 13 October 2026: 5:46 and 17:09", () => {
  const s = ja.sunOn(new Date(2026, 9, 13, 12));
  assert.ok(Math.abs(minutes(s.rise) - (5 * 60 + 46)) <= 1, `sunrise at ${s.rise} h`);
  assert.ok(Math.abs(minutes(s.set) - (17 * 60 + 9)) <= 1, `sunset at ${s.set} h`);
});

test("new moons within two minutes", () => {
  for (const [k, when] of [[0, "2000-01-06T18:14Z"], [297, "2024-01-11T11:57Z"], [300, "2024-04-08T18:21Z"]]) {
    const off = ((ja.newMoonJD(k) - 2440587.5) * 86400000 - Date.parse(when)) / 60000;
    assert.ok(Math.abs(off) <= 2, `lunation ${k} is ${off.toFixed(1)} min from ${when}`);
  }
});

test("each solar term of 2026 begins on its day in the printed calendar", () => {
  const first = [];
  let last = "";
  for (const d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
    const term = ja.skyAt(new Date(d), 12).line.split(" · ")[2].split(" ")[0];
    if (term !== last) first.push(`${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${term}`);
    last = term;
  }
  assert.deepEqual(first, ["01/01 冬至", "01/05 小寒", "01/20 大寒", "02/04 立春", "02/19 雨水", "03/05 啓蟄", "03/20 春分",
    "04/05 清明", "04/20 穀雨", "05/05 立夏", "05/21 小満", "06/06 芒種", "06/21 夏至", "07/07 小暑", "07/23 大暑", "08/07 立秋",
    "08/23 処暑", "09/07 白露", "09/23 秋分", "10/08 寒露", "10/23 霜降", "11/07 立冬", "11/22 小雪", "12/07 大雪", "12/22 冬至"]);
});

test("the line in the corner, in Japanese and in English", () => {
  assert.equal(ja.skyAt(new Date(2026, 9, 13), 18).line, "2026.10.13 火 · 月齢 2.7 · 寒露 菊花開");
  assert.equal(en.skyAt(new Date(2026, 9, 13), 18).line, "Tue 13 Oct 2026 · Lunar age 2.7 · Chrysanthemums bloom (Cold Dew)");
});

test("the real day is stretched onto the scene's day without a jump", () => {
  const s = ja.sunOn(new Date(2026, 9, 13, 12));
  assert.ok(Math.abs(ja.modelHour(s.rise, s) - ja.MODEL_RISE) < 1e-9);
  assert.ok(Math.abs(ja.modelHour(s.set, s) - ja.MODEL_SET) < 1e-9);
  for (let h = 0; h < 24; h += 0.01) {
    const step = ((ja.modelHour(h + 0.01, s) - ja.modelHour(h, s)) % 24 + 24) % 24;
    assert.ok(step < 0.05, `at ${h.toFixed(2)} h the scene's hour jumps by ${step.toFixed(3)}`);
  }
});
