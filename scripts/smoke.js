// JD-Auction-Search/scripts/smoke.js v1.5.5
// 冒烟测试：在 jsdom 中按 manifest 顺序加载全部 content script，验证核心流程可运行
// 用法：node scripts/smoke.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const SCRIPTS = manifest.content_scripts[0].js;

let pass = 0;
let fail = 0;

/**
 * 断言辅助
 * @param {string} name - 用例名
 * @param {boolean} cond - 断言条件
 * @param {*} [extra] - 失败时附加信息
 */
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✔ ' + name); }
  else { fail++; console.error('  ✘ ' + name, extra === undefined ? '' : extra); }
}

// ---- 构建 jsdom 环境 ----
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
  <div id="auction_head"><div class="auction_head_right"></div></div>
  <div class="auction-list">
    <div class="auction-item">
      <a href="https://1paipai.jd.com/auction-detail/123456"></a>
      <img class="p-img" src="https://img.jd.com/a.jpg" />
      <div class="p-name">iPhone 15 Pro 256G</div>
      <div class="p-price">¥1,288.00</div>
      <div class="origin-price">¥2,999.00</div>
      <div class="bid-count">12 人出价</div>
    </div>
  </div>
</body></html>`, { url: 'https://1paipai.jd.com/auction-list', pretendToBeVisual: true });

const { window } = dom;
// chrome API 桩：i18n 走 _locales/zh_CN，storage 走内存
const locale = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales/zh_CN/messages.json'), 'utf8'));
const localeEn = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales/en/messages.json'), 'utf8'));
const memStore = {};
window.chrome = {
  i18n: {
    getMessage: (key, subs) => {
      const entry = locale[key];
      if (!entry) return '';
      let msg = entry.message;
      if (subs && entry.placeholders) {
        Object.keys(entry.placeholders).forEach((ph, i) => {
          msg = msg.replace(new RegExp('\\$' + ph + '\\$', 'gi'), subs[i]);
        });
      }
      return msg;
    }
  },
  storage: {
    local: {
      get: (k, cb) => cb({ [k]: memStore[k] }),
      set: (obj) => Object.assign(memStore, obj)
    }
  },
  runtime: { getURL: (p) => 'chrome-extension://test/' + p }
};

const ctx = vm.createContext(window);
console.log('加载 content scripts...');
for (const rel of SCRIPTS) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  try {
    vm.runInContext(code, ctx, { filename: rel });
  } catch (e) {
    fail++;
    console.error('  ✘ 加载失败 ' + rel + ': ' + e.message);
  }
}
console.log(`  ✔ ${SCRIPTS.length} 个脚本加载完成\n`);

const U = window.JDSUtils;
const D = window.JDSDom;
const UI = window.JDSUI;
const API = window.JDSApi;

// ---- 1. 命名空间与关键 API ----
console.log('[1] 命名空间与 API 完整性');
ok('JDSUtils 已定义', !!U);
ok('JDSDom 已定义', !!D);
ok('JDSUI 已定义', !!UI);
ok('JDSApi 已定义', !!API);
ok('JDSContent.AuctionSearchEnhancer 已定义', !!(window.JDSContent && window.JDSContent.AuctionSearchEnhancer));
['getMessage', 'getProductId', 'getProductName', 'getProductImage', 'getProductUrl',
  'getProductPrice', 'getProductOriginalPrice', 'getProductBidCount', 'parsePrice',
  'extractProductsFromResponse', 'deduplicateProducts', 'showToast', 'formatPrice']
  .forEach(fn => ok(`JDSUtils.${fn} 存在`, typeof U[fn] === 'function'));
['extractProductsFromDOM', 'getProductPriceText', 'hideNativeProducts', 'showNativeProducts']
  .forEach(fn => ok(`JDSDom.${fn} 存在`, typeof D[fn] === 'function'));
['renderSearchUI', 'updateResultCount', 'showResults', 'hideResults', 'showLoading',
  'renderProducts', 'renderSkeletons', 'destroy', '_getResultsCss', '_addSearchHistory']
  .forEach(fn => ok(`JDSUI.${fn} 存在`, typeof UI[fn] === 'function'));

// ---- 2. 国际化覆盖 ----
console.log('\n[2] 国际化覆盖与多语言切换');
const zhKeys = Object.keys(locale);
const enKeys = Object.keys(localeEn);
ok('zh_CN 与 en 键完全一致',
  zhKeys.length === enKeys.length && zhKeys.every(k => enKeys.includes(k)),
  { onlyZh: zhKeys.filter(k => !enKeys.includes(k)), onlyEn: enKeys.filter(k => !zhKeys.includes(k)) });
ok('所有 zh_CN 文案非空', zhKeys.every(k => typeof locale[k].message === 'string'));
ok('getMessage 命中 chrome.i18n', U.getMessage('searchButton') === '搜索');
ok('getMessage 占位符替换', /60/.test(U.getMessage('loadMoreProgress', [60, 320])) &&
  /320/.test(U.getMessage('loadMoreProgress', [60, 320])));
ok('未知键回退键名', U.getMessage('__nope__') === '__nope__');
// 切到 en：移除 chrome.i18n 走内置字典 + navigator.language=en
const savedI18n = window.chrome.i18n;
window.chrome.i18n = undefined;
Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true });
ok('英文兜底字典生效', U.getMessage('searchButton') === 'Search');
ok('英文占位符替换', U.getMessage('loadMoreProgress', [60, 320]).includes('60 / 320'));
Object.defineProperty(window.navigator, 'language', { value: 'zh-CN', configurable: true });
ok('中文兜底字典生效', U.getMessage('searchButton') === '搜索');
window.chrome.i18n = savedI18n;

// 源码中不应残留硬编码中文 UI 文案（i18n 字典文件 utils/i18n.js 除外，那是文案来源）
const srcAll = SCRIPTS.map(r => fs.readFileSync(path.join(ROOT, r), 'utf8')).join('\n');
const srcNoDict = SCRIPTS.filter(r => !r.endsWith('utils/i18n.js'))
  .map(r => fs.readFileSync(path.join(ROOT, r), 'utf8')).join('\n');
const hardcoded = ['aria-label="搜索', 'aria-label="清除', 'aria-label="删除',
  "'起拍'", "' 人出价'", '加载更多（'];
hardcoded.forEach(s => ok(`无硬编码文案 ${s}`, !srcNoDict.includes(s)));
// 渲染层不得内联中文（应全部走 getMessage）
const renderFiles = ['src/ui/toolbar.js', 'src/ui/products.js', 'src/ui/price-render.js',
  'src/ui/results.js', 'src/ui/results/host.js'];
renderFiles.forEach(rel => {
  const body = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
  const zhInCode = /(['"`])[^'"`\n]*[\u4e00-\u9fa5][^'"`\n]*\1/.exec(body);
  ok(`${rel} 无内联中文字面量`, !zhInCode, zhInCode && zhInCode[0]);
});

