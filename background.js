// JD-Auction-Search/background.js v1.2.5
// 后台脚本：管理扩展状态和跨标签通信

const state = {
  isEnabled: true,
  cache: new Map(),
  lastUpdate: null
};

function isValidMessage(request, sender) {
  if (!sender || !sender.tab || !sender.tab.url) {
    return false;
  }
  const url = new URL(sender.tab.url);
  return url.hostname.endsWith('jd.com');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isValidMessage(request, sender)) {
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return true;
  }

  if (typeof request !== 'object' || request === null) {
    sendResponse({ success: false, error: 'Invalid request format' });
    return true;
  }

  const { type } = request;

  switch (type) {
    case 'GET_STATE':
      sendResponse({ success: true, data: { isEnabled: state.isEnabled } });
      break;
    case 'UPDATE_CACHE':
      if (typeof request.key !== 'string' || !request.key) {
        sendResponse({ success: false, error: 'Invalid cache key' });
        break;
      }
      state.cache.set(request.key, request.data);
      state.lastUpdate = Date.now();
      sendResponse({ success: true });
      break;
    case 'GET_CACHE':
      if (typeof request.key !== 'string' || !request.key) {
        sendResponse({ success: false, error: 'Invalid cache key' });
        break;
      }
      const cached = state.cache.get(request.key);
      sendResponse({ success: true, data: cached || null });
      break;
    case 'TOGGLE_ENABLED':
      if (typeof request.enabled !== 'boolean') {
        sendResponse({ success: false, error: 'Invalid enabled value' });
        break;
      }
      state.isEnabled = request.enabled;
      sendResponse({ success: true, data: { isEnabled: state.isEnabled } });
      break;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JD-Auction-Search] 插件已安装 v1.2.5');
});