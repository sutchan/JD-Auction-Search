// JD-Auction-Search/src/utils/ui-shared.js v1.3.5
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
    const translationKeys = ['toastEnabled', 'toastDisabled', 'toastApiFailed'];
    const message = translationKeys.includes(key) ? JDSUtils.getMessage(key) : key;

    // success/error/info 对应的 SVG 图标
    const icons = {
      success: '<svg class="jds-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
      error: '<svg class="jds-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      info: '<svg class="jds-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    // 启停切换对应类型
    if (key === 'toastEnabled') type = 'success';
    else if (key === 'toastDisabled') type = 'error';
    else if (key === 'toastApiFailed') type = 'error';

    let stack = document.querySelector('.jds-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'jds-toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const toast = document.createElement('div');
    toast.className = `jds-toast jds-toast-${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    stack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-show'));
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  /**
   * 注入样式表
   * @param {string} cssPath - CSS路径
   */
  JDSUtils.injectStyles = function injectStyles(cssPath) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(cssPath);
    (document.head || document.documentElement).appendChild(link);
  };

  /**
   * 安全查询Shadow DOM中的元素
   * @param {ShadowRoot} shadowRoot - Shadow DOM根
   * @param {string} selector - 选择器
   * @returns {HTMLElement|null}
   */
  JDSUtils.queryShadowDom = function queryShadowDom(shadowRoot, selector) {
    return shadowRoot && shadowRoot.querySelector(selector);
  };
})(window);
