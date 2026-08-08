// JD-Auction-Search/src/ui/toolbar/events.js v1.6.3
// 工具栏事件绑定：输入防抖、回车提交、历史键盘导航、清除与失焦收起
// 工具栏外壳见 ../toolbar.js，历史逻辑见 ./history.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  // 输入防抖 120ms：避免连续键击触发全量重过滤+重渲染（结果量多时卡顿）
  const DEBOUNCE_MS = 120;

  /**
   * 绑定历史下拉的键盘上下导航
   * @private
   * @param {KeyboardEvent} e - 键盘事件
   * @param {HTMLElement} historyList - 历史列表容器
   */
  JDSUI._navigateHistory = function _navigateHistory(e, historyList) {
    const items = Array.from(historyList.querySelectorAll('.jds-history-item'));
    if (items.length === 0) return;
    e.preventDefault();
    const active = historyList.querySelector('.jds-history-item.is-active');
    let next = 0;
    if (active) {
      const curIdx = items.indexOf(active);
      active.classList.remove('is-active');
      next = e.key === 'ArrowDown'
        ? (curIdx + 1) % items.length
        : (curIdx - 1 + items.length) % items.length;
    }
    items[next].classList.add('is-active');
    items[next].scrollIntoView({ block: 'nearest' });
  };

  /**
   * 绑定UI事件
   * @private
   * @param {HTMLElement} container - UI容器
   * @param {Object} state - 应用状态
   * @param {Object} handlers - 事件处理函数（onInput/onSearch/onClear）
   */
  JDSUI._bindEvents = function _bindEvents(container, state, handlers) {
    const input = container.querySelector('.jds-search-input');
    const clearBtn = container.querySelector('.jds-clear');
    const searchBtn = container.querySelector('.jds-search-btn');
    const historyList = container.querySelector('.jds-history-list');
    const historyEmpty = container.querySelector('.jds-history-empty');
    const historyClear = container.querySelector('.jds-history-clear');

    // 保存上下文供历史项点击复用（填充+搜索+同步状态）
    this._historyCtx = { handlers, state, input, clearBtn };

    // 统一提交搜索：记录历史 → 隐藏下拉 → 触发外层 handler
    const submit = () => {
      const kw = input.value.trim();
      if (kw) this._addSearchHistory(kw);
      this._hideHistory();
      handlers.onSearch();
    };

    // 搜索框输入 — 实时过滤（防抖）+ 清除按钮显隐
    let debounceTimer = null;
    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.keyword = val;
      clearBtn.classList.toggle('is-visible', val.length > 0);
      // 有输入时不展示历史下拉（避免与实时搜索结果混淆）
      if (val.length > 0) this._hideHistory();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handlers.onInput(), DEBOUNCE_MS);
    });
    this._clearDebounce = () => { if (debounceTimer) clearTimeout(debounceTimer); };

    // 聚焦且为空：展示历史下拉
    input.addEventListener('focus', () => {
      if (input.value.trim().length === 0) this._renderHistory(historyList, historyEmpty, input);
    });

    // 搜索框键盘：回车提交 / 上下导航历史 / Esc 收起
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // 若有键盘选中的历史项，则以其作为关键词
        const active = historyList.querySelector('.jds-history-item.is-active .jds-history-text');
        if (active) {
          input.value = active.textContent;
          const ctx = this._historyCtx || {};
          if (ctx.clearBtn) ctx.clearBtn.classList.add('is-visible');
          if (ctx.state) ctx.state.keyword = active.textContent;
        }
        submit();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this._navigateHistory(e, historyList);
      } else if (e.key === 'Escape') {
        this._hideHistory();
        input.blur();
      }
    });

    // 失焦关闭下拉：聚焦移出工具栏 Shadow 时收起。
    // 用 focusout（blur 的冒泡版）而非 document click/pointerdown，
    // 彻底规避 closed Shadow DOM 下 composedPath/retarget 不可靠导致的误关/吞点击。
    // 点击历史项（li 不可聚焦）不会令 input 失焦，下拉保持、click 正常生效。
    const onFocusOut = (e) => {
      const next = e.relatedTarget;
      if (!next || !this.shadowRoot.contains(next)) this._hideHistory();
    };
    this.shadowRoot.addEventListener('focusout', onFocusOut);
    this._onFocusOut = onFocusOut;

    // 清除搜索：清空输入+退出搜索态+恢复原生列表，单一行为来源
    // 暴露为 JDSUI.clearSearch 供跨 Shadow 调用（如空状态清除按钮）
    this.clearSearch = () => {
      input.value = '';
      state.keyword = '';
      clearBtn.classList.remove('is-visible');
      input.focus();
      handlers.onClear();
      this._renderHistory(historyList, historyEmpty, input);
    };
    clearBtn.addEventListener('click', () => this.clearSearch());

    searchBtn.addEventListener('click', submit);

    // 清空历史
    if (historyClear) {
      // mousedown 阻止默认：避免点击令 input 失焦触发 focusout 误关下拉
      historyClear.addEventListener('mousedown', (e) => e.preventDefault());
      historyClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this._clearSearchHistory();
        this._renderHistory(historyList, historyEmpty, input);
      });
    }
  };
})(window);
