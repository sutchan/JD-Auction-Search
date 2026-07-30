// JD-Auction-Search/src/ui/results.js v1.3.5
// 结果面板生命周期：宿主挂载、面板定位、展示/隐藏、空状态、销毁
// 商品渲染见 products.js，骨架屏见 skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

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
   * 展示跨页搜索结果（渲染到结果面板）
   * @param {Array} products - 过滤后的商品
   */
  JDSUI.showResults = function showResults(products) {
    this._initResultsHost();
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    panel.classList.add('is-visible');
    this._positionResultsPanel();
    this.renderProducts(products);
  };

  /**
   * 隐藏结果面板
   */
  JDSUI.hideResults = function hideResults() {
    if (!this.resultsRoot) return;
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    if (panel) panel.classList.remove('is-visible');
    this.hideEmptyState();
  };

  /**
   * 展示加载态骨架屏 — 全局商品仍在加载（如详情页延时抓取）时，
   * 进入搜索态先给出骨架占位而非立即空态，改善感知性能
   */
  JDSUI.showLoading = function showLoading() {
    this._initResultsHost();
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    panel.classList.add('is-visible');
    this._positionResultsPanel();
    this.renderSkeletons(8);
  };

  /**
   * 显示空状态浮层 — 对齐原型空状态设计（图标 + 标题 + 描述）
   * 浮层渲染在结果面板宿主内，样式由 RESULTS_HOST_CSS 提供
   */
  JDSUI.showEmptyState = function showEmptyState() {
    const root = this.resultsRoot || this.shadowRoot;
    if (!root) return;
    if (!this.emptyElement) {
      this.emptyElement = document.createElement('div');
      this.emptyElement.className = 'jds-empty-overlay';
      this.emptyElement.setAttribute('role', 'status');
      this.emptyElement.innerHTML = `
        <div class="jds-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <div class="jds-empty-title">${getMessage('emptyTitle')}</div>
        <div class="jds-empty-desc">${getMessage('emptyDesc')}</div>`;
      root.appendChild(this.emptyElement);
    }
    this.emptyElement.style.display = '';
  };

  /**
   * 隐藏空状态
   */
  JDSUI.hideEmptyState = function hideEmptyState() {
    if (this.emptyElement) {
      this.emptyElement.style.display = 'none';
    }
  };

  /**
   * 销毁UI
   */
  JDSUI.destroy = function destroy() {
    const wrapper = document.getElementById('jds-search-wrapper');
    if (wrapper) wrapper.remove();
    if (this.resultsHost) this.resultsHost.remove();
    this.shadowRoot = null;
    this.resultsRoot = null;
    this.resultsHost = null;
    this.gridElement = null;
    if (this.emptyElement) {
      this.emptyElement.remove();
      this.emptyElement = null;
    }
    const toast = document.querySelector('.jds-toast-stack');
    if (toast) toast.remove();
  };
})(window);
