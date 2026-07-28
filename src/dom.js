// JD-Auction-Search/src/dom.js v1.2.7
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
        if (shouldUpdate) {
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

      if (!state.keyword && state.currentTab === 'all') {
        // 没有搜索和筛选，恢复所有
        productContainers.forEach(el => el.style.display = '');
        return;
      }

      // 先显示所有商品，然后隐藏不匹配的
      productContainers.forEach(el => el.style.display = '');

      // 构建匹配产品名称的集合
      const matchedProductNames = new Set(
        state.filteredProducts.map(p => 
          global.JDSUtils.getProductName(p).toLowerCase()
        )
      );

      // 遍历商品容器，检查是否匹配
      productContainers.forEach(container => {
        const containerText = container.textContent.toLowerCase();
        let shouldShow = false;

        // 检查是否有匹配的产品名称
        for (const name of matchedProductNames) {
          if (containerText.includes(name)) {
            shouldShow = true;
            break;
          }
        }

        // 如果没有匹配到产品，检查关键词直接匹配
        if (!shouldShow && state.keyword) {
          shouldShow = containerText.includes(state.keyword.toLowerCase());
        }

        container.style.display = shouldShow ? '' : 'none';
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
     * 隐藏原生商品列表 — 多页面搜索模式下，结果由扩展结果面板渲染
     */
    hideNativeProducts() {
      this._getProductContainers().forEach(el => { el.style.display = 'none'; });
    },

    /**
     * 恢复原生商品列表显示
     */
    showNativeProducts() {
      this._getProductContainers().forEach(el => { el.style.display = ''; });
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
