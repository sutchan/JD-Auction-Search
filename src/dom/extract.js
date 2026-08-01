// JD-Auction-Search/src/dom/extract.js v1.5.0
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

    // 全部选择器未命中（京东改版/页面结构变化）：显式告警，避免静默返回空结果
    if (!containers.length) {
      global.JDSUtils.showToast('toastDomExtractFailed');
      return products;
    }

    containers.forEach(card => {
      // 名称提取：精确类优先（product-name/title/.name 等），再回退模糊 class（已排除 username 等），
      // 最后回退 <a title>；避免匹配到包裹整张卡片的 <a>（其 textContent 为整卡文本，会污染名称）
      let nameRaw = '';
      for (const sel of this.SELECTORS.NAME) {
        const el = card.querySelector(sel);
        const t = el ? (el.textContent || '').trim() : '';
        if (t && t.length >= 2 && t.length <= 200) { nameRaw = t; break; }
      }
      if (!nameRaw) {
        const aEl = card.querySelector('a[title]');
        nameRaw = aEl ? (aEl.getAttribute('title') || '').trim() : '';
      }
      if (!nameRaw || nameRaw.length < 2 || nameRaw.length > 200) return;

      // 现价：取 class 含 price 且非 origin(划线原价) 的元素；优先 current-price
      const priceEls = card.querySelectorAll(this.SELECTORS.PRICE);
      const priceEl = Array.from(priceEls).find(e => !/origin/i.test(e.className))
        || priceEls[0] || null;
      const priceRaw = priceEl ? priceEl.textContent.replace(/[^\d.]/g, '') : '';
      const price = priceRaw ? Number(priceRaw) : 0;

      // 原价：优先取 class 含 old/original/origin/market/ref 的划线价片段（避免与现价同元素）
      let originalPrice = 0;
      const origEl = card.querySelector(this.SELECTORS.ORIGIN);
      if (origEl && origEl !== priceEl) {
        const oRaw = origEl.textContent.replace(/[^\d.]/g, '');
        if (oRaw) originalPrice = Number(oRaw);
      }

      // 出价人数：取 class 含 bid/apply/join/count/报名/出价 的数字片段
      let bidCount = 0;
      const bidEl = card.querySelector(this.SELECTORS.BID);
      if (bidEl) {
        const bRaw = bidEl.textContent.replace(/[^\d]/g, '');
        if (bRaw) bidCount = Number(bRaw);
      }

      const imgEl = card.querySelector(this.SELECTORS.IMG);
      const img = imgEl
        ? (imgEl.getAttribute('src') ||
          imgEl.getAttribute('data-src') ||
          imgEl.getAttribute('data-original') || '')
        : '';

      const aEl = card.closest('a') || card.querySelector('a');
      const url = aEl ? (aEl.href || '') : '';

      let id = '';
      const urlMatch = url && url.match(/(\d{6,})/);
      if (urlMatch) id = urlMatch[1];
      if (!id) id = this._cardIdFallback(card, nameRaw);

      const product = {
        id,
        name: nameRaw,
        title: nameRaw,
        price,
        originalPrice,
        bidCount,
        image: /^https?:|^\/\//i.test(img) ? img : '',
        url: /^https?:|^\/\//i.test(url) ? url : ''
      };
      // 映射到接口路径的规范字段，使统一渲染层（extract.js / products.js）正确识别：
      // - 有出价(bidCount>0) → 现价 currentPrice；无出价 → 起拍价 startPrice（currentPrice 留空）
      // - 划线原价 originalPrice → cappedPrice；出价人数 bidCount → recordCount
      if (bidCount > 0) {
        product.currentPrice = price;
      } else {
        product.startPrice = price;
      }
      if (originalPrice > 0) product.cappedPrice = originalPrice;
      if (bidCount > 0) product.recordCount = bidCount;
      products.push(product);
    });

    return products;
  };

  /**
   * 为 DOM 提取的商品生成稳定去重 id（优先 data-* 属性，其次 name+class 哈希）
   * @private
   */
  JDSDom._cardIdFallback = function _cardIdFallback(card, name) {
    const ds = card.getAttribute && (
      card.getAttribute('data-id') ||
      card.getAttribute('data-sku') ||
      card.getAttribute('data-productid') ||
      card.getAttribute('data-pid')
    );
    if (ds) return ds;
    let h = 0;
    const s = name + (card.className || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return 'dom-' + (h >>> 0);
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
