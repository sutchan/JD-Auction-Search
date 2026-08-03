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

      // 现价：优先京东精确现价元素 .p-price（页面实际显示现价），
      // 其次取其它 class 含 price 且非 origin(划线原价) 的元素，保证价格等于 span.p-price
      const pPriceEl = card.querySelector('.p-price, [class*="p-price" i]');
      const priceEls = card.querySelectorAll(this.SELECTORS.PRICE);
      const priceEl = (pPriceEl && !/origin/i.test(pPriceEl.className) ? pPriceEl
        : Array.from(priceEls).find(e => !/origin/i.test(e.className)))
        || priceEls[0] || null;
      // 保留 p-price 原始文本（如 "¥1,288.00"），供渲染层直接显示，避免单位/千分位/分单位误差
      const priceText = priceEl ? priceEl.textContent.replace(/\s+/g, ' ').trim() : '';
      // 解析数值：先去千分位逗号，再取数字/小数点；京东部分接口为「分」单位(>100000 整数)需 ÷100
      const priceRaw = priceEl ? global.JDSUtils.parsePrice(priceEl.textContent) : 0;
      const price = priceRaw;

      // 原价：优先取 class 含 old/original/origin/market/ref 的划线价片段（避免与现价同元素）
      let originalPrice = 0;
      const origEl = card.querySelector(this.SELECTORS.ORIGIN);
      if (origEl && origEl !== priceEl) {
        const o = global.JDSUtils.parsePrice(origEl.textContent);
        if (o > 0) originalPrice = o;
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
        priceText,
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
   * 按商品名称从页面原生卡片取 .p-price 实际价格文本
   * 渲染结果卡片时用于以页面真实显示价为准（用户要求价格只显示 p-price），
   * 避免接口字段名/单位（分/元）猜测导致的价格不准。原生列表隐藏(display:none)时
   * textContent 仍可读取，故搜索态仍可命中。
   * @param {string} name - 商品名称
   * @returns {string|null} 如 "¥1,288.00"，无匹配返回 null
   */
  JDSDom.getProductPriceText = function getProductPriceText(name) {
    if (!name || typeof name !== 'string') return null;
    const target = name.trim();
    if (target.length < 2) return null;
    let cards;
    try {
      cards = this._getProductContainers();
    } catch (e) {
      // 非浏览器/测试环境下容器查询不可用时安全回退
      return null;
    }
    if (!cards || typeof cards.forEach !== 'function') return null;
    for (const card of cards) {
      let cardName = '';
      for (const sel of this.SELECTORS.NAME) {
        const el = card.querySelector(sel);
        const t = el ? (el.textContent || '').trim() : '';
        if (t) { cardName = t; break; }
      }
      // 名称匹配：优先精确相等；模糊匹配仅接受「一端被另一端完整包裹前缀/后缀」，
      // 且双向包含（避免 "iPhone 13" 误中 "iPhone 13 Pro" 等相邻卡片）
      const matched = cardName && cardName.length > 2 && (
        cardName === target ||
        (cardName.length >= target.length && cardName.startsWith(target)) ||
        (target.length >= cardName.length && target.startsWith(cardName)) ||
        (cardName.length >= target.length && cardName.endsWith(target)) ||
        (target.length >= cardName.length && target.endsWith(cardName))
      );
      if (!matched) continue;
      const pEl = card.querySelector('.p-price, [class*="p-price" i]');
      const priceEl = pEl || (Array.from(card.querySelectorAll(this.SELECTORS.PRICE))
        .find(e => !/origin/i.test(e.className))) || null;
      if (priceEl) {
        const txt = priceEl.textContent.replace(/\s+/g, ' ').trim();
        if (txt) return txt;
      }
    }
    return null;
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
