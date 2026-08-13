// JD-Auction-Search/src/content/search.js v1.6.8
// 搜索编排：API 响应处理、过滤与跨页自动加载

(function (global) {
  'use strict';

  const JDSContent = global.JDSContent = global.JDSContent || {};
  // 判空：enhancer.js 未加载时 JDSContent.AuctionSearchEnhancer 为 undefined，
  // 直接挂载方法会抛 TypeError；判空后本模块保持无害（后续 init 时由 content.js 兜底告警）
  const enhancer = JDSContent.AuctionSearchEnhancer;
  if (!enhancer) return;

  /**
   * 处理API响应
   * @private
   */
  enhancer._handleApiResponse = function (data) {
    const products = JDSUtils.extractProductsFromResponse(data);

    if (products.length > 0) {
      // 拦截器增量捕获到数据：清除先前的「加载失败」标记，恢复正常展示
      this.state._apiFailed = false;
      this.state.products = JDSUtils.deduplicateProducts([
        ...this.state.products,
        ...products
      ]);
      // 仅在搜索态（结果面板接管）时才即时刷新；浏览态由原生列表展示，避免每帧冗余重渲染
      if (this.state.searchMode) this._applyFilterAndUpdate();
    }
  };

  /**
   * 应用过滤器并更新
   * @private
   */
  enhancer._applyFilterAndUpdate = function () {
    // 兜底：搜索时若尚无商品数据，先尝试从当前 DOM 提取，确保有结果可搜
    // 商品详情页（/auction-detail）不做当前页 DOM 兜底，避免“只搜当前页”，
    // 详情页搜索统一基于全局聚合数据 state.products，保持与列表页一致的全局搜索
    if (this.state.products.length === 0 && !this._isDetailPage()) {
      const domProducts = JDSDom.extractProductsFromDOM();
      if (domProducts.length) {
        this.state.products = JDSUtils.deduplicateProducts(domProducts);
        // DOM 兜底成功拿到数据：清除先前的「加载失败」标记，恢复正常展示
        this.state._apiFailed = false;
      }
    }

    this._applyFilter();
    const filtered = this.state.filteredProducts;

    // 实时刷新工具栏匹配计数（浏览态归零）
    JDSUI.updateResultCount(filtered.length);

    // 是否处于筛选态（有搜索关键词即进入搜索模式）
    const hasFilter = !!this.state.keyword;

    if (hasFilter) {
      // 跨页搜索模式：基于聚合全部分页数据渲染结果面板
      // 注意：不再把原生列表 display:none（旧实现）。京东为虚拟列表/懒加载，
      // 整个列表容器被 display:none 期间会卸载卡片，恢复 display 后京东也常不自动重绘，
      // 导致「清除搜索后原生列表空白、商品不恢复」。改为仅用结果面板（fixed 白底覆盖层）
      // 遮挡原生列表，原生列表始终存活、京东持续维护，清除搜索后面板隐藏即天然恢复。
      this.state.searchMode = true;

      // 先立即用「当前已聚合的商品」渲染结果（首屏数据即可搜），
      // 避免卡在骨架屏等待全量分页加载完成才显示，导致接口慢/失败时结果长期不显示。
      // 全量加载完成后会重新进入本函数刷新为完整命中结果。
      if (this.state.products.length > 0) {
        JDSUI.showResults(filtered);
        // 全量分页仍在进行（尚未成功聚合全部）：提示当前展示的是部分结果，
        // 后续页还在加载，避免用户误以为「已全部搜完」而漏看更多命中
        if (!this.state._allLoaded) {
          JDSUI.setLoadingHint(true, this.state.products.length);
        } else {
          JDSUI.setLoadingHint(false);
        }
      } else {
        // 无商品数据可渲染：若此前接口已彻底失败（重试耗尽且无任何数据），
        // 展示失败空态而非一直挂骨架屏；否则展示骨架屏等待后续接口恢复。
        if (this.state._apiFailed) {
          JDSUI.showEmptyState();
        } else {
          JDSUI.showLoading();
        }
      }

      // 后台继续全量加载（单飞，避免多次搜索并发重入）：
      // 完成后会重新进入本函数渲染，避免搜索只命中已加载的首页数据而漏掉后续页。
      // 仅在「尚未成功全量聚合」( !_allLoaded ) 且「无进行中加载」时触发；
      // 不依赖「成败都置位」的标志，否则首次全量加载失败（模板未就绪/接口慢）后
      // 后续捕获到模板或首页数据也不会重试 → 只渲染残缺的 state.products → 结果不全。
      // _loadRetries 限制真实重放次数上限（最多 3 次），防止模板永久缺失时无限重放。
      if (!this.state._allLoaded && !this._loadPromise && (this._loadRetries || 0) < 3) {
        this._loadPromise = this._autoLoadProducts()
          .catch(() => {})
          .then(() => { this._loadPromise = null; });
      }
    } else {
      // 浏览模式：退出搜索态、隐藏结果面板。
      // 原生列表始终存活（搜索态仅被结果面板覆盖层遮挡，从未 display:none），
      // 隐藏面板后即天然恢复显示，无需额外 showNativeProducts，彻底规避
      // 「清除搜索后原生列表空白/不恢复」的虚拟列表卸载问题。
      this.state.searchMode = false;
      JDSUI.hideResults();
    }
  };

  /**
   * 过滤商品
   * @private
   */
  enhancer._applyFilter = function () {
    let filtered = [...this.state.products];

    if (this.state.keyword) {
      const kw = this.state.keyword.toLowerCase();
      filtered = filtered.filter(p => {
        const name = JDSUtils.getProductName(p).toLowerCase();
        const id = String(JDSUtils.getProductId(p) || '');
        // 扩展匹配字段：名称/ID/分类名/店铺名/副标题，提升搜索召回（如搜"数码""某店铺"）
        const category = String(p.categoryName || p.catName || p.category || '').toLowerCase();
        const shop = String(p.shopName || p.storeName || p.shop || '').toLowerCase();
        const subTitle = String(p.subTitle || p.skuName || p.skuTitle || '').toLowerCase();
        return name.includes(kw) || id.includes(kw) ||
          category.includes(kw) || shop.includes(kw) || subTitle.includes(kw);
      });
    }

    this.state.filteredProducts = filtered;
  };

  // 深度后台搜索（合并/自动加载/边搜边显）见 ./deep-search.js
})(window);
