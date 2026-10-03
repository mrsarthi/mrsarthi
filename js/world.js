/* ==========================================================================
   world — renderer, scene, the room and its props, lights, the avatar
   ========================================================================== */

import * as THREE from 'three';
import {
  HALF, WALL_H, SEAT, FOV_WALK, C, THEMES, BASE_LIGHTS, COUCH_POS,
} from './config.js';
import { term, room } from './state.js';
import { termTexture, tvTexture } from './screens.js';

/* --- renderer, scene, camera ---------------------------------------------- */

export const scene = new THREE.Scene();

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const mount = document.getElementById('game') || document.body;
mount.appendChild(renderer.domElement);
renderer.domElement.setAttribute('tabindex', '0');

export const camera = new THREE.PerspectiveCamera(FOV_WALK, window.innerWidth / window.innerHeight, 0.05, 120);

export function onResize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
}

/* --- materials ------------------------------------------------------------ */

const M = (color, rough, metal) => new THREE.MeshStandardMaterial({
  color, roughness: rough === undefined ? 0.85 : rough, metalness: metal || 0,
});

export const MAT = {
  floor:    M(C.floor, 0.96),
  wall:     M(C.wall, 0.94),
  ceiling:  M(C.ceiling, 0.98),
  base:     M(C.base, 0.9),
  oak:      M(C.oak, 0.8),
  darkOak:  M(C.darkOak, 0.82),
  charcoal: M(C.charcoal, 0.7),
  metal:    M(C.metal, 0.4, 0.7),
  metalDark:M(C.metalDark, 0.45, 0.6),
  pot:      M(C.pot, 0.9),
  foliage:  M(C.foliage, 0.85),
  mint:     M(C.mint, 0.6),
  skin:     M(C.skin, 0.85),
  cushion:  M(C.cushion, 0.95),
  rug:      M(C.rug, 1.0),
  rug2:     M(C.rug2, 1.0),
  slat:     M(C.slat, 0.8),
  bookA:    M(C.bookA, 0.9),
  bookB:    M(C.bookB, 0.9),
  bookC:    M(C.bookC, 0.9),
  lamp:     M(C.lamp, 0.5),
  screen:   M(C.screen, 0.6),
  couch:    M(C.couch, 0.95),
  couchSeat:M(C.couchSeat, 0.95),
  pillow:   M(C.pillow, 0.9),
  glass:    new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.22 }),
  sky:      new THREE.MeshBasicMaterial({ color: C.sky }),
};

/* --- prop fading: props near the camera turn see-through ------------------ */

const FADE_PROPS = [];

export function registerFade(obj, near, far) {
  obj.updateWorldMatrix(true, true);
  const pos = new THREE.Vector3();
  obj.getWorldPosition(pos);
  const mats = [];
  obj.traverse((child) => {
    if (!child.isMesh) return;
    if (Array.isArray(child.material)) return;
    child.material = child.material.clone();
    child.material.transparent = true;
    child.material.userData.own = true;     // interact.js must not re-clone it
    mats.push(child.material);
  });
  FADE_PROPS.push({ mats, pos, near, far, o: 1 });
}

export function updateFade(camPos) {
  for (const f of FADE_PROPS) {
    const d = camPos.distanceTo(f.pos);
    let o = 1;
    if (d <= f.near) o = 0.10;
    else if (d < f.far) o = 0.10 + 0.90 * ((d - f.near) / (f.far - f.near));
    if (Math.abs(o - f.o) < 0.004) continue;
    f.o = o;
    const opaque = o > 0.985;
    for (const m of f.mats) {
      m.opacity = o;
      m.depthWrite = opaque;
    }
  }
}

/* --- helpers -------------------------------------------------------------- */

export function box(w, h, d, mat, x, y, z, parent, cast) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast !== false;
  m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}

export function cyl(rt, rb, h, seg, mat, x, y, z, parent, cast) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = cast !== false;
  m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}

/* --- shell: floor, ceiling, walls, window --------------------------------- */

export const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), MAT.floor);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.userData.walkable = true;
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), MAT.ceiling);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = WALL_H;
scene.add(ceiling);

const T = 0.12;                                   // wall thickness
box(HALF * 2 + T * 2, WALL_H, T, MAT.wall, 0, WALL_H / 2, -HALF - T / 2);   // north
box(HALF * 2 + T * 2, WALL_H, T, MAT.wall, 0, WALL_H / 2,  HALF + T / 2);   // south
box(T, WALL_H, HALF * 2, MAT.wall,  HALF + T / 2, WALL_H / 2, 0);           // east

