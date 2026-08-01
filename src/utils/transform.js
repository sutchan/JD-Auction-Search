// JD-Auction-Search/src/utils/transform.js v1.5.0
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
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val) && val.length && this._isProductLike(val[0])) {
        // 取元素最多的匹配数组（商品列表通常远大于面包屑/分类等）
        if (!best || val.length > best.length) best = val;
      } else if (val && typeof val === 'object') {
        const r = this._findProductsArray(val, depth - 1);
        if (r && (!best || r.length > best.length)) best = r;
      }
    }
    return best;
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
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  };
})(window);
