// JD-Auction-Search/src/ui/skeleton.js v1.6.4
// 骨架屏：结果面板 fallback 网格容器创建与 shimmer 占位渲染
// 商品渲染见 products.js，面板生命周期见 results.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 确保结果面板内存在一个 fallback 网格容器（供骨架屏 / 回退卡片使用）
   * @private
   */
  JDSUI._ensureGrid = function _ensureGrid() {
    if (this.gridElement) return;
    this._initResultsHost();
    const panel = this.resultsRoot && this.resultsRoot.querySelector('.jds-results-panel');
    if (!panel) return;
    let grid = panel.querySelector('.jds-product-grid');
    if (!grid) {
      grid = this._createGrid(panel);
    }
    this.gridElement = grid;
  };

  /**
   * 渲染骨架屏加载占位
   * @param {number} count - 骨架卡片数量
   */
  JDSUI.renderSkeletons = function renderSkeletons(count = 8) {
    this._ensureGrid();
    if (!this.gridElement) return;
    this.gridElement.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'jds-skeleton-card';
      card.innerHTML = '<div class="jds-skel jds-skel-img"></div>' +
        '<div class="jds-skel jds-skel-line"></div>' +
        '<div class="jds-skel jds-skel-line"></div>';
      this.gridElement.appendChild(card);
    }
  };
})(window);
