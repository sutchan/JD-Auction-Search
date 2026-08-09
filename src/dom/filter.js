// JD-Auction-Search/src/dom/filter.js v1.6.6
// 原生列表过滤：根据关键词更新页面商品显隐（浏览态）；产品容器精确定位

(function(global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  /**
   * 更新页面上的商品展示
   * @param {Object} state - 应用状态
   */
  JDSDom.updateProductDisplay = function updateProductDisplay(state) {
    const productContainers = this._getProductContainers();

    if (!state.keyword) {
      // 没有搜索，恢复所有
      productContainers.forEach(el => el.style.display = '');
      return;
    }

    // 先显示所有商品，然后隐藏不匹配的
    productContainers.forEach(el => el.style.display = '');

    // 精确匹配：优先用 filteredProducts 的 id 集合，从卡片链接中提取 auction-detail/{id}
    // 比对，避免「全文 includes」在商品名互含/描述含关键词时误显或漏显
    const matchedIds = new Set(
      state.filteredProducts.map(p => String(global.JDSUtils.getProductId(p) || ''))
    );
    const kw = state.keyword.toLowerCase();

    productContainers.forEach(container => {
      let shouldShow = false;

      if (matchedIds.size) {
        const anchor = container.querySelector('a[href]');
        const href = anchor ? anchor.getAttribute('href') : '';
        const m = /\/auction-detail\/(\d+)/i.exec(href || '');
        if (m && matchedIds.has(m[1])) shouldShow = true;
      }

      // 无 id 可比对（原生卡片无详情链接）时回退关键词全文匹配
      if (!shouldShow) {
        shouldShow = container.textContent.toLowerCase().includes(kw);
      }

      container.style.display = shouldShow ? '' : 'none';
    });
  };

  /**
   * 获取商品容器（卡片）
   * 优先在已知列表容器内查找精确的商品卡片类，避免 [class*="item"] 过宽
   * 误匹配 nav-item / page-item / breadcrumb-item 等非商品元素（审查高优 #1）
   * @private
   * @returns {Array<HTMLElement>}
   */
  JDSDom._getProductContainers = function _getProductContainers() {
    let cards = this.queryCards(this.SELECTORS.LIST_CONTAINER, this.SELECTORS.CARD);

    // 列表容器未命中时，全局回退（仍排除明显非商品项，缓解过宽匹配）
    if (!cards.length) {
      cards = Array.from(document.querySelectorAll(this.FALLBACK_CARD));
    }

    return cards;
  };

  /**
   * 获取商品列表容器（列表外层包裹元素），用于让结果面板宽度与原始列表对齐
   * 逻辑与 _getProductContainers 一致，但返回容器本身而非卡片
   * @returns {HTMLElement|null}
   */
  JDSDom.getProductListContainer = function getProductListContainer() {
    let container = null;
    for (const sel of this.SELECTORS.LIST_CONTAINER) {
      const el = document.querySelector(sel);
      if (el && el.querySelectorAll(this.SELECTORS.CARD.join(',')).length) {
        container = el;
        break;
      }
    }

    // 回退：取首个商品卡片的父容器
    if (!container) {
      const firstCard = document.querySelector(this.SELECTORS.CARD.join(','));
      container = firstCard ? firstCard.parentElement : null;
    }

    return container;
  };
})(window);
