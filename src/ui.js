// JD-Auction-Search/src/ui.js v1.2.6
// UI渲染和事件绑定模块 — shadcn 设计语言 · Shadow DOM 隔离

(function(global) {
  'use strict';

  // 使用 JDSUtils 中的 getMessage 函数
  const getMessage = global.JDSUtils.getMessage;

  const JDSUI = {
    shadowRoot: null,
    emptyElement: null,
    gridElement: null,

    /**
     * 渲染搜索UI — 注入 Shadow DOM 并渲染工具栏 + 商品网格
     * @param {Object} state - 应用状态
     * @param {Object} handlers - 事件处理函数
     */
    renderSearchUI(state, handlers) {
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
    },

    /**
     * 获取工具栏挂载容器 — 优先夺宝岛页面的 auction_head 容器
     * @private
     * @returns {HTMLElement|null}
     */
    _getMountContainer() {
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
    },

    /**
     * 带重试的挂载逻辑 — 先尝试嵌入 auction_head，超时则回退为 body 浮动条
     * @private
     * @param {HTMLElement} wrapper - Shadow DOM 宿主
     * @param {HTMLStyleElement} styleEl - 内联样式节点（用于切换嵌入/浮动样式）
     * @param {number} attempt - 当前尝试次数
     */
    _mountWithRetry(wrapper, styleEl, attempt) {
      const target = this._getMountContainer();
      if (target) {
        wrapper.classList.add('jds-embedded');
        target.appendChild(wrapper);
        // 切换为嵌入态样式：静态内联卡片，去除浮动条偏移
        styleEl.textContent = this._getInlineStyles(true);
        console.log('[JD-Auction-Search] 已嵌入 auction_head 容器');
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
    },

    /**
     * 获取UI HTML — 对齐原型的 ext-toolbar 组件结构
     * 真实扩展只注入工具栏；商品由京东页面自身渲染，由 JDSDom 过滤
     * @private
     * @returns {string}
     */
    _getUIMarkup() {
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
          <div class="jds-tabs" role="tablist" aria-label="商品分类">
            <button class="jds-tab is-active" data-tab="all" role="tab" aria-selected="true">${getMessage('tabAll')}</button>
            <button class="jds-tab" data-tab="ongoing" role="tab" aria-selected="false">${getMessage('tabOngoing')}</button>
            <button class="jds-tab" data-tab="upcoming" role="tab" aria-selected="false">${getMessage('tabUpcoming')}</button>
          </div>
        </div>
      `;
    },

    /**
     * 获取内联样式 — shadcn 语义令牌 + 组件样式，全部注入 Shadow DOM
     * @private
     * @returns {string}
     */
    _getInlineStyles(embedded) {
      // 工具栏布局：嵌入 auction_head 时为静态内联卡片（去浮动/去底栏/去重影）；
      // 回退浮动条时恢复 fixed + 底部分隔 + 阴影，保持与原行为一致
      const toolbarCss = embedded ? `
        .jds-toolbar {
          position: static;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 10px 16px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xs);
          transition: opacity var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out);
        }
      ` : `
        .jds-toolbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 12px 24px;
          background: var(--card);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          transition: opacity var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out);
        }
      `;

      return `
        /* ===== DESIGN TOKENS (shadcn-inspired, zinc + JD red) ===== */
        :host {
          --background: #ffffff;
          --foreground: #18181b;
          --card: #ffffff;
          --primary: #e1251b;
          --primary-hover: #c1170f;
          --primary-foreground: #ffffff;
          --primary-subtle: #fef2f2;
          --primary-muted: #fee2e2;
          --secondary: #f4f4f5;
          --secondary-foreground: #18181b;
          --muted: #fafafa;
          --muted-foreground: #71717a;
          --subtle-foreground: #a1a1aa;
          --border: #e4e4e7;
          --border-strong: #d4d4d8;
          --success: #16a34a;
          --success-subtle: #f0fdf4;
          --warning: #d97706;
          --warning-subtle: #fffbeb;
          --destructive: #dc2626;
          --destructive-subtle: #fef2f2;
          --radius: 10px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 10px;
          --radius-full: 9999px;
          --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
          --shadow-sm: 0 1px 3px 0 rgb(24 24 27 / 0.06), 0 1px 2px -1px rgb(24 24 27 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(24 24 27 / 0.07), 0 2px 4px -2px rgb(24 24 27 / 0.05);
          --shadow-ring: 0 0 0 3px rgb(225 37 27 / 0.12);
          --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          --font-mono: 'SF Mono', ui-monospace, 'Cascadia Code', monospace;
          --dur-fast: 0.15s;
          --dur-base: 0.2s;
          --ease-out: cubic-bezier(0, 0, 0.2, 1);
          --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .jds-root {
          font-family: var(--font-sans);
          color: var(--foreground);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ===== TOOLBAR ===== */
        ${toolbarCss}

        /* Search bar */
        .jds-search {
          flex: 1; min-width: 200px; max-width: 420px;
          display: flex; align-items: center; gap: 8px;
          padding: 4px 4px 4px 12px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: all var(--dur-base) var(--ease-out);
        }
        .jds-search:focus-within { border-color: var(--primary); box-shadow: var(--shadow-ring); }
        .jds-search > svg { width: 15px; height: 15px; color: var(--muted-foreground); flex-shrink: 0; }
        .jds-search-input {
          flex: 1; min-width: 0; border: none; outline: none;
          background: transparent; font-family: var(--font-sans);
          font-size: 13px; color: var(--foreground); padding: 8px 0;
        }
        .jds-search-input::placeholder { color: var(--subtle-foreground); }
        .jds-clear {
          display: none; align-items: center; justify-content: center;
          width: 20px; height: 20px; border: none;
          border-radius: var(--radius-sm);
          background: var(--secondary); color: var(--muted-foreground);
          cursor: pointer; flex-shrink: 0;
          transition: all var(--dur-fast) var(--ease-out);
        }
        .jds-clear:hover { background: var(--secondary); color: var(--foreground); }
        .jds-clear.is-visible { display: flex; }
        .jds-clear svg { width: 12px; height: 12px; }
        .jds-search-btn {
          border: none; background: var(--primary); color: var(--primary-foreground);
          padding: 8px 16px; border-radius: var(--radius-sm);
          font-family: var(--font-sans); font-size: 12px; font-weight: 600;
          cursor: pointer; flex-shrink: 0;
          transition: background var(--dur-fast) var(--ease-out);
        }
        .jds-search-btn:hover { background: var(--primary-hover); }

        /* Tabs */
        .jds-tabs {
          display: inline-flex; gap: 2px; padding: 3px;
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .jds-tab {
          padding: 8px 12px; border: none; background: transparent;
          color: var(--muted-foreground); font-family: var(--font-sans);
          font-size: 12px; font-weight: 500;
          border-radius: var(--radius-sm); cursor: pointer; white-space: nowrap;
          transition: all var(--dur-fast) var(--ease-out);
        }
        .jds-tab:hover { color: var(--foreground); }
        .jds-tab.is-active {
          background: var(--background); color: var(--foreground);
          font-weight: 600; box-shadow: var(--shadow-xs);
        }

        /* ===== PRODUCT GRID (optional, for renderProducts API) ===== */
        .jds-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px; padding: 16px;
          background: var(--muted);
          min-height: 420px;
        }

        /* Product card */
        .jds-product-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); overflow: hidden;
          cursor: pointer;
          transition: all var(--dur-base) var(--ease-out);
          animation: jds-cardIn 0.4s var(--ease-out) backwards;
        }
        .jds-product-card:hover {
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        @keyframes jds-cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .jds-product-img {
          height: 120px; display: grid; place-items: center;
          font-size: 40px;
          background: linear-gradient(135deg, var(--secondary) 0%, var(--muted) 100%);
          position: relative; overflow: hidden;
        }
        .jds-product-body { padding: 12px; }
        .jds-product-name {
          font-size: 12px; font-weight: 500; color: var(--foreground);
          line-height: 1.45; margin-bottom: 8px; min-height: 34px;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .jds-product-price {
          font-size: 18px; font-weight: 600;
          color: var(--primary); letter-spacing: -0.01em;
          margin-bottom: 8px;
        }
        .jds-product-price small { font-size: 11px; color: var(--muted-foreground); font-weight: 400; }
        .jds-product-meta {
          display: flex; align-items: center;
          justify-content: space-between; gap: 8px;
        }

        /* Badge */
        .jds-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; font-family: var(--font-mono);
          font-size: 10px; font-weight: 600; letter-spacing: 0.03em;
          border-radius: var(--radius-sm); border: 1px solid transparent;
        }
        .jds-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }
        .jds-badge-primary { background: var(--primary-subtle); color: var(--primary); }
        .jds-badge-primary::before { background: var(--primary); }
        .jds-badge-warning { background: var(--warning-subtle); color: var(--warning); }
        .jds-badge-warning::before { background: var(--warning); }
        .jds-badge-ongoing::before { animation: jds-pulse 1.6s var(--ease-out) infinite; }
        @keyframes jds-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        /* Empty state overlay — 对齐原型空状态设计 */
        .jds-empty-overlay {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 48px 64px;
          text-align: center;
          z-index: 999998;
          box-shadow: var(--shadow-md);
          animation: jds-fadeIn 0.3s var(--ease-out);
        }
        @keyframes jds-fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) translateY(-8px); }
          to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
        }
        .jds-empty-icon {
          width: 56px; height: 56px; border-radius: var(--radius-full);
          background: var(--secondary); display: grid; place-items: center;
          margin: 0 auto 16px; color: var(--subtle-foreground);
        }
        .jds-empty-icon svg { width: 26px; height: 26px; }
        .jds-empty-title {
          font-size: 18px; font-weight: 600;
          color: var(--foreground); margin-bottom: 8px;
          letter-spacing: -0.01em;
        }
        .jds-empty-desc {
          font-size: 13px; color: var(--muted-foreground);
          max-width: 32ch; line-height: 1.6;
        }

        /* Skeleton loading (for renderSkeletons API) */
        .jds-skeleton-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); overflow: hidden;
        }
        .jds-skel {
          background: linear-gradient(90deg, var(--secondary) 25%, var(--muted) 50%, var(--secondary) 75%);
          background-size: 200% 100%;
          animation: jds-shimmer 1.4s infinite;
        }
        @keyframes jds-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .jds-skel-img { height: 120px; }
        .jds-skel-line { height: 10px; margin: 12px; border-radius: var(--radius-sm); }
        .jds-skel-line:last-child { width: 50%; margin-bottom: 16px; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .jds-toolbar { padding: 10px 12px; gap: 10px; }
          .jds-search { order: 1; max-width: none; width: 100%; }
          .jds-tabs { order: 2; }
          .jds-product-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px; padding: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
    },

    /**
     * 绑定UI事件
     * @private
     * @param {HTMLElement} container - UI容器
     * @param {Object} state - 应用状态
     * @param {Object} handlers - 事件处理函数
     */
    _bindEvents(container, state, handlers) {
      const input = container.querySelector('.jds-search-input');
      const clearBtn = container.querySelector('.jds-clear');
      const searchBtn = container.querySelector('.jds-search-btn');
      const tabs = container.querySelectorAll('.jds-tab');

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

      // Tab 切换 — 同步 ARIA 状态
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => {
            t.classList.remove('is-active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('is-active');
          tab.setAttribute('aria-selected', 'true');
          state.currentTab = tab.dataset.tab;
          handlers.onTabChange();
        });
      });
    },

    /**
     * 渲染骨架屏加载占位
     * @param {number} count - 骨架卡片数量
     */
    renderSkeletons(count = 8) {
      this._ensureGrid();
      if (!this.gridElement) return;
      this.gridElement.setAttribute('aria-busy', 'true');
      this.gridElement.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'jds-skeleton-card';
        card.innerHTML = '<div class="jds-skel jds-skel-img"></div><div class="jds-skel jds-skel-line"></div><div class="jds-skel jds-skel-line"></div>';
        this.gridElement.appendChild(card);
      }
    },

    /**
     * 确保商品网格容器存在（按需创建）
     * @private
     */
    _ensureGrid() {
      if (this.gridElement || !this.shadowRoot) return;
      const root = this.shadowRoot.querySelector('.jds-root');
      if (!root) return;
      const grid = document.createElement('div');
      grid.className = 'jds-product-grid';
      grid.setAttribute('aria-live', 'polite');
      grid.setAttribute('aria-busy', 'true');
      root.appendChild(grid);
      this.gridElement = grid;
    },

    /**
     * 渲染商品列表到网格
     * @param {Array} products - 商品数组
     */
    renderProducts(products) {
      this._ensureGrid();
      if (!this.gridElement) return;
      this.gridElement.setAttribute('aria-busy', 'false');

      if (!products || products.length === 0) {
        this.showEmptyState();
        return;
      }
      this.hideEmptyState();

      this.gridElement.innerHTML = '';
      products.forEach((p, i) => {
        const name = p.name || p.title || '';
        const price = p.price || p.currentPrice || 0;
        const isOngoing = global.JDSUtils.isOngoing(p);
        const statusLabel = isOngoing ? getMessage('tabOngoing') : getMessage('tabUpcoming');
        const countdown = p.countdown || p.remainTime || '';

        const card = document.createElement('div');
        card.className = 'jds-product-card';
        card.style.animationDelay = `${i * 0.03}s`;
        card.innerHTML = `
          <div class="jds-product-img"><span>${p.icon || '📦'}</span></div>
          <div class="jds-product-body">
            <div class="jds-product-name">${name}</div>
            <div class="jds-product-price"><small>¥ </small>${Number(price).toLocaleString()}</div>
            <div class="jds-product-meta">
              <span class="jds-badge jds-badge-${isOngoing ? 'primary' : 'warning'} ${isOngoing ? 'jds-badge-ongoing' : ''}">${statusLabel}</span>
              ${countdown ? `<span class="jds-countdown">${countdown}</span>` : ''}
            </div>
          </div>`;
        this.gridElement.appendChild(card);
      });
    },

    /**
     * 初始化结果面板宿主 — 独立 Shadow DOM 挂在 body，避免被嵌入的页头裁剪
     * 面板以 fixed 定位在嵌入工具栏下方，覆盖内容区展示跨页搜索结果
     * @private
     */
    _initResultsHost() {
      if (this.resultsHost) return;
      const host = document.createElement('div');
      host.id = 'jds-results-host';
      document.body.appendChild(host);
      this.resultsHost = host;

      this.resultsRoot = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = this._getInlineStyles(true);
      this.resultsRoot.appendChild(style);

      // 面板定位样式（独立追加，避免污染工具栏宿主）
      const panelStyle = document.createElement('style');
      panelStyle.textContent = `
        .jds-results-panel {
          position: fixed; left: 0; right: 0; bottom: 0; top: 0;
          overflow-y: auto; background: var(--muted);
          z-index: 999990; padding: 16px 24px 32px;
          display: none;
        }
        .jds-results-panel.is-visible { display: block; }
        .jds-results-panel .jds-product-grid { margin-top: 0; }
      `;
      this.resultsRoot.appendChild(panelStyle);

      const panel = document.createElement('div');
      panel.className = 'jds-results-panel';
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', '跨页搜索结果');
      panel.innerHTML = '<div class="jds-product-grid" aria-live="polite" aria-busy="true"></div>';
      this.resultsRoot.appendChild(panel);

      this.gridElement = panel.querySelector('.jds-product-grid');
      this._positionResultsPanel();
      this._bindResultsPosition();
    },

    /**
     * 根据嵌入工具栏底部位置定位结果面板顶部
     * @private
     */
    _positionResultsPanel() {
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
    },

    /**
     * 绑定面板定位刷新（滚动/缩放时跟随嵌入工具栏）
     * @private
     */
    _bindResultsPosition() {
      if (this._positionBound) return;
      this._positionBound = true;
      const update = () => this._positionResultsPanel();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
    },

    /**
     * 展示跨页搜索结果（渲染到结果面板）
     * @param {Array} products - 过滤后的商品
     */
    showResults(products) {
      this._initResultsHost();
      const panel = this.resultsRoot.querySelector('.jds-results-panel');
      panel.classList.add('is-visible');
      this._positionResultsPanel();
      this.renderProducts(products);
    },

    /**
     * 隐藏结果面板
     */
    hideResults() {
      if (!this.resultsRoot) return;
      const panel = this.resultsRoot.querySelector('.jds-results-panel');
      if (panel) panel.classList.remove('is-visible');
      this.hideEmptyState();
    },

    /**
     * 显示空状态浮层 — 对齐原型空状态设计（图标 + 标题 + 描述）
     * 浮层渲染在 Shadow DOM 内，样式隔离
     */
    showEmptyState() {
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
    },

    /**
     * 隐藏空状态
     */
    hideEmptyState() {
      if (this.emptyElement) {
        this.emptyElement.style.display = 'none';
      }
    },

    /**
     * 销毁UI
     */
    destroy() {
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
    }
  };

  global.JDSUI = JDSUI;
})(window);
