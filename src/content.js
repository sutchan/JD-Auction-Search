// JD-Auction-Search/src/content.js v1.2.2
// 主模块：整合所有功能

(function() {
  'use strict';

  const AuctionSearchEnhancer = {
    state: {
      products: [],
      filteredProducts: [],
      currentTab: 'all',
      keyword: '',
      isEnabled: true,
      isLoading: false
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
        onClear: () => this._applyFilterAndUpdate(),
        onTabChange: () => this._applyFilterAndUpdate(),
        onToggle: (enabled) => this._handleToggle(enabled)
      });

      // 拦截API
      JDSApi.interceptApi(this.state, (data, url) => this._handleApiResponse(data, url));

      // 观察DOM变化
      JDSDom.observeDOM(this.state, () => {
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
      this._applyFilter();
      JDSUI.updateResultCount(this.state.filteredProducts.length);

      if (this.state.filteredProducts.length === 0 && this.state.keyword) {
        JDSUI.showEmptyState();
      } else {
        JDSUI.hideEmptyState();
        JDSDom.updateProductDisplay(this.state);
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

      switch (this.state.currentTab) {
        case 'ongoing':
          filtered = filtered.filter(p => JDSUtils.isOngoing(p));
          break;
        case 'upcoming':
          filtered = filtered.filter(p => JDSUtils.isUpcoming(p));
          break;
      }

      this.state.filteredProducts = filtered;
    },

    /**
     * 处理切换启用/禁用
     * @private
     */
    _handleToggle(enabled) {
      JDSUtils.showToast(enabled ? 'toastEnabled' : 'toastDisabled');
      JDSUI.setToolbarEnabled(enabled);

      if (enabled) {
        this._applyFilterAndUpdate();
      } else {
        JDSUI.hideEmptyState();
        // 恢复所有商品显示
        JDSDom.updateProductDisplay({...this.state, isEnabled: false});
      }
    },

    /**
     * 自动加载商品
     * @private
     */
    async _autoLoadProducts() {
      try {
        const data = await JDSApi.loadProductList();
        this._handleApiResponse(data, 'auto-load');
        JDSUI.updateToggleBtn('enabled', false);
        this.state.isEnabled = true;
      } catch (e) {
        let errMsg = (e && e.message) ? e.message : String(e);
        JDSUtils.showToast('toastApiFailed');
        JDSUI.updateToggleBtn('enabledLocal', false);

        let domProducts = JDSDom.extractProductsFromDOM();
        if (domProducts.length > 0) {
          this.state.products = JDSUtils.deduplicateProducts(domProducts);
          this._applyFilterAndUpdate();
          console.log('[JD-Auction-Search] 从DOM提取了 ' + domProducts.length + ' 个商品');
        }
      }
    },

    /**
     * 设置消息监听
     * @private
     */
    _setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.type) {
          case 'TOGGLE_ENABLED':
            this._handleToggle(request.enabled);
            break;
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
