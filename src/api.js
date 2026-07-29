// JD-Auction-Search/src/api.js v1.2.14
// API管理模块

(function(global) {
  'use strict';

  const API_BASE_URL = 'https://1paipai.jd.com';
  const API_LIST_ENDPOINT = '/auction/list';

  const JDSApi = {
    _requestTemplate: null,   // 页面真实列表请求模板: { url, method, body, headers, _score }
    _firstPageProducts: null, // 拦截到的首页商品，作为无法分页时的兜底

    /**
     * 初始化API拦截器
     * @param {Object} state - 应用状态
     * @param {Function} handleResponse - 处理API响应的回调
     */
    interceptApi(state, handleResponse) {
      this._interceptFetch(state, handleResponse);
      this._interceptXHR(state, handleResponse);
    },

    /**
     * 记录页面真实发出的拍卖列表请求，作为后续分页重放的模板（避免硬编码端点猜测失败）
     * 按“像不像列表接口”打分，保留分数最高者
     * @private
     */
    _captureRequestTemplate(url, options) {
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
    },

    /**
     * 给请求 URL 打分，越像“列表接口”分数越高，用于挑出最佳模板
     * @private
     */
    _listScore(url) {
      const u = url.toLowerCase();
      let s = 0;
      if (u.includes('auction-list')) s += 10;
      if (u.includes('auctionlist')) s += 8;
      if (/\/list(\?|$)/.test(u)) s += 6;
      if (u.includes('auction') && u.includes('list')) s += 6;
      if (u.includes('auction')) s += 3;
      if (u.includes('paimai') || u.includes('paipai')) s += 2;
      return s;
    },

    /**
     * 缓存拦截到的首页商品，作为无法分页时的兜底
     * 仅采信“像列表接口”的响应，避免把推荐等其它接口误当首页数据
     * @private
     */
    _captureFirstPage(url, data) {
      if (!data || !url || this._listScore(url) < 6) return;
      if (this._firstPageProducts && this._firstPageProducts.length) return;
      const products = global.JDSUtils.extractProductsFromResponse(data);
      if (products.length) this._firstPageProducts = products;
    },

    /**
     * 拦截fetch请求
     * @private
     */
    _interceptFetch(state, handleResponse) {
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
    },

    /**
     * 拦截XMLHttpRequest请求
     * @private
     */
    _interceptXHR(state, handleResponse) {
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
    },

    /**
     * 判断URL是否是拍卖相关API（放宽主机与路径，尽量捕获页面真实列表接口）
     * @private
     */
    _isAuctionUrl(url) {
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
    },

    /**
     * 加载商品列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>}
     */
    async loadProductList(params = {}) {
      const searchParams = new URLSearchParams({
        page: 1,
        pageSize: 50,
        tab: 'all',
        ...params
      });

      const url = `${API_BASE_URL}${API_LIST_ENDPOINT}?${searchParams.toString()}`;

      const resp = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Referer': 'https://1paipai.jd.com/auction-list/',
        }
      });

      if (!resp.ok) {
        throw new Error(`API请求失败: ${resp.status}`);
      }

      return resp.json();
    },

    /**
     * 分页加载全部商品（多页面搜索）
     * 优先用页面真实请求做分页重放；无模板时返回 null 交由调用方降级
     * @param {Object} params - 预留查询参数（当前重放模式未使用）
     * @param {number} maxPages - 最大翻页次数（防护）
     * @returns {Promise<Array|null>}
     */
    async loadAllProducts(params = {}, maxPages = 30) {
      const tpl = this._requestTemplate;
      if (!tpl) return null;

      const absUrl = this._absUrl(tpl.url);
      const pageParam = this._findPageParam(absUrl, tpl);
      // 无法识别分页参数：只能返回已捕获的首页数据
      if (!pageParam) {
        return this._firstPageProducts ? [...this._firstPageProducts] : [];
      }

      const all = [];
      const seen = new Set();
      for (let page = 1; page <= maxPages; page++) {
        const req = this._buildPageRequest(absUrl, tpl, pageParam, page);
        let data;
        try {
          const resp = await fetch(req.url, req.options);
          if (!resp.ok) {
            if (page === 1) throw new Error(`API请求失败: ${resp.status}`);
            break; // 后续页失败视为已到末页
          }
          data = await resp.json();
        } catch (e) {
          if (page === 1) throw e;
          break;
        }
        const items = global.JDSUtils.extractProductsFromResponse(data);
        if (!items.length) break;
        let added = 0;
        for (const it of items) {
          const id = global.JDSUtils.getProductId(it);
          if (id && seen.has(id)) continue;
          if (id) seen.add(id);
          all.push(it);
          added++;
        }
        // 整页都是重复项，或不足一页，视为已到末页
        if (added === 0 || items.length < 50) break;
      }
      return all;
    },

    /**
     * 将相对 URL 解析为绝对 URL
     * @private
     */
    _absUrl(url) {
      try {
        return new URL(url, location.href).toString();
      } catch (e) {
        return url;
      }
    },

    /**
     * 在 URL 与 body 中寻找分页参数名
     * @private
     */
    _findPageParam(absUrl, tpl) {
      try {
        const u = new URL(absUrl);
        for (const key of u.searchParams.keys()) {
          if (/^page$|pageno|pagenum|pageindex/i.test(key)) {
            return { where: 'url', key };
          }
        }
      } catch (e) {}

      let bodyObj = null;
      let isJson = false;
      if (tpl.body) {
        if (typeof tpl.body === 'object') {
          bodyObj = tpl.body;
        } else if (typeof tpl.body === 'string') {
          try {
            bodyObj = JSON.parse(tpl.body);
            isJson = true;
          } catch (e) {
            const m = tpl.body.match(/([?&]?)(\w*page\w*)=([^&]*)/i);
            if (m) return { where: 'body', key: m[2], raw: tpl.body };
          }
        }
      }
      if (bodyObj) {
        for (const key of Object.keys(bodyObj)) {
          if (/^page$|pageno|pagenum|pageindex/i.test(key)) {
            return { where: 'body', key, obj: bodyObj, isJson };
          }
        }
      }
      return null;
    },

    /**
     * 构建第 page 页的重放请求（替换分页参数）
     * @private
     */
    _buildPageRequest(absUrl, tpl, pageParam, page) {
      let url = absUrl;
      let body = tpl.body;
      const headers = {};
      if (tpl.headers) {
        if (typeof tpl.headers.forEach === 'function') {
          tpl.headers.forEach((v, k) => { headers[k] = v; });
        } else if (typeof tpl.headers === 'object') {
          Object.assign(headers, tpl.headers);
        }
      }
      const options = {
        method: tpl.method || 'GET',
        credentials: 'include',
        headers
      };

      if (pageParam.where === 'url') {
        try {
          const u = new URL(url);
          u.searchParams.set(pageParam.key, String(page));
          url = u.toString();
        } catch (e) {}
      } else {
        if (pageParam.obj) {
          const obj = { ...pageParam.obj, [pageParam.key]: page };
          body = pageParam.isJson ? JSON.stringify(obj) : obj;
        } else if (pageParam.raw) {
          let raw = pageParam.raw.replace(
            new RegExp(`(^|&|\\?)${pageParam.key}=[^&]*`),
            `$1${pageParam.key}=${page}`
          );
          if (!new RegExp(`${pageParam.key}=`).test(raw)) {
            raw += (raw.includes('?') ? '&' : '?') + `${pageParam.key}=${page}`;
          }
          body = raw;
        }
        options.body = body;
      }
      return { url, options };
    }
  };

  global.JDSApi = JDSApi;
})(window);
