/* ==========================================================================
   config — room dimensions, movement and camera tuning, palette
   ========================================================================== */

import * as THREE from 'three';

export const HALF = 3.6, WALL_H = 3.2;
export const PLAYER_R = 0.34;
export const WALK_MIN = -3.05, WALK_MAX = 3.05;
export const SIT_RANGE = 2.05;
export const FOV_WALK = 40, FOV_SEAT = 52;

/* --- movement: turn-and-walk, no strafing --------------------------------- */

export const WALK_SPEED   = 1.9;      // m/s
export const SPRINT_SPEED = 3.4;      // m/s
export const ACCEL_LERP   = 9.0;      // how fast speed eases toward the target
export const TURN_SPEED   = 2.2;      // rad/s at full turn
export const TURN_LERP    = 11.0;     // how fast the turn rate eases in

/* --- camera --------------------------------------------------------------- */

export const CAM_ORBIT     = 2.60;    // default boom length
export const CAM_MIN_D     = 1.70;    // never tuck in closer than this
export const CAM_MAX_D     = 6.00;    // wheel ceiling (the room will pull it in anyway)
export const CAM_PAD       = 0.26;    // keep this far off the props
export const CAM_LIMIT     = 3.44;    // keep this far off the walls
export const CAM_BASE_ELEV = 0.42;    // base boom elevation, radians
export const CAM_LOOK_BIAS = 0.95;    // look-point distance as a fraction of the boom

export const SPAWN     = new THREE.Vector3(0.85, 0, 1.55);
export const SEAT      = new THREE.Vector3(-2.42, 0, 0.60);
/* the screen mesh itself sits at world (-3.132, 1.195, 0.60) — see the
   monitor group in world.js (position -3.19,0,0.60) + screenMesh local
   offset (0.058,1.195,0). SEAT_LOOK points exactly at that, and SEAT_EYE is
   pulled back enough that the full 1.30x0.73 panel fits inside FOV_SEAT. */
export const SEAT_EYE  = new THREE.Vector3(-2.20, 1.18, 0.60);
export const SEAT_LOOK = new THREE.Vector3(-3.132, 1.195, 0.60);
export const STAND_POS = new THREE.Vector3(-1.95, 0, 1.35);

export const MONITOR_AT = new THREE.Vector3(-3.11, 1.195, 0.60);
export const SPAWN_YAW  = Math.atan2(-(MONITOR_AT.x - SPAWN.x), -(MONITOR_AT.z - SPAWN.z));
/* facing to restore on standing up: back toward the open floor (SPAWN),
   not whatever yaw was left over from sitting. Without this, standing up
   can leave you facing straight into the desk — W walks you into the
   obstacle (so it does ~nothing) while S is what actually moves you,
   which reads as "forward/backward are inverted". */
export const STAND_YAW  = Math.atan2(-(SPAWN.x - STAND_POS.x), -(SPAWN.z - STAND_POS.z));

/* the credenza+TV obstacle box is [-0.72, 1.72, -3.60, -2.78] — TV_POS is
   its centre so "walk up to the TV" has the same feel as "walk up to the
   chair" for the sit prompt. */
export const TV_POS   = new THREE.Vector3(0.50, 0, -3.19);
export const TV_RANGE = 2.30;

/* the stack table against the east wall — the four headliners as one exhibit */
export const STACK_POS   = new THREE.Vector3(2.78, 0, 1.40);
export const STACK_RANGE = 1.90;

/* the couch, facing the TV: sit on it to browse MBMR's screens */
export const COUCH_POS   = new THREE.Vector3(0.50, 0, -0.60);
export const COUCH_RANGE = 1.45;
export const COUCH_EYE   = new THREE.Vector3(0.50, 1.12, -0.52);
export const COUCH_STAND = new THREE.Vector3(0.50, 0, 0.30);   // behind it, facing the TV
export const TV_LOOK     = new THREE.Vector3(0.50, 1.40, -3.23);
export const TV_HALF_W   = 1.30;                               // half the TV, plus margin

/* the bookshelf's "more work" row, the whiteboard and the door on the south
   wall — these open things straight away rather than walking you over */
export const SHELF_POS   = new THREE.Vector3(2.62, 0, -3.00);
export const SHELF_RANGE = 1.80;
export const BOARD_POS   = new THREE.Vector3(0.90, 0, 3.40);
export const BOARD_RANGE = 1.70;
export const DOOR_POS    = new THREE.Vector3(-2.30, 0, 3.40);
export const DOOR_RANGE  = 1.90;
export const FRAME_POS   = new THREE.Vector3(2.80, 0, 3.40);   // experience, south wall
export const FRAME_RANGE = 1.50;

/* [minX, maxX, minZ, maxZ, top] — the top lets the camera fly over low props */
export const OBSTACLES = [
  [-3.52, -2.58, -0.46,  1.66, 0.80],   // desk + chair cluster
  [-0.72,  1.72, -3.60, -2.78, 2.12],   // credenza + TV
  [ 2.04,  3.16, -3.60, -2.94, 2.10],   // shelf
  [ 2.93,  3.37, -1.42, -0.98, 1.32],   // plant
  [ 2.42,  3.60,  0.62,  2.18, 1.60],   // stack table
  [-0.53,  1.53, -1.02, -0.18, 0.92],   // couch
];

/* --- palette -------------------------------------------------------------- */

export const C = {
  floor: 0x8a7a66, wall: 0xd9d2c6, ceiling: 0xe6e1d7, base: 0xb9ae9c,
  oak: 0xb58e65, darkOak: 0x5a432e, charcoal: 0x2d333f,
  metal: 0x8d97a6, metalDark: 0x3a4250,
  pot: 0xeeebe2, foliage: 0x427357, mint: 0x6fd6b4,
  skin: 0xe8c9a4, cushion: 0x4a5a72,
  rug: 0x333f52, rug2: 0x415064,
  glass: 0xdff0ff, sky: 0xcfe6ff, slat: 0xf2efe8,
  bookA: 0x486581, bookB: 0xb86a4b, bookC: 0x3e7b68,
  screen: 0x121720, lamp: 0xffe0b0,
  couch: 0x3f5a52, couchSeat: 0x4b6a60, pillow: 0xc89b52,
};

/* terminal colours — the terminal stays dark whatever the room theme */
export const TCOL = {
  bg: '#0b0e13', head: '#131822', out: '#c6cfdb', muted: '#8792a3',
  ok: '#e9eef5', warn: '#e0b279', err: '#ff9a9a', link: '#89b4fa',
  cmd: '#6fd6b4', dir: '#6fd6b4',
};

export const TERM_W = 1440, TERM_H = 810, HEAD_H = 56, TERM_LH = 29, TERM_PAD = 34, FONT_PX = 20;
export const TV_W = 1120, TV_H = 630;
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* room themes: how the room is lit, not how the terminal looks */
export const THEMES = {
  dark:  { ambient: 0x707b8e, ambInt: 0.95, warm: 0xffecd0, exposure: 1.25 },
  light: { ambient: 0xbfc7d4, ambInt: 1.35, warm: 0xfff1d8, exposure: 1.00 },
  mint:  { ambient: 0x6f9c93, ambInt: 1.05, warm: 0xd8ffe9, exposure: 1.15 },
};

/* light intensities at lightLevel 1; `lights` scales all of them */
export const BASE_LIGHTS = { key: 1.60, fill: 0.60, warm: 6.0, rail: 4.0, window: 4.0, spill: 2.0 };
