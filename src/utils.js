// JD-Auction-Search/src/utils.js v1.2.14
// 工具函数模块

(function(global) {
  'use strict';

  /**
   * 获取翻译文本（使用 chrome.i18n API，回退到硬编码）
   * @param {string} key - 翻译键
   * @param {Object} [placeholders] - 占位符
   * @returns {string}
   */
  function getMessage(key, placeholders) {
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

    // 回退到硬编码翻译
    const translations = {
      'zh-CN': {
        'logoText': '夺宝搜索',
        'searchPlaceholder': '输入商品关键词搜索...',
        'searchButton': '搜索',
        'tabAll': '全部',
        'tabOngoing': '正在夺宝',
        'tabUpcoming': '即将开始',
        'resultCount': '共 {count} 件商品',
        'loading': '加载中',
        'enabled': '已启用',
        'disabled': '已禁用',
        'enabledLocal': '已启用(本地)',
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
  }

  const JDSUtils = {
    getMessage,
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
     * 从多个可能字段中获取商品主图 URL
     * 兼容京东拍卖常见字段；仅允许 http/https/协议相对/绝对路径，防止注入非法 scheme
     * @param {Object} product - 商品对象
     * @returns {string|null}
     */
    getProductImage(product) {
      if (!product || typeof product !== 'object') return null;
      const candidates = [
        product.imageUrl, product.imgUrl, product.picUrl, product.image,
        product.img, product.picture, product.pic, product.skuImg,
        product.coverUrl, product.thumbUrl, product.photo, product.imagePath
      ];
      const isValid = (v) => typeof v === 'string' && /^(https?:|\/\/|\/)/i.test(v.trim());
      for (const c of candidates) {
        if (isValid(c)) return c.trim();
        if (Array.isArray(c) && c.length && isValid(c[0])) return c[0].trim();
      }
      if (product.image && typeof product.image === 'object' && isValid(product.image.url)) {
        return product.image.url.trim();
      }
      return null;
    },

    /**
     * 从多个可能字段中获取商品价格，统一归一为数值（单位：元）
     * @param {Object} product - 商品对象
     * @returns {number}
     */
    getProductPrice(product) {
      if (!product || typeof product !== 'object') return 0;
      const toNum = (v) => {
        if (typeof v === 'number' && isFinite(v)) return v;
        if (typeof v === 'string') {
          const n = parseFloat(v.replace(/[^\d.]/g, ''));
          return isFinite(n) ? n : null;
        }
        return null;
      };
      const flat = [
        product.price, product.currentPrice, product.startPrice,
        product.auctionPrice, product.realPrice, product.salePrice,
        product.nowPrice, product.finalPrice, product.minPrice, product.maxPrice
      ];
      for (const f of flat) {
        const n = toNum(f);
        if (n !== null && n >= 0) return n;
      }
      if (product.price && typeof product.price === 'object') {
        const n = toNum(product.price.currentPrice ?? product.price.price ?? product.price.value);
        if (n !== null && n >= 0) return n;
      }
      if (product.priceInfo) {
        const n = toNum(product.priceInfo.currentPrice ?? product.priceInfo.price);
        if (n !== null && n >= 0) return n;
      }
      return 0;
    },

    /**
     * 从多个可能字段中获取商品详情链接，并做协议白名单校验
     * 无显式链接时按京东拍卖惯例回退为 https://paimai.jd.com/{id}.html
     * @param {Object} product - 商品对象
     * @returns {string|null}
     */
    getProductUrl(product) {
      if (!product || typeof product !== 'object') return null;
      const candidates = [
        product.url, product.link, product.detailUrl, product.href,
        product.productUrl, product.itemUrl, product.jumpUrl
      ];
      const safe = (v) => typeof v === 'string' && /^(https?:|\/\/|\/)/i.test(v.trim()) ? v.trim() : null;
      for (const c of candidates) {
        const u = safe(c);
        if (u) return u;
      }
      const id = this.getProductId(product);
      if (id) return `https://paimai.jd.com/${encodeURIComponent(String(id))}.html`;
      return null;
    },

    /**
     * HTML 转义，防止商品字段注入破坏卡片布局或造成 XSS
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * 格式化价格：整数不带小数，小数保留两位
     * @param {number} n
     * @returns {string}
     */
    formatPrice(n) {
      const num = Number(n) || 0;
      return num.toLocaleString('zh-CN', {
        minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
        maximumFractionDigits: 2
      });
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
     * 显示提示消息 — sonner 风格 Toast（图标 + 消息 + 自动堆叠）
     * @param {string} key - 翻译键或直接消息内容
     * @param {string} [type='info'] - toast 类型: success | error | info
     */
    showToast(key, type = 'info') {
      const translationKeys = ['toastEnabled', 'toastDisabled', 'toastApiFailed'];
      const message = translationKeys.includes(key) ? getMessage(key) : key;

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
