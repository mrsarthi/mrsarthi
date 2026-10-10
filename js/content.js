/* ==========================================================================
   content — everything the room says about me. Edit this file; the shell,
   the resume download and every link in the room are generated from it.
   ----------------------------------------------------------------------------
   PROJECTS   the four headliners. They are one system, top to bottom:
              EchoIt (app) → Dicsussion (protocol) → Corroborate (state sync)
              → Chorrent (moving the bytes). Listed in that order.
   OTHER_WORK portfolio-only projects (shown in ~/more, not on the resume).
   Links: any key works (repo, live, ceremony, …) — `open <slug> <key>`.
          Leave a link out rather than pointing it somewhere vague.
   ========================================================================== */

export const PROFILE = {
  name:    'Parth Sarthi Mishra',
  handle:  'mrsarthi',
  role:    'Backend engineer, building toward Web3',
  place:   '',                       // optional — shown only when set
  email:   'wforsarthi@gmail.com',
  github:  'https://github.com/mrsarthi',
  linkedin:   'https://www.linkedin.com/in/parth-sarthi-mishra-5587b8210/',
  leetcode:   'https://leetcode.com/u/sarth_parthi/',
  codeforces: 'https://codeforces.com/profile/sarth_parthi',
  site:    'https://mrsarthi.github.io/mrsarthi/',
  resume:  'assets/resume.pdf',      // the PDF visitors download; '' hides every résumé link
  blurb:   'I build systems-level things in Rust, Go and Python — P2P networking, zero-knowledge anti-spam, local-first sync, and the protocols underneath them.',
};

/* the shell, the quick view and the frame on the wall skip it cleanly if
   it's empty */
export const EXPERIENCE = [
  {
    role: 'Backend Intern', org: 'Zooper', from: 'Apr 2026', to: 'May 2026', note: 'on-site',
    points: [
      'Engineered and deployed a high-availability API for real-time driver device-health monitoring and permission tracking.',
      'Built telemetry monitoring and validation workflows, then stress-tested the system to find and fix the causes of data loss and delayed status updates.',
      'Wrote Playwright end-to-end tests, with MSW mocking the API so workflows could be validated without the backend.',
    ],
  },
];

export const SKILLS = [
  ['Languages', 'Rust, C++, Go, Python, Java'],
  ['Systems',   'P2P networking, distributed systems, protocol design, concurrency, WebRTC, TCP/IP fundamentals'],
  ['Tools',     'Git, GitHub, Docker, SQLite, Linux'],
];

export const STACK_INTRO =
  'Four projects, one system: EchoIt is the app, Dicsussion is the protocol under it, ' +
  'Corroborate keeps state in sync, and Chorrent moves the bytes.';

