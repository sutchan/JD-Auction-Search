// JD-Auction-Search/src/dom/extract.js v1.6.4
// DOM 提取：从真实商品卡片提取完整字段（id/name/price/image/url）
// 价格文本回查见 ./price-text.js，原生列表显隐见 ./native-list.js

(function(global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  // 名称长度合理区间（过短为图标/标签，过长为整卡文本污染）
  const NAME_MIN = 2;
  const NAME_MAX = 200;
  // 安全链接/图片：仅 http(s) 与协议相对
  const SAFE_URL_RE = /^https?:|^\/\//i;

  /**
   * 从卡片中提取商品名称：精确类优先，再回退 <a title>
   * @private
   * @param {HTMLElement} card - 商品卡片
   * @returns {string} 未通过长度校验时返回空串
   */
  JDSDom._extractName = function _extractName(card) {
    let nameRaw = '';
    for (const sel of this.SELECTORS.NAME) {
      const el = card.querySelector(sel);
      const t = el ? (el.textContent || '').trim() : '';
      if (t && t.length >= NAME_MIN && t.length <= NAME_MAX) { nameRaw = t; break; }
    }
    if (!nameRaw) {
      // 避免匹配到包裹整张卡片的 <a>（其 textContent 为整卡文本，会污染名称）
      const aEl = card.querySelector('a[title]');
      nameRaw = aEl ? (aEl.getAttribute('title') || '').trim() : '';
    }
    if (!nameRaw || nameRaw.length < NAME_MIN || nameRaw.length > NAME_MAX) return '';
    return nameRaw;
  };

  /**
   * 从卡片中提取现价 / 原价 / 出价人数
   * @private
   * @param {HTMLElement} card - 商品卡片
   * @returns {{price:number, priceText:string, originalPrice:number, bidCount:number}}
   */
  JDSDom._extractPrices = function _extractPrices(card) {
    // 现价：优先京东精确现价元素 .p-price（页面实际显示现价），
    // 其次取其它 class 含 price 且非 origin(划线原价) 的元素，保证价格等于 span.p-price
    const pPriceEl = card.querySelector('.p-price, [class*="p-price" i]');
    const priceEls = card.querySelectorAll(this.SELECTORS.PRICE);
    const priceEl = (pPriceEl && !/origin/i.test(pPriceEl.className) ? pPriceEl
      : Array.from(priceEls).find(e => !/origin/i.test(e.className)))
      || priceEls[0] || null;
    // 现价金额实际在 .p-price 内的 <i> 标签（如 <div class="p-price"><i>¥1,288.00</i></div>），
    // 直接取 .p-price 全文会混入「起拍/封顶」等杂文；故金额优先取 .p-price i 文本，
    // 无 <i> 时回退 .p-price 全文。保留原始文本供渲染层直接显示，避免单位/千分位误差。
    const priceAmountEl = (pPriceEl && pPriceEl.querySelector('i')) || null;
    const priceText = priceAmountEl
      ? priceAmountEl.textContent.replace(/\s+/g, ' ').trim()
      : (priceEl ? priceEl.textContent.replace(/\s+/g, ' ').trim() : '');
    const price = priceAmountEl
      ? global.JDSUtils.parsePrice(priceAmountEl.textContent)
      : (priceEl ? global.JDSUtils.parsePrice(priceEl.textContent) : 0);

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

    // 拍卖时间：京东原生卡片用 .p-time 展示倒计时/结束时间（如「距结束 02:13:45」）
    let timeText = '';
    const timeEl = card.querySelector(this.SELECTORS.TIME);
    if (timeEl) timeText = timeEl.textContent.replace(/\s+/g, ' ').trim();
    return { price, priceText, originalPrice, bidCount, timeText };
  };

  /**
   * 从单张卡片构建商品对象（含接口规范字段映射）
   * @private
   * @param {HTMLElement} card - 商品卡片
   * @returns {Object|null} 非商品项返回 null
   */
  JDSDom._buildProductFromCard = function _buildProductFromCard(card) {
    const nameRaw = this._extractName(card);
    if (!nameRaw) return null;

    const { price, priceText, originalPrice, bidCount, timeText } = this._extractPrices(card);

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

    const hasDetail = SAFE_URL_RE.test(url) && /\/auction-detail\//i.test(url);
    const hasImg = SAFE_URL_RE.test(img);
    // 商品性校验：分类导航/标签/文字项等虽有名称但无详情链接也无主图，不应当作商品混入结果。
    // 必须有「详情链接」或「主图」其一才算商品卡（价格非硬要求，避免误杀暂未显示价的起拍卡）
    if (!hasDetail && !hasImg) return null;

    const product = {
      id,
      name: nameRaw,
      title: nameRaw,
      price,
      priceText,
      originalPrice,
      bidCount,
      image: hasImg ? img : '',
      url: SAFE_URL_RE.test(url) ? url : '',
      timeText: timeText || ''
    };
    // 映射到接口路径的规范字段，使统一渲染层（utils/price.js / ui/products.js）正确识别：
    // - 有出价(bidCount>0) → 现价 currentPrice；无出价 → 起拍价 startPrice（currentPrice 留空）
    // - 划线原价 originalPrice → cappedPrice；出价人数 bidCount → recordCount
    if (bidCount > 0) {
      product.currentPrice = price;
      product.recordCount = bidCount;
    } else {
      product.startPrice = price;
    }
    if (originalPrice > 0) product.cappedPrice = originalPrice;
    return product;
  };

  /**
   * 从DOM中提取商品 — 仅从真实商品卡片提取完整字段（id/name/price/image/url）
   * 使 API 拦截失败时的搜索兜底也能渲染真实主图/价格/链接，而非仅文本
   * @returns {Array} 商品数组
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
      const product = this._buildProductFromCard(card);
      if (product) products.push(product);
    });

    return products;
  };

  /**
   * 为 DOM 提取的商品生成稳定去重 id（优先 data-* 属性，其次 name+class 哈希）
   * @private
   * @param {HTMLElement} card - 商品卡片
   * @param {string} name - 商品名称
   * @returns {string}
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
})(window);
