# JD Auction Search Enhanced

> A browser extension that adds product keyword search for JD Auction pages (`1paipai.jd.com/auction-list/`).

## Features

| Feature | Description |
|---------|-------------|
| **Keyword Search** | Real-time filtering of auction items by product name/ID (cross-page aggregation) |
| **API Interception + Pagination Replay** | Automatically intercept the page's real list requests as templates and aggregate all paginated products; search/filter works across pages |
| **DOM Extraction Fallback** | Automatically extract product data (image/price/link) from page DOM when API is unavailable |
| **Shadow DOM Isolation** | UI components rendered with Shadow DOM for complete style isolation |
| **Internationalization** | Simplified / Traditional Chinese (zh_CN / zh_TW) |
| **Accessibility** | ARIA labels, keyboard navigation, semantic HTML |
| **Animation Optimization** | Supports prefers-reduced-motion for reduced animations |

## Design System

This project adopts the **shadcn design language** (light minimalist), using zinc neutral grays + JD red as the single chromatic accent, with a semantic token system for UI consistency.

### Semantic Tokens

| Token | Value | Usage |
|-------|-------|--------|
| `--background` | #ffffff | Main background |
| `--foreground` | #18181b (zinc-900) | Main text |
| `--primary` | #e1251b | JD red accent |
| `--primary-hover` | #c1170f | Accent hover |
| `--secondary` | #f4f4f5 (zinc-100) | Secondary background |
| `--muted` | #fafafa (zinc-50) | Muted background |
| `--muted-foreground` | #71717a (zinc-500) | Secondary text |
| `--border` | #e4e4e7 (zinc-200) | Border |
| `--success` | #16a34a | Success state |
| `--warning` | #d97706 | Warning state |
| `--destructive` | #dc2626 | Error state |

### Component Library (3-Layer Architecture)

**Atoms (6)**: Button, Input, Badge, Separator, Skeleton, Toast
**Molecules (4)**: SearchBar, Card, Alert, EmptyState
**Organisms (2)**: AuctionToolbar, ProductGrid

### Interaction Standards

- **Feedback**: Toast notifications (sonner-style, icon + auto-stack)
- **Loading**: Skeleton placeholders (shimmer animation, >300ms trigger)
- **Error**: Alert inline prompts + fallback strategy (API→DOM extraction)
- **Empty**: EmptyState (icon + title + description + suggestion)

See [prototype/index.html](prototype/index.html) for the high-fidelity interactive prototype (includes design system, component library, and interaction standards).

## Project Structure

```
JD-Auction-Search/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Background script (lifecycle hook)
├── metadata.json          # Project metadata
├── CHANGELOG.md           # Change log
├── openspec/              # Specification documents
│   ├── spec.md            # Specification
│   ├── check_list.md      # Check list
│   └── tasks.md           # Tasks list
├── prototype/             # Design prototype directory
│   └── index.html         # High-fidelity prototype (design system + components + patterns)
├── src/
│   ├── utils/             # Utility functions (i18n / field extraction / formatting / response transform / UI shared)
│   │   ├── index.js       # Namespace bootstrap
│   │   ├── i18n.js        # Internationalization getMessage (zh_CN / zh_TW fallback)
│   │   ├── extract.js     # Product field extraction (id/name/image/price/url)
│   │   ├── format.js      # escapeHtml / formatPrice
│   │   ├── transform.js   # Response extraction / deduplication
│   │   └── ui-shared.js   # Toast / style injection / Shadow query
│   ├── api/               # API interception and pagination replay
│   │   ├── index.js       # Namespace bootstrap + shared state
│   │   ├── interceptor.js # fetch/XHR interception, request template capture, list scoring
│   │   └── paginator.js   # Pagination replay aggregates all paged products
│   ├── ui/                # UI rendering (shadcn · Shadow DOM inline styles)
│   │   ├── index.js       # Namespace bootstrap + shared state
│   │   ├── styles.js      # Inline design tokens and component styles
│   │   ├── toolbar.js     # Toolbar mount and events
│   │   └── results.js     # Result panel / cloned cards / empty state
│   ├── dom/               # DOM observation and handling
│   │   ├── index.js       # Namespace bootstrap + shared state
│   │   ├── observer.js    # MutationObserver listener
│   │   ├── extract.js     # Extract products from DOM
│   │   └── filter.js      # Native list filtering and card location
│   ├── content.js         # Main content script (orchestration)
│   └── styles.css         # Toast global styles (outside Shadow DOM)
├── _locales/              # Internationalization files (Simplified / Traditional Chinese)
│   ├── zh_CN/messages.json
│   └── zh_TW/messages.json
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

## Build and Package

Use the following commands to package the extension:

```bash
npm install
npm run build
```

This will generate a `jd-auction-search-v1.3.1.zip` file in the project root directory, ready for release.

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

- **Least Privilege**: Only declares `host_permissions` (jd.com); no unrelated permissions such as storage / activeTab
- **URL Whitelist**: Only allows access to jd.com domains; protocol whitelist validation for product image/link
- **HTTPS Enforcement**: All API requests use HTTPS
- **Parameter Filtering**: Pagination replay only replaces whitelisted pagination parameters
- **Input Validation**: Product field extraction and HTML escaping prevent XSS / invalid scheme injection

## Tech Stack

- **Manifest V3** - Modern browser extension standard
- **Shadow DOM** - Style isolation to avoid conflicts
- **MutationObserver** - Efficient DOM change monitoring
- **Fetch/XHR Interception** - Non-intrusive data acquisition
- **CSS Design Tokens** - Design token system

## License

MIT License