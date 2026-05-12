// JD-Auction-Search/background.js v1.2.0
// 后台脚本：管理扩展状态和跨标签通信

const state = {
  isEnabled: true,
  cache: new Map(),
  lastUpdate: null
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'GET_STATE':
      sendResponse({ success: true, data: state });
      break;
    case 'UPDATE_CACHE':
      state.cache.set(request.key, request.data);
      state.lastUpdate = Date.now();
      sendResponse({ success: true });
      break;
    case 'GET_CACHE':
      const cached = state.cache.get(request.key);
      sendResponse({ success: true, data: cached || null });
      break;
    case 'TOGGLE_ENABLED':
      state.isEnabled = request.enabled;
      sendResponse({ success: true, data: { isEnabled: state.isEnabled } });
      break;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JD-Auction-Search] 插件已安装 v1.2.0');
});
