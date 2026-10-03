/* ==========================================================================
   state — the mutable bits every module shares
   ========================================================================== */

import { SPAWN, SPAWN_YAW, CAM_ORBIT } from './config.js';

export const term = {
  lines: [], input: '', history: [], histPos: 0, scroll: 0,
  dirty: true, caretOn: true, version: 0, _v: -1, _rows: null,
};

/* seated: at the desk, typing into the shell. couch: on the couch, watching
   the TV. intro: the landing overlay is up and the camera circles the room.
   paused: an overlay covers the room, so input and rendering stop. */
export const shell = { cwd: [], seated: false, couch: false, intro: true, paused: false };

export const room = { theme: 'dark', lightLevel: 1, tvOn: true, tvDirty: true };

export const tv = { hero: 0 };

export const player = {
  pos: SPAWN.clone(),
  head: 1.15,
  speed: 0,
  turnRate: 0,
  goal: null,          // click-to-walk target: { pos, near?, act? }
};

export const cam = {
  pos: SPAWN.clone().setY(2.4).setZ(SPAWN.z + 2.4),
  look: SPAWN.clone().setY(1.2),
  yaw: SPAWN_YAW,
  pitch: 0,
  dist: CAM_ORBIT,
  glideUntil: 0,       // slower easing until then: the fly-in after the intro
};

export const input = {
  keys: new Set(),
  stick: { x: 0, y: 0 },   // on-screen joystick, each axis -1..1
  dragging: false,
  lastInteract: performance.now(),
};

/* ask the page (site.js) to open one of its overlays: 'quick', 'stack' or
   'mbmr' — arg goes to that overlay (the gallery takes a screenshot index) */
export function requestOverlay(name, arg) {
  window.dispatchEvent(new CustomEvent('devroom:open', { detail: { name, arg } }));
}
