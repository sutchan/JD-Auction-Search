// JD-Auction-Search/src/ui/products.js v1.6.5
// 商品渲染：统一使用扩展自带的内联样式卡片（图片+标题+价格），彻底摆脱对京东原生 DOM/CSS 的依赖，
// 保证跨页搜索结果在任意京东页面都稳定可见。
// 价格区渲染见 ./price-render.js，面板生命周期见 ./results.js，骨架屏见 ./skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  // 首屏渲染条数：超出部分由「加载更多」按需追加，
  // 避免全局命中上千条时一次性生成大量卡片导致页面卡死
  const PAGE_SIZE = 60;
  // 入场动画错位步长与封顶（秒），避免大列表等待过久
  const ANIM_STEP = 0.03;
  const ANIM_MAX = 0.4;
  // 无图占位 emoji（📦）
  const IMG_PLACEHOLDER = '\u{1F4E6}';

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
    // 重渲染前清理上一轮倒计时注册，避免过期 DOM 引用导致内存泄漏与误更新
    this.clearCountdowns();
    panel.innerHTML = '';

    if (!products || products.length === 0) {
      this.showEmptyState();
      return;
    }
    this.hideEmptyState();

    this._renderPage = 1;
    const grid = this._createGrid(panel);
    this.gridElement = grid;
    this._appendPage(grid, products);
  };

  /**
   * 追加一页商品卡片到网格（分页渲染核心）
   * @private
   * @param {HTMLElement} grid - 网格容器
   * @param {Array} products - 完整商品数组
   */
  JDSUI._appendPage = function _appendPage(grid, products) {
    const start = (this._renderPage - 1) * PAGE_SIZE;
    const slice = products.slice(start, start + PAGE_SIZE);

    const total = products.length;
    const rendered = start + slice.length;

    // 批量插入减少重排
    const frag = document.createDocumentFragment();
    slice.forEach((p, i) => {
      const card = this._buildOwnCard(p);
      card.style.animationDelay = Math.min(i * ANIM_STEP, ANIM_MAX) + 's';
      frag.appendChild(card);
    });
    grid.appendChild(frag);

    const oldBtn = grid.parentNode && grid.parentNode.querySelector('.jds-load-more');
    if (oldBtn) oldBtn.remove();
    if (rendered < total) {
      const btn = document.createElement('button');
      btn.id = 'jds-load-more';
      btn.className = 'jds-load-more';
      btn.type = 'button';
      btn.textContent = getMessage('loadMore') + getMessage('loadMoreProgress', [rendered, total]);
      btn.addEventListener('click', () => {
        this._renderPage++;
        this._appendPage(grid, products);
      });
      grid.parentNode.appendChild(btn);
    }
  };

  /**
   * 构建卡片图片区：有图用 <img>（referrerPolicy 规避防盗链），无图回退 emoji 占位
   * @private
   * @param {string|null} image - 主图 URL
   * @param {string} name - 商品名称（作为 alt）
   * @returns {HTMLElement}
   */
  JDSUI._buildCardImage = function _buildCardImage(image, name) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'jds-product-img';
    if (!image) {
      imgWrap.textContent = IMG_PLACEHOLDER;
      return imgWrap;
    }
    const img = document.createElement('img');
    img.className = 'jds-product-img-el';
    img.src = image;
    img.alt = name;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    // 属性方式绑定错误回退，规避 MV3 CSP 对 on* 属性的拦截
    img.onerror = () => { imgWrap.textContent = IMG_PLACEHOLDER; };
    imgWrap.appendChild(img);
    return imgWrap;
  };

  /**
   * 构建扩展自带商品卡片（类化标记，样式由浅 DOM 的 results/styles.js 驱动，
   * 对齐 prototype 的 .product-card 结构与设计令牌，保证跨页一致且不被京东 CSS 覆盖）
   * @private
   * @param {Object} p - 商品对象
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

    // 安全：仅在有合法 http(s) 链接时设置 href；无链接时不写 javascript: 伪协议
    // （MV3 CSP 与安全审计均不建议），改为可聚焦的 button 语义
    if (url) {
      card.href = url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    } else {
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
    }

    card.appendChild(this._buildCardImage(image, name));

    const body = document.createElement('div');
    body.className = 'jds-product-body';

    // 价格区（主价格行 + 划线原价行 + 出价人数 + 拍卖时间，见 price-render.js）
    // 置于商品名称之上，符合「价格优先于名称」的卡片信息层级
    this._renderPriceSection(body, p, name);

    const titleEl = document.createElement('div');
    titleEl.className = 'jds-product-name';
    titleEl.textContent = name;
    body.appendChild(titleEl);

    card.appendChild(body);
    return card;
  };
})(window);
