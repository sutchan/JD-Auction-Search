// src/content.js v1.1.1
// 内容脚本：拦截API、渲染搜索UI、过滤商品

(function() {
  'use strict';

  const translations = {
    'zh-CN': {
      logo: '夺宝搜索',
      placeholder: '输入商品关键词搜索...',
      tabAll: '全部',
      tabOngoing: '正在夺宝',
      tabUpcoming: '即将开始',
      resultCount: '共 {count} 件商品',
      enabled: '已启用',
      disabled: '已禁用',
      loading: '加载中',
      enabledLocal: '已启用(本地)',
      apiError: 'API异常',
      apiFailed: 'API加载失败，将依赖页面内容',
      emptyTitle: '未找到匹配商品',
      emptyDesc: '试试其他关键词，或清除筛选条件',
    },
    'en': {
      logo: 'Auction Search',
      placeholder: 'Search products...',
      tabAll: 'All',
      tabOngoing: 'Ongoing',
      tabUpcoming: 'Upcoming',
      resultCount: '{count} products found',
      enabled: 'Enabled',
      disabled: 'Disabled',
      loading: 'Loading',
      enabledLocal: 'Enabled (Local)',
      apiError: 'API Error',
      apiFailed: 'API failed, using page content',
      emptyTitle: 'No matching products',
      emptyDesc: 'Try different keywords or clear filters',
    }
  };

  const AuctionSearchEnhancer = {
    state: {
      products: [],
      filteredProducts: [],
      currentTab: 'all',
      keyword: '',
      isEnabled: true,
      isLoading: false,
      observer: null,
    },

    apiBaseUrl: 'https://1paipai.jd.com',

    t(key, params = {}) {
      const lang = translations[navigator.language] || translations['en'];
      let text = lang[key] || translations['en'][key] || key;
      Object.keys(params).forEach(k => {
        text = text.replace(`{${k}}`, params[k]);
      });
      return text;
    },

    init() {
      this.injectStyles();
      this.interceptApi();
      this.observeDOM();
      this.setupMessageListener();
      this.renderUI();
      console.log('[JD-Auction-Search] 插件已初始化');
    },

    injectStyles() {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('src/styles.css');
      (document.head || document.documentElement).appendChild(link);
    },

    interceptApi() {
      const origFetch = window.fetch;
      const self = this;

      window.fetch = async function(...args) {
        const [url, options] = args;
        const urlStr = typeof url === 'string' ? url : url.url || String(url);

        const res = await origFetch.apply(this, args);

        if (urlStr.includes('1paipai.jd.com') || urlStr.includes('paimai.jd.com')) {
          if (urlStr.includes('list') || urlStr.includes('auction')) {
            const clone = res.clone();
            clone.json().then(data => {
              self.handleApiResponse(data, urlStr);
            }).catch(() => {});
          }
        }

        return res;
      };

      const origXHROpen = XMLHttpRequest.prototype.open;
      const origXHRSend = XMLHttpRequest.prototype.send;
      const self2 = this;

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = url;
        return origXHROpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function() {
          try {
            const data = JSON.parse(this.responseText);
            if (self2.state.isEnabled) {
              self2.handleApiResponse(data, this._url);
            }
          } catch (e) {}
        });
        return origXHRSend.apply(this, args);
      };
    },

    handleApiResponse(data, url) {
      if (!data) return;

      let products = [];

      if (Array.isArray(data)) {
        products = data;
      } else if (data.data && Array.isArray(data.data)) {
        products = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        products = data.result;
      } else if (typeof data === 'object') {
        for (const key of ['list', 'products', 'items', 'auctions', 'goodsList']) {
          if (Array.isArray(data[key])) {
            products = data[key];
            break;
          }
        }
      }

      if (products.length > 0) {
        this.state.products = this.deduplicateProducts([
          ...this.state.products,
          ...products
        ]);
        this.applyFilter();
        this.updateProductDisplay();
        console.log(`[JD-Auction-Search] 已缓存 ${this.state.products.length} 个商品`);
      }
    },

    deduplicateProducts(products) {
      const seen = new Set();
      return products.filter(p => {
        const id = p.id || p.skuId || p.productId || p.auctionId;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },

    observeDOM() {
      const container = document.querySelector('[class*="auction"], [class*="product"], [class*="goods"]') ||
                        document.querySelector('.jd-paipai') ||
                        document.querySelector('#app') ||
                        document.querySelector('main') ||
                        document.body;

      this.state.observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            shouldUpdate = true;
            break;
          }
        }
        if (shouldUpdate && this.state.isEnabled) {
          this.updateProductDisplay();
        }
      });

      this.state.observer.observe(container, {
        childList: true,
        subtree: true
      });
    },

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.type) {
          case 'TOGGLE_ENABLED':
            this.state.isEnabled = request.enabled;
            if (!this.state.isEnabled) {
              this.shadowRoot?.querySelector('.jds-toggle-btn')?.classList.add('disabled');
              this.showToast(request.enabled ? this.t('enabled') : this.t('disabled'));
            } else {
              this.shadowRoot?.querySelector('.jds-toggle-btn')?.classList.remove('disabled');
              this.showToast(request.enabled ? this.t('enabled') : this.t('disabled'));
            }
            break;
          case 'PRODUCTS_UPDATE':
            this.state.products = request.products || [];
            this.applyFilter();
            this.updateProductDisplay();
            break;
        }
      });
    },

    renderUI() {
      const wrapper = document.createElement('div');
      wrapper.id = 'jds-search-wrapper';
      document.body.appendChild(wrapper);

      this.shadowRoot = wrapper.attachShadow({ mode: 'closed' });

      const container = document.createElement('div');
      container.className = 'jds-search-container';

      container.innerHTML = `
        <div class="jds-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>${this.t('logo')}</span>
        </div>
        <div class="jds-search-box">
          <input type="text" class="jds-search-input" placeholder="${this.t('placeholder')}" />
          <button class="jds-clear-btn">×</button>
          <button class="jds-search-btn">${this.t('tabAll')}</button>
        </div>
        <div class="jds-tabs">
          <button class="jds-tab active" data-tab="all">${this.t('tabAll')}</button>
          <button class="jds-tab" data-tab="ongoing">${this.t('tabOngoing')}</button>
          <button class="jds-tab" data-tab="upcoming">${this.t('tabUpcoming')}</button>
        </div>
        <div class="jds-result-count">
          ${this.t('resultCount', { count: '<strong class="jds-count">0</strong>' })}
        </div>
        <button class="jds-toggle-btn disabled">${this.t('loading')}</button>
      `;

      const style = document.createElement('style');
      style.textContent = this.getInlineStyles();
      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(container);

      this.bindUIEvents(container);
      this.state.container = container;

      setTimeout(() => this.autoLoadProducts(), 2000);
    },

    getInlineStyles() {
      return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `;
    },

    bindUIEvents(container) {
      const input = container.querySelector('.jds-search-input');
      const clearBtn = container.querySelector('.jds-clear-btn');
      const searchBtn = container.querySelector('.jds-search-btn');
      const tabs = container.querySelectorAll('.jds-tab');
      const toggleBtn = container.querySelector('.jds-toggle-btn');

      input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        this.state.keyword = val;
        clearBtn.classList.toggle('visible', val.length > 0);
        this.applyFilter();
        this.updateProductDisplay();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.applyFilter();
          this.updateProductDisplay();
        }
      });

      clearBtn.addEventListener('click', () => {
        input.value = '';
        this.state.keyword = '';
        clearBtn.classList.remove('visible');
        this.applyFilter();
        this.updateProductDisplay();
      });

      searchBtn.addEventListener('click', () => {
        this.applyFilter();
        this.updateProductDisplay();
      });

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.state.currentTab = tab.dataset.tab;
          this.applyFilter();
          this.updateProductDisplay();
        });
      });

      toggleBtn.addEventListener('click', () => {
        this.state.isEnabled = !this.state.isEnabled;
        toggleBtn.textContent = this.state.isEnabled ? this.t('enabled') : this.t('disabled');
        toggleBtn.classList.toggle('disabled', !this.state.isEnabled);
        this.showToast(this.state.isEnabled ? this.t('enabled') : this.t('disabled'));
      });
    },

    applyFilter() {
      let filtered = [...this.state.products];

      if (this.state.keyword) {
        const kw = this.state.keyword.toLowerCase();
        filtered = filtered.filter(p => {
          const name = (p.name || p.title || p.productName || '').toLowerCase();
          const id = String(p.id || p.skuId || p.productId || '');
          return name.includes(kw) || id.includes(kw);
        });
      }

      switch (this.state.currentTab) {
        case 'ongoing':
          filtered = filtered.filter(p => p.status === 1 || p.state === 'ongoing' || p.auctionStatus === 1);
          break;
        case 'upcoming':
          filtered = filtered.filter(p => p.status === 0 || p.state === 'upcoming' || p.auctionStatus === 0);
          break;
      }

      this.state.filteredProducts = filtered;
      this.updateResultCount();
    },

    updateResultCount() {
      const container = this.shadowRoot?.querySelector('.jds-result-count');
      if (container) {
        container.innerHTML = this.t('resultCount', { count: `<strong class="jds-count">${this.state.filteredProducts.length}</strong>` });
      }
    },

    updateProductDisplay() {
      const productContainers = document.querySelectorAll('[class*="auction-item"], [class*="product-item"], [class*="goods-item"], [class*="item"]');

      if (this.state.filteredProducts.length === 0 && this.state.keyword) {
        this.showEmptyState();
        return;
      }

      this.hideEmptyState();

      if (productContainers.length === 0) return;

      if (!this.state.keyword) return;

      productContainers.forEach((el, idx) => {
        const product = this.state.filteredProducts[idx];
        if (!product) {
          el.style.display = 'none';
          return;
        }

        const name = product.name || product.title || product.productName || '';
        if (!name.toLowerCase().includes(this.state.keyword.toLowerCase())) {
          el.style.display = 'none';
        } else {
          el.style.display = '';
        }
      });
    },

    showEmptyState() {
      let empty = this.shadowRoot?.querySelector('.jds-empty-overlay');
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'jds-empty-overlay';
        empty.innerHTML = `
          <div class="jds-empty-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <div class="jds-empty-title">${this.t('emptyTitle')}</div>
          <div class="jds-empty-desc">${this.t('emptyDesc')}</div>
        `;
        this.shadowRoot?.appendChild(empty);
      }
      empty.style.display = '';
    },

    hideEmptyState() {
      this.shadowRoot?.querySelector('.jds-empty-overlay')?.style.setProperty('display', 'none');
    },

    async autoLoadProducts() {
      const toggleBtn = this.shadowRoot?.querySelector('.jds-toggle-btn');
      if (!toggleBtn) return;

      try {
        const resp = await fetch(`${this.apiBaseUrl}/auction/list?page=1&pageSize=50&tab=all`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Referer': 'https://1paipai.jd.com/auction-list/',
          }
        });

        if (resp.ok) {
          const data = await resp.json();
          this.handleApiResponse(data, 'auto-load');
          toggleBtn.textContent = this.t('enabled');
          toggleBtn.classList.remove('disabled');
          this.state.isEnabled = true;
        } else {
          toggleBtn.textContent = this.t('apiError');
          this.state.isEnabled = false;
        }
      } catch (e) {
        console.warn('[JD-Auction-Search] API加载失败，将依赖页面内容', e);
        toggleBtn.textContent = this.t('enabledLocal');
        toggleBtn.classList.remove('disabled');
        this.extractProductsFromDOM();
      }
    },

    extractProductsFromDOM() {
      const selectors = [
        '[class*="auction"] [class*="name"]',
        '[class*="product"] [class*="title"]',
        '[class*="goods"] [class*="name"]',
        '[class*="item"] h3',
        '[class*="card"] h4',
      ];

      const products = [];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 2 && text.length < 200) {
            products.push({ name: text, title: text, id: Math.random().toString(36).slice(2) });
          }
        });
      });

      if (products.length > 0) {
        this.state.products = this.deduplicateProducts(products);
        this.applyFilter();
        console.log(`[JD-Auction-Search] 从DOM提取了 ${products.length} 个商品`);
      }
    },

    showToast(message) {
      let toast = this.shadowRoot?.querySelector('.jds-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'jds-toast';
        this.shadowRoot?.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    },

    destroy() {
      this.state.observer?.disconnect();
      document.getElementById('jds-search-wrapper')?.remove();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuctionSearchEnhancer.init());
  } else {
    AuctionSearchEnhancer.init();
  }

  window.JDAuctionSearch = AuctionSearchEnhancer;
})();
