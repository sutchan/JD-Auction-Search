// JD-Auction-Search/src/content.js v1.3.5
// 主模块：整合所有功能

(function() {
  'use strict';

  const AuctionSearchEnhancer = {
    state: {
      products: [],
      filteredProducts: [],
      keyword: '',
      isLoading: false,
      searchMode: false
    },

    /**
     * 初始化应用
     */
    init() {
      // 注入样式
      JDSUtils.injectStyles('src/styles.css');

      // 渲染UI
      JDSUI.renderSearchUI(this.state, {
        onInput: () => this._applyFilterAndUpdate(),
        onSearch: () => this._applyFilterAndUpdate(),
        onClear: () => this._applyFilterAndUpdate()
      });

      // 拦截API
      JDSApi.interceptApi(this.state, (data, url) => this._handleApiResponse(data, url));

      // 观察DOM变化
      JDSDom.observeDOM(this.state, () => {
        // 搜索模式下原生列表已隐藏，结果由面板渲染，跳过原生显示更新
        if (this.state.searchMode) return;
        JDSDom.updateProductDisplay(this.state);
      });

      // 自动加载商品
      setTimeout(() => this._autoLoadProducts(), 2000);
    },

    /**
     * 处理API响应
     * @private
     */
    _handleApiResponse(data, url) {
      const products = JDSUtils.extractProductsFromResponse(data);

      if (products.length > 0) {
        this.state.products = JDSUtils.deduplicateProducts([
          ...this.state.products,
          ...products
        ]);
        this._applyFilterAndUpdate();
      }
    },

    /**
     * 是否处于商品详情页（/auction-detail）
     * 详情页搜索须基于全局聚合数据，禁止回退“当前页 DOM”搜索
     * @private
     * @returns {boolean}
     */
    _isDetailPage() {
      return /auction-detail/i.test(location.pathname) || /auction-detail/i.test(location.href);
    },

    /**
     * 应用过滤器并更新
     * @private
     */
    _applyFilterAndUpdate() {
      // 兜底：搜索时若尚无商品数据，先尝试从当前 DOM 提取，确保有结果可搜
      // 商品详情页（/auction-detail）不做当前页 DOM 兜底，避免“只搜当前页”，
      // 详情页搜索统一基于全局聚合数据 state.products，保持与列表页一致的全局搜索
      if (this.state.products.length === 0 && !this._isDetailPage()) {
        const domProducts = JDSDom.extractProductsFromDOM();
        if (domProducts.length) {
          this.state.products = JDSUtils.deduplicateProducts(domProducts);
        }
      }

      this._applyFilter();
      const filtered = this.state.filteredProducts;

      // 是否处于筛选态（有搜索关键词即进入搜索模式）
      const hasFilter = !!this.state.keyword;

      if (hasFilter) {
        // 跨页搜索模式：基于聚合全部分页数据渲染结果面板，隐藏原生列表
        this.state.searchMode = true;
        JDSDom.hideNativeProducts();
        JDSUI.showResults(filtered);
      } else {
        // 浏览模式：恢复原生列表，隐藏结果面板
        this.state.searchMode = false;
        JDSDom.showNativeProducts();
        JDSUI.hideResults();
      }
    },

    /**
     * 过滤商品
     * @private
     */
    _applyFilter() {
      let filtered = [...this.state.products];

      if (this.state.keyword) {
        const kw = this.state.keyword.toLowerCase();
        filtered = filtered.filter(p => {
          const name = JDSUtils.getProductName(p).toLowerCase();
          const id = String(JDSUtils.getProductId(p) || '');
          return name.includes(kw) || id.includes(kw);
        });
      }

      this.state.filteredProducts = filtered;
    },

    /**
     * 自动加载商品
     * @private
     */
    async _autoLoadProducts() {
      const isDetail = this._isDetailPage();
      try {
        // 优先用页面真实请求做分页重放（多页面搜索的数据基础）
        const products = await JDSApi.loadAllProducts();
        if (products && products.length > 0) {
          this.state.products = JDSUtils.deduplicateProducts(products);
          this._applyFilterAndUpdate();
          return;
        }
      } catch (e) {
        // 跨页API加载失败，进入下方降级逻辑（DOM 提取兜底）
      }

      // 已有全局数据（拦截器增量捕获），直接刷新展示
      if (this.state.products.length > 0) {
        this._applyFilterAndUpdate();
        return;
      }

      if (isDetail) {
        // 详情页：保持全局一致，严禁回退“搜索当前页”。
        // 相关拍卖等列表接口可能较晚到达，延时重试一次以拿到全局数据；
        // 仍无则静默留空（与全局搜索一致的空态），不弹错误也不抓当前页 DOM。
        if (!this._detailRetry) {
          this._detailRetry = true;
          setTimeout(() => this._autoLoadProducts(), 1500);
        }
        return;
      }

      // 列表页降级：拦截器已捕获到首页数据则直接用；否则从当前 DOM 提取
      JDSUtils.showToast('toastApiFailed');
      const domProducts = JDSDom.extractProductsFromDOM();
      if (domProducts.length > 0) {
        this.state.products = JDSUtils.deduplicateProducts(domProducts);
      }
      this._applyFilterAndUpdate();
    },

    /**
     * 销毁应用
     */
    destroy() {
      JDSDom.stopObservation();
      JDSUI.destroy();
    }
  };

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuctionSearchEnhancer.init());
  } else {
    AuctionSearchEnhancer.init();
  }

  window.JDAuctionSearch = AuctionSearchEnhancer;
})();
