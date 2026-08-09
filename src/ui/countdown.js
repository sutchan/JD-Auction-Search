// JD-Auction-Search/src/ui/countdown.js v.
// 客户端拍卖倒计时：解析京东时间文案（距结束 HH:MM:SS / N天HH:MM:SS），
// 以单例 setInterval 每秒驱动所有结果面板内已注册的倒计时元素递减，实现「跳动」。
// 时间行渲染见 ./price-render.js

(function(global) {
  'use strict';

  const JDSUI = global.JDSUI = global.JDSUI || {};

  // 活跃倒计时元素集合与单例计时器：批量驱动，避免每卡各自 setInterval 造成大量定时器
  let _els = [];
  let _timer = null;

  /**
   * 从京东时间文案中解析剩余秒数（支持 距结束 HH:MM:SS / N天HH:MM:SS / MM:SS）
   * 无法解析（绝对时间如「已结束」）返回 null
   * @param {string} text
   * @returns {number|null}
   */
  JDSUI.Countdown = {
    parseRemainSeconds: function parseRemainSeconds(text) {
      if (!text) return null;
      const dayM = /(\d+)\s*天/.exec(text);
      const hmsM = /(\d{1,3}):(\d{1,2}):(\d{1,2})/.exec(text);
      const msM = /(\d{1,3}):(\d{1,2})(?::\d{1,2})?\s*$/.exec(text);
      let total = 0;
      let matched = false;
      if (hmsM) {
        total += Number(hmsM[1]) * 3600 + Number(hmsM[2]) * 60 + Number(hmsM[3]);
        matched = true;
      } else if (msM && !/:\d{1,2}:\d{1,2}/.test(text)) {
        // 仅 MM:SS（无第三组时间）按 分:秒 处理
        total += Number(msM[1]) * 60 + Number(msM[2]);
        matched = true;
      }
      if (dayM) { total += Number(dayM[1]) * 86400; matched = true; }
      return matched ? total : null;
    },

    /**
     * 将剩余秒数格式化为京东风格文案：前缀 + （N天）HH:MM:SS
     * @param {string} prefix - 文案前缀（如「距结束 」）
     * @param {number} remain - 剩余秒数
     * @param {string} type - 'is-ending' | 'is-starting'
     * @returns {string}
     */
    formatRemain: function formatRemain(prefix, remain, type) {
      if (remain <= 0) return type === 'is-starting' ? '已开拍' : '已结束';
      const days = Math.floor(remain / 86400);
      let s = remain % 86400;
      const hh = Math.floor(s / 3600); s %= 3600;
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      const pad = (n) => String(n).padStart(2, '0');
      const clock = pad(hh) + ':' + pad(mm) + ':' + pad(ss);
      const dayStr = days > 0 ? days + '天' : '';
      return prefix + dayStr + clock;
    },

    /**
     * 注册一个倒计时元素到单例计时器
     * @param {HTMLElement} el - .p-time 容器（首个子节点为显示文案的 span）
     * @param {string} timeText - 原始京东时间文案
     * @param {string} typeCls - 'is-ending' | 'is-starting'
     */
    register: function register(el, timeText, typeCls) {
      const remain = this.parseRemainSeconds(timeText);
      if (remain == null) return;
      // 前缀：剥离已解析出的剩余时间片段，保留「距结束/距开拍」等文案
      const prefix = timeText.replace(/[\d]+\s*天/g, '')
        .replace(/\d{1,3}:\d{1,2}(?::\d{1,2})?/g, '').replace(/\s+/g, ' ').trim();
      el.__jdsRemain = remain;
      el.__jdsPrefix = prefix ? prefix + ' ' : '';
      el.__jdsType = typeCls;
      el.dataset.remain = String(remain);
      _els.push(el);
      this._ensureTimer();
    },

    /**
     * 启动单例计时器：每秒递减所有注册元素并刷新文案，集合为空时自动停止
     * @private
     */
    _ensureTimer: function _ensureTimer() {
      if (_timer) return;
      _timer = setInterval(() => {
        if (!_els.length) {
          clearInterval(_timer);
          _timer = null;
          return;
        }
        for (let i = _els.length - 1; i >= 0; i--) {
          const el = _els[i];
          const inner = el && el.firstChild;
          // 元素已从 DOM 移除则剔除，避免过期引用与内存泄漏
          if (!el || !inner || !el.isConnected) {
            _els.splice(i, 1);
            continue;
          }
          el.__jdsRemain = Math.max(0, (el.__jdsRemain || 0) - 1);
          inner.textContent = this.formatRemain(el.__jdsPrefix || '', el.__jdsRemain, el.__jdsType || 'is-ending');
        }
      }, 1000);
    },

    /**
     * 清理所有活跃倒计时注册（重渲染/卸载前调用，释放定时器与 DOM 引用）
     */
    clear: function clear() {
      _els = [];
      if (_timer) {
        clearInterval(_timer);
        _timer = null;
      }
    }
  };

  // 兼容既有调用点（renderProducts / destroy 中 this.clearCountdowns()）
  JDSUI.clearCountdowns = function clearCountdowns() {
    JDSUI.Countdown.clear();
  };
})(window);
