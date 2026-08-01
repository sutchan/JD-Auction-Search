// JD-Auction-Search/src/dom/filter.js v1.5.0
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
      if (!shouldShow) {
        shouldShow = containerText.includes(state.keyword.toLowerCase());
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
