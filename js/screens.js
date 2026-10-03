/* ==========================================================================
   screens — the monitor terminal and the TV, painted on 2D canvases and
   uploaded as textures
   ========================================================================== */

import * as THREE from 'three';
import {
  TCOL, MONO, TERM_W, TERM_H, HEAD_H, TERM_LH, TERM_PAD, FONT_PX, TV_W, TV_H,
} from './config.js';
import { term, shell, room, tv } from './state.js';
import { TV_DEMO, OTHER_WORK } from './content.js';
import { cwdPath } from './terminal.js';

function makeTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

const termCanvas = document.createElement('canvas');
termCanvas.width = TERM_W;
termCanvas.height = TERM_H;
const termCtx = termCanvas.getContext('2d');
export const termTexture = makeTexture(termCanvas);

const tvCanvas = document.createElement('canvas');
tvCanvas.width = TV_W;
tvCanvas.height = TV_H;
const tvCtx = tvCanvas.getContext('2d');
export const tvTexture = makeTexture(tvCanvas);

/* --- terminal ------------------------------------------------------------- */

function wrapRuns(runs, ctx, maxW) {
  const rows = [[]];
  let w = 0;
  const newRow = () => { rows.push([]); w = 0; };

  for (const r of runs) {
    const words = String(r.t).split(/(\s+)/).filter((s) => s !== '');
    for (const word of words) {
      let ww = ctx.measureText(word).width;
      const cur = rows[rows.length - 1];

      if (w + ww > maxW && cur.length) {
        newRow();
        if (/^\s+$/.test(word)) { ww = 0; continue; }
      }
      if (ww > maxW) {
        let rest = word;
        while (rest) {
          let n = 1;
          while (n < rest.length && ctx.measureText(rest.slice(0, n + 1)).width + w <= maxW) n++;
          rows[rows.length - 1].push({ t: rest.slice(0, n), s: r.s });
          w += ctx.measureText(rest.slice(0, n)).width;
          rest = rest.slice(n);
          if (rest) newRow();
        }
        continue;
      }
      rows[rows.length - 1].push({ t: word, s: r.s });
      w += ww;
    }
  }
  return rows;
}

function drawRuns(ctx, row, x, y) {
  let cx = x;
  for (const r of row) {
    ctx.fillStyle = (r.s && TCOL[r.s]) || TCOL.out;
    ctx.fillText(r.t, cx, y);
    cx += ctx.measureText(r.t).width;
  }
  return cx - x;
}

function rowWidth(ctx, row) {
  let w = 0;
  for (const r of row) w += ctx.measureText(r.t).width;
  return w;
}

function layoutTerminal() {
  if (term._v === term.version && term._rows) return term._rows;
  termCtx.font = '500 ' + FONT_PX + 'px ' + MONO;
  const maxW = TERM_W - TERM_PAD * 2;
  const rows = [];
  for (const line of term.lines) {
    for (const wrapped of wrapRuns(line, termCtx, maxW)) rows.push(wrapped);
  }
  term._rows = rows;
  term._v = term.version;
  return rows;
}

