/* ==========================================================================
   player — walking, the follow camera, sitting down, interacting
   ========================================================================== */

import * as THREE from 'three';
import {
  WALL_H, PLAYER_R, WALK_MIN, WALK_MAX, SIT_RANGE, FOV_WALK, FOV_SEAT,
  WALK_SPEED, SPRINT_SPEED, ACCEL_LERP, TURN_SPEED, TURN_LERP,
  CAM_ORBIT, CAM_MIN_D, CAM_PAD, CAM_LIMIT, CAM_BASE_ELEV, CAM_LOOK_BIAS,
  SEAT, SEAT_EYE, SEAT_LOOK, STAND_POS, STAND_YAW, TV_POS, TV_RANGE, STACK_POS, STACK_RANGE, OBSTACLES,
  COUCH_POS, COUCH_RANGE, COUCH_EYE, COUCH_STAND, TV_LOOK, TV_HALF_W,
  SHELF_POS, SHELF_RANGE, BOARD_POS, BOARD_RANGE, DOOR_POS, DOOR_RANGE, FRAME_POS, FRAME_RANGE,
} from './config.js';
import { term, shell, room, tv, player, cam, input, requestOverlay } from './state.js';
import { camera, avatar, updateFade } from './world.js';
import { TV_SCREENS, nextTv } from './screens.js';
import { pushOk, pushWarn, pushMuted, pushBlank } from './terminal.js';
import { PROFILE, EXPERIENCE } from './content.js';

function resolveCollisions(p) {
  for (const [minX, maxX, minZ, maxZ] of OBSTACLES) {
    const a = minX - PLAYER_R, b = maxX + PLAYER_R;
    const c = minZ - PLAYER_R, d = maxZ + PLAYER_R;
    if (p.x <= a || p.x >= b || p.z <= c || p.z >= d) continue;
    const dxl = p.x - a, dxr = b - p.x;
    const dzl = p.z - c, dzr = d - p.z;
    const m = Math.min(dxl, dxr, dzl, dzr);
    if (m === dxl) p.x = a;
    else if (m === dxr) p.x = b;
    else if (m === dzl) p.z = c;
    else p.z = d;
  }
  p.x = Math.max(WALK_MIN, Math.min(WALK_MAX, p.x));
  p.z = Math.max(WALK_MIN, Math.min(WALK_MAX, p.z));
}

const STICK_DEAD = 0.15;
const deadzone = (v) => (Math.abs(v) < STICK_DEAD ? 0 : v);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/* click-to-walk: head for pos; if near() turns true on the way, stop and
   act() — so clicking the desk from across the room sits you down */
export function walkTo(pos, near, act) {
  if (near && near()) { player.goal = null; act(); return; }
  player.goal = { pos: pos.clone(), near, act, best: Infinity, stuckFor: 0 };
  input.lastInteract = performance.now();
}

/* steering toward the goal, as the same turn/drive a keyboard would give */
function steer(dt) {
  const g = player.goal;
  if (g.near && g.near()) { player.goal = null; g.act(); return [0, 0]; }

  const dx = g.pos.x - player.pos.x, dz = g.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.12) { player.goal = null; return [0, 0]; }

  const diff = wrapAngle(Math.atan2(-dx, -dz) - cam.yaw);
  const turn = Math.max(-1, Math.min(1, diff * 2.5));
  const drive = Math.abs(diff) < 0.8 ? Math.min(1, d / 0.5) : 0;   // turn on the spot first

  /* give up if a prop is in the way and walking stops getting us closer
     (turning on the spot doesn't count as stuck) */
  if (d < g.best - 0.01) { g.best = d; g.stuckFor = 0; }
  else if (drive && (g.stuckFor += dt) > 0.8) { player.goal = null; return [0, 0]; }

  return [turn, drive];
}

export function updatePlayer(dt) {
  if (shell.seated || shell.couch || shell.intro || shell.paused) return;
  const keys = input.keys;

  /* turning — A/D swing the character and the camera together */
  let turn = 0;
  if (keys.has('a') || keys.has('arrowleft'))  turn += 1;
  if (keys.has('d') || keys.has('arrowright')) turn -= 1;
  turn -= deadzone(input.stick.x);

  /* walking — W/S along the facing direction, never sideways */
  let drive = 0;
  if (keys.has('w') || keys.has('arrowup'))   drive += 1;
  if (keys.has('s') || keys.has('arrowdown')) drive -= 1;
  drive -= deadzone(input.stick.y);

  if (turn || drive) player.goal = null;          // manual input wins
  else if (player.goal) [turn, drive] = steer(dt);

  const wantedTurn = turn * TURN_SPEED;
  player.turnRate += (wantedTurn - player.turnRate) * Math.min(1, TURN_LERP * dt);
  if (Math.abs(player.turnRate) < 0.002) player.turnRate = 0;
  cam.yaw += player.turnRate * dt;

  const wantedSpeed = drive * (keys.has('shift') ? SPRINT_SPEED : WALK_SPEED);
  player.speed += (wantedSpeed - player.speed) * Math.min(1, ACCEL_LERP * dt);
  if (Math.abs(player.speed) < 0.004) player.speed = 0;

  if (player.speed !== 0) {
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    player.pos.x += -sy * player.speed * dt;
    player.pos.z += -cy * player.speed * dt;
    resolveCollisions(player.pos);
  }
  if (drive || turn) input.lastInteract = performance.now();
}

