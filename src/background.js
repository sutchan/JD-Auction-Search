// JD-Auction-Search/src/background.js v1.5.5
// MV3 后台服务（service worker）：扩展生命周期管理与消息中枢
// 本扩展以 content script 直接驱动页面增强（挂载搜索 UI、拦截拍拍列表接口），
// 后台脚本保持轻量：负责安装/激活事件与 content script 的消息中转。

(function () {
  'use strict';

  // 扩展安装/更新时触发
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install' || details.reason === 'update') {
        // 预留：后续如需跨标签缓存/全局状态可在此初始化
      }
    });
  }

  // 激活后立即接管（MV3 service worker 短暂存活，确保常驻事件监听注册）
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onActivate) {
    chrome.runtime.onActivate.addListener(() => {});
  }

  // 消息中枢：content script 与其它上下文（如 popup）的通信中转
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 当前扩展无跨上下文高频通信需求，原缓存类消息处理已移除；
      // 保留中转骨架以便后续扩展（如同步全局配置）。
      return false;
    });
  }
})();
