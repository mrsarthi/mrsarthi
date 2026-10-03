/* ==========================================================================
   fs — the virtual filesystem the shell browses, built from content.js
   ----------------------------------------------------------------------------
   ~/about.md  contact.md  stack.md  resume.txt
   ~/projects/<slug>/README.md, STACK.md     the four headliners
   ~/more/<slug>/README.md, STACK.md         everything else
   ========================================================================== */

import {
  PROFILE, EXPERIENCE, SKILLS, STACK_INTRO, PROJECTS, OTHER_WORK,
} from './content.js';

const dirNode  = (name, children) => ({ type: 'dir', name, children: children || {} });
const fileNode = (name, text) => ({ type: 'file', name, text });

/* every project, headliners first, for lookups by slug */
export const ALL_PROJECTS = PROJECTS.concat(OTHER_WORK);

export function findProject(slug) {
  const s = String(slug || '').toLowerCase();
  return ALL_PROJECTS.find((p) => p.slug === s) || null;
}

function projectReadme(p) {
  const L = [];
  L.push('# ' + p.title);
  L.push('');
  L.push('> ' + p.tagline);
  L.push('');
  L.push('## At a glance');
  L.push('· year      ' + p.year);
  if (p.layer)  L.push('· layer     ' + p.layer);
  if (p.status) L.push('· status    ' + p.status);
  L.push('· stack     ' + p.stack.join(', '));
  for (const [k, v] of p.metrics) L.push('· ' + k.padEnd(14, ' ') + v);
  L.push('');
  L.push('## Notes');
  for (const line of p.body) L.push('- ' + line);
  L.push('');
  L.push('## Links');
  for (const [k, url] of Object.entries(p.links)) L.push('· ' + k.padEnd(10, ' ') + url);
  if (p.sourcePrivate) L.push('· source    private for now');
  L.push('');
  const keys = Object.keys(p.links);
  if (keys.length) L.push('Try `open ' + p.slug + ' ' + keys[0] + '`.');
  return L.join('\n');
}

function projectStack(p) {
  const L = [];
  L.push('# ' + p.title + ' — stack');
  L.push('');
  for (const s of p.stack) L.push('· ' + s);
  return L.join('\n');
}

export function aboutMd() {
  const L = [];
  L.push('# ' + PROFILE.name);
  L.push('');
  L.push('> ' + PROFILE.blurb);
  L.push('');
  L.push('· role      ' + PROFILE.role);
  if (PROFILE.place) L.push('· place     ' + PROFILE.place);
  L.push('· email     ' + PROFILE.email);
  L.push('· github    ' + PROFILE.github);
  L.push('· linkedin  ' + PROFILE.linkedin);
  L.push('· leetcode  ' + PROFILE.leetcode);
  L.push('· codeforces ' + PROFILE.codeforces);
  L.push('· site      ' + PROFILE.site);
  return L.join('\n');
}

/* how to reach me: email and LinkedIn only */
export function contactMd() {
  const L = [];
  L.push('# Contact');
  L.push('');
  L.push('· email     ' + PROFILE.email);
  L.push('· linkedin  ' + PROFILE.linkedin);
  L.push('');
  L.push('Happy to talk P2P networking, protocols, zero-knowledge proofs or Rust.');
  return L.join('\n');
}

export function stackMd() {
  const L = [];
  L.push('# Tooling');
  L.push('');
  for (const [k, v] of SKILLS) L.push('· ' + k.padEnd(12, ' ') + v);
  return L.join('\n');
}

function projectsIndex() {
  const L = [];
  L.push('# Projects');
  L.push('');
  L.push(STACK_INTRO);
  L.push('');
  for (const p of PROJECTS) {
    L.push('· ' + p.slug.padEnd(14, ' ') + p.layer.padEnd(10, ' ') + p.tagline);
  }
  L.push('');
  L.push('`cd <slug>` then `cat README.md`. More work lives in ~/more.');
  return L.join('\n');
}

function moreIndex() {
  const L = [];
  L.push('# More work');
  L.push('');
  for (const p of OTHER_WORK) {
    L.push('· ' + p.slug.padEnd(14, ' ') + p.tagline);
  }
  return L.join('\n');
}

export function resumeTxt() {
  const rule = '='.repeat(68);
  const L = [];
  L.push(rule, PROFILE.name.toUpperCase(), PROFILE.role, rule, '');
  L.push('email    ' + PROFILE.email);
  L.push('github   ' + PROFILE.github);
  L.push('linkedin ' + PROFILE.linkedin);
  L.push('site     ' + PROFILE.site);
  if (PROFILE.place) L.push('place    ' + PROFILE.place);
  if (EXPERIENCE.length) {
    L.push('', 'EXPERIENCE', '-'.repeat(68));
    for (const e of EXPERIENCE) {
      L.push('');
      L.push(e.role + ' — ' + e.org + '   (' + e.from + ' – ' + e.to + (e.note ? ', ' + e.note : '') + ')');
      for (const p of e.points) L.push('  · ' + p);
    }
  }
  L.push('', 'SKILLS', '-'.repeat(68));
  for (const [k, v] of SKILLS) L.push('  ' + k.padEnd(12, ' ') + v);
  L.push('', 'PROJECTS', '-'.repeat(68), '', STACK_INTRO);
  for (const p of PROJECTS) {
    L.push('');
    L.push(p.title + ' (' + p.year + (p.status ? ', ' + p.status : '') + ') — ' + p.tagline);
    for (const [k, v] of p.metrics) L.push('  ' + k + ': ' + v);
    for (const [k, url] of Object.entries(p.links)) L.push('  ' + k + ': ' + url);
    if (p.sourcePrivate) L.push('  source: private for now');
  }
  L.push('', rule);
  return L.join('\n');
}

function projectDir(p) {
  const d = dirNode(p.slug);
  d.children['README.md'] = fileNode('README.md', projectReadme(p));
  d.children['STACK.md']  = fileNode('STACK.md', projectStack(p));
  return d;
}

function buildFS() {
  const root = dirNode('~');
  root.children['about.md']   = fileNode('about.md', aboutMd());
  root.children['contact.md'] = fileNode('contact.md', contactMd());
  root.children['stack.md']   = fileNode('stack.md', stackMd());
  root.children['resume.txt'] = fileNode('resume.txt', resumeTxt());

  const projects = dirNode('projects');
  projects.children['README.md'] = fileNode('README.md', projectsIndex());
  for (const p of PROJECTS) projects.children[p.slug] = projectDir(p);
  root.children['projects'] = projects;

  const more = dirNode('more');
  more.children['README.md'] = fileNode('README.md', moreIndex());
  for (const p of OTHER_WORK) more.children[p.slug] = projectDir(p);
  root.children['more'] = more;

  return root;
}

export const FS = buildFS();
