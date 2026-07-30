// JD-Auction-Search/src/ui/components.js v1.4.0
// 组件样式：SearchBar / ProductGrid / Card / Badge / EmptyState / Skeleton 等
// 由 ui/styles.js 的 _getInlineStyles 组合注入 Shadow DOM（工具栏样式由 _getInlineStyles 动态拼入）

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 获取组件样式 CSS（不含工具栏 .jds-toolbar，该部分由 _getInlineStyles 按嵌入/浮动态动态拼入）
   * @returns {string}
   */
  JDSUI._getComponentsCss = function _getComponentsCss() {
    return `
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
  };
})(window);
