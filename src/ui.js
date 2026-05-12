// JD-Auction-Search/src/ui.js v1.2.0
// UI渲染和事件绑定模块

(function(global) {
  'use strict';

  const JDSUI = {
    shadowRoot: null,

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
          <span>夺宝搜索</span>
        </div>
        <div class="jds-search-box">
          <input type="text" class="jds-search-input" placeholder="输入商品关键词搜索..." />
          <button class="jds-clear-btn">×</button>
          <button class="jds-search-btn">搜索</button>
        </div>
        <div class="jds-tabs">
          <button class="jds-tab active" data-tab="all">全部</button>
          <button class="jds-tab" data-tab="ongoing">正在夺宝</button>
          <button class="jds-tab" data-tab="upcoming">即将开始</button>
        </div>
        <div class="jds-result-count">
          共 <strong class="jds-count">0</strong> 件商品
        </div>
        <button class="jds-toggle-btn disabled">加载中</button>
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
        toggleBtn.textContent = state.isEnabled ? '已启用' : '已禁用';
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
     * @param {string} text - 按钮文本
     * @param {boolean} disabled - 是否禁用
     */
    updateToggleBtn(text, disabled = false) {
      const btn = this.shadowRoot && this.shadowRoot.querySelector('.jds-toggle-btn');
      if (btn) {
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
      let empty = this.shadowRoot && this.shadowRoot.querySelector('.jds-empty-overlay');
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'jds-empty-overlay';
        empty.style.cssText = `
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
        empty.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
          <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px;">未找到匹配商品</div>
          <div style="font-size: 14px; color: #999;">试试其他关键词，或清除筛选条件</div>
        `;
        document.body.appendChild(empty);
      }
      empty.style.display = '';
    },

    /**
     * 隐藏空状态
     */
    hideEmptyState() {
      const el1 = this.shadowRoot && this.shadowRoot.querySelector('.jds-empty-overlay');
      if (el1) el1.style.setProperty('display', 'none');
      const el2 = document.querySelector('.jds-empty-overlay');
      if (el2) el2.style.setProperty('display', 'none');
    },

    /**
     * 销毁UI
     */
    destroy() {
      const wrapper = document.getElementById('jds-search-wrapper');
      if (wrapper) wrapper.remove();
      const empty = document.querySelector('.jds-empty-overlay');
      if (empty) empty.remove();
      const toast = document.querySelector('.jds-toast');
      if (toast) toast.remove();
    }
  };

  global.JDSUI = JDSUI;
})(window);
