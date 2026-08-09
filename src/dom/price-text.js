// JD-Auction-Search/src/dom/price-text.js v1.6.5
// 原生卡片价格文本回查：按商品名从页面 .p-price 取实际显示价（带缓存）
// 商品字段提取见 ./extract.js

(function(global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  /**
   * 从单张原生卡片提取商品名（按 SELECTORS.NAME 优先级）
   * @private
   * @param {HTMLElement} card - 原生商品卡片
   * @returns {string}
   */
  JDSDom._cardName = function _cardName(card) {
    for (const sel of this.SELECTORS.NAME) {
      const el = card.querySelector(sel);
      const t = el ? (el.textContent || '').trim() : '';
      if (t) return t;
    }
    return '';
  };

  /**
   * 从单张原生卡片提取现价文本（排除划线原价元素）
   * @private
   * @param {HTMLElement} card - 原生商品卡片
   * @returns {string} 如 "¥1,288.00"，无则空串
   */
  JDSDom._cardPriceText = function _cardPriceText(card) {
    const pEl = card.querySelector('.p-price, [class*="p-price" i]');
    const priceEl = pEl || (Array.from(card.querySelectorAll(this.SELECTORS.PRICE))
      .find(e => !/origin/i.test(e.className))) || null;
    if (!priceEl) return '';
    // 现价金额实际在 .p-price 内的 <i> 标签；直接取全文会混入「起拍/封顶」等杂文，
    // 故优先取 .p-price i 文本，无 <i> 时回退元素全文。
    const amountEl = (pEl && pEl.querySelector('i')) || null;
    const src = amountEl || priceEl;
    return src.textContent.replace(/\s+/g, ' ').trim();
  };

  /**
   * 按商品名称从页面原生卡片取 .p-price 实际价格文本
   * 渲染结果卡片时用于以页面真实显示价为准，避免接口字段名/单位（分/元）猜测导致的价格不准。
   * 原生列表隐藏(display:none)时 textContent 仍可读取，故搜索态仍可命中。
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

    // 性能：首次调用构建 name→priceText 缓存（页面商品名基本唯一），
    // 避免每张结果卡渲染都全量遍历所有原生卡片导致 O(N²) 卡顿
    if (!this._priceTextCache) {
      this._priceTextCache = new Map();
      for (const card of cards) {
        const cardName = this._cardName(card);
        if (!cardName || cardName.length < 2) continue;
        const txt = this._cardPriceText(card);
        if (txt) this._priceTextCache.set(cardName, txt);
      }
    }
    if (this._priceTextCache.has(target)) return this._priceTextCache.get(target);

    // 缓存未命中（名称不完全一致）时回退精确/前缀后缀匹配（保持原有鲁棒性）
    for (const card of cards) {
      const cardName = this._cardName(card);
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
      const txt = this._cardPriceText(card);
      if (txt) return txt;
    }
    return null;
  };
})(window);
