/* ==========================================================================
   props — the rest of the room:
     · the bookshelf's eye-level row: a book per "more work" project, and a
       small hologram for G.I.D.E.O.N
     · a whiteboard on the south wall listing what I work with
     · the door beside it, which leads to my GitHub
     · a frame on the same wall with my latest role (if there is one)
   ========================================================================== */

import * as THREE from 'three';
import { C, MONO, FRAME_POS } from './config.js';
import { PROFILE, SKILLS, OTHER_WORK, EXPERIENCE } from './content.js';
import { scene, shelf, MAT, box, cyl } from './world.js';

const SANS = "'Plus Jakarta Sans', system-ui, sans-serif";

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  /* save/restore: the repaint after the web font loads must not inherit the
     first paint's alignment or transform */
  const draw = () => {
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    paint(ctx, w, h);
    ctx.restore();
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts) document.fonts.ready.then(draw);   // repaint once the web font is in
  return tex;
}

const labelMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

/* --- the "more work" row: one book per project ---------------------------- */

const ROW_Y = 1.44;                                    // top of the shelf board
const BOOKS = [
  { slug: 'macco',   color: 0x3b6e8f, hex: '#3b6e8f', note: 'multi-agent code comprehension' },
  { slug: 'gideon',  color: 0x2f7f6b, hex: '#2f7f6b', note: 'a local-first AI assistant' },
  { slug: 'codefit', color: 0xb86a4b, hex: '#b86a4b', note: 'six merged pull requests' },
];

export const books = [];

BOOKS.forEach((b, i) => {
  const p = OTHER_WORK.find((x) => x.slug === b.slug);
  if (!p) return;
  const g = new THREE.Group();
  g.position.set(-0.33 + i * 0.14, ROW_Y, 0.02);
  shelf.add(g);
  box(0.12, 0.34, 0.24, new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.85 }), 0, 0.17, 0, g);

  /* the spine, facing the room: the title reads bottom to top */
  const tex = canvasTexture(128, 384, (ctx, w, h) => {
    ctx.fillStyle = b.hex;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 22, w, 5);
    ctx.fillRect(0, h - 27, w, 5);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let px = 50;
    const title = p.title.replace(/ \(.*\)$/, '');
    do { ctx.font = '700 ' + px + 'px ' + SANS; px -= 2; } while (ctx.measureText(title).width > h - 80 && px > 20);
    ctx.fillText(title, 0, 2);
    ctx.restore();
  });
  const spine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.34), labelMat(tex));
  spine.position.set(0, 0.17, 0.122);
  g.add(spine);
  books.push({ slug: p.slug, title: p.title.replace(/ \(.*\)$/, ''), note: b.note, group: g });
});

/* G.I.D.E.O.N's hologram: a slowly turning wireframe on a little base */
export const hologram = new THREE.Group();
hologram.position.set(0.25, ROW_Y, 0.02);
shelf.add(hologram);
cyl(0.09, 0.10, 0.03, 20, MAT.metalDark, 0, 0.015, 0, hologram);
const holoShell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.11, 1),
  new THREE.MeshBasicMaterial({ color: C.mint, wireframe: true, transparent: true, opacity: 0.8, toneMapped: false }),
);
holoShell.position.y = 0.2;
hologram.add(holoShell);
const holoCore = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.035, 0),
  new THREE.MeshBasicMaterial({ color: 0xe9fff6, toneMapped: false }),
);
holoCore.position.y = 0.2;
hologram.add(holoCore);

/* a strip along the board's edge naming the row */
const rowTex = canvasTexture(512, 64, (ctx, w, h) => {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6fd6b4';
  ctx.font = '700 34px ' + SANS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MORE WORK', w / 2, h / 2 + 2);
});
export const rowSign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.052), labelMat(rowTex));
rowSign.position.set(0, ROW_Y - 0.03, 0.185);
shelf.add(rowSign);

/* --- the whiteboard: skills ---------------------------------------------- */

export const board = new THREE.Group();
board.position.set(0.90, 0, 3.60);
board.rotation.y = Math.PI;                            // facing into the room
scene.add(board);

