// JD-Auction-Search/src/utils/extract.js v1.5.0
// 商品字段提取：从多态 API 对象中兼容取 id/name/状态/主图/价格/链接

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  // 京东拍拍/夺宝岛 auction.list 接口商品图主域（primaryPic 为 "jfs/..." 相对路径，需拼此前缀）
  const JD_IMG_CDN = 'https://m.360buyimg.com/n1/s220x220_';

  /**
   * 从多个可能的字段中获取商品ID
   * @param {Object} product - 商品对象
   * @returns {string|number|null} - 商品ID
   */
  JDSUtils.getProductId = function getProductId(product) {
    return product.id || product.skuId || product.productId || product.auctionId || null;
  };

  /**
   * 从多个可能的字段中获取商品名称
   * @param {Object} product - 商品对象
   * @returns {string} - 商品名称
   */
  JDSUtils.getProductName = function getProductName(product) {
    return product.name || product.title || product.productName || '';
  };

  /**
   * 从多个可能字段中获取商品主图 URL
   * 兼容京东拍卖常见字段；仅允许 http/https/协议相对/绝对路径，防止注入非法 scheme
   * @param {Object} product - 商品对象
   * @returns {string|null}
   */
  JDSUtils.getProductImage = function getProductImage(product) {
    if (!product || typeof product !== 'object') return null;
    const candidates = [
      product.imageUrl, product.imgUrl, product.picUrl, product.image,
      product.img, product.picture, product.pic, product.skuImg,
      product.coverUrl, product.thumbUrl, product.photo, product.imagePath,
      product.primaryPic
    ];
    const isValid = (v) => typeof v === 'string' && /^(https?:|\/\/|\/)/i.test(v.trim());
    const toCdn = (v) => (typeof v === 'string' && /^jfs\//i.test(v.trim()))
      ? JD_IMG_CDN + v.trim() : null;
    for (const c of candidates) {
      if (isValid(c)) return c.trim();
      if (Array.isArray(c) && c.length && isValid(c[0])) return c[0].trim();
      const cdn = toCdn(c);
      if (cdn) return cdn;
    }
    if (product.image && typeof product.image === 'object' && isValid(product.image.url)) {
      return product.image.url.trim();
    }
    return null;
  };

  /**
   * 从多个可能字段中获取商品价格，统一归一为数值（单位：元）
   * @param {Object} product - 商品对象
   * @returns {number}
   */
  JDSUtils.getProductPrice = function getProductPrice(product) {
    if (!product || typeof product !== 'object') return 0;
    const toNum = (v) => {
      if (typeof v === 'number' && isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(/[^\d.]/g, ''));
        return isFinite(n) ? n : null;
      }
      return null;
    };
    // 现价优先 currentPrice；未开拍(currentPrice 为 null)时回退起拍价 startPrice。
    // 注意：maxPrice/cappedPrice 为封顶/参考价，不可作为现价。
    const flat = [
      product.price, product.currentPrice, product.startPrice,
      product.auctionPrice, product.realPrice, product.salePrice,
      product.nowPrice, product.finalPrice, product.minPrice
    ];
    for (const f of flat) {
      const n = toNum(f);
      if (n !== null && n >= 0) return n;
    }
    if (product.price && typeof product.price === 'object') {
      const n = toNum(product.price.currentPrice ?? product.price.price ?? product.price.value);
      if (n !== null && n >= 0) return n;
    }
    if (product.priceInfo) {
      const n = toNum(product.priceInfo.currentPrice ?? product.priceInfo.price);
      if (n !== null && n >= 0) return n;
    }
    return 0;
  };

  /**
   * 从多个可能字段中获取商品原价（市场价/参考价/起拍价），统一归一为数值（单位：元）
   * 仅作兼容提取；是否展示由渲染层判断（高于现价才划线展示，避免与现价重复）
   * @param {Object} product - 商品对象
   * @returns {number}
   */
  JDSUtils.getProductOriginalPrice = function getProductOriginalPrice(product) {
    if (!product || typeof product !== 'object') return 0;
    const toNum = (v) => {
      if (typeof v === 'number' && isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(/[^\d.]/g, ''));
        return isFinite(n) ? n : null;
      }
      return null;
    };
    // 原价(划线参考价)：京东拍拍接口对应 cappedPrice(页面 class=origin-price)；
    // 其次 maxPrice、以及常见多态字段作为兼容兜底。startPrice 起拍价不作原价。
    const flat = [
      product.cappedPrice, product.maxPrice,
      product.marketPrice, product.originalPrice, product.originPrice,
      product.refPrice, product.referencePrice, product.listPrice,
      product.highPrice
    ];
    for (const f of flat) {
      const n = toNum(f);
      if (n !== null && n >= 0) return n;
    }
    if (product.priceInfo) {
      const n = toNum(product.priceInfo.marketPrice ??
        product.priceInfo.originalPrice ?? product.priceInfo.refPrice ??
        product.priceInfo.cappedPrice);
      if (n !== null && n >= 0) return n;
    }
    return 0;
  };

  /**
   * 从多个可能字段中获取商品出价人数（报名/参拍人数），统一归一为整数
   * @param {Object} product - 商品对象
   * @returns {number}
   */
  JDSUtils.getProductBidCount = function getProductBidCount(product) {
    if (!product || typeof product !== 'object') return 0;
    const toNum = (v) => {
      if (typeof v === 'number' && isFinite(v)) return Math.round(v);
      if (typeof v === 'string') {
        const n = parseInt(v.replace(/[^\d]/g, ''), 10);
        return isFinite(n) ? n : null;
      }
      return null;
    };
    // 出价人数：京东拍拍接口对应 recordCount(出价记录数)；其余为兼容多态兜底
    const flat = [
      product.recordCount,
      product.bidCount, product.bidNum, product.bidderCount, product.bidUserCount,
      product.offerCount, product.applyNum, product.applyCount,
      product.joinCount, product.personCount, product.signUpCount
    ];
    for (const f of flat) {
      const n = toNum(f);
      if (n !== null && n >= 0) return n;
    }
    return 0;
  };

  /**
   * 从多个可能字段中获取商品详情链接，并做协议白名单校验
   * 无显式链接时按京东拍卖惯例回退为 https://paimai.jd.com/{id}.html
   * @param {Object} product - 商品对象
   * @returns {string|null}
   */
  JDSUtils.getProductUrl = function getProductUrl(product) {
    if (!product || typeof product !== 'object') return null;
    const candidates = [
      product.url, product.link, product.detailUrl, product.href,
      product.productUrl, product.itemUrl, product.jumpUrl
    ];
    const safe = (v) => typeof v === 'string' && /^(https?:|\/\/|\/)/i.test(v.trim()) ? v.trim() : null;
    for (const c of candidates) {
      const u = safe(c);
      if (u) return u;
    }
    const id = this.getProductId(product);
    if (id) return `https://1paipai.jd.com/auction-detail/${encodeURIComponent(String(id))}`;
    return null;
  };
})(window);
