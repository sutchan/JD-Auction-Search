// JD-Auction-Search/src/utils.js v1.2.0
// 工具函数模块

(function(global) {
  'use strict';

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键
   * @returns {string}
   */
  function getMessage(key) {
    const translations = {
      'zh-CN': {
        'toastEnabled': '插件已启用',
        'toastDisabled': '插件已禁用',
        'toastApiFailed': 'API加载失败，将依赖页面内容'
      },
      'en': {
        'toastEnabled': 'Extension enabled',
        'toastDisabled': 'Extension disabled',
        'toastApiFailed': 'API load failed, will use page content'
      }
    };

    const lang = navigator.language || navigator.userLanguage || 'zh-CN';
    const langKey = Object.keys(translations).find(k => lang.startsWith(k)) || 'zh-CN';
    return translations[langKey][key] || translations['zh-CN'][key] || key;
  }

  const JDSUtils = {
    /**
     * 从多个可能的字段中获取商品ID
     * @param {Object} product - 商品对象
     * @returns {string|number|null} - 商品ID
     */
    getProductId(product) {
      return product.id || product.skuId || product.productId || product.auctionId || null;
    },

    /**
     * 从多个可能的字段中获取商品名称
     * @param {Object} product - 商品对象
     * @returns {string} - 商品名称
     */
    getProductName(product) {
      return product.name || product.title || product.productName || '';
    },

    /**
     * 检查商品是否正在进行中
     * @param {Object} product - 商品对象
     * @returns {boolean}
     */
    isOngoing(product) {
      return product.status === 1 || product.state === 'ongoing' || product.auctionStatus === 1;
    },

    /**
     * 检查商品是否即将开始
     * @param {Object} product - 商品对象
     * @returns {boolean}
     */
    isUpcoming(product) {
      return product.status === 0 || product.state === 'upcoming' || product.auctionStatus === 0;
    },

    /**
     * 从API响应中提取商品列表
     * @param {Object} data - API响应数据
     * @returns {Array} - 商品数组
     */
    extractProductsFromResponse(data) {
      if (!data) return [];

      if (Array.isArray(data)) {
        return data;
      }

      const possibleKeys = ['data', 'result', 'list', 'products', 'items', 'auctions', 'goodsList'];

      for (const key of possibleKeys) {
        if (data[key] && Array.isArray(data[key])) {
          return data[key];
        }
      }

      return [];
    },

    /**
     * 去重商品列表
     * @param {Array} products - 商品数组
     * @returns {Array} - 去重后的数组
     */
    deduplicateProducts(products) {
      const seen = new Set();
      return products.filter(product => {
        const id = this.getProductId(product);
        if (!id || seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
    },

    /**
     * 显示提示消息
     * @param {string} message - 消息内容
     */
    showToast(message) {
      // 如果传入的是翻译键，先翻译
      const translatedMessage = (message === '插件已启用' ? getMessage('toastEnabled') : 
                                 message === '插件已禁用' ? getMessage('toastDisabled') : 
                                 message === 'API加载失败，将依赖页面内容' ? getMessage('toastApiFailed') : message);
      
      let toast = document.querySelector('.jds-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'jds-toast';
        document.body.appendChild(toast);
      }

      toast.textContent = translatedMessage;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    },

    /**
     * 注入样式表
     * @param {string} cssPath - CSS路径
     */
    injectStyles(cssPath) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(cssPath);
      (document.head || document.documentElement).appendChild(link);
    },

    /**
     * 安全查询Shadow DOM中的元素
     * @param {ShadowRoot} shadowRoot - Shadow DOM根
     * @param {string} selector - 选择器
     * @returns {HTMLElement|null}
     */
    queryShadowDom(shadowRoot, selector) {
      return shadowRoot && shadowRoot.querySelector(selector);
    }
  };

  global.JDSUtils = JDSUtils;
})(window);
