/* ==========================================================================
   stack — the four headliners working together, as three small scripted
   scenarios. Each lights up the layers it uses:
     message        EchoIt + Dicsussion   seal, prove, send, verify, slash
     offline sync   EchoIt + Corroborate  edit offline, reconnect, converge
     file transfer  EchoIt + Chorrent     pieces from a swarm, verified
   A model of the design for visitors, not the real protocol: the offline
   sync does run a real (tiny) CRDT, and the file scheduler is real logic,
   but nothing here touches a network. Imports nothing from three.js.
   ========================================================================== */

import { PROJECTS, STACK_INTRO } from './content.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PACE = reduced ? 0.35 : 1;

let root = null;
let stage = null;
let logEl = null;
let blurbEl = null;
let active = 'message';
let mounted = null;          // the running scenario's { stop }
let token = 0;               // bumped to cancel any running script

class Cancelled extends Error {}

/* sleep inside a script; throws if the scenario was switched or closed */
function wait(ms, tok) {
  return new Promise((resolve, reject) => {
    setTimeout(() => (tok === token ? resolve() : reject(new Cancelled())), ms * PACE);
  });
}

/* run a script, swallowing cancellation */
function script(fn) {
  return fn(token).catch((err) => { if (!(err instanceof Cancelled)) throw err; });
}

const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

/* --- log and layer lights ------------------------------------------------- */

function log(text, kind) {
  const li = document.createElement('li');
  if (kind) li.className = 'st-log-' + kind;
  li.textContent = text;
  logEl.appendChild(li);
  while (logEl.children.length > 7) logEl.firstElementChild.remove();
}

function clearLog() {
  logEl.textContent = '';
}

function light(slugs) {
  root.querySelectorAll('.st-layer').forEach((b) => {
    b.classList.toggle('lit', slugs.includes(b.dataset.layer));
  });
}

function pulse(slug) {
  const b = root.querySelector('.st-layer[data-layer="' + slug + '"]');
  if (!b) return;
  b.classList.remove('pulse');
  void b.offsetWidth;                               // restart the animation
  b.classList.add('pulse');
}

/* a dot crossing the wire between the two phones */
async function packet(wire, toRight, ms, tok, kind) {
  const dot = wire.querySelector('.st-packet');
  dot.className = 'st-packet' + (kind ? ' ' + kind : '');
  dot.style.transition = 'none';
  dot.style.left = toRight ? '0%' : '100%';
  dot.style.opacity = '1';
  void dot.offsetWidth;
  dot.style.transition = 'left ' + Math.round(ms * PACE) + 'ms ease-in-out';
  dot.style.left = toRight ? '100%' : '0%';
  await wait(ms, tok);
  dot.style.opacity = '0';
}

const wireHtml = (label) => '<div class="st-wire"><span class="st-wire-label">' + label
  + '</span><span class="st-wire-line"><i class="st-packet"></i></span></div>';

/* ==========================================================================
   1. message — EchoIt + Dicsussion
   ========================================================================== */

const QUOTA = 3;             // Tier 1: 3 messages per 10 s epoch
const EPOCH_MS = 10000;