/* --- field of view: keep the room (and the monitor) in frame on any shape
   of screen, including a phone held upright ------------------------------ */

const DEG = Math.PI / 180;
const SCREEN_HALF_W = 0.72;          // half the monitor's width, plus margin
const _seatEye = SEAT_EYE.clone();

export function applyFov() {
  const aspect = camera.aspect;
  if (shell.seated) {
    /* keep FOV_SEAT and back the eye off until the monitor fits the width */
    const halfH = Math.atan(Math.tan(FOV_SEAT * DEG / 2) * aspect);
    const need = SCREEN_HALF_W / Math.tan(halfH);
    _seatEye.copy(SEAT_EYE);
    _seatEye.x = Math.min(CAM_LIMIT, Math.max(SEAT_EYE.x, SEAT_LOOK.x + need));
    camera.fov = FOV_SEAT;
  } else if (shell.couch) {
    /* the eye can't back off far on the couch, so widen until the TV fits */
    const half = Math.atan(TV_HALF_W / (COUCH_EYE.z - TV_LOOK.z));
    const fit = 2 * Math.atan(Math.tan(half) / aspect) / DEG;
    camera.fov = Math.min(100, Math.max(40, fit));
  } else {
    /* widen the vertical FOV until at least ~64° fits across */
    const wide = 2 * Math.atan(Math.tan(32 * DEG) / aspect) / DEG;
    camera.fov = Math.min(85, Math.max(FOV_WALK, wide));
  }
  camera.updateProjectionMatrix();
}

function camElev(d, pitch) {
  let e = CAM_BASE_ELEV + pitch;
  e = Math.max(0.34, Math.min(1.05, e));
  const dh = d * Math.cos(e);
  e += Math.max(0, 2.30 - dh) * 0.20;      // rise a little when tucked in close
  return Math.min(1.15, e);
}

function camSpotFree(x, y, z) {
  if (x < -CAM_LIMIT || x > CAM_LIMIT || z < -CAM_LIMIT || z > CAM_LIMIT) return false;
  if (y < 0.55 || y > WALL_H - 0.12) return false;
  for (const o of OBSTACLES) {
    if (y >= o[4]) continue;
    if (x > o[0] - CAM_PAD && x < o[1] + CAM_PAD && z > o[2] - CAM_PAD && z < o[3] + CAM_PAD) return false;
  }
  return true;
}

const _wantPos = new THREE.Vector3();
const _wantLook = new THREE.Vector3();

/* the intro's establishing shot: a slow circle above the furniture */
const INTRO_CENTER = new THREE.Vector3(-0.3, 0, -0.2);
const INTRO_LOOK = new THREE.Vector3(-0.6, 1.05, -0.4);
const INTRO_R = 2.9, INTRO_Y = 2.55;
let introAngle = 0.9;

/* dt = 1000 snaps instead of gliding: 0.0022^1000 === 0, so k === 1 */
export function updateCamera(dt) {
  if (shell.intro) {
    introAngle += dt * 0.10;
    cam.pos.set(INTRO_CENTER.x + Math.sin(introAngle) * INTRO_R, INTRO_Y,
      INTRO_CENTER.z + Math.cos(introAngle) * INTRO_R);
    cam.look.copy(INTRO_LOOK);
  } else if (shell.seated) {
    const k = 1 - Math.pow(0.00008, dt);
    cam.pos.lerp(_seatEye, k);
    cam.look.lerp(SEAT_LOOK, k);
  } else if (shell.couch) {
    const k = 1 - Math.pow(0.002, dt);
    cam.pos.lerp(COUCH_EYE, k);
    cam.look.lerp(TV_LOOK, k);
  } else {
    const tx = player.pos.x, ty = player.head, tz = player.pos.z;
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);

    /* start from the wheel distance, then pull in until the spot is clear */
    let d = cam.dist;
    let px = tx, py = ty + 1, pz = tz;
    for (let i = 0; i < 22; i++) {
      const e = camElev(d, cam.pitch);
      const dh = d * Math.cos(e);
      px = tx + sy * dh;
      pz = tz + cy * dh;
      py = ty + d * Math.sin(e);
      if (py > WALL_H - 0.14) py = WALL_H - 0.14;
      if (camSpotFree(px, py, pz) || d <= CAM_MIN_D + 0.001) break;
      d = Math.max(CAM_MIN_D, d * 0.88);
    }
    px = Math.max(-CAM_LIMIT, Math.min(CAM_LIMIT, px));
    pz = Math.max(-CAM_LIMIT, Math.min(CAM_LIMIT, pz));
    py = Math.max(0.90, Math.min(WALL_H - 0.14, py));

    /* look past the avatar, so the dev never blocks the monitor */
    const e = camElev(d, cam.pitch);
    const dh = d * Math.cos(e);
    const la = Math.max(1.0, dh * CAM_LOOK_BIAS);

    _wantPos.set(px, py, pz);
    _wantLook.set(tx - sy * la, 1.20, tz - cy * la);

    /* right after the intro, ease in slowly so the fly-in reads as a move */
    const k = 1 - Math.pow(performance.now() < cam.glideUntil ? 0.15 : 0.0022, dt);
    cam.pos.lerp(_wantPos, k);
    cam.look.lerp(_wantLook, k);
  }

  camera.position.copy(cam.pos);
  camera.lookAt(cam.look);

  avatar.visible = !shell.seated && !shell.couch;
  avatar.position.set(player.pos.x, 0, player.pos.z);
  avatar.rotation.y = cam.yaw + Math.PI;

  updateFade(cam.pos);
}

