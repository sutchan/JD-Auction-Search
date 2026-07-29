// JD-Auction-Search/src/utils/transform.js v1.3.1
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

    const possibleKeys = ['data', 'result', 'list', 'products', 'items', 'auctions', 'goodsList'];

    for (const key of possibleKeys) {
      if (data[key] && Array.isArray(data[key])) {
        return data[key];
      }
    }

    return [];
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
