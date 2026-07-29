// JD-Auction-Search/src/ui/results.js v1.3.0
// 结果面板：克隆原生卡片渲染搜索结果、空状态、面板定位与销毁

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  // 结果面板宿主（真实 DOM，非 Shadow）的覆盖层外壳样式；卡片本身由京东全局 CSS 渲染
  const RESULTS_HOST_CSS = `
    #jds-results-host {
      position: fixed; left: 0; right: 0; top: 0; bottom: 0;
      z-index: 999990;
    }
    #jds-results-host .jds-results-panel {
      position: absolute; inset: 0; overflow-y: auto;
      background: #fff; padding: 16px 0 40px;
      display: none;
    }
    #jds-results-host .jds-results-panel.is-visible { display: block; }
    #jds-results-host .jds-empty-overlay {
      position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      color: #71717a; text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    }
    #jds-results-host .jds-empty-icon svg { width: 48px; height: 48px; color: #d4d4d8; }
    #jds-results-host .jds-empty-title { font-size: 15px; font-weight: 600; color: #18181b; }
    #jds-results-host .jds-empty-desc { font-size: 13px; }
  `;

  /**
   * 确保结果面板内存在一个 fallback 网格容器（供骨架屏 / 回退卡片使用）
   * @private
   */
  JDSUI._ensureGrid = function _ensureGrid() {
    if (this.gridElement) return;
    this._initResultsHost();
    const panel = this.resultsRoot && this.resultsRoot.querySelector('.jds-results-panel');
    if (!panel) return;
    let grid = panel.querySelector('.jds-product-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'jds-product-grid';
      grid.setAttribute('aria-live', 'polite');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
      grid.style.gap = '12px';
      grid.style.padding = '16px 24px 40px';
      panel.appendChild(grid);
    }
    this.gridElement = grid;
  };

  /**
   * 渲染骨架屏加载占位
   * @param {number} count - 骨架卡片数量
   */
  JDSUI.renderSkeletons = function renderSkeletons(count = 8) {
    this._ensureGrid();
    if (!this.gridElement) return;
    this.gridElement.setAttribute('aria-busy', 'true');
    this.gridElement.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'jds-skeleton-card';
      card.innerHTML = '<div class="jds-skel jds-skel-img"></div><div class="jds-skel jds-skel-line"></div><div class="jds-skel jds-skel-line"></div>';
      this.gridElement.appendChild(card);
    }
  };

  /**
   * 渲染商品列表到结果面板
   * 优先克隆页面上的京东原生商品卡片（含其 grid 容器），使搜索结果外观与原始页面完全一致；
   * 仅当页面无原生卡片模板时，回退为扩展自带卡片。
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

    const template = global.JDSDom.getFirstProductCard();
    if (template) {
      // 克隆京东原生列表容器（保留其 grid 布局类名，使卡片样式与原始页面一致）
      // 关键：显式强制为可见 grid 布局，避免继承京东“未展开/懒加载”状态导致的整片 display:none 不显示
      const listWrapper = template.parentElement;
      const grid = listWrapper ? listWrapper.cloneNode(false) : document.createElement('div');
      grid.removeAttribute('id');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
      grid.style.gap = '12px';
      grid.style.padding = '16px 24px 40px';
      grid.innerHTML = '';
      products.forEach((p) => {
        try {
          const card = template.cloneNode(true);
          // 关键修复：克隆体会继承 hideNativeProducts 设置的内联 display:none，
          // 必须显式清除，否则卡片本身不可见（grid 容器可见但子卡片整片空白，表现为“搜索不显示结果”）
          card.style.display = '';
          this._fillNativeCard(card, p);
          grid.appendChild(card);
        } catch (e) {
          console.warn('[JD-Auction-Search] 渲染单张原生卡片失败，已跳过:', e);
        }
      });
      panel.appendChild(grid);
    } else {
      // 回退：页面无原生卡片模板时，使用扩展自带卡片（内联样式，避免依赖 Shadow CSS）
      const grid = document.createElement('div');
      grid.className = 'jds-product-grid';
      grid.setAttribute('aria-live', 'polite');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
      grid.style.gap = '12px';
      grid.style.padding = '16px 24px 40px';
      panel.appendChild(grid);
      this.gridElement = grid;
      this._renderFallbackCards(products);
    }
  };

  /**
   * 用商品数据填充克隆的京东原生卡片（主图 / 标题 / 价格 / 链接），并清理模板残留的动态信息
   * @private
   */
  JDSUI._fillNativeCard = function _fillNativeCard(card, p) {
    const U = global.JDSUtils;
    const name = U.getProductName(p);
    const price = U.getProductPrice(p);
    const image = U.getProductImage(p);
    const url = U.getProductUrl(p);

    // 强制可见：避免继承京东"懒加载/入场动画"导致的 opacity:0 或 display:none
    card.style.opacity = '1';
    card.style.visibility = 'visible';
    card.style.display = ''; // 清除 hideNativeProducts 设置的内联 display:none，确保克隆卡片可见
    card.removeAttribute('hidden');
    card.removeAttribute('id');

    const img = card.querySelector('img');
    if (img) {
      if (image) {
        img.src = image;
        img.removeAttribute('srcset');
        img.loading = 'lazy';
        img.alt = name;
        img.onerror = () => { img.style.visibility = 'hidden'; };
      }
    }

    const title = card.querySelector('[class*="name" i], [class*="title" i], h3, h4');
    if (title) title.textContent = name;
    card.setAttribute('title', name);

    const priceEl = card.querySelector('[class*="price" i]');
    if (priceEl) priceEl.textContent = '¥' + U.formatPrice(price);

    const a = card.closest('a') || card.querySelector('a');
    if (a && url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }

    // 清除克隆模板残留的倒计时/剩余时间等动态信息，避免显示错误数据
    card.querySelectorAll('[class*="countdown" i], [class*="remain" i], [class*="time" i], [class*="timer" i]')
      .forEach(el => { el.textContent = ''; el.style.display = 'none'; });
  };

  /**
   * 回退渲染：页面无原生卡片模板时，使用扩展自带卡片（内联样式，独立于 Shadow CSS）
   * @private
   */
  JDSUI._renderFallbackCards = function _renderFallbackCards(products) {
    products.forEach((p) => {
      const U = global.JDSUtils;
      const name = U.escapeHtml(U.getProductName(p));
      const priceText = U.formatPrice(U.getProductPrice(p));
      const image = U.getProductImage(p);

      const card = document.createElement('div');
      card.style.cssText = 'display:inline-block;width:180px;margin:8px;vertical-align:top;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;';
      const imgHtml = image
        ? `<img src="${U.escapeHtml(image)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:120px;object-fit:cover;display:block" onerror="this.style.visibility='hidden'" />`
        : `<div style="width:100%;height:120px;display:grid;place-items:center;background:#f4f4f5;font-size:40px">📦</div>`;
      card.innerHTML = `
        ${imgHtml}
        <div style="padding:10px">
          <div style="font-size:13px;color:#18181b;line-height:1.4;max-height:36px;overflow:hidden">${name}</div>
          <div style="margin-top:6px;color:#e1251b;font-weight:600;font-size:15px">¥${priceText}</div>
        </div>`;
      this.gridElement.appendChild(card);
    });
  };

  /**
   * 初始化结果面板宿主 — 真实 DOM（非 Shadow）挂在 body
   * 用真实 DOM 承载，克隆的京东原生卡片才能继承页面全局样式，外观与原始列表一致
   * 面板以 fixed 定位在嵌入工具栏下方，覆盖内容区展示跨页搜索结果
   * @private
   */
  JDSUI._initResultsHost = function _initResultsHost() {
    if (this.resultsHost) return;
    const host = document.createElement('div');
    host.id = 'jds-results-host';
    document.body.appendChild(host);
    this.resultsHost = host;
    this.resultsRoot = host;

    // 仅作用于覆盖层外壳的样式；卡片本身由京东全局 CSS 渲染
    if (!document.getElementById('jds-results-style')) {
      const style = document.createElement('style');
      style.id = 'jds-results-style';
      style.textContent = RESULTS_HOST_CSS;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.className = 'jds-results-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', '搜索结果');
    host.appendChild(panel);

    this._positionResultsPanel();
    this._bindResultsPosition();
  };

  /**
   * 根据嵌入工具栏底部位置定位结果面板顶部
   * @private
   */
  JDSUI._positionResultsPanel = function _positionResultsPanel() {
    if (!this.resultsRoot) return;
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    if (!panel) return;
    const wrapper = document.getElementById('jds-search-wrapper');
    let top = 0;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      top = Math.max(0, Math.round(rect.bottom));
    }
    panel.style.top = top + 'px';
  };

  /**
   * 绑定面板定位刷新（滚动/缩放时跟随嵌入工具栏）
   * @private
   */
  JDSUI._bindResultsPosition = function _bindResultsPosition() {
    if (this._positionBound) return;
    this._positionBound = true;
    const update = () => this._positionResultsPanel();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  };

  /**
   * 展示跨页搜索结果（渲染到结果面板）
   * @param {Array} products - 过滤后的商品
   */
  JDSUI.showResults = function showResults(products) {
    this._initResultsHost();
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    panel.classList.add('is-visible');
    this._positionResultsPanel();
    this.renderProducts(products);
  };

  /**
   * 隐藏结果面板
   */
  JDSUI.hideResults = function hideResults() {
    if (!this.resultsRoot) return;
    const panel = this.resultsRoot.querySelector('.jds-results-panel');
    if (panel) panel.classList.remove('is-visible');
    this.hideEmptyState();
  };

  /**
   * 显示空状态浮层 — 对齐原型空状态设计（图标 + 标题 + 描述）
   * 浮层渲染在 Shadow DOM 内，样式隔离
   */
  JDSUI.showEmptyState = function showEmptyState() {
    const root = this.resultsRoot || this.shadowRoot;
    if (!root) return;
    if (!this.emptyElement) {
      this.emptyElement = document.createElement('div');
      this.emptyElement.className = 'jds-empty-overlay';
      this.emptyElement.setAttribute('role', 'status');
      this.emptyElement.innerHTML = `
        <div class="jds-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <div class="jds-empty-title">${getMessage('emptyTitle')}</div>
        <div class="jds-empty-desc">${getMessage('emptyDesc')}</div>`;
      root.appendChild(this.emptyElement);
    }
    this.emptyElement.style.display = '';
  };

  /**
   * 隐藏空状态
   */
  JDSUI.hideEmptyState = function hideEmptyState() {
    if (this.emptyElement) {
      this.emptyElement.style.display = 'none';
    }
  };

  /**
   * 销毁UI
   */
  JDSUI.destroy = function destroy() {
    const wrapper = document.getElementById('jds-search-wrapper');
    if (wrapper) wrapper.remove();
    if (this.resultsHost) this.resultsHost.remove();
    this.shadowRoot = null;
    this.resultsRoot = null;
    this.resultsHost = null;
    this.gridElement = null;
    if (this.emptyElement) {
      this.emptyElement.remove();
      this.emptyElement = null;
    }
    const toast = document.querySelector('.jds-toast-stack');
    if (toast) toast.remove();
  };
})(window);
