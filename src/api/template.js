// JD-Auction-Search/src/api/template.js v1.5.5
// 列表请求模板管理：URL 打分选优、模板捕获/锁定、首页数据缓存与拍卖 URL 判定
// 网络拦截见 ./interceptor.js，分页重放见 ./paginator.js

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  // 判定为「列表接口」的最低分数：低于该分数的响应不做商品提取，
  // 避免路径恰含 auction 的非列表接口（订单/促销等）被误当商品响应解析
  JDSApi.LIST_SCORE_MIN = 6;

  /**
   * 给请求 URL 打分，越像"列表接口"分数越高，用于挑出最佳模板
   * 对已知拍拍列表 functionId 加权，降低被其它拍卖相关接口误替的风险
   * @private
   * @param {string} url - 请求 URL
   * @returns {number} 分数，0 表示完全不像列表接口
   */
  JDSApi._listScore = function _listScore(url) {
    if (!url || typeof url !== 'string') return 0;
    const u = url.toLowerCase();
    let s = 0;
    if (/functionid=paipai\.auction\.list/i.test(u)) s += 20;
    if (u.includes('auction-list')) s += 10;
    if (u.includes('auctionlist')) s += 8;
    if (/\/list(\?|$)/.test(u)) s += 6;
    if (u.includes('auction') && u.includes('list')) s += 6;
    if (u.includes('auction')) s += 3;
    if (u.includes('paimai') || u.includes('paipai')) s += 2;
    return s;
  };

  /**
   * 判断该 URL 的响应是否应作为商品列表数据处理
   * @private
   * @param {string} url - 请求 URL
   * @returns {boolean}
   */
  JDSApi._isListResponse = function _isListResponse(url) {
    return this._listScore(url) >= this.LIST_SCORE_MIN;
  };

  /**
   * 记录页面真实发出的拍卖列表请求，作为后续分页重放的模板（避免硬编码端点猜测失败）
   * 按"像不像列表接口"打分，保留分数最高者
   * @private
   * @param {string} url - 请求 URL
   * @param {Object} [options] - 请求配置（method/body/headers）
   */
  JDSApi._captureRequestTemplate = function _captureRequestTemplate(url, options) {
    if (!url || typeof url !== 'string') return;
    const score = this._listScore(url);
    if (score === 0) return;
    // 模板锁定：首次成功拿到非空商品列表的模板后不再替换，避免后续其它接口（如相关推荐）
    // 打分更高而覆盖掉正确的列表模板，导致分页重放拿到错误数据
    if (this._requestTemplateLocked) return;
    if (this._requestTemplate && score <= this._requestTemplate._score) return;
    this._requestTemplate = {
      url,
      method: (options && options.method) || 'GET',
      body: options ? options.body : null,
      headers: (options && options.headers) || null,
      _score: score
    };
  };

  /**
   * 锁定当前列表模板（在 loadAllProducts 首次成功聚合后调用）
   * @private
   */
  JDSApi._lockRequestTemplate = function _lockRequestTemplate() {
    this._requestTemplateLocked = true;
  };

  /**
   * 缓存拦截到的首页商品，作为无法分页时的兜底
   * 仅采信"像列表接口"的响应，避免把推荐等其它接口误当首页数据
   * @private
   * @param {string} url - 请求 URL
   * @param {Object} data - 响应数据
   */
  JDSApi._captureFirstPage = function _captureFirstPage(url, data) {
    if (!data || !this._isListResponse(url)) return;
    if (this._firstPageProducts && this._firstPageProducts.length) return;
    const products = global.JDSUtils.extractProductsFromResponse(data);
    if (products.length) this._firstPageProducts = products;
  };

  /**
   * 判断URL是否是拍卖相关API（放宽主机与路径，尽量捕获页面真实列表接口）
   * 主机白名单限定京东域，防止拦截/解析第三方站点响应
   * @private
   * @param {string} url - 请求 URL
   * @returns {boolean}
   */
  JDSApi._isAuctionUrl = function _isAuctionUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    const hostOk = lower.includes('1paipai.jd.com') ||
                   lower.includes('paipai.jd.com') ||
                   lower.includes('paimai.jd.com') ||
                   lower.includes('api.m.jd.com') ||
                   lower.includes('m.jd.com');
    const pathOk = lower.includes('auction') ||
                   lower.includes('paimai') ||
                   lower.includes('paipai');
    return hostOk && pathOk;
  };
})(window);
