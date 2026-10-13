// A clock loaded as an unpacked extension, the way Chrome runs it: the new tab it opens, the errors there,
// the permissions the manifest asks for, and the name and description Chrome shows.
//
//   node tools/ext-check.mjs komorebi/extension --out dist/ext.png
//
//   --lang ja      the UI language to ask Chrome for. On macOS an extension's messages follow the system's
//                  language whatever this says, so a Mac set to Japanese only ever shows the ja messages
//   --wait 5  --out FILE (a screenshot)  --software
import { chromium } from "playwright-core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromePath, gpuArgs, watch, report, isMain } from "./lib.mjs";

export async function extCheck(dir, o = {}) {
  const ext = resolve(dir), profile = mkdtempSync(join(tmpdir(), "clock-ext-"));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: chromePath(), channel: "chromium", headless: true, viewport: { width: 1280, height: 800 },
    ...(o.lang && { locale: o.lang }),
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, ...(o.lang ? [`--lang=${o.lang}`] : []), ...gpuArgs(o.software)] });
  try {
    const p = await context.newPage();
    const errors = [];
    watch(p, errors);
    await p.goto("chrome://newtab/");
    await p.waitForTimeout((o.wait ?? 5) * 1000);
    const info = await p.evaluate(() => {
      if (!window.chrome?.runtime?.getManifest) return null;
      const m = chrome.runtime.getManifest(), text = s => String(s || "").replace(/^__MSG_(\w+)__$/, (_, k) => chrome.i18n.getMessage(k));
      return { page: location.href, ui: chrome.i18n.getUILanguage(), version: m.version, name: text(m.name), description: text(m.description),
        permissions: [...(m.permissions || []), ...(m.optional_permissions || []), ...(m.host_permissions || [])] };
    });
    if (!info) errors.push("the new tab is not the extension's page");
    else for (const [k, val] of Object.entries(info)) console.log(`${k}: ${Array.isArray(val) ? (val.length ? val.join(", ") : "none") : val}`);
    if (o.out) { await p.screenshot({ path: o.out }); console.log(o.out); }
    return { info, errors };
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  const { values: v, positionals: [dir] } = parseArgs({ allowPositionals: true, options: {
    out: { type: "string" }, lang: { type: "string" }, wait: { type: "string" }, software: { type: "boolean" } } });
  if (!dir) { console.log("node tools/ext-check.mjs <extension dir> [--out shot.png] [--lang ja] [--wait 5]"); process.exit(2); }
  const { errors } = await extCheck(dir, { ...v, wait: v.wait === undefined ? undefined : +v.wait });
  report(errors);
}
