// JD-Auction-Search/src/utils/format.js v1.3.1
// 文本格式化工具：HTML 转义与价格格式化

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  /**
   * HTML 转义，防止商品字段注入破坏卡片布局或造成 XSS
   * @param {string} str
   * @returns {string}
   */
  JDSUtils.escapeHtml = function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /**
   * 格式化价格：整数不带小数，小数保留两位
   * @param {number} n
   * @returns {string}
   */
  JDSUtils.formatPrice = function formatPrice(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2
    });
  };
})(window);
