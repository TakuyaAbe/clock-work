// Builds the site into dist/site: the index of études, one live page per étude, images.
// No dependencies; run with `npm run build` (or `node site/build.mjs`).
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist', 'site');
const { site, etudes } = JSON.parse(readFileSync(join(ROOT, 'site', 'etudes.json'), 'utf8'));
etudes.sort((a, b) => b.no - a.no);                     /* the newest first */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* in titles, "|" marks the one place a Japanese line may break */
const plain = s => String(s).replace(/\|/g, '');
const wbr = s => esc(s).replace(/\|/g, '<wbr>');
const no = n => 'No. ' + String(n).padStart(2, '0');
const dot = d => d.replace(/-/g, '.');
/* link previews want absolute URLs; until site.url is set they stay relative */
const abs = p => (site.url ? site.url.replace(/\/$/, '') + '/' : '') + p;
const siteTitle = `${plain(site.title.ja)} · ${site.title.en}`;

function meta({ title, desc, image, path }) {
  return [
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(abs(image))}">`,
    site.url ? `<meta property="og:url" content="${esc(abs(path))}">` : '',
    `<meta name="twitter:card" content="summary_large_image">`
  ].filter(Boolean).join('\n');
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'img'), { recursive: true });
cpSync(join(ROOT, 'site', 'static'), OUT, { recursive: true });

/* each étude: the extension's page as it is, with a way back to the index */
const BACK = `<style>
.etude-back{position:fixed;left:10px;top:10px;z-index:30;display:flex;align-items:center;gap:0;height:36px;padding:0 12px 0 10px;
  border-radius:18px;color:#f3efe8;text-decoration:none;opacity:.45;transition:opacity .4s,background .4s,gap .35s;
  font:14px/1 "Iowan Old Style","Palatino Linotype",Palatino,"Hiragino Mincho ProN","Yu Mincho",Georgia,serif;letter-spacing:.02em}
.etude-back i{font-style:normal;font-size:16px;text-shadow:0 0 1px rgba(40,34,28,.5),0 0 6px rgba(40,34,28,.25)}
.etude-back span{max-width:0;overflow:hidden;opacity:0;white-space:nowrap;transition:max-width .35s,opacity .3s}   /* takes no room until wanted */
.etude-back:hover,.etude-back:focus-visible{opacity:1;gap:10px;background:rgba(20,22,26,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.etude-back:hover span,.etude-back:focus-visible span{max-width:16em;opacity:1}
.etude-back:focus-visible{outline:2px solid rgba(255,255,255,.85);outline-offset:2px}
</style>`;
for (const e of etudes) {
  const dir = join(OUT, e.slug);
  cpSync(join(ROOT, e.src), dir, { recursive: true, filter: s => !s.endsWith('manifest.json') });
  cpSync(join(ROOT, e.image), join(OUT, 'img', `${e.slug}.jpg`));
  let html = readFileSync(join(dir, 'newtab.html'), 'utf8');
  rmSync(join(dir, 'newtab.html'));
  const title = `${plain(e.title.ja)} · ${e.title.en} — ${no(e.no)} · ${site.title.en}`;
  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>\n` +
      meta({ title, desc: `${e.text.ja} ${e.text.en}`, image: `img/${e.slug}.jpg`, path: `${e.slug}/` }) + '\n' + BACK)
    .replace(/<body[^>]*>/, m => `${m}\n<a class="etude-back" href="../" aria-label="エチュード一覧へ / All études"><i aria-hidden="true">←</i><span>エチュード一覧へ · All études</span></a>`);
  writeFileSync(join(dir, 'index.html'), html);
}

/* the index */
const item = e => {
  const links = [
    `<a href="${e.slug}/">見る <span class="en">View</span></a>`,
    e.store ? `<a href="${esc(e.store)}">Chrome 拡張 <span class="en">Chrome extension</span></a>` : '',
    `<a href="${esc(site.repo)}/tree/main/${esc(e.src.split('/')[0])}">ソース <span class="en">Source</span></a>`
  ].filter(Boolean).join('\n        ');
  return `    <article class="etude">
      <a class="shot" href="${e.slug}/" tabindex="-1" aria-hidden="true"><img src="img/${e.slug}.jpg" alt="" width="1280" height="800" loading="${e === etudes[0] ? 'eager' : 'lazy'}"></a>
      <div class="cap">
        <p class="meta">${no(e.no)}<time datetime="${e.date}">${dot(e.date)}</time></p>
        <h2><a href="${e.slug}/"><span lang="ja">${wbr(e.title.ja)}</span> <span lang="en" class="en">${esc(e.title.en)}</span></a></h2>
        <p lang="ja">${esc(e.text.ja)}</p>
        <p lang="en" class="en">${esc(e.text.en)}</p>
        <p class="links">
        ${links}
        </p>
      </div>
    </article>`;
};
const latest = etudes[0];
writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(siteTitle)}</title>
${meta({ title: siteTitle, desc: `${site.lead.ja} ${site.lead.en}`, image: `img/${latest.slug}.jpg`, path: '' })}
<link rel="icon" href="${latest.slug}/icons/icon32.png">
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="wrap">
  <header>
    <h1><span lang="ja">${wbr(site.title.ja)}</span> <span lang="en" class="en">${esc(site.title.en)}</span></h1>
    <p class="lead" lang="ja">${esc(site.lead.ja)}</p>
    <p class="lead en" lang="en">${esc(site.lead.en)}</p>
  </header>
  <main class="list">
${etudes.map(item).join('\n')}
  </main>
  <footer>
    <span>${etudes.length} 作 <span class="en">${etudes.length} études</span></span>
    <a href="${esc(site.repo)}">GitHub</a>
  </footer>
</div>
</body>
</html>
`);

writeFileSync(join(OUT, '404.html'), `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(siteTitle)}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="wrap">
  <header>
    <h1><span lang="ja">ページが見つかりません</span> <span lang="en" class="en">Page not found</span></h1>
    <p class="lead"><a href="/">エチュード一覧へ <span class="en">All études</span></a></p>
  </header>
</div>
</body>
</html>
`);
console.log(`built ${etudes.length} études into ${OUT}`);
