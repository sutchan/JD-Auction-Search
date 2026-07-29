// JD-Auction-Search/src/dom.js v1.2.14
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
     * 从DOM中提取商品 — 仅从真实商品卡片提取完整字段（id/name/price/image/url）
     * 使 API 拦截失败时的搜索兜底也能渲染真实主图/价格/链接，而非仅文本
     * @returns {Array}
     */
    extractProductsFromDOM() {
      const containers = this._getProductContainers();
      const products = [];

      containers.forEach(card => {
        // 优先取 class 化的名称元素（.name/.title 等），避免匹配到包裹整张卡片的 <a>
        // （<a> 在文档顺序上早于内部 .name，且其 textContent 为整卡文本，会污染名称）
        const nameEl = card.querySelector('[class*="name" i], [class*="title" i], h3, h4');
        let nameRaw = nameEl ? (nameEl.textContent || '').trim() : '';
        // 仅当 class 名称元素取不到时，回退 <a> 的 title 属性（取属性而非整段文本）
        if (!nameRaw) {
          const aEl = card.querySelector('a[title]');
          nameRaw = aEl ? (aEl.getAttribute('title') || '').trim() : '';
        }
        if (!nameRaw || nameRaw.length < 2 || nameRaw.length > 200) return;

        const priceEl = card.querySelector('[class*="price" i]');
        const priceRaw = priceEl ? priceEl.textContent.replace(/[^\d.]/g, '') : '';
        const price = priceRaw ? Number(priceRaw) : 0;

        const imgEl = card.querySelector('img');
        const img = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || '') : '';

        const aEl = card.closest('a') || card.querySelector('a');
        const url = aEl ? (aEl.href || '') : '';

        let id = '';
        const urlMatch = url && url.match(/(\d{6,})/);
        if (urlMatch) id = urlMatch[1];
        if (!id) id = this._cardIdFallback(card, nameRaw);

        products.push({
          id,
          name: nameRaw,
          title: nameRaw,
          price,
          image: /^https?:|^\/\//i.test(img) ? img : '',
          url: /^https?:|^\/\//i.test(url) ? url : ''
        });
      });

      return products;
    },

    /**
     * 为 DOM 提取的商品生成稳定去重 id（优先 data-* 属性，其次 name+class 哈希）
     * @private
     */
    _cardIdFallback(card, name) {
      const ds = card.getAttribute &&
        (card.getAttribute('data-id') || card.getAttribute('data-sku') || card.getAttribute('data-productid') || card.getAttribute('data-pid'));
      if (ds) return ds;
      let h = 0;
      const s = name + (card.className || '');
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return 'dom-' + (h >>> 0);
    },

    /**
     * 更新页面上的商品展示
     * @param {Object} state - 应用状态
     */
    updateProductDisplay(state) {
      const productContainers = this._getProductContainers();

      if (!state.keyword) {
        // 没有搜索，恢复所有
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
     * 获取商品容器（卡片）
     * 优先在已知列表容器内查找精确的商品卡片类，避免 [class*="item"] 过宽
     * 误匹配 nav-item / page-item / breadcrumb-item 等非商品元素（审查高优 #1）
     * @private
     * @returns {Array<HTMLElement>}
     */
    _getProductContainers() {
      const listContainerSelectors = [
        '[class*="goods-list" i]', '[class*="auction-list" i]', '[class*="product-list" i]',
        '[class*="list" i]', '[class*="grid" i]', '[class*="goods" i]'
      ];
      const cardSelector = '[class*="auction-item" i], [class*="product-item" i], [class*="goods-item" i], ' +
        '[class*="auction-card" i], [class*="product-card" i], [class*="goods-card" i]';

      let cards = [];
      for (const sel of listContainerSelectors) {
        const container = document.querySelector(sel);
        if (container) {
          const found = container.querySelectorAll(cardSelector);
          if (found.length) {
            cards = Array.from(found);
            break;
          }
        }
      }

      // 列表容器未命中时，全局回退（仍排除明显非商品项，缓解过宽匹配）
      if (!cards.length) {
        cards = Array.from(document.querySelectorAll(
          '[class*="item" i]' +
          ':not([class*="nav" i]):not([class*="menu" i]):not([class*="page" i])' +
          ':not([class*="breadcrumb" i]):not([class*="tab" i]):not([class*="step" i])' +
          ':not([class*="option" i]):not([class*="cart" i]):not([class*="order" i])'
        ));
      }

      return cards;
    },

    /**
     * 获取页面上第一个原生商品卡片（作为克隆模板，用于让搜索结果外观与原始页面一致）
     * @returns {HTMLElement|null}
     */
    getFirstProductCard() {
      const cards = this._getProductContainers();
      return cards.length ? cards[0] : null;
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