/* west wall, with a window opening: z [-0.35, 1.45], y [1.70, 2.60] */
const WX = -HALF - T / 2;
box(T, 1.70, HALF * 2, MAT.wall, WX, 0.85, 0);                    // below the sill
box(T, 0.60, HALF * 2, MAT.wall, WX, 2.90, 0);                    // above the head
box(T, 0.90, 3.25,     MAT.wall, WX, 2.15, -1.975);               // left of the window
box(T, 0.90, 2.15,     MAT.wall, WX, 2.15,  2.525);               // right of the window

/* skirting */
for (const [w, d, x, z] of [[HALF * 2, 0.06, 0, -HALF + 0.03], [HALF * 2, 0.06, 0, HALF - 0.03]]) {
  box(w, 0.12, d, MAT.base, x, 0.06, z, scene, false);
}
box(0.06, 0.12, HALF * 2, MAT.base, HALF - 0.03, 0.06, 0, scene, false);
box(0.06, 0.12, HALF * 2, MAT.base, -HALF + 0.03, 0.06, 0, scene, false);

/* the window itself */
const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.05), MAT.sky);
sky.rotation.y = Math.PI / 2;
sky.position.set(-HALF - 0.16, 2.15, 0.55);
scene.add(sky);

const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.80, 0.90), MAT.glass);
pane.rotation.y = Math.PI / 2;
pane.position.set(-HALF - 0.02, 2.15, 0.55);
scene.add(pane);

for (let i = 0; i < 7; i++) {
  const y = 1.72 + i * ((2.58 - 1.72) / 6);
  const slat = box(0.10, 0.016, 1.78, MAT.slat, -HALF - 0.04, y, 0.55, scene, false);
  slat.rotation.z = 0.42;
}
box(0.06, 0.06, 1.86, MAT.base, -HALF - 0.04, 1.70, 0.55, scene, false);
box(0.06, 0.06, 1.86, MAT.base, -HALF - 0.04, 2.60, 0.55, scene, false);

/* --- rug ------------------------------------------------------------------ */

box(3.2, 0.014, 2.2, MAT.rug, 0.4, 0.011, 1.1, scene, false).userData.walkable = true;
box(2.6, 0.008, 1.7, MAT.rug2, 0.4, 0.020, 1.1, scene, false).userData.walkable = true;

/* --- zone A: desk, monitor, chair ----------------------------------------- */

export const desk = new THREE.Group();
scene.add(desk);

box(0.72, 0.05, 1.80, MAT.oak, -3.08, 0.75, 0.60, desk);          // top
for (const dz of [-0.80, 0.80]) {
  box(0.60, 0.72, 0.05, MAT.darkOak, -3.08, 0.37, 0.60 + dz, desk);
}
box(0.62, 0.26, 1.60, MAT.darkOak, -3.10, 0.62, 0.60, desk);      // drawer block

/* monitor */
const monitor = new THREE.Group();
monitor.position.set(-3.19, 0, 0.60);
desk.add(monitor);

box(0.10, 0.02, 0.34, MAT.metalDark, 0.05, 0.79, 0, monitor);     // foot
box(0.06, 0.30, 0.08, MAT.metalDark, 0.04, 0.94, 0, monitor);     // neck
box(0.05, 0.82, 1.42, MAT.charcoal, 0.03, 1.195, 0, monitor);     // body

const screenMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.30, 0.73),
  new THREE.MeshBasicMaterial({ map: termTexture, toneMapped: false }),
);
screenMesh.rotation.y = Math.PI / 2;
screenMesh.position.set(0.058, 1.195, 0);
monitor.add(screenMesh);

/* keyboard + mouse + paper */
box(0.16, 0.02, 0.44, MAT.charcoal, -2.85, 0.78, 0.60, desk);
box(0.09, 0.02, 0.13, MAT.charcoal, -2.82, 0.78, 0.98, desk);
box(0.28, 0.01, 0.20, MAT.slat, -3.12, 0.78, -0.16, desk, false).rotation.y = 0.22;

/* desk lamp */
const lamp = new THREE.Group();
lamp.position.set(-3.24, 0.775, -0.16);
desk.add(lamp);
cyl(0.09, 0.11, 0.02, 16, MAT.metalDark, 0, 0.01, 0, lamp);
cyl(0.015, 0.015, 0.42, 8, MAT.metalDark, 0, 0.22, 0, lamp);
const shade = cyl(0.10, 0.15, 0.16, 16, MAT.lamp, 0, 0.46, 0, lamp, false);
shade.rotation.x = 0.5;