// ---- 3. 价格解析 ----
console.log('\n[3] 价格解析与字段提取');
ok('parsePrice 千分位', U.parsePrice('¥1,288.00') === 1288);
ok('parsePrice 分单位归一', U.parsePrice('128800') === 1288);
ok('parsePrice 非法输入', U.parsePrice('abc') === 0);
ok('parsePrice 多小数点', U.parsePrice('1.288.00') === 1288);
ok('getProductPrice currentPrice 优先', U.getProductPrice({ currentPrice: 99 }) === 99);
ok('getProductPrice cappedPrice 兜底', U.getProductPrice({ cappedPrice: 500 }) === 500);
ok('getProductOriginalPrice', U.getProductOriginalPrice({ cappedPrice: 2999 }) === 2999);
ok('getProductBidCount recordCount', U.getProductBidCount({ recordCount: 12 }) === 12);
ok('getProductImage jfs CDN 拼接',
  U.getProductImage({ primaryPic: 'jfs/t1/a.jpg' }) === 'https://m.360buyimg.com/n1/s400x400_jfs/t1/a.jpg');
ok('getProductImage 400x400 高清', U.getProductImage({ primaryPic: 'jfs/x.jpg' }).includes('s400x400_'));

// ---- 4. 安全：URL / XSS ----
console.log('\n[4] 安全防护');
ok('拒绝 javascript: 图片', U.getProductImage({ imageUrl: 'javascript:alert(1)' }) === null);
ok('拒绝 data: 图片', U.getProductImage({ imageUrl: 'data:text/html,<script>' }) === null);
ok('拒绝 javascript: 链接',
  !String(U.getProductUrl({ url: 'javascript:alert(1)', id: 9 })).startsWith('javascript:'));
ok('无链接回退站点 origin',
  U.getProductUrl({ id: 42 }) === 'https://1paipai.jd.com/auction-detail/42');
