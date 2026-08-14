// JD-Auction-Search/src/ui/results.js v1.6.11
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
      this.emptyElement.id = 'jds-empty-overlay';
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
        <div class="jds-empty-desc">${getMessage('emptyDesc')}</div>
        <button type="button" class="jds-empty-action">${getMessage('emptyAction')}</button>`;
      // 清除搜索：复用工具栏已验证的清空逻辑（清空输入 + 退出搜索态 + 恢复原生列表），
      // 通过 JDSUI.clearSearch() 跨 Shadow 调用，避免 document.querySelector 穿透
      // closed Shadow DOM 找不到内部 .jds-clear 而失效（仅 hideEmptyState 不真正清空）
      const actionBtn = this.emptyElement.querySelector('.jds-empty-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          if (typeof JDSUI.clearSearch === 'function') JDSUI.clearSearch();
          else this.hideEmptyState();
        });
      }
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
    // 清理定时器与监听，避免 destroy 后回调仍执行导致内存泄漏 / 空引用
    if (this._mountTimer) { clearTimeout(this._mountTimer); this._mountTimer = null; }
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    if (this._historyRaf) { cancelAnimationFrame(this._historyRaf); this._historyRaf = null; }
    if (typeof this._clearDebounce === 'function') this._clearDebounce();
    this._clearDebounce = null;
    if (this.shadowRoot && this._onFocusOut) {
      this.shadowRoot.removeEventListener('focusout', this._onFocusOut);
    }
    this._onFocusOut = null;
    this._historyCtx = null;
    this.clearSearch = null;
    // 释放倒计时单例计时器，避免 destroy 后 interval 仍持有 DOM 引用
    if (typeof this.clearCountdowns === 'function') this.clearCountdowns();

    const wrapper = document.getElementById('jds-search-wrapper');
    if (wrapper) wrapper.remove();
    if (this.resultsHost) this.resultsHost.remove();
    this._unbindResultsPosition();
    this.shadowRoot = null;
    this.resultsRoot = null;
    this.resultsHost = null;
    this.gridElement = null;
    this._renderPage = 0;
    if (this.emptyElement) {
      this.emptyElement.remove();
      this.emptyElement = null;
    }
    const toast = document.querySelector('.jds-toast-stack');
    if (toast) toast.remove();
  };
})(window);