/* chair */
export const chair = new THREE.Group();
chair.position.set(SEAT.x, 0, SEAT.z);
chair.rotation.y = -Math.PI / 2;                                   // faces the desk (-x)
scene.add(chair);

cyl(0.30, 0.32, 0.03, 14, MAT.metalDark, 0, 0.02, 0, chair);
cyl(0.03, 0.03, 0.42, 8, MAT.metalDark, 0, 0.23, 0, chair);
box(0.46, 0.07, 0.46, MAT.cushion, 0, 0.46, 0, chair);
box(0.44, 0.44, 0.06, MAT.cushion, 0, 0.73, -0.21, chair);
for (const sx of [-0.23, 0.23]) {
  box(0.05, 0.06, 0.34, MAT.metalDark, sx, 0.62, 0.02, chair);
  box(0.05, 0.10, 0.05, MAT.metalDark, sx, 0.52, 0.02, chair);
}
registerFade(chair, 1.60, 3.00);

/* --- zone B: credenza + TV ------------------------------------------------ */

export const zoneB = new THREE.Group();
zoneB.position.set(0.5, 0, -3.28);
scene.add(zoneB);

box(2.40, 0.42, 0.40, MAT.charcoal, 0, 0.21, 0, zoneB);
box(2.44, 0.04, 0.44, MAT.oak, 0, 0.44, 0, zoneB);
for (const sx of [-1.18, 1.18]) box(0.06, 0.16, 0.42, MAT.metalDark, sx, 0.22, 0, zoneB);
box(2.30, 1.30, 0.05, MAT.metalDark, 0, 1.42, 0.02, zoneB);

const tvMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2.24, 1.26),
  new THREE.MeshBasicMaterial({ map: tvTexture, toneMapped: false }),
);
tvMesh.position.set(0, 1.42, 0.05);
zoneB.add(tvMesh);

/* --- couch, facing the TV (its front is -z) -------------------------------- */

export const couch = new THREE.Group();
couch.position.copy(COUCH_POS);
scene.add(couch);

for (const [lx, lz] of [[-0.86, -0.32], [0.86, -0.32], [-0.86, 0.32], [0.86, 0.32]]) {
  box(0.06, 0.10, 0.06, MAT.darkOak, lx, 0.05, lz, couch);
}
box(1.86, 0.22, 0.80, MAT.couch, 0, 0.21, 0, couch);                       // base
for (const sx of [-0.44, 0.44]) {
  box(0.86, 0.14, 0.62, MAT.couchSeat, sx, 0.39, -0.07, couch);            // seat cushions
  const back = box(0.84, 0.38, 0.14, MAT.couchSeat, sx, 0.64, 0.19, couch); // back cushions
  back.rotation.x = 0.12;
}
const couchBack = box(1.86, 0.50, 0.20, MAT.couch, 0, 0.55, 0.30, couch);
couchBack.rotation.x = 0.12;
for (const sx of [-0.93, 0.93]) box(0.16, 0.30, 0.80, MAT.couch, sx, 0.45, 0, couch);   // arms
const pillow = box(0.30, 0.28, 0.10, MAT.pillow, -0.62, 0.60, 0.04, couch);
pillow.rotation.set(0.2, 0.5, 0.12);
registerFade(couch, 1.20, 2.60);

/* --- shelf ---------------------------------------------------------------- */

export const shelf = new THREE.Group();
shelf.position.set(2.62, 0, -3.30);
scene.add(shelf);

const bookMats = [MAT.bookA, MAT.bookB, MAT.bookC];
for (const sx of [-0.46, 0.46]) box(0.06, 2.00, 0.36, MAT.darkOak, sx, 1.00, 0, shelf);
for (let p = 0; p < 4; p++) {
  box(1.00, 0.04, 0.36, MAT.oak, 0, 0.42 + p * 0.50, 0, shelf);
  if (p === 2) continue;                    // eye level: the "more work" row, see props.js
  for (let i = 0; i < 6; i++) {
    box(0.06, 0.26, 0.22, bookMats[(i + p) % 3], -0.34 + i * 0.075, 0.59 + p * 0.50, 0.02, shelf);
  }
}
box(0.30, 0.16, 0.24, MAT.pot, 0.28, 2.12, 0, shelf);              // a little pot on top
registerFade(shelf, 1.90, 3.40);

/* --- plant ---------------------------------------------------------------- */

