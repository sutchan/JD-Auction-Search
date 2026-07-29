// JD-Auction-Search/background.js v1.3.3
// 后台脚本：扩展安装/更新时的轻量生命周期钩子
// 说明：内容脚本与页面直接交互，无需后台中转消息，故不保留消息代理逻辑。

chrome.runtime.onInstalled.addListener(() => {
  // 生命周期钩子：预留扩展首次安装/更新时的初始化逻辑（当前无副作用，仅保留挂载点）
});
