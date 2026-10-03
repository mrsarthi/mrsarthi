/* ==========================================================================
   exhibit — the stack table against the east wall. Two phones, the four
   layers stacked between them, and a packet that goes down one side of the
   stack and up the other. Clicking it opens the interactive version.
   ========================================================================== */

import * as THREE from 'three';
import { C, STACK_POS } from './config.js';
import { PROJECTS } from './content.js';
import { scene, MAT, box, cyl } from './world.js';

export const exhibit = new THREE.Group();
exhibit.position.copy(STACK_POS);
scene.add(exhibit);

const TOP_Y = 0.885;                              // table surface
const CX = 0.10;                                  // the layers' x, in the group

/* --- the table ------------------------------------------------------------ */

box(0.62, 0.05, 1.40, MAT.oak, CX, 0.86, 0, exhibit);
box(0.56, 0.62, 1.30, MAT.charcoal, CX + 0.02, 0.52, 0, exhibit);
box(0.58, 0.20, 1.34, MAT.darkOak, CX + 0.01, 0.10, 0, exhibit);

/* --- two phones, facing the room ------------------------------------------ */

const screenMat = new THREE.MeshBasicMaterial({ color: 0x16232c, toneMapped: false });
const bubbleA = new THREE.MeshBasicMaterial({ color: C.mint, toneMapped: false });
const bubbleB = new THREE.MeshBasicMaterial({ color: 0x3a4a58, toneMapped: false });

for (const z of [-0.55, 0.55]) {
  const phone = new THREE.Group();
  phone.position.set(0.04, TOP_Y, z);
  phone.rotation.z = -0.18;                       // leaning back on a stand
  exhibit.add(phone);
  box(0.05, 0.012, 0.07, MAT.metalDark, 0.03, 0.006, 0, phone);
  box(0.012, 0.17, 0.09, MAT.charcoal, 0, 0.09, 0, phone);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.15), screenMat);
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(-0.0065, 0.09, 0);
  phone.add(screen);
  for (const [dy, dz, w, mat] of [[0.04, 0.012, 0.045, bubbleB], [0.01, -0.012, 0.045, bubbleA], [-0.02, 0.008, 0.04, bubbleB]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.016), mat);
    b.rotation.y = -Math.PI / 2;
    b.position.set(-0.007, 0.09 + dy, dz);
    phone.add(b);
  }
}

/* --- the four layers, top (app) to bottom (transfer) ---------------------- */

const LAYER_Y = [1.38, 1.26, 1.14, 1.02];
const slabs = LAYER_Y.map((y) => {
  const mat = new THREE.MeshBasicMaterial({
    color: C.mint, transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false,
  });
  const geo = new THREE.BoxGeometry(0.42, 0.018, 0.62);
  const slab = new THREE.Mesh(geo, mat);
  slab.position.set(CX, y, 0);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: C.mint, transparent: true, opacity: 0.55, toneMapped: false }),
  );
  slab.add(edges);
  exhibit.add(slab);
  return { mat, edge: edges.material, glow: 0 };
});
for (const [dx, dz] of [[-0.19, -0.29], [0.19, -0.29], [-0.19, 0.29], [0.19, 0.29]]) {
  cyl(0.005, 0.005, LAYER_Y[0] - TOP_Y, 6, MAT.metalDark, CX + dx, (LAYER_Y[0] + TOP_Y) / 2, dz, exhibit, false);
}

const glow = new THREE.PointLight(C.mint, 1.2, 1.8, 2);
glow.position.set(CX - 0.1, 1.25, 0);
exhibit.add(glow);

/* --- the plaque on the wall ----------------------------------------------- */

const PW = 1024, PH = 720;
const plaqueCanvas = document.createElement('canvas');
plaqueCanvas.width = PW;
plaqueCanvas.height = PH;
const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
plaqueTex.colorSpace = THREE.SRGBColorSpace;
plaqueTex.anisotropy = 4;

const SANS = "'Plus Jakarta Sans', system-ui, sans-serif";

function paintPlaque() {
  const g = plaqueCanvas.getContext('2d');
  g.fillStyle = '#0d1117';
  g.fillRect(0, 0, PW, PH);
  g.fillStyle = '#6fd6b4';
  g.fillRect(0, 0, PW, 6);

  g.textBaseline = 'alphabetic';
  g.fillStyle = '#e9eef5';
  g.font = '700 64px ' + SANS;
  g.fillText('The stack', 64, 120);
  g.fillStyle = '#8792a3';
  g.font = '500 30px ' + SANS;
  g.fillText('Four projects, one system', 64, 168);

  PROJECTS.forEach((p, i) => {
    const y = 262 + i * 98;
    g.strokeStyle = 'rgba(111,214,180,0.45)';
    g.lineWidth = 2;
    g.strokeRect(64, y - 44, PW - 128, 76);
    g.fillStyle = '#6fd6b4';
    g.font = '600 24px ' + SANS;
    g.fillText(p.layer.toUpperCase(), 92, y + 4);
    g.fillStyle = '#e9eef5';
    g.font = '700 36px ' + SANS;
    g.fillText(p.title, 300, y + 8);
  });

  g.fillStyle = '#8792a3';
  g.font = '500 26px ' + SANS;
  g.fillText('Click the table to see it working', 64, PH - 44);
  plaqueTex.needsUpdate = true;
}
paintPlaque();
if (document.fonts) document.fonts.ready.then(paintPlaque);

const plaque = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 0.84),
  new THREE.MeshBasicMaterial({ map: plaqueTex, toneMapped: false }),
);
plaque.rotation.y = -Math.PI / 2;
plaque.position.set(0.81, 1.85, 0);
exhibit.add(plaque);
box(0.02, 0.88, 1.24, MAT.metalDark, 0.825, 1.85, 0, exhibit, false);

/* --- the packet: down the sender's side, across, up the receiver's -------- */

const packet = new THREE.Mesh(
  new THREE.SphereGeometry(0.022, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xe9fff6, toneMapped: false }),
);
packet.userData.ignore = true;
exhibit.add(packet);

const PATH = [
  [0.02, 1.08, -0.55],      // phone A
  [CX, 1.47, -0.18],        // above the stack
  [CX, 0.95, -0.18],        // down through every layer
  [CX, 0.95, 0.18],         // across, underneath
  [CX, 1.47, 0.18],         // up through every layer
  [0.02, 1.08, 0.55],       // phone B
].map(([x, y, z]) => new THREE.Vector3(x, y, z));
const SEG_S = 0.8, REST_S = 1.2;
const CYCLE = (PATH.length - 1) * SEG_S + REST_S;
let t = 0;

export function updateExhibit(dt) {
  t = (t + dt) % CYCLE;
  const travel = t / SEG_S;
  const seg = Math.floor(travel);
  if (seg < PATH.length - 1) {
    const f = travel - seg;
    const e = f * f * (3 - 2 * f);                 // smoothstep along each leg
    packet.position.lerpVectors(PATH[seg], PATH[seg + 1], e);
    packet.visible = true;
  } else {
    packet.visible = false;
  }

  /* a layer lights up while the packet passes through it */
  slabs.forEach((s, i) => {
    const hit = packet.visible && Math.abs(packet.position.y - LAYER_Y[i]) < 0.05
      && Math.abs(packet.position.z) < 0.31;
    s.glow += ((hit ? 1 : 0) - s.glow) * Math.min(1, dt * (hit ? 18 : 3));
    s.mat.opacity = 0.14 + 0.42 * s.glow;
    s.edge.opacity = 0.55 + 0.45 * s.glow;
  });
}