export function setSeated(v) {
  v = !!v;
  if (shell.seated === v) return;
  shell.seated = v;

  if (v) {
    player.speed = 0;
    player.turnRate = 0;
    player.goal = null;
    input.keys.clear();
    term.scroll = 0;
    pushBlank();
    pushMuted('— seated. The monitor has your keystrokes now. Esc to stand up. —');
  } else {
    player.pos.set(STAND_POS.x, 0, STAND_POS.z);
    cam.yaw = STAND_YAW;
    cam.pitch = 0;
    cam.dist = CAM_ORBIT;
    pushBlank();
    pushMuted('— standing. W/S to walk, A/D to turn, drag to look, wheel to zoom. —');
  }

  applyFov();
  term.dirty = true;
  if (v) updateCamera(1000);
}

/* the couch: sit facing the TV and browse MBMR's screens */
export function setCouch(v) {
  v = !!v;
  if (shell.couch === v || (v && shell.seated)) return;
  shell.couch = v;
  player.speed = 0;
  player.turnRate = 0;
  player.goal = null;
  input.keys.clear();
  if (!v) {
    player.pos.set(COUCH_STAND.x, 0, COUCH_STAND.z);
    cam.yaw = 0;                                   // still facing the TV
    cam.pitch = 0;
    cam.dist = CAM_ORBIT;
  }
  room.tvOn = true;
  room.tvDirty = true;                             // the browse hint on the TV
  applyFov();
}

export function nearCouch() {
  return Math.hypot(player.pos.x - COUCH_POS.x, player.pos.z - COUCH_POS.z) <= COUCH_RANGE;
}

export function distToSeat() {
  return Math.hypot(player.pos.x - SEAT.x, player.pos.z - SEAT.z);
}

/* what E would use: of everything in range, the one you're relatively
   closest to — the shelf sits beside the TV, the door near the desk */
const ZONES = [
  ['seat', SEAT, SIT_RANGE], ['couch', COUCH_POS, COUCH_RANGE], ['tv', TV_POS, TV_RANGE],
  ['stack', STACK_POS, STACK_RANGE], ['shelf', SHELF_POS, SHELF_RANGE],
  ['board', BOARD_POS, BOARD_RANGE], ['door', DOOR_POS, DOOR_RANGE],
  ...(EXPERIENCE.length ? [['frame', FRAME_POS, FRAME_RANGE]] : []),
];

export function nearestInteractable() {
  let best = null, bestF = 1;
  for (const [name, at, range] of ZONES) {
    const f = Math.hypot(player.pos.x - at.x, player.pos.z - at.z) / range;
    if (f <= bestF) { best = name; bestF = f; }
  }
  return best;
}

/* the door leads out of the room: to GitHub, in a new tab */
export function openGithub() {
  window.open(PROFILE.github, '_blank', 'noopener');
  pushOk('opening ' + PROFILE.github);
}

/* the TV: with real screenshots it opens their gallery at the one showing;
   without, it steps through the demo picks */
export function useTv() {
  if (TV_SCREENS.length) { requestOverlay('mbmr', tv.hero % TV_SCREENS.length); return; }
  pushOk('tv — next pick: ' + nextTv());
}

export function nearStack() {
  return Math.hypot(player.pos.x - STACK_POS.x, player.pos.z - STACK_POS.z) <= STACK_RANGE;
}

export function nearTv() {
  return Math.hypot(player.pos.x - TV_POS.x, player.pos.z - TV_POS.z) <= TV_RANGE;
}

export function tryInteract() {
  if (shell.seated || shell.couch || shell.intro || shell.paused) return;
  const zone = nearestInteractable();
  if (zone === 'seat') { setSeated(true); return; }
  if (zone === 'couch') { setCouch(true); return; }
  if (zone === 'stack') { requestOverlay('stack'); return; }
  if (zone === 'tv') { useTv(); return; }
  if (zone === 'shelf') { requestOverlay('more'); return; }
  if (zone === 'board') { requestOverlay('quick', 'skills'); return; }
  if (zone === 'door') { openGithub(); return; }
  if (zone === 'frame') { requestOverlay('quick', 'experience'); return; }
  pushWarn('Nothing to interact with here — the chair is ' + distToSeat().toFixed(1) + ' m away.');
}
