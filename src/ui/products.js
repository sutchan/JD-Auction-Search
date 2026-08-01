// JD-Auction-Search/src/ui/products.js v1.5.0
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

    // 分页渲染：首屏渲染 PAGE_SIZE 条，超出部分由“加载更多”按需追加，
    // 避免全局命中上千条时一次性生成大量卡片导致页面卡死
    this._renderPage = 1;
    this._renderAll = products;
    const grid = this._createGrid(panel);
    this.gridElement = grid;
    this._appendPage(grid, products);
  };

  /**
   * 追加一页商品卡片到网格（分页渲染核心）
   * @private
   */
  JDSUI._appendPage = function _appendPage(grid, products) {
    const PAGE_SIZE = 60;
    const start = (this._renderPage - 1) * PAGE_SIZE;
    const slice = products.slice(start, start + PAGE_SIZE);
    slice.forEach((p) => grid.appendChild(this._buildOwnCard(p)));

    const total = products.length;
    const rendered = start + slice.length;
    // 移除旧“加载更多”按钮，避免重复
    const oldBtn = grid.parentNode && grid.parentNode.querySelector('.jds-load-more');
    if (oldBtn) oldBtn.remove();
    if (rendered < total) {
      const btn = document.createElement('button');
      btn.className = 'jds-load-more';
      btn.type = 'button';
      btn.textContent = `加载更多（已显示 ${rendered} / ${total}）`;
      btn.addEventListener('click', () => {
        this._renderPage++;
        this._appendPage(grid, products);
      });
      grid.parentNode.appendChild(btn);
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
    // 注：标题经 textContent 赋值（不会被解析为 HTML，本身防 XSS），无需 escapeHtml，
    // 否则已转义的 &amp;/&lt; 会被原样显示成乱码
    const name = U.getProductName(p) || '';
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

    // 主价格行：价格只显示页面 span.p-price（接口 currentPrice / DOM 提取现价）的现价，
    // 不再展示封顶价/划线原价次行（用户要求仅显示现价）。
    // - hasCurrent: 接口/提取给出 currentPrice（含 0，流拍亦算有效现价）
    // - isStarting: 无 currentPrice 但有 startPrice → 未开拍「起拍价」（标签为现价语义修饰，仍保留）
    const rawCurrent = (p && p.currentPrice != null) ? Number(p.currentPrice) : null;
    const hasCurrent = rawCurrent != null;
    const startPrice = (p && p.startPrice != null) ? Number(p.startPrice) : null;
    const isStarting = !hasCurrent && startPrice != null && startPrice > 0;
    const current = isStarting ? startPrice
      : (hasCurrent ? rawCurrent : U.getProductPrice(p));

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