export function paintTerminal() {
  const ctx = termCtx;

  ctx.save();
  ctx.fillStyle = TCOL.bg;
  ctx.fillRect(0, 0, TERM_W, TERM_H);

  /* header */
  ctx.fillStyle = TCOL.head;
  ctx.fillRect(0, 0, TERM_W, HEAD_H);
  const dots = ['#ff5f57', '#febc2e', '#28c840'];
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(30 + i * 26, HEAD_H / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = dots[i];
    ctx.fill();
  }
  ctx.font = '600 20px ' + MONO;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TCOL.muted;
  ctx.fillText('devroom — zsh', 116, HEAD_H / 2 + 1);
  ctx.textAlign = 'right';
  ctx.fillText((shell.seated ? 'seated' : 'walking') + '  ·  ' + cwdPath() + '  ·  ' + room.theme,
    TERM_W - 30, HEAD_H / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  /* committed rows */
  ctx.font = '500 ' + FONT_PX + 'px ' + MONO;
  const rows = layoutTerminal();

  /* prompt row */
  const inputRows = wrapRuns(
    [{ t: cwdPath() + ' $ ', s: 'cmd' }, { t: term.input, s: null }],
    ctx, TERM_W - TERM_PAD * 2,
  );

  const all = rows.concat(inputRows);
  const top = HEAD_H + TERM_PAD;
  const maxRows = Math.max(4, Math.floor((TERM_H - top - TERM_PAD) / TERM_LH));
  const start = Math.max(0, all.length - maxRows - term.scroll);
  const shown = all.slice(start, start + maxRows);

  let y = top + FONT_PX + 4;
  for (const row of shown) {
    drawRuns(ctx, row, TERM_PAD, y);
    y += TERM_LH;
  }

  /* caret at the end of the last input row */
  if (shell.seated && term.caretOn && start + shown.length === all.length) {
    const last = shown[shown.length - 1] || [];
    const cx = TERM_PAD + rowWidth(ctx, last) + 2;
    const cy = y - TERM_LH - FONT_PX + 2;
    ctx.fillStyle = TCOL.cmd;
    ctx.fillRect(cx, cy, 11, FONT_PX + 4);
  }

  /* scroll tag */
  if (term.scroll > 0) {
    ctx.font = '500 16px ' + MONO;
    ctx.fillStyle = TCOL.warn;
    ctx.textAlign = 'right';
    ctx.fillText('↑ ' + term.scroll + ' more  (End to jump back)', TERM_W - TERM_PAD, TERM_H - 12);
    ctx.textAlign = 'left';
  }

  ctx.restore();
  termTexture.needsUpdate = true;
}

/* --- TV: MBMR, the movie recommender ------------------------------------- */

const MBMR = OTHER_WORK.find((p) => p.slug === 'mbmr');

/* real screenshots of the app, if content.js lists any; otherwise the TV
   falls back to the hand-written demo picks */
export const TV_SCREENS = (MBMR && MBMR.screens) || [];

const tvImages = TV_SCREENS.map((s) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { room.tvDirty = true; };
  img.src = s.src;
  return img;
});

const tvCount = () => TV_SCREENS.length || TV_DEMO.picks.length;

/* what the TV is showing right now, in words */
export function tvLabel() {
  const i = tv.hero % tvCount();
  return TV_SCREENS.length ? TV_SCREENS[i].caption : TV_DEMO.picks[i].title;
}

export function nextTv() {
  room.tvOn = true;
  tv.hero = (tv.hero + 1) % tvCount();
  room.tvDirty = true;
  return tvLabel();
}

export function prevTv() {
  room.tvOn = true;
  tv.hero = (tv.hero + tvCount() - 1) % tvCount();
  room.tvDirty = true;
  return tvLabel();
}

const CAP_H = 72;
const SANS = "'Plus Jakarta Sans', system-ui, sans-serif";