function mountMessage() {
  const el = h(`
    <div class="st-scene">
      <p class="st-context">An open channel with proofs required, the setting Dicsussion's rate limits are built for.</p>
      <div class="st-duo">
        <div class="st-phone">
          <div class="st-phone-top"><strong>Alice</strong><span class="st-badge bad" hidden>slashed</span></div>
          <div class="st-chat" data-chat="a"></div>
          <form class="st-compose">
            <input type="text" maxlength="40" value="anyone up for chai?" aria-label="Alice's message" />
            <button type="submit" class="btn primary sm">Send</button>
          </form>
        </div>
        ${wireHtml('Iroh · QUIC')}
        <div class="st-phone">
          <div class="st-phone-top"><strong>Bob</strong><span class="st-muted">#general</span></div>
          <div class="st-chat" data-chat="b"></div>
          <div class="st-checks" aria-live="polite"></div>
        </div>
      </div>
      <div class="st-meter">
        <span>Epoch</span><span class="st-bar"><i></i></span>
        <span class="st-quota"></span>
      </div>
      <div class="st-buttons">
        <button type="button" class="btn ghost sm" data-act="spam">Spam 5 messages</button>
        <button type="button" class="btn ghost sm" data-act="reset">Reset</button>
      </div>
    </div>`);

  const chatA = el.querySelector('[data-chat="a"]');
  const chatB = el.querySelector('[data-chat="b"]');
  const checks = el.querySelector('.st-checks');
  const form = el.querySelector('.st-compose');
  const input = form.querySelector('input');
  const sendBtn = form.querySelector('button');
  const badge = el.querySelector('.st-badge');
  const bar = el.querySelector('.st-bar i');
  const quota = el.querySelector('.st-quota');
  const wire = el.querySelector('.st-wire');

  const st = { count: 0, epoch: performance.now(), slashed: false, busy: false };

  const bubble = (chat, text, side, sender) => {
    const b = h('<div class="st-msg ' + side + '">' + (sender ? '<span class="st-msg-from">' + esc(sender) + '</span>' : '')
      + '<span class="st-msg-text"></span><span class="st-msg-status"></span></div>');
    b.querySelector('.st-msg-text').textContent = text;
    chat.appendChild(b);
    while (chat.children.length > 4) chat.firstElementChild.remove();
    return b;
  };
  const status = (b, text) => { b.querySelector('.st-msg-status').textContent = text; };
  const showQuota = () => {
    quota.textContent = st.count + ' / ' + QUOTA + ' this epoch';
    quota.classList.toggle('over', st.count > QUOTA);
  };
  const setBusy = (v) => {
    st.busy = v;
    sendBtn.disabled = v || st.slashed;
    el.querySelector('[data-act="spam"]').disabled = v || st.slashed;
  };

  async function send(text, fast, tok) {
    const b = bubble(chatA, text, 'out');
    pulse('echoit');
    status(b, 'handing over…');
    if (!fast) log('EchoIt hands "' + text + '" to Dicsussion.');
    await wait(fast ? 120 : 500, tok);

    pulse('dicsussion');
    status(b, 'sealing · AES-256-GCM');
    if (!fast) log('Dicsussion seals it end to end with the session key (X25519, then AES-256-GCM).');
    await wait(fast ? 120 : 600, tok);

    status(b, 'proving · Groth16');
    if (!fast) log('It attaches a zero-knowledge rate-limit proof (ZK-RLN). A real proof takes about a second.');
    await wait(fast ? 200 : 1000, tok);

    st.count += 1;
    const over = st.count > QUOTA;
    showQuota();
    status(b, 'sent');
    await packet(wire, true, fast ? 380 : 750, tok, over ? 'bad' : '');

    if (!over) {
      checks.innerHTML = '<span class="ok">✓ valid member</span><span class="ok">✓ within quota</span><span class="ok">✓ sender stays anonymous</span>';
      bubble(chatB, text, 'in', 'a member');
      status(b, 'delivered');
      if (!fast) log('Bob checks the proof: a valid member, within quota, without learning which member sent it.', 'ok');
      return;
    }

    checks.innerHTML = '<span class="bad">✗ two signals in one epoch slot</span>';
    status(b, 'rejected');
    log('Over quota: Bob now holds two signals from the same member in one epoch, and their Shamir shares reconstruct the sender’s secret.', 'err');
    await wait(700, tok);
    st.slashed = true;
    badge.hidden = false;
    input.disabled = true;
    const sys = h('<div class="st-msg sys">Sender slashed · revocation tombstone gossiped</div>');
    chatB.appendChild(sys);
    log('Alice’s identity is slashed and a revocation tombstone spreads to her peers. No moderator was involved.', 'err');
    throw new Cancelled();                          // stops a spam run here
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (st.busy || st.slashed) return;
    const text = input.value.trim() || '…';
    setBusy(true);
    script(async (tok) => { try { await send(text, false, tok); } finally { if (tok === token) setBusy(false); } });
  });

  el.querySelector('[data-act="spam"]').addEventListener('click', () => {
    if (st.busy || st.slashed) return;
    setBusy(true);
    log('Spamming: a misbehaving client sends five messages in a row.', 'warn');
    script(async (tok) => {
      try {
        for (let i = 1; i <= 5; i++) await send('spam #' + i, true, tok);
      } finally {
        if (tok === token) setBusy(false);
      }
    });
  });

  el.querySelector('[data-act="reset"]').addEventListener('click', () => {
    token++;
    stop();
    clearLog();
    mount('message');
  });

  /* the epoch clock: quota resets every 10 s */
  const timer = setInterval(() => {
    const now = performance.now();
    let f = (now - st.epoch) / EPOCH_MS;
    if (f >= 1) {
      st.epoch = now;
      f = 0;
      if (st.count && !st.slashed) log('New epoch: the quota resets.', 'muted');
      if (!st.slashed) st.count = 0;
      showQuota();
    }
    bar.style.width = (f * 100).toFixed(1) + '%';
  }, 100);
  function stop() { clearInterval(timer); }

  showQuota();
  log('Type a message and press Send. Each member may send ' + QUOTA + ' per 10-second epoch here; try Spam to go over.', 'muted');
  return { el, stop, layers: ['echoit', 'dicsussion'] };
}

