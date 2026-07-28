// JD-Auction-Search/src/api.js v1.2.6
// API管理模块

(function(global) {
  'use strict';

  const API_BASE_URL = 'https://1paipai.jd.com';
  const API_LIST_ENDPOINT = '/auction/list';

  const JDSApi = {
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
     * 拦截fetch请求
     * @private
     */
    _interceptFetch(state, handleResponse) {
      const origFetch = window.fetch;

      window.fetch = async function(...args) {
        const [url, options] = args;
        const urlStr = typeof url === 'string' ? url : (url.url || String(url));

        const res = await origFetch.apply(this, args);

        if (JDSApi._isAuctionUrl(urlStr)) {
          const clone = res.clone();
          clone.json()
            .then(data => handleResponse(data, urlStr))
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

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._jdsUrl = url;
        return origXHROpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function() {
          try {
            const data = JSON.parse(this.responseText);
            if (JDSApi._isAuctionUrl(this._jdsUrl)) {
              handleResponse(data, this._jdsUrl);
            }
          } catch (e) {
            // 忽略解析错误
          }
        });
        return origXHRSend.apply(this, args);
      };
    },

    /**
     * 判断URL是否是拍卖相关API
     * @private
     * @param {string} url - URL字符串
     * @returns {boolean}
     */
    _isAuctionUrl(url) {
      if (!url) return false;
      return (url.includes('1paipai.jd.com') || url.includes('paimai.jd.com')) &&
             (url.includes('list') || url.includes('auction'));
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
     * 分页加载全部商品（多页面搜索）— 顺序翻页直到末页或达到上限
     * @param {Object} params - 额外查询参数
     * @param {number} maxPages - 最大翻页次数（防护）
     * @returns {Promise<Array>}
     */
    async loadAllProducts(params = {}, maxPages = 30) {
      const all = [];
      const seen = new Set();
      for (let page = 1; page <= maxPages; page++) {
        const searchParams = new URLSearchParams({
          page,
          pageSize: 50,
          tab: 'all',
          ...params
        });
        const url = `${API_BASE_URL}${API_LIST_ENDPOINT}?${searchParams.toString()}`;
        const resp = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Referer': 'https://1paipai.jd.com/auction-list/'
          }
        });
        if (!resp.ok) throw new Error(`API请求失败: ${resp.status}`);
        const data = await resp.json();
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
    }
  };

  global.JDSApi = JDSApi;
})(window);
