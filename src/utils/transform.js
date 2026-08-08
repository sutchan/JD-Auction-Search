// JD-Auction-Search/src/utils/transform.js v1.6.4
// 响应转换：从多态 API 响应中提取商品数组并去重

(function(global) {
  'use strict';

  const JDSUtils = global.JDSUtils = global.JDSUtils || {};

  /**
   * 从API响应中提取商品列表
   * @param {Object} data - API响应数据
   * @returns {Array} - 商品数组
   */
  JDSUtils.extractProductsFromResponse = function extractProductsFromResponse(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data !== 'object') return [];

    // 先尝试已知顶层键（保持原行为，零成本）
    const possibleKeys = ['data', 'result', 'list', 'products', 'items', 'auctions', 'goodsList'];
    for (const key of possibleKeys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    // 兜底：有界递归查找首个“商品对象数组”，兼容 {data:{list}} / {result:{list}} / {data:{data:{goodsList}}} 等嵌套结构
    const found = this._findProductsArray(data, 4);
    return found || [];
  };

  /**
   * 有界递归查找最大的“商品对象数组”
   * 取元素最多者，避免 breadcrumbs/categories 等含 name 的数组排在商品列表前时误匹配；
   * 仅接受元素为含名称/id 字段的对象的数组，避免误匹配字符串/数字数组
   * @private
   * @param {Object} node - 当前遍历节点
   * @param {number} depth - 剩余递归深度（防止超大响应栈溢出）
   * @returns {Array|null}
   */
  JDSUtils._findProductsArray = function _findProductsArray(node, depth) {
    if (depth <= 0 || !node || typeof node !== 'object') return null;
    let best = null;
    let bestScore = -1;
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val) && val.length && this._isProductLike(val[0])) {
        // 评分：电商字段越丰富（含价格/出价/图片）越像商品列表，优先于仅含 name 的推荐/分类数组；
        // 元素数量作为次要权重（商品列表通常远大于面包屑/分类）
        const score = this._productsArrayScore(val);
        if (score > bestScore) { best = val; bestScore = score; }
      } else if (val && typeof val === 'object') {
        const r = this._findProductsArray(val, depth - 1);
        if (r && r !== best) {
          const score = this._productsArrayScore(r);
          if (score > bestScore) { best = r; bestScore = score; }
        }
      }
    }
    return best;
  };

  /**
   * 给候选商品数组打分：电商字段越全、命中比例越高分数越高（区分商品列表与推荐/分类数组）
   * @private
   */
  JDSUtils._productsArrayScore = function _productsArrayScore(arr) {
    const sample = arr.slice(0, 10);
    let score = 0;
    const commerceKeys = ['price', 'currentPrice', 'startPrice', 'image', 'imageUrl',
      'imgUrl', 'picUrl', 'url', 'link', 'bidCount', 'recordCount', 'bidNum'];
    let hit = 0;
    for (const item of sample) {
      if (!item || typeof item !== 'object') continue;
      let itemScore = 0;
      if (item.id || item.skuId || item.productId || item.auctionId) itemScore += 3;
      if (item.name || item.title || item.productName) itemScore += 1;
      for (const k of commerceKeys) {
        if (item[k] !== undefined && item[k] !== null && item[k] !== '') { itemScore += 2; break; }
      }
      if (itemScore > 0) hit++;
    }
    const ratio = sample.length ? hit / sample.length : 0;
    // 命中比例为主（0~1 → 0~100），元素数量为次（对数，避免推荐数组偶发偏多误选）
    score = Math.round(ratio * 100) + Math.log10(arr.length + 1) * 2;
    return score;
  };

  /**
   * 判断是否为“商品对象”
   * 优先要求含 id 类字段；否则要求同时含名称与电商字段（价格/主图/链接），
   * 以区分面包屑（仅 name）、分类（仅 name）等非商品对象
   * @private
   * @param {*} item
   * @returns {boolean}
   */
  JDSUtils._isProductLike = function _isProductLike(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const hasId = item.id || item.skuId || item.productId || item.auctionId;
    if (hasId) return true;
    const hasName = item.name || item.title || item.productName;
    const hasCommerce = item.price || item.image || item.imageUrl ||
      item.imgUrl || item.picUrl || item.url || item.link;
    return !!(hasName && hasCommerce);
  };

  /**
   * 去重商品列表
   * @param {Array} products - 商品数组
   * @returns {Array} - 去重后的数组
   */
  JDSUtils.deduplicateProducts = function deduplicateProducts(products) {
    const seen = new Set();
    return products.filter(product => {
      const id = this.getProductId(product);
      // 有 id 用 id 去重（精确）；无 id 的商品（接口部分对象不带 id 字段）不能用「无 id 即丢弃」，
      // 否则会被整条静默丢失 → 搜索结果不全。改用内容指纹（名称+价格+主图）兜底去重，
      // 既避免重复渲染，又不误杀真实无 id 商品。
      const key = id != null
        ? 'id:' + id
        : 'fp:' + [
            this.getProductName(product) || '',
            this.getProductPrice(product) || '',
            this.getProductImage(product) || ''
          ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
})(window);
