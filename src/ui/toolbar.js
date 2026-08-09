// JD-Auction-Search/src/ui/toolbar.js v1.6.6
// 工具栏外壳：Shadow DOM 注入、嵌入页头（auction_head_right 左侧）与挂载重试
// 事件绑定见 toolbar/events.js，搜索历史见 toolbar/history.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  // 挂载重试：京东 header 有时渲染较慢，最多 20×200ms(~4s) 后回退浮动条
  const MOUNT_RETRY_MAX = 20;
  const MOUNT_RETRY_MS = 200;

  /**
   * 渲染搜索UI — 注入 Shadow DOM 并渲染工具栏
   * @param {Object} state - 应用状态
   * @param {Object} handlers - 事件处理函数
   * @returns {HTMLElement} 工具栏根容器
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
      // 找到页头右侧区（auction_head_right），将工具栏插入到它的左侧（内联），更贴合页面布局。
      // 注意：insertBefore 要求参照节点是 target 的「直接子节点」，京东页面结构可能多层嵌套，
      // 直接传深层后代会抛 NotFoundError 导致整个 init 中断（工具栏完全不渲染）。
      // 故取 rightEl 在 target 下的直系祖先作为参照，取不到则退化为 appendChild。
      const rightEl = global.JDSDom.queryFirst(global.JDSDom.SELECTORS.MOUNT_RIGHT);
      let anchor = null;
      for (let n = rightEl; n && n !== target; n = n.parentNode) {
        if (n.parentNode === target) { anchor = n; break; }
      }
      if (anchor) {
        wrapper.classList.add('jds-embedded', 'jds-inline');
        target.insertBefore(wrapper, anchor);
        styleEl.textContent = this._getInlineStyles(true, true);
      } else {
        wrapper.classList.add('jds-embedded');
        target.appendChild(wrapper);
        styleEl.textContent = this._getInlineStyles(true, !!rightEl);
      }
      return;
    }
    if (attempt < MOUNT_RETRY_MAX) {
      this._mountTimer = setTimeout(
        () => this._mountWithRetry(wrapper, styleEl, attempt + 1),
        MOUNT_RETRY_MS
      );
      return;
    }
    // 回退：浮动条挂载到 body
    wrapper.classList.add('jds-floating');
    document.body.appendChild(wrapper);
  };

  /**
   * 获取UI HTML — 对齐原型的 ext-toolbar 组件结构
   * 真实扩展只注入工具栏；商品由扩展自带内联卡片渲染（见 products.js），不再依赖京东原生 DOM
   * 所有可见文案与 aria 标签均走 getMessage，保证多语言全覆盖
   * @private
   * @returns {string}
   */
  JDSUI._getUIMarkup = function _getUIMarkup() {
    return `
      <div class="jds-toolbar" role="region" aria-label="${getMessage('a11yToolbar')}">
        <div class="jds-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="jds-search-input"
            placeholder="${getMessage('searchPlaceholder')}" aria-label="${getMessage('a11ySearchInput')}" />
          <button class="jds-clear" aria-label="${getMessage('a11yClearSearch')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <button class="jds-search-btn">${getMessage('searchButton')}</button>
          <div class="jds-history" role="listbox" aria-label="${getMessage('historyTitle')}" hidden>
            <div class="jds-history-head">
              <span class="jds-history-title">${getMessage('historyTitle')}</span>
              <button type="button" class="jds-history-clear"
                aria-label="${getMessage('a11yHistoryClear')}">${getMessage('historyClear')}</button>
            </div>
            <ul class="jds-history-list"></ul>
            <div class="jds-history-empty" hidden>${getMessage('historyEmpty')}</div>
          </div>
        </div>
        <span class="jds-count" aria-live="polite">${getMessage('countPrefix')}<strong class="jds-count-num">0</strong>${getMessage('countSuffix')}<span class="jds-loading-hint" hidden></span></span>
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
   * 设置计数后的「加载中」提示 — 全量分页仍在进行时告知用户：
   * 当前展示的是已聚合部分结果，后续页还在加载，避免误以为「已全部搜完」
   * @param {boolean} visible - 是否显示加载提示
   * @param {number} [loaded] - 已聚合商品总数（提示文案用）
   */
  JDSUI.setLoadingHint = function setLoadingHint(visible, loaded) {
    const hint = this.shadowRoot && this.shadowRoot.querySelector('.jds-loading-hint');
    if (!hint) return;
    if (!visible) { hint.hidden = true; hint.textContent = ''; return; }
    hint.hidden = false;
    hint.textContent = getMessage('loadingMore', [String(loaded || 0)]);
  };
})(window);
