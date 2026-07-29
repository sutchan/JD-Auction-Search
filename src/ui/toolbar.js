// JD-Auction-Search/src/ui/toolbar.js v1.3.0
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
    container.className = 'jds-root';
    container.innerHTML = this._getUIMarkup();
    this.shadowRoot.appendChild(container);

    this.gridElement = container.querySelector('.jds-product-grid');
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
    // 夺宝岛页面 (1paipai.jd.com/auction-list/) 的页头容器为 class="auction_head"（下划线）
    const selectors = [
      'div.auction_head',
      '[class*="auction_head" i]',
      '#auction_head',
      '[id*="auction_head" i]',
      '[class*="auction-head" i]',
      '[class*="auctionHead" i]',
      '[data-module="auction_head"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
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
      const rightEl = target.querySelector('[class*="auction_head_right" i], [id*="auction_head_right" i]');
      if (rightEl) {
        wrapper.classList.add('jds-embedded', 'jds-inline');
        target.insertBefore(wrapper, rightEl);
        styleEl.textContent = this._getInlineStyles(true, true);
        console.log('[JD-Auction-Search] 已嵌入 auction_head 容器（位于 auction_head_right 左侧）');
      } else {
        wrapper.classList.add('jds-embedded');
        target.appendChild(wrapper);
        styleEl.textContent = this._getInlineStyles(true, false);
        console.log('[JD-Auction-Search] 已嵌入 auction_head 容器');
      }
      return;
    }
    if (attempt < 8) {
      setTimeout(() => this._mountWithRetry(wrapper, styleEl, attempt + 1), 200);
      return;
    }
    // 回退：浮动条挂载到 body
    wrapper.classList.add('jds-floating');
    document.body.appendChild(wrapper);
    console.log('[JD-Auction-Search] 未找到 auction_head，回退为浮动条');
  };

  /**
   * 获取UI HTML — 对齐原型的 ext-toolbar 组件结构
   * 真实扩展只注入工具栏；商品由京东页面自身渲染，由 JDSDom 过滤
   * @private
   * @returns {string}
   */
  JDSUI._getUIMarkup = function _getUIMarkup() {
    return `
      <div class="jds-toolbar" role="region" aria-label="夺宝搜索工具栏">
        <div class="jds-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="jds-search-input" placeholder="${getMessage('searchPlaceholder')}" aria-label="搜索商品" />
          <button class="jds-clear" aria-label="清除搜索">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <button class="jds-search-btn">${getMessage('searchButton')}</button>
        </div>
      </div>
    `;
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

    // 搜索框输入 — 实时过滤 + 清除按钮显隐
    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.keyword = val;
      clearBtn.classList.toggle('is-visible', val.length > 0);
      handlers.onInput();
    });

    // 搜索框回车
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handlers.onSearch();
    });

    // 清除按钮
    clearBtn.addEventListener('click', () => {
      input.value = '';
      state.keyword = '';
      clearBtn.classList.remove('is-visible');
      input.focus();
      handlers.onClear();
    });

    // 搜索按钮
    searchBtn.addEventListener('click', () => handlers.onSearch());
  };
})(window);
