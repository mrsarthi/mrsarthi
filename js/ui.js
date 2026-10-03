/* ==========================================================================
   ui — the bottom control strip. updateUI() runs every frame and only
   touches the DOM when something actually changed.
   ========================================================================== */

import { shell } from './state.js';
import { setSeated, setCouch, useTv, nearestInteractable } from './player.js';
import { goSit } from './interact.js';
import { TV_SCREENS, nextTv, prevTv } from './screens.js';

const ui = {
  seat:  document.getElementById('setSeated'),
  walk:  document.getElementById('setWalk'),
  hint:  document.getElementById('sitHint'),
  prev:  document.getElementById('tvPrev'),
  next:  document.getElementById('tvNext'),
  full:  document.getElementById('tvFull'),
  field: document.getElementById('termInput'),
};

const touch = matchMedia('(pointer: coarse)').matches;

function wireButton(el, fn) {
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
    el.blur();
  });
}

export function initUI() {
  wireButton(ui.seat, () => goSit());
  wireButton(ui.walk, () => { if (shell.couch) setCouch(false); else setSeated(false); });
  wireButton(ui.prev, () => prevTv());
  wireButton(ui.next, () => nextTv());
  wireButton(ui.full, () => useTv());
  if (ui.full && !TV_SCREENS.length) ui.full.remove();
  if (ui.hint) ui.hint.hidden = false;
  if (touch) {                          // no keyboard shortcuts to advertise
    if (ui.seat) ui.seat.textContent = 'Sit';
    if (ui.walk) ui.walk.textContent = 'Stand';
  }
}

let lastMode = null;

function hintText() {
  if (shell.seated) return touch ? 'Tap the screen to type' : 'Type in the shell · Esc to stand';
  if (shell.couch) return touch ? 'Swipe to browse · tap the TV for full size' : 'Scroll or ←/→ to browse · Enter for full size · Esc to stand';
  const zone = nearestInteractable();
  const verb = touch ? 'Tap' : 'Click';
  if (zone === 'seat') return touch ? 'Tap the desk to sit' : 'Press E or click the desk to sit';
  if (zone === 'couch') return touch ? 'Tap the couch to watch MBMR' : 'Press E or click the couch to watch MBMR';
  if (zone === 'tv') {
    const what = TV_SCREENS.length ? 'to see MBMR' : 'for the next pick';
    return touch ? 'Tap the TV ' + what : 'Press E or click the TV ' + what;
  }
  if (zone === 'shelf') return touch ? 'Tap a book for more of my work' : 'Press E or click a book for more of my work';
  if (zone === 'board') return touch ? 'Tap the whiteboard for my skills' : 'Press E or click the whiteboard for my skills';
  if (zone === 'frame') return touch ? 'Tap the frame for my experience' : 'Press E or click the frame for my experience';
  if (zone === 'door') return touch ? 'Tap the door for my GitHub' : 'Press E or click the door for my GitHub';
  if (zone === 'stack') return touch ? 'Tap the table to see the stack working' : 'Press E or click the table to see the stack working';
  return verb + ' the desk, the couch or the stack table';
}

export function updateUI() {
  const mode = shell.seated ? 'desk' : shell.couch ? 'couch' : 'walk';
  if (mode !== lastMode) {
    lastMode = mode;
    const sitting = mode !== 'walk';
    if (ui.seat) { ui.seat.hidden = sitting; ui.seat.disabled = sitting; }
    if (ui.walk) { ui.walk.hidden = !sitting; ui.walk.disabled = !sitting; }
    for (const b of [ui.prev, ui.next, ui.full]) if (b) b.hidden = mode !== 'couch';
    document.body.classList.toggle('seated', shell.seated);
    document.body.classList.toggle('couch', shell.couch);
    if (!shell.seated && ui.field && document.activeElement === ui.field) ui.field.blur();
  }
  if (ui.hint) {
    const msg = hintText();
    if (ui.hint.textContent !== msg) ui.hint.textContent = msg;
  }
}