ok('escapeHtml 转义', U.escapeHtml('<img onerror=x>').includes('&lt;'));
ok('源码无 javascript: 伪协议', !srcAll.includes("'javascript:void(0)'"));
ok('源码无 innerHTML 拼接用户数据', !/innerHTML\s*=\s*[^;]*getProductName/.test(srcAll));

// ---- 5. DOM 提取兜底 ----
console.log('\n[5] DOM 兜底提取');
const domProducts = D.extractProductsFromDOM();
ok('提取到 1 个商品', domProducts.length === 1, domProducts.length);
if (domProducts.length) {
  const p = domProducts[0];
  ok('名称正确', p.name === 'iPhone 15 Pro 256G', p.name);
  ok('id 来自链接数字', p.id === '123456', p.id);
  ok('现价解析', p.price === 1288, p.price);
  ok('划线原价映射 cappedPrice', p.cappedPrice === 2999, p.cappedPrice);
  ok('出价人数映射 recordCount', p.recordCount === 12, p.recordCount);
  ok('主图提取', p.image === 'https://img.jd.com/a.jpg', p.image);
}
ok('getProductPriceText 命中', D.getProductPriceText('iPhone 15 Pro 256G') === '¥1,288.00',
  D.getProductPriceText('iPhone 15 Pro 256G'));
// 非商品项（无链接无图）应被过滤
const junk = window.document.createElement('div');
junk.className = 'auction-item';
junk.innerHTML = '<div class="p-name">全部分类</div>';
window.document.querySelector('.auction-list').appendChild(junk);
D._priceTextCache = null;
ok('非商品项被过滤', D.extractProductsFromDOM().length === 1);
junk.remove();
D._priceTextCache = null;

// ---- 6. 响应转换与去重 ----
console.log('\n[6] 响应解析与去重');
ok('嵌套 data.list 提取',
  U.extractProductsFromResponse({ data: { list: [{ id: 1, name: 'a', price: 1 }] } }).length === 1);
ok('深层递归提取',
  U.extractProductsFromResponse({ data: { data: { goodsList: [{ id: 2, name: 'b', price: 2 }] } } }).length === 1);
ok('id 去重', U.deduplicateProducts([{ id: 1, name: 'a' }, { id: 1, name: 'a' }]).length === 1);
ok('无 id 按内容指纹去重（不丢弃）',
  U.deduplicateProducts([{ name: 'x', price: 1 }, { name: 'x', price: 1 }, { name: 'y', price: 2 }]).length === 2);
ok('无 id 商品不被静默丢弃', U.deduplicateProducts([{ name: 'solo', price: 5 }]).length === 1);

// ---- 7. 拦截器打分 ----
console.log('\n[7] API 拦截器');
ok('functionId 列表接口高分',
  API._listScore('https://api.m.jd.com/?functionId=paipai.auction.list') >= 20);
ok('非列表接口低分', API._listScore('https://api.m.jd.com/?functionId=paipai.order.detail') < 6);
ok('_isAuctionUrl 命中', API._isAuctionUrl('https://1paipai.jd.com/api/auction-list') === true);
ok('_isAuctionUrl 拒绝外站', API._isAuctionUrl('https://evil.com/auction/list') === false);

// ---- 8. UI 渲染核心流程 ----
console.log('\n[8] UI 渲染与搜索编排');
const enhancer = window.JDSContent.AuctionSearchEnhancer;
let err = null;
try {
  enhancer.init();
} catch (e) { err = e; }
ok('enhancer.init 无异常', !err, err && err.stack);
ok('工具栏宿主已挂载', !!window.document.getElementById('jds-search-wrapper'));
ok('样式已注入', !!window.document.querySelector('link[jds-style]'));

// 计数与结果渲染
UI.updateResultCount(7);
UI.showResults([
  { id: 1, name: '商品甲', currentPrice: 100, primaryPic: 'jfs/a.jpg', recordCount: 3 },
  { id: 2, name: '商品乙', startPrice: 50, cappedPrice: 900 }
]);
const cards = window.document.querySelectorAll('#jds-results-host .jds-product-card');
ok('渲染 2 张卡片', cards.length === 2, cards.length);
ok('结果面板可见',
  !!window.document.querySelector('#jds-results-host .jds-results-panel.is-visible'));
ok('卡片主图 1:1（padding-top:100%）',
  UI._getResultsCss().includes('padding-top: 100%'));
