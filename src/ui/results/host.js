// JD-Auction-Search/src/ui/results/host.js v1.5.5
// 结果面板宿主：覆盖层外壳、面板定位、显隐前置与网格容器
// 面板样式见 ./styles.js，商品渲染见 ../products.js，骨架屏见 ../skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  // 结果面板固定宽度（px），保证每行 5 个结果的稳定布局
  const PANEL_WIDTH = 1230;

  /**
   * 初始化结果面板宿主 — 真实 DOM（非 Shadow）挂在 body
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

    // 浅 DOM 样式：外壳 + 令牌(#jds-results-host 作用域) + 组件样式（见 results/styles.js）
    if (!document.getElementById('jds-results-style')) {
      const style = document.createElement('style');
      style.id = 'jds-results-style';
      style.textContent = this._getResultsCss();
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.id = 'jds-results-panel';
    panel.className = 'jds-results-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', getMessage('a11yResultsPanel'));
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
    // 避免遮挡页面原生导航 auction_nav：若其位于工具栏之下，面板顶部下移到导航底部，
    // 保证导航始终可见可点击（否则 fixed 覆盖层会盖住整页导航）
    const navEl = document.querySelector('#auction_nav, [class*="auction_nav" i], [class*="auction-nav" i]');
    if (navEl) {
      const navRect = navEl.getBoundingClientRect();
      if (navRect.bottom > top) top = Math.round(navRect.bottom);
    }
    panel.style.top = top + 'px';

    // 结果面板固定宽度并居中（由 CSS width/max-width + left:50%/translateX 控制），
    // 不随原生列表宽度变化，保证每行 5 个结果的稳定布局
    panel.style.maxWidth = PANEL_WIDTH + 'px';
    panel.style.width = PANEL_WIDTH + 'px';
  };

  /**
   * 绑定面板定位刷新（滚动/缩放时跟随嵌入工具栏）
   * 性能：scroll/resize 高频触发，用 requestAnimationFrame 合帧，
   * 避免每个滚动事件都执行 getBoundingClientRect 造成强制同步布局抖动
   * @private
   */
  JDSUI._bindResultsPosition = function _bindResultsPosition() {
    if (this._positionBound) return;
    this._positionBound = true;
    let rafId = 0;
    const update = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        this._positionResultsPanel();
      });
    };
    this._positionHandler = update;
    this._cancelPositionRaf = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  };

  /**
   * 解绑面板定位监听（destroy 时调用，避免 window 监听泄漏）
   * @private
   */
  JDSUI._unbindResultsPosition = function _unbindResultsPosition() {
    if (!this._positionBound) return;
    const update = this._positionHandler;
    if (update) {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    }
    if (this._cancelPositionRaf) this._cancelPositionRaf();
    this._positionBound = false;
    this._positionHandler = null;
    this._cancelPositionRaf = null;
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
   * 在结果面板内创建扩展自带的网格容器
   * products.js 与 skeleton.js 共用，避免网格样式重复定义
   * @private
   * @param {HTMLElement} panel - 结果面板容器
   * @returns {HTMLElement}
   */
  JDSUI._createGrid = function _createGrid(panel) {
    const grid = document.createElement('div');
    grid.id = 'jds-product-grid';
    grid.className = 'jds-product-grid';
    grid.setAttribute('aria-live', 'polite');
    // 列数/间距/内边距由 results/styles.js 的 .jds-product-grid 定义，不内联硬编码
    panel.appendChild(grid);
    return grid;
  };
})(window);
