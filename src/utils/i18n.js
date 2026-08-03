// JD-Auction-Search/src/utils/i18n.js v1.5.3
// 国际化：优先 chrome.i18n（_locales 多语言），回退内置 zh-CN/en 字典

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  // 内置双语兜底字典（简体中文 + 英文）
  const translations = {
    'zh-CN': {
      'searchPlaceholder': '输入商品关键词搜索...',
      'searchButton': '搜索',
      'emptyTitle': '没有找到相关商品',
      'emptyDesc': '换个关键词试试，或清除当前搜索查看全部商品',
      'emptyAction': '清除搜索',
      'historyTitle': '搜索历史',
      'historyClear': '清空',
      'historyEmpty': '暂无搜索历史',
      'toastApiFailed': 'API加载失败，将依赖页面内容',
      'toastNetworkError': '网络异常，请检查网络连接',
      'toastRequestError': '请求失败，请稍后重试',
      'toastDomExtractFailed': '未能从页面识别商品，可能页面已改版'
    },
    'en': {
      'searchPlaceholder': 'Search products by keyword...',
      'searchButton': 'Search',
      'emptyTitle': 'No matching products',
      'emptyDesc': 'Try another keyword, or clear search to view all products',
      'emptyAction': 'Clear search',
      'historyTitle': 'Search history',
      'historyClear': 'Clear',
      'historyEmpty': 'No search history',
      'toastApiFailed': 'API failed to load, falling back to page content',
      'toastNetworkError': 'Network error, please check your connection',
      'toastRequestError': 'Request failed, please try again later',
      'toastDomExtractFailed': 'Failed to recognize products from page, it may have changed'
    }
  };

  // 解析浏览器当前语言 -> 字典键（en / zh-CN）
  function detectLang() {
    let lang = '';
    try {
      if (typeof navigator !== 'undefined') {
        lang = navigator.language || navigator.userLanguage || '';
      }
    } catch (e) { /* 忽略 */ }
    lang = (lang || '').toLowerCase();
    if (lang.indexOf('zh') === 0) return 'zh-CN';
    return 'en';
  }

  /**
   * 获取文案：优先 chrome.i18n，回退内置双语字典
   * @param {string} key - 文案键
   * @returns {string}
   */
  JDSUtils.getMessage = function getMessage(key) {
    // 1) 优先使用扩展原生 i18n（_locales 多语言）
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        const fromApi = chrome.i18n.getMessage(key);
        if (fromApi) return fromApi;
      }
    } catch (e) { /* 忽略，走兜底 */ }

    // 2) 回退内置字典（按当前语言）
    const lang = detectLang();
    const dict = translations[lang] || translations['en'];
    if (dict && dict[key] != null) return dict[key];

    // 3) 未知键兜底为键名（避免空串）
    return key;
  };
})(window);
