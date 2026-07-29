// JD-Auction-Search/src/dom/observer.js v1.3.1
// DOM 观察器：监听页面商品列表变化（搜索态下由面板接管，跳过原生更新）

(function(global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  /**
   * 初始化DOM观察器
   * @param {Object} state - 应用状态
   * @param {Function} onChange - 变化回调
   */
  JDSDom.observeDOM = function observeDOM(state, onChange) {
    const container = this._getObservedContainer();

    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        onChange();
      }
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true
    });
  };

  /**
   * 获取需要观察的容器
   * @private
   * @returns {HTMLElement}
   */
  JDSDom._getObservedContainer = function _getObservedContainer() {
    const selectors = [
      '[class*="auction"], [class*="product"], [class*="goods"]',
      '.jd-paipai',
      '#app',
      'main'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }

    return document.body;
  };

  /**
   * 停止观察
   */
  JDSDom.stopObservation = function stopObservation() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  };
})(window);
