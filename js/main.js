/* ============================================================
   WebOS · Bootstrap
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  OS.bootTime = Date.now();

  OS.on('open-app', (d) => {
    if (d.id === 'launchpad') { OS.toggleLaunchpad(true); return; }
    OS.wm.open(d.id, d.opts || {});
  });

  function boot() {
    OS.applyTheme();
    OS.applyAccent();
    OS.renderWallpaper();

    document.getElementById('boot-logo').innerHTML = OS.appleLogo(78, '#f5f5f7');
    OS.desktopInit();

    setTimeout(() => {
      const b = document.getElementById('boot');
      b.classList.add('done');
      setTimeout(() => { b.style.display = 'none'; }, 760);
    }, 1150);
    setTimeout(() => OS.openApp('finder', { path: OS.fs.home.slice() }), 1650);
    setTimeout(() => OS.toast('欢迎使用 WebOS', '⌘/Ctrl + 空格 聚焦搜索 · F3 调度中心', 'about'), 4200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
