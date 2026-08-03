// JD-Auction-Search/src/dom/selectors.js v1.5.3
// 京东页面 DOM 选择器集中配置：所有依赖京东结构的class匹配都在此维护，
// 改版时只需在此一处调整，避免散落在 toolbar/filter/observer/extract 多处。

(function (global) {
  'use strict';

  const JDSDom = global.JDSDom = global.JDSDom || {};

  // 工具栏挂载容器（优先夺宝岛页头 auction_head）
  JDSDom.SELECTORS = {
    MOUNT: [
      'div.auction_head',
      '[class*="auction_head" i]',
      '#auction_head',
      '[id*="auction_head" i]',
      '[class*="auction-head" i]',
      '[class*="auctionHead" i]',
      '[data-module="auction_head"]'
    ],
    MOUNT_RIGHT: [
      '[class*="auction_head_right" i]',
      '[id*="auction_head_right" i]'
    ],
    // 商品列表外层容器（用于宽度对齐与卡片查找）
    LIST_CONTAINER: [
      '[class*="goods-list" i]', '[class*="auction-list" i]', '[class*="product-list" i]',
      '[class*="list" i]', '[class*="grid" i]', '[class*="goods" i]'
    ],
    // 精确商品卡片类
    CARD: [
      '[class*="auction-item" i]', '[class*="product-item" i]', '[class*="goods-item" i]',
      '[class*="auction-card" i]', '[class*="product-card" i]', '[class*="goods-card" i]'
    ],
    // MutationObserver 观察的根容器（取第一个命中的）
    OBSERVE: [
      '[class*="auction" i]', '[class*="product" i]', '[class*="goods" i]',
      '.jd-paipai', '#app', 'main'
    ],
    // 卡片名称元素：精确类优先，再回退模糊 class（排除 username/nickname 等）
    NAME: [
      '[class*="product-name" i]', '[class*="goods-name" i]', '[class*="item-name" i]',
      '[class*="auction-name" i]', '.name', '.title', 'h3', 'h4',
      '[class*="title" i]'
    ].concat([
      // 模糊回退：仅当精确类未命中时使用，且排除明显非商品名
      '[class*="name" i]:not([class*="user" i]):not([class*="nick" i]):not([class*="account" i]):not([class*="shop" i])'
    ]),
    // 价格元素：优先京东精确现价类 .p-price（与页面实际显示现价一致），
    // 其次宽泛 [class*="price"]（仍排除划线原价）；用户要求价格只取 p-price 现价
    PRICE: '.p-price, [class*="p-price" i], [class*="price-current" i], [class*="current-price" i], [class*="price" i]',
    ORIGIN: '[class*="old" i], [class*="original" i], [class*="origin" i], [class*="market" i], [class*="ref" i]',
    BID: '[class*="bid" i], [class*="apply" i], [class*="join" i], [class*="count" i], [class*="报名" i], [class*="出价" i]',
    IMG: 'img'
  };

  // 全局回退卡片选择器（列表容器未命中时），排除明显非商品项
  JDSDom.FALLBACK_CARD = '[class*="item" i]' +
    ':not([class*="nav" i]):not([class*="menu" i]):not([class*="page" i])' +
    ':not([class*="breadcrumb" i]):not([class*="tab" i]):not([class*="step" i])' +
    ':not([class*="option" i]):not([class*="cart" i]):not([class*="order" i])';

  /**
   * 按选择器数组顺序查找第一个命中的元素
   * @param {string[]} sels
   * @returns {Element|null}
   */
  JDSDom.queryFirst = function queryFirst(sels) {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  /**
   * 按选择器数组顺序收集所有命中的卡片（首个命中的容器内的卡片）
   * @param {string[]} containerSels
   * @param {string[]} cardSels
   * @returns {Element[]}
   */
  JDSDom.queryCards = function queryCards(containerSels, cardSels) {
    for (const sel of containerSels) {
      const container = document.querySelector(sel);
      if (container) {
        for (const cardSel of cardSels) {
          const found = container.querySelectorAll(cardSel);
          if (found.length) return Array.from(found);
        }
      }
    }
    return [];
  };
})(window);
