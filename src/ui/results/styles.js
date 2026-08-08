// JD-Auction-Search/src/ui/results/styles.js v1.6.1
// 结果面板样式：覆盖层外壳 CSS 与浅 DOM 组件 CSS（骨架屏/空状态/商品卡/网格）
// 面板宿主与定位逻辑见 ./host.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  // 结果面板宿主（真实 DOM，非 Shadow）的覆盖层外壳样式
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
  // 令牌由 _getTokensCss('#jds-results-host') 提供。
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
      /* 固定 1:1 正方形主图区：用 padding-top:100% 撑出正方形（兼容性好，不依赖 aspect-ratio）。
         内部 img 绝对定位填满该正方形；仅定高会导致容器为「宽>高」矩形（非1:1）。 */
      position: relative; width: 100%; padding-top: 100%;
      display: grid; place-items: center; font-size: 44px;
      background: var(--secondary);
      color: var(--subtle-foreground); overflow: hidden;
    }
    /* 绝对定位填满正方形区域（1:1）；cover 让京东方图完整铺满、不变形 */
    #jds-results-host .jds-product-img-el { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; background: var(--secondary); }
    /* 图片悬停轻微放大（复刻原型 product-card 交互） */
    #jds-results-host .jds-product-card:hover .jds-product-img-el { transform: scale(1.06); transition: transform var(--dur-base) var(--ease-out); }
    #jds-results-host .jds-product-body { flex: 1 1 auto; padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 8px; }
    #jds-results-host .jds-product-name {
      font-size: 12px; font-weight: 500; color: var(--foreground); line-height: 1.45;
      min-height: 35px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    #jds-results-host .jds-product-price-row {
      display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px;
    }
    #jds-results-host .p-price {
      display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px;
      font-family: var(--font-display); font-size: 16px; font-weight: 400;
      color: var(--primary); letter-spacing: -0.01em; line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    #jds-results-host .p-price .jds-price-label { margin-right: 4px; font-size: 13px; color: var(--muted-foreground); font-weight: 400; align-self: center; }
    #jds-results-host .p-price .jds-price-yen { font-size: 13px; color: var(--primary); font-weight: 400; align-self: baseline; }
    #jds-results-host .p-price .jds-price-amount { font-variant-numeric: tabular-nums; }
    #jds-results-host .p-price .jds-price-int { font-size: 20px; font-variant-numeric: tabular-nums; }
    #jds-results-host .p-price .jds-price-dec-sep { font-variant-numeric: tabular-nums; }
    #jds-results-host .p-price .jds-price-dec { font-size: 0.7em; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
    #jds-results-host .origin-price { display: flex; align-items: baseline; }
    #jds-results-host .origin-price .jds-product-orig { font-size: 12px; color: var(--muted-foreground); text-decoration: line-through; }
    /* 仅显示划线原价（无主价行，主价与之重复）时去划线，作为唯一实际价格正常呈现 */
    #jds-results-host .origin-price .jds-product-orig-only { text-decoration: none; color: var(--foreground); }
    #jds-results-host .origin-price .jds-product-cap { font-size: 12px; color: var(--muted-foreground); }
    #jds-results-host .note { display: flex; align-items: center; gap: 8px; }
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
    #jds-results-host .jds-product-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; padding: 16px 24px 28px; min-height: 420px; }

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
   * 获取结果面板完整 CSS（外壳 + 设计令牌 + 组件样式）
   * 令牌与工具栏 Shadow 同源(_getTokensCss)，组件样式仅作用域 #jds-results-host，不泄漏到京东页面
   * @private
   * @returns {string}
   */
  JDSUI._getResultsCss = function _getResultsCss() {
    return RESULTS_HOST_CSS + '\n' +
      this._getTokensCss('#jds-results-host') + '\n' +
      RESULTS_COMPONENT_CSS;
  };
})(window);
