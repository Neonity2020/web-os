/* ============================================================
   WebOS · Auth：WorkBuddy 云服务登录与启动门禁
   依赖 js/cloud-config.js 与 CDN 上的 WorkBuddyCloud SDK。
   门禁未通过时不调用 boot()，桌面不会初始化。
   ============================================================ */
(function () {
  'use strict';
  const OS = window.OS;
  const CFG = window.WEBOS_PUBLIC_CONFIG;
  const layer = document.getElementById('lockscreen');
  const CDN_HINT = '云服务组件未能加载，请检查网络后刷新重试';

  let cloud = null;
  let gate = false;
  let booted = false;
  let bootFn = null;
  let currentUser = null;
  let pending = null;
  let busy = false;
  let tab = 'email';
  let timer = null;
  let left = 0;
  let watching = false;
  /* 'gated' | 'signed-in' | 'guest' —— guest 只是跳过登录，不是一种身份 */
  let mode = 'gated';
  const GUEST_KEY = 'auth.guest';

  function errText(e) {
    if (!e) return '操作失败，请重试';
    return (e.message || String(e)) || '操作失败，请重试';
  }
  function friendly(err) {
    if (!err) return '操作失败，请重试';
    const kind = err.kind || err.code || '';
    if (kind === 'network' || kind === 'backend-unavailable') return '云服务暂时不可用，请检查网络后重试';
    const msg = err.message || '操作失败，请重试';
    if (/PKCE|verifier|invalid state|state mismatch/i.test(msg)) return '授权信息已失效，请在当前页面重新登录';
    if (/access denied|cancelled|用户取消/i.test(msg)) return '已取消授权，可重新选择登录方式';
    if (/未打开|not enabled|disabled/i.test(msg)) return msg + '（可在应用管理面板开启该登录方式）';
    if (/localhost|origin|redirect|domain/i.test(msg)) return '此登录方式需在已发布的 HTTPS 域名上使用';
    return msg;
  }

  /* 唯一的客户端初始化点；所有云能力共用这一个实例 */
  function client() {
    if (cloud) return cloud;
    if (!CFG || !window.WorkBuddyCloud ||
        typeof window.WorkBuddyCloud.createWorkBuddyCloud !== 'function') {
      throw new Error(CDN_HINT);
    }
    cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: CFG.endpoint,
      oauthRelayBaseUrl: CFG.oauthRelayBaseUrl,
      publishableKey: CFG.publishableKey
    });
    return cloud;
  }
  function safeClient() {
    try { return client(); }
    catch (e) { setMsg(errText(e), 'error'); return null; }
  }
  async function readSession() {
    let c;
    try { c = client(); }
    catch (e) { return { session: null, error: { message: errText(e) } }; }
    try {
      const r = await c.auth.getSession();
      return { session: (r && r.data) || null, error: (r && r.error) || null };
    } catch (e) {
      return { session: null, error: { message: errText(e) } };
    }
  }

  /* 回调参数是一次性的：处理完立刻从地址栏清掉，只保留站点自身的参数 */
  function cleanCallbackParams() {
    const u = new URL(location.href);
    let changed = false;
    ['code', 'state', 'provider', 'error'].forEach((k) => {
      if (u.searchParams.has(k)) { u.searchParams.delete(k); changed = true; }
    });
    if (changed) {
      try { history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) { /* noop */ }
    }
  }

  /* 回调分发必须早于门禁；普通访问只恢复会话 */
  async function restore() {
    const u = new URL(location.href);
    if (!u.searchParams.has('code') && !u.searchParams.has('error')) return readSession();
    const provider = u.searchParams.get('provider');
    if (provider !== 'workbuddy' && provider !== 'wechat') {
      cleanCallbackParams();
      return { session: null, error: { message: '授权回调缺少有效的登录方式，请重新登录。' } };
    }
    let c;
    try { c = client(); }
    catch (e) { return { session: null, error: { message: errText(e) } }; }
    const fn = provider === 'workbuddy'
      ? c.auth.handleWorkBuddyCallback : c.auth.handleWechatWebCallback;
    if (typeof fn !== 'function') {
      cleanCallbackParams();
      return { session: null, error: { message: '当前云服务组件不支持此登录方式，请刷新后重试。' } };
    }
    let r;
    try { r = await fn.call(c.auth); }
    catch (e) { r = { data: null, error: { message: errText(e) } }; }
    cleanCallbackParams();
    if (r && r.error) return { session: null, error: r.error };
    return readSession();
  }

  /* ---------------- 访客偏好 ----------------
     只记录「用户主动选择跳过登录」这一个布尔值。它不含任何用户标识，
     不写入 SDK 的会话存储，也不构成身份：uid()/user() 在访客模式下为空。
     访客只能使用纯本机功能，任何用户级云数据库 / 存储读写都必须先
     检查 isAuthenticated()，不能拿访客态当作已登录态放行。            */
  function guestPreferred() {
    try { return OS.store.get(GUEST_KEY, false) === true; }
    catch (e) { return false; }
  }
  function setGuestPreference(on) {
    try { OS.store.set(GUEST_KEY, !!on); } catch (e) { /* noop */ }
  }

  /* ---------------- 登录层 ---------------- */
  function setMsg(text, tone) {
    const el = layer.querySelector('#auth-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-msg' + (text && tone ? ' ' + tone : '');
    el.style.display = text ? '' : 'none';
    const retry = layer.querySelector('#auth-retry');
    if (retry) retry.style.display = /组件未能加载|暂时不可用/.test(text || '') ? '' : 'none';
  }
  function setFormEnabled(on) {
    OS.$$('input, button', layer).forEach((el) => {
      if (el.id === 'auth-retry') return;
      el.disabled = !on;
    });
    if (on && left > 0) {
      const send = layer.querySelector('#auth-send');
      if (send) send.disabled = true;
    }
  }
  function stopCountdown() {
    if (timer) { clearInterval(timer); timer = null; }
    left = 0;
    const send = layer.querySelector('#auth-send');
    if (send) { send.disabled = false; send.textContent = '获取验证码'; }
  }
  function startCountdown() {
    stopCountdown();
    left = 60;
    const send = layer.querySelector('#auth-send');
    if (!send) return;
    send.disabled = true;
    send.textContent = '重发 (' + left + 's)';
    timer = setInterval(() => {
      left -= 1;
      if (left <= 0) { stopCountdown(); return; }
      send.textContent = '重发 (' + left + 's)';
    }, 1000);
  }
  function account() {
    const el = layer.querySelector('#auth-account');
    return el ? el.value.trim() : '';
  }
  function code() {
    const el = layer.querySelector('#auth-code');
    return el ? el.value.trim() : '';
  }
  function setTab(next) {
    tab = next;
    pending = null;
    stopCountdown();
    const acc = layer.querySelector('#auth-account');
    if (acc) {
      acc.type = next === 'email' ? 'email' : 'tel';
      acc.placeholder = next === 'email' ? '邮箱地址' : '11 位手机号';
      acc.value = '';
    }
    const otp = layer.querySelector('#auth-code');
    if (otp) otp.value = '';
    OS.$$('[data-tab]', layer).forEach((b) => b.classList.toggle('active', b.dataset.tab === next));
    setMsg('', '');
  }
  function validate(v) {
    if (tab === 'phone') {
      if (!/^1\d{10}$/.test(v)) { setMsg('请输入正确的 11 位手机号', 'error'); return false; }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setMsg('请输入正确的邮箱地址', 'error'); return false;
    }
    return true;
  }

  async function sendCode() {
    if (busy) return;
    const v = account();
    if (!validate(v)) return;
    const c = safeClient();
    if (!c) return;
    busy = true;
    setMsg('正在发送验证码…', 'info');
    let r;
    try { r = await c.auth.sendOtp(tab === 'email' ? { email: v } : { phone: v }); }
    catch (e) { r = { error: { message: errText(e) } }; }
    busy = false;
    if (!r || r.error) { setMsg(friendly(r && r.error), 'error'); return; }
    if (!r.data || !r.data.verificationId) {
      setMsg('验证码服务未返回有效凭据，请重试', 'error'); return;
    }
    pending = {
      kind: tab,
      value: v,
      verificationId: r.data.verificationId,
      isExistingUser: r.data.isExistingUser
    };
    setMsg(tab === 'email' ? '验证码已发送，请查收邮件' : '验证码已发送，请查收短信', 'ok');
    startCountdown();
  }

  async function submitCode() {
    if (busy) return;
    const v = account();
    const token = code();
    if (!pending || pending.kind !== tab || pending.value !== v) {
      setMsg('请先为当前账号获取验证码', 'error'); return;
    }
    if (!token) { setMsg('请输入验证码', 'error'); return; }
    const c = safeClient();
    if (!c) return;
    /* email 与 phone 互斥，且与发送时保持完全一致 */
    const args = {
      verificationId: pending.verificationId,
      isExistingUser: pending.isExistingUser,
      token: token
    };
    args[pending.kind] = pending.value;
    busy = true;
    setMsg('正在验证…', 'info');
    let r;
    try { r = await c.auth.verifyOtp(args); }
    catch (e) { r = { error: { message: errText(e) } }; }
    busy = false;
    if (!r || r.error) { setMsg(friendly(r && r.error), 'error'); return; }
    pending = null;
    /* 必须确认会话已建立，才允许进入桌面 */
    const check = await readSession();
    if (check.error || !check.session) {
      setMsg('登录已完成，但会话恢复失败，请重试', 'error'); return;
    }
    enter(check.session);
  }

  async function oauth(provider) {
    if (busy) return;
    const c = safeClient();
    if (!c) return;
    /* 静态站点没有 history fallback：回调只能落在根路径，并保留站点自身参数 */
    const back = new URL(location.href);
    back.pathname = '/';
    ['code', 'state', 'provider', 'error'].forEach((k) => back.searchParams.delete(k));
    busy = true;
    setMsg('正在前往授权页…', 'info');
    let r;
    try {
      r = await c.auth.signInWithOAuth({ provider: provider, redirectTo: back.toString() });
    } catch (e) { r = { error: { message: errText(e) } }; }
    busy = false;
    if (!r || r.error) { setMsg(friendly(r && r.error), 'error'); return; }
    if (!r.data || !r.data.url) { setMsg('未能取得授权地址，请重试', 'error'); return; }
    location.assign(r.data.url);
  }

  function buildLogin() {
    layer.dataset.authRendered = '1';
    layer.innerHTML =
      '<div class="lk-time">' + OS.clockText() + '</div>' +
      '<div class="lk-date">' + OS.dateText() + '</div>' +
      '<div class="auth-card">' +
        '<div class="auth-avatar">W</div>' +
        '<div class="auth-title">登录 WebOS</div>' +
        '<div class="auth-sub">账号与会话由 WorkBuddy 云服务提供</div>' +
        '<div class="auth-tabs">' +
          '<button type="button" data-tab="email" class="active">邮箱验证码</button>' +
          '<button type="button" data-tab="phone">手机验证码</button>' +
        '</div>' +
        '<div class="auth-field">' +
          '<input id="auth-account" type="email" inputmode="email" autocomplete="email" placeholder="邮箱地址" spellcheck="false">' +
        '</div>' +
        '<div class="auth-field auth-code-row">' +
          '<input id="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="验证码" maxlength="8" spellcheck="false">' +
          '<button type="button" id="auth-send">获取验证码</button>' +
        '</div>' +
        '<button type="button" id="auth-submit" class="auth-primary">登录 / 注册</button>' +
        '<div id="auth-msg" class="auth-msg" style="display:none"></div>' +
        '<button type="button" id="auth-retry" class="auth-retry" style="display:none">重新加载</button>' +
        '<div class="auth-divider"><span>其他登录方式</span></div>' +
        '<div class="auth-oauth">' +
          '<button type="button" data-provider="workbuddy">使用 WorkBuddy 登录</button>' +
          '<button type="button" data-provider="wechat">微信扫码登录</button>' +
        '</div>' +
        '<div class="auth-guest">' +
          '<button type="button" id="auth-guest">以访客身份进入 <span aria-hidden="true">→</span></button>' +
          '<div class="auth-guest-note">不创建账号 · 数据仅保存在此浏览器 · 可随时登录</div>' +
        '</div>' +
        '<div class="auth-foot">首次验证将自动创建账号 · 无需设置密码</div>' +
        '<div class="auth-build">版本 ' + OS.esc(String(window.WEBOS_BUILD || '未知')) +
          ' · <button type="button" id="auth-refresh">检查更新</button></div>' +
        '<button type="button" id="auth-back" class="auth-back" style="display:none">返回桌面（不登录）</button>' +
      '</div>';
    OS.$$('[data-tab]', layer).forEach((b) => {
      b.addEventListener('click', () => setTab(b.dataset.tab));
    });
    OS.$$('[data-provider]', layer).forEach((b) => {
      b.addEventListener('click', () => oauth(b.dataset.provider));
    });
    layer.querySelector('#auth-send').addEventListener('click', sendCode);
    layer.querySelector('#auth-submit').addEventListener('click', submitCode);
    layer.querySelector('#auth-account').addEventListener('input', () => {
      pending = null; setMsg('', '');
    });
    layer.querySelector('#auth-code').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitCode();
    });
    layer.querySelector('#auth-refresh').addEventListener('click', () => {
      if (window.webosForceReload) window.webosForceReload();
      else location.reload();
    });
    layer.querySelector('#auth-guest').addEventListener('click', enterGuest);
    layer.querySelector('#auth-back').addEventListener('click', enterGuest);
    layer.querySelector('#auth-retry').addEventListener('click', () => location.reload());
    setInterval(() => {
      const t = layer.querySelector('.lk-time');
      if (t && layer.classList.contains('auth-login')) t.textContent = OS.clockText();
    }, 15000);
  }

  function renderLogin(message, tone) {
    layer.classList.remove('hidden');
    layer.classList.add('auth-login');
    if (layer.dataset.authRendered !== '1') buildLogin();
    setMsg(message || '', tone || '');
  }

  function showLogin(message) {
    gate = true;
    mode = 'gated';
    /* 显式回到登录层即撤销「以后都免登录」的选择 */
    setGuestPreference(false);
    currentUser = null;
    pending = null;
    renderLogin(message || '', message ? 'error' : '');
    /* 桌面已经启动时，允许放弃登录并回到访客桌面 */
    const back = layer.querySelector('#auth-back');
    if (back) back.style.display = booted ? '' : 'none';
    if (OS.toggleSpotlight) OS.toggleSpotlight(false);
    if (OS.toggleLaunchpad) OS.toggleLaunchpad(false);
    if (OS.toggleNotifications) OS.toggleNotifications(false);
  }

  /* ---------------- 进入桌面 ---------------- */
  function watch() {
    if (watching) return;
    let c;
    try { c = client(); } catch (e) { return; }
    if (typeof c.auth.onAuthStateChange !== 'function') return;
    watching = true;
    /* 注册瞬间的初始事件不代表登出，短暂抑制避免刚进桌面就被踢回登录层 */
    const readyAt = Date.now() + 1200;
    c.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (Date.now() >= readyAt) showLogin();
        return;
      }
      if (session) {
        currentUser = session.user || currentUser;
        mode = 'signed-in';
        setGuestPreference(false);
        gate = false;
        layer.classList.add('hidden');
      }
    });
  }

  function hideLayer() {
    stopCountdown();
    layer.classList.add('hidden');
    layer.classList.remove('auth-login');
    layer.dataset.authRendered = '0';
    layer.innerHTML = '';
  }
  function bootDesktop() {
    if (booted || !bootFn) return;
    booted = true;
    const boot = document.getElementById('boot');
    if (boot) { boot.style.display = ''; boot.classList.remove('done'); }
    bootFn();
  }

  function enter(session) {
    gate = false;
    mode = 'signed-in';
    setGuestPreference(false);
    currentUser = (session && session.user) || null;
    hideLayer();
    watch();
    bootDesktop();
  }

  /* 访客模式：不调用任何 Auth API、不创建用户、不写 SDK 会话，
     仅解除本地门禁并启动纯本机桌面。 */
  function enterGuest() {
    if (mode === 'signed-in' || busy) return;
    setGuestPreference(true);
    gate = false;
    mode = 'guest';
    currentUser = null;
    pending = null;
    hideLayer();
    bootDesktop();
    if (OS.toast) {
      setTimeout(() => OS.toast('访客模式', '未登录账号 · 数据仅保存在此浏览器', 'about'), 1800);
    }
  }

  async function start(fn) {
    bootFn = fn;
    gate = true;
    mode = 'gated';
    const boot = document.getElementById('boot');
    if (boot) { boot.classList.add('done'); boot.style.display = 'none'; }
    renderLogin('正在连接云服务…', 'info');
    setFormEnabled(false);
    let r;
    try { r = await restore(); }
    catch (e) { r = { session: null, error: { message: errText(e) } }; }
    setFormEnabled(true);
    /* 云服务异常时不静默降级：错误要如实展示，是否访客进入由用户决定 */
    if (r.error) { renderLogin(friendly(r.error), 'error'); return; }
    if (r.session) { enter(r.session); return; }
    /* 无会话，且此前显式选过访客：直接进入本机桌面 */
    if (guestPreferred()) { enterGuest(); return; }
    renderLogin('', '');
  }

  async function signOut() {
    /* 访客没有云端会话，登出只意味着回到登录层 */
    if (mode === 'guest') { showLogin(); return; }
    const c = safeClient();
    if (!c) return;
    let r;
    try { r = await c.auth.signOut(); }
    catch (e) { r = { error: { message: errText(e) } }; }
    if (r && r.error) {
      const msg = friendly(r.error);
      if (OS.toast) OS.toast('退出登录失败', msg, 'about');
      else showLogin(msg);
      return;
    }
    showLogin();
  }

  function displayName() {
    if (mode === 'guest') return '访客';
    const u = currentUser || {};
    const raw = u.raw || {};
    return u.name || u.email || u.phone || raw.email || raw.phone || 'andi';
  }

  OS.auth = {
    start: start,
    signOut: signOut,
    showLogin: showLogin,
    enterGuest: enterGuest,
    isGated: () => gate,
    isGuest: () => mode === 'guest',
    /* 只有真实云服务会话才返回 true；访客模式绝不能被当作已登录态 */
    isAuthenticated: () => mode === 'signed-in' && !!currentUser,
    mode: () => mode,
    user: () => (mode === 'signed-in' ? currentUser : null),
    uid: () => {
      if (mode !== 'signed-in') return '';
      const u = currentUser || {};
      return u.id || u.sub || u.email || u.phone || '';
    },
    displayName: displayName,
    cloud: () => cloud
  };
})();
