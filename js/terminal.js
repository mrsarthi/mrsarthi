/* ==========================================================================
   terminal — output buffer, styled runs, links and paths
   ----------------------------------------------------------------------------
   A line is an array of runs: { t: text, s: style }. Styles map to TCOL
   colours in screens.js; null is plain output.
   ========================================================================== */

import { term, shell } from './state.js';
import { FS } from './fs.js';

/* --- links ---------------------------------------------------------------- */

export const LINKS = [];
const LINK_BY_URL = new Map();

const URL_RE = /(https?:\/\/[^\s<>()]+|mailto:[^\s<>()]+)/g;
const IS_URL = /^(https?:\/\/|mailto:)\S+$/;

/* registering a URL gives it a number; any line that later prints it gets
   a [n] tag, and `open n` opens it */
export function registerLink(entry) {
  const url = String((entry && entry.url) || '').trim();
  if (!IS_URL.test(url)) return null;
  const hit = LINK_BY_URL.get(url);
  if (hit) return hit;
  const item = Object.assign({}, entry, { n: LINKS.length + 1, url });
  LINKS.push(item);
  LINK_BY_URL.set(url, item);
  return item;
}

export function runsFor(text) {
  const raw = String(text);
  const out = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let m;
  while ((m = URL_RE.exec(raw))) {
    if (m.index > last) out.push({ t: raw.slice(last, m.index), s: null });
    const url = m[0].replace(/[.,;]+$/, '');
    const e = LINK_BY_URL.get(url);
    out.push({ t: url + (e ? ' [' + e.n + ']' : ''), s: 'link' });
    last = m.index + url.length;
    URL_RE.lastIndex = last;
  }
  if (last < raw.length) out.push({ t: raw.slice(last), s: null });
  if (!out.length) out.push({ t: '', s: null });
  return out;
}

/* --- output --------------------------------------------------------------- */

export function pushRuns(runs) {
  term.lines.push(runs);
  if (term.lines.length > 900) term.lines.shift();
  term.version++;
  term.dirty = true;
}

export function push(text)       { pushRuns(runsFor(text)); }
export function pushOk(text)     { pushRuns([{ t: text, s: 'ok' }]); }
export function pushMuted(text)  { pushRuns([{ t: text, s: 'muted' }]); }
export function pushWarn(text)   { pushRuns([{ t: text, s: 'warn' }]); }
export function pushErr(text)    { pushRuns([{ t: text, s: 'err' }]); }
export function pushBlank()      { pushRuns([{ t: '', s: null }]); }

/* inline markdown: **bold** and `code` */
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`)/;

function inlineRuns(line) {
  const out = [];
  for (const part of line.split(INLINE_RE)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push({ t: part.slice(2, -2), s: 'ok' });
    else if (part.startsWith('`')) out.push({ t: part.slice(1, -1), s: 'cmd' });
    else out.push(...runsFor(part));
  }
  return out.length ? out : [{ t: '', s: null }];
}

export function pushMd(text) {
  for (const line of String(text).split('\n')) {
    if (/^#\s/.test(line))       pushRuns([{ t: line.replace(/^#\s+/, '').toUpperCase(), s: 'ok' }]);
    else if (/^##\s/.test(line)) pushRuns([{ t: line.replace(/^##\s+/, ''), s: 'cmd' }]);
    else if (/^>\s/.test(line))  pushRuns([{ t: '  ' + line.replace(/^>\s+/, ''), s: 'muted' }]);
    else                         pushRuns(inlineRuns(line));
  }
}

export function clearTerm() {
  term.lines.length = 0;
  term.scroll = 0;
  term.version++;
  term.dirty = true;
}

/* --- paths ---------------------------------------------------------------- */

export function cwdPath() {
  return shell.cwd.length ? '~/' + shell.cwd.join('/') : '~';
}

/* '' and '.' are the cwd; '~' and '/' are home; '..' climbs */
export function resolvePath(arg) {
  let s = (arg === undefined || arg === null || arg === '') ? '.' : String(arg).trim();
  let out = shell.cwd.slice();
  if (s === '~' || s === '/') return [];
  if (s.startsWith('~/')) { out = []; s = s.slice(2); }
  else if (s.startsWith('/')) { out = []; s = s.slice(1); }
  for (const p of s.split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out;
}

export function nodeAtPath(parts) {
  let n = FS;
  for (const p of parts) {
    if (!n || n.type !== 'dir') return null;
    const next = n.children[p];
    if (!next) return null;
    n = next;
  }
  return n;
}

export function nodeAt(arg) {
  return nodeAtPath(resolvePath(arg));
}

export function padTo(s, n) {
  s = String(s);
  return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length);
}
