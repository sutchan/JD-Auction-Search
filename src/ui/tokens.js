// JD-Auction-Search/src/ui/tokens.js v1.6.0
// 设计令牌：shadcn 语义令牌（zinc 中性灰阶 + 京东红强调）
// 与 prototype/index.html 设计系统（浅色令牌）保持一致；支持按 scope 注入：
//   - Shadow DOM 工具栏：_getTokensCss(':host')
//   - 浅 DOM 结果面板：_getTokensCss('#jds-results-host')

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 获取设计令牌 CSS — 全部声明在给定作用域内，确保样式隔离且不泄漏到页面
   * @param {string} [scope=':host'] - 令牌声明作用域选择器
   * @returns {string}
   */
  JDSUI._getTokensCss = function _getTokensCss(scope = ':host') {
    return `
      ${scope} {
        /* ===== DESIGN TOKENS (shadcn-inspired, zinc + JD red) — 对齐 prototype 浅色令牌 ===== */
        --background: #ffffff;
        --foreground: #18181b;
        --card: #ffffff;
        --popover: #ffffff;
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
        --accent: #f4f4f5;
        --accent-foreground: #18181b;
        --border: #e4e4e7;
        --border-strong: #d4d4d8;
        --ring: #e1251b;
        --success: #16a34a;
        --success-subtle: #f0fdf4;
        --warning: #d97706;
        --warning-subtle: #fffbeb;
        --destructive: #dc2626;
        --destructive-subtle: #fef2f2;
        --info: #2563eb;
        --info-subtle: #eff6ff;
        --radius-sm: 6px;
        --radius-md: 8px;
        --radius-lg: 10px;
        --radius-xl: 16px;
        --radius-2xl: 22px;
        --radius-full: 9999px;
        --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
        --shadow-sm: 0 1px 3px 0 rgb(24 24 27 / 0.06), 0 1px 2px -1px rgb(24 24 27 / 0.05);
        --shadow-md: 0 4px 6px -1px rgb(24 24 27 / 0.07), 0 2px 4px -2px rgb(24 24 27 / 0.05);
        --shadow-lg: 0 10px 24px -4px rgb(24 24 27 / 0.10), 0 4px 8px -4px rgb(24 24 27 / 0.06);
        --shadow-ring: 0 0 0 3px rgb(225 37 27 / 0.12);
        --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        --font-mono: 'SF Mono', ui-monospace, 'Cascadia Code', monospace;
        --font-display: 'Instrument Serif', 'Noto Serif SC', Georgia, 'Times New Roman', serif;
        --dur-fast: 0.18s;
        --dur-base: 0.3s;
        --dur-slow: 0.6s;
        --ease-out: cubic-bezier(0.25, 1, 0.5, 1);
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    `;
  };
})(window);
