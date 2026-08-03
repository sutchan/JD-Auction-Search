// JD-Auction-Search/src/ui/results/host.js v1.5.0
// 结果面板宿主：覆盖层外壳、面板定位、显隐前置与网格容器
// 商品渲染见 products.js，骨架屏见 skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

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
      background: #fff; padding: 0;
      display: none;
      pointer-events: auto;
      /* 水平居中：固定宽度 1230px，left:50% + translateX(-50%) 实现居中 */
      left: 50%; right: auto; transform: translateX(-50%);
      width: 1230px; max-width: 1230px;
    }
    #jds-results-host .jds-results-panel.is-visible { display: block; }
  `;

  // 浅 DOM 结果面板组件样式（仅作用域 #jds-results-host，不污染京东页面）。
  // 注意：*.jds-* 选择器均带作用域前缀，且无全局 * 重置，避免样式泄漏。
  // 令牌由 RESULTS_HOST_CSS 之外的注入段（_getTokensCss('#jds-results-host')）提供。
  const RESULTS_COMPONENT_CSS = `
    /* Skeleton 骨架屏（对齐原型 shimmer 占位） */
    #jds-results-host .jds-skeleton-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    #jds-results-host .jds-skel {
      background: linear-gradient(90deg, var(--secondary) 25%, var(--muted) 50%, var(--secondary) 75%);
      background-size: 200% 100%;
      animation: jds-shimmer 1.4s infinite;
    }
    @keyframes jds-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    #jds-results-host .jds-skel-img { height: 140px; }
    #jds-results-host .jds-skel-line { height: 11px; margin: 14px; border-radius: var(--radius-sm); }
    #jds-results-host .jds-skel-line:last-child { width: 50%; margin-bottom: 18px; }

    /* Empty 空状态（对齐原型：居中浮层） */
    #jds-results-host .jds-empty-overlay {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      color: var(--muted-foreground); text-align: center;
      background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg);
      padding: 48px 64px; box-shadow: var(--shadow-md);
      animation: jds-fadeIn 0.3s var(--ease-out);
      pointer-events: auto;
    }
    @keyframes jds-fadeIn {
      from { opacity: 0; transform: translate(-50%, -50%) translateY(-8px); }
      to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
    }
    #jds-results-host .jds-empty-icon {
      width: 56px; height: 56px; border-radius: var(--radius-full);
      background: var(--secondary); display: grid; place-items: center;
      margin: 0 auto 16px; color: var(--subtle-foreground);
    }
    #jds-results-host .jds-empty-icon svg { width: 26px; height: 26px; }
    #jds-results-host .jds-empty-title { font-size: 20px; font-weight: 600; color: var(--foreground); margin-bottom: 8px; }
    #jds-results-host .jds-empty-desc { font-size: 14px; color: var(--muted-foreground); max-width: 32ch; line-height: 1.6; }
    #jds-results-host .jds-empty-action {
      margin-top: 8px; padding: 9px 22px; border: 1px solid var(--border);
      border-radius: var(--radius-md); background: var(--card); color: var(--primary);
      font-size: 14px; font-weight: 500; cursor: pointer; font-family: var(--font-sans);
      transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
    }
    #jds-results-host .jds-empty-action:hover { border-color: var(--primary); background: var(--secondary); }

    /* Product Card 商品卡片（对齐 prototype .product-card） */
    #jds-results-host .jds-product-card {
      display: flex; flex-direction: column; text-decoration: none; color: var(--foreground);
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden; cursor: pointer;
      font-family: var(--font-sans);
      transition: border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
      animation: jds-cardIn 0.5s var(--ease-out-expo) backwards;
    }
    #jds-results-host .jds-product-card:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-md);
      transform: translateY(-3px);
    }
    #jds-results-host .jds-product-card:focus-visible {
      outline: 2px solid var(--ring); outline-offset: 2px; border-color: var(--primary);
    }
    @keyframes jds-cardIn {
      from { opacity: 0; transform: translateY(14px) scale(0.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    #jds-results-host .jds-product-img {
      height: 140px; display: grid; place-items: center; font-size: 44px;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--muted) 100%);
      color: var(--subtle-foreground); position: relative; overflow: hidden;
    }
    #jds-results-host .jds-product-img-el { width: 100%; height: 100%; object-fit: cover; display: block; }
    /* 图片悬停轻微放大（复刻原型 product-card 交互） */
    #jds-results-host .jds-product-card:hover .jds-product-img-el { transform: scale(1.06); transition: transform var(--dur-base) var(--ease-out); }
    #jds-results-host .jds-product-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    #jds-results-host .jds-product-name {
      font-size: 14px; font-weight: 500; color: var(--foreground); line-height: 1.45;
      min-height: 38px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    #jds-results-host .jds-product-price {
      display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px;
      font-family: var(--font-display); font-size: 16px; font-weight: 400;
      color: var(--primary); letter-spacing: -0.01em; line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    #jds-results-host .jds-product-price .jds-price-label { margin-right: 4px; font-size: 13px; color: var(--muted-foreground); font-weight: 400; align-self: center; }
    #jds-results-host .jds-product-price .jds-price-yen { font-size: 13px; color: var(--muted-foreground); font-weight: 400; align-self: baseline; }
    #jds-results-host .jds-product-price .jds-price-amount { font-variant-numeric: tabular-nums; }
    #jds-results-host .jds-product-price .jds-price-int { font-variant-numeric: tabular-nums; }
    #jds-results-host .jds-product-price .jds-price-dec-sep { font-variant-numeric: tabular-nums; }
    #jds-results-host .jds-product-price .jds-price-dec { font-size: 0.7em; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
    #jds-results-host .jds-product-subprice { display: flex; align-items: center; }
    #jds-results-host .jds-product-subprice .jds-product-orig { font-size: 12px; color: var(--muted-foreground); text-decoration: line-through; }
    #jds-results-host .jds-product-subprice .jds-product-cap { font-size: 12px; color: var(--muted-foreground); }
    #jds-results-host .jds-product-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
    #jds-results-host .jds-product-bid {
      display: inline-flex; align-items: center; padding: 2px 9px;
      background: var(--secondary); color: var(--muted-foreground);
      font-size: 12px; border-radius: var(--radius-full);
    }
    #jds-results-host .jds-load-more {
      grid-column: 1 / -1; justify-self: center; margin: 8px auto 24px;
      padding: 10px 24px; border: 1px solid var(--border); border-radius: var(--radius-md);
      background: var(--card); color: var(--foreground); font-size: 14px; cursor: pointer;
      font-family: var(--font-sans); transition: border-color var(--dur-fast) var(--ease-out);
    }
    #jds-results-host .jds-load-more:hover { border-color: var(--primary); color: var(--primary); }

    /* Grid 网格（每行固定 5 个结果） */
    #jds-results-host .jds-product-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; padding: 16px 24px 40px; min-height: 420px; }

    @media (prefers-reduced-motion: reduce) {
      #jds-results-host .jds-product-card,
      #jds-results-host .jds-skel,
      #jds-results-host .jds-empty-overlay {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
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

    // 浅 DOM 样式：覆盖层外壳 + 设计令牌(#jds-results-host 作用域) + 组件样式(骨架/空状态/网格)
    // 令牌与工具栏 Shadow 同源(_getTokensCss)，组件样式仅作用域 #jds-results-host，不泄漏到京东页面
    if (!document.getElementById('jds-results-style')) {
      const style = document.createElement('style');
      style.id = 'jds-results-style';
      style.textContent = RESULTS_HOST_CSS + '\n' +
        this._getTokensCss('#jds-results-host') + '\n' +
        RESULTS_COMPONENT_CSS;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.id = 'jds-results-panel';
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
    // 避免遮挡页面原生导航 auction_nav：若其位于工具栏之下，面板顶部下移到导航底部，
    // 保证导航始终可见可点击（否则 fixed 覆盖层会盖住整页导航）
    const navEl = document.querySelector('#auction_nav, [class*="auction_nav" i], [class*="auction-nav" i]');
    if (navEl) {
      const navRect = navEl.getBoundingClientRect();
      if (navRect.bottom > top) top = Math.round(navRect.bottom);
    }
    panel.style.top = top + 'px';

    // 结果面板固定宽度 1230px 并居中（由 CSS width/max-width + left:50%/translateX 控制），
    // 不再随原生列表宽度变化，保证每行 5 个结果的稳定布局
    panel.style.maxWidth = '1230px';
    panel.style.width = '1230px';
  };

  /**
   * 绑定面板定位刷新（滚动/缩放时跟随嵌入工具栏）
   * @private
   */
  JDSUI._bindResultsPosition = function _bindResultsPosition() {
    if (this._positionBound) return;
    this._positionBound = true;
    const update = () => this._positionResultsPanel();
    this._positionHandler = update;
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  };

  /**
   * 解绑面板定位监听（destroy 时调用，避免 window 监听泄漏）
   * @private
   */
  JDSUI._unbindResultsPosition = function _unbindResultsPosition() {
    if (!this._positionBound) return;
    const update = this._positionHandler;
    if (update) {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    }
    this._positionBound = false;
    this._positionHandler = null;
  };

  /**
   * 初始化结果面板宿主并使其可见（showResults/showLoading 的公共前置逻辑）
   * @private
   */
  JDSUI._revealPanel = function _revealPanel() {
    this._initResultsHost();
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    panel.classList.add('is-visible');
    this._positionResultsPanel();
  };

  /**
   * 在结果面板内创建扩展自带的网格容器（内联样式，独立于京东列表布局）
   * products.js 与 skeleton.js 共用，避免网格样式重复定义
   * @private
   * @returns {HTMLElement}
   */
  JDSUI._createGrid = function _createGrid(panel) {
    const grid = document.createElement('div');
    grid.id = 'jds-product-grid';
    grid.className = 'jds-product-grid';
    grid.setAttribute('aria-live', 'polite');
    // 列数/间距/内边距由 RESULTS_COMPONENT_CSS 的 .jds-product-grid 响应式定义（auto-fill minmax(200px,1fr)），
    // 不再内联硬编码，避免与样式表冲突且在窄列表下拥挤
    panel.appendChild(grid);
    return grid;
  };
})(window);