export const PROJECTS = [
  {
    slug: 'echoit',
    title: 'EchoIt',
    layer: 'app',
    year: '2026',
    tagline: 'A local-first, end-to-end encrypted messenger. No account, and no server holding your history.',
    stack: ['Rust', 'Dicsussion Protocol', 'Iroh / QUIC', 'Windows + Android builds'],
    metrics: [
      ['Release',   'v0.6.1 (Oct 2026)'],
      ['Platforms', 'Windows, Android'],
      ['Identity',  'on-device, 12-word recovery phrase'],
    ],
    links: {
      live: 'https://mrsarthi.github.io/EchoIt-Messenger/',
      releases: 'https://github.com/mrsarthi/EchoIt-Messenger/releases/latest',
    },
    sourcePrivate: true,
    body: [
      'Designed as a decentralized messenger with no central source of truth; I wrote its PRD, RFCs, system architecture and protocol requirements.',
      'Identity is created on the device and backed by a twelve-word recovery phrase: no phone number, no email.',
      'Messages travel directly between the two devices, encrypted end to end. No server stores message history.',
      'Adding a contact is mutual: both sides exchange connection tickets before anything can be delivered, and the app says which state you are in.',
      'Signed release builds for Windows and Android, so updates install over the top and keep your messages.',
      'The source is private for now; the download page and release builds are public.',
    ],
  },
  {
    slug: 'dicsussion',
    title: 'Dicsussion Protocol',
    layer: 'protocol',
    year: '2026',
    tagline: 'A headless, local-first, zero-knowledge P2P messaging engine and SDK.',
    stack: ['TypeScript', 'Rust / Iroh', 'Circom + SnarkJS (Groth16)', 'Automerge', 'SQLite / IndexedDB', 'Playwright'],
    metrics: [
      ['Release',       'v0.8.1'],
      ['Tests',         '552 Playwright tests'],
      ['Specs',         '4 protocol RFCs'],
      ['Trusted setup', '6-party ceremony, Bitcoin-beacon close'],
    ],
    links: {
      repo: 'https://github.com/mrsarthi/DicsussionProtocol',
      npm: 'https://npm.io/package/@dicsussion/core',
      ceremony: 'https://github.com/mrsarthi/Ceremonial-Contributions',
    },
    body: [
      'I designed the protocol, its message flow, requirements and boundaries, and wrote the RFCs and specifications EchoIt is built on.',
      'Messages route peer-to-peer over encrypted QUIC streams via Iroh, with mDNS discovery and relay fallback.',
      'Spam is limited by zero-knowledge rate-limiting nullifiers (ZK-RLN): a Groth16 proof shows a sender is within their per-epoch quota without revealing who they are. Double-sending lets any peer reconstruct the secret and slash the identity.',
      'Reputation is local and subjective: each device scores peers from its own interactions, never from a global ledger.',
      'The proving key comes from a six-party trusted-setup ceremony, closed with a Bitcoin block hash committed to before that block was mined.',
      'Known limits are stated up front: the browser WebSocket relay does not yet encrypt CRDT traffic, and there has been no external audit.',
    ],
  },
  {
    slug: 'corroborate',
    title: 'Corroborate',
    layer: 'sync',
    year: '2026',
    status: 'in progress',
    tagline: 'A Rust library that keeps shared state in sync across independent replicas in a P2P network.',
    stack: ['Rust', 'CRDTs', 'Distributed systems'],
    metrics: [
      ['Status', 'in progress'],
      ['Built to survive', 'duplicate, delayed, reordered and dropped messages'],
    ],
    links: {
      repo: 'https://github.com/mrsarthi/Corroborate',
    },
    body: [
      'Maintains shared state across independent replicas, so devices that edit while apart converge when they reconnect: the sync layer for EchoIt.',
      'Designed to tolerate real network conditions: duplicate, delayed, reordered and temporarily unavailable messages.',
      'Tests replay duplicate, delayed and reordered operations to verify that every replica still converges.',
    ],
  },
  {
    slug: 'chorrent',
    title: 'Chorrent',
    layer: 'transfer',
    year: '2026',
    tagline: 'A decentralized P2P file-distribution engine, written in Rust from the ground up.',
    stack: ['Rust', 'Tokio', 'Iroh / QUIC', 'BLAKE3 (bao-tree)', 'iroh-gossip'],
    metrics: [
      ['Release',   'v0.5.2'],
      ['Verified real-world test', '900+ km, cross-NAT'],
      ['Scheduler', 'urgent window, rarest-first, endgame'],
      ['Transfer',  'concurrent multi-peer swarm'],
    ],
    links: {
      repo: 'https://github.com/mrsarthi/Chorrent',
    },
    body: [
      'Iroh over QUIC handles NAT traversal (hole-punch, falling back to relay), so peers behind CGNAT can still connect.',
      'Files are split into 64 KiB pieces and hashed into a BLAKE3 Merkle tree, so every piece is verified against the root hash as it arrives.',
      'Peer discovery runs over iroh-gossip; peers exchange bitfields directly over the connection.',
      'A hybrid scheduler stays strictly in-order inside a sliding "urgent window" near the playhead and falls back to rarest-first beyond it, a deliberate departure from plain BitTorrent scheduling.',
      'In endgame, once every missing piece is already requested, idle peers request in-flight pieces too, so one slow peer can’t stall the finish.',
      'Validated end-to-end on two real devices, 900+ km apart, on different networks: concurrent workers per peer connection, verified byte-for-byte.',
    ],
  },
];

