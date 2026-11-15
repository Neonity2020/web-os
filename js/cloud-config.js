/* ============================================================
   WebOS · 云服务公开配置
   仅包含可下发到浏览器的公开值，来自 workbuddy_cloud_service
   激活后返回的 publicConfig。不要在别处推导 endpoint，也不要
   把长期密钥或环境内部标识写进前端代码。
   ============================================================ */
window.WEBOS_PUBLIC_CONFIG = {
  endpoint: 'https://webos-desktop.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_NEgFOMF6FPYOIuFnmzZo3U_0jNUSyJ3tobA0AinrEnPWcuNfdsDFR2a'
};
