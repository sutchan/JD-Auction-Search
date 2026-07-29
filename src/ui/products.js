// JD-Auction-Search/src/ui/products.js v1.3.3
// 商品渲染：优先克隆原生卡片渲染搜索结果（视觉一致），并对克隆卡片做实测可见性兜底，
// 当京东 class 级 CSS 导致克隆卡片 display:none 或零高度（虚拟列表/懒加载）时，
// 自动回退为扩展自带的内联样式卡片，确保搜索结果始终可见。
// 面板生命周期见 results.js，骨架屏见 skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  /**
   * 渲染商品列表到结果面板
   * 优先克隆页面上的京东原生商品卡片（视觉一致）；对每张克隆卡片做实测可见性校验，
   * 不可见时回退为扩展自带卡片。仅当页面无原生卡片模板时，统一使用扩展自带卡片。
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

    // 统一用扩展自带网格容器（内联样式，避免继承京东列表容器的 flex/!important 等布局干扰）
    const grid = document.createElement('div');
    grid.className = 'jds-product-grid';
    grid.setAttribute('aria-live', 'polite');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:16px 24px 40px;';
    panel.appendChild(grid);
    this.gridElement = grid;

    const template = global.JDSDom.getFirstProductCard();
    const U = global.JDSUtils;

    products.forEach((p) => {
      let card = null;

      // 首选：克隆京东原生卡片（视觉一致），但需实测确认其真正可见
      if (template) {
        try {
          const cloned = template.cloneNode(true);
          // 清除 hideNativeProducts 写入的内联 display:none（克隆体会继承），还原为卡片类本身定义的可见状态
          cloned.style.display = '';
          this._fillNativeCard(cloned, p);
          // 先挂载再实测：克隆卡片可能因京东 class 级 CSS（display:none 或零高度/虚拟列表）
          // 在结果面板中不可见，此时回退为扩展自带卡片
          grid.appendChild(cloned);
          let visible = true;
          try {
            if (global.getComputedStyle && global.getComputedStyle(cloned).display === 'none') visible = false;
            const rect = cloned.getBoundingClientRect();
            if (!rect || rect.height === 0) visible = false;
          } catch (e) {}
          if (visible) {
            card = cloned;
          } else {
            const own = this._buildOwnCard(p);
            grid.replaceChild(own, cloned);
            card = own;
          }
        } catch (e) {
          // 单张卡片克隆失败，回退扩展自带卡片
          card = this._buildOwnCard(p);
        }
      } else {
        card = this._buildOwnCard(p);
      }

      if (card && card !== grid.lastChild) grid.appendChild(card);
    });
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

    // 强制可见：移除京东"入场动画/懒加载"隐藏类（如 lazy-enter），
    // 该类不仅把卡片 opacity 设为 0，还会把子级图片容器 .p-img 设为 display:none，
    // 仅靠卡片内联 opacity:1 无法解除子级隐藏 —— 这是搜索结果"主图空白/不显示"的根因之一
    card.classList.remove('lazy-enter', 'lazy-img', 'lazyload', 'lazy-loaded', 'J-lazy', 'J-lazyload', 'not-visible', 'hidden-item');
    card.style.opacity = '1';
    card.style.visibility = 'visible';
    card.style.display = ''; // 清除 hideNativeProducts 设置的内联 display:none，确保克隆卡片可见
    card.removeAttribute('hidden');
    card.removeAttribute('id');

    const img = card.querySelector('img');
    if (img) {
      // 强制图片容器与图片本身可见（解除父级/懒加载隐藏）
      const pImg = img.parentElement;
      if (pImg) {
        pImg.style.display = '';
        pImg.style.visibility = 'visible';
        pImg.style.opacity = '1';
      }
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      // 优先用数据中的真实图；克隆卡片已脱离京东视口观察器，若原生 img 仅依赖
      // data-lazy/data-src 懒加载且 src 为空，必须回退填充，否则主图永远不显示
      const lazySrc = img.getAttribute('data-lazy') || img.getAttribute('data-src') || img.getAttribute('data-original');
      if (image) {
        img.src = image;
      } else if (lazySrc && !img.getAttribute('src')) {
        img.src = lazySrc;
      }
      img.removeAttribute('srcset');
      img.loading = 'lazy';
      img.alt = name;
      // 注意：使用属性方式绑定错误回退（非内联事件处理器），规避 MV3 CSP 对 on* 属性的拦截
      img.onerror = () => { img.style.visibility = 'hidden'; };
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
   * 构建扩展自带商品卡片（内联样式，独立于京东 CSS，保证在任何页面都可见）
   * 作为克隆卡片不可见时的兜底渲染，并用于页面无原生卡片模板的场景
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
