/* ==========================================================================
   quickview — everything in the room as one readable page, generated from
   content.js. Imports nothing from three.js, so it works when the room
   can't load (no WebGL, CDN down) and loads instantly.
   ========================================================================== */

import {
  PROFILE, EXPERIENCE, SKILLS, STACK_INTRO, PROJECTS, OTHER_WORK,
} from './content.js';

const LINK_LABELS = {
  repo: 'Source', live: 'Live', releases: 'Download', ceremony: 'Ceremony record', prs: 'Merged PRs', npm: 'npm package',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function ext(url, label, cls) {
  const mail = url.startsWith('mailto:');
  return '<a class="' + (cls || 'qv-link') + '" href="' + esc(url) + '"'
    + (mail ? '' : ' target="_blank" rel="noopener"') + '>' + esc(label) + '</a>';
}

function projectLinks(p) {
  const out = Object.entries(p.links).map(([k, url]) => ext(url, LINK_LABELS[k] || k));
  if (p.sourcePrivate) out.push('<span class="qv-private">Source private for now</span>');
  return out.length ? '<p class="qv-links">' + out.join('') + '</p>' : '';
}

function chips(list) {
  return '<ul class="qv-chips">' + list.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>';
}

function metrics(p) {
  if (!p.metrics.length) return '';
  return '<dl class="qv-metrics">' + p.metrics.map(([k, v]) =>
    '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>';
}

function stackCard(p) {
  return '<li class="qv-layer">'
    + '<span class="qv-layer-name">' + esc(p.layer) + '</span>'
    + '<article class="qv-card">'
    + '<header class="qv-card-head"><h4>' + esc(p.title) + '</h4>'
    + (p.status ? '<span class="qv-status">' + esc(p.status) + '</span>' : '')
    + '</header>'
    + '<p class="qv-tagline">' + esc(p.tagline) + '</p>'
    + metrics(p)
    + '<details><summary>How it works</summary><ul class="qv-body">'
    + p.body.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul></details>'
    + chips(p.stack)
    + projectLinks(p)
    + '</article></li>';
}

function moreCard(p) {
  return '<article class="qv-card qv-more">'
    + '<header class="qv-card-head"><h4>' + esc(p.title) + '</h4><span class="qv-year">' + esc(p.year) + '</span></header>'
    + '<p class="qv-tagline">' + esc(p.tagline) + '</p>'
    + chips(p.stack)
    + projectLinks(p)
    + (p.screens && p.screens.length
      ? '<p class="qv-actions qv-screens"><button type="button" class="btn ghost sm" data-open="' + esc(p.slug) + '">See the screens</button></p>'
      : '')
    + '</article>';
}

function timeline(title, items, line) {
  if (!items.length) return '';
  return '<section class="qv-section" data-section="' + title.toLowerCase() + '"><h3>' + title + '</h3><ul class="qv-timeline">'
    + items.map(line).join('') + '</ul></section>';
}

export function renderQuickView(el) {
  const top = [ext(PROFILE.github, 'GitHub', 'btn ghost'), ext(PROFILE.linkedin, 'LinkedIn', 'btn ghost'), ext('mailto:' + PROFILE.email, 'Email', 'btn ghost')];
  if (PROFILE.resume) top.unshift(ext(PROFILE.resume, 'Résumé', 'btn primary'));

  /* the bar sits outside the header so it can stay pinned for the whole page */
  el.innerHTML = ''
    + '<div class="qv-bar">'
    +   '<span class="qv-kicker">devroom · quick view</span>'
    +   '<span class="qv-bar-actions">'
    +     '<button type="button" class="btn ghost qv-enter" data-enter-room>'
    +       '<span class="when-intro">Enter the 3D room</span><span class="when-room">Back to the room</span></button>'
    +     '<button type="button" class="btn ghost" data-close aria-label="Close quick view">Close</button>'
    +   '</span>'
    + '</div>'
    + '<header class="qv-head">'
    +   '<h2 id="qvTitle">' + esc(PROFILE.name) + '</h2>'
    +   '<p class="qv-role">' + esc(PROFILE.role) + '</p>'
    +   '<p class="qv-blurb">' + esc(PROFILE.blurb) + '</p>'
    +   '<p class="qv-actions">' + top.join('') + '</p>'
    + '</header>'

    + '<section class="qv-section" data-section="stack"><h3>The stack</h3>'
    +   '<p class="qv-intro">' + esc(STACK_INTRO) + '</p>'
    +   '<p class="qv-actions qv-stack-cta"><button type="button" class="btn primary" data-open="stack">See it working</button></p>'
    +   '<ol class="qv-stack">' + PROJECTS.map(stackCard).join('') + '</ol>'
    + '</section>'

    + '<section class="qv-section" data-section="more"><h3>More work</h3>'
    +   '<div class="qv-grid">' + OTHER_WORK.map(moreCard).join('') + '</div>'
    + '</section>'

    + timeline('Experience', EXPERIENCE, (e) => '<li><strong>' + esc(e.role) + '</strong> · ' + esc(e.org)
        + ' <span class="qv-year">' + esc(e.from) + ' – ' + esc(e.to) + (e.note ? ' · ' + esc(e.note) : '') + '</span>'
        + '<ul class="qv-body">' + e.points.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></li>')

    + '<section class="qv-section" data-section="skills"><h3>Skills</h3><dl class="qv-skills">'
    +   SKILLS.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('')
    + '</dl></section>'

    + '<section class="qv-section qv-contact" data-section="contact"><h3>Contact</h3>'
    +   '<p class="qv-links">' + ext('mailto:' + PROFILE.email, PROFILE.email) + ext(PROFILE.linkedin, 'LinkedIn') + '</p>'
    + '</section>';
}
