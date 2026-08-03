// JD-Auction-Search/src/ui/toolbar.js v1.5.2
// 工具栏：Shadow DOM 注入、嵌入页头（auction_head_right 左侧）、事件绑定

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  /**
   * 渲染搜索UI — 注入 Shadow DOM 并渲染工具栏
   * @param {Object} state - 应用状态
   * @param {Object} handlers - 事件处理函数
   */
  JDSUI.renderSearchUI = function renderSearchUI(state, handlers) {
    const wrapper = document.createElement('div');
    wrapper.id = 'jds-search-wrapper';

    this.shadowRoot = wrapper.attachShadow({ mode: 'closed' });

    // 设计令牌 + 组件样式全部内联到 Shadow DOM，确保样式隔离且可生效
    const style = document.createElement('style');
    // 默认按浮动条生成，挂载到 auction_head 后再切换为嵌入态样式（避免页面延迟渲染 header 时样式错位）
    style.textContent = this._getInlineStyles(false);
    this.shadowRoot.appendChild(style);

    // 工具栏容器
    const container = document.createElement('div');
    container.id = 'jds-toolbar-root';
    container.className = 'jds-root';
    container.innerHTML = this._getUIMarkup();
    this.shadowRoot.appendChild(container);

    this._bindEvents(container, state, handlers);

    // 挂载：优先嵌入夺宝岛页面的 auction_head 容器，页面 header 可能延迟渲染则重试，最终回退为浮动条
    this._mountWithRetry(wrapper, style, 0);

    return container;
  };

  /**
   * 获取工具栏挂载容器 — 优先夺宝岛页面的 auction_head 容器
   * @private
   * @returns {HTMLElement|null}
   */
  JDSUI._getMountContainer = function _getMountContainer() {
    // 选择器集中维护在 src/dom/selectors.js（JDSDom.SELECTORS.MOUNT）
    return global.JDSDom.queryFirst(global.JDSDom.SELECTORS.MOUNT);
  };

  /**
   * 带重试的挂载逻辑 — 先尝试嵌入 auction_head，超时则回退为 body 浮动条
   * @private
   * @param {HTMLElement} wrapper - Shadow DOM 宿主
   * @param {HTMLStyleElement} styleEl - 内联样式节点（用于切换嵌入/浮动样式）
   * @param {number} attempt - 当前尝试次数
   */
  JDSUI._mountWithRetry = function _mountWithRetry(wrapper, styleEl, attempt) {
    const target = this._getMountContainer();
    if (target) {
      // 找到页头右侧区（auction_head_right），将工具栏插入到它的左侧（内联），更贴合页面布局
      const rightEl = global.JDSDom.queryFirst(global.JDSDom.SELECTORS.MOUNT_RIGHT);
      if (rightEl) {
        wrapper.classList.add('jds-embedded', 'jds-inline');
        target.insertBefore(wrapper, rightEl);
        styleEl.textContent = this._getInlineStyles(true, true);
      } else {
        wrapper.classList.add('jds-embedded');
        target.appendChild(wrapper);
        styleEl.textContent = this._getInlineStyles(true, false);
      }
      return;
    }
    // 京东 header 有时渲染较慢，延长重试窗口至 ~4s（20×200ms）再回退浮动条，避免过早遮挡内容
    if (attempt < 20) {
      setTimeout(() => this._mountWithRetry(wrapper, styleEl, attempt + 1), 200);
      return;
    }
    // 回退：浮动条挂载到 body
    wrapper.classList.add('jds-floating');
    document.body.appendChild(wrapper);
  };

  /**
   * 获取UI HTML — 对齐原型的 ext-toolbar 组件结构
   * 真实扩展只注入工具栏；商品由扩展自带内联卡片渲染（见 products.js），不再依赖京东原生 DOM
   * @private
   * @returns {string}
   */
  JDSUI._getUIMarkup = function _getUIMarkup() {
    return `
      <div class="jds-toolbar" role="region" aria-label="夺宝搜索工具栏">
        <div class="jds-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="jds-search-input"
            placeholder="${getMessage('searchPlaceholder')}" aria-label="搜索商品" />
          <button class="jds-clear" aria-label="清除搜索">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <button class="jds-search-btn">${getMessage('searchButton')}</button>
          <div class="jds-history" role="listbox" aria-label="搜索历史" hidden>
            <div class="jds-history-head">
              <span class="jds-history-title">${getMessage('historyTitle')}</span>
              <button type="button" class="jds-history-clear" aria-label="清空搜索历史">${getMessage('historyClear')}</button>
            </div>
            <ul class="jds-history-list"></ul>
            <div class="jds-history-empty" hidden>${getMessage('historyEmpty')}</div>
          </div>
        </div>
        <span class="jds-count" aria-live="polite">共 <strong class="jds-count-num">0</strong> 件</span>
      </div>
    `;
  };

  /**
   * 更新工具栏匹配计数 — 搜索态实时刷新命中件数
   * @param {number} n - 匹配商品数量
   */
  JDSUI.updateResultCount = function updateResultCount(n) {
    const num = this.shadowRoot && this.shadowRoot.querySelector('.jds-count-num');
    if (num) num.textContent = String(n);
  };

  /**
   * 绑定UI事件
   * @private
   * @param {HTMLElement} container - UI容器
   * @param {Object} state - 应用状态
   * @param {Object} handlers - 事件处理函数
   */
  JDSUI._bindEvents = function _bindEvents(container, state, handlers) {
    const input = container.querySelector('.jds-search-input');
    const clearBtn = container.querySelector('.jds-clear');
    const searchBtn = container.querySelector('.jds-search-btn');
    const historyEl = container.querySelector('.jds-history');
    const historyList = container.querySelector('.jds-history-list');
    const historyEmpty = container.querySelector('.jds-history-empty');
    const historyClear = container.querySelector('.jds-history-clear');

    // 保存上下文供历史项点击复用（填充+搜索+同步状态）
    this._historyCtx = { handlers, state, input, clearBtn };

    // 统一提交搜索：记录历史 → 隐藏下拉 → 触发外层 handler
    const submit = () => {
      const kw = input.value.trim();
      if (kw) this._addSearchHistory(kw);
      this._hideHistory();
      handlers.onSearch();
    };

    // 搜索框输入 — 实时过滤 + 清除按钮显隐
    // 防抖：避免每键击都全量重过滤+重渲染全局商品（结果量多时卡顿）
    let debounceTimer = null;
    // 防抖 120ms：避免连续键击触发全量重过滤+重渲染（结果量多时卡顿）
    const DEBOUNCE_MS = 120;
    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.keyword = val;
      clearBtn.classList.toggle('is-visible', val.length > 0);
      // 有输入时不展示历史下拉（避免与实时搜索结果混淆）
      if (val.length > 0) this._hideHistory();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handlers.onInput(), DEBOUNCE_MS);
    });

    // 聚焦且为空：展示历史下拉
    input.addEventListener('focus', () => {
      if (input.value.trim().length === 0) this._renderHistory(historyList, historyEmpty, input);
    });

    // 搜索框回车
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    // 外部点击关闭下拉
    document.addEventListener('click', (e) => {
      if (historyEl && !historyEl.contains(e.target) && e.target !== input) this._hideHistory();
    });

    // 清除按钮
    clearBtn.addEventListener('click', () => {
      input.value = '';
      state.keyword = '';
      clearBtn.classList.remove('is-visible');
      input.focus();
      handlers.onClear();
      this._renderHistory(historyList, historyEmpty, input);
    });

    // 搜索按钮
    searchBtn.addEventListener('click', submit);

    // 清空历史
    if (historyClear) {
      historyClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this._clearSearchHistory();
        this._renderHistory(historyList, historyEmpty, input);
      });
    }
  };

  /**
   * 添加搜索历史（去重、置顶、上限 10 条）
   * @param {string} keyword
   */
  JDSUI._addSearchHistory = function _addSearchHistory(keyword) {
    const kw = (keyword || '').trim();
    if (!kw) return;
    const hist = this._searchHistory || (this._searchHistory = []);
    const idx = hist.indexOf(kw);
    if (idx >= 0) hist.splice(idx, 1);
    hist.unshift(kw);
    if (hist.length > 10) hist.length = 10;
  };

  /**
   * 删除单条历史
   * @param {number} index
   */
  JDSUI._removeSearchHistory = function _removeSearchHistory(index) {
    const hist = this._searchHistory || (this._searchHistory = []);
    if (index >= 0 && index < hist.length) hist.splice(index, 1);
  };

  /**
   * 清空全部历史
   */
  JDSUI._clearSearchHistory = function _clearSearchHistory() {
    this._searchHistory = [];
  };

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
    hist.forEach((kw, i) => {
      const li = document.createElement('li');
      li.className = 'jds-history-item';
      li.setAttribute('role', 'option');

      const text = document.createElement('span');
      text.className = 'jds-history-text';
      text.textContent = kw;   // textContent 防 XSS
      li.appendChild(text);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'jds-history-del';
      del.setAttribute('aria-label', '删除该历史');
      del.textContent = '×';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeSearchHistory(i);
        this._renderHistory(listEl, emptyEl, input);
      });
      li.appendChild(del);

      // 点击历史项：填入并搜索
      li.addEventListener('click', () => {
        const ctx = this._historyCtx || {};
        input.value = kw;
        if (ctx.clearBtn) ctx.clearBtn.classList.add('is-visible');
        if (ctx.state) ctx.state.keyword = kw;
        this._hideHistory();
        // 触发外层搜索（已在历史中，无需重复记录）；同步刷新过滤/计数
        if (ctx.handlers) {
          if (ctx.handlers.onInput) ctx.handlers.onInput();
          ctx.handlers.onSearch();
        }
      });
      listEl.appendChild(li);
    });
    this._showHistory();
  };

  /**
   * 显示/隐藏历史下拉
   * @private
   */
  JDSUI._showHistory = function _showHistory() {
    const el = this.shadowRoot && this.shadowRoot.querySelector('.jds-history');
    if (el) el.hidden = false;
  };
  JDSUI._hideHistory = function _hideHistory() {
    const el = this.shadowRoot && this.shadowRoot.querySelector('.jds-history');
    if (el) el.hidden = true;
  };
})(window);
