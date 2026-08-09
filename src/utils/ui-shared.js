// JD-Auction-Search/src/utils/ui-shared.js v.
// UI 共享能力：Toast 反馈、样式注入、Shadow DOM 查询

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  /**
   * 显示提示消息 — sonner 风格 Toast（图标 + 消息 + 自动堆叠）
   * @param {string} key - 翻译键或直接消息内容
   * @param {string} [type='info'] - toast 类型: success | error | info
   */
  JDSUtils.showToast = function showToast(key, type = 'info') {
    const translationKeys = ['toastApiFailed', 'toastNetworkError', 'toastRequestError', 'toastDomExtractFailed'];
    const message = translationKeys.includes(key) ? JDSUtils.getMessage(key) : key;

    // success/error/info 对应的 SVG 图标
    const icons = {
      success: '<svg class="jds-toast-icon" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
      error: '<svg class="jds-toast-icon" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/>' +
        '<path d="M15 9l-6 6M9 9l6 6"/></svg>',
      info: '<svg class="jds-toast-icon" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/>' +
        '<path d="M12 16v-4M12 8h.01"/></svg>'
    };

    if (key === 'toastApiFailed') type = 'error';

    let stack = document.querySelector('.jds-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'jds-toast-stack';
      stack.className = 'jds-toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
      // Toast 窗口对齐左侧结果栏：左缘与结果面板同列，无面板时回退为居中
      JDSUtils.positionToastStack(stack);
    }

    const toast = document.createElement('div');
    toast.className = `jds-toast jds-toast-${type}`;
    // 文案转义后注入，防御潜在 HTML 注入（纵深防御）
    const safeMessage = JDSUtils.escapeHtml(message);
    toast.innerHTML = `${icons[type] || icons.info}<span>${safeMessage}</span>`;
    stack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-show'));
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  /**
   * 定位 Toast 堆叠容器 — 左缘对齐可见的左侧结果面板列，否则居中
   * 结果面板由 host.js 对齐原生列表宽度（left/width），此处复用同一 left 值，
   * 使日志窗口与左侧商品列视觉对齐；无可见面板时回退为屏幕居中。
   * @param {HTMLElement} stack - .jds-toast-stack 容器
   */
  JDSUtils.positionToastStack = function positionToastStack(stack) {
    if (!stack) return;
    const panel = document.querySelector('#jds-results-host .jds-results-panel.is-visible');
    if (panel) {
      const rect = panel.getBoundingClientRect();
      stack.style.left = Math.round(rect.left) + 'px';
      stack.style.right = 'auto';
      stack.style.transform = 'none';
    } else {
      stack.style.left = '50%';
      stack.style.right = 'auto';
      stack.style.transform = 'translateX(-50%)';
    }
  };

  /**
   * 注入样式表
   * @param {string} cssPath - CSS路径
   */
  JDSUtils.injectStyles = function injectStyles(cssPath) {
    // 幂等：同路径样式只注入一次，避免 SPA 重渲染/多次 init 重复 append <link>
    if (document.querySelector(`link[jds-style="${cssPath}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('jds-style', cssPath);
    link.href = chrome.runtime.getURL(cssPath);
    (document.head || document.documentElement).appendChild(link);
  };
})(window);
