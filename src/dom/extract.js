// JD-Auction-Search/src/dom/extract.js v1.3.5
// DOM 提取：从真实商品卡片提取完整字段（id/name/price/image/url），以及原生卡片模板获取与显隐

(function(global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  /**
   * 从DOM中提取商品 — 仅从真实商品卡片提取完整字段（id/name/price/image/url）
   * 使 API 拦截失败时的搜索兜底也能渲染真实主图/价格/链接，而非仅文本
   * @returns {Array}
   */
  JDSDom.extractProductsFromDOM = function extractProductsFromDOM() {
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
  };

  /**
   * 为 DOM 提取的商品生成稳定去重 id（优先 data-* 属性，其次 name+class 哈希）
   * @private
   */
  JDSDom._cardIdFallback = function _cardIdFallback(card, name) {
    const ds = card.getAttribute &&
      (card.getAttribute('data-id') || card.getAttribute('data-sku') || card.getAttribute('data-productid') || card.getAttribute('data-pid'));
    if (ds) return ds;
    let h = 0;
    const s = name + (card.className || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return 'dom-' + (h >>> 0);
  };

  /**
   * 获取页面上第一个原生商品卡片（作为克隆模板，用于让搜索结果外观与原始页面一致）
   * @returns {HTMLElement|null}
   */
  JDSDom.getFirstProductCard = function getFirstProductCard() {
    const cards = this._getProductContainers();
    return cards.length ? cards[0] : null;
  };

  /**
   * 隐藏原生商品列表 — 多页面搜索模式下，结果由扩展结果面板渲染
   */
  JDSDom.hideNativeProducts = function hideNativeProducts() {
    this._getProductContainers().forEach(el => { el.style.display = 'none'; });
  };

  /**
   * 恢复原生商品列表显示
   */
  JDSDom.showNativeProducts = function showNativeProducts() {
    this._getProductContainers().forEach(el => { el.style.display = ''; });
  };
})(window);
