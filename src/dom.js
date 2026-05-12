// JD-Auction-Search/src/dom.js v1.2.0
// DOM观察和处理模块

(function(global) {
  'use strict';

  const JDSDom = {
    observer: null,

    /**
     * 初始化DOM观察器
     * @param {Object} state - 应用状态
     * @param {Function} onChange - 变化回调
     */
    observeDOM(state, onChange) {
      const container = this._getObservedContainer();

      this.observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            shouldUpdate = true;
            break;
          }
        }
        if (shouldUpdate && state.isEnabled) {
          onChange();
        }
      });

      this.observer.observe(container, {
        childList: true,
        subtree: true
      });
    },

    /**
     * 获取需要观察的容器
     * @private
     * @returns {HTMLElement}
     */
    _getObservedContainer() {
      const selectors = [
        '[class*="auction"], [class*="product"], [class*="goods"]',
        '.jd-paipai',
        '#app',
        'main'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }

      return document.body;
    },

    /**
     * 从DOM中提取商品
     * @returns {Array}
     */
    extractProductsFromDOM() {
      const selectors = [
        '[class*="auction"] [class*="name"]',
        '[class*="product"] [class*="title"]',
        '[class*="goods"] [class*="name"]',
        '[class*="item"] h3',
        '[class*="card"] h4',
      ];

      const products = [];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 2 && text.length < 200) {
            products.push({
              name: text,
              title: text,
              id: Math.random().toString(36).slice(2)
            });
          }
        });
      });

      return products;
    },

    /**
     * 更新页面上的商品展示
     * @param {Object} state - 应用状态
     */
    updateProductDisplay(state) {
      const productContainers = this._getProductContainers();

      if (state.filteredProducts.length === 0 && state.keyword) {
        return;
      }

      if (productContainers.length === 0 || !state.keyword) {
        return;
      }

      productContainers.forEach((el, idx) => {
        const product = state.filteredProducts[idx];
        if (!product) {
          el.style.display = 'none';
          return;
        }

        const name = global.JDSUtils.getProductName(product);
        if (!name.toLowerCase().includes(state.keyword.toLowerCase())) {
          el.style.display = 'none';
        } else {
          el.style.display = '';
        }
      });
    },

    /**
     * 获取商品容器
     * @private
     * @returns {NodeList}
     */
    _getProductContainers() {
      return document.querySelectorAll(
        '[class*="auction-item"], [class*="product-item"], [class*="goods-item"], [class*="item"]'
      );
    },

    /**
     * 停止观察
     */
    stopObservation() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  };

  global.JDSDom = JDSDom;
})(window);
