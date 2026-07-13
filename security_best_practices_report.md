# JD Auction Search Chrome Extension - Security Best Practices Report

## Executive Summary

本次安全审查针对 JD Auction Search Chrome 扩展（v1.2.2）进行了全面的安全分析。该项目是一个基于 Manifest V3 的 Chrome 扩展，使用原生 JavaScript 和 Shadow DOM 技术。审查发现了几个需要关注的安全问题：主要风险是 DOM XSS 漏洞（innerHTML 渲染未经过滤的商品数据），次要风险包括缺少 CSP 配置和 CSRF 防护不足。项目整体安全态势良好，未发现严重的代码执行漏洞或敏感数据泄露风险。

---

## Critical Findings

### [CRIT-001] DOM XSS - 商品名称未过滤直接插入 DOM

**位置**: `src/ui.js` (第554-563行)

**证据**:
```javascript
const name = p.name || p.title || '';
// ...
card.innerHTML = `
  <div class="jds-product-img"><span>${p.icon || '📦'}</span></div>
  <div class="jds-product-body">
    <div class="jds-product-name">${name}</div>
    <!-- ... -->
  </div>`;
```

**影响**: 商品名称来自 API 响应或 DOM 提取，如果攻击者能够控制商品名称（例如通过存储型 XSS 注入到京东服务器），该名称将被直接插入到 innerHTML 中，导致 DOM XSS 攻击，可能执行恶意脚本。

**修复**: 将 `innerHTML` 替换为 `textContent` 来设置商品名称：
```javascript
const card = document.createElement('div');
card.className = 'jds-product-card';
card.style.animationDelay = `${i * 0.03}s`;
card.innerHTML = `
  <div class="jds-product-img"><span>${p.icon || '📦'}</span></div>
  <div class="jds-product-body">
    <div class="jds-product-name"></div>
    <div class="jds-product-price"><small>¥ </small>${Number(price).toLocaleString()}</div>
    <div class="jds-product-meta">
      <span class="jds-badge jds-badge-${isOngoing ? 'primary' : 'warning'} ${isOngoing ? 'jds-badge-ongoing' : ''}">${statusLabel}</span>
      ${countdown ? `<span class="jds-countdown">${countdown}</span>` : ''}
    </div>
  </div>`;
card.querySelector('.jds-product-name').textContent = name;
```

---

## High Findings

### [HIGH-001] DOM XSS - Toast 消息未过滤插入

**位置**: `src/utils.js` (第199行)

**证据**:
```javascript
const message = translationKeys.includes(key) ? getMessage(key) : key;
// ...
toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
```

**影响**: 如果 `showToast` 函数接收用户可控的 `key` 参数且该参数不在翻译键列表中，消息将被直接插入到 innerHTML 中，可能导致 DOM XSS。

**修复**: 将消息部分改为使用 `textContent`：
```javascript
const toast = document.createElement('div');
toast.className = `jds-toast jds-toast-${type}`;
toast.innerHTML = `${icons[type] || icons.info}<span></span>`;
toast.querySelector('span').textContent = message;
```

---

### [HIGH-002] 缺少 Content Security Policy (CSP) 配置

**位置**: `manifest.json`

**证据**: 扩展未配置任何 CSP 指令。

**影响**: 缺少 CSP 意味着浏览器不会对脚本执行进行限制，如果发生 XSS 漏洞，攻击代码将可以无限制地执行。

