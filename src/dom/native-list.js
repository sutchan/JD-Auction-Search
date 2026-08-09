// JD-Auction-Search/src/dom/native-list.js v1.6.5
// 原生列表显隐：搜索态隐藏京东原生商品列表，退出搜索态恢复
// 商品提取见 ./extract.js

(function(global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  /**
   * 隐藏原生商品列表 — 多页面搜索模式下，结果由扩展结果面板渲染
   * 优先隐藏整个列表容器（而非逐张卡片）：京东为虚拟列表/懒加载，
   * 仅隐藏卡片时京东可能不再维护这些卡片的可见性，导致清空搜索后即便恢复
   * 卡片 display 原生列表仍空白；隐藏整个容器后，容器重新可见时京东会自行重渲染
   */
  JDSDom.hideNativeProducts = function hideNativeProducts() {
    this._toggleNativeProducts('none');
  };

  /**
   * 恢复原生商品列表显示
   */
  JDSDom.showNativeProducts = function showNativeProducts() {
    this._toggleNativeProducts('');
  };

  /**
   * 切换原生列表 display（隐藏/恢复共用实现）
   * @private
   * @param {string} display - CSS display 值（'none' 隐藏，'' 恢复）
   */
  JDSDom._toggleNativeProducts = function _toggleNativeProducts(display) {
    const container = this.getProductListContainer();
    if (container) {
      container.style.display = display;
    } else {
      this._getProductContainers().forEach(el => { el.style.display = display; });
    }
  };
})(window);
