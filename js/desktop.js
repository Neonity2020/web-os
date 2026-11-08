/* ============================================================
   WebOS · Desktop Shell
   菜单栏 / 程序坞 / 桌面 / 启动台 / 聚焦 / 通知中心 / 快捷键
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  const $ = OS.$;

  /* ---------------- 下拉菜单框架 ---------------- */
  const menuLayer = () => document.getElementById('menu-layer');
  let currentDropdown = null, currentAnchor = null;

  function closeMenu() {
    menuLayer().innerHTML = '';
    OS.$$('.mb-item.active').forEach((x) => x.classList.remove('active'));
    currentDropdown = null; currentAnchor = null;
  }
  function showMenu(anchor, items, alignRight) {
    if (currentAnchor === anchor && currentDropdown) { closeMenu(); return; }
    closeMenu();
    const dd = OS.el('div', 'dropdown' + (alignRight ? ' align-right' : ''));
    const list = items.map((it, i) => Object.assign({}, it, { _i: i }));
    dd.innerHTML = list.map((it) => {
      if (it.sep) return '<div class="dd-sep"></div>';
      if (it.title) return '<div class="dd-title">' + OS.esc(it.title) + '</div>';
      return '<div class="dd-item' + (it.disabled ? ' disabled' : '') + '" data-mi="' + it._i + '">' +
        '<span class="dd-check">' + (it.checked ? '✓' : '') + '</span>' +
        (it.icon ? '<span class="dd-ico">' + OS.symbol(it.icon, 15) + '</span>' : '') +
        '<span>' + OS.esc(it.label) + '</span>' +
        (it.key ? '<span class="dd-key">' + OS.esc(it.key) + '</span>' : '') + '</div>';
    }).join('');
    menuLayer().appendChild(dd);
    const r = anchor.getBoundingClientRect();
    const w = dd.offsetWidth || 220;
    dd.style.left = (alignRight ? r.right - w : r.left) + 'px';
    dd.style.top = (r.bottom + 2) + 'px';
    anchor.classList.add('active');
    currentDropdown = dd; currentAnchor = anchor;
    dd.addEventListener('click', (e) => {
      const row = e.target.closest('[data-mi]'); if (!row) return;
      const it = list[+row.dataset.mi];
      if (it.disabled) return;
      closeMenu();
      if (it.action) it.action();
    });
  }

  /* ---------------- 右键菜单 ---------------- */
  OS.contextMenu = (e, items) => {
    e.preventDefault(); e.stopPropagation(); closeMenu();
    const cm = document.getElementById('context-menu');
    const list = items.map((it, i) => Object.assign({}, it, { _i: i }));
    cm.innerHTML = list.map((it) => {
      if (it.sep) return '<div class="dd-sep"></div>';
      if (it.title) return '<div class="dd-title">' + OS.esc(it.title) + '</div>';
      return '<div class="dd-item' + (it.disabled ? ' disabled' : '') + '" data-mi="' + it._i + '">' +
        '<span class="dd-check">' + (it.checked ? '✓' : '') + '</span>' +
        (it.icon ? '<span class="dd-ico">' + OS.symbol(it.icon, 15) + '</span>' : '') +
        '<span>' + OS.esc(it.label) + '</span>' +
        (it.key ? '<span class="dd-key">' + OS.esc(it.key) + '</span>' : '') + '</div>';
    }).join('');
    cm.classList.remove('hidden');
    const w = cm.offsetWidth, h = cm.offsetHeight;
    cm.style.left = Math.min(e.clientX, window.innerWidth - w - 8) + 'px';
    cm.style.top = Math.min(e.clientY, window.innerHeight - h - 8) + 'px';
    cm._list = list;
  };
  function closeContext() { document.getElementById('context-menu').classList.add('hidden'); }

  /* ---------------- 菜单栏 ---------------- */
  let activeAppId = 'finder';
  function appleMenuItems() {
    return [
      { label: '关于本机', action: () => OS.openApp('about') },
      { sep: true },
      { label: '系统设置…', icon: 'gear', action: () => OS.openApp('settings') },
      { label: 'App Store…', icon: 'star', action: () => OS.openApp('appstore') },
      { title: '最近使用的项目' },
      { label: '访达', icon: 'folder', action: () => OS.openApp('finder') },
      { label: '终端', icon: 'terminal', action: () => OS.openApp('terminal') },
      { sep: true },
      { label: '强制退出…', key: '⌥⌘⎋', action: () => {
        const w = OS.wm.active();
        if (w) { OS.wm.close(w); OS.toast('已强制退出', OS.appName(w.appId), w.def.icon); }
        else OS.toast('强制退出', '当前没有运行的应用程序', 'about');
      } },
      { sep: true },
      { label: '睡眠', icon: 'moon', action: OS.lockScreen },
      { label: '重新启动…', icon: 'restart', action: () => { OS.toast('重新启动', '系统正在重新启动…', 'about'); setTimeout(() => location.reload(), 900); } },
      { label: '关机…', icon: 'power', action: OS.shutdown },
      { label: '锁定屏幕', key: '⌃⌘Q', action: OS.lockScreen },
      { sep: true },
      { label: '退出登录 andi…', action: OS.lockScreen }
    ];
  }
  function appMenuItems() {
    const def = OS.appById(activeAppId) || { name: '访达' };
    return [
      { label: '关于 ' + def.name, action: () => OS.openApp('about') },
      { sep: true },
      { label: '设置…', key: '⌘,', action: () => OS.openApp('settings') },
      { sep: true },
      { label: '隐藏 ' + def.name, key: '⌘H', action: () => { const w = OS.wm.active(); if (w) OS.wm.minimize(w); } },
      { label: '隐藏其他', key: '⌥⌘H', disabled: true },
      { label: '显示全部', disabled: true },
      { sep: true },
      { label: '退出 ' + def.name, key: '⌘Q', action: () => OS.wm.windows.filter((w) => w.appId === activeAppId).forEach((w) => OS.wm.close(w)) }
    ];
  }
  function fileMenuItems() {
    return [
      { label: '新建窗口', key: '⌘N', action: () => OS.openApp('finder', { newInstance: true, path: OS.fs.home.slice() }) },
      { label: '新建文件夹', key: '⇧⌘N', action: () => OS.openApp('finder') },
      { label: '打开…', key: '⌘O', action: () => OS.toggleSpotlight(true) },
      { sep: true },
      { label: '关闭窗口', key: '⌘W', action: () => { const w = OS.wm.active(); if (w) OS.wm.close(w); } },
      { label: '显示简介', key: '⌘I', action: () => OS.showInfo({ name: OS.appName(activeAppId), type: 'app', icon: (OS.appById(activeAppId) || {}).icon, size: '12 MB' }) },
      { label: '打印…', key: '⌘P', disabled: true }
    ];
  }
  function editMenuItems() {
    const copy = (t) => { try { navigator.clipboard.writeText(t); } catch (e) {} OS.toast('已拷贝', t, 'notes'); };
    return [
      { label: '撤销', key: '⌘Z', disabled: true }, { label: '重做', key: '⇧⌘Z', disabled: true }, { sep: true },
      { label: '剪切', key: '⌘X', disabled: true },
      { label: '拷贝', key: '⌘C', action: () => copy(OS.appName(activeAppId)) },
      { label: '粘贴', key: '⌘V', disabled: true },
      { label: '全选', key: '⌘A', disabled: true }, { sep: true },
      { label: '自动填充', disabled: true }, { label: '开始听写…', key: 'Fn Fn', disabled: true }
    ];
  }
  function viewMenuItems() {
    return [
      { label: '为图标视图', key: '⌘1', action: () => OS.openApp('finder') },
      { label: '为列表视图', key: '⌘2', action: () => OS.openApp('finder') },
      { label: '为分栏视图', key: '⌘3', disabled: true }, { sep: true },
      { label: '显示工具栏', checked: true, disabled: true },
      { label: '显示状态栏', checked: true, disabled: true },
      { label: '显示路径栏', checked: true, disabled: true }, { sep: true },
      { label: '进入全屏幕', key: '⌃⌘F', action: () => { const w = OS.wm.active(); if (w) OS.wm.toggleMax(w); } }
    ];
  }
  function windowMenuItems() {
    const wins = OS.wm.list();
    return [
      { label: '最小化', key: '⌘M', action: () => { const w = OS.wm.active(); if (w) OS.wm.minimize(w); } },
      { label: '缩放', action: () => { const w = OS.wm.active(); if (w) OS.wm.toggleMax(w); } },
      { sep: true },
      { label: '前置全部窗口', action: () => wins.forEach((w) => OS.wm.focus(w)) },
      { label: '调度中心', key: 'F3', action: () => OS.wm.mission(true) },
      { sep: true },
      { title: '已打开的窗口' }
    ].concat(wins.length ? wins.map((w) => ({ label: w.def.name, checked: w === OS.wm.active(), icon: w.def.icon, action: () => OS.wm.focus(w) }))
      : [{ label: '没有已打开的窗口', disabled: true }]);
  }
  function helpMenuItems() {
    return [
      { label: 'WebOS 帮助', action: () => OS.openApp('textview', { title: 'WebOS 帮助', content: OS.fs.welcomeText }) },
      { label: '键盘快捷键', action: () => OS.toast('键盘快捷键', '⌘空格 聚焦 · F3 调度中心 · ⌘W 关闭窗口', 'about') },
      { sep: true },
      { label: '关于 WebOS', action: () => OS.openApp('about') }
    ];
  }
  function gameMenuItems() {
    const api = OS.phoenix, cur = api && api.current;
    return [
      { label: cur ? '开始新游戏' : '打开凤凰战机', key: 'N', action: () => api ? (cur ? api.newGame() : OS.openApp('phoenix')) : OS.openApp('phoenix') },
      { sep: true },
      { label: cur && cur.mode === 'paused' ? '继续游戏' : '暂停游戏', key: 'P', disabled: !cur, action: () => api && api.togglePause() },
      { label: '释放涅槃之火', key: '空格 / B', disabled: !cur, action: () => api && api.bomb() },
      { sep: true },
      { label: '音效：' + (api && api.sound ? '开' : '关'), key: 'M', action: () => api && api.toggleSound() },
      { label: '操作说明', key: 'H', disabled: !cur, action: () => api && api.help() }
    ];
  }
  const MENU_MAP = {
    '文件': fileMenuItems, '编辑': editMenuItems, '显示': viewMenuItems,
    '窗口': windowMenuItems, '帮助': helpMenuItems, '前往': fileMenuItems,
    '邮箱': fileMenuItems, '对话': fileMenuItems, '控制': viewMenuItems,
    '历史记录': fileMenuItems, '书签': fileMenuItems, '游戏': gameMenuItems
  };

  function renderMenubar() {
    const mb = document.getElementById('menubar');
    const def = OS.appById(activeAppId) || OS.appById('finder');
    const titles = def.menu && def.menu.length ? def.menu : ['文件', '编辑', '显示', '窗口', '帮助'];
    mb.innerHTML =
      '<div class="mb-item apple" data-menu="apple">' + OS.appleLogo(15) + '</div>' +
      '<div class="mb-item bold" data-menu="app">' + OS.esc(def.name) + '</div>' +
      titles.map((t, i) => '<div class="mb-item' + (i > 2 ? ' hide-sm' : '') + '" data-menu="' + t + '">' + t + '</div>').join('') +
      '<div class="mb-spacer"></div>' +
      '<div class="mb-right">' +
        '<div class="mb-status hide-xs" data-status="battery" title="电池">' + OS.symbol('battery', 20) + '</div>' +
        '<div class="mb-status" data-status="wifi" title="Wi-Fi">' + OS.symbol('wifi', 17) + '</div>' +
        '<div class="mb-status hide-xs" data-status="bluetooth" title="蓝牙">' + OS.symbol('bluetooth', 15) + '</div>' +
        '<div class="mb-status" data-status="control" title="控制中心">' + OS.symbol('control-center', 17) + '</div>' +
        '<div class="mb-status" data-status="spotlight" title="聚焦搜索 (⌘空格)">' + OS.symbol('search', 16) + '</div>' +
        '<div class="mb-clock" data-status="clock"></div>' +
      '</div>';
    updateClock();

    mb.querySelectorAll('[data-menu]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const k = item.dataset.menu;
        let list;
        if (k === 'apple') list = appleMenuItems();
        else if (k === 'app') list = appMenuItems();
        else list = (MENU_MAP[k] || helpMenuItems)();
        showMenu(item, list);
      });
      item.addEventListener('mouseenter', () => {
        if (currentDropdown && currentAnchor !== item) {
          const k = item.dataset.menu;
          const list = k === 'apple' ? appleMenuItems() : k === 'app' ? appMenuItems() : (MENU_MAP[k] || helpMenuItems)();
          showMenu(item, list);
        }
      });
    });
    mb.querySelectorAll('[data-status]').forEach((s) => s.addEventListener('click', (e) => {
      e.stopPropagation(); closeMenu();
      switch (s.dataset.status) {
        case 'spotlight': OS.toggleSpotlight(true); break;
        case 'clock': OS.toggleNotifications(); break;
        case 'control': OS.toggleNotifications(); break;
        case 'wifi': OS.toast('Wi-Fi', '已连接到 WebOS-Network · 状态良好', 'about'); break;
        case 'battery': OS.toast('电池', '100% · 电源适配器已连接', 'about'); break;
        case 'bluetooth': OS.toast('蓝牙', '已开启 · 未连接设备', 'about'); break;
      }
    }));
  }
  function updateClock() {
    const c = document.querySelector('.mb-clock');
    if (c) c.innerHTML = '<span class="date">' + OS.dateText() + '</span>&nbsp;&nbsp;' + OS.clockText();
    const lk = document.querySelector('.lk-time');
    if (lk) lk.textContent = OS.clockText();
    const lkd = document.querySelector('.lk-date');
    if (lkd) lkd.textContent = OS.dateText();
    const nc = document.querySelector('.nc-clock');
    if (nc) nc.textContent = OS.clockText();
    const w = document.querySelector('.w-big');
    if (w) w.textContent = OS.clockText();
  }

  /* ---------------- Dock ---------------- */
  const DOCK_IDS = ['finder', 'launchpad', 'safari', 'mail', 'messages', 'photos', 'music', 'calendar', 'notes', 'calculator', 'phoenix', 'terminal', 'settings', 'trash'];
  function renderDock() {
    const dock = document.getElementById('dock');
    dock.innerHTML = DOCK_IDS.map((id) => {
      const a = OS.appById(id); if (!a) return '';
      const sep = id === 'trash' ? '<div class="dock-sep"></div>' : '';
      return sep + '<div class="dock-item" data-app="' + id + '" title="' + OS.esc(a.name) + '">' +
        '<div class="dock-icon">' + OS.icon(a.icon) + '</div>' +
        '<div class="dock-dot"></div><div class="dock-tooltip">' + OS.esc(a.name) + '</div></div>';
    }).join('');
    dock.querySelectorAll('.dock-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.app;
        if (id === 'launchpad') { OS.toggleLaunchpad(true); return; }
        const win = OS.wm.byApp(id);
        if (win && win.state.minimized) OS.wm.restore(win);
        else if (win) OS.wm.focus(win);
        else { OS.openApp(id); item.classList.remove('bouncing'); void item.offsetWidth; item.classList.add('bouncing'); }
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const id = item.dataset.app, win = OS.wm.byApp(id);
        OS.contextMenu(e, [
          { label: win ? '显示 ' + OS.appName(id) : '打开 ' + OS.appName(id), action: () => win ? OS.wm.focus(win) : OS.openApp(id) },
          { sep: true },
          { label: '从程序坞中移除', disabled: true },
          { label: '显示简介', action: () => OS.showInfo({ name: OS.appName(id), type: 'app', icon: OS.appById(id).icon, size: '12 MB' }) }
        ]);
      });
    });
    dock.addEventListener('mousemove', (e) => {
      if (!OS.state.dockMagnify) return;
      const r = dock.getBoundingClientRect();
      dock.querySelectorAll('.dock-item').forEach((it) => {
        const cx = r.left + it.offsetLeft + it.offsetWidth / 2;
        const dist = Math.abs(e.clientX - cx);
        const scale = 1 + .46 * Math.max(0, 1 - dist / 115);
        it.style.transform = 'scale(' + scale.toFixed(3) + ') translateY(' + (-10 * (scale - 1) / .46).toFixed(1) + 'px)';
      });
    });
    dock.addEventListener('mouseleave', () => dock.querySelectorAll('.dock-item').forEach((it) => { it.style.transform = ''; }));
    refreshDock();
  }
  function refreshDock() {
    const wrap = document.getElementById('dock-wrap');
    wrap.style.setProperty('--dock-size', OS.state.dockSize + 'px');
    wrap.classList.toggle('autohide', !!OS.state.dockAutohide);
    document.querySelectorAll('.dock-item').forEach((it) => {
      it.classList.toggle('running', OS.wm.windows.some((w) => w.appId === it.dataset.app));
    });
  }

  /* ---------------- 桌面图标 & 小组件 ---------------- */
  const DESKTOP_ICONS = [
    { name: 'Macintosh HD', icon: 'disk', path: ['Macintosh HD'] },
    { name: '文稿', icon: 'folder', path: OS.fs.documentsPath },
    { name: '图片', icon: 'folder', path: OS.fs.picturesPath },
    { name: '欢迎使用 WebOS.txt', icon: 'file-text', path: OS.fs.documentsPath.concat('欢迎使用 WebOS.txt') },
    { name: '项目计划.md', icon: 'file-code', path: OS.fs.documentsPath.concat('项目计划.md') },
    { name: '凤凰战机.app', icon: 'phoenix', path: OS.fs.desktopPath.concat('凤凰战机.app') }
  ];
  function renderDesktop() {
    const box = document.getElementById('desktop-icons');
    box.innerHTML = DESKTOP_ICONS.map((d, i) =>
      '<div class="desktop-icon" data-i="' + i + '"><div class="di-img">' + OS.icon(d.icon) + '</div>' +
      '<div class="di-label">' + OS.esc(d.name) + '</div></div>').join('');
    box.addEventListener('click', (e) => {
      const it = e.target.closest('[data-i]');
      box.querySelectorAll('.desktop-icon').forEach((x) => x.classList.remove('selected'));
      if (it) it.classList.add('selected');
    });
    box.addEventListener('dblclick', (e) => {
      const it = e.target.closest('[data-i]'); if (!it) return;
      const d = DESKTOP_ICONS[+it.dataset.i], node = OS.fs.get(d.path);
      if (node) OS.openFile(node, d.path);
    });
    box.addEventListener('contextmenu', (e) => {
      const it = e.target.closest('[data-i]');
      if (!it) return;
      const d = DESKTOP_ICONS[+it.dataset.i];
      OS.contextMenu(e, [
        { label: '打开', action: () => OS.openFile(OS.fs.get(d.path), d.path) },
        { label: '显示简介', icon: 'info', action: () => OS.showInfo(Object.assign({ path: d.path.slice(0, -1).join('/') }, OS.fs.get(d.path))) },
        { sep: true },
        { label: '移到废纸篓', icon: 'trash', action: () => OS.toast('已移到废纸篓', d.name, 'trash') },
        { label: '重新命名', disabled: true }
      ]);
    });
    renderWidgets();
  }
  function renderWidgets() {
    const box = document.getElementById('desktop-widgets');
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<i class="dim">·</i>';
    for (let i = 1; i <= days; i++) cells += '<i class="' + (i === d.getDate() ? 'today' : '') + '">' + i + '</i>';
    box.innerHTML =
      '<div class="widget" data-open="weather"><div class="w-title">深圳 · 天气</div>' +
        '<div class="w-row"><div><div class="w-temp">22°</div><div class="w-sub">晴朗 · 最高 26° 最低 17°</div></div>' +
        '<div class="w-ico">' + OS.icon('weather') + '</div></div>' +
        '<div class="w-days">' + ['今', '日', '一', '二', '三'].map((x, i) => '<span>' + x + '<b>' + [22, 24, 23, 21, 20][i] + '°</b></span>').join('') + '</div></div>' +
      '<div class="widget calendar-widget" data-open="calendar"><div class="cw-head"><div class="w-title">' + y + '年 ' + (m + 1) + '月</div><b>' + OS.weekCN[d.getDay()] + ' ' + d.getDate() + '</b></div>' +
        '<div class="cal-grid">' + ['日', '一', '二', '三', '四', '五', '六'].map((x) => '<i class="dim">' + x + '</i>').join('') + cells + '</div></div>' +
      '<div class="widget" data-open="music"><div class="w-title">正在播放</div><div class="w-big">' + OS.clockText() + '</div>' +
        '<div class="w-sub">深夜电台 · WebOS Studio</div><div class="w-row"><span class="pill">' + OS.symbol('music', 12) + ' 音乐</span><span class="w-sub">放松时刻</span></div></div>';
    box.querySelectorAll('[data-open]').forEach((w) => w.addEventListener('click', () => OS.openApp(w.dataset.open)));
  }

  /* ---------------- 桌面右键 ---------------- */
  function desktopContext(e) {
    if (e.target.closest('.window, .dock, .menubar, .desktop-icons, .desktop-widgets')) return;
    const walls = Object.keys(OS.wallpapers);
    OS.contextMenu(e, [
      { label: '新建文件夹', icon: 'folder', action: () => { OS.openApp('finder', { path: OS.fs.desktopPath.slice() }); OS.toast('桌面', '在访达中新建一个文件夹吧', 'folder'); } },
      { sep: true },
      { title: '更改墙纸' }
    ].concat(walls.map((id) => ({ label: '　' + OS.wallpapers[id].name, checked: OS.state.wallpaper === id, action: () => OS.setWallpaper(id) }))).concat([
      { sep: true },
      { label: '整理图标', disabled: true },
      { label: '使用叠放', disabled: true },
      { label: '显示简介', icon: 'info', action: () => OS.showInfo({ name: '桌面', type: 'dir', icon: 'disk', size: '—' }) },
      { sep: true },
      { label: '锁定屏幕', icon: 'lock', action: OS.lockScreen },
      { label: '系统设置…', icon: 'gear', action: () => OS.openApp('settings') }
    ]));
  }

  /* ---------------- 聚焦搜索 Spotlight ---------------- */
  function collectFiles(node, path, out) {
    (node.children || []).forEach((c) => {
      const p = path.concat(c.name);
      out.push({ node: c, path: p });
      if (c.type === 'dir') collectFiles(c, p, out);
    });
    return out;
  }
  let spotResults = [], spotIndex = 0;
  function renderSpotResults(q) {
    const box = document.getElementById('spot-results');
    const query = q.trim().toLowerCase();
    spotResults = [];
    const apps = OS.apps.filter((a) => !a.hidden && (!query || a.name.toLowerCase().includes(query) || a.en.toLowerCase().includes(query) || a.id.includes(query) || (a.keywords || '').toLowerCase().includes(query)));
    apps.forEach((a) => spotResults.push({ kind: '应用程序', name: a.name, sub: a.en, icon: a.icon, action: () => OS.openApp(a.id) }));
    if (query) {
      collectFiles(OS.fs.root, [OS.fs.root.name], []).filter((f) => f.node.name.toLowerCase().includes(query))
        .slice(0, 6).forEach((f) => spotResults.push({
          kind: '文稿', name: f.node.name, sub: f.path.slice(0, -1).join(' / '), icon: f.node.icon || (f.node.type === 'dir' ? 'folder' : 'file-text'),
          action: () => OS.openFile(f.node, f.path)
        }));
      const expr = q.trim();
      if (/^[0-9+\-*/(). %]+$/.test(expr) && /[+\-*/]/.test(expr)) {
        try {
          const val = Function('"use strict";return (' + expr.replace(/%/g, '/100') + ')')();
          if (isFinite(val)) spotResults.unshift({ kind: '计算器', name: '= ' + OS.round(val, 6), sub: expr + ' 的结果', icon: 'calculator', action: () => OS.openApp('calculator') });
        } catch (err) { /* noop */ }
      }
      [['切换外观', () => OS.setTheme(OS.state.theme === 'dark' ? 'light' : 'dark'), 'palette'],
       ['打开聚焦搜索帮助', () => OS.toast('聚焦搜索', '输入应用名称、文件名或简单算式', 'spotlight'), 'info'],
       ['锁定屏幕', OS.lockScreen, 'lock']]
        .filter(([n]) => n.toLowerCase().includes(query) || query === '切换' || query === '锁定')
        .forEach(([n, fn, ic]) => spotResults.push({ kind: '操作', name: n, sub: 'WebOS', icon: ic, action: fn }));
    }
    if (!query) spotResults = spotResults.slice(0, 8);
    spotIndex = 0;
    if (!spotResults.length) {
      box.innerHTML = '<div class="spot-empty">没有找到与「' + OS.esc(q) + '」匹配的结果</div>';
      return;
    }
    let html = '', last = '';
    spotResults.forEach((r, i) => {
      if (r.kind !== last) { html += '<div class="spot-group-title">' + r.kind + '</div>'; last = r.kind; }
      html += '<div class="spot-result' + (i === 0 ? ' active' : '') + '" data-r="' + i + '">' +
        '<div class="sr-icon">' + OS.icon(r.icon) + '</div><span>' + OS.esc(r.name) + '</span>' +
        '<span class="sr-sub">' + OS.esc(r.sub || '') + '</span></div>';
    });
    box.innerHTML = html;
  }
  function toggleSpotlight(show) {
    const sp = document.getElementById('spotlight');
    const on = show == null ? sp.classList.contains('hidden') : show;
    if (on) {
      closeMenu(); closeContext(); OS.toggleLaunchpad(false); OS.toggleNotifications(false);
      sp.innerHTML = '<div class="spotlight-box"><div class="spot-input-row">' +
        '<span class="search-glyph">' + OS.symbol('search', 25) + '</span>' +
        '<input id="spot-input" placeholder="聚焦搜索" spellcheck="false" autocomplete="off"></div>' +
        '<div class="spot-results" id="spot-results"></div>' +
        '<div class="spot-footer"><span>↑↓ 选择</span><span>↵ 打开</span><span>esc 关闭</span><span>可搜索应用、文稿或直接计算</span></div></div>';
      sp.classList.remove('hidden');
      const input = document.getElementById('spot-input');
      renderSpotResults('');
      input.addEventListener('input', () => renderSpotResults(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { toggleSpotlight(false); return; }
        if (e.key === 'Enter') { execSpot(spotIndex); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (!spotResults.length) return;
          spotIndex = (spotIndex + (e.key === 'ArrowDown' ? 1 : -1) + spotResults.length) % spotResults.length;
          document.querySelectorAll('.spot-result').forEach((r, i) => r.classList.toggle('active', i === spotIndex));
          const active = document.querySelector('.spot-result.active'); if (active) active.scrollIntoView({ block: 'nearest' });
        }
      });
      setTimeout(() => input.focus(), 30);
    } else sp.classList.add('hidden');
  }
  function execSpot(i) {
    const r = spotResults[i]; if (!r) return;
    toggleSpotlight(false);
    setTimeout(r.action, 60);
  }
  OS.toggleSpotlight = toggleSpotlight;

  /* ---------------- 启动台 Launchpad ---------------- */
  function toggleLaunchpad(show) {
    const lp = document.getElementById('launchpad');
    const on = show == null ? lp.classList.contains('hidden') : show;
    if (!on) { lp.classList.add('hidden'); return; }
    closeMenu(); closeContext(); OS.toggleSpotlight(false); OS.toggleNotifications(false);
    const apps = OS.apps.filter((a) => !a.hidden && a.id !== 'launchpad');
    lp.innerHTML = '<div class="launchpad-search">' + OS.symbol('search', 15) + '<input class="lp-search" placeholder="搜索" spellcheck="false"></div>' +
      '<div class="launchpad-grid"></div>' +
      '<div class="launchpad-dots"><i class="on"></i><i></i></div>' +
      '<div class="launchpad-folder">' + Array.from({ length: 9 }, () => '<i></i>').join('') + '</div>';
    lp.classList.remove('hidden');
    const grid = lp.querySelector('.launchpad-grid'), input = lp.querySelector('.lp-search');
    const draw = (q) => {
      const list = apps.filter((a) => !q || a.name.toLowerCase().includes(q) || a.en.toLowerCase().includes(q) || (a.keywords || '').toLowerCase().includes(q));
      grid.innerHTML = list.map((a, i) => '<div class="lp-item" data-app="' + a.id + '" style="animation-delay:' + (i * 22) + 'ms">' +
        '<div class="lp-icon">' + OS.icon(a.icon) + '</div><span>' + OS.esc(a.name) + '</span></div>').join('') ||
        '<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,.7);font-size:13px;padding:40px">没有找到应用</div>';
    };
    draw('');
    input.addEventListener('input', () => draw(input.value.trim().toLowerCase()));
    grid.addEventListener('click', (e) => {
      const it = e.target.closest('[data-app]'); if (!it) return;
      const id = it.dataset.app;
      toggleLaunchpad(false);
      setTimeout(() => OS.openApp(id), 120);
    });
    lp.addEventListener('click', (e) => { if (e.target === lp) toggleLaunchpad(false); }, { once: true });
    setTimeout(() => input.focus(), 40);
  }
  OS.toggleLaunchpad = toggleLaunchpad;
  OS.on('launchpad', () => toggleLaunchpad(true));

  /* ---------------- 通知中心 ---------------- */
  function toggleNotifications(show) {
    const nc = document.getElementById('notification-center');
    const on = show == null ? !nc.classList.contains('open') : show;
    if (on && !nc.dataset.ready) {
      nc.innerHTML = '<div class="nc-grid">' +
        '<div class="nc-card"><div class="nc-label">时钟</div><div class="nc-value nc-clock">' + OS.clockText() + '</div><div class="nc-foot">' + OS.dateText() + '</div></div>' +
        '<div class="nc-card"><div class="nc-label">天气 · 深圳</div><div class="nc-value">22°</div><div class="nc-foot">晴朗 · 最高 26°</div></div>' +
        '<div class="nc-card"><div class="nc-label">电池</div><div class="nc-value">100%</div><div class="nc-foot">已接通电源</div></div>' +
        '<div class="nc-card"><div class="nc-label">屏幕使用时间</div><div class="nc-value">1时 24分</div><div class="nc-foot">比昨天少 12%</div></div>' +
        '</div><div class="nc-title"><span>通知</span><span class="nc-clear">全部清除</span></div><div class="nc-notifs"></div>';
      const notifs = [
        ['calendar', '日历', '明天 14:00 设计评审，记得提前准备材料。', '刚刚'],
        ['mail', '邮件', 'WebOS 团队：欢迎来到 WebOS 👋', '12 分钟前'],
        ['music', '音乐', '深夜电台已加入你的资料库。', '1 小时前'],
        ['settings', '系统设置', '偏好设置已自动保存。', '昨天']
      ];
      nc.querySelector('.nc-notifs').innerHTML = notifs.map(([ic, t, p, tm], i) =>
        '<div class="nc-notif" style="animation-delay:' + (i * 60) + 'ms"><div class="nn-icon">' + OS.icon(ic) + '</div>' +
        '<div><b>' + t + '</b><p>' + p + '</p></div><span class="nn-time">' + tm + '</span></div>').join('');
      nc.querySelector('.nc-clear').addEventListener('click', () => {
        nc.querySelectorAll('.nc-notif').forEach((n) => n.remove());
        OS.toast('通知中心', '已清除全部通知', 'bell');
      });
      nc.dataset.ready = '1';
    }
    nc.classList.toggle('open', on);
    if (on) { closeMenu(); closeContext(); OS.toggleSpotlight(false); OS.toggleLaunchpad(false); }
  }
  OS.toggleNotifications = toggleNotifications;

  /* ---------------- 锁屏 / 关机 ---------------- */
  OS.lockScreen = () => {
    closeMenu(); closeContext(); OS.toggleSpotlight(false); OS.toggleLaunchpad(false); OS.toggleNotifications(false);
    const lk = document.getElementById('lockscreen');
    lk.innerHTML = '<div class="lk-time">' + OS.clockText() + '</div><div class="lk-date">' + OS.dateText() + '</div>' +
      '<div class="lk-avatar">A</div><div class="lk-name">andi</div><div class="lk-hint">点按任意位置或按任意键以解锁</div>';
    lk.classList.remove('hidden');
    const unlock = () => { lk.classList.add('hidden'); lk.removeEventListener('click', unlock); window.removeEventListener('keydown', unlock, true); };
    lk.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock, true);
    setTimeout(() => { if (!lk.classList.contains('hidden')) window.addEventListener('keydown', unlock, true); }, 50);
  };
  OS.shutdown = () => {
    closeMenu();
    const sd = document.getElementById('shutdown');
    sd.innerHTML = '<div class="boot-logo">' + OS.appleLogo(54, '#f5f5f7') + '</div>' +
      '<div class="boot-progress"><span></span></div><div style="font-size:12px;opacity:.5" class="sd-label">正在关机…</div>';
    sd.classList.remove('hidden');
    setTimeout(() => {
      sd.innerHTML = '<div style="color:rgba(255,255,255,.6);font-size:13px;cursor:default" class="sd-power">点按任意位置重新开机</div>';
      const power = () => {
        sd.classList.add('hidden');
        sd.removeEventListener('click', power);
        const boot = document.getElementById('boot');
        boot.style.display = '';
        boot.classList.remove('done');
        setTimeout(() => {
          boot.classList.add('done');
          setTimeout(() => { boot.style.display = 'none'; }, 760);
        }, 1100);
      };
      sd.addEventListener('click', power);
    }, 1600);
  };

  /* ---------------- 全局点击与快捷键 ---------------- */
  function bindGlobal() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown, .mb-item')) closeMenu();
      if (!e.target.closest('#context-menu')) closeContext();
      if (!e.target.closest('#notification-center, [data-status="clock"], [data-status="control"]')) OS.toggleNotifications(false);
      if (e.target === document.getElementById('spotlight')) OS.toggleSpotlight(false);
      if (e.target.closest('.spot-result')) execSpot(+e.target.closest('.spot-result').dataset.r);
    });
    document.getElementById('desktop').addEventListener('contextmenu', desktopContext);
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('input, textarea, .window, .dock, .menubar')) return;
    });

    window.addEventListener('keydown', (e) => {
      const overlayOpen = !document.getElementById('spotlight').classList.contains('hidden') ||
        !document.getElementById('launchpad').classList.contains('hidden') ||
        document.getElementById('notification-center').classList.contains('open') ||
        !document.getElementById('lockscreen').classList.contains('hidden');
      if (OS.isCmd(e) && e.code === 'Space') { e.preventDefault(); OS.toggleSpotlight(true); return; }
      if (e.key === 'Escape') {
        if (!document.getElementById('spotlight').classList.contains('hidden')) { OS.toggleSpotlight(false); return; }
        if (!document.getElementById('launchpad').classList.contains('hidden')) { OS.toggleLaunchpad(false); return; }
        if (OS.wm.missionMode) { OS.wm.mission(false); return; }
        if (document.getElementById('notification-center').classList.contains('open')) { OS.toggleNotifications(false); return; }
        closeMenu(); closeContext(); return;
      }
      if (e.key === 'F3' || (e.ctrlKey && e.key === 'ArrowUp')) { e.preventDefault(); OS.wm.mission(!OS.wm.missionMode); return; }
      if (overlayOpen) return;
      if (OS.isCmd(e) && e.key.toLowerCase() === 'w') { e.preventDefault(); const w = OS.wm.active(); if (w) OS.wm.close(w); return; }
      if (OS.isCmd(e) && e.key.toLowerCase() === 'm') { e.preventDefault(); const w = OS.wm.active(); if (w) OS.wm.minimize(w); return; }
      if (OS.isCmd(e) && e.key.toLowerCase() === 'n') { e.preventDefault(); OS.openApp('finder'); return; }
      if (OS.isCmd(e) && e.key === ',') { e.preventDefault(); OS.openApp('settings'); return; }
      if (OS.isCmd(e) && e.ctrlKey && e.key.toLowerCase() === 'q') { e.preventDefault(); OS.lockScreen(); return; }
      if (OS.isCmd(e) && e.key.toLowerCase() === 'h') { e.preventDefault(); const w = OS.wm.active(); if (w) OS.wm.minimize(w); }
    });

    OS.on('focus', (win) => {
      activeAppId = win ? win.appId : 'finder';
      renderMenubar();
      refreshDock();
    });
    OS.on('windows', () => refreshDock());
    OS.on('settings', () => { refreshDock(); });
    OS.on('theme', () => { /* 外观变量已由 core 应用 */ });
    OS.on('wallpaper', () => { /* 壁纸已由 core 重绘 */ });

    const hot = OS.el('div', 'dock-hotzone');
    document.body.appendChild(hot);
    hot.addEventListener('mouseenter', () => { if (OS.state.dockAutohide) document.getElementById('dock-wrap').classList.remove('autohide'); });
    document.getElementById('dock-wrap').addEventListener('mouseleave', () => { if (OS.state.dockAutohide) document.getElementById('dock-wrap').classList.add('autohide'); });

    const bar = document.getElementById('mission-bar');
    bar.innerHTML = '<span class="mission-chip">调度中心</span><span class="mission-chip add">+ 添加桌面</span>' +
      '<div class="grow"></div><span>点击窗口返回桌面</span><span class="mission-chip" id="mission-exit">退出</span>';
    document.getElementById('mission-exit').addEventListener('click', () => OS.wm.mission(false));
  }

  /* ---------------- 初始化 ---------------- */
  OS.desktopInit = () => {
    renderMenubar();
    renderDock();
    renderDesktop();
    bindGlobal();
    setInterval(updateClock, 1000);
    setInterval(() => { if (new Date().getSeconds() === 0) renderWidgets(); }, 60000);
  };
})();
