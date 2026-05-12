# JD Auction Search Enhancement

> Browser extension for JD Paipai page (`1paipai.jd.com/auction-list/`) adding product keyword search and category filtering.

[**中文文档**](README_CN.md)

## Features

| Feature | Description |
|---------|-------------|
| **Keyword Search** | Filter auction products by name/ID in real-time |
| **Tab Categories** | Switch between All / Ongoing / Upcoming statuses |
| **API Interception & Cache** | Auto-intercept JD Paipai API responses and cache full product list |
| **DOM Extraction** | Fallback to extract product data from page DOM when API unavailable |
| **Shadow DOM Isolation** | UI components use Shadow DOM for complete style isolation |
| **Toggle On/Off** | Enable/disable extension anytime via top toolbar |

## Project Structure

```
JD-Auction-Search/
├── manifest.json        # Extension config (Manifest V3)
├── src/
│   ├── background.js    # Background script (state management)
│   ├── content.js       # Content script (core logic)
│   └── styles.css       # Search UI styles
└── icons/               # Extension icons (optional)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

### 1. Add Icons (Optional)

The extension needs 3 PNG icon files in the `icons/` directory:

| File | Size | Purpose |
|------|------|---------|
| `icon16.png` | 16×16px | Address bar icon |
| `icon48.png` | 48×48px | Extension management page |
| `icon128.png` | 128×128px | Chrome Web Store |

Use [Favicon Generator](https://favicon.io/) or any icon tool to create them.

### 2. Load Extension

**Chrome / Edge (Chromium):**

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `JD-Auction-Search` folder

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json`

### 3. Use Extension

1. Visit [JD Paipai](https://1paipai.jd.com/auction-list/)
2. Red search bar appears at top automatically
3. Enter keywords, click "Search" or press Enter
4. Switch tabs to filter by category

## Core Implementation

### 1. API Interception

```javascript
window.fetch = async function(...args) {
  const res = await origFetch.apply(this, args);
  const clone = res.clone();
  clone.json().then(data => { /* cache products */ });
  return res;
};
```

### 2. Shadow DOM Isolation

```javascript
const wrapper = document.createElement('div');
document.body.appendChild(wrapper);
this.shadowRoot = wrapper.attachShadow({ mode: 'closed' });
// UI components render in shadowRoot, fully isolated from page styles
```

### 3. DOM Mutation Observer

```javascript
const observer = new MutationObserver((mutations) => {
  // Monitor page DOM changes and auto-update display
});
observer.observe(container, { childList: true, subtree: true });
```

## Data Structure

Product field mapping:

| Field | Aliases |
|-------|---------|
| `id` | `skuId`, `productId`, `auctionId` |
| `name` | `title`, `productName` |
| `status` | `state`, `auctionStatus` |

Status values:
- `0` / `upcoming` → Upcoming
- `1` / `ongoing` → Ongoing

## Known Issues

| Issue | Solution |
|-------|---------|
| Extension not responding on page load | Refresh page or wait 2 seconds for auto-load |
| API request fails | Extension falls back to DOM extraction mode |

## Tech Stack

- **Manifest V3** - Modern browser extension standard
- **Shadow DOM** - Style isolation, avoid conflicts
- **MutationObserver** - Efficient DOM change monitoring
- **Fetch/XHR Interception** - Non-invasive data acquisition

## License

MIT License