box(2.08, 1.18, 0.03, MAT.metalDark, 0, 1.65, 0.015, board, false);
const boardTex = canvasTexture(1600, 880, (ctx, w, h) => {
  ctx.fillStyle = '#f3f1ea';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1f2a33';
  ctx.font = '700 74px ' + SANS;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('What I work with', 80, 140);
  ctx.strokeStyle = '#2f7f6b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(80, 168);
  ctx.lineTo(680, 162);
  ctx.stroke();

  let y = 270;
  for (const [k, v] of SKILLS) {
    ctx.fillStyle = '#2f7f6b';
    ctx.font = '700 42px ' + SANS;
    ctx.fillText(k, 80, y);
    ctx.fillStyle = '#2b333d';
    ctx.font = '500 38px ' + SANS;
    /* wrap the value onto a second line if it runs long */
    const words = v.split(' ');
    let line = '', ly = y;
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > w - 480 - 80 && line) {
        ctx.fillText(line, 480, ly);
        line = word;
        ly += 48;
      } else {
        line = next;
      }
    }
    ctx.fillText(line, 480, ly);
    y = ly + 108;
  }
  ctx.fillStyle = '#8a929c';
  ctx.font = '500 30px ' + SANS;
  ctx.textAlign = 'right';
  ctx.fillText('click for the full list →', w - 70, h - 50);
});
const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 }));
boardFace.position.set(0, 1.65, 0.032);
board.add(boardFace);
box(1.30, 0.03, 0.07, MAT.metalDark, 0, 1.05, 0.05, board);   // marker tray
for (const [mx, col] of [[-0.35, 0x2f7f6b], [-0.2, 0xb86a4b], [-0.05, 0x1f2a33]]) {
  const m = cyl(0.012, 0.012, 0.13, 8, new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }), mx, 1.08, 0.055, board);
  m.rotation.z = Math.PI / 2;
}

/* --- the door: GitHub ----------------------------------------------------- */

export const door = new THREE.Group();
door.position.set(-2.30, 0, 3.60);
door.rotation.y = Math.PI;
scene.add(door);

for (const sx of [-0.51, 0.51]) box(0.08, 2.20, 0.10, MAT.darkOak, sx, 1.10, 0.03, door, false);
box(1.10, 0.08, 0.10, MAT.darkOak, 0, 2.24, 0.03, door, false);
box(0.94, 2.10, 0.04, MAT.oak, 0, 1.06, 0.03, door, false);
box(0.70, 0.78, 0.012, MAT.darkOak, 0, 1.56, 0.055, door, false);
box(0.70, 0.70, 0.012, MAT.darkOak, 0, 0.60, 0.055, door, false);
const knob = cyl(0.025, 0.025, 0.06, 12, MAT.metal, 0.36, 1.02, 0.08, door, false);
knob.rotation.x = Math.PI / 2;
box(0.12, 0.022, 0.022, MAT.metal, 0.31, 1.02, 0.11, door, false);

const doorTex = canvasTexture(768, 128, (ctx, w, h) => {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6fd6b4';
  ctx.fillRect(0, h - 6, w, 6);
  ctx.fillStyle = '#e9eef5';
  ctx.font = '600 50px ' + MONO;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(PROFILE.github.replace(/^https?:\/\//, '') + ' →', w / 2, h / 2 - 2);
});
const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.16), labelMat(doorTex));
doorSign.position.set(0, 2.44, 0.02);
door.add(doorSign);

/* --- the frame: experience ------------------------------------------------ */

/* lines of text wrapped to a width; returns the y after the last line */
function wrapText(ctx, text, x, y, maxW, lineH) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else {
      line = next;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineH;
}

export let frame = null;

if (EXPERIENCE.length) {
  const e = EXPERIENCE[0];
  frame = new THREE.Group();
  frame.position.set(FRAME_POS.x, 0, 3.60);
  frame.rotation.y = Math.PI;
  scene.add(frame);

  box(1.20, 0.92, 0.04, MAT.darkOak, 0, 1.68, 0.02, frame, false);
  const tex = canvasTexture(1100, 820, (ctx, w, h) => {
    ctx.fillStyle = '#f3f1ea';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d6d0c2';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = '#2f7f6b';
    ctx.font = '700 30px ' + SANS;
    ctx.fillText('EXPERIENCE', 80, 116);
    ctx.fillStyle = '#1f2a33';
    ctx.font = '700 64px ' + SANS;
    ctx.fillText(e.role, 80, 196);
    ctx.fillStyle = '#4a5560';
    ctx.font = '500 34px ' + SANS;
    ctx.fillText(e.org + ' · ' + e.from + ' – ' + e.to, 80, 252);
    ctx.fillStyle = '#2b333d';
    ctx.font = '500 29px ' + SANS;
    let y = 330;
    for (const pt of e.points) {
      ctx.fillText('•', 80, y);
      y = wrapText(ctx, pt, 112, y, w - 112 - 80, 40) + 14;
      if (y > h - 120) break;
    }
    ctx.fillStyle = '#8a929c';
    ctx.font = '500 26px ' + SANS;
    ctx.textAlign = 'right';
    ctx.fillText((EXPERIENCE.length > 1 ? '+' + (EXPERIENCE.length - 1) + ' more · ' : '') + 'click for details →', w - 70, h - 60);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.10, 0.82), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  face.position.set(0, 1.68, 0.042);
  frame.add(face);
}

/* --- per frame ------------------------------------------------------------ */

let spin = 0;

export function updateProps(dt) {
  spin += dt;
  holoShell.rotation.y = spin * 0.6;
  holoShell.rotation.x = Math.sin(spin * 0.4) * 0.3;
  holoCore.rotation.y = -spin * 1.2;
  holoShell.material.opacity = 0.65 + Math.sin(spin * 2.2) * 0.15;
}
