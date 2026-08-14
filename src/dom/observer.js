// JD-Auction-Search/src/dom/observer.js v1.6.11
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

    // 节流：京东列表频繁切换 class/style（hover、懒加载 img 的 data-src→src 等）
    // 会瞬时触发大量回调；debounce 150ms 合并抖动，避免浏览态高频冗余重渲染
    let scheduled = false;
    let timer = null;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      timer = setTimeout(() => {
        scheduled = false;
        onChange();
      }, 150);
    };

    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        // 新增/移除节点（如分页加载、列表重渲染）
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
        // 已有商品卡的价格/状态等文本或属性实时变化（无新增节点，如竞价刷新）
        if ((mutation.type === 'characterData' || mutation.type === 'attributes') &&
            mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        schedule();
      }
    });

    this.observer._jdsCancel = () => { if (timer) clearTimeout(timer); scheduled = false; };

    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-*']
    });
  };

  /**
   * 获取需要观察的容器
   * @private
   * @returns {HTMLElement}
   */
  JDSDom._getObservedContainer = function _getObservedContainer() {
    // 兜底 document.documentElement 而非 document.body：脚本在 body 创建前执行时
    // document.body 为 null，MutationObserver.observe(null) 会抛异常导致 init 中断
    return this.queryFirst(this.SELECTORS.OBSERVE) || document.body || document.documentElement;
  };

  /**
   * 停止观察
   */
  JDSDom.stopObservation = function stopObservation() {
    if (this.observer) {
      if (this.observer._jdsCancel) this.observer._jdsCancel();
      this.observer.disconnect();
      this.observer = null;
    }
  };
})(window);
