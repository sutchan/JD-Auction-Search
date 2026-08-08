// JD-Auction-Search/src/ui/toolbar/history-item.js v1.6.4
// 搜索历史单条项构建：文本 + 删除按钮 + 交互事件
// 历史列表渲染/显隐与持久化见 ./history.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};
  const getMessage = global.JDSUtils.getMessage;

  /**
   * 构建单条历史项 <li>（文本 + 删除按钮 + 交互）
   * @private
   * @returns {HTMLElement}
   */
  JDSUI._buildHistoryItem = function _buildHistoryItem(kw, i, listEl, emptyEl, input) {
    const li = document.createElement('li');
    li.className = 'jds-history-item';
    li.setAttribute('role', 'option');

    const text = document.createElement('span');
    text.className = 'jds-history-text';
    text.textContent = kw;   // textContent 防 XSS
    li.appendChild(text);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'jds-history-del';
    del.setAttribute('aria-label', getMessage('a11yHistoryDelete'));
    del.textContent = '\u00D7';
    // mousedown 阻止默认：避免点击按钮令 input 失焦触发 focusout 误关下拉
    del.addEventListener('mousedown', (e) => e.preventDefault());
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      this._removeSearchHistory(i);
      this._renderHistory(listEl, emptyEl, input);
    });
    li.appendChild(del);

    // mousedown 阻止默认：点击 li（非可聚焦）会令 input 失焦触发 focusout，
    // 进而关闭下拉使 pointer-events:none 吞掉后续 click；preventDefault 保焦点、保下拉、保 click
    li.addEventListener('mousedown', (e) => e.preventDefault());

    // 点击历史项：填入并搜索
    li.addEventListener('click', () => {
      const ctx = this._historyCtx || {};
      input.value = kw;
      if (ctx.clearBtn) ctx.clearBtn.classList.add('is-visible');
      if (ctx.state) ctx.state.keyword = kw;
      this._hideHistory();
      // 触发外层搜索（已在历史中，无需重复记录）；同步刷新过滤/计数
      if (ctx.handlers) {
        if (ctx.handlers.onInput) ctx.handlers.onInput();
        ctx.handlers.onSearch();
      }
    });
    return li;
  };
})(window);