ok('网格每行 5 列', UI._getResultsCss().includes('repeat(5, 1fr)'));
ok('有链接卡片带 rel=noopener', cards[0].rel === 'noopener noreferrer');
ok('卡片主图使用 img 元素',
  !!cards[0].querySelector('img.jds-product-img-el'));
ok('起拍价标签国际化', cards[1].textContent.includes('起拍'));
ok('出价人数国际化', cards[0].textContent.includes('人出价'));

// 骨架屏 / 空态
UI.showLoading();
ok('骨架屏渲染', window.document.querySelectorAll('.jds-skeleton-card').length === 8);
UI.showResults([]);
ok('空态浮层显示', !!window.document.querySelector('.jds-empty-overlay'));
ok('空态文案国际化', window.document.querySelector('.jds-empty-title').textContent === '没有找到相关商品');

// 搜索过滤
enhancer.state.products = [
  { id: 1, name: 'iPhone 15', currentPrice: 100 },
  { id: 2, name: '小米 14', currentPrice: 200 },
  { id: 3, name: 'iPad Air', categoryName: '数码' }
];
enhancer.state.keyword = 'iphone';
enhancer._applyFilter();
ok('关键词大小写不敏感过滤', enhancer.state.filteredProducts.length === 1);
enhancer.state.keyword = '数码';
enhancer._applyFilter();
ok('按分类名过滤', enhancer.state.filteredProducts.length === 1);
enhancer.state.keyword = '';
enhancer._applyFilter();
ok('空关键词返回全部', enhancer.state.filteredProducts.length === 3);

// ---- 9. 搜索历史 ----
console.log('\n[9] 搜索历史持久化');
UI._clearSearchHistory();
UI._addSearchHistory('手机');
UI._addSearchHistory('电脑');
UI._addSearchHistory('手机');
ok('去重并置顶', UI._searchHistory[0] === '手机' && UI._searchHistory.length === 2);
for (let i = 0; i < 15; i++) UI._addSearchHistory('kw' + i);
ok('上限 10 条', UI._searchHistory.length === 10);
ok('已写入 storage', Array.isArray(memStore.jds_search_history));
UI._removeSearchHistory(0);
ok('删除单条', UI._searchHistory.length === 9);
UI._clearSearchHistory();
ok('清空历史', UI._searchHistory.length === 0);

// ---- 10. 生命周期与资源清理 ----
console.log('\n[10] 生命周期与资源清理');
let derr = null;
try { enhancer.destroy(); } catch (e) { derr = e; }
ok('destroy 无异常', !derr, derr && derr.stack);
ok('工具栏已移除', !window.document.getElementById('jds-search-wrapper'));
ok('结果宿主已移除', !window.document.getElementById('jds-results-host'));
ok('定位监听已解绑', UI._positionBound === false);
ok('fetch 已还原', typeof window.fetch === 'function' && !API._intercepted);
let rerr = null;
try { enhancer.init(); enhancer.destroy(); } catch (e) { rerr = e; }
ok('重复 init/destroy 稳定', !rerr, rerr && rerr.stack);

// ---- 11. 代码规范 ----
console.log('\n[11] 代码规范');
const allSrc = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (f.endsWith('.js')) allSrc.push(f);
  }
})(path.join(ROOT, 'src'));
const VERSION = manifest.version;
const badVersion = allSrc.filter(f => {
  const first = fs.readFileSync(f, 'utf8').split('\n')[0];
  return !new RegExp('v' + VERSION.replace(/\./g, '\\.')).test(first);
});
ok(`所有 src 文件头版本为 v${VERSION}`, badVersion.length === 0,
  badVersion.map(f => path.relative(ROOT, f)));
const tooLong = allSrc.filter(f => fs.readFileSync(f, 'utf8').split('\n').length > 200);
ok('无超过 200 行的源文件', tooLong.length === 0,
  tooLong.map(f => path.relative(ROOT, f) + ':' + fs.readFileSync(f, 'utf8').split('\n').length));
const notRegistered = allSrc
  .map(f => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter(rel => !SCRIPTS.includes(rel));
ok('所有 src 文件已在 manifest 登记', notRegistered.length === 0, notRegistered);

console.log(`\n${'='.repeat(40)}`);
console.log(`通过 ${pass} / 失败 ${fail}`);
console.log('='.repeat(40));
process.exit(fail ? 1 : 0);
