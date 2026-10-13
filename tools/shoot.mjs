// Screenshots of a clock on the real GPU, one for each hash.
//
//   node tools/shoot.mjs komorebi/extension/newtab.html "t=10:08&seed=0" "t=17:25&seed=0" --out dist/shots
//
//   --out DIR        where the images go (default: shots)
//   --names a,b      file names, in the order of the hashes (default: made from the hash)
//   --size 1280x800  --dpr 1  --locale en-US  --tz Asia/Tokyo
//   --wait 6         seconds after loading, before anything else
//   --hide SEL       a CSS selector to hide, such as "#pg"
//   --eval JS        run in the page after the wait, then wait --after seconds (default 2)
//   --setup FILE     a module whose default export runs after the wait: async (page, { wait }) => {}
//   --override newtab.js=FILE   serve FILE in place of the page's script, to compare a variant
//   --fps            also count the page's animation frames per second, over 3 s
//   --jpg            JPEG instead of PNG
//   --software       SwiftShader instead of the GPU
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { launch, pageURL, size, watch, renderer, hooks, override, report, isMain } from "./lib.mjs";

const fromHash = h => h.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const frameRate = page => page.evaluate(() => new Promise(done => {
  let n = 0;
  const t0 = performance.now(), tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else done(n / 3); };
  requestAnimationFrame(tick);
}));

export async function shoot(page, hashes = [], o = {}) {
  const [w, h] = size(o.size || "1280x800"), out = o.out || "shots";
  mkdirSync(out, { recursive: true });
  const { setup } = await hooks(o.setup);
  const browser = await launch(o);
  const errors = [], files = [];
  let gpu;
  for (const [i, hash] of (hashes.length ? hashes : [""]).entries()) {
    const name = o.names?.[i] || fromHash(hash) || "page";
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(o.dpr || 1),
      ...(o.locale && { locale: o.locale }), ...(o.tz && { timezoneId: o.tz }) });
    await override(context, o.override);
    const p = await context.newPage();
    watch(p, errors, `${name}: `);
    await p.goto(await pageURL(page, hash), { waitUntil: "load" });
    if (o.hide) await p.addStyleTag({ content: `${o.hide}{display:none!important}` });
    await p.mouse.move(w / 2, h / 3);                        /* away from the corners, where controls show on hover */
    await p.waitForTimeout((o.wait ?? 6) * 1000);
    if (o.eval) { await p.evaluate(js => { (0, eval)(js); }, o.eval); await p.waitForTimeout((o.after ?? 2) * 1000); }
    if (setup) await setup(p, { wait: s => p.waitForTimeout(s * 1000) });
    gpu ??= await renderer(p);
    const file = join(out, `${name}.${o.jpg ? "jpg" : "png"}`);
    await p.screenshot({ path: file, ...(o.jpg && { type: "jpeg", quality: 92 }) });
    console.log(o.fps ? `${file}  ${(await frameRate(p)).toFixed(1)} fps` : file);
    files.push(file);
    await context.close();
  }
  await browser.close();
  console.log(`gpu: ${gpu}`);
  return { files, errors };
}

if (isMain(import.meta.url)) {
  const { values: v, positionals: [page, ...hashes] } = parseArgs({ allowPositionals: true, options: {
    out: { type: "string" }, names: { type: "string" }, size: { type: "string" }, dpr: { type: "string" },
    locale: { type: "string" }, tz: { type: "string" }, wait: { type: "string" }, hide: { type: "string" },
    eval: { type: "string" }, after: { type: "string" }, setup: { type: "string" }, override: { type: "string" },
    fps: { type: "boolean" }, jpg: { type: "boolean" }, software: { type: "boolean" } } });
  if (!page) { console.log("node tools/shoot.mjs <page> [hash ...] [options]: the options are at the top of tools/shoot.mjs"); process.exit(2); }
  const num = s => (s === undefined ? undefined : +s);
  const { errors } = await shoot(page, hashes, { ...v, names: v.names?.split(","), wait: num(v.wait), after: num(v.after) });
  report(errors);
}
