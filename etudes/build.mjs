// Builds Clock Studies, the one extension that holds every étude, into dist/etudes:
// extension/ (to load unpacked) and clock-studies-<version>.zip (for the Chrome Web Store).
// The études and their order come from site/etudes.json, as for the site. No dependencies; `npm run build:etudes`.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'etudes');
const EXT = join(OUT, 'extension');
const { etudes } = JSON.parse(readFileSync(join(ROOT, 'site', 'etudes.json'), 'utf8'));
etudes.sort((a, b) => b.no - a.no);                     /* the newest first: it is the default */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'etudes', 'extension'), EXT, { recursive: true });

/* each clock in its own folder, as it is; Chrome keeps names beginning with "_" for itself, and a clock's
 * own manifest and messages mean nothing here (no clock reads chrome.i18n messages) */
for (const e of etudes) {
  cpSync(join(ROOT, e.src), join(EXT, e.slug), {
    recursive: true,
    filter: s => !/[\\/](manifest\.json|_locales)$/.test(s) && !/[\\/]\.DS_Store$/.test(s)
  });
}

const clocks = etudes.map(({ no, slug, title }) => ({ no, slug, title }));
writeFileSync(join(EXT, 'clocks.js'),
  `/* written by etudes/build.mjs from site/etudes.json: the études, newest first */\nconst CLOCKS = ${JSON.stringify(clocks, null, 2)};\n`);

const { version } = JSON.parse(readFileSync(join(EXT, 'manifest.json'), 'utf8'));
const zip = join(OUT, `clock-studies-${version}.zip`);
execFileSync('zip', ['-rqX', zip, '.'], { cwd: EXT });
console.log(`built Clock Studies ${version} with ${etudes.length} clocks (${etudes.map(e => e.slug).join(', ')})\n${EXT}\n${zip}`);
