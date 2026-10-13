(() => {
'use strict';

/* Clock Studies: every étude in one new tab. This page is only a frame and a small chooser; each clock
 * runs as it does on its own, from its own folder (see etudes/build.mjs). CLOCKS, newest first, is
 * written by the build into clocks.js. The choice is kept in localStorage: no permissions needed. */

const UI_LANG = (window.chrome && chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || navigator.language || '';
const JA = /^ja\b/i.test(UI_LANG);
const T = JA
  ? { newest: 'いちばん新しい時計', shuffle: 'タブごとに替える', menu: '時計を選ぶ' }
  : { newest: 'The newest clock', shuffle: 'A different one each tab', menu: 'Choose a clock' };

const frame = document.getElementById('f'), sw = document.getElementById('sw');
const button = document.getElementById('sw-b'), menu = document.getElementById('menu');
const byName = s => CLOCKS.find(c => c.slug === s);
const title = c => (JA ? c.title.ja : c.title.en).replace(/\|/g, '');
const no = c => 'No. ' + String(c.no).padStart(2, '0');

/* storage can be missing (or throw) in some profiles; the clock still opens on the newest */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* not kept */ } }
};
let choice = store.get('clock');
if (choice !== 'shuffle' && !byName(choice)) choice = 'newest';   /* also a clock that has since gone */

/* #clock=<slug> opens that clock without changing the choice; the rest of the hash (#t=, #seed=, …) goes to the clock */
function fromHash() {
  const parts = (location.hash || '').replace(/^#/, '').split('&').filter(Boolean);
  const forced = parts.map(p => /^clock=(.+)$/.exec(p)).find(Boolean);
  return { clock: forced && byName(decodeURIComponent(forced[1])), rest: parts.filter(p => !/^clock=/.test(p)).join('&') };
}

function pick() {
  if (choice === 'shuffle' && CLOCKS.length > 1) {
    const last = store.get('last'), others = CLOCKS.filter(c => c.slug !== last);   /* never the same twice running */
    return others[Math.floor(Math.random() * others.length)];
  }
  return byName(choice) || CLOCKS[0];
}

let current = null;
function show(clock, rest) {
  current = clock;
  store.set('last', clock.slug);
  frame.classList.remove('on');
  frame.title = title(clock);
  frame.src = `${clock.slug}/newtab.html${rest ? '#' + rest : ''}`;
  button.querySelector('span').textContent = title(clock);
  button.setAttribute('aria-label', `${T.menu}: ${title(clock)}`);
  render();
}
frame.addEventListener('load', () => requestAnimationFrame(() => frame.classList.add('on')));

function item(value, label, note) {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.dataset.value = value;
  b.setAttribute('aria-checked', String(value === choice));
  b.append(label);
  if (note) { const s = document.createElement('small'); s.textContent = note; b.append(s); }
  return b;
}
function render() {
  menu.replaceChildren(
    item('newest', T.newest, current && choice === 'newest' ? title(current) : ''),
    item('shuffle', T.shuffle),
    document.createElement('hr'),
    ...CLOCKS.map(c => item(c.slug, title(c), no(c))));
}

function open(on) {
  menu.hidden = !on; sw.classList.toggle('open', on);
  button.setAttribute('aria-expanded', String(on));
  if (on) (menu.querySelector('[aria-checked="true"]') || menu.querySelector('button')).focus();
}
button.addEventListener('click', () => open(menu.hidden));
menu.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  choice = b.dataset.value; store.set('clock', choice);
  open(false); button.focus();
  const next = choice === 'shuffle' ? pick() : byName(choice) || CLOCKS[0];
  if (next !== current) show(next, ''); else render();
});
menu.addEventListener('keydown', e => {
  const items = [...menu.querySelectorAll('button')], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
  }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { open(false); button.focus(); } });
/* a click on the clock closes the list; the frame takes the pointer, so its blur is the signal */
window.addEventListener('blur', () => { if (!menu.hidden) open(false); });

document.documentElement.lang = JA ? 'ja' : 'en';
menu.setAttribute('aria-label', T.menu);
const h = fromHash();
show(h.clock || pick(), h.rest);
window.addEventListener('hashchange', () => { const n = fromHash(); show(n.clock || current, n.rest); });
})();
