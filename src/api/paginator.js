// JD-Auction-Search/src/api/paginator.js v1.6.3
// 分页重放编排：基于候选请求模板逐页重放，聚合全部分页商品（多页面搜索的数据基础）
// 辅助函数（URL 绝对化/分页参数识别/单页请求构建）见 ./paginator-rules.js

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  /**
   * 分页加载全部商品（多页面搜索）— 支持分片续搜
   * 优先用页面真实请求做分页重放；无模板时遍历候选模板回退，取聚合最多者；
   * 仍无则交由调用方降级（DOM 提取）
   * @param {Object} [opts] - 选项
   * @param {Function} [opts.onPage] - 每聚合完一页的进度回调 ({page, added, total, items})，
   *   用于「边搜边显」：后台每翻完一页就把新命中增量刷新到结果面板
   * @param {boolean} [opts.deep] - 是否开启排序维度深搜（默认 true），翻到底后尝试其它排序值聚合更多不同商品
   * @param {number} [opts.fromPage] - 起始页（分片续搜用，默认 1）；从该页开始向后翻 maxPages 页
   * @param {number} [maxPages] - 单片最大翻页次数（默认 30）
   * @returns {Promise<{items:Array|null, finished:boolean, page:number}>} finished=true 表示已到达末页（或接口失败）；
   *   调用方据此判断是否需继续下一片深搜
   */
  JDSApi.loadAllProducts = async function loadAllProducts(opts = {}, maxPages = 30) {
    const onPage = typeof opts === 'function' ? opts : (opts && opts.onPage);
    const deep = !(opts && opts.deep === false);
    const fromPage = (opts && opts.fromPage) || 1;

    // 候选模板顺序：最优模板优先，其次拦截过程中缓存的候选（按分数降序）。
    // 最优模板无法分页重放（无分页参数/接口异常）时回退尝试候选，提升全量召回，
    // 避免「只有当前页」导致后续页大量符合关键字的商品搜不到。
    const candidates = [];
    if (this._requestTemplate) candidates.push(this._requestTemplate);
    if (this._candidateTemplates && this._candidateTemplates.length) {
      for (const t of this._candidateTemplates) {
        if (t !== this._requestTemplate) candidates.push(t);
      }
    }
    if (!candidates.length) return { items: null, finished: true, page: fromPage };

    let bestAll = [];
    let bestTpl = null;
    const seen = new Set();
    for (const tpl of candidates) {
      let result;
      try {
        // 每个候选模板内部做「单维度翻页 + 排序维度深搜」，结果去重合并到 bestAll
        result = await this._replayTemplateDeep(tpl, maxPages, onPage, seen, deep, fromPage);
      } catch (e) {
        // 该候选模板分页失败：记录并继续尝试下一个候选，不中断整体聚合
        global.JDSUtils.log('候选模板分页重放失败: ' + tpl.url, e);
        continue;
      }
      if (result && result.items && result.items.length > bestAll.length) {
        bestAll = result.items;
        bestTpl = tpl;
        if (result.finished) return { items: bestAll, finished: true, page: fromPage };
      }
      // 最优模板成功聚合到数据即锁定，无需继续尝试更低分候选
      if (tpl === this._requestTemplate && result && result.items && result.items.length > 0) {
        bestTpl = tpl;
        break;
      }
    }

    // 锁定最终采用的最优模板，避免后续其它接口覆盖
    if (bestTpl && !this._requestTemplateLocked) {
      this._requestTemplate = bestTpl;
      this._lockRequestTemplate();
    }
    // 是否已到末页：本次未翻满 maxPages（触顶即未到末页），则由调用方决定是否续搜
    return { items: bestAll.length ? bestAll : null, finished: false, page: fromPage + maxPages - 1 };
  };

  /**
   * 基于单个请求模板做分页重放，聚合全部商品
   * @private
   * @param {Object} tpl - 请求模板
   * @param {number} maxPages - 单片最大翻页次数
   * @param {Function} [onPage] - 每聚合完一页的进度回调 ({page, added, total, items})
   * @param {Set} [seen] - 外部去重集合（深搜共享，避免跨维度重复累加）
   * @param {number} [fromPage] - 起始页（分片续搜，默认 1）
   * @returns {Promise<{items:Array|null, finished:boolean}>} 无法分页时 items 为 null（交由调用方回退）
   */
  JDSApi._replayTemplate = async function _replayTemplate(tpl, maxPages, onPage, seen, fromPage) {
    const absUrl = this._absUrl(tpl.url);
    const pageParam = this._findPageParam(absUrl, tpl);
    // 无法识别分页参数：退化为已捕获的首页数据（无首页则无法分页，返回 null）
    if (!pageParam) {
      return this._firstPageProducts
        ? { items: [...this._firstPageProducts], finished: true }
        : { items: null, finished: true };
    }

    const all = [];
    const localSeen = seen || new Set();
    const start = fromPage || 1;
    // 分页重放须使用「未被拦截器包裹」的原始 fetch：否则分页请求会被自身拦截器二次捕获
    // （覆盖模板/误把分页响应当首页缓存），且拦截器 clone 响应可能拖慢/报错。
    const rawFetch = this._origFetch || window.fetch;
    let pageSize = 0; // 以首页实际条数作为页大小基准，避免硬编码阈值误判末页
    let total = 0;
    let finished = false;
    for (let page = start; page < start + maxPages; page++) {
      const req = this._buildPageRequest(absUrl, tpl, pageParam, page);
      let data;
      try {
        const resp = await rawFetch(req.url, req.options);
        if (!resp.ok) {
          if (page === start) throw new Error(`API请求失败: ${resp.status}`);
          finished = true; // 后续页失败视为已到末页
          break;
        }
        data = await resp.json();
      } catch (e) {
        if (page === start) throw e;
        finished = true;
        break;
      }
      const items = global.JDSUtils.extractProductsFromResponse(data);
      if (!items.length) { finished = true; break; }
      // 首页条数作为页大小基准；后续页以此为据判定是否到达末页
      if (page === start) pageSize = items.length;
      let added = 0;
      for (const it of items) {
        const id = global.JDSUtils.getProductId(it);
        if (id && localSeen.has(id)) continue;
        if (id) localSeen.add(id);
        all.push(it);
        added++;
      }
      total += added;
      // 每聚合完一页即回调，供调用方「边搜边显」（当前结果持续显示、数量持续增长）
      if (onPage) {
        try { onPage({ page, added, total, items: all.slice(all.length - added) }); } catch (e) { /* 回调异常不影响聚合 */ }
      }
      // 整页都是重复项：真实末页（服务端忽略分页参数也会在此终止）
      if (added === 0) { finished = true; break; }
      // 仅当“非首页”且“条数少于首页页大小”时判定为末页，避免每页不足 50 条时漏翻
      if (page > start && pageSize > 0 && items.length < pageSize) { finished = true; break; }
    }
    return { items: all, finished };
  };
})(window);
