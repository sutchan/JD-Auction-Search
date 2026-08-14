// JD-Auction-Search/src/ui/price-render.js v1.6.11
// 商品卡价格区渲染：主价格行（起拍标签/货币符号/整数.小数）与划线原价行
// 卡片整体构建见 ./products.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  /**
   * 计算价格展示模型
   * - hasCurrent: 接口/提取给出 currentPrice（含 0，流拍亦算有效现价）
   * - priceText: 页面原生 .p-price 文本，代表当前价（优先展示，避免单位/千分位误差）
   * - isStarting: 既无 currentPrice 也无 priceText，仅有 startPrice → 未开拍「起拍价」
   * @private
   * @param {Object} p - 商品对象
   * @param {string} name - 商品名称（用于回查页面原生价格文本）
   * @returns {{isStarting:boolean, current:number|null, priceText:string|null,
   *   origPrice:number|null, hasCurrent:boolean, rawCurrent:number|null, priceEqualsOrig:boolean}}
   */
  JDSUI._resolvePriceModel = function _resolvePriceModel(p, name) {
    const U = global.JDSUtils;
    const rawCurrent = (p && p.currentPrice != null) ? Number(p.currentPrice) : null;
    const hasCurrent = rawCurrent != null;
    const startPrice = (p && p.startPrice != null) ? Number(p.startPrice) : null;

    // 优先用 p-price 原文（DOM 提取存的值 / 实时回查页面原生卡片）
    const priceText = (p && p.priceText) ||
      (global.JDSDom && global.JDSDom.getProductPriceText
        ? global.JDSDom.getProductPriceText(name) : null);
    const hasPriceText = !!priceText;

    // 仅当没有任何当前价可显示时，才用起拍价并标注「起拍」
    const isStarting = !hasCurrent && !hasPriceText && startPrice != null && startPrice > 0;
    const current = isStarting ? startPrice
      : (hasCurrent ? rawCurrent : (hasPriceText ? null : U.getProductPrice(p)));

    // 划线原价（封顶/参考价）：京东拍拍接口对应 cappedPrice（页面 class=origin-price）
    const origPrice = (p && p.cappedPrice != null) ? Number(p.cappedPrice) : null;
    // 主价若与划线原价相同（说明主价是从 cappedPrice 封顶价回退而来），两者属同一价格，
    // 仅保留划线原价行，不再渲染主价格行以避免重复显示
    const priceEqualsOrig = origPrice != null && origPrice > 0 && current === origPrice;

    return { isStarting, current, priceText, origPrice, hasCurrent, rawCurrent, priceEqualsOrig };
  };

  /**
   * 构建主价格行元素：标签(起拍) → 货币符号 → 金额(整数.小数)
   * 拆成独立 span 便于各自样式化（小数字号更小）
   * @private
   * @param {Object} model - _resolvePriceModel 的返回值
   * @returns {HTMLElement}
   */
  JDSUI._buildPriceRow = function _buildPriceRow(model) {
    const U = global.JDSUtils;
    const priceEl = document.createElement('div');
    // 起拍价/现价：对齐京东原生语义 class .p-price（作用域隔离在 #jds-results-host 内，不污染页面）
    priceEl.className = 'p-price';

    const labelEl = document.createElement('span');
    labelEl.className = 'jds-price-label';
    // 标签容器：仅未开拍（无当前价）时显示「起拍」
    if (model.isStarting) labelEl.textContent = getMessage('priceStarting');

    const yenEl = document.createElement('span');
    yenEl.className = 'jds-price-yen';
    yenEl.textContent = '\u00A5';

    const amountEl = document.createElement('span');
    amountEl.className = 'jds-price-amount';

    // p-price 原文可能含 ¥/￥，剥离货币符号只留数值
    const amountStr = model.priceText
      ? model.priceText.replace(/^[\u00A5\uFFE5\s]+/, '').trim()
      : U.formatPrice(model.current);
    // 金额拆成三部分：整数 / 小数点 / 小数
    const m = /^(\d[\d,]*)([.,]?)(\d*)$/.exec(amountStr);
    const parts = [
      ['jds-price-int', m ? m[1] : amountStr],
      ['jds-price-dec-sep', m ? m[2] : ''],
      ['jds-price-dec', m ? m[3] : '']
    ];
    for (const [cls, text] of parts) {
      const el = document.createElement('span');
      el.className = cls;
      el.textContent = text;
      amountEl.appendChild(el);
    }

    priceEl.appendChild(labelEl);
    priceEl.appendChild(yenEl);
    priceEl.appendChild(amountEl);
    return priceEl;
  };

  /**
   * 构建划线原价行（灰色、划线、较小字号），与现价明显区分
   * @private
   * @param {Object} model - _resolvePriceModel 的返回值
   * @returns {HTMLElement}
   */
  JDSUI._buildOrigPriceRow = function _buildOrigPriceRow(model) {
    const U = global.JDSUtils;
    const sub = document.createElement('div');
    // 原价（封顶/参考价）：对齐京东原生语义 class .origin-price
    sub.className = 'origin-price';
    const origEl = document.createElement('span');
    // 仅显示 orig（无主价行）时去划线，作为唯一实际价格正常呈现；否则保留划线对比样式
    origEl.className = 'jds-product-orig' + (model.priceEqualsOrig ? ' jds-product-orig-only' : '');
    origEl.textContent = '\u00A5' + U.formatPrice(model.origPrice);
    sub.appendChild(origEl);
    return sub;
  };

  /**
   * 渲染拍卖时间行（.p-time 倒计时/结束时间），置于价格区顶部
   * 若文案含可解析的剩余时间，注册到全局倒计时计时器实现「跳动」（见 ./countdown.js）
   * @private
   * @param {HTMLElement} body - 卡片正文容器
   * @param {Object} p - 商品对象
   */
  JDSUI._renderTimeSection = function _renderTimeSection(body, p) {
    const timeText = (p.timeText != null && String(p.timeText).trim()) ? String(p.timeText).trim()
      : (p.endTime != null ? String(p.endTime) : '');
    if (!timeText) return;
    // 判断倒计时类型：结束倒计时（红）/ 开始倒计时（黄）
    const t = timeText.toLowerCase();
    let typeCls = 'is-ending'; // 默认按结束倒计时（红）呈现
    if (/(开始|开拍|距开|start)/.test(t)) typeCls = 'is-starting';
    else if (/(结束|截标|距结|end|close)/.test(t)) typeCls = 'is-ending';

    const timeEl = document.createElement('div');
    // 拍卖时间：对齐京东原生语义 class .p-time
    timeEl.className = 'p-time ' + typeCls;
    timeEl.id = 'jds-countdown-' + JDSUI._countdownSeq();
    const inner = document.createElement('span');
    inner.className = 'jds-product-time';
    inner.textContent = timeText;
    timeEl.appendChild(inner);

    // 客户端倒计时：解析剩余秒数并注册到单例计时器，实现每秒跳动
    if (global.JDSUI.Countdown) {
      global.JDSUI.Countdown.register(timeEl, timeText, typeCls);
    }
    body.appendChild(timeEl);
  };

  /**
   * 渲染商品卡的完整价格区（主价格行 + 划线原价行）到卡片正文
   * @private
   * @param {HTMLElement} body - 卡片正文容器
   * @param {Object} p - 商品对象
   * @param {string} name - 商品名称
   */
  JDSUI._renderPriceSection = function _renderPriceSection(body, p, name) {
    const U = global.JDSUtils;
    const model = this._resolvePriceModel(p, name);

    // 拍卖时间（.p-time）置于价格区顶部，优先于价格与出价人数展示
    this._renderTimeSection(body, p);

    // 现价行容器：将 .p-price（现价/起拍价）与 .origin-price（划线原价）放在同一行。
    // 不依赖 priceEqualsOrig——夺宝岛商品当前价常等于封顶价，若跳过会导致扩展卡片不显示 .p-price。
    const priceRow = document.createElement('div');
    priceRow.className = 'jds-product-price-row';
    const row = this._buildPriceRow(model);
    priceRow.appendChild(row);

    // 有封顶/原价且「不等于现价」时才额外展示划线原价 .origin-price（与主价同行），
    // priceEqualsOrig（原价==现价）时不再重复渲染，避免原价与主价冗余。
    if (model.origPrice != null && isFinite(model.origPrice) && model.origPrice > 0 &&
        (!model.hasCurrent || model.origPrice > model.rawCurrent)) {
      priceRow.appendChild(this._buildOrigPriceRow(model));
    }
    body.appendChild(priceRow);


    // 出价人数：与主价格行平级（独立于 priceEqualsOrig 分支之外），
    // 避免夺宝岛商品「当前价=封顶价」走仅划线原价分支时把出价人数一并吞掉。
    // .jds-price-int 严格承载现价整数，.jds-price-dec 严格承载现价小数，互不串味。
    const bidCount = U.getProductBidCount(p);
    if (bidCount > 0) {
      const meta = document.createElement('div');
      // 出价人数：对齐京东原生语义 class .note
      meta.className = 'note';
      const bidEl = document.createElement('span');
      bidEl.className = 'jds-product-bid';
      bidEl.textContent = bidCount + getMessage('bidCountSuffix');
      meta.appendChild(bidEl);
      body.appendChild(meta);
    }
  };
})(window);
