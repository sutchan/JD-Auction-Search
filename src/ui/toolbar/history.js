// JD-Auction-Search/src/ui/toolbar/history.js v1.6.8
// 搜索历史：chrome.storage.local 持久化、增删改查与下拉列表渲染/显隐
// 工具栏外壳与事件绑定见 ../toolbar.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  // 搜索历史持久化键（chrome.storage.local）
  JDSUI._STORAGE_KEY = 'jds_search_history';
  // 历史条数上限
  const HISTORY_MAX = 10;
  // 下拉收起动画时长（ms），与 styles 中的过渡保持一致
  const HIDE_DELAY_MS = 160;

  /**
   * 判断 chrome.storage.local 是否可用（测试桩/无权限环境回退纯内存）
   * @private
   * @param {string} method - 需要的方法名（get/set）
   * @returns {boolean}
   */
  function hasStorage(method) {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local &&
      typeof chrome.storage.local[method] === 'function';
  }

  /**
   * 从持久化存储读取搜索历史（chrome.storage.local，刷新后保留）
   * @private
   */
  JDSUI._loadSearchHistory = function _loadSearchHistory() {
    const self = this;
    if (!hasStorage('get')) return;
    try {
      chrome.storage.local.get(self._STORAGE_KEY, (res) => {
        const saved = (res && res[self._STORAGE_KEY]) || [];
        if (Array.isArray(saved) && saved.length) {
          self._searchHistory = saved.slice(0, HISTORY_MAX);
        }
        // 若下拉正打开则刷新展示
        const el = self.shadowRoot && self.shadowRoot.querySelector('.jds-history');
        if (el && !el.hidden) {
          const listEl = self.shadowRoot.querySelector('.jds-history-list');
          const emptyEl = self.shadowRoot.querySelector('.jds-history-empty');
          const input = self.shadowRoot.querySelector('.jds-search-input');
          self._renderHistory(listEl, emptyEl, input);
        }
      });
    } catch (e) { /* 忽略存储异常，保持内存模式 */ }
  };

  /**
   * 持久化搜索历史到 chrome.storage.local
   * @private
   */
  JDSUI._persistHistory = function _persistHistory() {
    if (!hasStorage('set')) return;
    try {
      const data = {};
      data[this._STORAGE_KEY] = (this._searchHistory || []).slice(0, HISTORY_MAX);
      chrome.storage.local.set(data);
    } catch (e) { /* 忽略存储异常，保持内存模式 */ }
  };

  /**
   * 添加搜索历史（去重、置顶、上限 10 条，并持久化）
   * @param {string} keyword - 搜索关键词
   */
  JDSUI._addSearchHistory = function _addSearchHistory(keyword) {
    const kw = (keyword || '').trim();
    if (!kw) return;
    const hist = this._searchHistory || (this._searchHistory = []);
    const idx = hist.indexOf(kw);
    if (idx >= 0) hist.splice(idx, 1);
    hist.unshift(kw);
    if (hist.length > HISTORY_MAX) hist.length = HISTORY_MAX;
    this._persistHistory();
  };

  /**
   * 删除单条历史
   * @param {number} index - 历史项下标
   */
  JDSUI._removeSearchHistory = function _removeSearchHistory(index) {
    const hist = this._searchHistory || (this._searchHistory = []);
    if (index >= 0 && index < hist.length) hist.splice(index, 1);
    this._persistHistory();
  };

  /**
   * 清空全部历史
   */
  JDSUI._clearSearchHistory = function _clearSearchHistory() {
    this._searchHistory = [];
    this._persistHistory();
  };

  // 历史单条项构建（_buildHistoryItem）见 ./history-item.js

  /**
   * 渲染历史下拉列表
   * @private
   */
  JDSUI._renderHistory = function _renderHistory(listEl, emptyEl, input) {
    if (!listEl) return;
    const hist = this._searchHistory || (this._searchHistory = []);
    listEl.innerHTML = '';
    if (hist.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      this._showHistory();
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    // 批量插入减少重排
    const frag = document.createDocumentFragment();
    hist.forEach((kw, i) => {
      frag.appendChild(this._buildHistoryItem(kw, i, listEl, emptyEl, input));
    });
    listEl.appendChild(frag);
    this._showHistory();
  };

  /**
   * 显示历史下拉
   * @private
   */
  JDSUI._showHistory = function _showHistory() {
    const el = this.shadowRoot && this.shadowRoot.querySelector('.jds-history');
    if (!el) return;
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    el.hidden = false;
    // 触发入场过渡动画（保存 rafId 供 destroy 取消，避免销毁后仍加 class）
    if (this._historyRaf) cancelAnimationFrame(this._historyRaf);
    this._historyRaf = requestAnimationFrame(() => {
      el.classList.add('jds-history-open');
      this._historyRaf = null;
    });
  };

  /**
   * 隐藏历史下拉（延迟到收起动画结束）
   * @private
   */
  JDSUI._hideHistory = function _hideHistory() {
    const el = this.shadowRoot && this.shadowRoot.querySelector('.jds-history');
    if (!el) return;
    el.classList.remove('jds-history-open');
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      if (el && !el.classList.contains('jds-history-open')) el.hidden = true;
      this._hideTimer = null;
    }, HIDE_DELAY_MS);
  };
})(window);
