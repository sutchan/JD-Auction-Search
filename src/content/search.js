// JD-Auction-Search/src/content/search.js v1.5.2
// 搜索编排：API 响应处理、过滤与跨页自动加载

(function (global) {
  'use strict';

  const JDSContent = global.JDSContent = global.JDSContent || {};
  const enhancer = JDSContent.AuctionSearchEnhancer;

  /**
   * 处理API响应
   * @private
   */
  enhancer._handleApiResponse = function (data) {
    const products = JDSUtils.extractProductsFromResponse(data);

    if (products.length > 0) {
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
      }
    }

    this._applyFilter();
    const filtered = this.state.filteredProducts;

    // 实时刷新工具栏匹配计数（浏览态归零）
    JDSUI.updateResultCount(filtered.length);

    // 是否处于筛选态（有搜索关键词即进入搜索模式）
    const hasFilter = !!this.state.keyword;

    if (hasFilter) {
      // 跨页搜索模式：基于聚合全部分页数据渲染结果面板，隐藏原生列表
      this.state.searchMode = true;
      JDSDom.hideNativeProducts();
      // 全量数据尚未就绪：先触发一次全量加载（完成后会重新进入本函数渲染），
      // 避免搜索只命中已加载的首页数据而漏掉后续页
      if (!this.state._allLoaded && !this.state._loadingAll && (this._loadAttempts || 0) < 2) {
        JDSUI.showLoading();
        this._autoLoadProducts();
        return;
      }
      if (filtered.length === 0 && this.state.isLoading) {
        // 全局商品仍在加载（如详情页延时抓取），先展示骨架屏而非空态
        JDSUI.showLoading();
      } else {
        JDSUI.showResults(filtered);
      }
    } else {
      // 浏览模式：恢复原生列表，隐藏结果面板
      this.state.searchMode = false;
      JDSDom.showNativeProducts();
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

  /**
   * 自动加载商品
   * @private
   */
  enhancer._autoLoadProducts = async function () {
    const isDetail = this._isDetailPage();
    // 标记全局加载中；终点分支负责复位，详情页重试期间保持 true 以展示骨架屏
    this.state.isLoading = true;
    this.state._loadingAll = true;
    // 全量重放尝试计数：限制重试次数，避免模板缺失（如 JSONP 接口）时无限重放
    this._loadAttempts = (this._loadAttempts || 0) + 1;
    try {
      // 优先用页面真实请求做分页重放（多页面搜索的数据基础）
      const products = await JDSApi.loadAllProducts();
      if (products && products.length > 0) {
        this.state.products = JDSUtils.deduplicateProducts(products);
        // 全量加载成功：标记已就绪，后续搜索不再重复触发整页重放
        this.state._allLoaded = true;
        this.state.isLoading = false;
        this._applyFilterAndUpdate();
        return;
      }

      // 已有全局数据（拦截器增量捕获），直接刷新展示
      if (this.state.products.length > 0) {
        this.state.isLoading = false;
        this._applyFilterAndUpdate();
        return;
      }

      if (isDetail) {
        // 详情页：保持全局一致，严禁回退“搜索当前页”。
        // 相关拍卖等列表接口可能较晚到达，延时重试一次以拿到全局数据；
        // 仍无则展示空态（与全局搜索一致的空态），不弹错误也不抓当前页 DOM。
        if (!this._detailRetry) {
          this._detailRetry = true;
          // 详情页相关拍卖列表接口可能较晚到达：延时 1500ms 重试一次以拿到全局数据
          setTimeout(() => this._autoLoadProducts(), 1500);
          // 重试进行中：保持 isLoading=true（搜索态将看到骨架屏），先刷新一次展示
          this._applyFilterAndUpdate();
          return;
        }
        // 重试后仍无全局数据：复位加载态并展示空态，避免白屏无反馈
        this.state.isLoading = false;
        this._applyFilterAndUpdate();
        return;
      }

      // 列表页降级：拦截器已捕获到首页数据则直接用；否则从当前 DOM 提取
      JDSUtils.showToast('toastApiFailed');
      const domProducts = JDSDom.extractProductsFromDOM();
      if (domProducts.length > 0) {
        this.state.products = JDSUtils.deduplicateProducts(domProducts);
      }
      this.state.isLoading = false;
      this._applyFilterAndUpdate();
    } catch (e) {
      // 跨页API加载失败：复位标志并刷新（降级由上方 DOM 提取兜底）
      this.state.isLoading = false;
      this._applyFilterAndUpdate();
    } finally {
      // 无论成功/失败/重试，结束本次加载过程（_allLoaded 仅在真正全量成功时置位）
      this.state._loadingAll = false;
    }
  };
})(window);
