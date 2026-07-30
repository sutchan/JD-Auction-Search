# JD Auction Search Enhancer

A browser extension that adds keyword search to the JD auction list page
([1paipai.jd.com/auction-list](https://1paipai.jd.com/auction-list/)). Type a
keyword to **aggregate across pages and filter in real time** — no manual paging.

## Features

| Feature | Description |
|---------|-------------|
| Keyword search | Filter auctions by product name or ID, updated live |
| Cross-page aggregation | Automatically merges items from every page |
| Auto fallback | Falls back to on-page extraction when the API is unavailable |
| Multi-language | Simplified / Traditional Chinese |

## Installation

### 1. Prepare icons (optional)
Place 3 PNG icons in `icons/`: `icon16.png`, `icon48.png`, `icon128.png`.
Missing icons do not block loading.

### 2. Load into the browser
- **Chrome / Edge**: open `chrome://extensions/` → enable "Developer mode" →
  click "Load unpacked" → select this project folder.
- **Firefox**: open `about:debugging#/runtime/this-firefox` → click
  "Load Temporary Add-on" → select `manifest.json`.

## Usage

1. Open the JD auction list page; a red search bar appears at the top automatically.
2. Type a keyword (e.g. "phone", "Huawei"); results refresh **in real time**.
3. Results overlay the page as a result panel, already aggregated across all pages.
4. Click any product card to open its detail page in a **new tab**.
5. Click the **×** button on the right of the search box to **clear** and restore the original list.
6. When nothing matches, the panel shows an "未找到匹配商品" (No matching products) empty state.

> Tip: the native list hides automatically while searching and restores on clear;
> no page reload is needed.

## Build & Release

```bash
npm install
npm run build
```

This produces `jd-auction-search-v1.4.0.zip` in the project root, ready to publish.

Optional build flags:
- `node build.js --tw`: localized output named `jd-auction-search-v1.4.0-zh-TW.zip` (zh-TW)
- `node build.js --firefox`: apply Firefox string escaping to `messages.json`
  (`'` → `\'`, `\` → `\\`)
- `node build.js --no-preview`: skip the build artifact preview

## FAQ

| Situation | Action |
|-----------|--------|
| Extension does nothing after page load | Refresh, or wait ~2s for auto-load |
| No results / API failure | Extension auto-degrades to on-page extraction |
| CORS interception | `host_permissions` is configured; usually no action needed |

## License

MIT License
