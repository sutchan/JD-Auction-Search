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

    const total = products.length;
    const rendered = start + slice.length;
    // 入场动画错位：按当前页内序号递增延迟，封顶 0.4s 避免大列表等待过久
    slice.forEach((p, i) => {
      const card = this._buildOwnCard(p);
      card.style.animationDelay = Math.min(i * 0.03, 0.4) + 's';
      grid.appendChild(card);
    });
    const oldBtn = grid.parentNode && grid.parentNode.querySelector('.jds-load-more');
    if (oldBtn) oldBtn.remove();
    if (rendered < total) {
      const btn = document.createElement('button');
      btn.id = 'jds-load-more';
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
    // 语义化 id：优先用商品 id；无 id 时用稳定自增序号（避免用标题 encodeURIComponent 产生非法/重复 id）
    const cardId = (p && (p.id != null ? p.id : p.productId));
    card.id = 'jds-card-' + (cardId != null ? String(cardId) : 'n' + (JDSUI._cardSeq = (JDSUI._cardSeq || 0) + 1));
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

    // 主价格行：价格优先取自页面 span.p-price 实际文本（用户要求只显示 p-price 价格），
    // 不再依赖接口字段名/单位猜测；无对应原生卡片时回退数字格式化(currentPrice/startPrice)。
    // - hasCurrent: 接口/提取给出 currentPrice（含 0，流拍亦算有效现价）
    // - priceText: 页面原生 .p-price 文本，代表当前价（优先展示）
    // - isStarting: 既无 currentPrice 也无 priceText，仅有 startPrice → 未开拍「起拍价」
    //   只要商品能显示出当前价（currentPrice 或 priceText 任一存在），就用当前价代替起拍价
    const rawCurrent = (p && p.currentPrice != null) ? Number(p.currentPrice) : null;
    const hasCurrent = rawCurrent != null;
    const startPrice = (p && p.startPrice != null) ? Number(p.startPrice) : null;

    // 优先用 p-price 原文（DOM 提取存的值 / 实时回查页面原生卡片），避免单位(分/元)误差
    const priceText = (p && p.priceText)
      || (global.JDSDom && global.JDSDom.getProductPriceText ? global.JDSDom.getProductPriceText(name) : null);
    const hasPriceText = !!priceText;

    // 仅当没有任何当前价可显示（无 currentPrice 且无 priceText）时，才用起拍价并标注「起拍」
    const isStarting = !hasCurrent && !hasPriceText && startPrice != null && startPrice > 0;
    const current = isStarting ? startPrice
      : (hasCurrent ? rawCurrent : (hasPriceText ? null : U.getProductPrice(p)));

    const priceEl = document.createElement('div');
    priceEl.className = 'jds-product-price';

    // 三个独立容器：标签 / 货币符号 / 金额，便于各自独立样式化
    const labelEl = document.createElement('span');
    labelEl.className = 'jds-price-label';
    const yenEl = document.createElement('span');
    yenEl.className = 'jds-price-yen';
    const amountEl = document.createElement('span');
    amountEl.className = 'jds-price-amount';

    // 标签容器：仅未开拍（无当前价）时显示「起拍」
    if (isStarting) labelEl.textContent = '起拍';

    // 货币符号始终独立在 yenEl；金额容器只放数值（起拍价/当前价），不混入 ¥ 符号
    yenEl.textContent = '¥';
    const amountStr = priceText
      ? priceText.replace(/^[¥￥\s]+/, '').trim()   // p-price 原文可能含 ¥/￥，剥离货币只留数值
      : U.formatPrice(current);
    // 金额拆成三部分：整数部分 / 小数点 / 小数部分，便于分别样式化（小数可更小）
    const m = /^(\d[\d,]*)([.,]?)(\d*)$/.exec(amountStr);
    const intPart = m ? m[1] : amountStr;
    const sepPart = m ? m[2] : '';
    const decPart = m ? m[3] : '';
    const intEl = document.createElement('span');
    intEl.className = 'jds-price-int';
    intEl.textContent = intPart;
    const sepEl = document.createElement('span');
    sepEl.className = 'jds-price-dec-sep';
    sepEl.textContent = sepPart;
    const decEl = document.createElement('span');
    decEl.className = 'jds-price-dec';
    decEl.textContent = decPart;
    amountEl.appendChild(intEl);
    amountEl.appendChild(sepEl);
    amountEl.appendChild(decEl);
    // 顺序：标签(起拍) → 货币符号 → 金额(整数.小数)
    priceEl.appendChild(labelEl);
    priceEl.appendChild(yenEl);
    priceEl.appendChild(amountEl);
    body.appendChild(priceEl);

    // 划线原价：有封顶/原价且大于现价时展示（灰色、划线、较小字号），与现价明显区分
    const origPrice = (p && p.cappedPrice != null) ? Number(p.cappedPrice) : null;
    if (origPrice != null && isFinite(origPrice) && origPrice > 0 &&
        (!hasCurrent || origPrice > rawCurrent)) {
      const sub = document.createElement('div');
      sub.className = 'jds-product-subprice';
      const origEl = document.createElement('span');
      origEl.className = 'jds-product-orig';
      origEl.textContent = '¥' + U.formatPrice(origPrice);
      sub.appendChild(origEl);
      body.appendChild(sub);
    }

    // 出价人数：独立 badge 行，较小灰色字，与价格数字明显区分
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
