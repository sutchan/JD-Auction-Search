// JD-Auction-Search/src/ui/index.js v.
// UI 模块命名空间引导：聚合 styles（内联样式）/ toolbar（工具栏）/ results（结果面板）

(function(global) {
  'use strict';

  // 子模块（styles/toolbar/results）通过 `global.JDSUI = global.JDSUI || {}` 自挂载，
  // 此处初始化共享状态字段。getMessage 在各子模块内直接取自 JDSUtils（utils 已先加载）。
  const JDSUI = global.JDSUI = global.JDSUI || {};
  JDSUI.shadowRoot = null;
  JDSUI.emptyElement = null;
  JDSUI.gridElement = null;
  JDSUI.resultsRoot = null;
  JDSUI.resultsHost = null;
  JDSUI._positionBound = false;
})(window);
