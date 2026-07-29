// JD-Auction-Search/src/ui/skeleton.js v1.3.5
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
      grid = document.createElement('div');
      grid.className = 'jds-product-grid';
      grid.setAttribute('aria-live', 'polite');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
      grid.style.gap = '12px';
      grid.style.padding = '16px 24px 40px';
      panel.appendChild(grid);
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
    this.gridElement.setAttribute('aria-busy', 'true');
    this.gridElement.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'jds-skeleton-card';
      card.innerHTML = '<div class="jds-skel jds-skel-img"></div><div class="jds-skel jds-skel-line"></div><div class="jds-skel jds-skel-line"></div>';
      this.gridElement.appendChild(card);
    }
    // 渲染完成后清除 busy 状态，避免长期占用
    this.gridElement.setAttribute('aria-busy', 'false');
  };
})(window);