const plant = new THREE.Group();
plant.position.set(3.15, 0, -1.20);
scene.add(plant);

cyl(0.22, 0.16, 0.38, 14, MAT.pot, 0, 0.19, 0, plant);
cyl(0.24, 0.24, 0.05, 14, MAT.pot, 0, 0.40, 0, plant);
cyl(0.19, 0.19, 0.05, 14, MAT.charcoal, 0, 0.43, 0, plant);
for (const [x, y, z, r] of [[0, 0.74, 0, 0.30], [-0.17, 0.96, 0.10, 0.22], [0.18, 1.02, -0.08, 0.20], [0.02, 1.16, 0.14, 0.16]]) {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), MAT.foliage);
  b.position.set(x, y, z);
  b.castShadow = true;
  plant.add(b);
}
registerFade(plant, 1.70, 3.20);

/* --- ceiling rail with three lamps ---------------------------------------- */

const rail = new THREE.Group();
rail.position.set(-0.8, 3.06, 0.1);
scene.add(rail);

const coneMat = MAT.lamp.clone();
coneMat.side = THREE.DoubleSide;

box(2.6, 0.05, 0.05, MAT.metalDark, 0, 0, 0, rail, false);
const railLights = [];
for (const lx of [-1.0, 0, 1.0]) {
  cyl(0.02, 0.02, 0.26, 6, MAT.metalDark, lx, -0.15, 0, rail, false);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.26, 14, 1, true), coneMat);
  cone.position.set(lx, -0.36, 0);
  cone.rotation.x = Math.PI;
  rail.add(cone);
  const pl = new THREE.PointLight(0xffe6c0, BASE_LIGHTS.rail, 7, 2);
  pl.position.set(lx - 0.8, 3.06 - 0.42, 0.1);
  scene.add(pl);
  railLights.push(pl);
}

/* --- lighting ------------------------------------------------------------- */

const ambient = new THREE.AmbientLight(0x707b8e, 0.95);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xf0f4fc, BASE_LIGHTS.key);
key.position.set(-6, 7.5, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -6;
key.shadow.camera.right = 6;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -6;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 26;
key.shadow.bias = -0.0006;
scene.add(key);

const fill = new THREE.DirectionalLight(0x8fa2bd, BASE_LIGHTS.fill);
fill.position.set(6, 4, 6);
scene.add(fill);

const warmLight = new THREE.PointLight(0xffecd0, BASE_LIGHTS.warm, 9, 2);
warmLight.position.set(1.5, 2.6, 1.5);
scene.add(warmLight);

const windowLight = new THREE.PointLight(0xbcd8ff, BASE_LIGHTS.window, 8, 2);
windowLight.position.set(-3.0, 2.2, 0.55);
scene.add(windowLight);

const spill = new THREE.PointLight(0xffd9a0, BASE_LIGHTS.spill, 3.4, 2);
spill.position.set(-3.05, 1.15, -0.16);
scene.add(spill);

/* every light is BASE_LIGHTS (or the theme's ambient) × room.lightLevel */
export function applyLights() {
  const s = room.lightLevel;
  const t = THEMES[room.theme];
  ambient.intensity = t.ambInt * s;
  key.intensity = BASE_LIGHTS.key * s;
  fill.intensity = BASE_LIGHTS.fill * s;
  warmLight.intensity = BASE_LIGHTS.warm * s;
  railLights.forEach((l) => { l.intensity = BASE_LIGHTS.rail * s; });
  windowLight.intensity = BASE_LIGHTS.window * s;
  spill.intensity = BASE_LIGHTS.spill * s;
}

export function applyTheme(name) {
  const themeName = THEMES[name] ? name : 'dark';
  const t = THEMES[themeName];
  room.theme = themeName;
  renderer.toneMappingExposure = t.exposure;
  ambient.color.setHex(t.ambient);
  warmLight.color.setHex(t.warm);
  applyLights();
  term.dirty = true;
  return themeName;
}

/* --- the avatar ----------------------------------------------------------- */

export const avatar = new THREE.Group();

const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.80, 14), MAT.mint);
body.position.y = 0.40;
body.castShadow = true;
avatar.add(body);

const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.30, 1), MAT.skin);
head.position.y = 1.02;
head.castShadow = true;
avatar.add(head);

const visor = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.05), MAT.charcoal);
visor.position.set(0, 1.03, 0.27);
avatar.add(visor);

const pack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.14), MAT.cushion);
pack.position.set(0, 0.56, -0.29);
avatar.add(pack);

scene.add(avatar);
