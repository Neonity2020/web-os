/* ============================================================
   WebOS · Window Manager
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  const layer = () => document.getElementById('windows-layer');

  const wm = OS.wm = {
    windows: [],
    z: 100,
    missionMode: false,

    list() { return wm.windows.slice(); },
    visible() { return wm.windows.filter((w) => !w.state.minimized); },
    active() {
      return wm.windows.filter((w) => !w.state.minimized).sort((a, b) => b.z - a.z)[0] || null;
    },
    byId(id) { return wm.windows.find((w) => w.id === id); },
    byApp(appId) { return wm.windows.find((w) => w.appId === appId); },

    open(appId, opts) {
      opts = opts || {};
      const def = OS.appById(appId) || { id: appId, name: appId, icon: 'about', w: 700, h: 480 };
      const existing = wm.byApp(appId);
      if (existing && !opts.newInstance) {
        if (existing.state.minimized) wm.restore(existing);
        wm.focus(existing);
        if (Object.keys(opts).length && existing.rerender) existing.rerender(opts);
        if (wm.missionMode) wm.mission(false);
        return existing;
      }

      const vw = window.innerWidth, vh = window.innerHeight;
      const w = Math.min(def.w || 760, vw - 40);
      const h = Math.min(def.h || 520, vh - 100);
      const n = wm.windows.length;
      const step = n % 7;
      let left = OS.clamp(Math.round((vw - w) / 2) + step * 26 + 10, 12, Math.max(12, vw - w - 12));
      let top = OS.clamp(Math.round((vh - h) / 2) + step * 22 - 40, 38, Math.max(38, vh - h - 80));
      if (typeof opts.left === 'number') left = OS.clamp(opts.left, 12, Math.max(12, vw - w - 12));
      if (typeof opts.top === 'number') top = OS.clamp(opts.top, 38, Math.max(38, vh - h - 80));

      const win = {
        id: OS.uid('win'), appId: appId, def: def,
        state: { minimized: false, maximized: false, rect: null },
        opts: opts, z: ++wm.z
      };
      const el = OS.el('div', 'window focused');
      if (OS.isMobile()) el.classList.add('m-win');
      el.dataset.id = win.id;
      el.dataset.app = appId;
      el.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h + 'px;z-index:' + win.z;
      el.innerHTML =
        '<div class="titlebar">' +
          '<div class="traffic">' +
            '<button class="t-close" data-act="close" title="关闭"><span class="glyph">×</span></button>' +
            '<button class="t-min" data-act="min" title="最小化"><span class="glyph">−</span></button>' +
            '<button class="t-zoom" data-act="zoom" title="缩放"><span class="glyph">+</span></button>' +
          '</div>' +
          '<div class="win-title">' + OS.esc(opts.title || def.name) + '</div>' +
          '<div class="titlebar-tools"></div>' +
        '</div>' +
        '<div class="win-body"></div>' +
        '<div class="mission-label">' + OS.esc(def.name) + '</div>' +
        '<div class="rz rz-se"></div><div class="rz rz-e"></div><div class="rz rz-s"></div>' +
        '<div class="rz rz-w"></div><div class="rz rz-n"></div>';
      if (def.resizable === false) OS.$$('.rz', el).forEach((r) => r.remove());

      win.el = el;
      win.body = el.querySelector('.win-body');
      win.titleEl = el.querySelector('.win-title');
      win.toolsEl = el.querySelector('.titlebar-tools');
      win.setTitle = (t) => { win.titleEl.textContent = t; };
      win.setTools = (html) => {
        win.toolsEl.innerHTML = html;
        if (OS.isMobile()) wm.mountMobileTools(win);
        return win.toolsEl;
      };
      win.rerender = (o) => { win.opts = Object.assign({}, win.opts, o || {}); wm.renderContent(win); };

      wm.windows.push(win);
      layer().appendChild(el);
      wm.renderContent(win);
      wm.focus(win, true);
      wm.bindWindow(win);
      OS.emit('windows', wm.windows);

      setTimeout(() => el.classList.add('no-anim'), 280);
      return win;
    },

    renderContent(win) {
      const view = (OS.appViews && OS.appViews[win.appId]) || (OS.appViews && OS.appViews._generic);
      if (!view) { win.body.innerHTML = '<div class="empty-state">应用正在准备…</div>'; return; }
      try {
        win.toolsEl.innerHTML = '';
        win.body.innerHTML = view.render(win, win.opts) || '';
        if (view.mount) view.mount(win, win.opts);
        if (OS.isMobile()) wm.mountMobileTools(win);
      } catch (err) {
        console.error('[WebOS] render ' + win.appId, err);
        win.body.innerHTML = '<div class="empty-state">应用加载出错：' + OS.esc(err.message) + '</div>';
      }
    },

    /* 移动端把 .sidebar 收成抽屉，在标题栏统一挂切换按钮（适用于所有带侧栏的应用） */
    mountMobileTools(win) {
      const old = win.toolsEl.querySelector('[data-m-side]');
      if (old) old.remove();
      if (!win.body.querySelector('.sidebar')) return;
      const btn = OS.el('button', 'tb-btn m-sidebar-toggle');
      btn.dataset.mSide = '1';
      btn.title = '侧栏';
      btn.setAttribute('aria-label', '打开侧栏');
      btn.textContent = '☰';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        win.el.classList.toggle('sidebar-open');
      });
      win.toolsEl.appendChild(btn);
    },

    close(win) {
      if (!win) return;
      if (wm.missionMode) wm.mission(false);
      win.el.classList.add('closing');
      setTimeout(() => {
        win.el.remove();
        wm.windows = wm.windows.filter((w) => w !== win);
        const next = wm.active();
        if (next) wm.focus(next);
        OS.emit('windows', wm.windows);
      }, 190);
    },

    focus(win, silent) {
      if (!win) { OS.emit('focus', null); return; }
      win.z = ++wm.z;
      win.el.style.zIndex = win.z;
      wm.windows.forEach((w) => w.el.classList.toggle('focused', w === win));
      OS.emit('focus', win);
      if (!silent) OS.emit('windows', wm.windows);
    },

    minimize(win) {
      if (!win || win.state.minimized) return;
      if (win.state.maximized) wm.toggleMax(win, true);
      win.el.classList.add('no-anim');
      const dockItem = document.querySelector('.dock-item[data-app="' + win.appId + '"]');
      const wr = win.el.getBoundingClientRect();
      let dx = 0, dy = window.innerHeight * 0.6;
      if (dockItem) {
        const dr = dockItem.getBoundingClientRect();
        dx = dr.left + dr.width / 2 - (wr.left + wr.width / 2);
        dy = dr.top + dr.height / 2 - (wr.top + wr.height / 2);
      }
      win.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.07)';
      win.el.style.opacity = '0';
      win.state.minimized = true;
      setTimeout(() => win.el.classList.add('minimized'), 240);
      const next = wm.active();
      if (next) wm.focus(next);
      OS.emit('windows', wm.windows);
    },

    restore(win) {
      if (!win || !win.state.minimized) return;
      win.el.classList.remove('minimized');
      win.el.style.opacity = '';
      win.el.style.transform = '';
      win.state.minimized = false;
      wm.focus(win);
      const di = document.querySelector('.dock-item[data-app="' + win.appId + '"]');
      if (di) { di.classList.remove('bouncing'); void di.offsetWidth; di.classList.add('bouncing'); }
      OS.emit('windows', wm.windows);
    },

    toggleMax(win, skipAnim) {
      if (!win) return;
      if (!win.state.maximized) {
        win.state.rect = {
          left: win.el.offsetLeft, top: win.el.offsetTop,
          width: win.el.offsetWidth, height: win.el.offsetHeight
        };
        Object.assign(win.el.style, {
          left: '0px', top: '30px',
          width: window.innerWidth + 'px', height: (window.innerHeight - 30) + 'px'
        });
        win.el.classList.add('maximized');
        win.state.maximized = true;
      } else {
        const r = win.state.rect || { left: 120, top: 90, width: 800, height: 520 };
        Object.assign(win.el.style, {
          left: r.left + 'px', top: r.top + 'px',
          width: r.width + 'px', height: r.height + 'px'
        });
        win.el.classList.remove('maximized');
        win.state.maximized = false;
      }
      if (skipAnim) win.el.classList.add('no-anim');
      wm.focus(win);
    },

    /* ---------- 调度中心 ---------- */
    mission(on) {
      const target = on == null ? !wm.missionMode : on;
      /* 全屏窗口下调度中心没有意义，移动端改用程序坞切换应用 */
      if (target && OS.isMobile()) { OS.toast('调度中心', '移动端请用程序坞切换应用', 'about'); return; }
      wm.missionMode = target;
      const lay = layer();
      lay.classList.toggle('mission', target);
      document.getElementById('mission-bar').classList.toggle('hidden', !target);
      if (!target) {
        wm.windows.forEach((w) => { w.el.style.transform = ''; w.el.classList.remove('mission-target'); });
        return;
      }
      const wins = wm.visible();
      const vw = window.innerWidth, vh = window.innerHeight;
      const cols = Math.max(1, Math.ceil(Math.sqrt(wins.length)));
      const rows = Math.max(1, Math.ceil(wins.length / cols));
      const areaL = 30, areaR = vw - 30, areaT = 90, areaB = vh - 60;
      const cw = (areaR - areaL) / cols, ch = (areaB - areaT) / rows;
      wins.forEach((win, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const cx = areaL + cw * (c + .5), cy = areaT + ch * (r + .5);
        const w = win.el.offsetWidth, h = win.el.offsetHeight;
        const s = Math.min(cw * .84 / w, ch * .82 / h, .92);
        const dx = cx - (win.el.offsetLeft + w / 2);
        const dy = cy - (win.el.offsetTop + h / 2);
        win.el.classList.add('mission-target');
        win.el.style.zIndex = 200 + i;
        win.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      });
    },

    /* ---------- 交互绑定 ---------- */
    bindWindow(win) {
      const el = win.el, tb = el.querySelector('.titlebar');

      el.addEventListener('pointerdown', () => { if (!wm.missionMode) wm.focus(win); }, true);
      el.addEventListener('click', (e) => {
        if (wm.missionMode && el.classList.contains('mission-target')) {
          e.stopPropagation(); wm.mission(false); wm.focus(win);
        }
      }, true);

      /* 移动端抽屉：点遮罩只收起抽屉，必须拦截点击，避免穿透误开文件 */
      el.addEventListener('click', (e) => {
        if (!el.classList.contains('sidebar-open')) return;
        if (e.target.closest('[data-m-side]')) return;
        if (e.target.closest('.sidebar')) {
          if (e.target.closest('.side-item, .office-file, [data-sec], [data-folder], [data-album]')) {
            el.classList.remove('sidebar-open');
          }
          return;
        }
        e.preventDefault(); e.stopPropagation();
        el.classList.remove('sidebar-open');
      }, true);

      el.querySelector('.traffic').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        e.stopPropagation();
        const act = b.dataset.act;
        if (act === 'close') wm.close(win);
        else if (act === 'min') wm.minimize(win);
        else if (act === 'zoom') wm.toggleMax(win);
      });

      tb.addEventListener('dblclick', (e) => {
        if (OS.isMobile()) return;
        if (e.target.closest('button, .titlebar-tools')) return;
        wm.toggleMax(win);
      });

      let drag = null;
      tb.addEventListener('pointerdown', (e) => {
        if (OS.isMobile()) return;
        if (e.button !== 0 || wm.missionMode || win.state.maximized) return;
        if (e.target.closest('button, input, .titlebar-tools, .traffic')) return;
        drag = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop };
        el.classList.add('dragging');
        tb.setPointerCapture(e.pointerId);
      });
      tb.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const w = el.offsetWidth;
        el.style.left = OS.clamp(drag.left + e.clientX - drag.x, -w + 110, window.innerWidth - 110) + 'px';
        el.style.top = OS.clamp(drag.top + e.clientY - drag.y, 30, window.innerHeight - 44) + 'px';
      });
      const endDrag = () => { drag = null; el.classList.remove('dragging'); };
      tb.addEventListener('pointerup', endDrag);
      tb.addEventListener('pointercancel', endDrag);

      OS.$$('.rz', el).forEach((handle) => {
        handle.addEventListener('pointerdown', (e) => {
          if (OS.isMobile()) return;
          if (e.button !== 0 || wm.missionMode || win.state.maximized) return;
          e.stopPropagation();
          const cls = Array.from(handle.classList).find((c) => c.indexOf('rz-') === 0) || 'rz-se';
          const dirs = cls.slice(3).split('');
          const start = {
            x: e.clientX, y: e.clientY,
            left: el.offsetLeft, top: el.offsetTop,
            width: el.offsetWidth, height: el.offsetHeight
          };
          el.classList.add('resizing');
          handle.setPointerCapture(e.pointerId);
          const move = (ev) => {
            const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
            let { left, top, width, height } = start;
            if (dirs.includes('e')) width = Math.max(320, start.width + dx);
            if (dirs.includes('s')) height = Math.max(220, start.height + dy);
            if (dirs.includes('w')) { width = Math.max(320, start.width - dx); left = start.left + (start.width - width); }
            if (dirs.includes('n')) { height = Math.max(220, start.height - dy); top = start.top + (start.height - height); }
            width = Math.min(width, window.innerWidth - 20);
            height = Math.min(height, window.innerHeight - 46);
            el.style.left = left + 'px'; el.style.top = Math.max(30, top) + 'px';
            el.style.width = width + 'px'; el.style.height = height + 'px';
          };
          const up = () => {
            el.classList.remove('resizing');
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            handle.removeEventListener('pointercancel', up);
            OS.emit('window-resize', win);
          };
          handle.addEventListener('pointermove', move);
          handle.addEventListener('pointerup', up);
          handle.addEventListener('pointercancel', up);
        });
      });
    }
  };

  window.addEventListener('resize', () => {
    wm.windows.forEach((w) => {
      if (w.state.maximized) {
        w.el.style.width = window.innerWidth + 'px';
        w.el.style.height = (window.innerHeight - 30) + 'px';
      } else {
        w.el.style.left = OS.clamp(w.el.offsetLeft, -w.el.offsetWidth + 110, window.innerWidth - 110) + 'px';
        w.el.style.top = OS.clamp(w.el.offsetTop, 30, window.innerHeight - 44) + 'px';
      }
    });
    if (wm.missionMode) wm.mission(true);
  });
})();
