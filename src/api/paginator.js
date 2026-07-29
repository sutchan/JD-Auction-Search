// JD-Auction-Search/src/api/paginator.js v1.3.3
// 分页重放：基于页面真实请求模板逐页重放，聚合全部分页商品（多页面搜索的数据基础）

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  /**
   * 分页加载全部商品（多页面搜索）
   * 优先用页面真实请求做分页重放；无模板时返回 null 交由调用方降级
   * @param {Object} params - 预留查询参数（当前重放模式未使用）
   * @param {number} maxPages - 最大翻页次数（防护）
   * @returns {Promise<Array|null>}
   */
  JDSApi.loadAllProducts = async function loadAllProducts(params = {}, maxPages = 30) {
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
  };

  /**
   * 将相对 URL 解析为绝对 URL
   * @private
   */
  JDSApi._absUrl = function _absUrl(url) {
    try {
      return new URL(url, location.href).toString();
    } catch (e) {
      return url;
    }
  };

  /**
   * 在 URL 与 body 中寻找分页参数名
   * @private
   */
  JDSApi._findPageParam = function _findPageParam(absUrl, tpl) {
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
  };

  /**
   * 构建第 page 页的重放请求（替换分页参数）
   * @private
   */
  JDSApi._buildPageRequest = function _buildPageRequest(absUrl, tpl, pageParam, page) {
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
  };
})(window);
