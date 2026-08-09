// JD-Auction-Search/src/api/interceptor.js v1.6.6
// API 拦截器：包裹 fetch / XHR 捕获页面真实列表请求与响应
// 模板打分与首页缓存见 ./template.js，分页重放见 ./paginator.js

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  /**
   * 初始化API拦截器
   * @param {Object} state - 应用状态
   * @param {Function} handleResponse - 处理API响应的回调
   */
  JDSApi.interceptApi = function interceptApi(state, handleResponse) {
    // 幂等：已注入过则不重复包裹 fetch/XHR，避免 SPA 重渲染导致拦截逻辑嵌套执行两次
    if (this._intercepted) return;
    this._intercepted = true;
    this._interceptFetch(state, handleResponse);
    this._interceptXHR(state, handleResponse);
  };

  /**
   * 还原原生 fetch / XHR，解除扩展注入（destroy 时调用，避免 content script 卸载/重渲染后
   * 仍残留被包裹的全局方法，造成重复捕获或与其他扩展冲突）
   */
  JDSApi.restoreApi = function restoreApi() {
    if (this._origFetch) window.fetch = this._origFetch;
    if (this._origXHROpen) XMLHttpRequest.prototype.open = this._origXHROpen;
    if (this._origXHRSend) XMLHttpRequest.prototype.send = this._origXHRSend;
    if (this._origXHRSetHeader) XMLHttpRequest.prototype.setRequestHeader = this._origXHRSetHeader;
    this._origFetch = this._origXHROpen = this._origXHRSend = this._origXHRSetHeader = null;
    this._intercepted = false;
  };

  /**
   * 拦截fetch请求
   * @private
   * @param {Object} state - 应用状态
   * @param {Function} handleResponse - 响应回调
   */
  JDSApi._interceptFetch = function _interceptFetch(state, handleResponse) {
    this._origFetch = window.fetch;
    const origFetch = this._origFetch;
    const self = this;

    window.fetch = async function(...args) {
      const [url, options] = args;
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));

      const res = await origFetch.apply(this, args);

      if (self._isAuctionUrl(urlStr)) {
        self._captureRequestTemplate(urlStr, options);
        // 仅对「像列表接口」的响应做商品提取，避免非列表接口被误当商品响应解析
        if (self._isListResponse(urlStr)) {
          // clone 后异步解析，绝不阻断原响应返回给页面
          res.clone().json()
            .then(data => {
              self._captureFirstPage(urlStr, data);
              handleResponse(data, urlStr);
            })
            .catch(err => {
              // 解析失败不应阻断响应返回；仅记录便于排查接口形态变化
              if (global.JDSUtils && global.JDSUtils.log) {
                global.JDSUtils.log('fetch json 解析失败: ' + urlStr, err);
              }
            });
        }
      }

      return res;
    };
  };

  /**
   * 拦截XMLHttpRequest请求
   * @private
   * @param {Object} state - 应用状态
   * @param {Function} handleResponse - 响应回调
   */
  JDSApi._interceptXHR = function _interceptXHR(state, handleResponse) {
    this._origXHROpen = XMLHttpRequest.prototype.open;
    this._origXHRSend = XMLHttpRequest.prototype.send;
    this._origXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    const origXHROpen = this._origXHROpen;
    const origXHRSend = this._origXHRSend;
    const origXHRSetHeader = this._origXHRSetHeader;
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
      // 先移除上次绑定的 load 监听，再绑定新的：同一 XHR 对象若被复用重复 send（重试场景），
      // 避免监听器累加导致 handleResponse 被重复触发（模板/首页被重复捕获、重复解析）。
      if (this._jdsLoadHandler) {
        this.removeEventListener('load', this._jdsLoadHandler);
      }
      const handler = function() {
        // 先做 URL 过滤再解析 JSON，避免对无关响应做无谓的 JSON.parse（性能）
        if (!self._isAuctionUrl(self._jdsUrl) || !self._isListResponse(self._jdsUrl)) return;
        try {
          const data = JSON.parse(this.responseText);
          self._captureRequestTemplate(self._jdsUrl, {
            method: self._jdsMethod,
            body,
            headers: self._jdsHeaders
          });
          self._captureFirstPage(self._jdsUrl, data);
          handleResponse(data, self._jdsUrl);
        } catch (e) {
          // 非 JSON 响应属正常情况，静默忽略
        }
      };
      this._jdsLoadHandler = handler;
      this.addEventListener('load', handler);
      return origXHRSend.apply(this, args);
    };
  };
})(window);
