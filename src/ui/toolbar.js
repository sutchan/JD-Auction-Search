// JD-Auction-Search/src/ui/toolbar.js v1.5.3
// 工具栏：Shadow DOM 注入、嵌入页头（auction_head_right 左侧）、事件绑定

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  // 搜索历史持久化键（chrome.storage.local）
  JDSUI._STORAGE_KEY = 'jds_search_history';

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

    // 加载持久化搜索历史（刷新后保留），无 storage 时回退内存
    this._loadSearchHistory();

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
      if (e.key === 'Enter') {
        e.preventDefault();
        // 若有键盘选中的历史项，则以其作为关键词
        const active = historyList.querySelector('.jds-history-item.is-active .jds-history-text');
        if (active) {
          input.value = active.textContent;
          if (this._historyCtx && this._historyCtx.clearBtn) this._historyCtx.clearBtn.classList.add('is-visible');
          if (this._historyCtx && this._historyCtx.state) this._historyCtx.state.keyword = active.textContent;
        }
        submit();
        return;
      }
      // 键盘上下导航历史项
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(historyList.querySelectorAll('.jds-history-item'));
        if (items.length === 0) return;
        e.preventDefault();
        const active = historyList.querySelector('.jds-history-item.is-active');
        let next = 0;
        if (active) {
          const curIdx = items.indexOf(active);
          active.classList.remove('is-active');
          next = e.key === 'ArrowDown'
            ? (curIdx + 1) % items.length
            : (curIdx - 1 + items.length) % items.length;
        }
        items[next].classList.add('is-active');
        items[next].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Escape') {
        this._hideHistory();
        input.blur();
      }
    });

    // 失焦关闭下拉：聚焦移出工具栏 Shadow 时收起。
    // 用 focusout（blur 的冒泡版）而非 document click/pointerdown，
    // 彻底规避 closed Shadow DOM 下 composedPath/retarget 不可靠导致的误关/吞点击。
    // 点击历史项（li 不可聚焦）不会令 input 失焦，下拉保持、click 正常生效。
    const onFocusOut = (e) => {
      const next = e.relatedTarget;
      // 焦点移出 Shadow（外部/空白）才关闭；留在内部则不关
      if (!next || !this.shadowRoot.contains(next)) this._hideHistory();
    };
    this.shadowRoot.addEventListener('focusout', onFocusOut);
    this._onFocusOut = onFocusOut;

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
   * 从持久化存储读取搜索历史（chrome.storage.local，刷新后保留）
   * @private
   */
  JDSUI._loadSearchHistory = function _loadSearchHistory() {
    const self = this;
    // 兼容无 storage 权限/环境（如测试桩）：回退内存
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local ||
        typeof chrome.storage.local.get !== 'function') return;
    try {
      chrome.storage.local.get(self._STORAGE_KEY, (res) => {
        const saved = (res && res[self._STORAGE_KEY]) || [];
        if (Array.isArray(saved) && saved.length) {
          self._searchHistory = saved.slice(0, 10);
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
    const self = this;
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local ||
        typeof chrome.storage.local.set !== 'function') return;
    try {
      const data = {};
      data[self._STORAGE_KEY] = (self._searchHistory || []).slice(0, 10);
      chrome.storage.local.set(data);
    } catch (e) { /* 忽略存储异常，保持内存模式 */ }
  };

  /**
   * 添加搜索历史（去重、置顶、上限 10 条，并持久化）
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
    this._persistHistory();
  };

  /**
   * 删除单条历史
   * @param {number} index
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
    if (!el) return;
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    el.hidden = false;
    // 触发入场过渡动画
    requestAnimationFrame(() => el.classList.add('jds-history-open'));
  };
  JDSUI._hideHistory = function _hideHistory() {
    const el = this.shadowRoot && this.shadowRoot.querySelector('.jds-history');
    if (!el) return;
    el.classList.remove('jds-history-open');
    // 延迟隐藏以便收起动画播放完毕
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      if (el && !el.classList.contains('jds-history-open')) el.hidden = true;
      this._hideTimer = null;
    }, 160);
  };
})(window);
