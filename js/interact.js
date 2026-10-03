/* ==========================================================================
   interact — point at things. Hovering an object highlights it and names
   it; clicking (or tapping) walks you over and uses it; clicking the floor
   walks you there.
   ========================================================================== */

import * as THREE from 'three';
import { C, SIT_RANGE, WALK_MIN, WALK_MAX } from './config.js';
import { shell, player, requestOverlay } from './state.js';
import { scene, camera, renderer, avatar, desk, chair, zoneB, couch } from './world.js';
import { setSeated, setCouch, distToSeat, nearCouch, nearStack, useTv, walkTo, openGithub } from './player.js';
import { books, hologram, rowSign, board, door, frame } from './props.js';
import { TV_SCREENS } from './screens.js';
import { exhibit } from './exhibit.js';

/* each item: what it is, where to stand, when you're close enough, and
   what happens then */
const ITEMS = [
  {
    label: 'Sit at the desk — the monitor runs a shell',
    objects: [desk, chair],
    approach: new THREE.Vector3(-1.85, 0, 0.75),
    near: () => distToSeat() <= SIT_RANGE,
    act: () => setSeated(true),
  },
  {
    label: 'Couch — sit and watch MBMR on the TV',
    objects: [couch],
    approach: new THREE.Vector3(0.5, 0, 0.35),
    near: nearCouch,
    act: () => setCouch(true),
  },
  {
    /* from the floor the TV takes you to the couch; from the couch it opens
       the screen it's showing at full size */
    tv: true,
    label: () => (shell.couch
      ? (TV_SCREENS.length ? 'Open this screen full size' : 'Next pick')
      : 'TV — MBMR, my movie recommender (sit on the couch to watch)'),
    objects: [zoneB],
    approach: new THREE.Vector3(0.5, 0, 0.35),
    near: nearCouch,
    act: () => setCouch(true),
  },
  {
    label: 'The stack — see the four projects working together',
    objects: [exhibit],
    approach: new THREE.Vector3(1.75, 0, 1.4),
    near: nearStack,
    act: () => requestOverlay('stack'),
  },
  /* instant: these open something rather than walking you over first (and
     opening a tab has to happen inside the click itself, or it's blocked) */
  ...books.map((b) => ({
    instant: true,
    label: b.title + ' — ' + b.note,
    objects: [b.group],
    act: () => requestOverlay('more', b.slug),
  })),
  {
    instant: true,
    label: 'G.I.D.E.O.N — a local-first AI assistant',
    objects: [hologram],
    act: () => requestOverlay('more', 'gideon'),
  },
  {
    instant: true,
    label: 'More work',
    objects: [rowSign],
    act: () => requestOverlay('more'),
  },
  {
    instant: true,
    label: 'Whiteboard — what I work with',
    objects: [board],
    act: () => requestOverlay('quick', 'skills'),
  },
  {
    instant: true,
    label: 'Door — my GitHub (opens a new tab)',
    objects: [door],
    act: openGithub,
  },
  ...(frame ? [{
    instant: true,
    label: 'Experience — where I have worked',
    objects: [frame],
    act: () => requestOverlay('quick', 'experience'),
  }] : []),
];

/* tag every mesh with its item, and give it its own material so the
   highlight doesn't light up other props that share one */
for (const item of ITEMS) {
  item.mats = [];
  for (const root of item.objects) {
    root.traverse((m) => {
      if (!m.isMesh) return;
      m.userData.item = item;
      if (!m.material.emissive) return;            // the screens are unlit
      if (!m.material.userData.own) {
        m.material = m.material.clone();
        m.material.userData.own = true;
      }
      item.mats.push(m.material);
    });
  }
}
avatar.traverse((m) => { m.userData.ignore = true; });

const HIGHLIGHT = new THREE.Color(C.mint).multiplyScalar(0.10);
const BLACK = new THREE.Color(0x000000);
let hovered = null;

function setHover(item) {
  if (item === hovered) return;
  if (hovered) for (const m of hovered.mats) m.emissive.copy(BLACK);
  hovered = item;
  if (hovered) for (const m of hovered.mats) m.emissive.copy(HIGHLIGHT);
  renderer.domElement.classList.toggle('pointing', !!item);
}

/* --- picking -------------------------------------------------------------- */

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/* the first thing under the pointer: an item, a spot on the floor, or
   null when a wall or prop is in the way */
function pick(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  for (const hit of ray.intersectObjects(scene.children, true)) {
    const o = hit.object;
    if (o.userData.ignore || !o.visible || !o.isMesh) continue;
    if (o.userData.item) return { item: o.userData.item };
    if (o.userData.walkable) return { floor: hit.point };
    return null;
  }
  return null;
}

/* --- the floor marker for click-to-walk ----------------------------------- */

const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.14, 0.2, 32),
  new THREE.MeshBasicMaterial({ color: C.mint, transparent: true, opacity: 0.85, depthWrite: false }),
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
marker.userData.ignore = true;
scene.add(marker);

/* --- tooltip -------------------------------------------------------------- */

const tip = document.getElementById('tip');

function showTip(text, x, y) {
  if (!tip) return;
  if (!text) { tip.hidden = true; return; }
  if (tip.textContent !== text) tip.textContent = text;
  tip.style.transform = 'translate(' + Math.round(x + 16) + 'px,' + Math.round(y + 18) + 'px)';
  tip.hidden = false;
}

/* --- public --------------------------------------------------------------- */

const canPoint = () => !shell.seated && !shell.intro && !shell.paused;
const labelOf = (item) => (typeof item.label === 'function' ? item.label() : item.label);

export function hoverAt(clientX, clientY) {
  if (!canPoint()) return;
  const hit = pick(clientX, clientY);
  let item = hit && hit.item ? hit.item : null;
  if (shell.couch && item && !item.tv) item = null;     // on the couch only the TV answers
  setHover(item);
  showTip(item ? labelOf(item) : '', clientX, clientY);
}

export function clearHover() {
  setHover(null);
  showTip('');
}

function go(item) {
  if (item.instant) { item.act(); return; }
  walkTo(item.approach, item.near, item.act);
}

/* the strip's "Sit" button: walk over from wherever you are, then sit */
export function goSit() {
  if (canPoint()) go(ITEMS[0]);
}

export function clickAt(clientX, clientY) {
  if (!canPoint()) return;
  const hit = pick(clientX, clientY);
  if (shell.couch) {
    if (hit && hit.item && hit.item.tv) useTv();
    return;
  }
  if (!hit) return;
  if (hit.item) {
    go(hit.item);
    clearHover();
    return;
  }
  const p = hit.floor;
  p.x = Math.max(WALK_MIN, Math.min(WALK_MAX, p.x));
  p.z = Math.max(WALK_MIN, Math.min(WALK_MAX, p.z));
  walkTo(p);
  marker.position.set(p.x, 0.03, p.z);
}

/* per frame: drop the hover when it no longer applies, and keep the floor
   marker only while we're walking to it */
export function updateInteract() {
  if (!canPoint() && hovered) clearHover();
  const g = player.goal;
  marker.visible = !!(g && !g.act) && !shell.seated && !shell.couch;
}
