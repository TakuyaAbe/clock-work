// Komorebi Clock's store images and promo videos, made again from the page: seed 0, Tokyo, in English.
//
//   node komorebi/store/media.mjs shots     the store images, into dist/komorebi/store-upload
//   node komorebi/store/media.mjs videos    the promo videos, into media/komorebi
//   --out DIR                               somewhere else, to look before replacing
//
// The README's screenshots (komorebi/store/) and the site's image (site/img/komorebi.jpg, from b) are copies: copy them by hand.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { shoot } from "../../tools/shoot.mjs";
import { record } from "../../tools/record.mjs";
import { crossfade } from "../../tools/crossfade.mjs";
import { report } from "../../tools/lib.mjs";

process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
const PAGE = "komorebi/extension/newtab.html", AT = { locale: "en-US", tz: "Asia/Tokyo" };
const { values: v, positionals: [what = ""] } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
if (!["shots", "videos"].includes(what)) { console.log("node komorebi/store/media.mjs shots|videos [--out DIR]"); process.exit(2); }
const errors = [];

if (what === "shots") {
  const out = v.out || "dist/komorebi/store-upload", day = "seed=0&date=2026-10-13";
  /* a morning, the golden hour, after sunset, a full moon */
  const four = [["a", `t=10:08&${day}`], ["b", `t=16:20&${day}`], ["c", `t=17:25&${day}`], ["d", "t=22:00&seed=0&date=2026-10-26"]];
  errors.push(...(await shoot(PAGE, four.map(s => s[1]), { ...AT, out, names: four.map(s => `screenshot_1280x800_${s[0]}`), wait: 7 })).errors);
  /* the playground open at dawn, 06:10 */
  errors.push(...(await shoot(PAGE, [`debug&${day}`], { ...AT, out, names: ["screenshot_1280x800_e"], wait: 7, after: 6,
    eval: "const r = document.querySelector('[data-k=time]'); r.value = '370';" +
          "r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));" })).errors);
  errors.push(...(await shoot(PAGE, [`t=16:00&${day}`], { ...AT, out, names: ["promo_marquee_1400x560"], size: "1400x560", wait: 7 })).errors);
  /* the small tile: the middle of b */
  execFileSync("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", join(out, "screenshot_1280x800_b.png"),
    "-vf", "crop=880:560:200:120,scale=440:280:flags=lanczos", join(out, "promo_small_440x280.png")]);
  console.log(join(out, "promo_small_440x280.png"));
}

if (what === "videos") {
  const out = v.out || "media/komorebi", takes = join(out, "takes");
  /* for X: eight moments of the day, 3.2 s each, crossfaded into 20 s */
  const times = ["05:50", "07:30", "10:10", "12:40", "15:30", "17:20", "19:20", "22:40"], clips = [];
  for (const [k, t] of times.entries()) {
    const mp4 = join(takes, `take_${t.replace(":", "")}.mp4`);
    errors.push(...(await record(PAGE, { ...AT, hash: `t=${t}&seed=0`, start: new Date(Date.UTC(2026, 9, 11, 1, 8) + k * 13700).toISOString(),
      seed: 12345 + k * 13700, settle: 8, secs: 3.2, hide: "#pg", mp4 })).errors);
    clips.push(mp4);
  }
  crossfade(join(out, "komorebi_clock_x.mp4"), clips, { fade: 0.8, fadeIn: 0.6, fadeOut: 0.8 });
  rmSync(takes, { recursive: true, force: true });
  /* the real clock from 10:09:50: the minute turns and its cloud passes */
  errors.push(...(await record(PAGE, { ...AT, hash: "seed=0", start: "2026-10-12T10:09:42+09:00", settle: 8, secs: 18, hide: "#pg",
    mp4: join(out, "komorebi_clock_daytime.mp4"), fadeIn: 0.6, fadeOut: 0.8 })).errors);
  /* the playground at x3600 from 03:30: the whole day in 24 s, so it loops */
  errors.push(...(await record(PAGE, { ...AT, hash: "debug&seed=0", start: "2026-10-12T10:09:42+09:00", settle: 8, secs: 24,
    mp4: join(out, "komorebi_clock_playground_x3600.mp4"),
    setup: async (p, { wait }) => {
      await p.evaluate(() => {
        const set = (k, value, ...types) => {
          const el = document.querySelector(`[data-k=${k}]`);
          el.value = value;
          for (const type of types) el.dispatchEvent(new Event(type, { bubbles: true }));
        };
        set("speed", "3600", "change");
        set("time", "210", "input", "change");
      });
      await wait(1.5);
      await p.click("[data-k=play]");
      await p.mouse.move(640, 300);
    } })).errors);
}

report(errors);
