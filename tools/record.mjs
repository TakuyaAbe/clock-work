// Frame-exact recordings. Time inside the page is virtual (Date, performance.now, requestAnimationFrame, timers
// and Math.random) and moves on by exactly one frame between screenshots, so a slow machine records the same video.
//
//   node tools/record.mjs komorebi/extension/newtab.html --hash "seed=0" --start 2026-10-12T10:09:42+09:00 \
//     --settle 8 --secs 18 --hide "#pg" --mp4 media/komorebi/komorebi_clock_daytime.mp4 --fade-in 0.6 --fade-out 0.8
//
//   --mp4 FILE       encode the frames (H.264) and drop them; without it the frames stay
//   --frames DIR     where the JPEG frames go (default: next to the mp4)   --keep-frames
//   --secs 10  --fps 30  --size 1280x720  --dpr 1.5 (so 1920x1080)  --locale en-US  --tz Asia/Tokyo
//   --start ISO      the page's clock when it loads (default: now)
//   --settle 8       seconds of virtual time before the first frame: fade-ins, the first layout
//   --seed 4242      the seed for Math.random
//   --hide SEL       a CSS selector to hide
//   --setup FILE     a module. Its default export runs after settling, async (page, { wait }) => {}, where wait moves
//                    virtual time; its frame export runs before each frame, async (page, { i, t }) => {}
//   --fade-in S  --fade-out S   fades at the two ends of the mp4
//   --audio          also record WebAudio (an OfflineAudioContext on the same clock) into the mp4
//   --software       SwiftShader instead of the GPU
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { launch, pageURL, size, watch, hooks, H264, report, isMain } from "./lib.mjs";

/* runs in the page before its own scripts */
function virtualTime({ start, seed, audio, seconds }) {
  let wall = start, perf = 0;
  const RealDate = Date;
  window.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(wall); }
    static now() { return wall; }
  };
  performance.now = () => perf;
  let frames = [], nextFrame = 1;
  window.requestAnimationFrame = cb => { frames.push({ id: nextFrame, cb }); return nextFrame++; };
  window.cancelAnimationFrame = id => { frames = frames.filter(f => f.id !== id); };
  const timers = new Map();
  let nextTimer = 1;
  window.setTimeout = (fn, ms, ...args) => { timers.set(nextTimer, { at: perf + Math.max(0, +ms || 0), fn, args }); return nextTimer++; };
  window.setInterval = (fn, ms, ...args) => {
    const every = Math.max(1, +ms || 0);
    timers.set(nextTimer, { at: perf + every, every, fn, args });
    return nextTimer++;
  };
  window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
  let s = seed % 2147483647 || 1;
  Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  window.__step = ms => {
    const end = perf + ms;
    for (;;) {                                         /* the timers that fall due on the way, in order */
      let id = 0, due = null;
      for (const [k, t] of timers) if (t.at <= end && (!due || t.at < due.at)) { id = k; due = t; }
      if (!due) break;
      wall += due.at - perf; perf = due.at;
      if (due.every) due.at += due.every; else timers.delete(id);
      try { if (typeof due.fn === "function") due.fn(...due.args); else (0, eval)(String(due.fn)); } catch (e) { console.error(e); }
    }
    wall += end - perf; perf = end;
    const run = frames; frames = [];
    for (const f of run) f.cb(perf);
  };
  if (!audio) return;
  const rate = 48000, ctx = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
  Object.defineProperty(ctx, "currentTime", { get: () => perf / 1000 });
  Object.defineProperty(ctx, "state", { get: () => "running" });
  ctx.resume = ctx.suspend = () => Promise.resolve();
  window.AudioContext = window.webkitAudioContext = function () { return ctx; };
  window.__audio = async () => {                       /* 16-bit stereo WAV, as base64 */
    const buf = await ctx.startRendering(), n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
    const v = new DataView(new ArrayBuffer(44 + n * 4));
    const tag = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    tag(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); tag(8, "WAVEfmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
    tag(36, "data"); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) v.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
    let bin = "";
    const bytes = new Uint8Array(v.buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
}

export async function record(page, o = {}) {
  const fps = +(o.fps || 30), secs = +(o.secs || 10), settle = +(o.settle ?? 8), dt = 1000 / fps;
  const [w, h] = size(o.size || "1280x720");
  const start = o.start ? Date.parse(o.start) : Date.now();
  if (Number.isNaN(start)) throw new Error(`not a date: ${o.start}`);
  const frames = o.frames || (o.mp4 ? o.mp4.replace(/\.mp4$/i, "") + "_frames" : "frames");
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const { setup, frame } = await hooks(o.setup, o.frame);
  const browser = await launch(o);
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(o.dpr || 1.5),
    ...(o.locale && { locale: o.locale }), ...(o.tz && { timezoneId: o.tz }) });
  await context.addInitScript(virtualTime, { start, seed: +(o.seed || 4242), audio: !!o.audio, seconds: settle + secs + 120 });
  const p = await context.newPage();
  const errors = [];
  watch(p, errors);
  await p.goto(await pageURL(page, o.hash || ""), { waitUntil: "load" });
  if (o.hide) await p.addStyleTag({ content: `${o.hide}{display:none!important}` });
  const step = n => p.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) window.__step(dt); }, [n, dt]);
  await step(Math.round(settle * fps));
  if (setup) await setup(p, { wait: s => step(Math.round(s * fps)) });
  const t0 = await p.evaluate(() => performance.now());
  const n = Math.round(secs * fps);
  for (let i = 0; i < n; i++) {
    if (frame) await frame(p, { i, t: i / fps });
    await step(1);
    await p.screenshot({ path: join(frames, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 94 });
  }
  let wav;
  if (o.audio) writeFileSync(wav = join(frames, "audio.wav"), Buffer.from(await p.evaluate(() => window.__audio()), "base64"));
  await browser.close();
  console.log(`${n} frames`);
  if (o.mp4) {
    encode(frames, o.mp4, { fps, secs, fadeIn: +(o.fadeIn || 0), fadeOut: +(o.fadeOut || 0), wav, wavFrom: (t0 + dt) / 1000 });
    if (!o.keepFrames) rmSync(frames, { recursive: true, force: true });
  } else console.log(frames);
  return { frames, errors };
}

