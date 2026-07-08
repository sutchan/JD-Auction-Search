# JD Auction Search Enhanced

> A browser extension that adds product keyword search and category filtering for JD Auction pages (`1paipai.jd.com/auction-list/`).

## Features

| Feature | Description |
|---------|-------------|
| **Keyword Search** | Real-time filtering of auction items by product name/ID |
| **Tab Categories** | Switch between All / Ongoing / Upcoming statuses |
| **API Interception Cache** | Automatically intercept JD Auction API responses and cache complete product list |
| **DOM Extraction** | Automatically extract product data from page DOM when API is unavailable |
| **Shadow DOM Isolation** | UI components rendered with Shadow DOM for complete style isolation |
| **One-click Toggle** | Enable/disable the extension anytime from the top toolbar |
| **Internationalization** | Multi-language support (11 languages: Chinese, English, Spanish, Arabic, French, Portuguese, German, Japanese, Korean, Russian, Traditional Chinese) |
| **Accessibility** | ARIA labels, keyboard navigation, semantic HTML |
| **Animation Optimization** | Supports prefers-reduced-motion for reduced animations |

## Design System

This project establishes a complete design token system for UI consistency:

### Color System (Based on JD Brand Red)

| Variable | Value | Usage |
|----------|-------|--------|
| `--jds-primary` | #e1251b | Primary color |
| `--jds-primary-hover` | #c91b14 | Hover state |
| `--jds-bg-primary` | #ffffff | Main background |
| `--jds-text-primary` | #1a1a1a | Main text |

### Component Library

- **Button**: Primary/Secondary/Outline/Size variants
- **SearchBar**: Rounded search box + clear button
- **Tabs**: Pill-shaped tab switcher
- **Toast**: Success/Error/Info notifications
- **EmptyState**: Empty state animation

See [prototype/index.html](prototype/index.html) for the high-fidelity interactive prototype.

## Project Structure

```
JD-Auction-Search/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Background script (state management)
├── metadata.json          # Project metadata
├── CHANGELOG.md           # Change log
├── openspec/              # Specification documents
│   ├── spec.md            # Specification
│   ├── check_list.md      # Check list
│   └── tasks.md           # Tasks list
├── prototype/             # Design prototype directory
│   ├── index.html         # High-fidelity interactive prototype
│   └── design-tokens.css  # Design token system
├── src/
│   ├── utils.js           # Utility functions
│   ├── api.js             # API management
│   ├── ui.js              # UI rendering
│   ├── dom.js             # DOM handling
│   ├── content.js         # Main content script
│   └── styles.css         # Search UI styles (design tokens)
├── _locales/              # Internationalization files
│   ├── en/messages.json
│   ├── zh_CN/messages.json
│   ├── zh_TW/messages.json
│   ├── es/messages.json
│   ├── ar/messages.json
│   ├── fr/messages.json
│   ├── pt_BR/messages.json
│   ├── de/messages.json
│   ├── ja/messages.json
│   ├── ko/messages.json
│   └── ru/messages.json
├── package.json           # Project configuration (build scripts)
├── build.js               # Build script
└── icons/                 # Extension icons directory (optional)
```

## Installation

### 1. Add Icons (Optional)

The extension requires 3 PNG icon files, placed in the `icons/` directory:

| File | Size | Usage |
|------|------|-------|
| `icon16.png` | 16×16px | Address bar icon |
| `icon48.png` | 48×48px | Extension management page |
| `icon128.png` | 128×128px | Chrome Web Store |

Can be generated using [Favicon Generator](https://favicon.io/) or any icon tool.

### 2. Load Extension

**Chrome / Edge (Chromium):**

1. Open `chrome://extensions/`
2. Enable **Developer mode** in the top right
3. Click **Load unpacked extension**
4. Select the `JD-Auction-Search` folder

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load temporary Add-on**
3. Select `manifest.json` file

### 3. Use the Extension

1. Visit [JD Auction](https://1paipai.jd.com/auction-list/)
2. A red search bar will automatically appear at the top of the page
3. Enter keywords, click "Search" or press Enter
4. Support tab switching for category filtering

## Build and Package

Use the following commands to package the extension:

```bash
npm install
npm run build
```

This will generate a `jd-auction-search-v1.2.2.zip` file in the project root directory, ready for release.

## Core Implementation

### 1. API Interception

```javascript
window.fetch = async function(...args) {
  const res = await origFetch.apply(this, args);
  // Clone response, parse JSON, cache product data
  const clone = res.clone();
  clone.json().then(data => { /* Cache */ });
  return res;
};
```

### 2. Shadow DOM Isolation

```javascript
const wrapper = document.createElement('div');
document.body.appendChild(wrapper);
this.shadowRoot = wrapper.attachShadow({ mode: 'closed' });
// UI components rendered in shadowRoot, completely isolated from page styles
```

### 3. DOM Change Observer

```javascript
const observer = new MutationObserver((mutations) => {
  // Listen for page DOM changes, auto-update display
});
observer.observe(container, { childList: true, subtree: true });
```

## Data Structure

Product object field mappings (supports multiple naming conventions):

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
|-------|----------|
| Extension not responsive on page load | Refresh page or wait 2 seconds for auto-load |
| API request failed | Extension automatically falls back to DOM extraction mode |
| Cross-domain CORS interception | `host_permissions` configured, normally no action needed |

## Security Features

- **Message Validation**: All chrome.runtime.onMessage verifies sender origin
- **URL Whitelist**: Only allows access to jd.com domains
- **HTTPS Enforcement**: All API requests use HTTPS
- **Parameter Filtering**: API parameters filtered by whitelist
- **Input Validation**: Product data validation prevents abnormal input

## Tech Stack

- **Manifest V3** - Modern browser extension standard
- **Shadow DOM** - Style isolation to avoid conflicts
- **MutationObserver** - Efficient DOM change monitoring
- **Fetch/XHR Interception** - Non-intrusive data acquisition
- **CSS Design Tokens** - Design token system

## License

MIT License