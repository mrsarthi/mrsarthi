/* ==========================================================================
   input — keyboard (walking, typing into the shell at the desk, browsing
   the TV from the couch), mouse and touch (drag to look, click/tap to go,
   wheel to zoom — or, on the couch, wheel/swipe to browse), the on-screen
   joystick, and the hidden text field that brings up a phone's keyboard
   ========================================================================== */

import { CAM_MIN_D, CAM_MAX_D } from './config.js';
import { term, shell, cam, input } from './state.js';
import { renderer } from './world.js';
import { submitLine, completeInput, histMove, scrollBy } from './commands.js';
import { clearTerm, pushMuted } from './terminal.js';
import { setSeated, setCouch, useTv, tryInteract } from './player.js';
import { nextTv, prevTv } from './screens.js';
import { hoverAt, clearHover, clickAt } from './interact.js';

const WALK_KEYS = {
  w: 1, a: 1, s: 1, d: 1,
  arrowup: 1, arrowdown: 1, arrowleft: 1, arrowright: 1,
  shift: 1,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const blocked = () => shell.intro || shell.paused;

/* --- keyboard ------------------------------------------------------------- */

function onKeyDown(e) {
  if (blocked()) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (t && t.tagName === 'BUTTON') t.blur();

  const k = e.key;
  const low = k.toLowerCase();

  if (e.ctrlKey || e.metaKey) {
    if (low === 'l') { e.preventDefault(); clearTerm(); return; }
    if (low === 'c' && shell.seated) { e.preventDefault(); term.input = ''; term.dirty = true; pushMuted('^C'); return; }
    return;
  }

  if (shell.seated) {
    if (shellKey(e)) return;
    if (k.length === 1 && k >= ' ' && term.input.length < 120) {
      e.preventDefault();
      term.input += k;
      term.dirty = true;
    }
    return;
  }

  if (shell.couch) { couchKey(e, low); return; }

  if (low === 'e') { e.preventDefault(); tryInteract(); return; }
  if (WALK_KEYS[low]) { input.keys.add(low); input.lastInteract = performance.now(); return; }
  if (k.length === 1 && k >= ' ') e.preventDefault();
}

/* on the couch: browse the TV's screens, open one full size, or get up */
function couchKey(e, low) {
  if (low === 'arrowleft' || low === 'a') prevTv();
  else if (low === 'arrowright' || low === 'd') nextTv();
  else if (low === 'enter' || low === ' ' || low === 'f') useTv();
  else if (low === 'escape' || low === 'e') setCouch(false);
  else if (!(e.key.length === 1 && e.key >= ' ')) return;
  e.preventDefault();
}

/* editing keys shared by the window handler and the phone text field */
function shellKey(e) {
  switch (e.key) {
    case 'Enter':     submitLine(); break;
    case 'Backspace': term.input = term.input.slice(0, -1); term.dirty = true; break;
    case 'Tab':       completeInput(); break;
    case 'ArrowUp':   histMove(-1); break;
    case 'ArrowDown': histMove(1); break;
    case 'PageUp':    scrollBy(6); break;
    case 'PageDown':  scrollBy(-6); break;
    case 'Home':
    case 'End':       term.scroll = 0; term.dirty = true; break;
    case 'Escape':    setSeated(false); break;
    default: return false;
  }
  e.preventDefault();
  return true;
}

function onKeyUp(e) {
  input.keys.delete(e.key.toLowerCase());
}

/* --- phone keyboard: a hidden field mirrors term.input -------------------- */

const field = document.getElementById('termInput');

export function focusTermField() {
  if (!field || !shell.seated) return;
  field.value = term.input;
  field.focus({ preventScroll: true });
}

function wireField() {
  if (!field) return;
  field.addEventListener('input', () => {
    term.input = field.value.slice(0, 120);
    term.dirty = true;
  });
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') return;               // let the field edit itself
    if (e.key === 'Escape') field.blur();
    if (shellKey(e)) field.value = term.input;
  });
}