/* ==========================================================================
   2. offline sync — EchoIt + Corroborate. A real (tiny) CRDT: an add-only
      list ordered by Lamport time, and a last-writer-wins title.
   ========================================================================== */

const ITEMS = ['Book train tickets', 'Pack chargers', 'Find a hostel', 'Download offline maps',
  'Split the budget', 'Pick a café', 'Buy snacks', 'Check the weather', 'Charge the camera', 'Print tickets'];
const TITLES = ['Trip plan', 'Goa trip', 'Weekend plan', 'Road trip', 'Monsoon getaway'];

class Replica {
  constructor(actor) {
    this.actor = actor;
    this.clock = 0;
    this.seen = new Set();
    this.items = [];
    this.title = { v: 'Trip plan', c: 0, a: '' };
  }
  local(op) {
    op.c = ++this.clock;
    op.a = this.actor;
    op.id = this.actor + ':' + op.c;
    this.apply(op);
    return op;
  }
  apply(op) {
    if (this.seen.has(op.id)) return false;         // idempotent: replays are harmless
    this.seen.add(op.id);
    this.clock = Math.max(this.clock, op.c);
    if (op.type === 'add') this.items.push(op);
    else if (op.c > this.title.c || (op.c === this.title.c && op.a > this.title.a)) this.title = { v: op.v, c: op.c, a: op.a };
    return true;
  }
  view() {
    const items = this.items.slice().sort((x, y) => x.c - y.c || (x.a < y.a ? -1 : 1)).map((o) => o.text);
    return { title: this.title.v, items };
  }
}