/* frames f0000.jpg ... (and a WAV) into an mp4 */
export function encode(frames, mp4, { fps = 30, secs, fadeIn = 0, fadeOut = 0, wav, wavFrom = 0 }) {
  mkdirSync(dirname(resolve(mp4)), { recursive: true });
  const fades = kind => [fadeIn && `${kind}=t=in:st=0:d=${fadeIn}`, fadeOut && `${kind}=t=out:st=${(secs - fadeOut).toFixed(3)}:d=${fadeOut}`].filter(Boolean);
  const args = ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-framerate", String(fps), "-i", join(frames, "f%04d.jpg")];
  if (wav) args.push("-ss", wavFrom.toFixed(3), "-t", String(secs), "-i", wav);
  args.push("-vf", [...fades("fade"), "format=yuv420p"].join(","), ...H264, "-r", String(fps));
  if (wav) args.push("-af", fades("afade").join(",") || "anull", "-c:a", "aac", "-b:a", "192k", "-shortest");
  execFileSync("ffmpeg", [...args, mp4], { stdio: "inherit" });
  console.log(mp4);
}

if (isMain(import.meta.url)) {
  const { values: v, positionals: [page] } = parseArgs({ allowPositionals: true, options: {
    hash: { type: "string" }, mp4: { type: "string" }, frames: { type: "string" }, "keep-frames": { type: "boolean" },
    secs: { type: "string" }, fps: { type: "string" }, size: { type: "string" }, dpr: { type: "string" },
    locale: { type: "string" }, tz: { type: "string" }, start: { type: "string" }, settle: { type: "string" },
    seed: { type: "string" }, hide: { type: "string" }, setup: { type: "string" },
    "fade-in": { type: "string" }, "fade-out": { type: "string" }, audio: { type: "boolean" }, software: { type: "boolean" } } });
  if (!page) { console.log("node tools/record.mjs <page> [options]: the options are at the top of tools/record.mjs"); process.exit(2); }
  const { errors } = await record(page, { ...v, keepFrames: v["keep-frames"], fadeIn: v["fade-in"], fadeOut: v["fade-out"] });
  report(errors);
}
