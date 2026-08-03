// JD-Auction-Search/src/dom/index.js v1.5.3
// DOM 模块命名空间引导：聚合 observer（观察器）/ extract（提取）/ filter（过滤）

(function(global) {
  'use strict';

  // 各子模块通过 `global.JDSDom = global.JDSDom || {}` 自挂载，
  // 此处初始化共享状态字段。
  const JDSDom = global.JDSDom = global.JDSDom || {};
  JDSDom.observer = null;
})(window);
