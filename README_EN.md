# JD Auction Search Enhancer

A browser extension that adds keyword search to JD Auction (夺宝) listing pages ([1paipai.jd.com/auction-list](https://1paipai.jd.com/auction-list/)). Type a keyword to **aggregate across pages and filter in real time** — no manual page flipping needed.

## Features

| Feature | Description |
|---------|-------------|
| Keyword search | Filter auction items by product name or ID, in real time |
| Cross-page aggregation | Automatically collects items from all pages; results cover every page |
| Automatic fallback | Falls back to extracting data from the page when the API is unavailable |
| Multilingual | Simplified / Traditional Chinese support |

## Installation

### 1. Prepare icons (optional)
Place 3 PNG icons in the `icons/` folder: `icon16.png`, `icon48.png`, `icon128.png`. Missing icons will not block loading.

### 2. Load into the browser
- **Chrome / Edge**: Open `chrome://extensions/` → enable **Developer mode** → click **Load unpacked** → select this project folder.
- **Firefox**: Open `about:debugging#/runtime/this-firefox` → click **Temporary Add-on** → select `manifest.json`.

## How to use

1. Open a JD Auction listing page; a red search bar appears automatically at the top.
2. Type a keyword (e.g. "手机" / "华为") in the search box — results refresh **in real time**.
3. Matching items (aggregated across pages) are shown in the results panel.
4. Click any product card to open its detail page in a **new tab**.
5. Click the **×** button on the right of the search box to **clear the search** and restore the original list.
6. If nothing matches, the panel shows a "未找到匹配商品" (no matching items) empty state.

> Tip: The original list is hidden while searching and restored when cleared — no page reload needed.

## Build & Package

```bash
npm install
npm run build
```

This will generate a `jd-auction-search-v1.3.5.zip` file in the project root directory, ready for release.

## FAQ

| Situation | Action |
|-----------|--------|
| Extension unresponsive after page load | Refresh the page, or wait ~2 seconds for auto-load |
| No results / API failure | Extension automatically falls back to page-data extraction |
| CORS blocking | `host_permissions` is configured; usually no action needed |

## License

MIT License
