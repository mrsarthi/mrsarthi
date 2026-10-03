/* ==========================================================================
   commands — the shell's command table, line submission, tab completion
   and history
   ========================================================================== */

import { THEMES, SIT_RANGE, TERM_W, TERM_H } from './config.js';
import { term, shell, room, tv, requestOverlay } from './state.js';
import { PROFILE, EXPERIENCE, SKILLS, PROJECTS } from './content.js';
import { FS, ALL_PROJECTS, findProject, aboutMd, contactMd, resumeTxt } from './fs.js';
import {
  LINKS, push, pushRuns, pushOk, pushMuted, pushErr, pushBlank, pushMd, clearTerm,
  cwdPath, resolvePath, nodeAtPath, nodeAt, padTo,
} from './terminal.js';
import { setSeated, distToSeat } from './player.js';
import { TV_SCREENS, nextTv, tvLabel } from './screens.js';
import { applyTheme, applyLights } from './world.js';

const CMDS = {};
const ALIAS = { dir: 'ls', ll: 'ls', '?': 'help', man: 'help', q: 'exit', quit: 'exit', cls: 'clear' };

function def(name, spec) {
  CMDS[name] = Object.assign({ name }, spec);
}

function findCmd(name) {
  const key = ALIAS[name] || name;
  return CMDS[key] || null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n];
}

function didYouMean(name) {
  let best = null, bd = 99;
  for (const c of Object.keys(CMDS)) {
    const d = levenshtein(name, c);
    if (d < bd) { bd = d; best = c; }
  }
  return (best && bd <= 3) ? '  — did you mean `' + best + '`?' : '';
}

function sortedChildren(dir) {
  return Object.keys(dir.children).sort((x, y) => {
    const nx = dir.children[x], ny = dir.children[y];
    if (nx.type !== ny.type) return nx.type === 'dir' ? -1 : 1;
    return x.localeCompare(y);
  });
}

/* --- shell ---------------------------------------------------------------- */

def('help', {
  group: 'shell', usage: 'help [command]', desc: 'list commands, or explain one',
  run(a) {
    if (a[0]) {
      const c = findCmd(a[0]);
      if (!c) return pushErr('help: no such command: ' + a[0] + didYouMean(a[0]));
      pushOk(c.name + ' — ' + c.desc);
      if (c.usage) pushMuted('    usage:  ' + c.usage);
      return;
    }
    pushOk('devroom shell — everything here is wired to real data.');
    const groups = {};
    for (const k of Object.keys(CMDS)) {
      const g = CMDS[k].group || 'misc';
      (groups[g] = groups[g] || []).push(k);
    }
    for (const g of Object.keys(groups)) {
      pushMuted(g + ':');
      for (const name of groups[g].sort()) push('  ' + padTo(name, 13) + CMDS[name].desc);
    }
    pushMuted('Tab completes · Up/Down history · Ctrl+L clear · Esc stands up');
  },
});

def('ls', {
  group: 'shell', usage: 'ls [path]', desc: 'list a directory',
  run(a) {
    const n = nodeAt(a[0]);
    if (!n) return pushErr('ls: no such file or directory: ' + a[0]);
    if (n.type === 'file') return push(n.name);
    const names = sortedChildren(n);
    if (!names.length) return pushMuted('(empty)');
    for (const nm of names) {
      const c = n.children[nm];
      pushRuns([
        { t: padTo(nm + (c.type === 'dir' ? '/' : ''), 22), s: c.type === 'dir' ? 'dir' : null },
        { t: c.type === 'dir' ? '<dir>' : c.text.length + ' b', s: 'muted' },
      ]);
    }
  },
});

def('cd', {
  group: 'shell', usage: 'cd [path]', desc: 'change directory',
  run(a) {
    const parts = resolvePath(a[0] || '~');
    const n = nodeAtPath(parts);
    if (!n) return pushErr('cd: no such directory: ' + a[0]);
    if (n.type !== 'dir') return pushErr('cd: not a directory: ' + a[0]);
    shell.cwd = parts;
    term.dirty = true;
  },
});

