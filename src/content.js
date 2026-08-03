// JD-Auction-Search/src/content.js v1.5.3
// 主模块入口：引导增强器初始化

(function () {
  'use strict';

  const enhancer = window.JDSContent.AuctionSearchEnhancer;

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