export const OTHER_WORK = [
  {
    slug: 'mbmr',
    title: 'MBMR',
    year: '2025–26',
    tagline: 'Mood-Based Movie Recommender: a Letterboxd companion that learns your taste and finds films by mood. It plays on the TV in this room.',
    stack: ['Python', 'Random Forest taste model', 'TMDB API', 'Letterboxd data'],
    metrics: [],
    links: {
      repo: 'https://github.com/mrsarthi/MBM_recommender',
      live: 'https://mbm-recommender-nine.vercel.app/',
    },
    body: [
      'A Random Forest taste model is trained in memory on your Letterboxd diary and scores every candidate film.',
      'A rule-based parser turns a prompt like "gritty 90s cyber thriller" into genres, keywords and year, runtime or rating constraints.',
      'Candidates come from TMDB, anything already in your diary is removed, and the rest are ranked by predicted liking.',
      '"Pick for me tonight" takes your time, mood and streaming service and picks one film from your watchlist.',
      'Installs as a phone app (PWA); your profile and keys stay in your browser.',
    ],
    /* real screenshots of the app: shown on the TV and in its gallery.
       Put the files in assets/mbmr/ — 16:9 looks best on the TV. */
    screens: [
      { src: 'assets/mbmr/recommendations.webp', caption: 'AI recommendations: "pre-2000s horror movies", ranked by match' },
      { src: 'assets/mbmr/watchlist.webp', caption: 'Watchlist: 669 films ranked by predicted rating, sorted into moods' },
      { src: 'assets/mbmr/journal.webp', caption: 'Film journal: 525 films synced from Letterboxd' },
      { src: 'assets/mbmr/trivia.webp', caption: 'The lounge: movie trivia between picks' },
    ],
  },
  {
    slug: 'macco',
    title: 'MACCO',
    year: '2026',
    tagline: 'Multi-agent code comprehension: ask about a codebase, and every claim must cite a real line of code.',
    stack: ['Python', 'Claude Code CLI', 'Antigravity CLI'],
    metrics: [
      ['Solo run', '~40 s, ~$0.26 on a small repo'],
    ],
    links: {
      repo: 'https://github.com/mrsarthi/MACCO',
    },
    body: [
      'An investigator agent answers, a challenger agent from a different toolchain gives a second opinion, and disagreements are surfaced.',
      'A deterministic citation gate resolves every file, symbol and line against the real repository; claims that do not resolve are rejected.',
      'Fails closed: every error path reduces what MACCO claims to know. Agents run in plan mode, so it cannot edit your code.',
    ],
  },
  {
    slug: 'gideon',
    title: 'G.I.D.E.O.N',
    year: '2024–26',
    tagline: 'A privacy-first, local-first AI assistant with a 3D holographic interface.',
    stack: ['Python', 'FastAPI', 'Ollama', 'ChromaDB', 'SQLite', 'three.js', 'Telegram bot'],
    metrics: [],
    links: {
      repo: 'https://github.com/mrsarthi/G.I.D.E.O.N',
    },
    body: [
      'A local LLM via Ollama, long-term memory in ChromaDB, and a tool registry for reminders, news, finance and desktop control.',
      'Prompt assembly keeps the leading tokens byte-stable so Ollama can reuse its cached prefill between turns.',
      'Tools are only offered when a message has operational intent, because small models otherwise fire tools during small talk.',
      'Streams sentence-by-sentence speech to a three.js hologram, and reaches you on Telegram for reminders.',
    ],
  },
  {
    slug: 'codefit',
    title: 'CodeFit (contributions)',
    year: '2026',
    tagline: 'Multiple merged pull requests to an open-source interview platform.',
    stack: ['TypeScript', 'Judge0', 'WebSockets', 'JWT'],
    metrics: [
      ['Merged PRs', '6'],
    ],
    links: {
      repo: 'https://github.com/wforShubham/CodeFit',
      prs: 'https://github.com/wforShubham/CodeFit/pulls?q=is%3Apr+author%3Amrsarthi',
    },
    body: [
      'Added Judge0 code execution to the backend and connected it to the WebSocket system, so interview participants get code results in real time.',
      'Worked on login, email verification, interviews and notifications, including a fix for JWT refresh-token persistence.',
      'Reported and helped track bugs in the camera controls and the programming-language selector through GitHub issues.',
    ],
  },
];

/* The TV: a small demo of MBMR. These picks are hand-written sample data,
   not model output; the TV labels them as a demo. */
export const TV_DEMO = {
  picks: [
    { title: 'Perfect Blue',         year: 1997, score: 0.94, why: 'the edit is the antagonist' },
    { title: 'Columbus',             year: 2017, score: 0.91, why: 'architecture as dialogue' },
    { title: 'Sorcerer',             year: 1977, score: 0.89, why: 'mud, rope and dread' },
    { title: 'In the Mood for Love', year: 2000, score: 0.87, why: 'nothing happens, perfectly' },
    { title: 'The Long Goodbye',     year: 1973, score: 0.85, why: 'a cat with opinions' },
  ],
  moods: ['slow-burn', 'heist', 'one-room', 'needle-drop', 'neo-noir'],
};
