/* ==========================================================================
   more — the "more work" shelf, as a page: one project at a time, with
   tabs to flip between them. Opens from a book on the shelf (on that
   project), the `more` command, or #more. Imports nothing from three.js.
   ========================================================================== */

import { OTHER_WORK } from './content.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const LINK_LABELS = { repo: 'Source', live: 'Live', releases: 'Download', prs: 'Merged PRs', npm: 'npm package' };

let root = null;
let current = OTHER_WORK.length ? OTHER_WORK[0].slug : null;

function detail(p) {
  const links = Object.entries(p.links).map(([k, url]) =>
    '<a class="btn ' + (k === 'live' ? 'primary' : 'ghost') + ' sm" href="' + esc(url) + '" target="_blank" rel="noopener">'
    + esc(LINK_LABELS[k] || k) + '</a>');
  if (p.screens && p.screens.length) links.push('<button type="button" class="btn ghost sm" data-open="' + esc(p.slug) + '">See the screens</button>');
  return ''
    + '<header class="qv-card-head"><h3 class="mw-title">' + esc(p.title) + '</h3><span class="qv-year">' + esc(p.year) + '</span></header>'
    + '<p class="qv-tagline">' + esc(p.tagline) + '</p>'
    + (p.metrics.length ? '<dl class="qv-metrics">' + p.metrics.map(([k, v]) =>
        '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>' : '')
    + '<ul class="qv-body">' + p.body.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>'
    + '<ul class="qv-chips mw-chips">' + p.stack.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>'
    + (links.length ? '<p class="qv-actions mw-links">' + links.join('') + '</p>' : '');
}

function show(slug) {
  const p = OTHER_WORK.find((x) => x.slug === slug) || OTHER_WORK[0];
  if (!p) return;
  current = p.slug;
  root.querySelectorAll('.mw-tab').forEach((t) => {
    const on = t.dataset.slug === p.slug;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  root.querySelector('.mw-detail').innerHTML = detail(p);
}

export function renderMore(el) {
  root = el;
  el.innerHTML = ''
    + '<div class="qv-bar">'
    +   '<span class="qv-kicker">devroom · the shelf</span>'
    +   '<span class="qv-bar-actions">'
    +     '<button type="button" class="btn ghost qv-enter" data-enter-room>'
    +       '<span class="when-intro">Enter the 3D room</span><span class="when-room">Back to the room</span></button>'
    +     '<button type="button" class="btn ghost" data-close aria-label="Close more work">Close</button>'
    +   '</span>'
    + '</div>'
    + '<header class="sc-head">'
    +   '<h2 id="mwTitle">More work</h2>'
    +   '<p class="qv-intro">Projects outside the stack, from AI tooling to open-source contributions.</p>'
    + '</header>'
    + '<div class="st-tabs mw-tabs" role="tablist" aria-label="Projects">' + OTHER_WORK.map((p) =>
        '<button type="button" class="st-tab mw-tab" role="tab" data-slug="' + esc(p.slug) + '" aria-selected="false">'
        + esc(p.title.replace(/ \(.*\)$/, '')) + '</button>').join('') + '</div>'
    + '<article class="qv-card mw-detail" role="tabpanel" aria-live="polite"></article>';

  el.querySelectorAll('.mw-tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.slug)));
  el.querySelector('.mw-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = OTHER_WORK.findIndex((p) => p.slug === current);
    const n = OTHER_WORK.length;
    const next = OTHER_WORK[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n].slug;
    show(next);
    el.querySelector('.mw-tab[data-slug="' + next + '"]').focus();
  });
}

/* opened: on the project that was asked for, if any */
export function startMore(slug) {
  show(typeof slug === 'string' ? slug : current);
}

export function stopMore() {}
