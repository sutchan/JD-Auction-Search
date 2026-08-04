// JD-Auction-Search/src/api/paginator.js v1.5.5
// 分页重放编排：基于候选请求模板逐页重放，聚合全部分页商品（多页面搜索的数据基础）
// 辅助函数（URL 绝对化/分页参数识别/单页请求构建）见 ./paginator-rules.js

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  /**
   * 分页加载全部商品（多页面搜索）
   * 优先用页面真实请求做分页重放；无模板时遍历候选模板回退，取聚合最多者；
   * 仍无则交由调用方降级（DOM 提取）
   * @param {Object} [opts] - 选项
   * @param {Function} [opts.onPage] - 每聚合完一页的进度回调 ({page, added, total, tpl})，
   *   用于「边搜边显」：后台每翻完一页就把新命中增量刷新到结果面板
   * @param {boolean} [opts.deep] - 是否开启排序维度深搜（默认 true），翻到底后尝试其它排序值聚合更多不同商品
   * @param {number} [maxPages] - 单个维度最大翻页次数（防护）
   * @returns {Promise<Array|null>}
   */
  JDSApi.loadAllProducts = async function loadAllProducts(opts = {}, maxPages = 30) {
    // maxPages=30：单维度分页重放最大翻页次数上限，防止接口无末页标记时无限循环请求
    const onPage = typeof opts === 'function' ? opts : (opts && opts.onPage);
    const deep = !(opts && opts.deep === false);

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
    if (!candidates.length) return null;

    let bestAll = [];
    let bestTpl = null;
    const seen = new Set();
    for (const tpl of candidates) {
      let result;
      try {
        // 每个候选模板内部做「单维度翻页 + 排序维度深搜」，结果去重合并到 bestAll
        result = await this._replayTemplateDeep(tpl, maxPages, onPage, seen, deep);
      } catch (e) {
        // 该候选模板分页失败：记录并继续尝试下一个候选，不中断整体聚合
        global.JDSUtils.log('候选模板分页重放失败: ' + tpl.url, e);
        continue;
      }
      if (result && result.length > bestAll.length) {
        bestAll = result;
        bestTpl = tpl;
      }
      // 最优模板成功聚合到数据即锁定，无需继续尝试更低分候选
      if (tpl === this._requestTemplate && result && result.length > 0) {
        bestTpl = tpl;
        break;
      }
    }

    // 锁定最终采用的最优模板，避免后续其它接口覆盖
    if (bestTpl && !this._requestTemplateLocked) {
      this._requestTemplate = bestTpl;
      this._lockRequestTemplate();
    }
    return bestAll.length ? bestAll : null;
  };

  /**
   * 基于单个请求模板做「单维度翻页 + 排序维度深搜」，聚合全部商品
   * @private
   * @param {Object} tpl - 请求模板
   * @param {number} maxPages - 单维度最大翻页次数
   * @param {Function} [onPage] - 每页进度回调
   * @param {Set} seen - 跨维度去重集合（深搜各排序维度共享，避免重复累加）
   * @param {boolean} deep - 是否开启排序维度深搜
   * @returns {Promise<Array|null>} 聚合到的商品数组；无法分页时返回 null（交由调用方回退）
   */
  JDSApi._replayTemplateDeep = async function _replayTemplateDeep(tpl, maxPages, onPage, seen, deep) {
    const all = [];
    // 排序维度：若模板含常见排序参数，则在翻完默认维度后，逐一尝试其它排序值，
    // 聚合「不同排序下暴露的不同商品」，进一步加深搜索深度（如价格升序才会展示的尾页商品）
    const sortAxes = deep ? this._collectSortAxes(tpl) : [null];
    for (const axis of sortAxes) {
      const tplForAxis = axis ? this._applySortAxis(tpl, axis) : tpl;
      const pageItems = await this._replayTemplate(tplForAxis, maxPages, onPage, seen);
      if (pageItems && pageItems.length) {
        for (const it of pageItems) {
          const id = global.JDSUtils.getProductId(it);
          if (id && seen.has(id)) continue;
          if (id) seen.add(id);
          all.push(it);
        }
      }
    }
    return all.length ? all : null;
  };

  /**
   * 识别模板 URL/body 中的排序参数，返回一组「候选排序维度」
   * 每个维度为 { key, value }，深搜时替换该排序参数值后重放，聚合不同排序下的商品
   * @private
   * @param {Object} tpl - 请求模板
   * @returns {Array<{key:string,value:string}>}
   */
  JDSApi._collectSortAxes = function _collectSortAxes(tpl) {
    const axes = [];
    const keys = ['sort', 'sortType', 'sortBy', 'orderBy', 'order', 'rank', 'sortField'];
    const tryIn = (str) => {
      if (!str || typeof str !== 'string') return;
      for (const key of keys) {
        const m = str.match(new RegExp('[?&]' + key + '=([^&]*)', 'i'));
        if (m) {
          // 已知该排序参数存在，则枚举若干常见排序值（升/降/热度/最新/价格），
          // 过滤掉与当前值相同者，避免重复重放
          const cur = decodeURIComponent(m[1]);
          for (const v of ['0', '1', '2', '3', '4', '5', 'desc', 'asc', 'price', 'new', 'hot', 'default']) {
            if (v !== cur) axes.push({ key, value: v });
          }
          return;
        }
      }
    };
    tryIn(tpl.url);
    if (tpl.body && typeof tpl.body === 'string') tryIn(tpl.body);
    return axes.slice(0, this.MAX_SORT_AXES || 6);
  };

  /**
   * 将排序维度应用到模板（替换对应排序参数值），生成新维度重放请求
   * @private
   * @param {Object} tpl - 原请求模板
   * @param {{key:string,value:string}} axis - 排序维度
   * @returns {Object} 新模板（不修改原模板）
   */
  JDSApi._applySortAxis = function _applySortAxis(tpl, axis) {
    const next = { ...tpl };
    const re = new RegExp('([?&])' + axis.key + '=[^&]*', 'i');
    if (re.test(tpl.url)) {
      next.url = tpl.url.replace(re, '$1' + axis.key + '=' + axis.value);
    }
    if (tpl.body && typeof tpl.body === 'string' && re.test(tpl.body)) {
      next.body = tpl.body.replace(re, '$1' + axis.key + '=' + axis.value);
    }
    return next;
  };

  /**
   * 基于单个请求模板做分页重放，聚合全部商品
   * @private
   * @param {Object} tpl - 请求模板
   * @param {number} maxPages - 最大翻页次数
   * @param {Function} [onPage] - 每聚合完一页的进度回调 ({page, added, total})
   * @param {Set} [seen] - 外部去重集合（深搜共享，避免跨维度重复累加）
   * @returns {Promise<Array|null>} 聚合到的商品数组；无法分页时返回 null（交由调用方回退）
   */
  JDSApi._replayTemplate = async function _replayTemplate(tpl, maxPages, onPage, seen) {
    const absUrl = this._absUrl(tpl.url);
    const pageParam = this._findPageParam(absUrl, tpl);
    // 无法识别分页参数：退化为已捕获的首页数据（无首页则无法分页，返回 null）
    if (!pageParam) {
      return this._firstPageProducts ? [...this._firstPageProducts] : null;
    }

    const all = [];
    const localSeen = seen || new Set();
    let pageSize = 0; // 以首页实际条数作为页大小基准，避免硬编码阈值误判末页
    let total = 0;
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
      // 首页条数作为页大小基准；后续页以此为据判定是否到达末页
      if (page === 1) pageSize = items.length;
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
      if (added === 0) break;
      // 仅当“非首页”且“条数少于首页页大小”时判定为末页，避免每页不足 50 条时漏翻
      if (page > 1 && pageSize > 0 && items.length < pageSize) break;
    }
    return all;
  };
})(window);
