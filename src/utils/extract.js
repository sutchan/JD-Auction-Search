// JD-Auction-Search/src/utils/extract.js v1.5.0
// 商品字段提取：从多态 API 对象中兼容取 id/name/状态/主图/价格/链接

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  /**
   * 轻量日志：仅在扩展开发/调试态(JSDEBUG)输出，生产环境静默，避免噪音
   * @param {string} msg
   * @param {...*} args
   */
  JDSUtils.log = function log(msg, ...args) {
    if (global.JDS_DEBUG || /[?&]jdsDebug=1/.test((global.location && global.location.search) || '')) {
      // eslint-disable-next-line no-console
      console.log('[JD-Auction-Search] ' + msg, ...args);
    }
  };

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
    // 单位归一：京东部分接口 price 字段以「分」为单位（如 128800 表示 1288.00 元），
    // 若数值过大（>100000 且无小数）疑似分，则 ÷100 还原为元，避免显示成十几万。
    const normalize = (v) => {
      const n = toNum(v);
      if (n === null || n <= 0) return n;
      return (Number.isInteger(n) && n > 100000) ? n / 100 : n;
    };
    const flat = [
      product.price, product.currentPrice, product.startPrice,
      product.auctionPrice, product.realPrice, product.salePrice,
      product.nowPrice, product.finalPrice, product.minPrice
    ];
    for (const f of flat) {
      const n = normalize(f);
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
    // 最后兜底：常规价格字段全缺失时，谨慎回退封顶/参考价(cappedPrice/maxPrice)，
    // 避免出现「¥0」空价卡片；调用方(products.js)会据 currentPrice 是否存在区分
    // 「起拍」与「封顶」语义，此处仅保证有值可显示。
    const fallback = toNum(product.cappedPrice) ?? toNum(product.maxPrice);
    if (fallback !== null && fallback >= 0) return fallback;
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
   * 从价格/金额文本解析为数值（单位：元），统一处理千分位、多小数点与分单位
   * 兼容 "¥1,288.00" / "1,288.00" / "128800"(分) / "1288.00" 等形态；
   * 去除所有非数字/小数点字符后，按最右小数点拆分整数与小数，再归一疑似「分」的大整数。
   * @param {string|number} raw - 原始价格文本或数值
   * @returns {number} 解析后的元单位数值，无法解析返回 0
   */
  JDSUtils.parsePrice = function parsePrice(raw) {
    if (typeof raw === 'number') {
      if (!isFinite(raw) || raw <= 0) return 0;
      return (Number.isInteger(raw) && raw > 100000) ? raw / 100 : raw;
    }
    if (typeof raw !== 'string') return 0;
    // 去掉千分位逗号与所有非数字/小数点字符
    const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
    if (!cleaned) return 0;
    // 多小数点（如 "1.288.00"）仅保留最后一个作为小数分隔符
    const dotIdx = cleaned.lastIndexOf('.');
    let intPart = dotIdx < 0 ? cleaned : cleaned.slice(0, dotIdx);
    let decPart = dotIdx < 0 ? '' : cleaned.slice(dotIdx + 1);
    if (decPart.includes('.')) decPart = decPart.replace(/\./g, '');
    intPart = intPart.replace(/\D/g, '');
    if (!intPart) return 0;
    const n = Number(decPart ? `${intPart}.${decPart}` : intPart);
    if (!isFinite(n) || n <= 0) return 0;
    // 疑似分单位：无小数且 >100000 的整数视为「分」→ 还原为元
    return (decPart === '' && Number.isInteger(n) && n > 100000) ? n / 100 : n;
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
    if (id) {
      // 回退详情链接基于当前站点 host 拼接，避免硬编码 1paipai 在 paipai/paimai 等子域下 404
      const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : 'https://1paipai.jd.com';
      return `${origin}/auction-detail/${encodeURIComponent(String(id))}`;
    }
    return null;
  };
})(window);
