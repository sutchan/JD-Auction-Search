// JD-Auction-Search/src/utils/extract.js v1.6.6
// 商品基础字段提取：从多态 API 对象中兼容取 id / name / 主图 / 详情链接
// 价格与出价人数相关提取见 ./price.js

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  /**
   * 轻量日志：仅在扩展开发/调试态(JDS_DEBUG 或 ?jdsDebug=1)输出，生产环境静默，避免噪音
   * @param {string} msg - 日志消息
   * @param {...*} args - 附加参数
   */
  JDSUtils.log = function log(msg, ...args) {
    if (global.JDS_DEBUG || /[?&]jdsDebug=1/.test((global.location && global.location.search) || '')) {
      // eslint-disable-next-line no-console
      console.log('[JD-Auction-Search] ' + msg, ...args);
    }
  };

  // 京东拍拍/夺宝岛 auction.list 接口商品图主域（primaryPic 为 "jfs/..." 相对路径，需拼此前缀）
  // 用 s400x400_ 提升清晰度，避免原 220px 小图被 cover 放大裁切导致主体显示不完整
  const JD_IMG_CDN = 'https://m.360buyimg.com/n1/s400x400_';

  // 安全 URL 白名单：仅 http/https/协议相对/绝对路径，阻断 javascript:/data: 等危险 scheme
  const SAFE_URL_RE = /^(https?:|\/\/|\/)/i;

  /**
   * 校验字符串是否为安全 URL
   * @private
   * @param {*} v - 待校验值
   * @returns {boolean}
   */
  function isSafeUrl(v) {
    return typeof v === 'string' && SAFE_URL_RE.test(v.trim());
  }

  /**
   * 从多个可能的字段中获取商品ID
   * @param {Object} product - 商品对象
   * @returns {string|number|null} 商品ID
   */
  JDSUtils.getProductId = function getProductId(product) {
    return product.id || product.skuId || product.productId || product.auctionId || null;
  };

  /**
   * 从多个可能的字段中获取商品名称
   * @param {Object} product - 商品对象
   * @returns {string} 商品名称
   */
  JDSUtils.getProductName = function getProductName(product) {
    return product.name || product.title || product.productName || '';
  };

  /**
   * 从多个可能字段中获取商品主图 URL
   * 兼容京东拍卖常见字段；仅允许安全 scheme，防止注入 javascript:/data: 等
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
    // "jfs/..." 为京东图片相对路径，需拼 CDN 前缀
    const toCdn = (v) => (typeof v === 'string' && /^jfs\//i.test(v.trim()))
      ? JD_IMG_CDN + v.trim() : null;
    for (const c of candidates) {
      if (isSafeUrl(c)) return c.trim();
      if (Array.isArray(c) && c.length && isSafeUrl(c[0])) return c[0].trim();
      const cdn = toCdn(c);
      if (cdn) return cdn;
    }
    if (product.image && typeof product.image === 'object' && isSafeUrl(product.image.url)) {
      return product.image.url.trim();
    }
    return null;
  };

  /**
   * 从多个可能字段中获取商品详情链接，并做协议白名单校验
   * 无显式链接时按京东拍卖惯例回退为 {origin}/auction-detail/{id}
   * @param {Object} product - 商品对象
   * @returns {string|null}
   */
  JDSUtils.getProductUrl = function getProductUrl(product) {
    if (!product || typeof product !== 'object') return null;
    const candidates = [
      product.url, product.link, product.detailUrl, product.href,
      product.productUrl, product.itemUrl, product.jumpUrl
    ];
    for (const c of candidates) {
      if (isSafeUrl(c)) return c.trim();
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
