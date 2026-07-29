// JD-Auction-Search/src/ui/products.js v1.3.1
// 商品渲染：克隆原生卡片渲染搜索结果、克隆填充、回退自带卡片
// 面板生命周期见 results.js，骨架屏见 skeleton.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

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
      // 关键：显式强制为可见 grid 布局，避免继承京东"未展开/懒加载"状态导致的整片 display:none 不显示
      const listWrapper = template.parentElement;
      const grid = listWrapper ? listWrapper.cloneNode(false) : document.createElement('div');
      grid.removeAttribute('id');
      // 移除容器级懒加载/隐藏类，强制可见
      grid.classList.remove('lazy-enter', 'lazyload', 'hidden', 'not-visible');
      grid.style.display = 'grid';
      grid.style.opacity = '1';
      grid.style.visibility = 'visible';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
      grid.style.gap = '12px';
      grid.style.padding = '16px 24px 40px';
      grid.innerHTML = '';
      products.forEach((p) => {
        try {
          const card = template.cloneNode(true);
          // 关键修复：克隆体会继承 hideNativeProducts 设置的内联 display:none，
          // 必须显式清除，否则卡片本身不可见（grid 容器可见但子卡片整片空白，表现为"搜索不显示结果"）
          card.style.display = '';
          this._fillNativeCard(card, p);
          grid.appendChild(card);
        } catch (e) {
          // 单张卡片渲染失败不影响整体结果列表
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
        ? `<img src="${U.escapeHtml(image)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:120px;object-fit:cover;display:block" />`
        : `<div style="width:100%;height:120px;display:grid;place-items:center;background:#f4f4f5;font-size:40px">📦</div>`;
      card.innerHTML = `
        ${imgHtml}
        <div style="padding:10px">
          <div style="font-size:13px;color:#18181b;line-height:1.4;max-height:36px;overflow:hidden">${name}</div>
          <div style="margin-top:6px;color:#e1251b;font-weight:600;font-size:15px">¥${priceText}</div>
        </div>`;
      // MV3 CSP 禁止内联 on* 事件处理器，改为属性绑定错误回退
      const imgEl = card.querySelector('img');
      if (imgEl) imgEl.onerror = () => { imgEl.style.visibility = 'hidden'; };
      this.gridElement.appendChild(card);
    });
  };
})(window);
