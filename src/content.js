// JD-Auction-Search/src/content.js v1.2.14
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
      console.log('[JD-Auction-Search] 插件初始化中...');

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

      // 监听扩展消息
      this._setupMessageListener();

      // 自动加载商品
      setTimeout(() => this._autoLoadProducts(), 2000);

      console.log('[JD-Auction-Search] 插件已初始化');
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
        console.log(`[JD-Auction-Search] 已缓存 ${this.state.products.length} 个商品`);
      }
    },

    /**
     * 应用过滤器并更新
     * @private
     */
    _applyFilterAndUpdate() {
      // 兜底：搜索时若尚无商品数据，先尝试从当前 DOM 提取，确保有结果可搜
      if (this.state.products.length === 0) {
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
      try {
        // 优先用页面真实请求做分页重放（多页面搜索的数据基础）
        const products = await JDSApi.loadAllProducts();
        if (products && products.length > 0) {
          this.state.products = JDSUtils.deduplicateProducts(products);
          this._applyFilterAndUpdate();
          console.log(`[JD-Auction-Search] 已聚合 ${this.state.products.length} 个商品（跨页）`);
          return;
        }
      } catch (e) {
        console.warn('[JD-Auction-Search] 跨页API加载失败，准备降级:', e && e.message);
      }

      // 降级策略：拦截器已捕获到首页数据则直接用；否则从当前 DOM 提取
      if (this.state.products.length === 0) {
        JDSUtils.showToast('toastApiFailed');
        const domProducts = JDSDom.extractProductsFromDOM();
        if (domProducts.length > 0) {
          this.state.products = JDSUtils.deduplicateProducts(domProducts);
        }
      }
      this._applyFilterAndUpdate();
    },

    /**
     * 设置消息监听
     * @private
     */
    _setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.type) {
          case 'PRODUCTS_UPDATE':
            this.state.products = request.products || [];
            this._applyFilterAndUpdate();
            break;
        }
      });
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
