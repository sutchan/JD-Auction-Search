// JD-Auction-Search/src/utils/i18n.js v1.4.0
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
    let text = key;

    // 尝试使用 chrome.i18n API
    if (typeof chrome !== 'undefined' && chrome.i18n) {
      try {
        text = chrome.i18n.getMessage(key);
        if (text) {
          // 处理占位符
          if (placeholders) {
            Object.keys(placeholders).forEach((k, idx) => {
              text = text.replace(new RegExp(`\\$${k.toUpperCase()}\\$`, 'g'), placeholders[k]);
              // 同时支持 $1, $2 格式
              text = text.replace(new RegExp(`\\$${idx + 1}`, 'g'), placeholders[k]);
            });
          }
          return text;
        }
      } catch (e) {
        // 回退到硬编码翻译
      }
    }

    // 回退到硬编码翻译（仅保留扩展仍在使用的键；已移除 Tab/启停/计数等废弃键）
    // 同时提供简体(zh-CN)与繁体(zh-TW)兜底，确保 chrome.i18n 不可用时仍双语文案可用
    const translations = {
      'zh-CN': {
        'searchPlaceholder': '输入商品关键词搜索...',
        'searchButton': '搜索',
        'emptyTitle': '未找到匹配商品',
        'emptyDesc': '试试其他关键词，或清除筛选条件',
        'toastApiFailed': 'API加载失败，将依赖页面内容',
        'toastNetworkError': '网络异常，请检查网络连接',
        'toastRequestError': '请求失败，请稍后重试'
      },
      'zh-TW': {
        'searchPlaceholder': '輸入商品關鍵詞搜索...',
        'searchButton': '搜索',
        'emptyTitle': '未找到匹配商品',
        'emptyDesc': '試試其他關鍵詞，或清除篩選條件',
        'toastApiFailed': 'API加載失敗，將依賴頁面內容',
        'toastNetworkError': '網絡異常，請檢查網絡連接',
        'toastRequestError': '請求失敗，請稍後重試'
      }
    };

    const lang = navigator.language || navigator.userLanguage || 'zh-CN';
    const langKey = Object.keys(translations).find(k => lang.startsWith(k)) || 'zh-CN';
    text = translations[langKey][key] || translations['zh-CN'][key] || key;

    if (placeholders) {
      Object.keys(placeholders).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), placeholders[k]);
      });
    }

    return text;
  };
})(window);