function paintScreenshot(ctx) {
  const i = tv.hero % TV_SCREENS.length;
  const img = tvImages[i];
  const areaH = TV_H - CAP_H;

  ctx.fillStyle = '#0b0e13';
  ctx.fillRect(0, 0, TV_W, TV_H);
  if (img.complete && img.naturalWidth) {
    const k = Math.min(TV_W / img.naturalWidth, areaH / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.drawImage(img, (TV_W - w) / 2, (areaH - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#4a5568';
    ctx.font = '500 26px ' + SANS;
    ctx.textAlign = 'center';
    ctx.fillText('loading…', TV_W / 2, areaH / 2);
    ctx.textAlign = 'left';
  }

  /* caption bar: what this screen is, and where we are in the reel */
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, areaH, TV_W, CAP_H);
  ctx.fillStyle = '#6fd6b4';
  ctx.fillRect(0, areaH, TV_W, 3);
  ctx.textBaseline = 'middle';
  const y = areaH + CAP_H / 2 + 2;
  ctx.font = '700 26px ' + SANS;
  ctx.fillText('MBMR', 32, y);
  const left = 32 + ctx.measureText('MBMR').width + 18;
  ctx.font = '500 24px ' + SANS;
  ctx.fillStyle = '#e9eef5';
  let cap = TV_SCREENS[i].caption || '';
  while (cap && ctx.measureText(cap).width > TV_W - left - 130) cap = cap.slice(0, -2) + '…';
  ctx.fillText(cap, left, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8792a3';
  ctx.fillText((shell.couch ? '‹  ' : '') + (i + 1) + ' / ' + TV_SCREENS.length + (shell.couch ? '  ›' : ''), TV_W - 32, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function paintTV() {
  const ctx = tvCtx;
  const { picks, moods } = TV_DEMO;

  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, TV_H);
  g.addColorStop(0, '#0d1117');
  g.addColorStop(1, '#141d26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TV_W, TV_H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  if (!room.tvOn) {
    ctx.fillStyle = '#4a5568';
    ctx.font = '600 44px ' + MONO;
    ctx.textAlign = 'center';
    ctx.fillText('NO SIGNAL', TV_W / 2, TV_H / 2 - 6);
    ctx.font = '500 22px ' + MONO;
    ctx.fillStyle = '#39424f';
    ctx.fillText('type  tv on', TV_W / 2, TV_H / 2 + 34);
    ctx.restore();
    tvTexture.needsUpdate = true;
    return;
  }

  if (TV_SCREENS.length) {
    paintScreenshot(ctx);
    ctx.restore();
    tvTexture.needsUpdate = true;
    return;
  }

  /* accent bar + title */
  ctx.fillStyle = '#6fd6b4';
  ctx.fillRect(0, 0, TV_W, 4);
  ctx.font = '700 30px ' + MONO;
  ctx.fillStyle = '#e9eef5';
  ctx.fillText('MBMR · MOVIE RECOMMENDER', 56, 66);
  ctx.font = '500 18px ' + MONO;
  ctx.fillStyle = '#8792a3';
  ctx.textAlign = 'right';
  ctx.fillText('demo picks', TV_W - 56, 62);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d2733';
  ctx.fillRect(56, 88, TV_W - 112, 1);

  /* hero card */
  const hero = picks[tv.hero % picks.length];
  ctx.fillStyle = '#111a24';
  ctx.fillRect(56, 116, TV_W - 112, 176);
  ctx.fillStyle = '#1b2735';
  ctx.fillRect(56, 116, 5, 176);

  ctx.font = '700 40px ' + MONO;
  ctx.fillStyle = '#e9eef5';
  ctx.fillText(hero.title, 88, 178);
  ctx.font = '500 20px ' + MONO;
  ctx.fillStyle = '#6fd6b4';
  ctx.fillText(String(hero.year), 88, 212);
  ctx.fillStyle = '#8792a3';
  ctx.fillText('· ' + hero.why, 88 + ctx.measureText(String(hero.year)).width + 24, 212);

  ctx.fillStyle = '#1f2b3a';
  ctx.fillRect(88, 240, TV_W - 176, 12);
  ctx.fillStyle = '#6fd6b4';
  ctx.fillRect(88, 240, (TV_W - 176) * hero.score, 12);
  ctx.font = '600 18px ' + MONO;
  ctx.fillStyle = '#c6cfdb';
  ctx.textAlign = 'right';
  ctx.fillText(hero.score.toFixed(2), TV_W - 88, 234);
  ctx.textAlign = 'left';

  /* ranked list */
  let ry = 348;
  ctx.font = '600 18px ' + MONO;
  ctx.fillStyle = '#8792a3';
  ctx.fillText('RANKED FOR YOU', 56, ry - 14);
  const ranked = picks.slice(0, 4);
  for (let i = 0; i < ranked.length; i++) {
    const { title, score } = ranked[i];
    const isHero = title === hero.title;
    ctx.font = '500 22px ' + MONO;
    ctx.fillStyle = isHero ? '#e9eef5' : '#c6cfdb';
    ctx.textAlign = 'right';
    ctx.fillText(String(i + 1).padStart(2, ' '), 96, ry + 26);
    ctx.textAlign = 'left';
    ctx.fillText(title, 116, ry + 26);

    ctx.fillStyle = '#1f2b3a';
    ctx.fillRect(560, ry + 10, 380, 12);
    ctx.fillStyle = isHero ? '#6fd6b4' : '#4a7f8c';
    ctx.fillRect(560, ry + 10, 380 * score, 12);

    ctx.font = '600 18px ' + MONO;
    ctx.fillStyle = '#8792a3';
    ctx.textAlign = 'right';
    ctx.fillText(score.toFixed(2), TV_W - 56, ry + 24);
    ctx.textAlign = 'left';
    ry += 46;
  }

  /* mood chips */
  ctx.font = '500 18px ' + MONO;
  let cx = 56;
  const cy = TV_H - 44;
  for (const mood of moods) {
    const w = ctx.measureText(mood).width + 30;
    ctx.fillStyle = '#182430';
    ctx.fillRect(cx, cy - 24, w, 34);
    ctx.fillStyle = '#8fb9ad';
    ctx.fillText(mood, cx + 15, cy);
    cx += w + 12;
  }

  ctx.restore();
  tvTexture.needsUpdate = true;
}
