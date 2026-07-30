// JD-Auction-Search/src/ui/results.js v1.4.0
// 结果面板公开 API：展示/隐藏、骨架屏、空状态、销毁
// 面板宿主逻辑见 results/host.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  /**
   * 展示跨页搜索结果（渲染到结果面板）
   * @param {Array} products - 过滤后的商品
   */
  JDSUI.showResults = function showResults(products) {
    this._revealPanel();
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
    this._revealPanel();
    this.renderSkeletons(8);
  };

  /**
   * 显示空状态浮层 — 对齐原型空状态设计（图标 + 标题 + 描述）
   * 浮层渲染在结果面板宿主内，样式由 host.js 的 RESULTS_HOST_CSS 提供
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
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
