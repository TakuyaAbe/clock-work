// Sunlit Scale's store images and promo videos, made again from the page: fixed desks (#seed), Tokyo, in English.
//
//   node sunlit/store/media.mjs shots     the store images, into dist/sunlit/store-upload
//   node sunlit/store/media.mjs videos    the promo videos, into media/sunlit
//   --out DIR                             somewhere else, to look before replacing
//
// The README's screenshots (sunlit/store/) and the site's image (site/img/sunlit.jpg, from c) are copies: copy them by hand.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { shoot } from "../../tools/shoot.mjs";
import { record, encode } from "../../tools/record.mjs";
import { crossfade } from "../../tools/crossfade.mjs";
import { report } from "../../tools/lib.mjs";

process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
const PAGE = "sunlit/extension/newtab.html", AT = { locale: "en-US", tz: "Asia/Tokyo" };
const { values: v, positionals: [what = ""] } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
if (!["shots", "videos"].includes(what)) { console.log("node sunlit/store/media.mjs shots|videos [--out DIR]"); process.exit(2); }
const errors = [];
/* in the playground: the time slider to a minute of the day, and optionally the speed and play */
const scrub = (minute, speed) => async (p, { wait }) => {
  await p.evaluate(([m, s]) => {
    const set = (k, value, ...types) => {
      const el = document.querySelector(`[data-k=${k}]`);
      el.value = value;
      for (const type of types) el.dispatchEvent(new Event(type, { bubbles: true }));
    };
    if (s) set("speed", String(s), "change");
    set("time", String(m), "input", "change");
  }, [minute, speed]);
  await wait(1.5);
  if (speed) await p.click("[data-k=play]");
  await p.mouse.move(640, 300);
};

if (what === "shots") {
  const out = v.out || "dist/sunlit/store-upload";
  /* the morning, midday, the amber of the late afternoon, the desk lamp at night */
  const four = [["a", "t=08:15:07&seed=1"], ["b", "t=12:40:20&seed=4"], ["c", "t=16:52:24&seed=3"], ["d", "t=22:10:36&seed=4"]];
  errors.push(...(await shoot(PAGE, four.map(s => s[1]), { ...AT, out, names: four.map(s => `screenshot_1280x800_${s[0]}`), wait: 7 })).errors);
  /* the playground open in the blue hour, 18:20 */
  errors.push(...(await shoot(PAGE, ["gui&seed=9"], { ...AT, out, names: ["screenshot_1280x800_e"], wait: 7, setup: scrub(18 * 60 + 20) })).errors);
  errors.push(...(await shoot(PAGE, ["t=16:52:24&seed=3"], { ...AT, out, names: ["promo_marquee_1400x560"], size: "1400x560", wait: 7, hide: "#pg,#tm" })).errors);
  /* the small tile: the figures in the light, from c */
  execFileSync("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", join(out, "screenshot_1280x800_c.png"),
    "-vf", "crop=770:490:330:150,scale=440:280:flags=lanczos", join(out, "promo_small_440x280.png")]);
  console.log(join(out, "promo_small_440x280.png"));
}

if (what === "videos") {
  const out = v.out || "media/sunlit", takes = join(out, "takes");
  /* for X: eight moments of the day, 3.2 s each, on the one desk, crossfaded into 20 s */
  const times = ["05:40", "07:40", "10:10", "12:40", "15:30", "16:55", "18:20", "22:10"], clips = [];
  for (const t of times) {
    const mp4 = join(takes, `take_${t.replace(":", "")}.mp4`);
    errors.push(...(await record(PAGE, { ...AT, hash: "seed=1", start: `2026-10-19T${t}:20+09:00`, settle: 8, secs: 3.2, hide: "#pg", mp4 })).errors);
    clips.push(mp4);
  }
  crossfade(join(out, "sunlit_scale_x.mp4"), clips, { fade: 0.8, fadeIn: 0.6, fadeOut: 0.8 });
  rmSync(takes, { recursive: true, force: true });
  /* the real clock from 10:09:50: the seconds step into the light, and the minute turns */
  errors.push(...(await record(PAGE, { ...AT, hash: "seed=1", start: "2026-10-19T10:09:42+09:00", settle: 8, secs: 18, hide: "#pg",
    mp4: join(out, "sunlit_scale_daytime.mp4"), fadeIn: 0.6, fadeOut: 0.8 })).errors);
  /* the playground at x3600 from 03:30: the whole day in 24 s, so it loops */
  const frames = join(out, "playground_frames");
  errors.push(...(await record(PAGE, { ...AT, hash: "gui&seed=1", start: "2026-10-19T10:09:42+09:00", settle: 8, secs: 24,
    frames, keepFrames: true, mp4: join(out, "sunlit_scale_playground_x3600.mp4"), setup: scrub(210, 3600) })).errors);
  /* and a lighter copy, under the 30 MB that phones and the web will play */
  encode(frames, join(out, "sunlit_scale_playground_x3600_small.mp4"), { secs: 24, crf: 18, maxrate: 8 });
  rmSync(frames, { recursive: true, force: true });
}

report(errors);