/* --- pointer: drag looks, a short still press clicks ---------------------- */

const CLICK_PX = 6, CLICK_MS = 450;
let lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, moved = false;

function onPointerDown(e) {
  if (blocked() || e.button > 0) return;
  if (shell.seated) {
    e.preventDefault();          // or the canvas takes focus straight back
    focusTermField();
    return;
  }
  input.dragging = true;
  moved = false;
  lastX = downX = e.clientX;
  lastY = downY = e.clientY;
  downT = performance.now();
  renderer.domElement.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (blocked()) return;
  if (!input.dragging) {
    if (e.pointerType === 'mouse') hoverAt(e.clientX, e.clientY);
    return;
  }
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_PX) { moved = true; clearHover(); }
  if (shell.couch) return;                         // on the couch a drag is a swipe
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  cam.yaw -= dx * 0.005;
  cam.pitch = clamp(cam.pitch + dy * 0.004, -0.20, 0.40);
  input.lastInteract = performance.now();
}

function onPointerUp(e) {
  if (!input.dragging) return;
  input.dragging = false;
  try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
  input.lastInteract = performance.now();
  if (e.type !== 'pointerup') return;
  const dx = e.clientX - downX, dy = e.clientY - downY;
  if (shell.couch && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) nextTv(); else prevTv();          // swipe left for the next screen
    return;
  }
  if (!moved && performance.now() - downT < CLICK_MS) clickAt(e.clientX, e.clientY);
}

/* wheel = boom length, or on the couch the next/previous screen.
   passive:false so the page never scrolls with it */
let wheelSum = 0, wheelAt = 0;

function onWheel(e) {
  e.preventDefault();
  if (blocked() || shell.seated) return;
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  if (shell.couch) {
    /* one step per notch; a touchpad's stream of small deltas adds up */
    const now = performance.now();
    if (now - wheelAt > 400) wheelSum = 0;
    wheelSum += dy;
    if (Math.abs(wheelSum) >= 50 && now - wheelAt > 220) {
      if (wheelSum > 0) nextTv(); else prevTv();
      wheelSum = 0;
      wheelAt = now;
    }
    return;
  }
  cam.dist = clamp(cam.dist + dy * 0.0025, CAM_MIN_D, CAM_MAX_D);
  input.lastInteract = performance.now();
}

/* --- on-screen joystick (touch screens only) ------------------------------ */

function wireStick() {
  const pad = document.getElementById('stick');
  if (!pad || !matchMedia('(pointer: coarse)').matches) return;
  const knob = pad.querySelector('.stick-knob');
  pad.hidden = false;
  let id = null, cx = 0, cy = 0;

  const set = (x, y) => {
    input.stick.x = x;
    input.stick.y = y;
    knob.style.transform = 'translate(' + (x * 32) + 'px,' + (y * 32) + 'px)';
  };
  const track = (e) => {
    const r = pad.offsetWidth / 2;
    let x = (e.clientX - cx) / r, y = (e.clientY - cy) / r;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    set(x, y);
    input.lastInteract = performance.now();
  };
  pad.addEventListener('pointerdown', (e) => {
    if (blocked() || shell.seated) return;
    e.preventDefault();
    const rect = pad.getBoundingClientRect();
    cx = rect.left + rect.width / 2;
    cy = rect.top + rect.height / 2;
    id = e.pointerId;
    pad.setPointerCapture(id);
    track(e);
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) track(e); });
  const end = (e) => { if (e.pointerId === id) { id = null; set(0, 0); } };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}

export function initInput() {
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', () => { input.keys.clear(); input.stick.x = input.stick.y = 0; });

  const el = renderer.domElement;
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') clearHover(); });
  el.addEventListener('lostpointercapture', () => { input.dragging = false; });
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  wireField();
  wireStick();
}
