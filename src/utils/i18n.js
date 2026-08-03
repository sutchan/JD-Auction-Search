// JD-Auction-Search/src/utils/i18n.js v1.5.1
// 国际化：优先使用 chrome.i18n API，回退到硬编码简繁中文

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  /**
   * 获取翻译文本（使用 chrome.i18n API，回退到硬编码）
   * @param {string} key - 翻译键
   * @param {Object} [placeholders] - 占位符
   * @returns {string}
   */
  JDSUtils.getMessage = function getMessage(key, placeholders) {
    let text = null;

    // 单一来源：优先 chrome.i18n（_locales 多语言，浏览器按区域选择）；
    // 回退硬编码字典仅作保底（content script 中 chrome.i18n 通常可用）
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      try {
        const t = chrome.i18n.getMessage(key);
        if (t) text = t;
      } catch (e) { /* 回退硬编码 */ }
    }

    if (!text) {
      // 回退硬编码翻译（仅保留扩展仍在使用的键）；简繁兜底确保 chrome.i18n 不可用时仍双语文案可用
      const translations = {
        'zh-CN': {
          'searchPlaceholder': '输入商品关键词搜索...',
          'searchButton': '搜索',
          'emptyTitle': '没有找到相关商品',
          'emptyDesc': '换个关键词试试，或清除当前搜索查看全部商品',
          'emptyAction': '清除搜索',
          'toastApiFailed': 'API加载失败，将依赖页面内容',
          'toastNetworkError': '网络异常，请检查网络连接',
          'toastRequestError': '请求失败，请稍后重试',
          'toastDomExtractFailed': '未能从页面识别商品，可能页面已改版'
        },
        'zh-TW': {
          'searchPlaceholder': '輸入商品關鍵詞搜索...',
          'searchButton': '搜索',
          'emptyTitle': '沒有找到相關商品',
          'emptyDesc': '換個關鍵詞試試，或清除當前搜索查看全部商品',
          'emptyAction': '清除搜索',
          'toastApiFailed': 'API加載失敗，將依賴頁面內容',
          'toastNetworkError': '網絡異常，請檢查網絡連接',
          'toastRequestError': '請求失敗，請稍後重試',
          'toastDomExtractFailed': '未能從頁面識別商品，可能頁面已改版'
        }
      };
      const lang = navigator.language || navigator.userLanguage || 'zh-CN';
      const langKey = Object.keys(translations).find(k => lang.startsWith(k)) || 'zh-CN';
      text = translations[langKey][key] || translations['zh-CN'][key] || key;
    }

    // 占位符替换（当前无带占位符的键，保留通用能力）
    if (placeholders && text) {
      Object.keys(placeholders).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), placeholders[k]);
      });
    }

    return text;
  };
})(window);
