/* ============================================================
   WebOS · 凤凰战机 / Phoenix Strike
   纯 Canvas 街机射击：图形、粒子、音效全部实时生成，零外部资源
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  const W = 480;                       // 逻辑宽度，高度随窗口自适应
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = OS.clamp;
  const d2 = (a, b) => { const x = a.x - b.x, y = a.y - b.y; return x * x + y * y; };

  const FOE = {
    scout:  { r: 13, hp: 18, speed: 96,  score: 100, color: '#67e8f9' },
    weaver: { r: 16, hp: 34, speed: 78,  score: 180, color: '#c084fc' },
    tank:   { r: 22, hp: 76, speed: 48,  score: 340, color: '#fb7185' }
  };
  const DROP = {
    power:  { c: '#ffb347', label: 'P', name: '火力' },
    shield: { c: '#6ee7ff', label: 'S', name: '护盾' },
    life:   { c: '#ff6b8b', label: 'L', name: '生命' },
    bomb:   { c: '#c8a2ff', label: 'B', name: '涅槃' }
  };

  /* ---------------- 天梯榜数据层 ----------------
     纯静态站点没有账号与后端：以「玩家名」区分用户，成绩写入本机
     localStorage。SEED 是常驻的本机基准成绩，只用于让榜单有参照，
     在界面上标注「预置」，不与真实战绩混在一起。 */
  const RUNS_KEY = 'phoenixScores';
  const PLAYER_KEY = 'phoenixPlayer';
  const MAX_RUNS = 120;
  const SEED = [
    { name: '赤焰', score: 26840, wave: 12, kills: 176, demo: true },
    { name: '夜枭', score: 19120, wave: 10, kills: 132, demo: true },
    { name: '星尘', score: 12460, wave: 8,  kills: 94,  demo: true },
    { name: '白鸦', score: 7380,  wave: 6,  kills: 61,  demo: true },
    { name: '雏凤', score: 3180,  wave: 3,  kills: 28,  demo: true }
  ];
  const cleanName = (s, fallback) => {
    const t = String(s == null ? '' : s)
      .replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 12);
    return t || fallback || '玩家';
  };
  const fmtDate = (ts) => {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + OS.pad(d.getHours()) + ':' + OS.pad(d.getMinutes());
  };
  const num = (v) => Number(v) || 0;
  const scoreText = (v) => Math.max(0, Math.floor(num(v))).toLocaleString('zh-CN');
  const timeKey = (e) => e.ts > 0 ? e.ts : Number.MAX_SAFE_INTEGER;

  const Ladder = {
    player() { return cleanName(OS.store.get(PLAYER_KEY, 'andi'), 'andi'); },
    setPlayer(n) {
      const v = cleanName(n, this.player());
      OS.store.set(PLAYER_KEY, v);
      return v;
    },
    /* 读取时逐条校验，避免手工改动 localStorage 后把脏数据带进界面 */
    runs() {
      const raw = OS.store.get(RUNS_KEY, []);
      if (!Array.isArray(raw)) return [];
      return raw.filter((r) => r && typeof r === 'object' && Number.isFinite(r.score) &&
        r.score >= 0 && typeof r.name === 'string')
        .map((r) => ({
          name: cleanName(r.name, '玩家'),
          score: Math.floor(r.score),
          wave: Math.max(1, Math.floor(num(r.wave)) || 1),
          kills: Math.max(0, Math.floor(num(r.kills))),
          ts: Math.max(0, Math.floor(num(r.ts))),
          demo: false
        }));
    },
    all() { return SEED.concat(this.runs()); },
    submit(run) {
      const rec = {
        name: cleanName(run.name, this.player()),
        score: Math.max(0, Math.floor(num(run.score))),
        wave: Math.max(1, Math.floor(num(run.wave)) || 1),
        kills: Math.max(0, Math.floor(num(run.kills))),
        ts: Date.now(),
        demo: false
      };
      const list = this.runs();
      list.push(rec);
      list.sort((a, b) => b.score - a.score || a.ts - b.ts);
      OS.store.set(RUNS_KEY, list.slice(0, MAX_RUNS));
      return rec;
    },
    /* 每位玩家只取历史最高一局，得到「用户得分排名」 */
    players() {
      const counts = Object.create(null);
      for (const r of this.runs()) counts[r.name] = (counts[r.name] || 0) + 1;
      const map = new Map();
      for (const r of this.all()) {
        const key = (r.demo ? 'd:' : 'u:') + r.name;
        const prev = map.get(key);
        if (!prev || r.score > prev.score || (r.score === prev.score && timeKey(r) < timeKey(prev))) {
          map.set(key, {
            name: r.name, score: r.score, wave: r.wave, kills: r.kills,
            ts: r.ts || 0, demo: !!r.demo, plays: r.demo ? 0 : (counts[r.name] || 1)
          });
        }
      }
      const list = Array.from(map.values());
      list.sort((a, b) => b.score - a.score || timeKey(a) - timeKey(b) || a.name.localeCompare(b.name, 'zh'));
      list.forEach((e, i) => { e.rank = i + 1; });
      return list;
    },
    /* 单局榜：每一局都是一条记录 */
    recent(limit) {
      return this.runs().slice()
        .sort((a, b) => b.score - a.score || b.ts - a.ts)
        .slice(0, limit || 8)
        .map((r, i) => Object.assign({}, r, { rank: i + 1 }));
    },
    rankOf(name) {
      const list = this.players();
      const i = list.findIndex((e) => !e.demo && e.name === name);
      return i < 0
        ? { rank: 0, total: list.length, best: 0 }
        : { rank: i + 1, total: list.length, best: list[i].score };
    },
    clear() { OS.store.set(RUNS_KEY, []); }
  };

  /* ---------------- WebAudio 合成音效 ---------------- */
  const Sfx = {
    ctx: null, noiseBuf: null, lastShot: 0,
    on() { return !!(OS.phoenix && OS.phoenix.sound); },
    ensure() {
      if (!this.on()) return null;
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') {
          const p = this.ctx.resume();
          if (p && p.catch) p.catch(() => {});
        }
        return this.ctx;
      } catch (e) { return null; }
    },
    tone(f1, f2, dur, vol, type) {
      const c = this.ensure(); if (!c) return;
      try {
        const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
        o.type = type || 'triangle';
        o.frequency.setValueAtTime(f1, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol || .05), t + .008);
        g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + dur + .02);
      } catch (e) { /* 音频不可用时静默降级 */ }
    },
    noise(dur, vol, lp) {
      const c = this.ensure(); if (!c) return;
      try {
        if (!this.noiseBuf) {
          const n = Math.floor(c.sampleRate * .5);
          const b = c.createBuffer(1, n, c.sampleRate), data = b.getChannelData(0);
          for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
          this.noiseBuf = b;
        }
        const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(), t = c.currentTime;
        src.buffer = this.noiseBuf;
        f.type = 'lowpass'; f.frequency.value = lp || 900;
        g.gain.setValueAtTime(Math.max(.0002, vol || .08), t);
        g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(c.destination);
        src.start(t); src.stop(t + dur + .02);
      } catch (e) { /* noop */ }
    },
    shoot() {
      const n = performance.now();
      if (n - this.lastShot < 95) return;
      this.lastShot = n;
      this.tone(760, 300, .07, .016, 'square');
    },
    explode(big) {
      this.noise(big ? .36 : .15, big ? .15 : .07, big ? 520 : 1100);
      if (big) this.tone(150, 42, .4, .06, 'sawtooth');
    },
    hit() { this.tone(220, 70, .18, .07, 'sawtooth'); },
    power() { this.tone(520, 880, .12, .045); setTimeout(() => this.tone(880, 1320, .14, .035), 90); },
    bomb() { this.noise(.5, .16, 700); this.tone(90, 800, .45, .07, 'sawtooth'); },
    start() { [440, 660, 880].forEach((f, i) => setTimeout(() => this.tone(f, f * 1.2, .12, .04), i * 70)); },
    over() { [520, 390, 260, 170].forEach((f, i) => setTimeout(() => this.tone(f, f * .7, .22, .045, 'triangle'), i * 150)); },
    boss() { this.tone(110, 55, .8, .07, 'sawtooth'); }
  };

  /* ---------------- 游戏 ---------------- */
  class PhoenixGame {
    constructor(win, root) {
      this.win = win;
      this.root = root;
      this.stage = root.querySelector('.px-stage');
      this.canvas = root.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.overlay = root.querySelector('.px-overlay');
      this.toastEl = root.querySelector('.px-toast');
      this.bossBar = root.querySelector('.px-boss');
      this.bossFill = root.querySelector('.px-boss i');
      this.hud = {
        score: root.querySelector('[data-score]'),
        best: root.querySelector('[data-best]'),
        wave: root.querySelector('[data-wave]'),
        lives: root.querySelector('[data-lives]'),
        bombs: root.querySelector('[data-bombs]'),
        power: root.querySelector('[data-power]')
      };
      this.moveKeys = { up: 1, down: 1, left: 1, right: 1 };
      this.boardTab = 'players';
      this.boardResume = false;
      this.confirmClear = false;
      this.scale = 1; this.H = 620; this.dpr = 1;
      this.resize();
      this.reset();
      this.bind();
      this.syncTools();
      this.syncHud(true);
      this.showOverlay('ready');
      this.last = performance.now();
      this.stall = 0;
      this.frame = this.frame.bind(this);
      this.tick = this.tick.bind(this);
      this.raf = requestAnimationFrame(this.tick);
      /* 看门狗：RAF 被浏览器挂起（后台标签 / 无头渲染）时补帧，
         正常 60fps 下 frame() 会持续把 stall 归零，不会产生重复循环。 */
      this.watchdog = setInterval(() => {
        if (this.destroyed) return;
        this.stall++;
        if (this.stall >= 2) this.frame(this.last + 34, .034);
      }, 40);
    }

    /* ---------- 尺寸与状态 ---------- */
    resize() {
      const r = this.stage.getBoundingClientRect();
      const cssW = Math.max(240, r.width || 480), cssH = Math.max(220, r.height || 620);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.scale = cssW / W;
      this.H = cssH / this.scale;
      this.dpr = dpr;
      if (this.player) {
        this.player.x = clamp(this.player.x, 16, W - 16);
        this.player.y = clamp(this.player.y, 40, this.H - 18);
      }
    }

    reset() {
      this.t = 0;
      this.mode = 'ready';
      this.pauseReason = '';
      this.score = 0;
      this.startBest = OS.store.get('phoenixBest', 0) || 0;
      this.best = this.startBest;
      this.lives = 3; this.bombs = 3; this.power = 1;
      this.wave = 1; this.waveClock = 0; this.spawnClock = .7;
      this.kills = 0;
      this.shake = 0; this.flash = 0;
      this.keys = Object.create(null);
      this.pointer = { on: false, x: W / 2, y: 0 };
      this.bullets = []; this.foes = []; this.ebullets = []; this.drops = [];
      this.parts = []; this.texts = []; this.stars = [];
      this.boss = null;
      this.player = { x: W / 2, y: this.H - 68, r: 11, cool: 0, invuln: 0, shield: 0 };
      this.makeStars();
    }

    makeStars() {
      for (let i = 0; i < 96; i++) {
        this.stars.push({ x: rnd(0, W), y: rnd(0, 900), s: rnd(.6, 2.1), v: rnd(20, 95), a: rnd(.25, .95) });
      }
    }

    /* ---------- 输入 ---------- */
    key(e) {
      const byCode = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', Space: 'space',
        KeyP: 'p', KeyR: 'r', KeyN: 'n', KeyM: 'm', KeyB: 'b', KeyH: 'h', KeyL: 'l',
        Enter: 'enter', Escape: 'escape'
      };
      if (byCode[e.code]) return byCode[e.code];
      const byKey = {
        arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'space',
        p: 'p', r: 'r', n: 'n', m: 'm', b: 'b', h: 'h', l: 'l', enter: 'enter', escape: 'escape'
      };
      return byKey[String(e.key || '').toLowerCase()] || null;
    }

    overlayOpen() {
      const ids = ['spotlight', 'launchpad', 'lockscreen', 'shutdown'];
      for (const id of ids) {
        const e = document.getElementById(id);
        if (e && !e.classList.contains('hidden')) return true;
      }
      const nc = document.getElementById('notification-center');
      return !!(nc && nc.classList.contains('open'));
    }

    isActive() {
      const wm = OS.wm;
      return !!wm && wm.active() === this.win && !this.win.state.minimized &&
        !wm.missionMode && !this.overlayOpen();
    }

    bind() {
      this.onDown = (e) => {
        if (!this.isActive()) return;
        const t = e.target;
        /* 玩家名输入框内：不吞按键，也不触发游戏快捷键 */
        if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) {
          if (e.key === 'Escape') { t.blur(); if (this.overlayMode === 'ranks') this.closeRanks(); }
          return;
        }
        const k = this.key(e);
        if (!k) return;
        if (this.moveKeys[k] || k === 'space') e.preventDefault();
        this.keys[k] = true;
        if (e.repeat) return;
        if (k === 'p') this.togglePause();
        else if (k === 'r' || k === 'n') this.start();
        else if (k === 'm') OS.phoenix.toggleSound();
        else if (k === 'b' || k === 'space') this.bomb();
        else if (k === 'h') this.openHelp();
        else if (k === 'l') { if (this.overlayMode === 'ranks') this.closeRanks(); else this.openRanks(); }
        else if (k === 'escape') {
          if (this.overlayMode === 'ranks') this.closeRanks();
          else if (this.overlayMode === 'help') this.back();
        } else if (k === 'enter') {
          if (this.overlayMode === 'ranks') this.closeRanks();
          else if (this.overlayMode === 'help') this.back();
          else if (this.mode !== 'running') this.primaryAction();
        }
      };
      this.onUp = (e) => { const k = this.key(e); if (k) this.keys[k] = false; };
      window.addEventListener('keydown', this.onDown);
      window.addEventListener('keyup', this.onUp);

      this.pDown = (e) => {
        if (this.mode !== 'running') return;
        e.preventDefault();
        this.pointer.on = true;
        this.setPointer(e);
        if (this.canvas.setPointerCapture) { try { this.canvas.setPointerCapture(e.pointerId); } catch (err) {} }
      };
      this.pMove = (e) => { if (this.pointer.on) this.setPointer(e); };
      this.pUp = () => { this.pointer.on = false; };
      this.canvas.addEventListener('pointerdown', this.pDown);
      this.canvas.addEventListener('pointermove', this.pMove);
      this.canvas.addEventListener('pointerup', this.pUp);
      this.canvas.addEventListener('pointercancel', this.pUp);
      this.canvas.addEventListener('pointerleave', this.pUp);

      this.overlay.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'start' || a === 'restart') this.start();
        else if (a === 'resume') this.resume();
        else if (a === 'ranks') this.openRanks();
        else if (a === 'close-ranks') this.closeRanks();
        else if (a === 'help') this.openHelp();
        else if (a === 'back') this.back();
        else if (a === 'tab') {
          this.boardTab = b.dataset.tab === 'runs' ? 'runs' : 'players';
          this.showOverlay('ranks');
        } else if (a === 'save-name') this.savePlayerName();
        else if (a === 'clear') this.clearScores();
      });
      this.overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target && e.target.classList &&
          e.target.classList.contains('px-name-input')) {
          e.preventDefault();
          this.savePlayerName();
        }
      });

      if (window.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.stage);
      }
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);
    }

    setPointer(e) {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = clamp((e.clientX - r.left) / this.scale, 0, W);
      this.pointer.y = clamp((e.clientY - r.top) / this.scale, 0, this.H);
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      cancelAnimationFrame(this.raf);
      clearInterval(this.watchdog);
      window.removeEventListener('keydown', this.onDown);
      window.removeEventListener('keyup', this.onUp);
      window.removeEventListener('resize', this.onResize);
      if (this.ro) this.ro.disconnect();
      clearTimeout(this.toastTimer);
      clearTimeout(this.clearTimer);
      if (OS.phoenix.current === this) OS.phoenix.current = null;
      if (this.win._phoenix === this) this.win._phoenix = null;
    }

    /* ---------- 主循环 ---------- */
    tick(now) {
      this.frame(now);
      if (!this.destroyed) this.raf = requestAnimationFrame(this.tick);
    }

    frame(now, dtOverride) {
      if (!this.root.isConnected || !this.canvas.isConnected) { this.destroy(); return; }
      this.stall = 0;
      const raw = (now - this.last) / 1000;
      const dt = dtOverride || Math.min(.034, raw > 0 ? Math.max(.001, raw) : .016);
      this.last = now;
      this.t += dt;
      if (this.mode === 'running' && !this.isActive()) this.pause(true);
      if (this.mode === 'running') this.update(dt);
      else this.updateAmbient(dt);
      this.draw();
    }

    updateAmbient(dt) {
      this.shake = Math.max(0, this.shake - dt * 26);
      this.flash = Math.max(0, this.flash - dt * 2.2);
      this.moveStars(dt, .4);
      this.moveParts(dt);
    }

    moveStars(dt, mul) {
      for (const s of this.stars) {
        s.y += s.v * dt * mul;
        if (s.y > this.H + 4) { s.y = -4; s.x = rnd(0, W); }
      }
    }

    moveParts(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt;
        if (t.life <= 0) this.texts.splice(i, 1);
        else t.y -= 30 * dt;
      }
    }

    update(dt) {
      this.waveClock += dt;
      if (this.waveClock >= 18) {
        this.waveClock -= 18;
        this.wave++;
        this.toast('第 ' + this.wave + ' 波 · 敌机来袭');
        if (this.wave % 5 === 0 && !this.boss) this.spawnBoss();
      }
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        if (!this.boss || this.foes.length < 4) this.spawnEnemy();
        this.spawnClock = Math.max(.34, 1.05 - this.wave * .045) * rnd(.75, 1.3);
      }

      const p = this.player;
      p.cool -= dt; p.invuln = Math.max(0, p.invuln - dt); p.shield = Math.max(0, p.shield - dt);
      this.movePlayer(dt);
      if (p.cool <= 0) { this.shoot(); p.cool = Math.max(.08, .15 - this.power * .012); }
      if (Math.random() < .6) {
        this.parts.push({ x: p.x + rnd(-3, 3), y: p.y + 16, vx: rnd(-18, 18), vy: rnd(90, 170),
          life: rnd(.18, .35), max: .35, r: rnd(1.5, 3.2), c: Math.random() < .5 ? '#ffcb63' : '#ff6a2b' });
      }

      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.px = b.x; b.py = b.y;                 // 上一帧位置，供扫掠碰撞使用
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y < -20 || b.x < -20 || b.x > W + 20) this.bullets.splice(i, 1);
      }
      for (let i = this.foes.length - 1; i >= 0; i--) {
        const f = this.foes[i];
        f.t += dt;
        if (f.type === 'boss') {
          if (f.entering) { f.y += 48 * dt; if (f.y >= 96) f.entering = false; }
          else { f.x = W / 2 + Math.sin(f.t * .7) * W * .31; f.y = 96 + Math.sin(f.t * 1.4) * 12; }
        } else {
          f.y += f.speed * dt;
          if (f.type === 'weaver') f.x = f.baseX + Math.sin(f.t * 2.2 + f.phase) * W * .17;
          else if (f.type === 'tank') f.x = f.baseX + Math.sin(f.t * .9 + f.phase) * 36;
          else f.x += Math.sin(f.t * 3 + f.phase) * 26 * dt;
          f.x = clamp(f.x, f.r + 4, W - f.r - 4);
        }
        f.fire -= dt;
        if (f.fire <= 0 && f.y > 0 && f.y < this.H * .7) {
          if (f.type === 'boss') this.bossFire(f);
          else this.enemyFire(f);
          f.fire = f.type === 'boss' ? Math.max(.6, 1.5 - this.wave * .04) : rnd(1.15, 2.25) - Math.min(.5, this.wave * .03);
        }
        if (f.y > this.H + 60) {
          if (f === this.boss) { this.boss = null; }
          this.foes.splice(i, 1);
        }
      }
      for (let i = this.ebullets.length - 1; i >= 0; i--) {
        const b = this.ebullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y > this.H + 20 || b.y < -30 || b.x < -20 || b.x > W + 20) this.ebullets.splice(i, 1);
      }
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.y += 96 * dt;
        if (d.y > this.H + 20) { this.drops.splice(i, 1); continue; }
        const rr = d.r + p.r;
        if (d2(d, p) < rr * rr) { this.drops.splice(i, 1); this.applyDrop(d); }
      }

      this.collide();
      this.moveStars(dt, 1);
      this.moveParts(dt);
      this.shake = Math.max(0, this.shake - dt * 26);
      this.flash = Math.max(0, this.flash - dt * 2.2);
      this.bossBar.classList.toggle('on', !!this.boss);
      if (this.boss) this.bossFill.style.width = (Math.max(0, this.boss.hp / this.boss.maxhp) * 100).toFixed(1) + '%';
      this.syncHud();
    }

    movePlayer(dt) {
      const p = this.player, k = this.keys, sp = 255;
      let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (dx || dy) {
        const l = Math.hypot(dx, dy);
        p.x += dx / l * sp * dt; p.y += dy / l * sp * dt;
        this.pointer.on = false;
      } else if (this.pointer.on) {
        const f = Math.min(1, dt * 10);
        p.x += (this.pointer.x - p.x) * f;
        p.y += (this.pointer.y - p.y) * f;
      }
      p.x = clamp(p.x, 16, W - 16);
      p.y = clamp(p.y, 40, this.H - 18);
    }

    shoot() {
      const p = this.player;
      const patterns = {
        1: [[0, 0]],
        2: [[0, -8], [0, 8]],
        3: [[0, 0], [-.2, -7], [.2, 7]],
        4: [[0, 0], [-.2, -7], [.2, 7], [-.4, -13], [.4, 13]],
        5: [[0, 0], [-.16, -6], [.16, 6], [-.34, -12], [.34, 12], [-.5, -17], [.5, 17]]
      };
      const dmg = this.power >= 5 ? 13 : 10;
      (patterns[this.power] || patterns[1]).forEach(([ang, off]) => {
        this.bullets.push({
          x: p.x + off, y: p.y - 18,
          vx: Math.sin(ang) * 570, vy: -Math.cos(ang) * 570,
          r: 3.2, dmg: dmg, color: '#ffe08a'
        });
      });
      Sfx.shoot();
    }

    spawnEnemy() {
      const r = Math.random();
      let type = 'scout';
      if (this.wave >= 2 && r > .7) type = 'weaver';
      if (this.wave >= 3 && r > .89) type = 'tank';
      const d = FOE[type];
      const hp = Math.round(d.hp * (1 + this.wave * .13));
      const x = rnd(34, W - 34);
      this.foes.push({
        type: type, x: x, baseX: x, y: -34, t: 0, r: d.r,
        hp: hp, maxhp: hp, speed: d.speed + this.wave * 5,
        score: d.score, color: d.color, phase: rnd(0, TAU), fire: rnd(.7, 1.9)
      });
    }

    spawnBoss() {
      const hp = 620 + this.wave * 150;
      const b = {
        type: 'boss', x: W / 2, y: -70, t: 0, r: 44, hp: hp, maxhp: hp,
        score: 3000 + this.wave * 200, color: '#c07bff', phase: 0,
        fire: 1.2, speed: 0, entering: true
      };
      this.boss = b;
      this.foes.push(b);
      Sfx.boss();
      this.toast('⚠ 首领来袭 · 第 ' + this.wave + ' 波');
      this.shake = 8;
    }

    addEBullet(x, y, vx, vy, r, color) {
      if (this.ebullets.length > 260) return;
      this.ebullets.push({ x: x, y: y, vx: vx, vy: vy, r: r || 5, color: color || '#ff6b8b' });
    }

    enemyFire(f) {
      const sp = 190 + this.wave * 9;
      const p = this.player;
      if (f.type === 'tank') {
        for (let i = -1; i <= 1; i++) this.addEBullet(f.x, f.y + 12, i * 95, sp * .82, 5.4, '#ff8fa3');
      } else if (f.type === 'weaver') {
        for (let i = -1; i <= 1; i += 2) this.addEBullet(f.x + i * 9, f.y + 8, i * 40, sp, 4.4, '#d8a2ff');
      } else {
        const a = Math.atan2(p.y - f.y, p.x - f.x);
        this.addEBullet(f.x, f.y + 8, Math.cos(a) * sp, Math.sin(a) * sp, 4.6, '#ff7a95');
      }
    }

    bossFire(f) {
      const sp = 165 + this.wave * 6;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + f.t * .8;
        this.addEBullet(f.x, f.y + 10, Math.cos(a) * sp, Math.sin(a) * sp, 5, '#e39bff');
      }
      const p = this.player, a = Math.atan2(p.y - f.y, p.x - f.x);
      for (let i = -1; i <= 1; i++) {
        this.addEBullet(f.x, f.y + 20, Math.cos(a + i * .17) * sp * 1.5, Math.sin(a + i * .17) * sp * 1.5, 5.6, '#ff9ad0');
      }
    }

    collide() {
      const p = this.player;
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        const sx = b.px == null ? b.x : b.px, sy = b.py == null ? b.y : b.py;
        const dx = b.x - sx, dy = b.y - sy, len2 = dx * dx + dy * dy;
        for (let j = this.foes.length - 1; j >= 0; j--) {
          const f = this.foes[j], rr = f.r + b.r;
          /* 线段-圆距离：低帧率下子弹不会穿透敌机 */
          const t = len2 ? clamp(((f.x - sx) * dx + (f.y - sy) * dy) / len2, 0, 1) : 0;
          const cx = sx + dx * t, cy = sy + dy * t;
          if ((cx - f.x) * (cx - f.x) + (cy - f.y) * (cy - f.y) < rr * rr) {
            this.bullets.splice(i, 1);
            f.hp -= b.dmg;
            this.explode(cx, cy, f.color, 3);
            if (f.hp <= 0) this.killFoe(f);
            break;
          }
        }
      }
      for (let i = this.ebullets.length - 1; i >= 0; i--) {
        const b = this.ebullets[i], rr = b.r + p.r * .8;
        if (d2(b, p) < rr * rr) { this.ebullets.splice(i, 1); this.hitPlayer(); }
      }
      for (const f of this.foes) {
        const rr = f.r * .82 + p.r * .82;
        if (d2(f, p) < rr * rr) { this.hitPlayer(); break; }
      }
    }

    killFoe(f) {
      const idx = this.foes.indexOf(f);
      if (idx < 0) return;
      this.foes.splice(idx, 1);
      const isBoss = f === this.boss;
      this.score += f.score;
      this.kills++;
      if (this.score > this.best) this.best = this.score;
      this.explode(f.x, f.y, f.color, isBoss ? 42 : 14);
      this.floatText('+' + f.score, f.x, f.y, '#ffd88a');
      Sfx.explode(isBoss);
      this.shake = Math.max(this.shake, isBoss ? 14 : 3);
      if (isBoss) {
        this.boss = null;
        this.bossBar.classList.remove('on');
        this.flash = .8;
        this.toast('首领击破 · +' + f.score);
        ['power', 'shield', 'bomb'].forEach((k, i) => this.drop(f.x + (i - 1) * 42, f.y, k));
      } else if (Math.random() < (f.type === 'tank' ? .42 : .12)) {
        this.drop(f.x, f.y);
      }
      this.syncHud(true);
    }

    drop(x, y, kind) {
      if (!kind) {
        const pool = ['power', 'power', 'shield', 'life', 'bomb'];
        kind = pool[Math.floor(Math.random() * pool.length)];
      }
      this.drops.push({ x: clamp(x, 16, W - 16), y: y, r: 12, kind: kind });
    }

    applyDrop(d) {
      let msg = '';
      if (d.kind === 'power') {
        if (this.power < 5) { this.power++; msg = '火力提升 · Lv.' + this.power; }
        else { this.score += 300; if (this.score > this.best) this.best = this.score; msg = '火力已满 · +300'; }
      } else if (d.kind === 'shield') { this.player.shield = 8; msg = '能量护盾 · 8 秒'; }
      else if (d.kind === 'life') { this.lives = Math.min(5, this.lives + 1); msg = '凤凰重生 · +1 命'; }
      else { this.bombs = Math.min(5, this.bombs + 1); msg = '涅槃之火 · +1'; }
      Sfx.power();
      this.explode(d.x, d.y, DROP[d.kind].c, 9);
      this.floatText(msg, d.x, d.y, DROP[d.kind].c);
      this.toast(msg);
      this.syncHud(true);
    }

    hitPlayer() {
      if (this.mode !== 'running' || this.player.invuln > 0) return;
      const p = this.player;
      if (p.shield > 0) {
        p.shield = 0; p.invuln = .8;
        this.explode(p.x, p.y, '#6ee7ff', 14);
        this.toast('护盾破碎');
        this.shake = 6;
        Sfx.hit();
        return;
      }
      this.lives--;
      this.power = Math.max(1, this.power - 1);
      p.invuln = 2.2;
      this.shake = 11; this.flash = .65;
      this.explode(p.x, p.y, '#ffb357', 22);
      Sfx.hit();
      this.toast('战机受损 · 剩余 ' + Math.max(0, this.lives) + ' 命');
      this.syncHud(true);
      if (this.lives <= 0) this.gameOver();
    }

    bomb() {
      if (this.mode !== 'running' || this.bombs <= 0) return;
      const p = this.player;
      this.bombs--;
      this.ebullets.length = 0;
      p.invuln = Math.max(p.invuln, 1.3);
      this.flash = 1; this.shake = 15;
      Sfx.bomb();
      for (const f of this.foes.slice()) {
        f.hp -= 170;
        if (f.hp <= 0) this.killFoe(f);
        else this.explode(f.x, f.y, '#ff9a3c', 5);
      }
      for (let i = 0; i < 52; i++) {
        const a = (i / 52) * TAU, sp = rnd(180, 440);
        this.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rnd(.35, .75), max: .75, r: rnd(2, 5), c: i % 2 ? '#ffd06a' : '#ff5b2e' });
      }
      this.toast('涅槃之火 · 全屏清场');
      this.syncHud(true);
    }

    gameOver() {
      this.mode = 'over';
      this.best = Math.max(this.best, this.score);
      OS.store.set('phoenixBest', this.best);
      /* 得分大于 0 才算一局有效战绩，避免开局即坠机刷出 0 分记录 */
      if (this.score > 0) {
        Ladder.submit({ name: Ladder.player(), score: this.score, wave: this.wave, kills: this.kills });
      }
      this.explode(this.player.x, this.player.y, '#ffd88a', 46);
      this.flash = 1; this.shake = 16;
      Sfx.over();
      this.syncHud(true);
      this.showOverlay('over');
      this.syncTools();
    }

    explode(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), sp = rnd(40, 250);
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rnd(.25, .7), max: .7, r: rnd(1.4, 4.6),
          c: Math.random() < .5 ? color : (Math.random() < .5 ? '#ffd27a' : '#fff2cf') });
      }
      if (this.parts.length > 460) this.parts.splice(0, this.parts.length - 460);
    }

    floatText(text, x, y, color) {
      this.texts.push({ text: text, x: x, y: y, c: color, life: .9, max: .9 });
      if (this.texts.length > 24) this.texts.shift();
    }

    toast(msg) {
      this.toastEl.textContent = msg;
      this.toastEl.classList.add('on');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.toastEl.classList.remove('on'), 1700);
    }

    /* ---------- 流程控制 ---------- */
    start() {
      this.reset();
      this.mode = 'running';
      this.boardResume = false;
      this.confirmClear = false;
      this.hideOverlay();
      Sfx.start();
      this.syncTools();
      this.syncHud(true);
      this.toast('第 1 波 · 凤凰出击');
    }

    pause(auto) {
      if (this.mode !== 'running') return;
      this.mode = 'paused';
      this.pauseReason = auto
        ? (this.overlayOpen() ? '系统浮层已打开，游戏自动暂停' : '窗口失去焦点，游戏已自动暂停')
        : '按 P 或点击「继续游戏」返回战场';
      this.keys = Object.create(null);
      this.showOverlay('paused');
      this.syncTools();
    }

    resume() {
      if (this.mode !== 'paused') return;
      this.mode = 'running';
      this.boardResume = false;
      this.hideOverlay();
      this.syncTools();
    }

    togglePause() {
      if (this.mode === 'running') this.pause(false);
      else if (this.mode === 'paused') this.resume();
      else this.start();
    }

    primaryAction() {
      if (this.mode === 'paused') this.resume();
      else this.start();
    }

    /* ---------- 天梯榜交互 ---------- */
    prevKind() {
      return this.overlayMode || (this.mode === 'over' ? 'over' : this.mode === 'paused' ? 'paused' : 'ready');
    }

    openRanks() {
      if (this.overlayMode === 'ranks') return;
      if (this.mode === 'running') {
        /* 查看榜单时自动暂停，避免后台继续跑分 */
        this.mode = 'paused';
        this.pauseReason = '查看天梯榜，游戏已暂停';
        this.keys = Object.create(null);
        this.boardResume = true;
        this.syncTools();
      } else {
        this.boardResume = false;
      }
      this.prevOverlay = this.prevKind();
      this.showOverlay('ranks');
    }

    closeRanks() {
      /* 游戏进行中直接收起浮层，避免出现「界面是开始页、后台还在跑分」 */
      if (this.mode === 'running') {
        this.boardResume = false;
        this.hideOverlay();
        this.syncTools();
        return;
      }
      if (this.boardResume) { this.resume(); return; }
      this.showOverlay(this.prevOverlay || this.prevKind());
    }

    openHelp() {
      if (this.overlayMode === 'help') return;
      this.prevOverlay = this.prevKind();
      this.showOverlay('help');
    }

    back() { this.showOverlay(this.prevOverlay || this.prevKind()); }

    savePlayerName() {
      const input = this.overlay.querySelector('.px-name-input');
      if (!input) return;
      const name = Ladder.setPlayer(input.value);
      this.showOverlay('ranks');
      const next = this.overlay.querySelector('.px-name-input');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
      this.toast('当前玩家 · ' + name);
    }

    clearScores() {
      if (!this.confirmClear) {
        this.confirmClear = true;
        clearTimeout(this.clearTimer);
        this.clearTimer = setTimeout(() => {
          this.confirmClear = false;
          if (this.overlayMode === 'ranks') this.showOverlay('ranks');
        }, 6000);
        this.showOverlay('ranks');
        return;
      }
      Ladder.clear();
      this.confirmClear = false;
      clearTimeout(this.clearTimer);
      this.showOverlay('ranks');
      this.toast('本机战绩已清空');
    }

    rankHtml() {
      const byRuns = this.boardTab === 'runs';
      const list = byRuns ? Ladder.recent(8) : Ladder.players();
      const me = Ladder.player();
      if (!list.length) {
        return '<div class="px-rank-empty">' +
          (byRuns ? '还没有本机战绩，打一局就能上榜' : '暂无玩家成绩') + '</div>';
      }
      const medal = ['', '①', '②', '③'];
      return '<div class="px-rank-list">' + list.map((e) => {
        const isMe = !e.demo && e.name === me;
        const sub = e.demo ? '本机预置基准'
          : byRuns ? ('第 ' + e.wave + ' 波 · ' + e.kills + ' 击落 · ' + (fmtDate(e.ts) || '—'))
            : ('第 ' + e.wave + ' 波 · ' + e.plays + ' 局 · ' + (fmtDate(e.ts) || '—'));
        return '<div class="px-rank-row' + (isMe ? ' me' : '') + (e.rank <= 3 ? ' top' : '') + '">' +
          '<span class="px-rank-no' + (e.rank <= 3 ? ' m' + e.rank : '') + '">' +
            (e.rank <= 3 ? medal[e.rank] : e.rank) + '</span>' +
          '<span class="px-avatar">' + OS.esc(e.name.slice(0, 1)) + '</span>' +
          '<span class="px-rank-who"><b><span class="px-rank-nm">' + OS.esc(e.name) + '</span>' +
            (isMe ? '<i class="px-tag you">你</i>' : '') +
            (e.demo ? '<i class="px-tag demo">预置</i>' : '') +
            '</b><small>' + sub + '</small></span>' +
          '<span class="px-rank-score">' + scoreText(e.score) + '</span>' +
        '</div>';
      }).join('') + '</div>';
    }

    showOverlay(kind) {
      this.overlayMode = kind;
      const best = OS.store.get('phoenixBest', 0) || 0;
      const me = Ladder.player();
      const rank = Ladder.rankOf(me);
      const keyRow = (k, v) => '<div class="px-krow"><kbd>' + k + '</kbd><span>' + v + '</span></div>';
      const mobile = OS.isMobile();
      const ladderBtn = '<button class="px-btn ghost" data-act="ranks">天梯榜 <span>' + (mobile ? '榜单' : 'L') + '</span></button>';
      /* 移动端没有键盘，操作说明改成触屏手势与标题栏按钮 */
      const moveRow = keyRow(mobile ? '拖动屏幕' : 'W A S D / ↑ ↓ ← →', '移动战机');
      const bombRow = keyRow(mobile ? '点按「爆」按钮' : '空格 / B', '涅槃之火 · 清场');
      const sysRow = keyRow(mobile ? '标题栏按钮' : 'P / N / M / L', '暂停 / 新局 / 音效 / 天梯榜');
      const startKey = mobile ? 'GO' : '⏎';
      let html = '';
      if (kind === 'ready') {
        html =
          '<div class="px-emblem">' + OS.icon('phoenix') + '</div>' +
          '<div class="px-kicker">WEBOS ARCADE · 198X</div>' +
          '<h1 class="px-title">凤凰战机</h1>' +
          '<div class="px-sub">PHOENIX STRIKE</div>' +
          '<p class="px-desc">驾驶不死火鸟穿越弹幕，击落敌机与首领，<br>收集道具强化火力，刷新你的最高分。</p>' +
          '<div class="px-keys">' +
            moveRow + keyRow('自动', '持续开火') + bombRow + sysRow +
          '</div>' +
          '<div class="px-btns"><button class="px-btn" data-act="start">开始游戏 <span>' + startKey + '</span></button>' +
            ladderBtn + '</div>' +
          '<div class="px-best">历史最高分 <b>' + scoreText(best) + '</b> · ' + OS.esc(me) +
            (rank.rank ? ' · 天梯第 ' + rank.rank + ' 名' : ' · 暂未上榜') + '</div>';
      } else if (kind === 'paused') {
        html =
          '<div class="px-emblem small">' + OS.icon('phoenix') + '</div>' +
          '<div class="px-kicker">PAUSED</div><h1 class="px-title small">已暂停</h1>' +
          '<p class="px-desc">' + OS.esc(this.pauseReason) + '</p>' +
          '<div class="px-stat"><div><span>当前得分</span><b>' + this.score + '</b></div>' +
          '<div><span>第几波</span><b>' + this.wave + '</b></div>' +
          '<div><span>剩余生命</span><b>' + this.lives + '</b></div></div>' +
          '<div class="px-btns"><button class="px-btn" data-act="resume">继续游戏 <span>P</span></button>' +
          '<button class="px-btn ghost" data-act="restart">重新开始</button>' +
          '<button class="px-btn ghost" data-act="help">操作说明</button>' +
          ladderBtn + '</div>';
      } else if (kind === 'over') {
        const record = this.score > this.startBest && this.score > 0;
        html =
          '<div class="px-emblem small dim">' + OS.icon('phoenix') + '</div>' +
          '<div class="px-kicker">GAME OVER</div><h1 class="px-title small">任务结束</h1>' +
          (record ? '<div class="px-record">✦ 新纪录 ✦</div>' : '') +
          '<div class="px-final">' + scoreText(this.score) + '</div>' +
          '<p class="px-desc">击落 ' + this.kills + ' 架敌机 · 抵达第 ' + this.wave + ' 波<br>历史最高分 ' + scoreText(best) + '</p>' +
          '<div class="px-ladder-line">' +
            (rank.rank
              ? '本机天梯 <b>第 ' + rank.rank + ' 名</b><span> / ' + rank.total + ' 位玩家</span>' +
                (rank.rank === 1 ? '<i>登顶</i>' : '')
              : '得分后即可登上本机天梯') +
          '</div>' +
          '<div class="px-btns"><button class="px-btn" data-act="restart">再来一局 <span>⏎</span></button>' +
            ladderBtn + '</div>';
      } else if (kind === 'ranks') {
        const byRuns = this.boardTab === 'runs';
        html =
          '<div class="px-kicker">LEADERBOARD · LOCAL</div>' +
          '<h1 class="px-title small">天梯榜</h1>' +
          '<p class="px-rank-note">按玩家最高分排名 · 成绩仅保存在本机浏览器</p>' +
          '<div class="px-rank-me">' +
            '<div><span>当前玩家</span><b>' + OS.esc(me) + '</b></div>' +
            '<div class="px-rank-me-rank">' + (rank.rank ? '第 <b>' + rank.rank + '</b> 名' : '暂未上榜') +
              '<small>' + (rank.rank ? '最高 ' + scoreText(rank.best) : '得分后即可上榜') + '</small></div>' +
          '</div>' +
          '<div class="px-rank-tabs">' +
            '<button class="' + (byRuns ? '' : 'on') + '" data-act="tab" data-tab="players">玩家排名</button>' +
            '<button class="' + (byRuns ? 'on' : '') + '" data-act="tab" data-tab="runs">单局战绩</button>' +
          '</div>' +
          this.rankHtml() +
          '<div class="px-rank-name">' +
            '<input class="px-name-input" type="text" maxlength="12" value="' + OS.esc(me) + '" ' +
              'placeholder="玩家名（最多 12 字）" spellcheck="false" aria-label="玩家名">' +
            '<button class="px-btn ghost" data-act="save-name">切换玩家</button>' +
          '</div>' +
          '<div class="px-rank-hint">输入不同名字即可新增玩家，输入已有名字可切换回去；各人成绩分别统计</div>' +
          '<div class="px-btns">' +
            '<button class="px-btn" data-act="close-ranks">返回 <span>Esc</span></button>' +
            '<button class="px-btn ghost' + (this.confirmClear ? ' danger' : '') + '" data-act="clear">' +
              (this.confirmClear ? '再点一次确认清空' : '清空本机战绩') + '</button>' +
          '</div>';
      } else {
        html =
          '<div class="px-kicker">HOW TO PLAY</div><h1 class="px-title small">操作说明</h1>' +
          '<div class="px-help">' +
            keyRow(mobile ? '拖动屏幕' : 'W A S D / 方向键', '移动战机；也可按住鼠标 / 触屏拖动') +
            keyRow('自动开火', '战机持续射击，无需按键') +
            keyRow(mobile ? '点按「爆」按钮' : '空格 / B', '释放「涅槃之火」，清除全部敌弹并重创敌机') +
            keyRow(mobile ? '标题栏按钮' : 'P / N / R', '暂停 / 新游戏 / 重新开始') +
            keyRow(mobile ? '标题栏按钮' : 'M / H / L', '音效 / 操作说明 / 天梯榜') +
          '</div>' +
          '<div class="px-legend">' +
            Object.keys(DROP).map((k) => '<span><i style="background:' + DROP[k].c + '">' + DROP[k].label + '</i>' + DROP[k].name + '</span>').join('') +
          '</div>' +
          '<p class="px-desc">每 5 波出现首领；被击中会降低火力等级。<br>每局得分自动计入天梯榜，按玩家名分别排名。</p>' +
          '<button class="px-btn" data-act="back">返回 <span>Esc</span></button>';
      }
      this.overlay.innerHTML = '<div class="px-panel' + (kind === 'ranks' ? ' ranks' : '') + '">' + html + '</div>';
      this.overlay.classList.remove('hidden');
      this.syncTools();
    }

    hideOverlay() {
      this.overlayMode = '';
      this.overlay.classList.add('hidden');
    }

    syncTools() {
      const t = this.win.toolsEl;
      if (!t) return;
      t.innerHTML =
        '<button class="tb-btn" data-px="pause" title="暂停 / 继续 (P)">' + OS.symbol(this.mode === 'running' ? 'pause' : 'play', 15) + '</button>' +
        '<button class="tb-btn" data-px="new" title="新游戏 (N)">' + OS.symbol('refresh', 15) + '</button>' +
        (OS.isMobile() ? '<button class="tb-btn" data-px="bomb" title="涅槃之火">爆</button>' : '') +
        '<button class="tb-btn' + (this.overlayMode === 'ranks' ? ' active' : '') + '" data-px="ranks" title="天梯榜 (L)">' + OS.symbol('trophy', 15) + '</button>' +
        '<button class="tb-btn' + (OS.phoenix.sound ? ' active' : '') + '" data-px="sound" title="音效 (M)">' + OS.symbol('volume', 15) + '</button>';
      t.querySelectorAll('[data-px]').forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.px;
        if (a === 'pause') this.togglePause();
        else if (a === 'new') this.start();
        else if (a === 'bomb') this.bomb();
        else if (a === 'ranks') { if (this.overlayMode === 'ranks') this.closeRanks(); else this.openRanks(); }
        else if (a === 'sound') OS.phoenix.toggleSound();
      }));
    }

    syncHud(force) {
      const set = (el, v) => { if (el && (force || el._v !== v)) { el._v = v; el.textContent = v; } };
      set(this.hud.score, String(this.score).padStart(6, '0'));
      set(this.hud.best, '最高 ' + this.best);
      set(this.hud.wave, '第 ' + this.wave + ' 波');
      set(this.hud.bombs, '✹ ' + this.bombs);
      if (this.hud.lives && (force || this.hud.lives._n !== this.lives)) {
        this.hud.lives._n = this.lives;
        this.hud.lives.innerHTML = Array.from({ length: Math.max(0, this.lives) }, () => '<i class="px-life"></i>').join('') || '<span class="px-none">—</span>';
      }
      if (this.hud.power && (force || this.hud.power._n !== this.power)) {
        this.hud.power._n = this.power;
        this.hud.power.innerHTML = Array.from({ length: 5 }, (_, i) => '<i class="' + (i < this.power ? 'on' : '') + '"></i>').join('');
      }
    }

    /* ---------- 绘制 ---------- */
    draw() {
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
      c.save();
      if (this.shake > .2) c.translate(rnd(-1, 1) * this.shake, rnd(-1, 1) * this.shake);
      this.drawBackground(c);
      this.drawStars(c);
      this.drawDrops(c);
      this.drawFoes(c);
      this.drawBullets(c);
      this.drawPlayer(c);
      this.drawParticles(c);
      this.drawTexts(c);
      c.restore();
      if (this.flash > 0) {
        c.fillStyle = 'rgba(255,196,132,' + (this.flash * .34).toFixed(3) + ')';
        c.fillRect(0, 0, W, this.H);
      }
    }

    drawBackground(c) {
      const g = c.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, '#090a1c'); g.addColorStop(.55, '#0d0a1b'); g.addColorStop(1, '#1c0a16');
      c.fillStyle = g; c.fillRect(0, 0, W, this.H);
      c.save(); c.globalAlpha = .18;
      for (let i = 0; i < 3; i++) {
        const y = ((this.t * 16 + i * this.H / 2.4) % (this.H + 260)) - 130;
        const x = W * (.2 + i * .3);
        const rg = c.createRadialGradient(x, y, 8, x, y, 190);
        rg.addColorStop(0, i % 2 ? 'rgba(120,70,210,.75)' : 'rgba(220,80,60,.55)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = rg; c.fillRect(0, y - 200, W, 400);
      }
      c.restore();
      c.strokeStyle = 'rgba(255,120,80,.06)'; c.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const y = (this.t * 34 + i * 84) % (this.H + 84);
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }
    }

    drawStars(c) {
      for (const s of this.stars) {
        c.globalAlpha = s.a * (.55 + .45 * Math.sin(this.t * 2 + s.x));
        c.fillStyle = s.s > 1.6 ? '#ffd9a8' : '#dce8ff';
        c.fillRect(s.x, s.y, s.s, s.s * 1.6);
      }
      c.globalAlpha = 1;
    }

    drawDrops(c) {
      for (const d of this.drops) {
        const meta = DROP[d.kind];
        c.save();
        c.translate(d.x, d.y);
        c.rotate(this.t * 1.8);
        c.shadowColor = meta.c; c.shadowBlur = 16;
        c.fillStyle = meta.c; c.globalAlpha = .9;
        c.fillRect(-9, -9, 18, 18);
        c.shadowBlur = 0; c.globalAlpha = 1;
        c.fillStyle = 'rgba(20,12,30,.72)';
        c.fillRect(-7, -7, 14, 14);
        c.restore();
        c.fillStyle = meta.c;
        c.font = 'bold 12px ' + 'monospace';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(meta.label, d.x, d.y + 1);
      }
    }

    drawFoes(c) {
      for (const f of this.foes) this.drawFoe(c, f);
    }

    drawFoe(c, f) {
      c.save();
      c.translate(f.x, f.y);
      if (f.type === 'boss') {
        const glow = c.createRadialGradient(0, 0, 8, 0, 0, f.r * 2.3);
        glow.addColorStop(0, 'rgba(190,90,255,.5)'); glow.addColorStop(1, 'rgba(190,90,255,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(0, 0, f.r * 2.3, 0, TAU); c.fill();
        c.rotate(this.t * .5);
        c.strokeStyle = 'rgba(220,150,255,.5)'; c.lineWidth = 3;
        c.beginPath(); c.arc(0, 0, f.r + 14, 0, TAU); c.stroke();
        c.rotate(-this.t * .5);
        for (const s of [-1, 1]) {
          c.save(); c.scale(s, 1);
          c.fillStyle = '#6d3aa8';
          c.beginPath(); c.moveTo(6, -10); c.lineTo(f.r + 30, -26); c.lineTo(f.r + 8, 12); c.lineTo(8, 16); c.closePath(); c.fill();
          c.restore();
        }
        c.fillStyle = '#2a1140';
        c.beginPath(); c.moveTo(0, -f.r); c.lineTo(f.r * .74, 0); c.lineTo(0, f.r); c.lineTo(-f.r * .74, 0); c.closePath(); c.fill();
        c.fillStyle = '#e9b6ff'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
        c.restore();
        return;
      }
      c.rotate(Math.sin(f.t * 2 + f.phase) * .12);
      c.shadowColor = f.color; c.shadowBlur = 14;
      c.fillStyle = f.color; c.globalAlpha = .92;
      c.beginPath();
      c.moveTo(0, -f.r); c.lineTo(f.r * .9, -f.r * .1); c.lineTo(f.r * .42, f.r * .78);
      c.lineTo(-f.r * .42, f.r * .78); c.lineTo(-f.r * .9, -f.r * .1); c.closePath(); c.fill();
      c.shadowBlur = 0; c.globalAlpha = 1;
      if (f.type === 'tank') {
        c.fillStyle = '#8f3350';
        c.fillRect(-f.r - 6, -4, 7, 12); c.fillRect(f.r - 1, -4, 7, 12);
      }
      c.fillStyle = 'rgba(12,10,28,.8)';
      c.beginPath(); c.arc(0, 0, f.r * .4, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.globalAlpha = .85;
      c.beginPath(); c.arc(0, 0, f.r * .16, 0, TAU); c.fill();
      c.globalAlpha = 1;
      c.restore();
    }

    drawBullets(c) {
      c.shadowColor = '#ffc65a'; c.shadowBlur = 10;
      c.fillStyle = '#ffe9a8';
      for (const b of this.bullets) c.fillRect(b.x - b.r, b.y - b.r * 2.6, b.r * 2, b.r * 5.2);
      c.shadowBlur = 0;
      for (const b of this.ebullets) {
        c.shadowColor = b.color; c.shadowBlur = 12;
        c.fillStyle = b.color;
        c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill();
      }
      c.shadowBlur = 0;
    }

    drawPlayer(c) {
      const p = this.player;
      if (this.mode === 'over') return;
      if (p.invuln > 0 && Math.floor(this.t * 12) % 2 === 0) return;
      c.save(); c.translate(p.x, p.y);
      const glow = c.createRadialGradient(0, 6, 2, 0, 6, 36);
      glow.addColorStop(0, 'rgba(255,160,60,.45)'); glow.addColorStop(1, 'rgba(255,90,30,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(0, 6, 36, 0, TAU); c.fill();
      const flap = Math.sin(this.t * 13) * .16;
      this.wing(c, -1, flap); this.wing(c, 1, flap);
      const bg = c.createLinearGradient(0, -20, 0, 20);
      bg.addColorStop(0, '#fff4c9'); bg.addColorStop(.5, '#ffb545'); bg.addColorStop(1, '#e34b26');
      c.fillStyle = bg;
      c.beginPath(); c.moveTo(0, -21); c.quadraticCurveTo(9, -8, 8, 6);
      c.lineTo(0, 18); c.lineTo(-8, 6); c.quadraticCurveTo(-9, -8, 0, -21); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,190,80,.85)';
      c.beginPath(); c.moveTo(-4, 14); c.lineTo(0, 27 + Math.sin(this.t * 22) * 5); c.lineTo(4, 14); c.closePath(); c.fill();
      c.fillStyle = '#fff8dd'; c.beginPath(); c.arc(0, -3, 3.6, 0, TAU); c.fill();
      c.restore();
      if (p.shield > 0) {
        c.strokeStyle = 'rgba(110,231,255,' + (.55 + .35 * Math.sin(this.t * 7)) + ')';
        c.lineWidth = 2;
        c.beginPath(); c.arc(p.x, p.y, 23 + Math.sin(this.t * 6) * 2, 0, TAU); c.stroke();
      }
    }

    wing(c, dir, flap) {
      c.save(); c.scale(dir, 1); c.rotate(flap * dir * .5);
      const g = c.createLinearGradient(0, -12, 30, 10);
      g.addColorStop(0, '#ffe9a0'); g.addColorStop(.5, '#ff9a34'); g.addColorStop(1, '#e6432c');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(2, -3); c.quadraticCurveTo(16, -17, 31, -10 - flap * 18);
      c.quadraticCurveTo(25, 2, 18, 10); c.quadraticCurveTo(10, 4, 2, 6); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,120,40,.7)';
      c.beginPath(); c.moveTo(4, 5); c.lineTo(27, 13 - flap * 10); c.lineTo(10, 13); c.closePath(); c.fill();
      c.restore();
    }

    drawParticles(c) {
      for (const p of this.parts) {
        c.globalAlpha = Math.max(0, p.life / p.max);
        c.fillStyle = p.c;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    }

    drawTexts(c) {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 13px ' + '-apple-system, sans-serif';
      for (const t of this.texts) {
        c.globalAlpha = Math.max(0, t.life / t.max);
        c.fillStyle = t.c;
        c.fillText(t.text, t.x, t.y);
      }
      c.globalAlpha = 1;
    }
  }

  /* ---------------- 供菜单栏调用的能力 ---------------- */
  OS.phoenix = {
    current: null,
    sound: OS.store.get('phoenixSound', true) !== false,
    best: () => OS.store.get('phoenixBest', 0) || 0,
    newGame() { if (this.current) this.current.start(); else OS.openApp('phoenix'); },
    togglePause() { if (this.current) this.current.togglePause(); else OS.openApp('phoenix'); },
    bomb() { if (this.current) this.current.bomb(); },
    help() { if (this.current) this.current.openHelp(); else OS.openApp('phoenix'); },
    leaderboard() {
      if (this.current) this.current.openRanks();
      else OS.openApp('phoenix', { ranks: true });
    },
    toggleSound() {
      this.sound = !this.sound;
      OS.store.set('phoenixSound', this.sound);
      if (this.current) this.current.syncTools();
      OS.toast('凤凰战机', this.sound ? '音效已开启' : '音效已静音', 'phoenix');
    }
  };

  /* ---------------- 应用视图 ---------------- */
  OS.appViews.phoenix = {
    render() {
      return '<div class="px-app">' +
        '<div class="px-hud">' +
          '<div class="px-hud-cell"><span class="px-label">SCORE</span><b class="px-score" data-score>000000</b></div>' +
          '<div class="px-hud-cell center"><span class="px-wave" data-wave>第 1 波</span>' +
            '<div class="px-power" data-power></div></div>' +
          '<div class="px-hud-cell right"><span class="px-label" data-best>最高 0</span>' +
            '<div class="px-lives" data-lives></div><span class="px-bombs" data-bombs>✹ 3</span></div>' +
        '</div>' +
        '<div class="px-stage">' +
          '<canvas></canvas>' +
          '<div class="px-boss"><span>BOSS</span><div class="px-boss-track"><i></i></div></div>' +
          '<div class="px-toast"></div>' +
          '<div class="px-overlay"></div>' +
        '</div>' +
        '<div class="px-foot">' +
          '<span><kbd>WASD</kbd> / <kbd>方向键</kbd> 移动</span><i>·</i>' +
          '<span>自动开火</span><i>·</i>' +
          '<span><kbd>空格</kbd> 涅槃之火</span><i>·</i>' +
          '<span><kbd>P</kbd> 暂停</span><i>·</i><span><kbd>M</kbd> 音效</span>' +
        '</div>' +
      '</div>';
    },
    mount(win) {
      if (win._phoenix) win._phoenix.destroy();
      const root = win.body.querySelector('.px-app');
      if (!root) return;
      const game = new PhoenixGame(win, root);
      win._phoenix = game;
      OS.phoenix.current = game;
      if (win.opts && win.opts.ranks) {
        delete win.opts.ranks;
        game.openRanks();
      }
    }
  };
})();
