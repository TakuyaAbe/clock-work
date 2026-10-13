// One video from several clips, each fading into the next (picture only).
//
//   node tools/crossfade.mjs media/komorebi/komorebi_clock_x.mp4 a.mp4 b.mp4 c.mp4 --fade 0.8 --fade-in 0.6 --fade-out 0.8
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { H264, isMain } from "./lib.mjs";

export function crossfade(out, clips, { fade = 0.8, fadeIn = 0, fadeOut = 0, fps = 30 } = {}) {
  const length = c => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", c]).toString();
  const graph = clips.map((_, i) => `[${i}:v]settb=AVTB,fps=${fps},format=yuv420p[c${i}]`);
  let last = "c0", t = length(clips[0]);
  for (let i = 1; i < clips.length; i++) {
    graph.push(`[${last}][c${i}]xfade=transition=fade:duration=${fade}:offset=${(t - fade).toFixed(3)}[x${i}]`);
    last = `x${i}`;
    t += length(clips[i]) - fade;
  }
  const ends = [fadeIn && `fade=t=in:st=0:d=${fadeIn}`, fadeOut && `fade=t=out:st=${(t - fadeOut).toFixed(3)}:d=${fadeOut}`, "format=yuv420p"];
  graph.push(`[${last}]${ends.filter(Boolean).join(",")}[v]`);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  execFileSync("ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", ...clips.flatMap(c => ["-i", c]),
    "-filter_complex", graph.join(";"), "-map", "[v]", ...H264, "-r", String(fps), out], { stdio: "inherit" });
  console.log(`${out}  ${t.toFixed(2)} s`);
  return t;
}

if (isMain(import.meta.url)) {
  const { values: v, positionals: [out, ...clips] } = parseArgs({ allowPositionals: true, options: {
    fade: { type: "string" }, "fade-in": { type: "string" }, "fade-out": { type: "string" }, fps: { type: "string" } } });
  if (!out || !clips.length) { console.log("node tools/crossfade.mjs <out.mp4> <clip.mp4> ... [--fade 0.8] [--fade-in S] [--fade-out S]"); process.exit(2); }
  crossfade(out, clips, { fade: +(v.fade ?? 0.8), fadeIn: +(v["fade-in"] || 0), fadeOut: +(v["fade-out"] || 0), fps: +(v.fps || 30) });
}
