/* ==========================================================================
   showcase — MBMR's gallery: the real screenshots that play on the TV,
   full size, with the description and a way to try the live app. Opens
   from the TV (on the screenshot it was showing), `tv show`, or the quick
   view. Imports nothing from three.js.
   ========================================================================== */

import { OTHER_WORK } from './content.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const MBMR = OTHER_WORK.find((p) => p.slug === 'mbmr');
export const SHOTS = (MBMR && MBMR.screens) || [];

let root = null;
let index = 0;

function show(i) {
  if (!SHOTS.length) return;
  index = (i + SHOTS.length) % SHOTS.length;
  const s = SHOTS[index];
  const img = root.querySelector('.sc-shot img');
  img.src = s.src;
  img.alt = 'MBMR screenshot: ' + s.caption;
  root.querySelector('.sc-caption').textContent = s.caption;
  root.querySelector('.sc-count').textContent = (index + 1) + ' / ' + SHOTS.length;
  root.querySelectorAll('.sc-thumb').forEach((t, k) => {
    if (k === index) t.setAttribute('aria-current', 'true');
    else t.removeAttribute('aria-current');
  });
}

export function renderShowcase(el) {
  root = el;
  if (!MBMR) return;
  const links = [];
  if (MBMR.links.live) links.push('<a class="btn primary" href="' + esc(MBMR.links.live) + '" target="_blank" rel="noopener">Try the live app</a>');
  if (MBMR.links.repo) links.push('<a class="btn ghost" href="' + esc(MBMR.links.repo) + '" target="_blank" rel="noopener">Source</a>');

  el.innerHTML = ''
    + '<div class="qv-bar">'
    +   '<span class="qv-kicker">devroom · on the TV</span>'
    +   '<span class="qv-bar-actions">'
    +     '<button type="button" class="btn ghost qv-enter" data-enter-room>'
    +       '<span class="when-intro">Enter the 3D room</span><span class="when-room">Back to the room</span></button>'
    +     '<button type="button" class="btn ghost" data-close aria-label="Close the gallery">Close</button>'
    +   '</span>'
    + '</div>'
    + '<header class="sc-head">'
    +   '<h2 id="scTitle">' + esc(MBMR.title) + '</h2>'
    +   '<p class="qv-intro">' + esc(MBMR.tagline) + '</p>'
    +   '<p class="qv-actions">' + links.join('') + '</p>'
    + '</header>'
    + (SHOTS.length ? ''
      + '<figure class="sc-figure">'
      +   '<div class="sc-shot">'
      +     '<img alt="" decoding="async" />'
      +     '<button type="button" class="sc-nav prev" data-step="-1" aria-label="Previous screenshot">‹</button>'
      +     '<button type="button" class="sc-nav next" data-step="1" aria-label="Next screenshot">›</button>'
      +   '</div>'
      +   '<figcaption><span class="sc-caption"></span><span class="sc-count"></span></figcaption>'
      + '</figure>'
      + '<div class="sc-thumbs">' + SHOTS.map((s, k) =>
          '<button type="button" class="sc-thumb" data-shot="' + k + '" aria-label="' + esc(s.caption) + '">'
          + '<img src="' + esc(s.src) + '" alt="" loading="lazy" decoding="async" /></button>').join('') + '</div>'
      : '')
    + '<section class="qv-section"><h3>How it works</h3>'
    +   '<ul class="qv-body">' + MBMR.body.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>'
    +   '<ul class="qv-chips sc-chips">' + MBMR.stack.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>'
    + '</section>';

  el.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) { show(index + Number(step.dataset.step)); return; }
    const thumb = e.target.closest('[data-shot]');
    if (thumb) show(Number(thumb.dataset.shot));
  });
  el.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(index - 1); }
  });
}

/* opened: on the screenshot the TV was showing, if we were told which */
export function startShowcase(i) {
  show(Number.isInteger(i) ? i : 0);
}

export function stopShowcase() {}
