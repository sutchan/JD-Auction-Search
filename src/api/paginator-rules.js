// JD-Auction-Search/src/api/paginator-rules.js v1.6.3
// 分页重放规则：URL 绝对化、分页参数识别、单页请求构建
// 主编排见 ./paginator.js（loadAllProducts / _replayTemplate）

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

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
        if (/^(page|pageno|pagenum|pageindex|pagenumber|currentpage|curpage)$/i.test(key)) {
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
          const m = tpl.body.match(/([?&]?)(page|pageno|pagenum|pageindex|pagenumber|currentpage|curpage)=([^&]*)/i);
          if (m) return { where: 'body', key: m[2], raw: tpl.body };
        }
      }
    }
    if (bodyObj) {
      for (const key of Object.keys(bodyObj)) {
        if (/^(page|pageno|pagenum|pageindex|pagenumber|currentpage|curpage)$/i.test(key)) {
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
    // 京东拍拍列表接口常校验 Referer，缺失会返回 403/空导致翻页失败；
    // 模板 headers 未含 Referer 时，用当前页面地址兜底（同源重放必带）
    if (!('Referer' in headers) && typeof location !== 'undefined') {
      headers.Referer = location.href;
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
