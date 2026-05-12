// src/background.js v1.1.1
// 后台脚本：管理扩展状态和跨标签通信

const state = {
  isEnabled: true,
  cache: new Map(),
  lastUpdate: null,
  MAX_CACHE_SIZE: 1000,
};

function pruneCache() {
  if (state.cache.size > state.MAX_CACHE_SIZE) {
    const entries = [...state.cache.entries()];
    state.cache = new Map(entries.slice(-Math.floor(state.MAX_CACHE_SIZE * 0.7)));
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'GET_STATE':
      sendResponse({ success: true, data: state });
      break;
    case 'UPDATE_CACHE':
      state.cache.set(request.key, request.data);
      state.lastUpdate = Date.now();
      pruneCache();
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
  console.log('[JD-Auction-Search] 插件已安装 v1.1.0');
});
