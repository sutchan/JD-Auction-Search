// JD-Auction-Search/src/ui/products.js v1.4.0
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
   * 构建扩展自带商品卡片（类化标记，样式由浅 DOM 的 RESULTS_COMPONENT_CSS 驱动，
   * 对齐 prototype 的 .product-card 结构与设计令牌，保证跨页一致且不被京东 CSS 覆盖）
   * @private
   * @returns {HTMLElement}
   */
  JDSUI._buildOwnCard = function _buildOwnCard(p) {
    const U = global.JDSUtils;
    const name = U.escapeHtml(U.getProductName(p) || '');
    const image = U.getProductImage(p);
    const url = U.getProductUrl(p);

    const card = document.createElement('a');
    card.className = 'jds-product-card';
    card.href = url || 'javascript:void(0)';
    if (url) {
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }

    // 图片区：有图用 <img>（referrerPolicy 规避防盗链），无图回退 emoji 占位
    const imgWrap = document.createElement('div');
    imgWrap.className = 'jds-product-img';
    if (image) {
      const img = document.createElement('img');
      img.className = 'jds-product-img-el';
      img.src = image;
      img.alt = name;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      // 属性方式绑定错误回退，规避 MV3 CSP 对 on* 属性的拦截
      img.onerror = () => { imgWrap.textContent = '\u{1F4E6}'; };
      imgWrap.appendChild(img);
    } else {
      imgWrap.textContent = '\u{1F4E6}';
    }
    card.appendChild(imgWrap);

    const body = document.createElement('div');
    body.className = 'jds-product-body';

    const titleEl = document.createElement('div');
    titleEl.className = 'jds-product-name';
    titleEl.textContent = name;
    body.appendChild(titleEl);

    // 价格行：有出价显示「现价」(currentPrice)，未开拍显示「起拍价」(startPrice)，
    // 两者显式标注前缀，避免把起拍价与封顶价(cappedPrice)误混为同一类价格
    const rawCurrent = (p && p.currentPrice != null) ? Number(p.currentPrice) : null;
    const isStarting = !(rawCurrent != null && rawCurrent > 0);
    const current = isStarting ? U.getProductPrice(p) : rawCurrent;

    const priceEl = document.createElement('div');
    priceEl.className = 'jds-product-price';
    if (isStarting) {
      const tag = document.createElement('small');
      tag.className = 'jds-price-tag';
      tag.textContent = '起拍';
      priceEl.appendChild(tag);
    }
    const yen = document.createElement('small');
    yen.textContent = '¥';
    const amount = document.createElement('span');
    amount.textContent = U.formatPrice(current);
    priceEl.appendChild(yen);
    priceEl.appendChild(document.createTextNode(' '));
    priceEl.appendChild(amount);

    // 封顶价(cappedPrice)：有出价时作「原价」划线参考；未开拍时标「封顶」且不划线，
    // 明确它是价格上限而非折扣原价，与起拍价区分开
    const capped = U.getProductOriginalPrice(p);
    if (capped && capped > current) {
      const origEl = document.createElement('span');
      origEl.className = 'jds-product-orig';
      if (isStarting) {
        origEl.textContent = '封顶 ¥' + U.formatPrice(capped);
        origEl.classList.add('jds-product-cap');
      } else {
        origEl.textContent = '¥' + U.formatPrice(capped);
      }
      priceEl.appendChild(origEl);
    }
    body.appendChild(priceEl);

    // 出价人数：独立 badge 行，与价格数字明显区分
    const bidCount = U.getProductBidCount(p);
    if (bidCount > 0) {
      const meta = document.createElement('div');
      meta.className = 'jds-product-meta';
      const bidEl = document.createElement('span');
      bidEl.className = 'jds-product-bid';
      bidEl.textContent = bidCount + ' 人出价';
      meta.appendChild(bidEl);
      body.appendChild(meta);
    }

    card.appendChild(body);
    return card;
  };
})(window);
