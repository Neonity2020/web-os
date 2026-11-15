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

    /* 门禁阶段曾隐藏开机层；登录通过后恢复开机动画 */
    const bootLayer = document.getElementById('boot');
    if (bootLayer) { bootLayer.style.display = ''; bootLayer.classList.remove('done'); }
    document.getElementById('boot-logo').innerHTML = OS.appleLogo(78, '#f5f5f7');
    OS.desktopInit();

    setTimeout(() => {
      const b = document.getElementById('boot');
      b.classList.add('done');
      setTimeout(() => { b.style.display = 'none'; }, 760);
    }, 1150);
    /* 支持 ?app=xxx 直接进入指定应用（例如 ?app=phoenix 打开凤凰战机） */
    const launch = new URLSearchParams(location.search).get('app');
    const target = launch && OS.appById(launch) && !OS.appById(launch).hidden ? launch : null;
    setTimeout(() => {
      if (target) OS.openApp(target);
      /* 移动端先展示主屏图标；桌面仅在用户还没打开任何窗口时自动进访达，避免抢焦点 */
      else if (!OS.isMobile() && !OS.wm.windows.length) OS.openApp('finder', { path: OS.fs.home.slice() });
    }, 1650);
    setTimeout(() => OS.toast('欢迎使用 WebOS', OS.isMobile()
      ? '点按图标打开应用 · 程序坞左右滑动 · 长按唤出菜单'
      : '⌘/Ctrl + 空格 聚焦搜索 · F3 调度中心', 'about'), 4200);
  }

  /* 认证门禁：未登录只显示登录层，不初始化桌面 */
  function launch() { OS.auth.start(boot); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', launch);
  else launch();
})();
