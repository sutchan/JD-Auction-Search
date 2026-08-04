// JD-Auction-Search/src/content/search.js v1.5.5
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
        JDSUI.showLoading();
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

  /**
   * 合并新商品到 state.products（去重），供后台增量刷新复用
   * @private
   * @param {Array} products - 新增商品数组
   */
  enhancer._mergeProducts = function (products) {
    if (!products || !products.length) return;
    this.state.products = JDSUtils.deduplicateProducts([
      ...this.state.products,
      ...products
    ]);
  };

  /**
   * 自动加载商品（后台深度搜索）
   * 优先用页面真实请求做分页重放，并开启「排序维度深搜」聚合更多不同商品；
   * 每翻完一页即通过 onPage 回调把新命中增量合并并刷新结果面板（边搜边显）。
   * @private
   */
  enhancer._autoLoadProducts = async function () {
    const isDetail = this._isDetailPage();
    // 标记全局加载中；终点分支负责复位，详情页重试期间保持 true 以展示骨架屏
    this.state.isLoading = true;
    this.state._loadingAll = true;
    try {
      // 优先用页面真实请求做分页重放（多页面搜索的数据基础）
      // onPage 每聚合一页即增量合并+刷新，实现「边显示当前结果、边后台搜更多页」
      const products = await JDSApi.loadAllProducts({
        deep: true,
        onPage: (prog) => {
          // 本页新商品增量合并到全局数据，并即时刷新结果面板（当前搜索结果持续显示、数量增长）
          if (prog.items && prog.items.length) this._mergeProducts(prog.items);
          if (this.state.searchMode) {
            this._applyFilterAndUpdate();
          } else {
            // 浏览态：更新工具栏计数（无需重渲染结果面板）
            JDSUI.updateResultCount(this.state.products.length);
          }
        }
      });
      if (products && products.length > 0) {
        this.state.products = JDSUtils.deduplicateProducts(products);
        // 全量加载成功：标记已就绪，后续搜索不再重复触发整页重放
        this.state._allLoaded = true;
        this.state.isLoading = false;
        JDSUI.setLoadingHint(false);
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
      // 结束本次加载过程（_loadingAll 复位，单飞 Promise 由调用处 .then 清空）
      this.state._loadingAll = false;
      // 仅在「真正全量成功聚合」时标记完成（_allLoaded=true），此后不再触发整页重放；
      // 失败/未拿到数据时【不】置完成标志，允许拦截器后续捕获到模板或首页数据后
      // 由 _handleApiResponse → _applyFilterAndUpdate 再次触发全量重放（受 _loadRetries<3 限制），
      // 避免首轮因模板未就绪/接口慢而失败 → 永久用残缺数据渲染（搜索结果不全）。
      if (!this.state._allLoaded) {
        this._loadRetries = (this._loadRetries || 0) + 1;
        this.state.isLoading = false;
      }
    }
  };
})(window);
