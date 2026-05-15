// JD-Auction-Search/src/ui.js v1.2.1
// UI渲染和事件绑定模块

(function(global) {
  'use strict';

  // 使用 JDSUtils 中的 getMessage 函数
  const getMessage = global.JDSUtils.getMessage;

  const JDSUI = {
    shadowRoot: null,
    emptyElement: null,

    /**
     * 渲染搜索UI
     * @param {Object} state - 应用状态
     * @param {Object} handlers - 事件处理函数
     */
    renderSearchUI(state, handlers) {
      const wrapper = document.createElement('div');
      wrapper.id = 'jds-search-wrapper';
      document.body.appendChild(wrapper);

      this.shadowRoot = wrapper.attachShadow({ mode: 'closed' });
      const container = document.createElement('div');
      container.className = 'jds-search-container';

      container.innerHTML = this._getUIMarkup();

      const style = document.createElement('style');
      style.textContent = this._getInlineStyles();
      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(container);

      this._bindEvents(container, state, handlers);

      return container;
    },

    /**
     * 获取UI HTML
     * @private
     * @returns {string}
     */
    _getUIMarkup() {
      return `
        <div class="jds-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>${getMessage('logoText')}</span>
        </div>
        <div class="jds-search-box">
          <input type="text" class="jds-search-input" placeholder="${getMessage('searchPlaceholder')}" />
          <button class="jds-clear-btn">×</button>
          <button class="jds-search-btn">${getMessage('searchButton')}</button>
        </div>
        <div class="jds-tabs">
          <button class="jds-tab active" data-tab="all">${getMessage('tabAll')}</button>
          <button class="jds-tab" data-tab="ongoing">${getMessage('tabOngoing')}</button>
          <button class="jds-tab" data-tab="upcoming">${getMessage('tabUpcoming')}</button>
        </div>
        <div class="jds-result-count">
          ${getMessage('resultCount', { count: '<strong class="jds-count">0</strong>' })}
        </div>
        <button class="jds-toggle-btn disabled">${getMessage('loading')}</button>
      `;
    },

    /**
     * 获取内联样式
     * @private
     * @returns {string}
     */
    _getInlineStyles() {
      return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `;
    },

    /**
     * 绑定UI事件
     * @private
     * @param {HTMLElement} container - UI容器
     * @param {Object} state - 应用状态
     * @param {Object} handlers - 事件处理函数
     */
    _bindEvents(container, state, handlers) {
      const input = container.querySelector('.jds-search-input');
      const clearBtn = container.querySelector('.jds-clear-btn');
      const searchBtn = container.querySelector('.jds-search-btn');
      const tabs = container.querySelectorAll('.jds-tab');
      const toggleBtn = container.querySelector('.jds-toggle-btn');

      // 搜索框输入
      input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        state.keyword = val;
        clearBtn.classList.toggle('visible', val.length > 0);
        handlers.onInput();
      });

      // 搜索框回车
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handlers.onSearch();
        }
      });

      // 清除按钮
      clearBtn.addEventListener('click', () => {
        input.value = '';
        state.keyword = '';
        clearBtn.classList.remove('visible');
        handlers.onClear();
      });

      // 搜索按钮
      searchBtn.addEventListener('click', () => {
        handlers.onSearch();
      });

      // Tab切换
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          state.currentTab = tab.dataset.tab;
          handlers.onTabChange();
        });
      });

      // 切换插件启用状态
      toggleBtn.addEventListener('click', () => {
        state.isEnabled = !state.isEnabled;
        toggleBtn.textContent = getMessage(state.isEnabled ? 'enabled' : 'disabled');
        toggleBtn.classList.toggle('disabled', !state.isEnabled);
        handlers.onToggle(state.isEnabled);
      });
    },

    /**
     * 更新搜索结果计数
     * @param {number} count - 结果数量
     */
    updateResultCount(count) {
      const countEl = this.shadowRoot && this.shadowRoot.querySelector('.jds-count');
      if (countEl) {
        countEl.textContent = count;
      }
    },

    /**
     * 更新Toggle按钮状态
     * @param {string} key - 翻译键或直接文本
     * @param {boolean} disabled - 是否禁用
     */
    updateToggleBtn(key, disabled = false) {
      const btn = this.shadowRoot && this.shadowRoot.querySelector('.jds-toggle-btn');
      if (btn) {
        // 检查是否是已知的翻译键
        const translationKeys = ['enabled', 'enabledLocal', 'disabled', 'loading'];
        const text = translationKeys.includes(key) ? getMessage(key) : key;
        btn.textContent = text;
        if (disabled) {
          btn.classList.add('disabled');
        } else {
          btn.classList.remove('disabled');
        }
      }
    },

    /**
     * 显示空状态
     */
    showEmptyState() {
      if (!this.emptyElement) {
        this.emptyElement = document.createElement('div');
        this.emptyElement.className = 'jds-empty-overlay';
        this.emptyElement.style.cssText = `
          position: fixed;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 60px 80px;
          text-align: center;
          z-index: 999998;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        `;
        this.emptyElement.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px;">${getMessage('emptyTitle')}</div>
          <div style="font-size: 14px; color: #999;">${getMessage('emptyDesc')}</div>
        `;
        document.body.appendChild(this.emptyElement);
      }
      this.emptyElement.style.display = '';
    },

    /**
     * 隐藏空状态
     */
    hideEmptyState() {
      if (this.emptyElement) {
        this.emptyElement.style.display = 'none';
      }
    },

    /**
     * 销毁UI
     */
    destroy() {
      const wrapper = document.getElementById('jds-search-wrapper');
      if (wrapper) wrapper.remove();
      if (this.emptyElement) {
        this.emptyElement.remove();
        this.emptyElement = null;
      }
      const toast = document.querySelector('.jds-toast');
      if (toast) toast.remove();
    }
  };

  global.JDSUI = JDSUI;
})(window);
