// JD-Auction-Search/src/ui/styles.js v1.6.4
// 内联样式聚合：组合 设计令牌(_getTokensCss) + 工具栏(动态) + 组件样式(_getComponentsCss)
// 全部注入 Shadow DOM（:host）确保样式隔离

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 获取内联样式 — shadcn 语义令牌 + 组件样式，全部注入 Shadow DOM
   * 设计令牌与组件样式分别由 tokens.js / components.js 提供，此处仅负责组合。
   * @private
   * @param {boolean} embedded - 是否嵌入 auction_head（false 时回退为浮动条）
   * @param {boolean} inline - 是否内联在 auction_head_right 左侧（true 时不占满整行）
   * @returns {string}
   */
  JDSUI._getInlineStyles = function _getInlineStyles(embedded, inline = false) {
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
        padding: 12px 18px;
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
        padding: 14px 24px;
        background: var(--card);
        box-shadow: var(--shadow-sm);
        transition: opacity var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out);
      }
    `;

    return this._getTokensCss() +
      '\n      /* ===== BASE (shadow only, 不泄漏到页面) ===== */\n      ' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      ':host(.jds-inline) { display: inline-flex; flex: 0 1 auto; align-self: center; margin-right: 12px; width: auto; max-width: 100%; }\n' +
      '.jds-root { font-family: var(--font-sans); color: var(--foreground); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }\n' +
      '\n      /* ===== TOOLBAR ===== */\n      ' +
      toolbarCss + '\n' +
      this._getComponentsCss();
  };
})(window);
