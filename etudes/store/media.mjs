// Clock Studies' store images, made again from the built extension (run `npm run build:etudes` first): Tokyo, in English.
//
//   node etudes/store/media.mjs           into dist/etudes/store-upload
//   --out DIR                             somewhere else, to look before replacing
//
// a: the chooser open over the newest clock; b: the newest clock; c–e: the older ones; the promo tiles: the three side by side.
import { execFileSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { shoot } from "../../tools/shoot.mjs";
import { report } from "../../tools/lib.mjs";

process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
const PAGE = "dist/etudes/extension/newtab.html", AT = { locale: "en-US", tz: "Asia/Tokyo", wait: 8 };
const { values: v } = parseArgs({ options: { out: { type: "string" } } });
const out = v.out || "dist/etudes/store-upload", errors = [];
const ff = (...args) => execFileSync("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", ...args]);

/* b: the newest clock in the frame; c–e: the older clocks' own store screenshots, as they were made (kinetic's page has no #t=) */
errors.push(...(await shoot(PAGE, ["clock=startrail&t=21:47:20&seed=0"], { ...AT, out, names: ["screenshot_1280x800_b"] })).errors);
for (const [k, from] of [["c", "komorebi/store/screenshot_1280x800_a.png"], ["d", "kinetic/store/screenshot_1280x800_a.png"],
                         ["e", "komorebi/store/screenshot_1280x800_b.png"]]) copyFileSync(from, join(out, `screenshot_1280x800_${k}.png`));
errors.push(...(await shoot(PAGE, ["clock=startrail&t=21:47:20&seed=0"], { ...AT, out, names: ["screenshot_1280x800_a"], after: 1,
  eval: "document.getElementById('sw-b').click()" })).errors);

/* the promo tiles: a vertical slice of each clock, oldest on the left, the newest on the right; the captions at the foot cut off */
const slice = (w, h) => ["d", "c", "b"].map(k => ["-i", join(out, `screenshot_1280x800_${k}.png`)]).flat()
  .concat(["-filter_complex", [0, 1, 2].map(i => `[${i}]crop=iw:ih*.86:0:0,scale=-2:${h},crop=${Math.ceil(w / 3)}:${h}[s${i}]`).join(";") +
    `;[s0][s1][s2]hstack=3,crop=${w}:${h}`]);
ff(...slice(1400, 560), join(out, "promo_marquee_1400x560.png"));
ff(...slice(440, 280), join(out, "promo_small_440x280.png"));
console.log(join(out, "promo_marquee_1400x560.png") + "\n" + join(out, "promo_small_440x280.png"));
report(errors);
