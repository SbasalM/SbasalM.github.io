/*
 * Signal Chain — a ten-year career as a runner game.
 * Triggered from the portfolio (Konami code, or 5 taps on the wordmark dot).
 *
 * Swapping art: every image lives in assets/game/sprites/. Replace a PNG with one that keeps the
 * same frame size / layout (see ART below and assets/game/README.md) and it just works. If an image
 * is missing or fails to load, the game falls back to simple shapes, so it never breaks.
 */
(() => {
    if (window.SignalChain) return;
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
    }

    const SCRIPT = document.currentScript;
    const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'assets/game/';
    const RESUME_URL = 'sebastian-basaldua-resume.pdf';
    const EMAIL = 'sbasalmedia@gmail.com';

    const W = 800, H = 450, GROUND = 382, PX = 150;
    const COL = { teal: '#7fd8dd', acc: '#0e7a80', red: '#e5484d', amb: '#f5a623', paper: '#f6f4ef', ink: '#0f1214' };
    const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const DISPLAY = '"Space Grotesk", system-ui, sans-serif';

    // ---------------- ART MANIFEST ----------------
    // fw/fh = frame size in pixels on the sheet. Frames run left→right; rows top→bottom.
    const ART = {
        player: { src: 'sprites/player.png', fw: 14, fh: 20 },          // 4 frames: run A, stride, run B, jump
        bosses: { src: 'sprites/bosses.png', fw: 48, fh: 48 },          // 2 frames (idle, blink) × 4 rows (one per boss)
        token:  { src: 'sprites/token.png',  fw: 12, fh: 12 },          // 1 frame: skill token
        crate:  { src: 'sprites/crate.png',  fw: 16, fh: 16 },          // 1 frame: "manual work" obstacle
        gear:   { src: 'sprites/gear.png',   fw: 16, fh: 16 },          // 4 frames: headphones, adapter, trophy, Airchain
        // Optional painted backgrounds (any size, drawn as a looping parallax layer above the ground line).
        // Set src to e.g. 'sprites/bg-guam.png' once the file exists; null uses the built-in scenery.
        bg_guam: { src: null }, bg_wuxi: { src: null }, bg_greenville: { src: null }, bg_mpls: { src: null },
    };

    // ---------------- CONTENT ----------------
    const REGIONS = [
        {
            key: 'guam', place: 'GUAM', years: '2016 – 2021', job: 'Radio Production Assistant', org: 'Harvest Family Radio',
            sky: ['#0b3a52', '#3aa6b8'],
            skills: ['Audio editing', 'Adobe Audition', 'Broadcast production', 'Smart playlists', 'FCC compliance', 'Excel reporting'],
            junk: ['PAPER LOG', 'TAPE STACK', 'MANUAL PLAYLIST'],
            boss: { name: 'The Compliance Binder', item: 'LOG', tool: 'Excel reporting system', toolDesc: 'Search the logs, build the report, file it right, every time.', cost: 110 },
            resume: ['Recorded, edited, and produced daily broadcast audio: sermons, weather, and commentary.', 'Ran and mastered the station\'s smart-playlist automation.', 'Built FCC & SoundExchange compliance reporting from scratch in Excel.'],
            reward: { gear: 0, name: 'Studio Headphones', desc: '+1 life for the rest of the run' },
        },
        {
            key: 'wuxi', place: 'WUXI, CHINA', years: '2021 – 2022', job: 'IT Support Engineer', org: 'International School of Wuxi',
            sky: ['#241c33', '#7a5a78'],
            skills: ['Cross-cultural work', 'Remote work (COVID)', 'Timezone juggling', 'Leadership', 'IT decision-making', 'CompTIA A+'],
            junk: ['3 AM CALL', 'LAG', 'TICKET PILE'],
            boss: { name: 'The Timezone Beast', item: 'TICKET', tool: 'Remote support playbook', toolDesc: 'Standard fixes, clear hand-offs, and upgrades planned with leadership, across any time zone.', cost: 130 },
            resume: ['Supported faculty and staff with computers, devices, and classroom tech.', 'Made IT decisions and coordinated system upgrades with leadership.', 'Worked across cultures, time zones, and remote setups through COVID.'],
            reward: { gear: 1, name: 'Universal Adapter', desc: 'Skill tokens get pulled toward you' },
        },
        {
            key: 'greenville', place: 'GREENVILLE, SC', years: '2022 – 2024', job: 'Lead Motion Graphics → Studio Tech Manager', org: 'BJU Press',
            sky: ['#2a2517', '#8a7440'],
            skills: ['Blender 3D', 'After Effects', 'Motion graphics', 'Team lead', 'NAS archiving', 'Studio design'],
            junk: ['RENDER QUEUE', 'CABLE MESS', 'DEADLINE'],
            boss: { name: 'The Studio Teardown', item: 'SPEC', tool: 'Renovation spec + NAS archive', toolDesc: 'Write the specs, plan the rollout, and archive everything so nothing gets redone.', cost: 150 },
            resume: ['Promoted to Lead within months and named Rookie of the Year.', 'Wrote the specs for a full studio renovation and oversaw the rollout.', 'Maintained NAS infrastructure and set up the team\'s archiving protocols.'],
            reward: { gear: 2, name: 'Rookie of the Year Trophy', desc: 'A shield that blocks one hit each stage' },
        },
        {
            key: 'mpls', place: 'MINNEAPOLIS', years: '2024 – now', job: 'Operations Manager', org: 'WCTS Radio',
            sky: ['#0d1626', '#2d4468'],
            skills: ['Broadcast ops', 'FTP automation', 'Claude Code', 'Web builds', 'DaVinci Resolve', 'Alexa streaming'],
            junk: ['WAV ×50', 'RENAME', 'EXPORT'],
            boss: { name: 'The 50-Promo Monster', item: 'PROMO', tool: 'Airchain', toolDesc: 'Watches for promos, mixes in the tag, and drops each one in right when it airs.', cost: 170 },
            resume: ['Built Airchain: automated show ingest, processing, and scheduled delivery.', 'Rebuilt wctsradio.org and brought the WCTS Praise stream to Alexa.', 'Launched 8 websites for churches, a school, missionaries, and local businesses.'],
            reward: { gear: 3, name: 'Airchain', desc: '' },
        },
    ];
    const TOTAL_SKILLS = REGIONS.reduce((n, r) => n + r.skills.length, 0);
    const REGION_LEN = 7000;       // px of running per stage
    const LANE_TIME = 15;          // seconds of boss lanes
    const MANUAL_TAPS = 24;        // presses to finish a boss by hand
    const LANES = 4, LW = 96, LX0 = (W - LANES * LW) / 2, LTOP = 172, AIR = 404;
    const LANE_KEYS = [['d', '1'], ['f', '2'], ['j', '3'], ['k', '4']];

    // ---------------- ASSETS ----------------
    const img = {};
    function loadArt() {
        for (const [k, a] of Object.entries(ART)) {
            if (!a.src) continue;
            const i = new Image();
            i.onload = () => { img[k] = i; };
            i.src = BASE + a.src;
        }
    }
    // Draws frame (fx, fy) of a sheet with its bottom-centre at (x, y). Returns false if the art isn't available.
    function sprite(key, fx, fy, x, y, scale, w, h) {
        const a = ART[key], im = img[key];
        if (!im) return false;
        const dw = w || a.fw * scale, dh = h || a.fh * scale;
        ctx.drawImage(im, fx * a.fw, fy * a.fh, a.fw, a.fh, Math.round(x - dw / 2), Math.round(y - dh), Math.round(dw), Math.round(dh));
        return true;
    }

    // ---------------- DOM ----------------
    let root, frameEl, canvas, ctx, panel, lastFocus = null, raf = 0, open = false, lastT = 0;
    const CSS = `
    .sc-root{position:fixed;inset:0;z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;background:rgba(8,10,10,.9);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s ease}
    .sc-root.open{opacity:1}
    .sc-frame{position:relative;width:min(100%,calc((100svh - 80px) * 16 / 9),1120px);aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#0f1214;box-shadow:0 30px 80px rgba(0,0,0,.6);outline:1px solid rgba(127,216,221,.18)}
    .sc-frame canvas{display:block;width:100%;height:100%;touch-action:none;image-rendering:pixelated;outline:none}
    .sc-close{position:absolute;top:10px;right:10px;z-index:3;width:38px;height:38px;border-radius:999px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:22px;line-height:1;cursor:pointer}
    .sc-close:hover{background:#0e7a80}
    .sc-hint{margin:10px 0 0;color:rgba(246,244,239,.55);font:12px ${MONO};text-align:center}
    .sc-panel{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;padding:3.5%;background:rgba(15,18,20,.62)}
    .sc-panel[hidden]{display:none}
    .sc-card{width:100%;max-width:600px;max-height:100%;overflow:auto;background:#f6f4ef;color:#1a1714;border-radius:16px;padding:clamp(12px,2.6vw,26px);box-shadow:0 24px 60px rgba(0,0,0,.45);font:clamp(12px,1.5vw,15px)/1.5 Inter,system-ui,sans-serif}
    .sc-kicker{font:600 clamp(10px,1.1vw,12px) ${MONO};letter-spacing:.14em;text-transform:uppercase;color:#0e7a80}
    .sc-card h3{font:600 clamp(18px,2.6vw,28px)/1.1 ${DISPLAY};margin:.35em 0 .5em;letter-spacing:-.01em}
    .sc-card h3 span{display:block;font-size:.62em;color:#544e45;margin-top:.25em;font-weight:500}
    .sc-card ul{margin:0 0 .8em;padding-left:1.1em}
    .sc-card li{margin:.2em 0;color:#2b2722}
    .sc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:.4em 0 .9em}
    .sc-chip{font:600 clamp(10px,1.05vw,12px) ${MONO};padding:3px 8px;border-radius:999px;background:#e4efee;color:#0a5257}
    .sc-chip.miss{background:transparent;color:#8a8378;border:1px dashed rgba(26,23,20,.25)}
    .sc-quip{color:#544e45;font-style:italic;margin:0 0 1em}
    .sc-actions{display:flex;flex-wrap:wrap;gap:10px}
    .sc-btn{display:inline-flex;align-items:center;gap:10px;text-align:left;padding:.7em 1.1em;border-radius:12px;border:1.5px solid #0e7a80;background:#0e7a80;color:#fff;font:600 clamp(12px,1.35vw,15px) Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none}
    .sc-btn small{display:block;font-weight:500;opacity:.85;font-size:.82em}
    .sc-btn:hover{background:#0a5257;border-color:#0a5257}
    .sc-btn.ghost{background:transparent;color:#1a1714;border-color:rgba(26,23,20,.25)}
    .sc-btn.ghost:hover{border-color:#0e7a80;color:#0a5257;background:transparent}
    .sc-btn:disabled{opacity:.45;cursor:not-allowed}
    .sc-gear{width:32px;height:32px;flex-shrink:0;background-repeat:no-repeat;background-size:400% 100%;image-rendering:pixelated}
    .sc-meter{height:12px;border-radius:999px;background:rgba(26,23,20,.1);overflow:hidden;margin:.6em 0 1em}
    .sc-meter span{display:block;height:100%;width:0;background:linear-gradient(90deg,#0e7a80,#7fd8dd);transition:width .12s ease}
    .sc-note{color:#544e45;margin:.8em 0 0;font-size:.92em}
    .sc-stats{display:flex;gap:1.4em;margin:.2em 0 1em;font:600 clamp(11px,1.2vw,13px) ${MONO};color:#0a5257}
    .sc-rotate{display:none;margin:14px 0 0;color:#7fd8dd;font:600 13px ${MONO};text-align:center}
    @media (max-width:600px){.sc-root{padding:8px}.sc-hint{font-size:11px}}
    @media (orientation:portrait) and (max-width:700px){.sc-rotate{display:block}.sc-hint{display:none}}
    `;
    function build() {
        const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
        root = document.createElement('div');
        root.className = 'sc-root';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Signal Chain, a game about my career');
        root.innerHTML = `
            <div class="sc-frame">
                <canvas width="${W}" height="${H}" tabindex="0" aria-label="Game screen"></canvas>
                <div class="sc-panel" hidden></div>
                <button class="sc-close" aria-label="Close game">×</button>
            </div>
            <p class="sc-hint">Jump: Space / ↑ / tap (double jump) · Boss lanes: D F J K or tap a lane · Esc to quit</p>
            <p class="sc-rotate">↻ Turn your phone sideways for a bigger screen.<br>Tap to jump · tap a lane to hit it</p>`;
        document.body.appendChild(root);
        frameEl = root.querySelector('.sc-frame');
        canvas = root.querySelector('canvas');
        panel = root.querySelector('.sc-panel');
        ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        root.querySelector('.sc-close').addEventListener('click', close);
        root.addEventListener('click', (e) => { if (e.target === root) close(); });
        canvas.addEventListener('pointerdown', onPointer);
        panel.addEventListener('click', onPanelClick);
    }
    const gearIcon = (i) => `<span class="sc-gear" aria-hidden="true" style="background-image:url('${BASE}${ART.gear.src}');background-position:${i * 33.333}% 0"></span>`;
    function showPanel(html) { panel.innerHTML = html; panel.hidden = false; const b = panel.querySelector('[data-focus]') || panel.querySelector('button, a'); if (b) b.focus({ preventScroll: true }); }
    function hidePanel() { panel.hidden = true; panel.innerHTML = ''; canvas.focus({ preventScroll: true }); }
    const track = (name, label) => { if (typeof gtag === 'function') gtag('event', name, { event_category: 'game', event_label: label }); };

    // ---------------- STATE ----------------
    let S;
    function newGame() {
        S = { mode: 'title', stage: 0, d: 0, t: 0, py: GROUND, vy: 0, jumps: 0, lives: 3, maxLives: 3, inv: 0, shield: false,
              gear: [], obs: [], toks: [], pops: [], got: REGIONS.map(() => []), score: 0, spawnO: 1, spawnT: 1.4, tokIdx: 0,
              banner: 0, boss: null, L: null, A: null, byHand: false };
    }
    function startStage(i) {
        Object.assign(S, { mode: 'run', stage: i, d: 0, py: GROUND, vy: 0, jumps: 0, inv: 0, obs: [], toks: [], pops: [],
                           spawnO: 1.2, spawnT: 1.1, tokIdx: 0, banner: 3, boss: null, L: null, A: null, byHand: false });
        S.got[i] = [];
        S.lives = S.maxLives;
        S.shield = S.gear.includes(2);
        hidePanel();
    }
    const R = () => REGIONS[S.stage];
    const pop = (x, y, s, col, big) => S.pops.push({ x, y, s, col: col || COL.paper, a: big ? 2 : 1, big: !!big });

    // ---------------- INPUT ----------------
    function onKey(e) {
        if (!open) return;
        const k = e.key;
        if (k === 'Escape') { e.preventDefault(); close(); return; }
        if (!panel.hidden) {
            if (S.mode === 'automate' && (k === ' ' || k === 'Spacebar')) { e.preventDefault(); manualTap(); }
            if (S.mode === 'automate' && (k === 'Enter' || k.toLowerCase() === 'b') && document.activeElement?.dataset?.act !== 'manual') { e.preventDefault(); buildTool(); }
            return;
        }
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
        if (S.mode === 'title') { if (k === ' ' || k === 'Enter') startStage(0); return; }
        if (S.mode === 'run') { if (k === ' ' || k === 'ArrowUp' || k.toLowerCase() === 'w') jump(); return; }
        if (S.mode === 'lanes') { const lane = LANE_KEYS.findIndex(p => p.includes(k.toLowerCase())); if (lane >= 0) laneHit(lane); }
    }
    function onPointer(e) {
        e.preventDefault();
        canvas.focus({ preventScroll: true });
        if (S.mode === 'title') { startStage(0); return; }
        if (S.mode === 'run') { jump(); return; }
        if (S.mode === 'lanes') {
            const r = canvas.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width * W;
            const lane = Math.floor((x - LX0) / LW);
            laneHit(Math.max(0, Math.min(LANES - 1, lane)));
        }
    }
    function onPanelClick(e) {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'manual') manualTap();
        else if (act === 'build') buildTool();
        else if (act === 'continue') { startStage(S.stage + 1); }
        else if (act === 'retry') { startStage(S.stage); }
        else if (act === 'again') { newGame(); startStage(0); }
        else if (act === 'close') close();
        else if (act === 'contact') { close(); const c = document.getElementById('contact'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }
    }

    // ---------------- RUN ----------------
    function jump() {
        if (S.jumps < 2) { S.vy = S.jumps ? -600 : -690; S.jumps++; }
    }
    function hurt(msg) {
        if (S.inv > 0) return;
        if (S.shield) { S.shield = false; S.inv = 1; pop(PX, S.py - 80, 'SHIELD!', COL.amb); return; }
        S.lives--; S.inv = 1.3;
        pop(PX, S.py - 80, msg || 'MANUAL WORK!', COL.red);
        if (S.lives <= 0) gameOver();
    }
    function updateRun(dt) {
        const speed = 330 + S.stage * 22;
        const reg = R();
        S.d += speed * dt;
        S.vy += 1850 * dt; S.py += S.vy * dt;
        if (S.py >= GROUND) { S.py = GROUND; S.vy = 0; S.jumps = 0; }
        S.inv = Math.max(0, S.inv - dt);
        const spawning = S.d < REGION_LEN - 700;
        S.spawnO -= dt; S.spawnT -= dt;
        if (spawning && S.spawnO <= 0) {
            S.spawnO = Math.max(0.75, 1.35 - S.stage * 0.1) + Math.random() * 0.8;
            const h = 34 + Math.random() * (24 + S.stage * 6);
            S.obs.push({ x: W + 30, w: 40, h, label: reg.junk[(Math.random() * reg.junk.length) | 0] });
        }
        if (spawning && S.spawnT <= 0 && S.tokIdx < reg.skills.length) {
            S.spawnT = 1.5 + Math.random() * 0.9;
            S.toks.push({ x: W + 30, y: GROUND - 80 - Math.random() * 110, label: reg.skills[S.tokIdx++], ph: Math.random() * 6 });
        }
        for (const o of S.obs) o.x -= speed * dt;
        for (const k of S.toks) {
            k.x -= speed * dt;
            if (S.gear.includes(1)) {
                const dx = PX - k.x, dy = (S.py - 30) - k.y, dist = Math.hypot(dx, dy);
                if (dist < 190) { k.x += dx / dist * 420 * dt; k.y += dy / dist * 420 * dt; }
            }
        }
        S.obs = S.obs.filter(o => o.x > -60);
        const bx = PX - 13, by = S.py - 56, bw = 26, bh = 56;
        for (const o of S.obs) {
            if (!o.hit && bx < o.x + o.w / 2 && bx + bw > o.x - o.w / 2 && by + bh > GROUND - o.h + 4) { o.hit = true; hurt(); }
        }
        for (const k of S.toks) {
            if (!k.got && Math.hypot(PX - k.x, S.py - 30 - k.y) < 40) {
                k.got = true; S.got[S.stage].push(k.label); S.score += 25;
                pop(k.x, k.y - 22, '+ ' + k.label, COL.teal);
            }
        }
        S.toks = S.toks.filter(k => !k.got && k.x > -60);
        if (S.d >= REGION_LEN && S.obs.every(o => o.x < PX - 40)) {
            S.mode = 'bossIntro'; S.t = 0; S.obs = []; S.toks = [];
            S.boss = { x: W + 120, y: GROUND, hp: 1, t: 0 };
        }
    }

    // ---------------- BOSS: INTRO + LANES ----------------
    function updateBossIntro(dt) {
        S.t += dt; S.boss.t += dt;
        S.boss.x = Math.max(W - 200, S.boss.x - 260 * dt);
        S.py = GROUND;
        if (S.t > 2.6) {
            S.mode = 'lanes';
            S.L = { t: 0, items: [], spawn: 0.4, dead: 0, combo: 0, pts: 0, hits: 0, flash: 0, lf: [0, 0, 0, 0] };
        }
    }
    function laneHit(lane) {
        const L = S.L; L.lf[lane] = 1;
        let best = null;
        for (const it of L.items) if (it.lane === lane && !it.done && Math.abs(it.y - AIR) < 30) if (!best || it.y > best.y) best = it;
        if (best) {
            best.done = true; L.combo++; L.hits++;
            L.pts += 10 + Math.min(L.combo, 10);
            S.boss.hp = Math.max(0.28, S.boss.hp - 0.03);
            pop(LX0 + lane * LW + LW / 2, AIR - 30, 'RELEASED', COL.teal);
        } else L.combo = 0;
    }
    function updateLanes(dt) {
        const L = S.L; L.t += dt; S.boss.t += dt;
        const flood = S.stage === 3 && L.t > 7;
        const interval = flood ? 0.3 : [0.62, 0.55, 0.5, 0.44][S.stage];
        const speed = [185, 200, 215, 230][S.stage];
        L.spawn -= dt;
        if (L.spawn <= 0 && L.t < LANE_TIME - 1.6) {
            L.spawn = interval * (0.75 + Math.random() * 0.5);
            L.items.push({ lane: (Math.random() * LANES) | 0, y: LTOP, v: speed * (0.9 + Math.random() * 0.2), done: false });
        }
        for (const it of L.items) {
            it.y += it.v * dt;
            if (!it.done && it.y > AIR + 34) {
                it.done = true; it.missed = true; L.combo = 0; L.dead = Math.min(100, L.dead + 20); L.flash = 0.4;
                pop(LX0 + it.lane * LW + LW / 2, AIR + 4, 'MISSED', COL.red);
            }
        }
        L.items = L.items.filter(it => it.y < H + 30 && !(it.done && !it.missed));
        L.dead = Math.max(0, L.dead - dt * 4);
        L.flash = Math.max(0, L.flash - dt);
        L.lf = L.lf.map(v => Math.max(0, v - dt * 5));
        if (L.dead >= 100) {
            L.dead = 35; S.lives--; pop(W / 2, 250, 'DEAD AIR', COL.red, true);
            if (S.lives <= 0) { gameOver(); return; }
        }
        if (L.t >= LANE_TIME) { S.score += L.pts; startAutomate(); }
    }

    // ---------------- BOSS: AUTOMATE ----------------
    function startAutomate() {
        S.mode = 'automate';
        S.A = { prog: 0, taps: 0, building: false };
        const b = R().boss, pts = S.L.pts, can = pts >= b.cost;
        showPanel(`
            <div class="sc-card" role="document">
                <div class="sc-kicker">Boss staggered · ${b.name}</div>
                <h3>Finish it by hand, or build the fix.</h3>
                <div class="sc-meter" aria-hidden="true"><span></span></div>
                <div class="sc-actions">
                    <button class="sc-btn ghost" data-act="manual"${can ? '' : ' data-focus'}>Do it by hand<small class="sc-taps">Space / tap · 0 of ${MANUAL_TAPS}</small></button>
                    <button class="sc-btn" data-act="build"${can ? ' data-focus' : ' disabled'}>Build: ${b.tool}<small>${b.cost} pts · you earned ${pts}</small></button>
                </div>
                <p class="sc-note">${can ? b.toolDesc : `Not enough points from the lanes to build ${b.tool}. You can still grind it out by hand.`}</p>
            </div>`);
    }
    function setMeter() {
        const m = panel.querySelector('.sc-meter span'); if (m) m.style.width = (S.A.prog * 100) + '%';
        const t = panel.querySelector('.sc-taps'); if (t) t.textContent = `Space / tap · ${S.A.taps} of ${MANUAL_TAPS}`;
    }
    function manualTap() {
        if (S.mode !== 'automate' || S.A.building || S.A.prog >= 1) return;
        S.A.taps++; S.A.prog = Math.min(1, S.A.taps / MANUAL_TAPS); setMeter();
        if (S.A.prog >= 1) { S.byHand = true; defeatBoss(); }
    }
    function buildTool() {
        const b = R().boss;
        if (S.mode !== 'automate' || S.A.building || S.L.pts < b.cost || S.A.prog >= 1) return;
        S.A.building = true;
        const btn = panel.querySelector('[data-act="build"]'); if (btn) btn.innerHTML = `Automating…<small>${b.tool} is running</small>`;
        const start = S.A.prog, t0 = performance.now();
        const step = (now) => {
            const p = Math.min(1, (now - t0) / 1100);
            S.A.prog = start + (1 - start) * p; setMeter();
            if (p < 1) requestAnimationFrame(step); else { S.byHand = false; defeatBoss(); }
        };
        requestAnimationFrame(step);
    }
    function defeatBoss() {
        S.boss.hp = 0; S.mode = 'defeat'; S.t = 0;
        hidePanel();
        pop(W / 2, 170, S.byHand ? 'DONE BY HAND' : 'AUTOMATED', S.byHand ? COL.amb : COL.teal, true);
        track('stage_clear', R().key);
    }
    function updateDefeat(dt) {
        S.t += dt; S.boss.t += dt;
        if (S.t > 0.5) { S.boss.x += 420 * dt; S.boss.t += dt * 3; }
        if (S.t > 1.6) { S.mode = 'reward'; S.stage === REGIONS.length - 1 ? showEnding() : showReward(); }
    }

    // ---------------- CARDS ----------------
    function chipsFor(i) {
        const got = S.got[i];
        return REGIONS[i].skills.map(s => `<span class="sc-chip${got.includes(s) ? '' : ' miss'}">${s}</span>`).join('');
    }
    function showReward() {
        const r = R(), rw = r.reward;
        showPanel(`
            <div class="sc-card" role="document">
                <div class="sc-kicker">Stage clear · ${r.place} · ${r.years}</div>
                <h3>${r.job}<span>${r.org}</span></h3>
                <ul>${r.resume.map(b => `<li>${b}</li>`).join('')}</ul>
                <div class="sc-kicker" style="color:#8a8378">Skills collected · ${S.got[S.stage].length} of ${r.skills.length}</div>
                <div class="sc-chips">${chipsFor(S.stage)}</div>
                <p class="sc-quip">${S.byHand ? 'Done by hand. Now imagine doing that every week.' : 'Automated. That\'s the whole idea.'}</p>
                <div class="sc-actions">
                    <button class="sc-btn" data-act="continue" data-focus>${gearIcon(rw.gear)}<span>Continue with ${rw.name}<small>${rw.desc}</small></span></button>
                    <a class="sc-btn ghost" href="${RESUME_URL}" target="_blank" rel="noopener">See my résumé</a>
                </div>
            </div>`);
        if (!S.gear.includes(rw.gear)) S.gear.push(rw.gear);
        if (rw.gear === 0) S.maxLives = 4;
    }
    function showEnding() {
        if (!S.gear.includes(3)) S.gear.push(3);
        const total = S.got.reduce((n, g) => n + g.length, 0);
        track('game_complete', String(total));
        showPanel(`
            <div class="sc-card" role="document">
                <div class="sc-kicker">Signal locked · 10 years on the air</div>
                <h3>You automated the 50-promo monster.<span>Operations Manager · WCTS Radio · 2024 – now</span></h3>
                <ul>${R().resume.map(b => `<li>${b}</li>`).join('')}</ul>
                <div class="sc-stats"><span>SKILLS ${total}/${TOTAL_SKILLS}</span><span>SCORE ${S.score}</span></div>
                <p class="sc-quip">That's the last ten years in a nutshell: find the slow, manual thing, then build it away.</p>
                <div class="sc-actions">
                    <a class="sc-btn" href="${RESUME_URL}" target="_blank" rel="noopener" data-focus>${gearIcon(3)}<span>Download my résumé<small>PDF · one page</small></span></a>
                    <a class="sc-btn ghost" href="mailto:${EMAIL}">Say hi</a>
                    <button class="sc-btn ghost" data-act="again">Play again</button>
                </div>
            </div>`);
    }
    function gameOver() {
        S.mode = 'over';
        showPanel(`
            <div class="sc-card" role="document">
                <div class="sc-kicker" style="color:#e5484d">Off the air · ${R().place}</div>
                <h3>Buried in manual work.</h3>
                <p class="sc-quip">It happens to everyone. The fix is usually to automate it.</p>
                <div class="sc-actions">
                    <button class="sc-btn" data-act="retry" data-focus>Retry this stage<small>You keep your gear</small></button>
                    <a class="sc-btn ghost" href="${RESUME_URL}" target="_blank" rel="noopener">See my résumé</a>
                </div>
            </div>`);
    }

    // ---------------- DRAW ----------------
    function text(s, x, y, size, color, align, font, weight) {
        ctx.font = `${weight || 600} ${size}px ${font || MONO}`;
        ctx.fillStyle = color || COL.paper; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y);
    }
    function scenery(dist) {
        const r = REGIONS[S.stage], key = r.key;
        const g = ctx.createLinearGradient(0, 0, 0, GROUND);
        g.addColorStop(0, r.sky[0]); g.addColorStop(1, r.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const bg = img['bg_' + key];
        if (bg) {
            const sc = GROUND / bg.height, bw = bg.width * sc, off = (dist * 0.3) % bw;
            for (let x = -off; x < W; x += bw) ctx.drawImage(bg, x, 0, bw, GROUND);
        } else if (key === 'guam') {
            ctx.fillStyle = '#f7d77a'; ctx.beginPath(); ctx.arc(620, 110, 34, 0, 7); ctx.fill();
            ctx.fillStyle = '#1f7f94'; ctx.fillRect(0, GROUND - 70, W, 70);
            ctx.fillStyle = 'rgba(255,255,255,.25)';
            for (let i = 0; i < 14; i++) ctx.fillRect(((i * 97 - dist * 0.2) % (W + 60) + W + 60) % (W + 60) - 30, GROUND - 60 + (i % 4) * 14, 26, 2);
            for (let i = 0; i < 6; i++) {
                const x = ((i * 190 - dist * 0.55) % 1140 + 1140) % 1140 - 170;
                ctx.fillStyle = '#5b3d22'; ctx.fillRect(x + 20, GROUND - 120, 8, 120);
                ctx.fillStyle = '#1f6b3a';
                for (let f = 0; f < 5; f++) { ctx.save(); ctx.translate(x + 24, GROUND - 122); ctx.rotate(-1.2 + f * 0.6); ctx.fillRect(0, -4, 48, 8); ctx.restore(); }
            }
        } else if (key === 'wuxi') {
            ctx.fillStyle = '#3a2d48';
            for (let i = 0; i < 12; i++) { const x = ((i * 90 - dist * 0.25) % 1080 + 1080) % 1080 - 120; ctx.fillRect(x, GROUND - 90 - (i * 53 % 110), 60, 200); }
            for (let i = 0; i < 4; i++) {
                const x = ((i * 300 - dist * 0.5) % 1200 + 1200) % 1200 - 150;
                ctx.fillStyle = '#231a2e';
                for (let t = 0; t < 4; t++) { ctx.fillRect(x + t * 6, GROUND - 40 - t * 34, 72 - t * 12, 30); ctx.fillRect(x - 8 + t * 6, GROUND - 44 - t * 34, 88 - t * 12, 5); }
            }
            ctx.fillStyle = 'rgba(255,214,120,.5)';
            for (let i = 0; i < 20; i++) ctx.fillRect(((i * 61 - dist * 0.25) % 1080 + 1080) % 1080 - 100, GROUND - 60 - (i * 37 % 120), 4, 4);
        } else if (key === 'greenville') {
            ctx.fillStyle = '#5d5231';
            for (let i = 0; i < 6; i++) { const x = ((i * 220 - dist * 0.25) % 1320 + 1320) % 1320 - 200; ctx.beginPath(); ctx.ellipse(x + 110, GROUND, 170, 110 + (i * 31 % 50), 0, Math.PI, 0); ctx.fill(); }
            ctx.fillStyle = '#2c3b1e';
            for (let i = 0; i < 12; i++) {
                const x = ((i * 110 - dist * 0.55) % 1320 + 1320) % 1320 - 100, h = 70 + (i * 23 % 40);
                ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 22, GROUND - h); ctx.lineTo(x + 44, GROUND); ctx.fill();
            }
        } else {
            ctx.fillStyle = '#1b2a42';
            for (let i = 0; i < 14; i++) {
                const x = ((i * 80 - dist * 0.3) % 1120 + 1120) % 1120 - 100, h = 90 + (i * 67 % 170);
                ctx.fillRect(x, GROUND - h, 58, h);
                ctx.fillStyle = 'rgba(255,220,140,.35)';
                for (let wy = GROUND - h + 10; wy < GROUND - 10; wy += 14) for (let wx = x + 8; wx < x + 50; wx += 12) if ((wx * 7 + wy) % 5 < 2) ctx.fillRect(wx, wy, 4, 5);
                ctx.fillStyle = '#1b2a42';
            }
            const tx = ((700 - dist * 0.3) % 1120 + 1120) % 1120 - 100;   // the WCTS tower
            ctx.strokeStyle = '#8fa0bd'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(tx, GROUND); ctx.lineTo(tx + 14, GROUND - 230); ctx.lineTo(tx + 28, GROUND); ctx.stroke();
            for (let y = GROUND - 20; y > GROUND - 220; y -= 26) { ctx.beginPath(); ctx.moveTo(tx + (GROUND - y) * 0.06, y); ctx.lineTo(tx + 28 - (GROUND - y) * 0.06, y); ctx.stroke(); }
            ctx.fillStyle = (performance.now() / 600 | 0) % 2 ? COL.red : '#5a1f22'; ctx.beginPath(); ctx.arc(tx + 14, GROUND - 234, 4, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#12161a'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = 'rgba(127,216,221,.3)';
        for (let i = 0; i < 20; i++) ctx.fillRect(((i * 50 - dist) % 1000 + 1000) % 1000 - 50, GROUND + 16, 24, 2);
    }
    function drawPlayer() {
        const x = PX, y = S.py;
        if (S.inv > 0 && ((S.inv * 12) | 0) % 2) return;
        const air = y < GROUND - 1;
        const cyc = [0, 1, 2, 1][((S.d / 38) | 0) % 4];
        if (!sprite('player', air ? 3 : cyc, 0, x, y + 1, 3)) {
            ctx.fillStyle = COL.acc; ctx.fillRect(x - 14, y - 50, 28, 34); ctx.fillStyle = '#d9a77a'; ctx.fillRect(x - 10, y - 62, 20, 14);
        }
        if (S.shield) { ctx.strokeStyle = 'rgba(245,166,35,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 30, 30, 38, 0, 0, 7); ctx.stroke(); }
    }
    function drawBoss(x, y, scale) {
        const blink = (S.boss.t % 3.2) < 0.18 ? 1 : 0, bob = Math.sin(S.boss.t * 4) * 3;
        if (!sprite('bosses', blink, S.stage, x, y + bob, scale)) {
            ctx.fillStyle = '#3a1416'; ctx.fillRect(x - 60, y - 130 + bob, 120, 130);
        }
    }
    function drawHUD() {
        for (let i = 0; i < S.maxLives; i++) text(i < S.lives ? '♥' : '♡', 16 + i * 22, 30, 20, COL.red, 'left', 'system-ui');
        let gx = 16 + S.maxLives * 22 + 10;
        if (S.shield) { text('◆', gx, 29, 16, COL.amb, 'left', 'system-ui'); gx += 22; }
        for (const g of S.gear) { if (!sprite('gear', g, 0, gx + 12, 36, 1.5)) text('★', gx, 30, 14, COL.teal); gx += 28; }
        const total = S.got.reduce((n, g) => n + g.length, 0);
        text(`SKILLS ${total}/${TOTAL_SKILLS}`, W - 16, 30, 13, COL.teal, 'right');
        const bx = 250, bw = 300;
        ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(bx, 22, bw, 4);
        const seg = bw / REGIONS.length, p = S.mode === 'run' ? Math.min(1, S.d / REGION_LEN) : 1;
        ctx.fillStyle = COL.teal; ctx.fillRect(bx, 22, seg * S.stage + seg * p, 4);
        for (let i = 0; i < REGIONS.length; i++) { ctx.fillStyle = i < S.stage || (i === S.stage && p >= 1) ? COL.red : 'rgba(255,255,255,.35)'; ctx.fillRect(bx + seg * (i + 1) - 3, 17, 6, 14); }
        text(`${R().place} · ${R().years}`, W / 2, 46, 11, 'rgba(246,244,239,.65)', 'center');
    }
    function drawPops(dt) {
        for (const p of S.pops) {
            p.y -= 30 * dt; p.a -= dt;
            ctx.globalAlpha = Math.max(0, Math.min(1, p.a));
            text(p.s, p.x, p.y, p.big ? 34 : 13, p.col, 'center', p.big ? DISPLAY : MONO, 700);
            ctx.globalAlpha = 1;
        }
        S.pops = S.pops.filter(p => p.a > 0);
    }
    function drawRun() {
        scenery(S.d);
        for (const k of S.toks) {
            const y = k.y + Math.sin(S.d / 60 + k.ph) * 4;
            if (!sprite('token', 0, 0, k.x, y + 15, 2.6)) { ctx.fillStyle = COL.teal; ctx.beginPath(); ctx.arc(k.x, y, 14, 0, 7); ctx.fill(); }
            text(k.label, k.x, y - 22, 11, COL.paper, 'center');
        }
        for (const o of S.obs) {
            if (!sprite('crate', 0, 0, o.x, GROUND, 1, o.w, o.h)) { ctx.fillStyle = '#3a3f44'; ctx.fillRect(o.x - o.w / 2, GROUND - o.h, o.w, o.h); }
            text(o.label, o.x, GROUND - o.h - 7, 10, 'rgba(246,244,239,.75)', 'center');
        }
        if (S.boss) drawBoss(S.boss.x, GROUND, 3);
        drawPlayer();
        drawHUD();
        if (S.mode === 'run' && S.banner > 0) {
            ctx.globalAlpha = Math.min(1, S.banner);
            ctx.fillStyle = 'rgba(15,18,20,.72)'; ctx.fillRect(0, 96, W, 96);
            text(`${R().place} · ${R().years}`, W / 2, 126, 13, COL.teal, 'center');
            text(R().org, W / 2, 162, 30, COL.paper, 'center', DISPLAY);
            text(R().job, W / 2, 182, 13, 'rgba(246,244,239,.75)', 'center', 'Inter, system-ui, sans-serif', 500);
            ctx.globalAlpha = 1;
        }
        if (S.mode === 'bossIntro') {
            ctx.fillStyle = `rgba(229,72,77,${0.12 + Math.sin(S.t * 10) * 0.06})`; ctx.fillRect(0, 0, W, H);
            text('BOSS', W / 2, 120, 14, COL.red, 'center');
            text(R().boss.name, W / 2, 158, 34, COL.paper, 'center', DISPLAY, 700);
            text('Keep the station on air: hit each lane as items cross the line', W / 2, 186, 13, 'rgba(246,244,239,.75)', 'center', 'Inter, system-ui, sans-serif', 500);
        }
    }
    function drawLanes() {
        const L = S.L;
        scenery(S.d);
        ctx.fillStyle = 'rgba(10,12,14,.78)'; ctx.fillRect(0, 0, W, H);
        drawBoss(W / 2, LTOP - 6, 2.6);
        // boss HP
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(W / 2 - 110, 22, 220, 6);
        ctx.fillStyle = COL.red; ctx.fillRect(W / 2 - 110, 22, 220 * S.boss.hp, 6);
        text(R().boss.name.toUpperCase(), W / 2, 16, 11, COL.red, 'center');
        for (let i = 0; i < LANES; i++) {
            const x = LX0 + i * LW;
            ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(x, LTOP, LW, H - LTOP);
            if (L.lf[i]) { ctx.fillStyle = `rgba(127,216,221,${L.lf[i] * 0.2})`; ctx.fillRect(x, LTOP, LW, H - LTOP); }
            text(LANE_KEYS[i][0].toUpperCase(), x + LW / 2, H - 8, 12, 'rgba(246,244,239,.4)', 'center');
        }
        ctx.fillStyle = 'rgba(229,72,77,.14)'; ctx.fillRect(LX0, AIR - 28, LANES * LW, 56);
        ctx.fillStyle = COL.red; ctx.fillRect(LX0, AIR, LANES * LW, 2);
        text('● AIR', LX0 - 10, AIR + 5, 11, COL.red, 'right');
        const itemCol = S.stage === 3 ? COL.red : COL.teal;
        for (const it of L.items) {
            const x = LX0 + it.lane * LW + 9;
            ctx.globalAlpha = it.missed ? 0.25 : 1;
            ctx.beginPath(); ctx.roundRect(x, it.y - 17, LW - 18, 34, 7); ctx.fillStyle = '#1b2023'; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = itemCol; ctx.stroke();
            ctx.fillStyle = itemCol;
            for (let k = 0; k < 12; k++) { const h = 3 + Math.abs(Math.sin(k * 1.7 + it.lane * 2)) * 8; ctx.fillRect(x + 8 + k * 5, it.y + 6 - h / 2, 3, h); }
            text(R().boss.item, x + (LW - 18) / 2, it.y - 4, 10, itemCol, 'center');
            ctx.globalAlpha = 1;
        }
        // HUD
        text(`PTS ${L.pts}`, 16, 60, 14, COL.paper);
        text(`BUILD COST ${R().boss.cost}`, 16, 78, 11, L.pts >= R().boss.cost ? COL.teal : 'rgba(246,244,239,.5)');
        if (L.combo > 2) text(`x${L.combo} COMBO`, 16, 96, 11, COL.teal);
        text('DEAD AIR', W - 16, 60, 11, 'rgba(246,244,239,.6)', 'right');
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(W - 136, 68, 120, 7);
        ctx.fillStyle = L.dead > 66 ? COL.red : L.dead > 33 ? COL.amb : COL.teal; ctx.fillRect(W - 136, 68, 120 * L.dead / 100, 7);
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(W - 136, 86, 120, 3);
        ctx.fillStyle = COL.paper; ctx.fillRect(W - 136, 86, 120 * Math.min(1, L.t / LANE_TIME), 3);
        for (let i = 0; i < S.maxLives; i++) text(i < S.lives ? '♥' : '♡', 16 + i * 22, 30, 20, COL.red, 'left', 'system-ui');
        if (S.stage === 3 && L.t > 7) text('THE PROMOS KEEP COMING', W / 2, LTOP + 22, 12, COL.amb, 'center');
        if (L.flash) { ctx.fillStyle = `rgba(229,72,77,${L.flash * 0.3})`; ctx.fillRect(0, 0, W, H); }
    }
    function drawTitle() {
        const t = performance.now() / 1000;
        S.stage = 0; scenery(t * 120);
        ctx.fillStyle = 'rgba(15,18,20,.72)'; ctx.fillRect(0, 0, W, H);
        text('A CAREER IN FOUR STAGES', W / 2, 140, 13, COL.teal, 'center');
        text('SIGNAL CHAIN', W / 2, 196, 58, COL.paper, 'center', DISPLAY, 700);
        text('Guam  →  Wuxi  →  Greenville  →  Minneapolis', W / 2, 232, 15, 'rgba(246,244,239,.8)', 'center', 'Inter, system-ui, sans-serif', 500);
        text('Collect skills. Dodge manual work. Automate the bosses.', W / 2, 256, 13, 'rgba(246,244,239,.6)', 'center', 'Inter, system-ui, sans-serif', 500);
        ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
        text('PRESS SPACE OR TAP TO START', W / 2, 312, 14, COL.teal, 'center');
        ctx.globalAlpha = 1;
        const bob = Math.abs(Math.sin(t * 6)) * 6;
        sprite('player', ((t * 8) | 0) % 3, 0, W / 2, 382 - bob, 3);
    }

    // ---------------- LOOP ----------------
    function loop(now) {
        if (!open) return;
        const dt = Math.min(0.05, (now - lastT) / 1000 || 0); lastT = now;
        ctx.imageSmoothingEnabled = false;
        if (S.mode === 'title') drawTitle();
        else if (S.mode === 'run') { updateRun(dt); S.banner = Math.max(0, S.banner - dt); drawRun(); drawPops(dt); }
        else if (S.mode === 'bossIntro') { updateBossIntro(dt); drawRun(); drawPops(dt); }
        else if (S.mode === 'lanes') { updateLanes(dt); if (S.mode === 'lanes') { drawLanes(); drawPops(dt); } }
        else if (S.mode === 'defeat') { updateDefeat(dt); drawRun(); drawPops(dt); }
        else if (S.L && (S.mode === 'automate')) { drawLanes(); }
        else { drawRun(); }
        raf = requestAnimationFrame(loop);
    }
    function onVisibility() { if (document.hidden) { cancelAnimationFrame(raf); } else if (open) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }

    // ---------------- OPEN / CLOSE ----------------
    function openGame() {
        if (open) return;
        if (!root) { build(); loadArt(); }
        newGame();
        open = true; lastFocus = document.activeElement;
        root.style.display = 'flex';
        requestAnimationFrame(() => root.classList.add('open'));
        document.body.style.overflow = 'hidden';
        hidePanel();
        window.addEventListener('keydown', onKey, true);
        document.addEventListener('visibilitychange', onVisibility);
        lastT = performance.now(); raf = requestAnimationFrame(loop);
        track('game_open', 'signal_chain');
    }
    function close() {
        if (!open) return;
        open = false; cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey, true);
        document.removeEventListener('visibilitychange', onVisibility);
        root.classList.remove('open');
        setTimeout(() => { if (!open) root.style.display = 'none'; }, 350);
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    window.SignalChain = {
        open: openGame, close, isOpen: () => open,
        // Handy for testing: SignalChain._dev.boss(2) jumps to the Greenville boss.
        _dev: { boss(i) { if (!open) openGame(); startStage(i || 0); S.d = REGION_LEN; }, state: () => S },
    };
})();
