/* ==========================================================================
   site — the page's entry point. Shows the intro straight away, builds the
   overlays (quick view, the stack, MBMR's gallery, more work), and loads the
   3D room behind the intro if WebGL is there.
   ----------------------------------------------------------------------------
   #quick, #stack, #mbmr or #more in the URL opens that overlay — links to share.
   ========================================================================== */

import { PROFILE } from './content.js';
import { renderQuickView } from './quickview.js';
import { renderStack, startStack, stopStack } from './stack.js';
import { renderShowcase, startShowcase, stopShowcase, SHOTS } from './showcase.js';
import { renderMore, startMore, stopMore } from './more.js';

const body  = document.body;
const intro = document.getElementById('intro');
const enter = document.getElementById('enterRoom');
const note  = document.getElementById('introNote');

let room = null;          // the 3D room module, once it has loaded
let current = null;       // the open overlay's name
let returnFocus = null;

const OVERLAYS = {
  quick: { el: document.getElementById('quick'), open: scrollQuickTo, close() {} },
  stack: { el: document.getElementById('stack'), open: startStack, close: stopStack },
  more:  { el: document.getElementById('more'), open: startMore, close: stopMore },
};
if (SHOTS.length) {
  OVERLAYS.mbmr = { el: document.getElementById('mbmr'), open: startShowcase, close: stopShowcase };
}

/* everything an overlay covers: unreachable by Tab while it is open */
const behind = ['game', 'intro', 'controls', 'stick'].map((id) => document.getElementById(id)).filter(Boolean);
const setBehindInert = (v) => behind.forEach((el) => { el.inert = v; });

/* --- intro ---------------------------------------------------------------- */

document.getElementById('introName').textContent = PROFILE.name;
document.getElementById('introRole').textContent = PROFILE.role;
document.getElementById('introPitch').textContent = PROFILE.blurb;
const resumeLink = document.getElementById('introResume');
if (PROFILE.resume) resumeLink.href = PROFILE.resume;
else resumeLink.remove();

function enterRoom() {
  if (!room) return;
  closeOverlay();
  if (!intro.hidden) {
    intro.classList.add('leaving');
    setTimeout(() => { intro.hidden = true; }, 600);
  }
  room.enter();
}

function roomUnavailable(message) {
  enter.hidden = true;
  note.textContent = message;
  body.classList.add('no-room');
}

/* --- overlays ------------------------------------------------------------- */

renderQuickView(document.getElementById('quickBody'));
renderStack(document.getElementById('stackBody'));
if (OVERLAYS.mbmr) renderShowcase(document.getElementById('mbmrBody'));
renderMore(document.getElementById('moreBody'));

/* the quick view can open on a section: 'stack', 'more', 'skills', 'contact' */
function scrollQuickTo(section) {
  const target = section && document.querySelector('#quick [data-section="' + section + '"]');
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}

function openOverlay(name, arg) {
  const o = OVERLAYS[name];
  if (!o || current === name) return;
  if (current) closeOverlay(true);
  else returnFocus = document.activeElement;
  current = name;
  o.el.hidden = false;
  o.el.scrollTop = 0;
  body.classList.add('overlay-open');
  setBehindInert(true);
  if (room) room.setPaused(true);
  o.open(arg);
  o.el.querySelector('[data-close]').focus({ preventScroll: true });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
}

/* switching: close the old overlay but keep the room paused */
function closeOverlay(switching) {
  if (!current) return;
  const o = OVERLAYS[current];
  o.close();
  o.el.hidden = true;
  current = null;
  if (switching) return;
  body.classList.remove('overlay-open');
  setBehindInert(false);
  if (room) room.setPaused(false);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-open], [data-close], [data-enter-room]');
  if (!t) return;
  e.preventDefault();
  if (t.hasAttribute('data-open')) openOverlay(t.getAttribute('data-open'));
  else if (t.hasAttribute('data-close')) closeOverlay();
  else enterRoom();
});

/* capture phase, so Esc closes an overlay and the room never sees it
   (stopImmediate: the room's keydown listener is on window too) */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && current) { e.preventDefault(); e.stopImmediatePropagation(); closeOverlay(); }
}, true);

/* the room asks for an overlay: the stack table, the TV, shell commands */
window.addEventListener('devroom:open', (e) => openOverlay(e.detail.name, e.detail.arg));

window.addEventListener('hashchange', () => {
  const name = location.hash.slice(1);
  if (OVERLAYS[name]) openOverlay(name);
});

/* --- boot ----------------------------------------------------------------- */

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) {
    return false;
  }
}

async function boot() {
  const linked = location.hash.slice(1);
  if (OVERLAYS[linked]) openOverlay(linked);

  if (!webglAvailable()) {
    roomUnavailable('This browser can’t show the 3D room, so everything is in the quick view.');
    return;
  }
  try {
    room = await import('./room.js');
  } catch (err) {
    console.error(err);
    roomUnavailable('The 3D room couldn’t load right now. Everything is in the quick view.');
    return;
  }
  if (current) room.setPaused(true);
  body.classList.add('room-ready');
  enter.disabled = false;
  enter.textContent = 'Enter the room';
  if (document.activeElement === document.body) enter.focus({ preventScroll: true });
}

boot();
