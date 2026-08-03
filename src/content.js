// JD-Auction-Search/src/content.js v1.5.3
// 主模块入口：引导增强器初始化

(function () {
  'use strict';

  const enhancer = window.JDSContent && window.JDSContent.AuctionSearchEnhancer;

  // 任一前置模块（enhancer.js 等）因 CSP / 解析错误 / 京东覆写 window 未加载时，
  // 直接访问会抛 TypeError 且静默失效、用户无任何反馈；判空后安全退出并告警
  if (!enhancer) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[JD-Auction-Search] 模块加载失败：JDSContent.AuctionSearchEnhancer 不可用');
    }
    return;
  }

  function bootstrap() {
    enhancer.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }

  window.JDAuctionSearch = enhancer;
})();