def('cat', {
  group: 'shell', usage: 'cat <file>', desc: 'print a file',
  run(a) {
    if (!a[0]) return pushErr('cat: missing file operand');
    const n = nodeAt(a[0]);
    if (!n) return pushErr('cat: no such file: ' + a[0]);
    if (n.type === 'dir') return pushErr('cat: ' + a[0] + ': is a directory');
    pushMd(n.text);
  },
});

def('tree', {
  group: 'shell', usage: 'tree', desc: 'print the whole virtual filesystem',
  run() {
    let count = 0;
    const rec = (node, prefix) => {
      const keys = sortedChildren(node);
      keys.forEach((k, i) => {
        const last = i === keys.length - 1;
        const c = node.children[k];
        count++;
        pushRuns([{
          t: prefix + (last ? '└── ' : '├── ') + k + (c.type === 'dir' ? '/' : ''),
          s: c.type === 'dir' ? 'dir' : null,
        }]);
        if (c.type === 'dir') rec(c, prefix + (last ? '    ' : '│   '));
      });
    };
    pushRuns([{ t: '~/', s: 'dir' }]);
    rec(FS, '');
    pushMuted(count + ' entries');
  },
});

def('pwd', { group: 'shell', usage: 'pwd', desc: 'print the working directory', run() { push(cwdPath()); } });

def('whoami', {
  group: 'shell', usage: 'whoami', desc: 'who is in the room',
  run() { push(PROFILE.name + '  <' + PROFILE.email + '>'); },
});

def('echo', {
  group: 'shell', usage: 'echo <text>', desc: 'print text back',
  run(a) { push(a.join(' ')); },
});

def('date', { group: 'shell', usage: 'date', desc: 'current date and time', run() { push(new Date().toString()); } });

def('history', {
  group: 'shell', usage: 'history', desc: 'show recent commands',
  run() {
    if (!term.history.length) return pushMuted('(no history yet)');
    term.history.forEach((h, i) => push('  ' + String(i + 1).padStart(4, ' ') + '  ' + h));
  },
});

def('clear', { group: 'shell', usage: 'clear', desc: 'wipe the screen (Ctrl+L)', run() { clearTerm(); } });

/* --- about ---------------------------------------------------------------- */

def('about', {
  group: 'about', usage: 'about', desc: 'short introduction',
  run() { pushMd(aboutMd()); },
});

def('projects', {
  group: 'about', usage: 'projects', desc: 'the four projects, and how they fit together',
  run() { pushMd(FS.children.projects.children['README.md'].text); },
});

def('stack', {
  group: 'about', usage: 'stack', desc: 'see the four projects working together',
  run() {
    pushOk('opening the stack…');
    requestOverlay('stack');
  },
});

def('more', {
  group: 'about', usage: 'more [macco|gideon|codefit|mbmr]', desc: 'projects outside the stack',
  run(a) {
    const slug = (a[0] || '').toLowerCase();
    if (PROJECTS.some((p) => p.slug === slug)) return pushErr('more: ' + slug + ' is part of the stack — try `stack`');
    if (slug && !findProject(slug)) return pushErr('more: no project "' + a[0] + '" — try `ls ~/more`');
    pushOk('opening the shelf…');
    requestOverlay('more', slug || undefined);
  },
});

def('github', {
  group: 'links', usage: 'github', desc: 'open my GitHub',
  run() {
    window.open(PROFILE.github, '_blank', 'noopener');
    pushOk('opening ' + PROFILE.github);
  },
});

def('experience', {
  group: 'about', usage: 'experience', desc: 'work history',
  run() {
    if (!EXPERIENCE.length) return pushMuted('(not listed yet)');
    for (const e of EXPERIENCE) {
      pushRuns([{ t: e.role, s: 'ok' }, { t: '  ·  ' + e.org + '   ' + e.from + ' – ' + e.to, s: 'muted' }]);
      for (const p of e.points) push('    · ' + p);
      pushBlank();
    }
  },
});

