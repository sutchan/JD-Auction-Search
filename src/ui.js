// JD-Auction-Search/src/ui.js v1.2.14
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
        </div>
      `;
    },

    /**
     * 获取内联样式 — shadcn 语义令牌 + 组件样式，全部注入 Shadow DOM
     * @private
     * @param {boolean} embedded - 是否嵌入 auction_head（false 时回退为浮动条）
     * @param {boolean} inline - 是否内联在 auction_head_right 左侧（true 时不占满整行）
     * @returns {string}
     */
    _getInlineStyles(embedded, inline = false) {
      // 工具栏布局：嵌入 auction_head 时为静态内联卡片（去浮动/去底栏/去重影）；
      // 回退浮动条时恢复 fixed + 底部分隔 + 阴影，保持与原行为一致
      const toolbarCss = embedded ? `
        .jds-toolbar {
          position: static;
          ${inline ? 'width: auto; flex: 0 1 auto; align-self: center;' : 'width: 100%;'}
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 10px 16px;
          background: var(--card);
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

        /* 内联定位：置于 auction_head_right 左侧，作为页头 flex 子项，不占满整行 */
        :host(.jds-inline) {
          display: inline-flex;
          flex: 0 1 auto;
          align-self: center;
          margin-right: 12px;
          width: auto;
          max-width: 100%;
        }
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
        .jds-product-img-el { width: 100%; height: 100%; object-fit: cover; display: block; }
        .jds-product-img-fallback { display: none; }
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
     * 渲染商品列表到结果面板
     * 优先克隆页面上的京东原生商品卡片（含其 grid 容器），使搜索结果外观与原始页面完全一致；
     * 仅当页面无原生卡片模板时，回退为扩展自带卡片。
     * @param {Array} products - 商品数组
     */
    renderProducts(products) {
      const panel = this.resultsRoot && this.resultsRoot.querySelector('.jds-results-panel');
      if (!panel) return;
      this.gridElement = null;
      panel.innerHTML = '';

      if (!products || products.length === 0) {
        this.showEmptyState();
        return;
      }
      this.hideEmptyState();

      const template = global.JDSDom.getFirstProductCard();
      if (template) {
        // 克隆京东原生列表容器（保留其 grid 布局类名，使卡片样式与原始页面一致）
        // 关键：显式强制为可见 grid 布局，避免继承京东“未展开/懒加载”状态导致的整片 display:none 不显示
        const listWrapper = template.parentElement;
        const grid = listWrapper ? listWrapper.cloneNode(false) : document.createElement('div');
        grid.removeAttribute('id');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        grid.style.gap = '12px';
        grid.style.padding = '16px 24px 40px';
        grid.innerHTML = '';
        products.forEach((p) => {
          try {
            const card = template.cloneNode(true);
            // 关键修复：克隆体会继承 hideNativeProducts 设置的内联 display:none，
            // 必须显式清除，否则卡片本身不可见（grid 容器可见但子卡片整片空白，表现为“搜索不显示结果”）
            card.style.display = '';
            this._fillNativeCard(card, p);
            grid.appendChild(card);
          } catch (e) {
            console.warn('[JD-Auction-Search] 渲染单张原生卡片失败，已跳过:', e);
          }
        });
        panel.appendChild(grid);
      } else {
        // 回退：页面无原生卡片模板时，使用扩展自带卡片（内联样式，避免依赖 Shadow CSS）
        const grid = document.createElement('div');
        grid.className = 'jds-product-grid';
        grid.setAttribute('aria-live', 'polite');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.style.gap = '12px';
        grid.style.padding = '16px 24px 40px';
        panel.appendChild(grid);
        this.gridElement = grid;
        this._renderFallbackCards(products);
      }
    },

    /**
     * 用商品数据填充克隆的京东原生卡片（主图 / 标题 / 价格 / 链接），并清理模板残留的动态信息
     * @private
     */
    _fillNativeCard(card, p) {
      const U = global.JDSUtils;
      const name = U.getProductName(p);
      const price = U.getProductPrice(p);
      const image = U.getProductImage(p);
      const url = U.getProductUrl(p);

      // 强制可见：避免继承京东"懒加载/入场动画"导致的 opacity:0 或 display:none
      card.style.opacity = '1';
      card.style.visibility = 'visible';
      card.style.display = ''; // 清除 hideNativeProducts 设置的内联 display:none，确保克隆卡片可见
      card.removeAttribute('hidden');
      card.removeAttribute('id');

      const img = card.querySelector('img');
      if (img) {
        if (image) {
          img.src = image;
          img.removeAttribute('srcset');
          img.loading = 'lazy';
          img.alt = name;
          img.onerror = () => { img.style.visibility = 'hidden'; };
        }
      }

      const title = card.querySelector('[class*="name" i], [class*="title" i], h3, h4');
      if (title) title.textContent = name;
      card.setAttribute('title', name);

      const priceEl = card.querySelector('[class*="price" i]');
      if (priceEl) priceEl.textContent = '¥' + U.formatPrice(price);

      const a = card.closest('a') || card.querySelector('a');
      if (a && url) {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }

      // 清除克隆模板残留的倒计时/剩余时间等动态信息，避免显示错误数据
      card.querySelectorAll('[class*="countdown" i], [class*="remain" i], [class*="time" i], [class*="timer" i]')
        .forEach(el => { el.textContent = ''; el.style.display = 'none'; });
    },

    /**
     * 回退渲染：页面无原生卡片模板时，使用扩展自带卡片（内联样式，独立于 Shadow CSS）
     * @private
     */
    _renderFallbackCards(products) {
      products.forEach((p) => {
        const U = global.JDSUtils;
        const name = U.escapeHtml(U.getProductName(p));
        const priceText = U.formatPrice(U.getProductPrice(p));
        const image = U.getProductImage(p);

        const card = document.createElement('div');
        card.style.cssText = 'display:inline-block;width:180px;margin:8px;vertical-align:top;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;';
        const imgHtml = image
          ? `<img src="${U.escapeHtml(image)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:120px;object-fit:cover;display:block" onerror="this.style.visibility='hidden'" />`
          : `<div style="width:100%;height:120px;display:grid;place-items:center;background:#f4f4f5;font-size:40px">📦</div>`;
        card.innerHTML = `
          ${imgHtml}
          <div style="padding:10px">
            <div style="font-size:13px;color:#18181b;line-height:1.4;max-height:36px;overflow:hidden">${name}</div>
            <div style="margin-top:6px;color:#e1251b;font-weight:600;font-size:15px">¥${priceText}</div>
          </div>`;
        this.gridElement.appendChild(card);
      });
    },

    /**
     * 初始化结果面板宿主 — 真实 DOM（非 Shadow）挂在 body
     * 用真实 DOM 承载，克隆的京东原生卡片才能继承页面全局样式，外观与原始列表一致
     * 面板以 fixed 定位在嵌入工具栏下方，覆盖内容区展示跨页搜索结果
     * @private
     */
    _initResultsHost() {
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
        style.textContent = `
          #jds-results-host {
            position: fixed; left: 0; right: 0; top: 0; bottom: 0;
            z-index: 999990;
          }
          #jds-results-host .jds-results-panel {
            position: absolute; inset: 0; overflow-y: auto;
            background: #fff; padding: 16px 0 40px;
            display: none;
          }
          #jds-results-host .jds-results-panel.is-visible { display: block; }
          #jds-results-host .jds-empty-overlay {
            position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%);
            display: flex; flex-direction: column; align-items: center; gap: 12px;
            color: #71717a; text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          }
          #jds-results-host .jds-empty-icon svg { width: 48px; height: 48px; color: #d4d4d8; }
          #jds-results-host .jds-empty-title { font-size: 15px; font-weight: 600; color: #18181b; }
          #jds-results-host .jds-empty-desc { font-size: 13px; }
        `;
        document.head.appendChild(style);
      }

      const panel = document.createElement('div');
      panel.className = 'jds-results-panel';
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-label', '搜索结果');
      host.appendChild(panel);

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
