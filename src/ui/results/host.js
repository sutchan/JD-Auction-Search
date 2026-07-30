// JD-Auction-Search/src/ui/results/host.js v1.4.0
// 结果面板宿主：覆盖层外壳、面板定位、显隐前置与网格容器
// 商品渲染见 products.js，骨架屏见 skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  // 结果面板宿主（真实 DOM，非 Shadow）的覆盖层外壳样式；卡片本身由京东全局 CSS 渲染
  const RESULTS_HOST_CSS = `
    #jds-results-host {
      position: fixed; left: 0; right: 0; top: 0; bottom: 0;
      z-index: 999990;
      /* 透明覆盖层不拦截指针事件：否则搜索激活时会盖住嵌入态工具栏（页面级 z-index 低于本层），
         导致清空/搜索按钮点击失效；清空后宿主仍在 DOM 中，亦会持续拦截整页点击 */
      pointer-events: none;
    }
    #jds-results-host .jds-results-panel {
      position: absolute; inset: 0; overflow-y: auto;
      background: #fff; padding: 16px 0 40px;
      display: none;
      pointer-events: auto;
    }
    #jds-results-host .jds-results-panel.is-visible { display: block; }
    #jds-results-host .jds-empty-overlay {
      position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      color: #71717a; text-align: center;
      background: #fff; border: 1px solid #e4e4e7; border-radius: 10px;
      padding: 48px 64px; box-shadow: 0 4px 6px -1px rgb(24 24 27 / 0.07), 0 2px 4px -2px rgb(24 24 27 / 0.05);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      pointer-events: auto;
    }
    #jds-results-host .jds-empty-icon svg { width: 48px; height: 48px; color: #d4d4d8; }
    #jds-results-host .jds-empty-title { font-size: 15px; font-weight: 600; color: #18181b; }
    #jds-results-host .jds-empty-desc { font-size: 13px; }
  `;

  /**
   * 初始化结果面板宿主 — 真实 DOM（非 Shadow）挂在 body
   * 用真实 DOM 承载，克隆的京东原生卡片才能继承页面全局样式，外观与原始列表一致
   * 面板以 fixed 定位在嵌入工具栏下方，覆盖内容区展示跨页搜索结果
   * @private
   */
  JDSUI._initResultsHost = function _initResultsHost() {
    if (this.resultsHost) return;
    const host = document.createElement('div');
    host.id = 'jds-results-host';
    document.body.appendChild(host);
    this.resultsHost = host;
    this.resultsRoot = host;

    // 仅作用于覆盖层外壳的样式；卡片本身由京东全局 CSS 渲染
    if (!document.getElementById('jds-results-style')) {
      const style = document.createElement('style');
      style.id = 'jds-results-style';
      style.textContent = RESULTS_HOST_CSS;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.className = 'jds-results-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', '搜索结果');
    host.appendChild(panel);

    this._positionResultsPanel();
    this._bindResultsPosition();
  };

  /**
   * 根据嵌入工具栏底部位置定位结果面板顶部
   * @private
   */
  JDSUI._positionResultsPanel = function _positionResultsPanel() {
    if (!this.resultsRoot) return;
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    if (!panel) return;
    const wrapper = document.getElementById('jds-search-wrapper');
    let top = 0;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      top = Math.max(0, Math.round(rect.bottom));
    }
    panel.style.top = top + 'px';

    // 与原始商品列表宽度保持一致：测量原生列表容器，约束结果面板的左/宽
    const listEl = global.JDSDom.getProductListContainer && global.JDSDom.getProductListContainer();
    if (listEl) {
      const r = listEl.getBoundingClientRect();
      panel.style.left = Math.round(r.left) + 'px';
      panel.style.width = Math.round(r.width) + 'px';
      // 解除 inset:0 的 right:0，避免与显式 width 冲突
      panel.style.right = 'auto';
    } else {
      // 无列表容器（页面未就绪）时恢复整屏覆盖
      panel.style.left = '';
      panel.style.width = '';
      panel.style.right = '';
    }
  };

  /**
   * 绑定面板定位刷新（滚动/缩放时跟随嵌入工具栏）
   * @private
   */
  JDSUI._bindResultsPosition = function _bindResultsPosition() {
    if (this._positionBound) return;
    this._positionBound = true;
    const update = () => this._positionResultsPanel();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  };

  /**
   * 初始化结果面板宿主并使其可见（showResults/showLoading 的公共前置逻辑）
   * @private
   */
  JDSUI._revealPanel = function _revealPanel() {
    this._initResultsHost();
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    panel.classList.add('is-visible');
    this._positionResultsPanel();
  };

  /**
   * 在结果面板内创建扩展自带的网格容器（内联样式，独立于京东列表布局）
   * products.js 与 skeleton.js 共用，避免网格样式重复定义
   * @private
   * @returns {HTMLElement}
   */
  JDSUI._createGrid = function _createGrid(panel) {
    const grid = document.createElement('div');
    grid.className = 'jds-product-grid';
    grid.setAttribute('aria-live', 'polite');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
    grid.style.gap = '16px';
    grid.style.padding = '16px 24px 40px';
    // 固定一行 5 个并整体居中（超宽屏下限制最大宽度，避免卡片被拉得过宽）
    grid.style.maxWidth = '1200px';
    grid.style.margin = '0 auto';
    panel.appendChild(grid);
    return grid;
  };
})(window);
