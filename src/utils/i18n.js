// JD-Auction-Search/src/utils/i18n.js v1.3.0
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
    const translations = {
      'zh-CN': {
        'searchPlaceholder': '输入商品关键词搜索...',
        'searchButton': '搜索',
        'emptyTitle': '未找到匹配商品',
        'emptyDesc': '试试其他关键词，或清除筛选条件',
        'toastEnabled': '插件已启用',
        'toastDisabled': '插件已禁用',
        'toastApiFailed': 'API加载失败，将依赖页面内容'
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
