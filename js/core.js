/* ============================================================
   WebOS · Core：状态、图标、壁纸、虚拟文件系统、工具函数
   ============================================================ */
(function () {
  'use strict';

  const OS = window.OS = {};
  let seq = 0;
  OS.uid = (p) => (p || 'id') + '_' + (++seq) + '_' + Math.random().toString(36).slice(2, 6);

  /* ---------------- 工具 ---------------- */
  OS.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  OS.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  OS.pad = (n) => String(n).padStart(2, '0');
  OS.round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  OS.$ = (sel, root) => (root || document).querySelector(sel);
  OS.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  OS.el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  OS.weekCN = WEEK_CN;
  OS.monthEN = MONTH_EN;
  OS.clockText = () => {
    const d = new Date();
    return OS.pad(d.getHours()) + ':' + OS.pad(d.getMinutes());
  };
  OS.dateText = () => {
    const d = new Date();
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK_CN[d.getDay()];
  };

  /* ---------------- 事件总线 ---------------- */
  const listeners = {};
  OS.on = (name, fn) => { (listeners[name] || (listeners[name] = [])).push(fn); };
  OS.emit = (name, data) => { (listeners[name] || []).forEach((f) => { try { f(data); } catch (e) { console.warn(e); } }); };

  /* ---------------- 本地存储 ---------------- */
  const memory = {};
  OS.store = {
    get(k, def) {
      try { const v = localStorage.getItem('webos.' + k); return v == null ? def : JSON.parse(v); }
      catch (e) { return k in memory ? memory[k] : def; }
    },
    set(k, v) {
      memory[k] = v;
      try { localStorage.setItem('webos.' + k, JSON.stringify(v)); } catch (e) { /* noop */ }
    }
  };

  /* ---------------- 状态 ---------------- */
  OS.state = {
    theme: OS.store.get('theme', 'dark'),
    wallpaper: OS.store.get('wallpaper', 'sonoma'),
    accent: OS.store.get('accent', 'auto'),
    dockSize: OS.store.get('dockSize', 52),
    dockMagnify: OS.store.get('dockMagnify', true),
    dockAutohide: OS.store.get('dockAutohide', false),
    reduceMotion: OS.store.get('reduceMotion', false),
    notes: OS.store.get('notes', null),
    volume: OS.store.get('volume', 62)
  };
  OS.save = (k, v) => { OS.state[k] = v; OS.store.set(k, v); OS.emit('settings', { key: k, value: v }); };

  OS.applyTheme = () => {
    let t = OS.state.theme;
    if (t === 'auto') t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  };
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (OS.state.theme === 'auto') OS.applyTheme();
    });
  }
  OS.applyAccent = () => {
    const root = document.documentElement;
    if (OS.state.accent === 'auto') {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-soft');
    } else {
      root.style.setProperty('--accent', OS.state.accent);
      root.style.setProperty('--accent-soft', OS.state.accent + '38');
    }
  };
  OS.setTheme = (t) => { OS.save('theme', t); OS.applyTheme(); OS.emit('theme', t); };
  OS.setWallpaper = (id) => { OS.save('wallpaper', id); OS.renderWallpaper(); OS.emit('wallpaper', id); };
  OS.setAccent = (c) => { OS.save('accent', c); OS.applyAccent(); };

  /* ---------------- 线性图标（24×24 stroke） ---------------- */
  const P = {
    'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    'chevron-down': '<path d="M5 9l7 7 7-7"/>',
    'chevron-up': '<path d="M5 15l7-7 7 7"/>',
    'arrow-left': '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4.5 12.5l5 5L20 6.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.1" fill="currentColor" stroke="none"/>',
    refresh: '<path d="M20.5 11a8.5 8.5 0 1 0-2.4 6.4"/><path d="M20.5 5.5V11H15"/>',
    wifi: '<path d="M2 8.6a15 15 0 0 1 20 0"/><path d="M5.4 12a10 10 0 0 1 13.2 0"/><path d="M8.9 15.4a5 5 0 0 1 6.2 0"/><circle cx="12" cy="19" r="1.15" fill="currentColor" stroke="none"/>',
    battery: '<rect x="2" y="8" width="17" height="9" rx="2.4"/><path d="M21 11v3"/><rect x="3.8" y="9.8" width="12.2" height="5.4" rx="1" fill="currentColor" stroke="none"/>',
    'control-center': '<rect x="2.5" y="4" width="8.5" height="7" rx="2.4"/><rect x="13" y="4" width="8.5" height="7" rx="2.4"/><rect x="2.5" y="13" width="8.5" height="7" rx="2.4"/><rect x="13" y="13" width="8.5" height="7" rx="2.4"/>',
    bluetooth: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/>',
    moon: '<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5 8.6 8.6 0 1 0 20.5 14.6z"/>',
    gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/>',
    play: '<path d="M7 4.4l12.2 7.6L7 19.6z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4.2" height="16" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2" fill="currentColor" stroke="none"/>',
    next: '<path d="M5 5l10.5 7L5 19z" fill="currentColor" stroke="none"/><rect x="17.5" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    prev: '<path d="M19 5L8.5 12 19 19z" fill="currentColor" stroke="none"/><rect x="4" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    volume: '<path d="M4 9h3.2L11.5 5.5v13L7.2 15H4z"/><path d="M15 9.2a4 4 0 0 1 0 5.6"/><path d="M18 6.6a8 8 0 0 1 0 10.8"/>',
    shuffle: '<path d="M3 6h3.5c3 0 4.5 2 6.5 6s3.5 6 7 6H21M18 3l3 3-3 3M3 18h3.5c2 0 3.3-.8 4.4-2.3M15.6 8.1c1-1.3 2.2-2.1 4.4-2.1H21M18 15l3 3-3 3"/>',
    repeat: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>',
    heart: '<path d="M12 20.5l-1.4-1.3C5.4 14.4 2.5 11.8 2.5 8.6A5.1 5.1 0 0 1 7.6 3.5c1.8 0 3.4.9 4.4 2.3 1-1.4 2.6-2.3 4.4-2.3a5.1 5.1 0 0 1 5.1 5.1c0 3.2-2.9 5.8-8.1 10.6z"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    sidebar: '<rect x="2.5" y="4" width="19" height="16" rx="2.6"/><path d="M9 4v16"/>',
    trash: '<path d="M4 7h16M9 7V4.2h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    folder: '<path d="M2.8 7.4a2.2 2.2 0 0 1 2.2-2.2h3.7l2.2 2.2h8.3a2.2 2.2 0 0 1 2.2 2.2v8a2.2 2.2 0 0 1-2.2 2.2H5a2.2 2.2 0 0 1-2.2-2.2z"/>',
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6.8V12l3.5 2.2"/>',
    bell: '<path d="M18 8.5a6 6 0 0 0-12 0c0 6-2 7-2 7h16s-2-1-2-7zM10 19a2 2 0 0 0 4 0"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z"/>',
    lock: '<rect x="4.5" y="10" width="15" height="11" rx="2.4"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
    star: '<path d="M12 2.8l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z"/>',
    command: '<path d="M9 6.5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v11a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    power: '<path d="M12 3v9M6.6 6.2a8 8 0 1 0 10.8 0"/>',
    restart: '<path d="M20.5 11a8.5 8.5 0 1 0-2.4 6.4"/><path d="M20.5 5.5V11H15"/><path d="M12 7.5V12l3 2"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.9 2-1.9 0-1.2-.9-2-1.9-2h-1.2a1.9 1.9 0 0 1 0-3.8h3.2c2.2 0 3.9-1.7 3.9-3.9C19.9 5.9 16.4 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
    display: '<rect x="2.5" y="4" width="19" height="13" rx="2.2"/><path d="M8 21h8M12 17v4"/>',
    sparkles: '<path d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
    pen: '<path d="M4 20l4.5-1 10.8-10.8a2 2 0 0 0-2.8-2.8L5.7 16.2z"/><path d="M14.5 6.5l3 3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.3v.5"/>',
    more: '<circle cx="5" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.35" fill="currentColor" stroke="none"/>',
    maximize: '<path d="M8.5 3H3v5.5M15.5 3H21v5.5M21 15.5V21h-5.5M3 15.5V21h5.5"/>',
    eye: '<path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.8"/>',
    terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2.4"/><path d="M6.5 9l3 3-3 3M11.5 15h5.5"/>',
    layout: '<rect x="2.5" y="4" width="19" height="16" rx="2.4"/><path d="M2.5 9h19M9 9v11"/>',
    dock: '<rect x="2" y="13" width="20" height="7" rx="2.4"/><path d="M6 16.5h.01M10 16.5h.01M14 16.5h.01M18 16.5h.01" stroke-width="2.4"/>',
    bubble: '<path d="M20.5 11.5a8 8 0 0 1-8 8 9 9 0 0 1-3.5-.7L4 20.5l1.5-4.3a8 8 0 1 1 15-4.7z"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2.4"/><circle cx="8.5" cy="9" r="1.8"/><path d="M4 17l5-5 3.5 3.5L16 12l4 4"/>',
    music: '<path d="M9 17.5V5.8l10-2v11.7"/><ellipse cx="6.5" cy="18" rx="2.5" ry="2"/><ellipse cx="16.5" cy="15.8" rx="2.5" ry="2"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    'external': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10"/>',
    'arrow-up': '<path d="M12 20V4M6 10l6-6 6 6"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
  };
  OS.symbol = (name, size) => {
    const s = size || 16;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (P[name] || '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/>') + '</svg>';
  };
  OS.appleLogo = (size, color) => {
    const s = size || 18;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="' + (color || 'currentColor') + '" aria-hidden="true">' +
      '<path d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.4z"/>' +
      '<path d="M14.2 5.9c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3z"/></svg>';
  };

  /* ---------------- 应用图标（100×100） ---------------- */
  const today = new Date();
  const LG = (id, c1, c2, vertical) =>
    '<linearGradient id="' + id + '" x1="0%" y1="0%" x2="' + (vertical ? '0%' : '100%') + '" y2="100%">' +
    '<stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>';
  const BG = (id, r) => '<rect x="4" y="4" width="92" height="92" rx="22" fill="url(#' + id + ')"/>';

  const ICONS = {
    finder(g) {
      return '<defs>' + LG(g + 'a', '#2aa9f0', '#0b62c4') + LG(g + 'b', '#e8f6ff', '#a9d8f7') + '</defs>' +
        '<rect x="4" y="4" width="92" height="92" rx="22" fill="url(#' + g + 'a)"/>' +
        '<path d="M50 4h24a22 22 0 0 1 22 22v66H50z" fill="url(#' + g + 'b)"/>' +
        '<path d="M50 4v92" stroke="#0d5aa8" stroke-width="1.4" opacity=".5"/>' +
        '<path d="M32 33v17M68 33v17" stroke="#12508c" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M24 63q26 21 52 0" fill="none" stroke="#12508c" stroke-width="3.4" stroke-linecap="round"/>' +
        '<ellipse cx="30" cy="41" rx="3.4" ry="5" fill="#12508c" opacity=".75"/><ellipse cx="70" cy="41" rx="3.4" ry="5" fill="#12508c" opacity=".75"/>';
    },
    launchpad(g) {
      const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1', '#5f27cd', '#54a0ff', '#ff9f43', '#00d2d3'];
      let squares = '';
      colors.forEach((c, i) => {
        const x = 20 + (i % 3) * 22, y = 20 + Math.floor(i / 3) * 22;
        squares += '<rect x="' + x + '" y="' + y + '" width="17" height="17" rx="4.5" fill="' + c + '" opacity=".92"/>';
      });
      return '<defs>' + LG(g + 'a', '#f2f3f7', '#c8ccd8') + '</defs>' + BG(g + 'a') +
        '<rect x="4" y="4" width="92" height="92" rx="22" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/>' + squares;
    },
    safari(g) {
      let ticks = '';
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24;
        const x1 = 50 + Math.sin(a) * 31, y1 = 50 - Math.cos(a) * 31;
        const x2 = 50 + Math.sin(a) * 36, y2 = 50 - Math.cos(a) * 36;
        ticks += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="#fff" stroke-width="1.2" opacity=".55"/>';
      }
      return '<defs>' + LG(g + 'a', '#3ec3f5', '#0a68d8') + LG(g + 'b', '#1b8be8', '#0b4fae') + '</defs>' +
        BG(g + 'a') + '<circle cx="50" cy="50" r="40" fill="#e9f5ff"/>' +
        '<circle cx="50" cy="50" r="36.5" fill="url(#' + g + 'b)"/>' + ticks +
        '<path d="M70 30L44 56l13 2z" fill="#ff4d4d"/><path d="M30 70l26-26-2 13z" fill="#f4f7ff"/>' +
        '<circle cx="50" cy="50" r="2.6" fill="#fff"/>';
    },
    terminal(g) {
      return '<defs>' + LG(g + 'a', '#3a3d46', '#131418') + '</defs>' + BG(g + 'a') +
        '<rect x="4" y="4" width="92" height="18" rx="22" fill="rgba(255,255,255,.10)"/>' +
        '<rect x="4" y="16" width="92" height="6" fill="rgba(255,255,255,.10)"/>' +
        '<path d="M22 40l13 11-13 11" fill="none" stroke="#7ee787" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M46 73h24" stroke="#e6e6e6" stroke-width="5" stroke-linecap="round"/>';
    },
    notes(g) {
      let lines = '';
      for (let i = 0; i < 6; i++) lines += '<path d="M20 ' + (44 + i * 9) + 'h60" stroke="#c9c9cf" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>';
      return '<defs>' + LG(g + 'a', '#ffd94a', '#f9b423') + '</defs>' +
        '<rect x="4" y="4" width="92" height="92" rx="22" fill="#fdfcf6"/>' +
        '<path d="M4 26V26a22 22 0 0 1 22-22h48a22 22 0 0 1 22 22v0H4z" fill="url(#' + g + 'a)"/>' +
        '<rect x="4" y="4" width="92" height="24" rx="22" fill="url(#' + g + 'a)"/>' +
        '<rect x="4" y="20" width="92" height="10" fill="url(#' + g + 'a)"/>' +
        '<path d="M4 30h92" stroke="rgba(0,0,0,.08)" stroke-width="1.4"/>' + lines;
    },
    calculator(g) {
      let keys = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const x = 13 + c * 19.5, y = 12 + r * 20;
        const op = c === 3;
        keys += '<rect x="' + x + '" y="' + y + '" width="16" height="16" rx="3.6" fill="' + (op ? '#ff9f0a' : 'rgba(255,255,255,.13)') + '"/>';
      }
      return '<defs>' + LG(g + 'a', '#4b4d55', '#222328') + '</defs>' + BG(g + 'a') +
        '<rect x="10" y="9" width="80" height="9" rx="3" fill="rgba(0,0,0,.35)"/>' +
        '<text x="86" y="18" text-anchor="end" font-size="10" fill="#fff" font-family="monospace" opacity=".75">0</text>' + keys;
    },
    calendar(g) {
      const d = String(today.getDate());
      return '<defs>' + LG(g + 'a', '#ffffff', '#ececf2') + '</defs>' + BG(g + 'a') +
        '<path d="M4 26a22 22 0 0 1 22-22h48a22 22 0 0 1 22 22v2H4z" fill="#ff453a"/>' +
        '<rect x="4" y="20" width="92" height="8" fill="#ff453a"/>' +
        '<text x="50" y="20" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing="1.2" fill="#fff" font-family="Helvetica,Arial">' + MONTH_EN[today.getMonth()] + '</text>' +
        '<text x="50" y="76" text-anchor="middle" font-size="46" font-weight="300" fill="#2c2c2e" font-family="Helvetica,Arial">' + d + '</text>' +
        '<text x="50" y="90" text-anchor="middle" font-size="8" letter-spacing="1" fill="#8e8e93" font-family="Helvetica,Arial">' + WEEK_CN[today.getDay()] + '</text>';
    },
    photos(g) {
      const cs = ['#ff5f57', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f'];
      let petals = '';
      cs.forEach((c, i) => { petals += '<ellipse cx="50" cy="30" rx="10" ry="20" fill="' + c + '" opacity=".82" transform="rotate(' + (i * 45) + ' 50 50)"/>'; });
      return '<defs>' + LG(g + 'a', '#ffffff', '#e8e8ee') + '</defs>' + BG(g + 'a') + '<g>' + petals + '</g>' +
        '<circle cx="50" cy="50" r="8" fill="#fff" opacity=".55"/>';
    },
    music(g) {
      return '<defs>' + LG(g + 'a', '#ff6a8b', '#e8386f') + LG(g + 'b', '#fa557c', '#b3207f') + '</defs>' + BG(g + 'a') +
        '<rect x="4" y="4" width="92" height="92" rx="22" fill="url(#' + g + 'b)" opacity=".45"/>' +
        '<path d="M62 22v43a11 11 0 1 1-7-10.2V32l-20 5v34a11 11 0 1 1-7-10.2V29z" fill="#fff" opacity=".96" transform="translate(6 0) scale(.92)"/>';
    },
    settings(g) {
      let teeth = '';
      for (let i = 0; i < 8; i++) teeth += '<rect x="45" y="14" width="10" height="19" rx="2.5" fill="#eceef3" transform="rotate(' + (i * 45) + ' 50 50)"/>';
      return '<defs>' + LG(g + 'a', '#9ea3af', '#575d6b') + LG(g + 'b', '#e8ebf1', '#aeb4c1') + '</defs>' + BG(g + 'a') +
        '<g>' + teeth + '</g><circle cx="50" cy="50" r="26" fill="url(#' + g + 'b)"/>' +
        '<circle cx="50" cy="50" r="17" fill="#6c7280"/><circle cx="50" cy="50" r="9" fill="#31343d"/>';
    },
    trash(g) {
      return '<defs>' + LG(g + 'a', '#e9edf4', '#9aa5b6') + '</defs>' +
        '<rect x="4" y="4" width="92" height="92" rx="22" fill="rgba(255,255,255,.14)"/>' +
        '<path d="M28 32h44l-4 52a6 6 0 0 1-6 5H38a6 6 0 0 1-6-5z" fill="url(#' + g + 'a)" opacity=".92"/>' +
        '<path d="M24 27h52v7H24z" rx="3" fill="#d8dee9"/>' +
        '<rect x="42" y="20" width="16" height="7" rx="3.5" fill="#d8dee9"/>' +
        '<g stroke="#7d889b" stroke-width="2.4" stroke-linecap="round" opacity=".65"><path d="M40 43v33M50 43v33M60 43v33"/></g>';
    },
    about(g) {
      return '<defs>' + LG(g + 'a', '#e7ebf2', '#aab2c2') + LG(g + 'b', '#2b3550', '#0d1330') + '</defs>' + BG(g + 'a') +
        '<rect x="18" y="20" width="64" height="45" rx="4" fill="#3a3f4b"/>' +
        '<rect x="21" y="23" width="58" height="39" rx="2.5" fill="url(#' + g + 'b)"/>' +
        '<path d="M21 47c14-10 26 4 40-6 6-4 12-3 18-1v22H21z" fill="#5b6fd6" opacity=".55"/>' +
        '<path d="M14 69h72l-6 7H20z" fill="#d5dae4"/><path d="M42 69h16l2 7H40z" fill="#b9c0cd"/>';
    },
    appstore(g) {
      return '<defs>' + LG(g + 'a', '#3aa9ff', '#0a5be0') + '</defs>' + BG(g + 'a') +
        '<g stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"><path d="M28 69L46 31"/><path d="M72 69L54 31"/><path d="M36 56h28"/></g>';
    },
    mail(g) {
      return '<defs>' + LG(g + 'a', '#5ec8ff', '#0a7be0') + '</defs>' + BG(g + 'a') +
        '<rect x="18" y="30" width="64" height="42" rx="7" fill="#fff"/>' +
        '<path d="M19 34l31 24 31-24" fill="none" stroke="#9db8d8" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M19 70l24-20M81 70L57 50" stroke="#c8d8ea" stroke-width="2.5"/>';
    },
    messages(g) {
      return '<defs>' + LG(g + 'a', '#6ff08a', '#1ab84a') + '</defs>' + BG(g + 'a') +
        '<path d="M50 20c-19 0-33 11-33 26 0 8 4.5 15 12 20-1 5-4 9-7 12 8-1 15-4 20-8 2.6.6 5.3.9 8 .9 19 0 33-11 33-25S69 20 50 20z" fill="#fff"/>';
    },
    maps(g) {
      return '<defs>' + LG(g + 'a', '#dff3d8', '#a9d9c2') + '</defs>' + BG(g + 'a') +
        '<path d="M4 76V26a22 22 0 0 1 22-22h48a22 22 0 0 1 22 22v50a22 22 0 0 1-22 22H26A22 22 0 0 1 4 76z" fill="#e9f4e2"/>' +
        '<path d="M4 54l28-14 22 12 20-16 22 10" fill="none" stroke="#fff" stroke-width="8"/>' +
        '<path d="M0 70l34-16 24 14 22-18 24 12" fill="none" stroke="#f7cf5b" stroke-width="5"/>' +
        '<path d="M64 14v72" stroke="#fff" stroke-width="4" opacity=".7"/>' +
        '<circle cx="50" cy="46" r="7" fill="#ff453a" stroke="#fff" stroke-width="3"/>';
    },
    weather(g) {
      return '<defs>' + LG(g + 'a', '#54b8ff', '#0a63d6') + '</defs>' + BG(g + 'a') +
        '<circle cx="38" cy="38" r="15" fill="#ffd84d"/>' +
        '<path d="M32 68a13 13 0 0 1 2-25 17 17 0 0 1 32 5 11 11 0 0 1 2 20z" fill="#fff" opacity=".95"/>';
    },
    folder(g) {
      return '<defs>' + LG(g + 'a', '#8ed0ff', '#2b8ae0') + LG(g + 'b', '#b9e2ff', '#5fb2f2') + '</defs>' +
        '<path d="M8 28a7 7 0 0 1 7-7h22l8 9h40a7 7 0 0 1 7 7v38a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7z" fill="url(#' + g + 'a)"/>' +
        '<path d="M8 38h84v37a7 7 0 0 1-7 7H15a7 7 0 0 1-7-7z" fill="url(#' + g + 'b)" opacity=".95"/>' +
        '<path d="M8 38h84" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>';
    },
    'file-text'(g) {
      let lines = '';
      for (let i = 0; i < 5; i++) lines += '<path d="M27 ' + (50 + i * 8) + 'h' + (i === 4 ? 30 : 46) + '" stroke="#b9bfca" stroke-width="2.6" stroke-linecap="round"/>';
      return '<defs>' + LG(g + 'a', '#ffffff', '#e6e9ef') + '</defs>' +
        '<path d="M22 10h42l18 18v60a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="url(#' + g + 'a)"/>' +
        '<path d="M64 10v18h18" fill="#cfd5df"/>' + lines;
    },
    'file-image'(g) {
      return '<defs>' + LG(g + 'a', '#ffffff', '#e6e9ef') + LG(g + 'b', '#8f7bf0', '#ee6fa8') + '</defs>' +
        '<path d="M22 10h42l18 18v60a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="url(#' + g + 'a)"/>' +
        '<path d="M64 10v18h18" fill="#cfd5df"/>' +
        '<rect x="27" y="42" width="46" height="38" rx="4" fill="url(#' + g + 'b)"/>' +
        '<circle cx="42" cy="55" r="5" fill="#ffe08a"/><path d="M28 76l14-14 10 9 9-8 12 13z" fill="rgba(255,255,255,.72)"/>';
    },
    'file-code'(g) {
      return '<defs>' + LG(g + 'a', '#2c2f3a', '#171922') + '</defs>' +
        '<rect x="14" y="10" width="72" height="80" rx="8" fill="url(#' + g + 'a)"/>' +
        '<circle cx="24" cy="20" r="2.6" fill="#ff5f57"/><circle cx="32" cy="20" r="2.6" fill="#febc2e"/><circle cx="40" cy="20" r="2.6" fill="#28c840"/>' +
        '<path d="M36 42l-9 8 9 8M56 42l9 8-9 8M50 38l-6 24" fill="none" stroke="#7ee787" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
    },
    disk(g) {
      return '<defs>' + LG(g + 'a', '#eef1f6', '#aab2c0') + '</defs>' +
        '<rect x="12" y="22" width="76" height="58" rx="8" fill="url(#' + g + 'a)"/>' +
        '<rect x="12" y="58" width="76" height="22" rx="8" fill="#c2c9d5"/>' +
        '<circle cx="72" cy="68" r="3" fill="#7d8798"/><rect x="24" y="34" width="34" height="6" rx="3" fill="#8d97a8" opacity=".6"/>';
    },
    clock(g) {
      return '<defs>' + LG(g + 'a', '#ffffff', '#e6e6ec') + '</defs>' + BG(g + 'a') +
        '<circle cx="50" cy="50" r="37" fill="#fafafd" stroke="#d5d5dc" stroke-width="2"/>' +
        '<path d="M50 50V27M50 50l16 11" stroke="#1c1c1e" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="50" cy="50" r="3.5" fill="#ff453a"/>';
    },
    reminder(g) {
      let dots = '';
      [['#ff453a', 30], ['#ff9f0a', 50], ['#0a84ff', 70]].forEach(([c, y]) => {
        dots += '<circle cx="30" cy="' + y + '" r="6" fill="' + c + '"/><path d="M44 ' + y + 'h32" stroke="#c8c8ce" stroke-width="3" stroke-linecap="round"/>';
      });
      return '<defs>' + LG(g + 'a', '#ffffff', '#ececf2') + '</defs>' + BG(g + 'a') + dots;
    },
    phoenix(g) {
      const gd = (k, c1, c2) => LG(g + k, c1, c2, true);
      const wing =
        '<path d="M49 47C39 31 27 23 11 18c5 10 4 18 9 25-6 1-10 6-13 13 13-1 25 2 34 9z" fill="url(#' + g + 'c)"/>' +
        '<path d="M49 51C38 45 28 45 18 48c8 5 13 11 16 18 7-5 12-8 17-9z" fill="url(#' + g + 'b)" opacity=".9"/>' +
        '<path d="M48 44C41 33 34 28 24 25c3 7 4 12 8 17 6 0 11 2 16 5z" fill="#ffe9ae" opacity=".8"/>';
      return '<defs>' +
        gd('a', '#3b1230', '#100813') + gd('b', '#ffeaa8', '#ff8a25') + gd('c', '#ff9f3c', '#d92d2a') +
        '<radialGradient id="' + g + 'd"><stop offset="0" stop-color="#ffb347" stop-opacity=".75"/><stop offset="1" stop-color="#ff6b2c" stop-opacity="0"/></radialGradient>' +
        '</defs>' + BG(g + 'a') +
        '<circle cx="50" cy="46" r="38" fill="url(#' + g + 'd)"/>' +
        '<g>' + wing + '<g transform="translate(100 0) scale(-1 1)">' + wing + '</g></g>' +
        '<path d="M50 65c-10 9-15 16-14 27 8-6 13-13 16-21z" fill="url(#' + g + 'c)"/>' +
        '<path d="M50 65c10 9 15 16 14 27-8-6-13-13-16-21z" fill="url(#' + g + 'c)"/>' +
        '<path d="M50 67c-3 10-2 19 0 28 2-9 3-18 0-28z" fill="url(#' + g + 'b)"/>' +
        '<path d="M50 30c6 0 10 6 10 14 0 12-4 24-10 34-6-10-10-22-10-34 0-8 4-14 10-14z" fill="url(#' + g + 'b)"/>' +
        '<path d="M50 23c3.4 0 6 3.2 6 7.4S53.4 38 50 38s-6-3.2-6-7.4S46.6 23 50 23z" fill="#fff1c2"/>' +
        '<path d="M55 29l9 3-9 3z" fill="#ffb347"/>' +
        '<circle cx="52" cy="28" r="1.5" fill="#4a1a08"/>' +
        '<circle cx="50" cy="50" r="3.4" fill="#fff8dc" opacity=".9"/>' +
        '<g fill="#ffe6a8" opacity=".9"><circle cx="22" cy="70" r="1.6"/><circle cx="78" cy="70" r="1.6"/><circle cx="50" cy="14" r="1.4"/></g>';
    },
    spotlight(g) {
      return '<defs>' + LG(g + 'a', '#6ea8ff', '#2a5bd7') + '</defs>' + BG(g + 'a') +
        '<circle cx="45" cy="45" r="22" fill="none" stroke="#fff" stroke-width="7"/>' +
        '<path d="M61 61l18 18" stroke="#fff" stroke-width="9" stroke-linecap="round"/>';
    }
  };
  OS.iconNames = Object.keys(ICONS);
  OS.icon = (name) => {
    const g = 'ic' + (++seq);
    const fn = ICONS[name] || ICONS['file-text'];
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + fn(g) + '</svg>';
  };

  /* ---------------- 壁纸 ---------------- */
  const WALLS = {
    sonoma: { name: '日落沙丘', colors: ['#1b1c46', '#513c8f', '#e59a72'] },
    ventura: { name: '深海蓝', colors: ['#071a3a', '#0e5a8f', '#26c6c0'] },
    monterey: { name: '流光紫', colors: ['#2b1055', '#7b4cc4', '#f08bb0'] },
    sunset: { name: '加州黄昏', colors: ['#3b2a6b', '#d95d6a', '#f8b26a'] }
  };
  OS.wallpapers = WALLS;
  OS.wallpaperSVG = (id, prefix) => {
    const p = (prefix || 'wp') + (++seq);
    const g = (n) => p + n;
    const head = '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">';
    let s = head;
    if (id === 'ventura') {
      s += '<defs>' +
        '<linearGradient id="' + g('a') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04122f"/><stop offset=".48" stop-color="#0e5a8f"/><stop offset="1" stop-color="#1fb7b2"/></linearGradient>' +
        '<radialGradient id="' + g('b') + '"><stop offset="0" stop-color="#7fe8ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fe8ff" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="' + g('c') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2ad9d0" stop-opacity=".75"/><stop offset="1" stop-color="#0a3f7a" stop-opacity=".1"/></linearGradient></defs>' +
        '<rect width="1600" height="1000" fill="url(#' + g('a') + ')"/>' +
        '<ellipse cx="1180" cy="220" rx="620" ry="420" fill="url(#' + g('b') + ')"/>' +
        '<path d="M0 560C260 430 520 690 820 560S1320 400 1600 540V1000H0Z" fill="#0a4d84" opacity=".62"/>' +
        '<path d="M0 680C300 540 560 810 900 660S1350 560 1600 660V1000H0Z" fill="url(#' + g('c') + ')"/>' +
        '<path d="M0 810C340 700 640 940 1000 800S1400 740 1600 800V1000H0Z" fill="#042f5e" opacity=".72"/>' +
        '<path d="M0 612C260 482 520 742 820 612S1320 452 1600 592" fill="none" stroke="#8ff0ff" stroke-width="2" opacity=".28"/>';
    } else if (id === 'monterey') {
      s += '<defs>' +
        '<linearGradient id="' + g('a') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b0b45"/><stop offset=".5" stop-color="#5b2b9e"/><stop offset="1" stop-color="#c25f9f"/></linearGradient>' +
        '<radialGradient id="' + g('b') + '"><stop offset="0" stop-color="#ff9ed6" stop-opacity=".85"/><stop offset="1" stop-color="#ff9ed6" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="' + g('c') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a98cff" stop-opacity=".9"/><stop offset="1" stop-color="#ffb0d0" stop-opacity=".2"/></linearGradient></defs>' +
        '<rect width="1600" height="1000" fill="url(#' + g('a') + ')"/>' +
        '<ellipse cx="1250" cy="260" rx="560" ry="440" fill="url(#' + g('b') + ')"/>' +
        '<path d="M-100 780C240 380 620 940 980 520S1400 260 1700 420" fill="none" stroke="url(#' + g('c') + ')" stroke-width="180" opacity=".45" stroke-linecap="round"/>' +
        '<path d="M-100 900C260 520 660 1060 1020 660S1420 420 1700 560" fill="none" stroke="#ffd0ec" stroke-width="52" opacity=".2" stroke-linecap="round"/>' +
        '<path d="M0 840C320 620 620 1000 980 760S1380 620 1600 700V1000H0Z" fill="#2a1159" opacity=".55"/>' +
        '<ellipse cx="390" cy="220" rx="380" ry="260" fill="#8a5cff" opacity=".22"/>';
    } else if (id === 'sunset') {
      s += '<defs>' +
        '<linearGradient id="' + g('a') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f2358"/><stop offset=".42" stop-color="#a04478"/><stop offset=".72" stop-color="#ea755f"/><stop offset="1" stop-color="#f9c27b"/></linearGradient>' +
        '<radialGradient id="' + g('b') + '"><stop offset="0" stop-color="#fff0c0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd08a" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="1600" height="1000" fill="url(#' + g('a') + ')"/>' +
        '<circle cx="1050" cy="640" r="330" fill="url(#' + g('b') + ')"/>' +
        '<circle cx="1050" cy="640" r="92" fill="#ffe6a8" opacity=".85"/>' +
        '<path d="M0 720L240 560l180 130 220-230 260 300 200-160 260 210 240-140v330H0Z" fill="#4b2757" opacity=".72"/>' +
        '<path d="M0 830L280 700l220 120 260-140 240 170 300-130 300 90v190H0Z" fill="#2d1c48" opacity=".8"/>' +
        '<path d="M0 900h1600" stroke="#ffd9a8" stroke-width="3" opacity=".18"/>';
    } else { // sonoma
      s += '<defs>' +
        '<linearGradient id="' + g('a') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171a44"/><stop offset=".36" stop-color="#3f3080"/><stop offset=".68" stop-color="#96508f"/><stop offset="1" stop-color="#ef9c72"/></linearGradient>' +
        '<radialGradient id="' + g('b') + '"><stop offset="0" stop-color="#ffd3a3" stop-opacity=".92"/><stop offset="1" stop-color="#ffb98d" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="' + g('c') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb98d" stop-opacity=".85"/><stop offset="1" stop-color="#6b3a91" stop-opacity=".15"/></linearGradient></defs>' +
        '<rect width="1600" height="1000" fill="url(#' + g('a') + ')"/>' +
        '<circle cx="1120" cy="690" r="430" fill="url(#' + g('b') + ')"/>' +
        '<circle cx="1120" cy="700" r="88" fill="#ffe3bc" opacity=".62"/>' +
        '<path d="M0 640C280 500 520 760 820 620S1320 470 1600 610V1000H0Z" fill="#6a3d8f" opacity=".42"/>' +
        '<path d="M0 760C320 600 600 880 940 720S1380 620 1600 700V1000H0Z" fill="url(#' + g('c') + ')"/>' +
        '<path d="M0 900C340 800 680 1030 1020 880S1420 820 1600 870V1000H0Z" fill="#3a245f" opacity=".5"/>' +
        '<path d="M0 692C280 552 520 812 820 672S1320 522 1600 662" fill="none" stroke="#ffcba4" stroke-width="2" opacity=".3"/>';
    }
    return s + '</svg>';
  };
  OS.renderWallpaper = () => {
    const el = document.getElementById('wallpaper');
    if (el) el.innerHTML = OS.wallpaperSVG(OS.state.wallpaper, 'wall');
  };

  /* ---------------- 应用注册表 ---------------- */
  OS.apps = [
    { id: 'finder', name: '访达', en: 'Finder', icon: 'finder', w: 880, h: 560, dock: true, menu: ['文件', '编辑', '显示', '前往', '窗口', '帮助'] },
    { id: 'launchpad', name: '启动台', en: 'Launchpad', icon: 'launchpad', dock: true, overlay: true },
    { id: 'safari', name: 'Safari 浏览器', en: 'Safari', icon: 'safari', w: 940, h: 620, dock: true, menu: ['文件', '编辑', '显示', '历史记录', '书签', '窗口', '帮助'] },
    { id: 'mail', name: '邮件', en: 'Mail', icon: 'mail', w: 860, h: 580, dock: true, menu: ['文件', '编辑', '显示', '邮箱', '窗口', '帮助'] },
    { id: 'messages', name: '信息', en: 'Messages', icon: 'messages', w: 780, h: 560, dock: true, menu: ['文件', '编辑', '显示', '对话', '窗口', '帮助'] },
    { id: 'photos', name: '照片', en: 'Photos', icon: 'photos', w: 900, h: 600, dock: true, menu: ['文件', '编辑', '显示', '窗口', '帮助'] },
    { id: 'music', name: '音乐', en: 'Music', icon: 'music', w: 900, h: 600, dock: true, menu: ['文件', '编辑', '显示', '控制', '窗口', '帮助'] },
    { id: 'calendar', name: '日历', en: 'Calendar', icon: 'calendar', w: 860, h: 580, dock: true, menu: ['文件', '编辑', '显示', '窗口', '帮助'] },
    { id: 'notes', name: '备忘录', en: 'Notes', icon: 'notes', w: 900, h: 580, dock: true, menu: ['文件', '编辑', '显示', '窗口', '帮助'] },
    { id: 'calculator', name: '计算器', en: 'Calculator', icon: 'calculator', w: 300, h: 440, resizable: false, menu: ['文件', '编辑', '显示', '窗口', '帮助'] },
    { id: 'terminal', name: '终端', en: 'Terminal', icon: 'terminal', w: 740, h: 460, dock: true, menu: ['文件', '编辑', '显示', '窗口', '帮助'] },
    { id: 'settings', name: '系统设置', en: 'System Settings', icon: 'settings', w: 820, h: 580, dock: true, menu: ['文件', '编辑', '显示', '窗口', '帮助'] },
    { id: 'about', name: '关于本机', en: 'About This Mac', icon: 'about', w: 560, h: 470, resizable: false, menu: [] },
    { id: 'appstore', name: 'App Store', en: 'App Store', icon: 'appstore', w: 840, h: 580, menu: [] },
    { id: 'maps', name: '地图', en: 'Maps', icon: 'maps', w: 840, h: 580, menu: [] },
    { id: 'weather', name: '天气', en: 'Weather', icon: 'weather', w: 720, h: 520, menu: [] },
    { id: 'phoenix', name: '凤凰战机', en: 'Phoenix Strike', icon: 'phoenix', keywords: '游戏 街机 arcade shooter 射击 打飞机', w: 560, h: 720, dock: true, menu: ['文件', '游戏', '窗口', '帮助'] },
    { id: 'trash', name: '废纸篓', en: 'Trash', icon: 'trash', w: 720, h: 500, dock: true, menu: ['文件', '编辑', '显示', '窗口', '帮助'] }
  ];
  OS.appById = (id) => OS.apps.find((a) => a.id === id);
  OS.appName = (id) => { const a = OS.appById(id); return a ? a.name : id; };

  /* ---------------- 虚拟文件系统 ---------------- */
  const welcomeText =
    '欢迎使用 WebOS\n' +
    '================================\n\n' +
    '这是一个运行在浏览器里的桌面操作系统演示。\n' +
    '全部界面、图标与壁纸均由代码实时绘制，无需任何外部资源。\n\n' +
    '试试这些操作：\n' +
    '  · 拖动窗口标题栏移动窗口，拖拽边缘调整大小\n' +
    '  · 点击 Dock 图标打开应用，图标下方的小圆点表示正在运行\n' +
    '  · 按 Command/Ctrl + 空格 打开聚焦搜索\n' +
    '  · 按 F3 或 Ctrl + ↑ 进入调度中心\n' +
    '  · 点击菜单栏右上角时间打开通知中心\n' +
    '  · 在桌面空白处点击右键\n' +
    '  · 在系统设置里更换壁纸与外观\n' +
    '  · 在启动台打开「凤凰战机」，来一局街机空战\n\n' +
    '祝你玩得开心。';
  const file = (name, type, opts) => Object.assign({ name: name, type: type, size: '4 KB', modified: '2026年11月7日' }, opts || {});
  const dir = (name, children, opts) => Object.assign({ name: name, type: 'dir', icon: 'folder', children: children || [] }, opts || {});
  const appFiles = OS.apps.filter((a) => a.id !== 'launchpad' && a.id !== 'trash')
    .map((a) => file(a.name + '.app', 'app', { icon: a.icon, app: a.id, size: '12 MB' }));
  const photoFiles = ['晨曦.png', '海岸线.png', '城市夜色.png', '山间雾气.png', '秋日午后.png']
    .map((n, i) => file(n, 'image', { icon: 'file-image', photo: i, size: (2 + i) + '.4 MB' }));
  const musicFiles = ['Midnight Drive.m4a', 'Paper Planes.m4a', 'Blue Hour.m4a']
    .map((n) => file(n, 'audio', { icon: 'music', size: '8.2 MB' }));

  OS.fsRoot = dir('Macintosh HD', [
    dir('应用程序', appFiles),
    dir('系统', [dir('资源库', [file('系统配置.plist', 'text', { icon: 'file-code' })]), dir('框架', [])]),
    dir('用户', [
      dir('andi', [
        dir('桌面', [file('凤凰战机.app', 'app', { icon: 'phoenix', app: 'phoenix', size: '18 MB' })]),
        dir('文稿', [
          file('欢迎使用 WebOS.txt', 'text', { icon: 'file-text', content: welcomeText, size: '2 KB' }),
          file('项目计划.md', 'text', { icon: 'file-code', size: '6 KB', content: 'WebOS 项目计划\n\n阶段一 · 视觉体系\n  - 菜单栏、程序坞、毛玻璃\n  - 动态壁纸与深浅外观\n\n阶段二 · 窗口系统\n  - 拖拽、缩放、层级、最小化\n  - 调度中心与聚焦搜索\n\n阶段三 · 内置应用\n  - 访达 / Safari / 终端 / 备忘录\n  - 计算器 / 日历 / 照片 / 音乐 / 设置\n\n阶段四 · 打磨\n  - 交互动效与键盘快捷键\n  - 状态持久化' }),
          file('设计稿.png', 'image', { icon: 'file-image', photo: 2 }),
          file('index.html', 'text', { icon: 'file-code', size: '3 KB', content: '<!DOCTYPE html>\n<html>\n  <head><title>WebOS</title></head>\n  <body>Hello, world.</body>\n</html>' })
        ]),
        dir('下载', [file('WebOS-1.0.dmg', 'disk', { icon: 'disk', size: '128 MB' }), file('壁纸合集.zip', 'archive', { icon: 'file-text', size: '42 MB' })]),
        dir('图片', photoFiles),
        dir('音乐', musicFiles),
        dir('影片', [])
      ])
    ]),
    dir('资源库', [dir('字体', []), dir('桌面图片', [])])
  ], { icon: 'disk' });

  OS.fs = {
    root: OS.fsRoot,
    get(path) {
      let node = OS.fsRoot;
      const p = Array.isArray(path) ? path.slice() : [path];
      if (p[0] === OS.fsRoot.name) p.shift();
      for (const seg of p) {
        if (!node || node.type !== 'dir') return null;
        node = (node.children || []).find((c) => c.name === seg);
        if (!node) return null;
      }
      return node;
    },
    label(path) { return (path || []).join(' / '); },
    home: ['Macintosh HD', '用户', 'andi'],
    desktopPath: ['Macintosh HD', '用户', 'andi', '桌面'],
    documentsPath: ['Macintosh HD', '用户', 'andi', '文稿'],
    picturesPath: ['Macintosh HD', '用户', 'andi', '图片'],
    downloadsPath: ['Macintosh HD', '用户', 'andi', '下载'],
    applicationsPath: ['Macintosh HD', '应用程序'],
    welcomeText: welcomeText
  };

  /* ---------------- 通知 ---------------- */
  OS.toast = (title, msg, icon) => {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    const t = OS.el('div', 'toast',
      '<div class="t-icon">' + OS.icon(icon || 'about') + '</div>' +
      '<div><b>' + OS.esc(title) + '</b><p>' + OS.esc(msg || '') + '</p></div>');
    stack.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3600);
  };

  /* ---------------- 全局便利 ---------------- */
  OS.isCmd = (e) => e.metaKey || e.ctrlKey;
  OS.openApp = (id, opts) => { OS.emit('open-app', { id: id, opts: opts || {} }); };
})();