/* a short fingerprint, so you can see two devices hold identical state */
function digest(view) {
  let x = 2166136261;
  const s = JSON.stringify(view);
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return (x >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function mountSync() {
  const el = h(`
    <div class="st-scene">
      <p class="st-context">Alice and Bob share a list. Corroborate is still being built; this shows the CRDT behaviour it is being built for.</p>
      <div class="st-duo">
        ${['a', 'b'].map((w) => `
        <div class="st-phone" data-dev="${w}">
          <div class="st-phone-top"><strong>${w === 'a' ? 'Alice' : 'Bob'}</strong><span class="st-badge" data-net></span></div>
          <div class="st-doc"><h5 data-title></h5><ol data-items></ol></div>
          <div class="st-phone-actions">
            <button type="button" class="btn ghost sm" data-add>Add item</button>
            <button type="button" class="btn ghost sm" data-rename>Rename</button>
          </div>
          <p class="st-digest" data-digest></p>
        </div>`).join(wireHtml('sync'))}
      </div>
      <div class="st-buttons">
        <button type="button" class="btn primary sm" data-act="link">Take Bob offline</button>
        <button type="button" class="btn ghost sm" data-act="reset">Reset</button>
      </div>
    </div>`);

  const wire = el.querySelector('.st-wire');
  const linkBtn = el.querySelector('[data-act="link"]');
  const dev = {
    a: { r: new Replica('alice'), out: [], next: 0, t: 1, el: el.querySelector('[data-dev="a"]') },
    b: { r: new Replica('bob'), out: [], next: 5, t: 3, el: el.querySelector('[data-dev="b"]') },
  };
  let online = true;
  let renamedOffline = { a: false, b: false };

  function render() {
    const va = dev.a.r.view(), vb = dev.b.r.view();
    const same = digest(va) === digest(vb);
    for (const k of ['a', 'b']) {
      const d = dev[k], v = k === 'a' ? va : vb;
      d.el.querySelector('[data-title]').textContent = v.title;
      d.el.querySelector('[data-items]').innerHTML = v.items.map((t) => '<li>' + esc(t) + '</li>').join('') || '<li class="st-muted">(empty)</li>';
      const net = d.el.querySelector('[data-net]');
      const off = k === 'b' && !online;
      net.textContent = off ? 'offline' : 'online';
      net.className = 'st-badge ' + (off ? 'warn' : 'ok');
      const dg = d.el.querySelector('[data-digest]');
      dg.innerHTML = 'state <code>' + digest(v) + '</code> · '
        + (d.out.length ? '<span class="warn">' + d.out.length + ' pending</span>' : same ? '<span class="ok">in sync</span>' : '<span class="warn">diverged</span>');
    }
  }

  async function edit(k, kind, tok) {
    const d = dev[k];
    const op = kind === 'add'
      ? d.r.local({ type: 'add', text: ITEMS[d.next++ % ITEMS.length] })
      : d.r.local({ type: 'title', v: TITLES[d.t++ % TITLES.length] });
    pulse('echoit');
    const who = k === 'a' ? 'Alice' : 'Bob';
    if (!online) {
      d.out.push(op);
      if (kind === 'title') renamedOffline[k] = true;
      log(who + (kind === 'add' ? ' adds "' + op.text + '"' : ' renames the list to "' + op.v + '"') + ' while the two are apart. It is saved on the device and queued.', 'muted');
      render();
      return;
    }
    render();
    pulse('corroborate');
    await packet(wire, k === 'a', 600, tok);
    dev[k === 'a' ? 'b' : 'a'].r.apply(op);
    log(who + '’s change reaches the other device and is merged.', 'ok');
    render();
  }

  async function reconnect(tok) {
    linkBtn.disabled = true;
    const na = dev.a.out.length, nb = dev.b.out.length;
    log('Bob reconnects. The devices swap what the other is missing: ' + na + ' change' + (na === 1 ? '' : 's') + ' from Alice, ' + nb + ' from Bob.');
    pulse('corroborate');
    if (na) { await packet(wire, true, 650, tok); for (const op of dev.a.out) dev.b.r.apply(op); }
    if (nb) { await packet(wire, false, 650, tok); for (const op of dev.b.out) dev.a.r.apply(op); }
    dev.a.out = []; dev.b.out = [];
    render();
    if (renamedOffline.a && renamedOffline.b) {
      log('Both renamed the list offline. Each rename carries a Lamport timestamp, and the later one (ties broken by device) wins on both devices: "' + dev.a.r.view().title + '". No conflict dialog.', 'ok');
    }
    log('Both devices now hold identical state (same fingerprint), whatever order the changes arrived in.', 'ok');
    renamedOffline = { a: false, b: false };
    linkBtn.disabled = false;
  }

  for (const k of ['a', 'b']) {
    dev[k].el.querySelector('[data-add]').addEventListener('click', () => script((tok) => edit(k, 'add', tok)));
    dev[k].el.querySelector('[data-rename]').addEventListener('click', () => script((tok) => edit(k, 'title', tok)));
  }

  linkBtn.addEventListener('click', () => {
    if (online) {
      online = false;
      linkBtn.textContent = 'Bring Bob online';
      log('Bob goes offline. Both phones keep working on their own copy.', 'warn');
      render();
    } else {
      online = true;
      linkBtn.textContent = 'Take Bob offline';
      script(reconnect);
    }
  });

  el.querySelector('[data-act="reset"]').addEventListener('click', () => {
    token++;
    clearLog();
    mount('sync');
  });

  /* a little shared history to start from */
  for (const text of ['Book train tickets', 'Pack chargers']) {
    const op = dev.a.r.local({ type: 'add', text });
    dev.b.r.apply(op);
  }
  dev.a.next = 2;
  render();
  log('Add items on either phone; they sync straight away. Then take Bob offline, edit both, and bring him back.', 'muted');
  return { el, stop() {}, layers: ['echoit', 'corroborate'] };
}

/* ==========================================================================
   3. file transfer — EchoIt + Chorrent. 32 pieces of 64 KiB from three
      peers: strictly in order inside the urgent window ahead of the
      playhead, rarest-first beyond it, every piece hash-checked.
   ========================================================================== */

const PIECES = 32, WINDOW = 4, SLOTS = 2;

function mountFile() {
  /* who has what: each peer is missing some pieces, and a few pieces live
     on one peer only — those are the rare ones rarest-first goes after */
  const ONLY = { 5: 'P1', 26: 'P1', 11: 'P2', 19: 'P3', 30: 'P3' };
  const PEERS = [
    { id: 'P1', color: '#6fd6b4', speed: 1.25, test: (i) => (ONLY[i] ? ONLY[i] === 'P1' : i % 5 !== 2) },
    { id: 'P2', color: '#89b4fa', speed: 0.8, test: (i) => (ONLY[i] ? ONLY[i] === 'P2' : i % 3 !== 0) },
    { id: 'P3', color: '#e0b279', speed: 1.0, test: (i) => (ONLY[i] ? ONLY[i] === 'P3' : i % 4 !== 1) },
  ];

  const el = h(`
    <div class="st-scene">
      <p class="st-context">Bob sends Alice a 2 MiB video. Chorrent splits it into 32 pieces of 64 KiB, and three peers already have parts of it.</p>
      <div class="st-buttons top">
        <button type="button" class="btn primary sm" data-act="start">Start download</button>
        <button type="button" class="btn ghost sm" data-act="corrupt">Corrupt the next piece</button>
      </div>
      <div class="st-peers">
        ${PEERS.map((p) => `<span class="st-peer" data-peer="${p.id}"><i style="background:${p.color}"></i>${p.id}
          <button type="button" class="st-drop" data-drop="${p.id}" aria-label="Drop peer ${p.id}">drop</button></span>`).join('')}
      </div>
      <div class="st-grid" role="img" aria-label="Pieces of the file"></div>
      <div class="st-meter">
        <span>Playback</span><span class="st-bar play"><i></i></span><span class="st-quota" data-play></span>
      </div>
      <p class="st-legend">
        <span><b class="lg urgent"></b>urgent window: fetched in order</span>
        <span><b class="lg rare">1</b>beyond it: rarest first (number = peers that have it)</span>
      </p>
    </div>`);

  const grid = el.querySelector('.st-grid');
  const cells = [];
  for (let i = 0; i < PIECES; i++) {
    const c = document.createElement('span');
    c.className = 'st-cell';
    grid.appendChild(c);
    cells.push(c);
  }
  const playBar = el.querySelector('.st-bar.play i');
  const playLabel = el.querySelector('[data-play]');
  const startBtn = el.querySelector('[data-act="start"]');

  let peers, pieces, playhead, nextPlay, running, corruptNext, timer, saidRare, finished;

  function reset() {
    peers = PEERS.map((p) => ({ ...p, alive: true, busy: 0, has: new Set() }));
    for (let i = 0; i < PIECES; i++) {
      let any = false;
      for (const p of peers) if (p.test(i)) { p.has.add(i); any = true; }
      if (!any) peers[2].has.add(i);              // every piece starts with a seeder
    }
    pieces = Array.from({ length: PIECES }, () => ({ state: 'missing', peer: null, ends: 0 }));
    playhead = 0;
    nextPlay = 0;
    running = false;
    corruptNext = false;
    saidRare = false;
    finished = false;
    el.querySelectorAll('.st-drop').forEach((b) => { b.disabled = false; });
    el.querySelectorAll('.st-peer').forEach((s) => s.classList.remove('gone'));
    render();
  }

  const rarity = (i) => peers.reduce((n, p) => n + (p.alive && p.has.has(i) ? 1 : 0), 0);

  function choose(p) {
    const want = (i) => pieces[i].state === 'missing' && p.has.has(i);
    for (let i = playhead; i < Math.min(PIECES, playhead + WINDOW); i++) if (want(i)) return i;
    let best = -1, bestR = 99;
    for (let i = playhead + WINDOW; i < PIECES; i++) {
      if (!want(i)) continue;
      const r = rarity(i);
      if (r < bestR) { best = i; bestR = r; }
    }
    if (best >= 0 && bestR === 1 && !saidRare) {
      saidRare = true;
      log('Piece ' + best + ' is only on ' + p.id + ', so it is fetched early, before that peer can leave.');
    }
    return best;
  }

  function render() {
    for (let i = 0; i < PIECES; i++) {
      const pc = pieces[i], c = cells[i];
      const r = rarity(i);
      c.className = 'st-cell ' + pc.state
        + (i >= playhead && i < playhead + WINDOW && pc.state !== 'done' ? ' urgent' : '')
        + (i === playhead ? ' head' : '')
        + (pc.state === 'missing' && r === 0 ? ' lost' : '');
      c.style.setProperty('--peer', pc.peer ? pc.peer.color : 'transparent');
      c.textContent = pc.state === 'missing' ? (r === 0 ? '×' : r) : '';
    }
    playBar.style.width = (playhead / PIECES * 100) + '%';
    playLabel.textContent = finished ? 'done' : !running ? 'idle'
      : pieces[playhead] && pieces[playhead].state === 'done' ? 'playing' : 'buffering…';
  }

  function tick() {
    if (!running) return;
    const now = performance.now();
    for (let i = 0; i < PIECES; i++) {
      const pc = pieces[i];
      if (pc.state !== 'inflight' || pc.ends > now) continue;
      pc.peer.busy--;
      if (corruptNext) {
        corruptNext = false;
        pc.state = 'bad';
        log('Piece ' + i + ' from ' + pc.peer.id + ' failed its BLAKE3 check against the file’s root hash. It is thrown away and requested again.', 'err');
        setTimeout(() => { if (pc.state === 'bad') { pc.state = 'missing'; pc.peer = null; } }, 700 * PACE);
      } else {
        pc.state = 'done';
      }
    }
    for (const p of peers) {
      while (p.alive && p.busy < SLOTS) {
        const i = choose(p);
        if (i < 0) break;
        pieces[i] = { state: 'inflight', peer: p, ends: now + (380 + Math.random() * 260) / p.speed };
        p.busy++;
      }
    }
    if (playhead < PIECES && pieces[playhead].state === 'done' && now >= nextPlay) {
      playhead++;
      nextPlay = now + 240;
    }
    if (playhead === PIECES && !finished) {
      finished = true;
      running = false;
      log('All 32 pieces arrived and verified against the root hash. Playback finished without a corrupt byte.', 'ok');
      startBtn.textContent = 'Run it again';
    }
    render();
  }

  function drop(id) {
    const p = peers.find((x) => x.id === id);
    if (!p || !p.alive) return;
    p.alive = false;
    for (const pc of pieces) if (pc.state === 'inflight' && pc.peer === p) { pc.state = 'missing'; pc.peer = null; }
    p.busy = 0;
    el.querySelector('[data-peer="' + id + '"]').classList.add('gone');
    el.querySelector('[data-drop="' + id + '"]').disabled = true;
    log(id + ' leaves the swarm. Its unfinished pieces go back in the queue for the other peers.', 'warn');
    const lost = pieces.map((pc, i) => (pc.state === 'missing' && rarity(i) === 0 ? i : -1)).filter((i) => i >= 0);
    if (lost.length) log('No peer left has piece' + (lost.length > 1 ? 's ' : ' ') + lost.join(', ') + '. The download can’t finish until someone who has ' + (lost.length > 1 ? 'them' : 'it') + ' joins.', 'err');
    render();
  }

  startBtn.addEventListener('click', () => {
    if (running) return;
    if (finished || playhead > 0) reset();
    running = true;
    startBtn.textContent = 'Downloading…';
    pulse('echoit');
    pulse('chorrent');
    log('Alice asks three peers for the 32 pieces: the ones just ahead of the playhead first and in order, the rest rarest-first.');
    render();
  });
  el.querySelector('[data-act="corrupt"]').addEventListener('click', () => {
    corruptNext = true;
    log('The next piece to arrive will be tampered with in transit.', 'warn');
  });
  el.querySelectorAll('[data-drop]').forEach((b) => b.addEventListener('click', () => drop(b.dataset.drop)));

  reset();
  timer = setInterval(tick, 50);
  log('Press Start. While it runs, try corrupting a piece or dropping a peer.', 'muted');
  return { el, stop() { clearInterval(timer); }, layers: ['echoit', 'chorrent'] };
}

/* ==========================================================================
   the overlay: layers on one side, the scenario on the other
   ========================================================================== */

const SCENES = {
  message: { label: 'Send a message', mount: mountMessage,
    blurb: 'A message goes from Alice’s app through Dicsussion, which seals it and proves the sender is within their rate limit, then straight to Bob over QUIC.' },
  sync: { label: 'Go offline', mount: mountSync,
    blurb: 'Both phones keep editing while apart. When they reconnect, Corroborate merges the changes so both end up identical, with no conflicts to resolve.' },
  file: { label: 'Send a file', mount: mountFile,
    blurb: 'Chorrent pulls a file’s pieces from several peers at once and checks every piece against the file’s hash as it arrives.' },
};

function mount(name) {
  if (mounted) mounted.stop();
  active = name;
  root.querySelectorAll('.st-tab').forEach((t) => {
    const on = t.dataset.scene === name;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  blurbEl.textContent = SCENES[name].blurb;
  mounted = SCENES[name].mount();
  stage.replaceChildren(mounted.el);
  light(mounted.layers);
}

function showLayer(slug) {
  const p = PROJECTS.find((x) => x.slug === slug);
  const box = root.querySelector('.st-detail');
  const same = !box.hidden && box.dataset.slug === slug;
  root.querySelectorAll('.st-layer').forEach((b) => b.setAttribute('aria-expanded', !same && b.dataset.layer === slug ? 'true' : 'false'));
  if (same) { box.hidden = true; return; }
  const links = Object.entries(p.links).map(([k, url]) =>
    '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc({ repo: 'Source', live: 'Live', releases: 'Download', ceremony: 'Ceremony record', npm: 'npm package' }[k] || k) + '</a>');
  if (p.sourcePrivate) links.push('<span class="st-muted">Source private for now</span>');
  box.dataset.slug = slug;
  box.innerHTML = '<h4>' + esc(p.title) + (p.status ? ' <span class="qv-status">' + esc(p.status) + '</span>' : '') + '</h4>'
    + '<ul>' + p.body.slice(0, 3).map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>'
    + '<p class="qv-links">' + links.join('') + '</p>';
  box.hidden = false;
}

export function renderStack(el) {
  root = el;
  el.innerHTML = ''
    + '<div class="qv-bar">'
    +   '<span class="qv-kicker">devroom · the stack</span>'
    +   '<span class="qv-bar-actions">'
    +     '<button type="button" class="btn ghost qv-enter" data-enter-room>'
    +       '<span class="when-intro">Enter the 3D room</span><span class="when-room">Back to the room</span></button>'
    +     '<button type="button" class="btn ghost" data-close aria-label="Close the stack">Close</button>'
    +   '</span>'
    + '</div>'
    + '<header class="st-head">'
    +   '<h2 id="stTitle">How the four fit together</h2>'
    +   '<p class="qv-intro">' + esc(STACK_INTRO) + '</p>'
    +   '<p class="st-model">A scripted model running in your browser, to show how the pieces fit. It is not the real protocol.</p>'
    + '</header>'
    + '<div class="st-layout">'
    +   '<div class="st-side">'
    +     '<ol class="st-layers">' + PROJECTS.map((p) =>
            '<li><button type="button" class="st-layer" data-layer="' + p.slug + '" aria-expanded="false">'
            + '<span class="st-layer-tag">' + esc(p.layer) + '</span>'
            + '<span class="st-layer-name">' + esc(p.title) + (p.status ? ' <em>' + esc(p.status) + '</em>' : '') + '</span>'
            + '</button></li>').join('') + '</ol>'
    +     '<div class="st-detail" hidden></div>'
    +   '</div>'
    +   '<section class="st-main">'
    +     '<div class="st-tabs" role="tablist" aria-label="Scenarios">' + Object.entries(SCENES).map(([k, s]) =>
            '<button type="button" class="st-tab" role="tab" data-scene="' + k + '" aria-selected="false">' + esc(s.label) + '</button>').join('') + '</div>'
    +     '<p class="st-blurb"></p>'
    +     '<div class="st-stage"></div>'
    +     '<h3 class="st-log-title">What just happened</h3>'
    +     '<ol class="st-log" aria-live="polite"></ol>'
    +   '</section>'
    + '</div>';

  stage = el.querySelector('.st-stage');
  logEl = el.querySelector('.st-log');
  blurbEl = el.querySelector('.st-blurb');

  el.querySelectorAll('.st-tab').forEach((t) => t.addEventListener('click', () => {
    if (t.dataset.scene === active && mounted) return;
    token++;
    clearLog();
    mount(t.dataset.scene);
  }));
  el.querySelector('.st-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const names = Object.keys(SCENES);
    const next = names[(names.indexOf(active) + (e.key === 'ArrowRight' ? 1 : names.length - 1)) % names.length];
    el.querySelector('.st-tab[data-scene="' + next + '"]').click();
    el.querySelector('.st-tab[data-scene="' + next + '"]').focus();
  });
  el.querySelectorAll('.st-layer').forEach((b) => b.addEventListener('click', () => showLayer(b.dataset.layer)));
}

/* the overlay opened: start the current scenario fresh */
export function startStack() {
  token++;
  clearLog();
  mount(active);
}

/* closed: stop timers and any running script */
export function stopStack() {
  token++;
  if (mounted) mounted.stop();
  mounted = null;
}
