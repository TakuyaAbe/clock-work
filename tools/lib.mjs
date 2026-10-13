// What the tools share: Chrome for Testing on the real GPU, a small local server for the pages, and the errors a page reports.
import { chromium } from "playwright-core";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* Chrome for Testing as Playwright keeps it (the newest build), or CHROME */
export function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  const builds = existsSync(cache) ? readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => b.slice(9) - a.slice(9)) : [];
  for (const b of builds) for (const arch of ["chrome-mac-arm64", "chrome-mac-x64", "chrome-mac"]) {
    const exe = join(cache, b, arch, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (existsSync(exe)) return exe;
  }
  throw new Error("no Chrome for Testing: run `npx --prefix tools playwright-core install chromium`, or set CHROME to a Chrome binary");
}

/* WebGL on the real GPU (Metal, through ANGLE) even headless; or SwiftShader, in software */
export const gpuArgs = software => software
  ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
  : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

export const launch = ({ software } = {}) =>
  chromium.launch({ executablePath: chromePath(), headless: true, args: gpuArgs(software) });

/* the repository over http on 127.0.0.1, so a page may use modules and fetch as it does on the site */
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".wav": "audio/wav", ".mp3": "audio/mpeg"
};
let origin;
function serve() {
  origin ??= new Promise(done => {
    const server = createServer(async (req, res) => {
      const file = resolve(ROOT, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
      try { res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(await readFile(file)); }
      catch { res.writeHead(404).end(); }
    });
    server.listen(0, "127.0.0.1", () => { server.unref(); done(`http://127.0.0.1:${server.address().port}`); });
  });
  return origin;
}

/* a page as a URL with the given hash: files in the repository through the local server, other paths as file://, URLs as they are */
export async function pageURL(page, hash = "") {
  let url = page;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(page)) {
    const file = resolve(page);
    url = file.startsWith(ROOT + sep)
      ? `${await serve()}/${relative(ROOT, file).split(sep).map(encodeURIComponent).join("/")}`
      : pathToFileURL(file).href;
  }
  hash = String(hash).replace(/^#/, "");
  return hash ? `${url.replace(/#.*$/, "")}#${hash}` : url;
}

export function size(s) {
  const m = /^(\d+)x(\d+)$/.exec(s);
  if (!m) throw new Error(`a size is WxH, such as 1280x800: ${s}`);
  return [+m[1], +m[2]];
}

/* errors thrown in the page or written to its console */
export function watch(page, errors, label = "") {
  page.on("pageerror", e => errors.push(label + e));
  page.on("console", m => { if (m.type() === "error") errors.push(label + m.text()); });
}

export const renderer = page => page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl");
  if (!gl) return "no WebGL";
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "WebGL";
});

/* setup and frame hooks: functions, or the path of a module whose default export is setup and whose frame export is frame */
export async function hooks(setup, frame) {
  if (typeof setup !== "string") return { setup, frame };
  const m = await import(pathToFileURL(resolve(setup)).href);
  return { setup: m.default, frame: m.frame };
}

/* serve another file in place of a script the page loads: "newtab.js=/tmp/before.js" */
export async function override(context, spec) {
  if (!spec) return;
  const [name, file] = spec.split("=");
  const body = readFileSync(file, "utf8");
  await context.route(`**/${name}`, route => route.fulfill({ contentType: "text/javascript; charset=utf-8", body }));
}

/* H.264 that the stores, X and browsers all play */
export const H264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-maxrate", "16M", "-bufsize", "32M",
  "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

export const isMain = url => !!process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === url;

export function report(errors) {
  if (!errors.length) return console.log("errors: none");
  console.log(`errors: ${errors.length}`);
  for (const e of errors) console.log(`  ${e}`);
  process.exitCode = 1;
}
