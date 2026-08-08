// JD-Auction-Search/src/api/index.js v1.6.4
// API 模块命名空间引导：聚合 interceptor（拦截器）与 paginator（分页重放）

(function(global) {
  'use strict';

  // 各子模块通过 `global.JDSApi = global.JDSApi || {}` 自挂载，
  // 此处初始化共享状态字段。
  const JDSApi = global.JDSApi = global.JDSApi || {};
  JDSApi._requestTemplate = null;   // 页面真实列表请求模板: { url, method, body, headers, _score }
  JDSApi._firstPageProducts = null; // 拦截到的首页商品，作为无法分页时的兜底
  JDSApi.MAX_SORT_AXES = 6;         // 排序维度深搜最多尝试的排序值个数（控制请求量）
})(window);
