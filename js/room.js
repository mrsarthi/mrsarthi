/* ============================================================================
   room — the 3D room. site.js imports this only once it knows WebGL works,
   so if three.js or WebGL fails, the quick view still does.
   ----------------------------------------------------------------------------
   · walk-around third person — W/S walk, A/D TURN (character + camera), Shift sprint
   · drag to look around, wheel to zoom, click things (or the floor) to go there
   · walk to the chair, press E to sit -> first person at the monitor
   · the monitor runs a real shell: virtual filesystem, commands, links
   · the TV shows a demo of the movie recommender (MBMR)
   ----------------------------------------------------------------------------
   Modules:
     site.js      page entry: intro screen, quick view, loads this file
     quickview.js the plain-HTML version of everything
     content.js   what the room says about me — edit this one
     config.js    dimensions, tuning, palette
     state.js     shared mutable state
     fs.js        virtual filesystem built from content
     terminal.js  output buffer, links, paths
     screens.js   monitor + TV canvas painters
     world.js     renderer, scene, props, lights, avatar
     player.js    walking, camera, sitting, field of view
     exhibit.js   the stack table: four layers, two phones, a packet
     props.js     the shelf's "more work" books, the whiteboard, the door
     more.js      the "more work" shelf as a page
     stack.js     the interactive stack: message, offline sync, file transfer
     interact.js  hover highlight, click/tap to walk and use
     commands.js  shell commands, completion, history
     input.js     keyboard, mouse, touch joystick, phone keyboard
     ui.js        bottom control strip
   ========================================================================== */

import { SPAWN, SPAWN_YAW, CAM_ORBIT } from './config.js';
import { term, shell, room, tv, player, cam, input } from './state.js';
import { PROFILE } from './content.js';
import { ALL_PROJECTS, FS } from './fs.js';
import { LINKS, registerLink, clearTerm, pushMd } from './terminal.js';
import { paintTerminal, paintTV, TV_SCREENS, nextTv } from './screens.js';
import { scene, camera, renderer, onResize, applyTheme } from './world.js';
import { updatePlayer, updateCamera, setSeated, applyFov } from './player.js';
import { updateInteract } from './interact.js';
import { updateExhibit } from './exhibit.js';
import { updateProps } from './props.js';
import { initInput } from './input.js';
import { initUI, updateUI } from './ui.js';

/* --- what site.js can do to the room -------------------------------------- */

const FLY_IN_MS = 2200;

/* leave the intro: the camera glides from its orbit down behind the avatar */
export function enter() {
  if (!shell.intro) return;
  shell.intro = false;
  cam.glideUntil = performance.now() + FLY_IN_MS;
  input.lastInteract = performance.now();
  document.body.classList.remove('intro');
  renderer.domElement.focus({ preventScroll: true });
}

/* the quick view is covering the room: stop input and rendering */
export function setPaused(v) {
  shell.paused = !!v;
  input.keys.clear();
  input.stick.x = input.stick.y = 0;
  if (!v) lastT = performance.now();
}

/* --- frame loop ----------------------------------------------------------- */

let lastT = performance.now();
let termTick = 0;
let tvTick = performance.now();
const TV_SLIDE_MS = 6500;

function frame(now) {
  requestAnimationFrame(frame);
  if (shell.paused || document.hidden) return;

  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
  lastT = now;

  // idle: drift the boom round the room only when nothing has been touched
  if (!shell.seated && !shell.couch && !shell.intro && !input.dragging && !player.goal
      && now - input.lastInteract > 7000) cam.yaw += dt * 0.06;

  updatePlayer(dt);
  updateCamera(dt);
  updateExhibit(dt);
  updateProps(dt);
  updateInteract();
  updateUI();

  // the 1440x810 terminal is far too big to repaint at 60fps, so only
  // when it changed -- the 500ms ceiling is what makes the caret blink
  if (term.dirty || now - termTick > 500) {
    if (!term.dirty) term.caretOn = !term.caretOn;
    termTick = now;
    term.dirty = false;
    paintTerminal();
  }

  // with real screenshots the TV runs a slideshow; it only repaints on change
  if (shell.couch) tvTick = now;
  if (TV_SCREENS.length > 1 && room.tvOn && now - tvTick > TV_SLIDE_MS) {
    tvTick = now;
    nextTv();
  }
  if (room.tvDirty) {
    room.tvDirty = false;
    paintTV();
  }

  renderer.render(scene, camera);
}

/* --- boot ----------------------------------------------------------------- */

applyTheme('dark');

registerLink({ label: 'GitHub', url: PROFILE.github });
registerLink({ label: 'LinkedIn', url: PROFILE.linkedin });
registerLink({ label: 'LeetCode', url: PROFILE.leetcode });
registerLink({ label: 'Codeforces', url: PROFILE.codeforces });
registerLink({ label: 'Email', url: 'mailto:' + PROFILE.email });
if (PROFILE.resume) registerLink({ label: 'Résumé (PDF)', url: new URL(PROFILE.resume, location.href).href });
for (const p of ALL_PROJECTS) {
  for (const [kind, url] of Object.entries(p.links)) {
    registerLink({ label: p.title + ' / ' + kind, url });
  }
}

clearTerm();
pushMd('# devroom');
pushMd('Welcome, you’re in ' + PROFILE.name + '’s room.');
pushMd('');
pushMd('Type **help** for commands · **projects** for the main work · **ls** to browse.');
pushMd('');

// spawn standing, facing the monitor; the intro orbit owns the camera
// until enter(), and then it glides in behind the avatar
player.pos.copy(SPAWN);
cam.yaw = SPAWN_YAW;
cam.dist = CAM_ORBIT;

function resize() {
  onResize();
  applyFov();
}
resize();
updateCamera(0);
window.addEventListener('resize', resize);
initInput();
initUI();

requestAnimationFrame(frame);

/* handy from the browser console */
window.devroom = {
  PROFILE, ALL_PROJECTS, LINKS, FS,
  term, shell, room, player, cam,
  scene, camera, renderer,
  setSeated, applyTheme, paintTerminal, paintTV, enter, setPaused,
  tvHero: () => tv.hero,
};
