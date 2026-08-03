// JD-Auction-Search/src/ui/components.js v1.5.1
// 组件样式：仅包含 Shadow DOM 工具栏所需的 SearchBar 与响应式
// 商品卡片 / 骨架屏 / 空状态 / 网格等组件样式已迁至 results/host.js 的 RESULTS_COMPONENT_CSS（注入浅 DOM 结果面板）
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
        flex: 1; min-width: 220px; max-width: 440px;
        display: flex; align-items: center; gap: 8px;
        padding: 6px 6px 6px 14px;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        transition: all var(--dur-base) var(--ease-out);
      }
      .jds-search:focus-within { border-color: var(--primary); box-shadow: var(--shadow-ring); }
      .jds-search > svg { width: 18px; height: 18px; color: var(--muted-foreground); flex-shrink: 0; }
      .jds-search-input {
        flex: 1; min-width: 0; border: none; outline: none;
        background: transparent; font-family: var(--font-sans);
        font-size: 15px; color: var(--foreground); padding: 9px 0;
      }
      .jds-search-input::placeholder { color: var(--subtle-foreground); }
      .jds-clear {
        display: none; align-items: center; justify-content: center;
        width: 24px; height: 24px; border: none;
        border-radius: var(--radius-sm);
        background: var(--secondary); color: var(--muted-foreground);
        cursor: pointer; flex-shrink: 0;
        transition: all var(--dur-fast) var(--ease-out);
      }
      .jds-clear:hover { background: var(--secondary); color: var(--foreground); }
      .jds-clear.is-visible { display: flex; }
      .jds-clear svg { width: 14px; height: 14px; }
      .jds-search-btn {
        border: none; background: var(--primary); color: var(--primary-foreground);
        padding: 10px 20px; border-radius: var(--radius-sm);
        font-family: var(--font-sans); font-size: 14px; font-weight: 600;
        cursor: pointer; flex-shrink: 0;
        transition: background var(--dur-fast) var(--ease-out);
      }
      .jds-search-btn:hover { background: var(--primary-hover); }
      /* 匹配数量提示（对齐原型 ext-count） */
      .jds-count {
        font-family: var(--font-sans); font-size: 13px; color: var(--muted-foreground);
        white-space: nowrap; font-variant-numeric: tabular-nums; margin-left: auto;
      }
      .jds-count strong { color: var(--primary); font-weight: 600; }

      /* ===== RESPONSIVE (仅工具栏，Shadow 内) ===== */
      @media (max-width: 768px) {
        .jds-toolbar { padding: 10px 12px; gap: 10px; }
        .jds-search { order: 1; max-width: none; width: 100%; }
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
