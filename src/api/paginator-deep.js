// JD-Auction-Search/src/api/paginator-deep.js v1.6.11
// 深度分页重放：排序维度识别/应用与「单维度翻页 + 排序维度深搜」编排
// 基础分页重放见 ./paginator.js（loadAllProducts / _replayTemplate）

(function(global) {
  'use strict';

  const JDSApi = global.JDSApi = global.JDSApi || {};

  /**
   * 基于单个请求模板做「单维度翻页 + 排序维度深搜」，聚合全部商品
   * @private
   * @param {Object} tpl - 请求模板
   * @param {number} maxPages - 单维度最大翻页次数
   * @param {Function} [onPage] - 每页进度回调
   * @param {Set} seen - 跨维度去重集合（深搜各排序维度共享，避免重复累加）
   * @param {boolean} deep - 是否开启排序维度深搜
   * @param {number} [fromPage] - 起始页（分片续搜，默认 1）
   * @returns {Promise<{items:Array|null, finished:boolean}>} items 为聚合到的商品数组；无法分页时为 null
   */
  JDSApi._replayTemplateDeep = async function _replayTemplateDeep(tpl, maxPages, onPage, seen, deep, fromPage) {
    const all = [];
    let finished = true;
    // 排序维度：若模板含常见排序参数，则在翻完默认维度后，逐一尝试其它排序值，
    // 聚合「不同排序下暴露的不同商品」，进一步加深搜索深度（如价格升序才会展示的尾页商品）
    const sortAxes = deep ? this._collectSortAxes(tpl) : [null];
    for (const axis of sortAxes) {
      const tplForAxis = axis ? this._applySortAxis(tpl, axis) : tpl;
      const pageResult = await this._replayTemplate(tplForAxis, maxPages, onPage, seen, fromPage);
      if (!pageResult) continue;
      // 注意：_replayTemplate 内部已用共享 seen 去重并 add，返回的 items 即为本维度「无重复的新增项」，
      // 此处直接累加即可，不能再用 seen 二次判断，否则本维度全部被误判为重复而丢空。
      if (pageResult.items && pageResult.items.length) {
        for (const it of pageResult.items) all.push(it);
      }
      // 任一排序维度触顶（未到末页）说明默认维度可能还有更多页，finished 取「所有维度均到末页」才为 true
      if (!pageResult.finished) finished = false;
    }
    return { items: all.length ? all : null, finished };
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
          // decodeURIComponent 对含非法 % 编码的参数值会抛 URIError，需保护以免中断整个排序轴收集
          let cur = m[1];
          try { cur = decodeURIComponent(cur); } catch (e) { /* 非法编码视为字面值 */ }
          for (const v of ['0', '1', '2', '3', '4', '5', 'desc', 'asc', 'price', 'new', 'hot', 'default']) {
            if (v !== cur) axes.push({ key, value: v });
          }
          return;
        }
      }
    };
    tryIn(tpl.url);
    if (tpl.body && typeof tpl.body === 'string') tryIn(tpl.body);
    // 无排序参数时返回 [null]（仅跑默认维度），避免 _replayTemplateDeep 空遍历丢失默认维度
    if (!axes.length) return [null];
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
})(window);
