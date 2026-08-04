// JD-Auction-Search/src/content/deep-search.js v1.5.5
// 深度后台搜索：合并新商品、自动加载（分页重放 + 排序维度深搜 + 边搜边显）
// 搜索编排（过滤/渲染/状态切换）见 ./search.js

(function (global) {
  'use strict';

  const JDSContent = global.JDSContent = global.JDSContent || {};
  const enhancer = JDSContent.AuctionSearchEnhancer;
  if (!enhancer) return;

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
   * 自动加载商品（后台深度搜索，分片续搜）
   * 优先用页面真实请求做分页重放，并开启「排序维度深搜」聚合更多不同商品；
   * 每翻完一页即通过 onPage 回调把新命中增量合并并刷新结果面板（边搜边显）；
   * 若一片翻满仍未到末页，则后台继续下一片续搜，直到真正到达末页或达全局上限
   * （实现「显示当前结果的同时，后台持续搜索更多页面的商品」）。
   * @private
   */
  enhancer._autoLoadProducts = async function () {
    const isDetail = this._isDetailPage();
    // 标记全局加载中；终点分支负责复位，详情页重试期间保持 true 以展示骨架屏
    this.state.isLoading = true;
    this.state._loadingAll = true;
    const pageProgress = (prog) => {
      // 本页新商品增量合并到全局数据，并即时刷新结果面板（当前搜索结果持续显示、数量增长）
      if (prog.items && prog.items.length) this._mergeProducts(prog.items);
      if (this.state.searchMode) {
        this._applyFilterAndUpdate();
      } else {
        // 浏览态：更新工具栏计数（无需重渲染结果面板）
        JDSUI.updateResultCount(this.state.products.length);
      }
    };
    try {
      // 分片续搜：每片最多 CHUNK 页；一片翻满未到末页则继续下一片，直到末页或全局上限
      const CHUNK = 20;        // 单片最大翻页次数（减少单次循环占用）
      const GLOBAL_MAX = 200;  // 全局续搜上限（防止接口无末页标记时无限续搜）
      let fromPage = 1;
      let finished = false;
      let items = null;
      while (!finished && fromPage <= GLOBAL_MAX) {
        // 优先用页面真实请求做分页重放（多页面搜索的数据基础）
        const res = await JDSApi.loadAllProducts({ deep: true, fromPage, onPage: pageProgress }, CHUNK);
        items = res.items;
        finished = res.finished;
        fromPage = res.page + 1;
        // 无模板/无法分页（items 为 null）：立即结束，交由下方降级
        if (items === null) break;
        // 本片未聚合到任何商品（应已到末页）：终止续搜
        if (!items.length) { finished = true; break; }
      }

      if (items && items.length > 0) {
        this.state.products = JDSUtils.deduplicateProducts(items);
        // 真正到达末页才标记全量就绪（finished）；否则保留「加载中」提示由外层刷新
        if (finished) {
          this.state._allLoaded = true;
          this.state.isLoading = false;
          JDSUI.setLoadingHint(false);
        }
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
      // 仅当「真正全量成功聚合」时标记完成（_allLoaded=true），此后不再触发整页重放；
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
