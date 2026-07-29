// JD-Auction-Search/src/ui/tokens.js v1.3.1
// 设计令牌：shadcn 语义令牌（zinc 中性灰阶 + 京东红强调），注入 Shadow DOM :host
// 与 prototype/index.html 设计系统（浅色令牌）保持一致

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 获取设计令牌 CSS — 全部定义在 Shadow DOM :host 作用域，确保样式隔离
   * @returns {string}
   */
  JDSUI._getTokensCss = function _getTokensCss() {
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

      /* 内联定位：置于 auction_head_right 左侧，作为页头 flex 子项，不占满整行 */
      :host(.jds-inline) {
        display: inline-flex;
        flex: 0 1 auto;
        align-self: center;
        margin-right: 12px;
        width: auto;
        max-width: 100%;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .jds-root {
        font-family: var(--font-sans);
        color: var(--foreground);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `;
  };
})(window);
