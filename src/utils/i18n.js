// JD-Auction-Search/src/utils/i18n.js v1.6.8
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
      'countPrefix': '共 ',
      'countSuffix': ' 件',
      'loadingMore': '（已聚合 $1 条，继续加载中）',
      'priceStarting': '起拍',
      'bidCountSuffix': ' 人出价',
      'loadMore': '加载更多',
      'loadMoreProgress': '（已显示 $1 / $2）',
      'a11yToolbar': '夺宝搜索工具栏',
      'a11ySearchInput': '搜索商品',
      'a11yClearSearch': '清除搜索',
      'a11yHistoryClear': '清空搜索历史',
      'a11yHistoryDelete': '删除该历史',
      'a11yResultsPanel': '搜索结果',
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
      'countPrefix': '',
      'countSuffix': ' results',
      'loadingMore': '($1 loaded, fetching more)',
      'priceStarting': 'Start',
      'bidCountSuffix': ' bids',
      'loadMore': 'Load more',
      'loadMoreProgress': ' ($1 / $2 shown)',
      'a11yToolbar': 'Auction search toolbar',
      'a11ySearchInput': 'Search products',
      'a11yClearSearch': 'Clear search',
      'a11yHistoryClear': 'Clear search history',
      'a11yHistoryDelete': 'Remove this history item',
      'a11yResultsPanel': 'Search results',
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
   * 占位符替换：把 $1/$2… 依次替换为 substitutions 中的值
   * @private
   * @param {string} text - 含占位符的文案
   * @param {Array<string|number>} subs - 替换值
   * @returns {string}
   */
  function applySubs(text, subs) {
    if (!subs || !subs.length) return text;
    return text.replace(/\$(\d+)/g, (m, i) => {
      const v = subs[Number(i) - 1];
      return v == null ? m : String(v);
    });
  }

  /**
   * 获取文案：优先 chrome.i18n，回退内置双语字典
   * @param {string} key - 文案键
   * @param {Array<string|number>} [substitutions] - 占位符替换值（对应 $1/$2…）
   * @returns {string}
   */
  JDSUtils.getMessage = function getMessage(key, substitutions) {
    const subs = Array.isArray(substitutions) ? substitutions
      : (substitutions == null ? [] : [substitutions]);

    // 1) 优先使用扩展原生 i18n（_locales 多语言）
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        const fromApi = subs.length
          ? chrome.i18n.getMessage(key, subs.map(String))
          : chrome.i18n.getMessage(key);
        if (fromApi) return fromApi;
      }
    } catch (e) { /* 忽略，走兜底 */ }

    // 2) 回退内置字典（按当前语言）
    const lang = detectLang();
    const dict = translations[lang] || translations['en'];
    if (dict && dict[key] != null) return applySubs(dict[key], subs);

    // 3) 未知键兜底为键名（避免空串）
    return key;
  };
})(window);
