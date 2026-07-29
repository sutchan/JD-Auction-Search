// JD-Auction-Search/src/api/interceptor.js v1.3.0
// API 拦截器：捕获页面真实列表请求作模板，并按"像不像列表接口"打分选优

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  /**
   * 初始化API拦截器
   * @param {Object} state - 应用状态
   * @param {Function} handleResponse - 处理API响应的回调
   */
  JDSApi.interceptApi = function interceptApi(state, handleResponse) {
    this._interceptFetch(state, handleResponse);
    this._interceptXHR(state, handleResponse);
  };

  /**
   * 记录页面真实发出的拍卖列表请求，作为后续分页重放的模板（避免硬编码端点猜测失败）
   * 按“像不像列表接口”打分，保留分数最高者
   * @private
   */
  JDSApi._captureRequestTemplate = function _captureRequestTemplate(url, options) {
    if (!url || typeof url !== 'string') return;
    const score = this._listScore(url);
    if (score === 0) return;
    const tpl = {
      url,
      method: (options && options.method) || 'GET',
      body: options ? options.body : null,
      headers: (options && options.headers) || null,
      _score: score
    };
    if (!this._requestTemplate || score > this._requestTemplate._score) {
      this._requestTemplate = tpl;
    }
  };

  /**
   * 给请求 URL 打分，越像“列表接口”分数越高，用于挑出最佳模板
   * @private
   */
  JDSApi._listScore = function _listScore(url) {
    const u = url.toLowerCase();
    let s = 0;
    if (u.includes('auction-list')) s += 10;
    if (u.includes('auctionlist')) s += 8;
    if (/\/list(\?|$)/.test(u)) s += 6;
    if (u.includes('auction') && u.includes('list')) s += 6;
    if (u.includes('auction')) s += 3;
    if (u.includes('paimai') || u.includes('paipai')) s += 2;
    return s;
  };

  /**
   * 缓存拦截到的首页商品，作为无法分页时的兜底
   * 仅采信“像列表接口”的响应，避免把推荐等其它接口误当首页数据
   * @private
   */
  JDSApi._captureFirstPage = function _captureFirstPage(url, data) {
    if (!data || !url || this._listScore(url) < 6) return;
    if (this._firstPageProducts && this._firstPageProducts.length) return;
    const products = global.JDSUtils.extractProductsFromResponse(data);
    if (products.length) this._firstPageProducts = products;
  };

  /**
   * 拦截fetch请求
   * @private
   */
  JDSApi._interceptFetch = function _interceptFetch(state, handleResponse) {
    const origFetch = window.fetch;
    const self = this;

    window.fetch = async function(...args) {
      const [url, options] = args;
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));

      const res = await origFetch.apply(this, args);

      if (self._isAuctionUrl(urlStr)) {
        self._captureRequestTemplate(urlStr, options);
        const clone = res.clone();
        clone.json()
          .then(data => {
            self._captureFirstPage(urlStr, data);
            handleResponse(data, urlStr);
          })
          .catch(() => {});
      }

      return res;
    };
  };

  /**
   * 拦截XMLHttpRequest请求
   * @private
   */
  JDSApi._interceptXHR = function _interceptXHR(state, handleResponse) {
    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;
    const origXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    const self = this;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._jdsMethod = method;
      this._jdsUrl = url;
      this._jdsHeaders = {};
      return origXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      this._jdsHeaders = this._jdsHeaders || {};
      this._jdsHeaders[name] = value;
      return origXHRSetHeader.apply(this, [name, value]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      const body = args.length ? args[0] : null;
      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);
          if (self._isAuctionUrl(self._jdsUrl)) {
            self._captureRequestTemplate(self._jdsUrl, {
              method: self._jdsMethod,
              body,
              headers: self._jdsHeaders
            });
            self._captureFirstPage(self._jdsUrl, data);
            handleResponse(data, self._jdsUrl);
          }
        } catch (e) {
          // 忽略解析错误
        }
      });
      return origXHRSend.apply(this, args);
    };
  };

  /**
   * 判断URL是否是拍卖相关API（放宽主机与路径，尽量捕获页面真实列表接口）
   * @private
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