def('skills', {
  group: 'about', usage: 'skills', desc: 'what I reach for',
  run() { for (const [k, v] of SKILLS) pushRuns([{ t: padTo(k, 13), s: 'cmd' }, { t: v, s: null }]); },
});

/* --- links ---------------------------------------------------------------- */

def('links', {
  group: 'links', usage: 'links', desc: 'every URL registered in the room',
  run() {
    if (!LINKS.length) return pushMuted('(nothing registered)');
    for (const l of LINKS) {
      pushRuns([
        { t: padTo('#' + l.n, 5), s: 'ok' },
        { t: padTo(l.label, 34), s: null },
        { t: l.url, s: 'link' },
      ]);
    }
    pushMuted('open <n>  ·  open <slug> [repo|live|…]  ·  open <url>');
  },
});

def('open', {
  group: 'links', usage: 'open <n|slug|url> [repo|live|…]', desc: 'open a link in a new tab',
  run(a) {
    if (!a[0]) return pushErr('open: which one? try `links`');
    let url = null, label = '';

    if (/^\d+$/.test(a[0])) {
      const e = LINKS[Number(a[0]) - 1];
      if (!e) return pushErr('open: there is no link #' + a[0]);
      url = e.url; label = e.label;
    } else if (/^(https?:\/\/|mailto:)/i.test(a[0])) {
      url = a[0]; label = a[0];
    } else {
      const p = findProject(a[0]);
      if (!p) return pushErr('open: nothing matches "' + a[0] + '" — try `links`');
      const keys = Object.keys(p.links);
      const want = (a[1] || '').toLowerCase()
        || (p.links.live ? 'live' : p.links.repo ? 'repo' : keys[0]);
      if (!p.links[want]) {
        if (want === 'repo' && p.sourcePrivate) return pushErr('open: ' + p.title + ' source is private for now');
        return pushErr('open: ' + p.slug + ' has ' + (keys.join(', ') || 'no links'));
      }
      url = p.links[want]; label = p.title + ' / ' + want;
    }
    window.open(url, '_blank', 'noopener');
    pushOk('opening ' + label);
    pushMuted('  → ' + url);
  },
});

def('contact', {
  group: 'links', usage: 'contact', desc: 'how to reach me',
  run() { pushMd(contactMd()); },
});

def('email', {
  group: 'links', usage: 'email', desc: 'open your mail client',
  run() {
    push('mailto:' + PROFILE.email);
    window.location.href = 'mailto:' + PROFILE.email;
  },
});

