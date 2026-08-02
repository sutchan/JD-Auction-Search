// JD-Auction-Search/src/content/enhancer.js v1.5.0
// 主增强器：状态、初始化、生命周期与页面类型判断

(function (global) {
  'use strict';

  const JDSContent = global.JDSContent = global.JDSContent || {};

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
      // 幂等守卫：SPA 局部刷新或重复调用时避免重复挂载 UI / 重复包裹 fetch，
      // 否则拦截逻辑会嵌套执行两次（重复捕获、双份 _handleApiResponse）
      if (this._inited) {
        return;
      }
      this._inited = true;

      // 注入样式
      JDSUtils.injectStyles('src/styles.css');

      // 渲染UI
      JDSUI.renderSearchUI(this.state, {
        onInput: () => this._applyFilterAndUpdate(),
        onSearch: () => this._applyFilterAndUpdate(),
        onClear: () => this._applyFilterAndUpdate()
      });

      // 拦截API
      JDSApi.interceptApi(this.state, (data) => this._handleApiResponse(data));

      // 观察DOM变化
      JDSDom.observeDOM(this.state, () => {
        // 搜索模式下原生列表已隐藏，结果由面板渲染，跳过原生显示更新
        if (this.state.searchMode) return;
        JDSDom.updateProductDisplay(this.state);
      });

      // 标记全局加载中：加载完成前进入搜索态展示骨架屏（见 _autoLoadProducts）
      this.state.isLoading = true;

      // 自动加载商品：延迟 2000ms 等待页面列表接口就绪后再做分页重放
      // （页面初始脚本较慢，过早请求可能拿不到真实请求模板）
      this._autoLoadTimer = setTimeout(() => this._autoLoadProducts(), 2000);
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
     * 销毁应用
     */
    destroy() {
      this._inited = false;
      if (this._autoLoadTimer) { clearTimeout(this._autoLoadTimer); this._autoLoadTimer = null; }
      JDSDom.stopObservation();
      JDSUI.destroy();
      JDSApi.restoreApi();
    }
  };

  JDSContent.AuctionSearchEnhancer = AuctionSearchEnhancer;
})(window);