**修复**: 在 `manifest.json` 中添加 CSP 配置：
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline';",
    "sandbox": "sandbox allow-scripts allow-forms; script-src 'self'; object-src 'none';"
  }
}
```

---

## Medium Findings

### [MED-001] CSRF 风险 - API 请求携带凭证

**位置**: `src/api.js` (第100-106行)

**证据**:
```javascript
const resp = await fetch(url, {
  credentials: 'include',
  headers: {
    'Accept': 'application/json',
    'Referer': 'https://1paipai.jd.com/auction-list/',
  }
});
```

**影响**: 使用 `credentials: 'include'` 会在跨域请求时发送用户的 cookies 和 HTTP 认证信息。虽然扩展只在京东域名下运行，但如果攻击者能够诱导用户访问恶意页面并触发扩展的 API 请求，可能导致 CSRF 攻击。

**修复**: 将 `credentials` 设置为 `'same-origin'`，因为扩展的 API 请求应该始终是同源的：
```javascript
const resp = await fetch(url, {
  credentials: 'same-origin',
  headers: {
    'Accept': 'application/json',
    'Referer': 'https://1paipai.jd.com/auction-list/',
  }
});
```

---

### [MED-002] 缺少 Trusted Types 防护

**位置**: 全局

**证据**: 代码未使用 Trusted Types API 来限制 DOM XSS 攻击面。

**影响**: Trusted Types 可以强制开发者显式地对注入到 DOM 的字符串进行安全处理，是防御 DOM XSS 的有效手段。缺少此防护会增加 XSS 攻击的风险。

**修复**: 在扩展的背景脚本或内容脚本中配置 Trusted Types 策略：
```javascript
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createHTML: (string) => DOMPurify.sanitize(string),
    createScriptURL: (string) => string,
    createScript: (string) => string
  });
}
```

---

## Low Findings

### [LOW-001] 缺少来源验证的扩展消息处理

**位置**: `src/content.js` (第159-170行)

**证据**:
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'TOGGLE_ENABLED':
      this._handleToggle(request.enabled);
      break;
    case 'PRODUCTS_UPDATE':
      this.state.products = request.products || [];
      this._applyFilterAndUpdate();
      break;
  }
});
```

**影响**: 内容脚本中的消息监听器未验证消息来源，虽然 Chrome 扩展的消息机制本身限制了发送者范围，但添加额外的验证可以增加防御深度。

**修复**: 添加来源验证：
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return;
  }
  // ...
});
```

---

### [LOW-002] DOM 提取的商品数据未验证

**位置**: `src/dom.js` (第62-87行)

**证据**:
```javascript
extractProductsFromDOM() {
  // ...
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length > 2 && text.length < 200) {
        products.push({
          name: text,
          title: text,
          id: Math.random().toString(36).slice(2)
        });
      }
    });
  });
  return products;
}
```

**影响**: 从页面 DOM 提取的商品数据未进行任何验证或清理，虽然使用 `textContent` 避免了 HTML 注入，但如果页面本身已被 XSS 污染，提取的数据可能包含恶意内容。

**修复**: 对提取的文本进行基本清理和长度限制（已部分实现）。

---

## Summary of Findings

| ID | Severity | Issue | File | Line |
|----|----------|-------|------|------|
| CRIT-001 | Critical | DOM XSS - 商品名称未过滤 | `src/ui.js` | 554 |
| HIGH-001 | High | DOM XSS - Toast 消息未过滤 | `src/utils.js` | 199 |
| HIGH-002 | High | 缺少 CSP 配置 | `manifest.json` | - |
| MED-001 | Medium | CSRF 风险 - 凭证携带 | `src/api.js` | 101 |
| MED-002 | Medium | 缺少 Trusted Types | 全局 | - |
| LOW-001 | Low | 缺少消息来源验证 | `src/content.js` | 159 |
| LOW-002 | Low | DOM 提取数据未验证 | `src/dom.js` | 62 |

---

## Recommendations

1. **立即修复**: CRIT-001 和 HIGH-001 - 将 innerHTML 替换为 textContent
2. **高优先级**: HIGH-002 - 添加 CSP 配置到 manifest.json
3. **中优先级**: MED-001 和 MED-002 - 修复 CSRF 风险并添加 Trusted Types
4. **低优先级**: LOW-001 和 LOW-002 - 添加防御深度措施

---

## Security Score

**Overall**: 7/10

**Strengths**:
- 使用 Shadow DOM 进行样式隔离
- 无敏感数据存储在 localStorage/sessionStorage
- 无 eval 或动态代码执行
- 后台脚本有基本的消息验证

**Areas for Improvement**:
- 需要加强 DOM XSS 防护（innerHTML 使用）
- 需要添加 CSP 配置
- 需要加强 API 安全配置