def('resume', {
  group: 'links', usage: 'resume', desc: 'open or download the resume',
  run() {
    if (PROFILE.resume) {
      window.open(PROFILE.resume, '_blank', 'noopener');
      return pushOk('opening ' + PROFILE.resume);
    }
    const blob = new Blob([resumeTxt()], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = href;
    el.download = PROFILE.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-resume.txt';
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
    pushOk('downloaded ' + el.download);
    pushMuted('  (generated from the same data the terminal uses)');
  },
});

/* --- room ----------------------------------------------------------------- */

def('theme', {
  group: 'room', usage: 'theme [dark|light|mint]', desc: 'relight the room',
  run(a) {
    if (!a[0]) {
      pushMuted('themes: ' + Object.keys(THEMES).join('  '));
      return push('current: ' + room.theme);
    }
    const t = a[0].toLowerCase();
    if (!THEMES[t]) return pushErr('theme: unknown theme "' + a[0] + '" — ' + Object.keys(THEMES).join(', '));
    applyTheme(t);
    pushOk('theme → ' + t);
  },
});

def('lights', {
  group: 'room', usage: 'lights [bright|on|dim|off|0-1.5]', desc: 'dim the room',
  run(a) {
    const v = (a[0] || '').toLowerCase();
    if (!v) return push('light level: ' + room.lightLevel.toFixed(2));
    if (v === 'bright') room.lightLevel = 1.35;
    else if (v === 'on') room.lightLevel = 1;
    else if (v === 'dim') room.lightLevel = 0.45;
    else if (v === 'off') room.lightLevel = 0.08;
    else if (!isNaN(parseFloat(v))) room.lightLevel = Math.max(0.04, Math.min(1.5, parseFloat(v)));
    else return pushErr('lights: expected bright, on, dim, off or a number');
    applyLights();
    pushOk('light level → ' + room.lightLevel.toFixed(2));
  },
});

def('tv', {
  group: 'room', usage: 'tv [on|off|next|show]', desc: 'the TV: MBMR, my movie recommender',
  run(a) {
    const v = (a[0] || '').toLowerCase();
    if (v === 'on')   { room.tvOn = true;  room.tvDirty = true; return pushOk('tv on'); }
    if (v === 'off')  { room.tvOn = false; room.tvDirty = true; return pushOk('tv off'); }
    if (v === 'next') return pushOk('now showing: ' + nextTv());
    if (v === 'show' && TV_SCREENS.length) { pushOk('opening the gallery…'); return requestOverlay('mbmr', tv.hero % TV_SCREENS.length); }
    push(room.tvOn ? 'tv is on — ' + tvLabel() : 'tv is off');
    pushMuted('tv on  ·  tv off  ·  tv next' + (TV_SCREENS.length ? '  ·  tv show' : '') + '  ·  open mbmr  (the real app)');
  },
});

def('sit', {
  group: 'room', usage: 'sit', desc: 'sit at the monitor',
  run() {
    if (shell.seated) return pushMuted('already seated.');
    if (distToSeat() > SIT_RANGE) return pushErr('sit: the chair is too far away — walk over to it first');
    setSeated(true);
  },
});

def('stand', {
  group: 'room', usage: 'stand', desc: 'get up from the chair',
  run() {
    if (!shell.seated) return pushMuted('already standing.');
    setSeated(false);
  },
});

def('neofetch', {
  group: 'room', usage: 'neofetch', desc: 'room and machine stats',
  run() {
    const art = [
      '      ▄▄▄▄▄▄▄▄      ',
      '   ▄███████████▄    ',
      '  ███████████████   ',
      '  ███████████████   ',
      '   ▀███████████▀    ',
    ];
    const info = [
      PROFILE.handle + '@devroom',
      '-----------',
      'host      ' + PROFILE.name,
      'role      ' + PROFILE.role,
      PROFILE.place ? 'place     ' + PROFILE.place : null,
      'shell     devroom 1.0',
      'theme     ' + room.theme,
      'light     ' + room.lightLevel.toFixed(2),
      'monitor   ' + TERM_W + 'x' + TERM_H + ' canvas',
      'tv        ' + (room.tvOn ? 'MBMR · ' + tvLabel() : 'off'),
      'projects  ' + PROJECTS.length + ' + ' + (ALL_PROJECTS.length - PROJECTS.length) + ' more',
      'links     ' + LINKS.length,
    ].filter(Boolean);
    const rows = Math.max(art.length, info.length);
    for (let i = 0; i < rows; i++) {
      pushRuns([
        { t: padTo(art[i] || '', 24), s: 'cmd' },
        { t: info[i] || '', s: null },
      ]);
    }
  },
});

/* --- toys ----------------------------------------------------------------- */

def('matrix', {
  group: 'toys', usage: 'matrix', desc: 'wake up',
  run() {
    const glyphs = 'アイウエオカキクケコサシスセソタチツテト0123456789ﾊﾋﾌﾍﾎ';
    for (let i = 0; i < 12; i++) {
      let s = '';
      for (let j = 0; j < 62; j++) s += Math.random() < 0.35 ? glyphs[(Math.random() * glyphs.length) | 0] : ' ';
      pushRuns([{ t: s, s: 'cmd' }]);
    }
    pushMuted('follow the white rabbit — or the README.');
  },
});

def('coffee', {
  group: 'toys', usage: 'coffee', desc: 'brew',
  run() {
    push('      ( (');
    push('       ) )');
    push('    ........');
    push('    |      |]');
    push('    \\      /');
    push("     `----'");
    pushOk('brewing. the borrow checker is easier after coffee.');
  },
});

def('sudo', {
  group: 'toys', usage: 'sudo <anything>', desc: 'you do not have root here',
  run() { pushErr(PROFILE.handle + ' is not in the sudoers file. This incident has been logged.'); },
});

def('rm', {
  group: 'toys', usage: 'rm <anything>', desc: 'please do not',
  run() { pushErr('rm: permission denied — this filesystem is the portfolio.'); },
});

def('exit', {
  group: 'toys', usage: 'exit', desc: 'leave the shell',
  run() {
    if (shell.seated) { setSeated(false); pushMuted('standing up instead.'); }
    else pushMuted('there is no exit — only Esc, and the door you walked in through.');
  },
});

/* --- line submission, completion, history --------------------------------- */

export function submitLine() {
  const raw = term.input;
  term.input = '';
  term.scroll = 0;
  term.dirty = true;
  pushRuns([{ t: cwdPath() + ' $ ', s: 'cmd' }, { t: raw, s: null }]);

  const line = raw.trim();
  if (!line) return;

  term.history.push(line);
  if (term.history.length > 200) term.history.shift();
  term.histPos = term.history.length;

  const parts = line.split(/\s+/);
  const name = parts[0];
  const argv = parts.slice(1);
  const cmd = findCmd(name);
  if (!cmd) return pushErr(name + ': command not found' + didYouMean(name));

  try {
    cmd.run(argv);
  } catch (err) {
    pushErr(name + ': ' + (err && err.message ? err.message : String(err)));
  }
}

/* first word completes commands; later words complete paths, one segment
   at a time (`cat proj` → `cat projects/`) */
export function completeInput() {
  const val = term.input;
  const parts = val.length ? val.split(/\s+/) : [''];
  const token = parts[parts.length - 1];
  const first = parts.length === 1;

  let prefix = '', stem = token, pool, isDir = () => false;
  if (first) {
    pool = Object.keys(CMDS).concat(Object.keys(ALIAS));
  } else {
    const cut = token.lastIndexOf('/');
    prefix = cut >= 0 ? token.slice(0, cut + 1) : '';
    stem = cut >= 0 ? token.slice(cut + 1) : token;
    const dir = nodeAt(prefix || '.');
    pool = (dir && dir.type === 'dir') ? Object.keys(dir.children) : [];
    isDir = (name) => dir.children[name].type === 'dir';
  }
  const hits = pool.filter((p) => p.startsWith(stem));
  if (!hits.length) return;

  if (hits.length === 1) {
    const h = hits[0];
    parts[parts.length - 1] = prefix + h + (isDir(h) ? '/' : '');
    term.input = parts.join(' ') + (first || !isDir(h) ? ' ' : '');
  } else {
    let pre = hits[0];
    for (const h of hits) {
      while (!h.startsWith(pre)) pre = pre.slice(0, -1);
      if (!pre) break;
    }
    if (pre.length > stem.length) {
      parts[parts.length - 1] = prefix + pre;
      term.input = parts.join(' ');
    }
    pushMuted(hits.join('   '));
  }
  term.dirty = true;
}

export function histMove(dir) {
  if (!term.history.length) return;
  term.histPos = Math.max(0, Math.min(term.history.length, term.histPos + dir));
  term.input = term.histPos >= term.history.length ? '' : term.history[term.histPos];
  term.dirty = true;
}

export function scrollBy(n) {
  term.scroll = Math.max(0, term.scroll + n);
  term.dirty = true;
}
