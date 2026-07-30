// JD-Auction-Search/src/ui/products.js v1.3.5
// 商品渲染：统一使用扩展自带的内联样式卡片（图片+标题+价格），彻底摆脱对京东原生 DOM/CSS 的依赖，
// 保证跨页搜索结果在任意京东页面都稳定可见（此前克隆原生卡片在真实页面常因京东 class 级 CSS
// 表现为“尺寸正常却整片不可见”，难以可靠检测）。
// 面板生命周期见 results.js，骨架屏见 skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 渲染商品列表到结果面板
   * 始终使用扩展自带的内联样式卡片（_buildOwnCard），不依赖京东原生卡片克隆，
   * 避免京东页面 CSS 导致克隆卡片在结果面板中不可见（显示空白）。
   * @param {Array} products - 商品数组
   */
  JDSUI.renderProducts = function renderProducts(products) {
    const panel = this.resultsRoot && this.resultsRoot.querySelector('.jds-results-panel');
    if (!panel) return;
    this.gridElement = null;
    panel.innerHTML = '';

    if (!products || products.length === 0) {
      this.showEmptyState();
      return;
    }
    this.hideEmptyState();

    // 扩展自带网格容器（内联样式，完全独立于京东列表布局）
    const grid = this._createGrid(panel);
    this.gridElement = grid;

    // 限制单次渲染数量，避免全局命中上千条时一次性生成大量卡片导致页面卡死
    const MAX_RENDER = 200;
    const total = products.length;
    const visible = products.slice(0, MAX_RENDER);
    visible.forEach((p) => {
      grid.appendChild(this._buildOwnCard(p));
    });

    // 超出上限时展示截断提示，说明仅渲染前 N 条
    if (total > MAX_RENDER) {
      const tip = document.createElement('div');
      tip.style.cssText = 'grid-column:1/-1;padding:8px 4px;color:#71717a;font-size:13px;text-align:center;';
      tip.textContent = `已显示前 ${MAX_RENDER} 条，共 ${total} 条匹配结果`;
      panel.appendChild(tip);
    }
  };

  /**
   * 构建扩展自带商品卡片（内联样式，独立于京东 CSS，保证在任何页面都可见）
   * @private
   * @returns {HTMLElement}
   */
  JDSUI._buildOwnCard = function _buildOwnCard(p) {
    const U = global.JDSUtils;
    const name = U.escapeHtml(U.getProductName(p) || '');
    const price = U.formatPrice(U.getProductPrice(p));
    const image = U.getProductImage(p);
    const url = U.getProductUrl(p);

    const card = document.createElement('a');
    card.className = 'jds-result-card';
    card.href = url || 'javascript:void(0)';
    if (url) {
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }
    card.style.cssText = 'display:flex;flex-direction:column;text-decoration:none;color:#18181b;' +
      'background:#fff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;' +
      'transition:box-shadow .15s ease,transform .15s ease;';
    card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 8px 24px -8px rgba(24,24,27,.18)'; });
    card.addEventListener('mouseleave', () => { card.style.boxShadow = ''; });

    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = 'width:100%;height:180px;background:#f4f4f5;display:flex;align-items:center;' +
      'justify-content:center;overflow:hidden;font-size:40px;color:#d4d4d8;';
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = name;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      // 属性方式绑定错误回退，规避 MV3 CSP 对 on* 属性的拦截
      img.onerror = () => { imgWrap.textContent = '\u{1F4E6}'; };
      imgWrap.appendChild(img);
    } else {
      imgWrap.textContent = '\u{1F4E6}';
    }
    card.appendChild(imgWrap);

    const body = document.createElement('div');
    body.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:6px;';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:13px;line-height:1.4;color:#18181b;max-height:36px;overflow:hidden;';
    titleEl.textContent = name;
    const priceEl = document.createElement('div');
    priceEl.style.cssText = 'color:#e1251b;font-weight:600;font-size:16px;';
    priceEl.textContent = '¥' + price;
    body.appendChild(titleEl);
    body.appendChild(priceEl);
    card.appendChild(body);

    return card;
  };
})(window);
