// 功能/鲁棒性测试：在 VM 沙箱中按 manifest 顺序加载全部模块，
// 对纯逻辑模块（transform/format/i18n/paginator）做断言，验证核心流程。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const files = (manifest.content_scripts[0].js || []).concat(['background.js']);

// 沙箱：模拟浏览器全局，提供最小 DOM/网络桩
const sandbox = {};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.console = console;
sandbox.location = { href: 'https://1paipai.jd.com/auction-list' };
sandbox.navigator = { language: 'zh-CN', userLanguage: 'zh-CN' };
// chrome 桩：任意属性/调用返回安全 stub；getMessage 返回 '' 以触发 i18n 兜底路径
function makeStub() {
  const fn = function () { return makeStub(); };
  return new Proxy(fn, {
    get(t, p) {
      if (p === 'getMessage') return () => '';
      if (p === Symbol.toPrimitive) return () => '';
      return makeStub();
    },
    apply() { return makeStub(); }
  });
}
sandbox.chrome = makeStub();
function makeEl() {
  const el = {
    style: {}, childNodes: [],
    setAttribute() {}, remove() {},
    appendChild(c) { (this.childNodes = this.childNodes || []).push(c); return c; },
    classList: { add() {}, remove() {}, contains: () => false },
    getBoundingClientRect: () => ({ bottom: 0, left: 0, width: 0 }),
    attachShadow: () => makeEl(),
    querySelector: () => null
  };
  // textContent 支持：叶子节点直接存文本；容器节点聚合子节点文本
  Object.defineProperty(el, 'textContent', {
    get() {
      if (!this.childNodes || this.childNodes.length === 0) return this._text || '';
      return this.childNodes.map(c => (c && c.textContent != null) ? c.textContent : '').join('');
    },
    set(v) { this._text = String(v); this.childNodes = []; }
  });
  return el;
}
sandbox.document = {
  getElementById: () => makeEl(),
  querySelector: () => makeEl(),
  createElement: () => makeEl(),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  head: { appendChild() {} },
  body: { appendChild() {} }
};
let fetchCalls = 0;
sandbox.fetch = async (url) => {
  fetchCalls++;
  // 分页重放响应：第1/2页20条，第3页10条（<pageSize→末页），第4页不调用
  const m = String(url).match(/[?&]page=(\d+)/);
  const page = m ? Number(m[1]) : 1;
  const count = page >= 3 ? 10 : 20;
  const list = Array.from({ length: count }, (_, i) => ({
    id: `p${page}-${i}`, name: `商品${page}-${i}`, price: 100 + i, image: 'x'
  }));
  return { ok: true, json: async () => ({ data: { list } }) };
};
sandbox.URL = URL;
vm.createContext(sandbox);

let fail = 0;
function ok(name, cond) {
  if (cond) { console.log('  PASS', name); }
  else { console.log('  FAIL', name); fail++; }
}

// 扩展入口（content.js / background.js）依赖真实浏览器 DOM / 扩展宿主，
// 仅做语法编译校验；其余逻辑模块载入沙箱执行断言。
const ENTRY_FILES = new Set(['src/content.js', 'background.js']);

// 1) 对所有文件做语法校验（vm.Script 编译，捕获语法错误）
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { new vm.Script(code, { filename: f }); }
  catch (e) { console.log('  SYNTAX ERROR', f, e.message); fail++; }
}

// 2) 载入可无头运行的逻辑模块
for (const f of files) {
  if (ENTRY_FILES.has(f)) continue;
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { vm.runInContext(code, sandbox, { filename: f }); }
  catch (e) { console.log('  LOAD ERROR', f, e.message); fail++; }
}

const U = sandbox.JDSUtils;
const A = sandbox.JDSApi;
const UI = sandbox.JDSUI;

console.log('\n[transform]');
ok('extract 嵌套 {data:{list}}', JSON.stringify(U.extractProductsFromResponse({ data: { list: [{ id: 1, name: 'a' }] } })) === JSON.stringify([{ id: 1, name: 'a' }]));
ok('extract 空响应 -> []', Array.isArray(U.extractProductsFromResponse(null)) && U.extractProductsFromResponse(null).length === 0);
ok('deduplicate 去重', U.deduplicateProducts([{ id: 1 }, { id: 1 }, { id: 2 }]).length === 2);

console.log('\n[format]');
ok('escapeHtml 防 XSS', U.escapeHtml('<script>"\'') === '&lt;script&gt;&quot;&#39;');
ok('formatPrice 整数', U.formatPrice(1200) === '1,200');
ok('formatPrice 小数', U.formatPrice(99.5) === '99.50');

console.log('\n[i18n]');
ok('zh-CN 兜底 toastNetworkError', U.getMessage('toastNetworkError') === '网络异常，请检查网络连接');
sandbox.navigator = { language: 'en', userLanguage: 'en' };
ok('en 兜底 toastRequestError', U.getMessage('toastRequestError') === 'Request failed, please try again later');
sandbox.navigator = { language: 'zh-CN', userLanguage: 'zh-CN' };
// 回归：之前缺失的键曾返回原始键，现在必须返回译文而非键名
ok('缺失键已修复(非原始键)', U.getMessage('toastNetworkError') !== 'toastNetworkError');

console.log('\n[search history] 下拉历史记录');
UI._searchHistory = [];
UI._addSearchHistory('手机');
UI._addSearchHistory('电脑');
UI._addSearchHistory('手机');   // 重复应置顶去重
ok('历史去重并置顶', JSON.stringify(UI._searchHistory) === JSON.stringify(['手机', '电脑']));
UI._addSearchHistory('a'); UI._addSearchHistory('b'); UI._addSearchHistory('c');
UI._addSearchHistory('d'); UI._addSearchHistory('e'); UI._addSearchHistory('f');
UI._addSearchHistory('g'); UI._addSearchHistory('h'); UI._addSearchHistory('i');
UI._addSearchHistory('j'); UI._addSearchHistory('k'); // 第11条触发截断
ok('历史上限 10 条', UI._searchHistory.length === 10 && UI._searchHistory[0] === 'k');
UI._removeSearchHistory(0);
ok('删除单条历史', UI._searchHistory.length === 9 && UI._searchHistory[0] === 'j');
UI._clearSearchHistory();
ok('清空历史', UI._searchHistory.length === 0);
// 空关键词不记录
UI._addSearchHistory('   ');
ok('空关键词不记录', UI._searchHistory.length === 0);

console.log('\n[tokens] 对齐 prototype 浅色令牌');
const tokHost = UI._getTokensCss();
const tokLight = UI._getTokensCss('#jds-results-host');
ok('Shadow 作用域令牌', tokHost.includes(':host {'));
ok('浅 DOM 作用域令牌', tokLight.includes('#jds-results-host {'));
ok('令牌含 --primary #e1251b', tokHost.includes('--primary: #e1251b'));
ok('令牌含 --card #ffffff', tokHost.includes('--card: #ffffff'));
ok('令牌含 --radius-xl 16px', tokHost.includes('--radius-xl: 16px'));
ok('令牌含 --radius-2xl 22px', tokHost.includes('--radius-2xl: 22px'));
ok('令牌含 --shadow-lg', tokHost.includes('--shadow-lg:'));
ok('令牌含 --info #2563eb', tokHost.includes('--info: #2563eb'));
ok('令牌含 --shadow-ring(聚焦光环)', tokHost.includes('--shadow-ring:'));
ok('令牌含 --font-display(衬线价格)', tokHost.includes("--font-display: 'Instrument Serif'"));

console.log('\n[product card] 对齐 prototype 类化结构');
const card = UI._buildOwnCard({ id: 'x', name: '测试商品', price: 128, image: 'u', originalPrice: 200, bidCount: 3, url: 'https://jd.com/x' });
ok('卡片 className=jds-product-card', card.className === 'jds-product-card');
const body = card.childNodes.find(c => c.className === 'jds-product-body');
const priceEl = body && body.childNodes.find(c => c.className === 'jds-product-price');
ok('含 .jds-product-price 子元素', !!priceEl);
const meta = body && body.childNodes.find(c => c.className === 'jds-product-meta');
ok('含 .jds-product-meta(出价 badge)', !!meta && meta.childNodes.length === 1);
ok('不含内联 style(由浅 DOM CSS 驱动)', card.style.cssText === undefined || card.style.cssText === '');

console.log('\n[extract] 拍拍 auction.list 真实字段映射');
const sample = {
  id: 404584168,
  productName: '【99成新】赫莲娜HR绿宝瓶',
  currentPrice: 46.0,
  cappedPrice: 238.0,
  startPrice: 1.0,
  recordCount: 2,
  primaryPic: 'jfs/t1/184988/24/3993/117980/609e17cbE130d1fa7/c519504d15825077.png'
};
ok('现价=currentPrice', U.getProductPrice(sample) === 46);
ok('原价=cappedPrice(页面 origin-price)', U.getProductOriginalPrice(sample) === 238);
ok('出价人数=recordCount', U.getProductBidCount(sample) === 2);
ok('主图=primaryPic 拼 CDN', U.getProductImage(sample) ===
  'https://m.360buyimg.com/n1/s220x220_jfs/t1/184988/24/3993/117980/609e17cbE130d1fa7/c519504d15825077.png');
ok('详情链接=夺宝岛 auction-detail', U.getProductUrl(sample) ===
  'https://1paipai.jd.com/auction-detail/404584168');
// 未开拍(currentPrice 为 null)时现价回退起拍价
ok('现价 null→起拍价', U.getProductPrice({ currentPrice: null, startPrice: 1.0 }) === 1);
// 无 cappedPrice 时兼容回退 maxPrice
ok('无 cappedPrice→maxPrice', U.getProductOriginalPrice({ maxPrice: 199, currentPrice: 50 }) === 199);

console.log('\n[product card] 现价为主，原价划线灰显');
const cardBid = UI._buildOwnCard({ id: 1, name: 'x', currentPrice: 46, cappedPrice: 238, recordCount: 2 });
ok('有出价：现价不含"起拍"标签', !/起拍/.test(cardBid.textContent));
const bodyBid = cardBid.childNodes.find(c => c.className === 'jds-product-body');
const subBid = bodyBid.childNodes.find(c => c.className === 'jds-product-subprice');
ok('有出价：原价大于现价时渲染划线次行', !!subBid && /238/.test(subBid.textContent));
ok('有出价：划线次行含 .jds-product-orig', !!subBid && !!subBid.childNodes.find(c => c.className === 'jds-product-orig'));
ok('有出价：主价显示 46', /46/.test(cardBid.textContent));
const cardStart = UI._buildOwnCard({ id: 2, name: 'y', currentPrice: null, startPrice: 1, cappedPrice: 238 });
ok('未开拍：标注"起拍"', /起拍/.test(cardStart.textContent));
const bodyStart = cardStart.childNodes.find(c => c.className === 'jds-product-body');
ok('未开拍：原价大于起拍价时渲染划线次行', !!bodyStart.childNodes.find(c => c.className === 'jds-product-subprice'));
// 无原价 / 原价不高于现价：不渲染划线次行
const cardNoOrig = UI._buildOwnCard({ id: 5, name: 'no', currentPrice: 46, recordCount: 2 });
ok('无 cappedPrice：不渲染划线次行', !cardNoOrig.childNodes.find(c => c.className === 'jds-product-body').childNodes.find(c => c.className === 'jds-product-subprice'));
const cardOrigLow = UI._buildOwnCard({ id: 6, name: 'low', currentPrice: 100, cappedPrice: 50 });
ok('原价≤现价：不渲染划线次行', !cardOrigLow.childNodes.find(c => c.className === 'jds-product-body').childNodes.find(c => c.className === 'jds-product-subprice'));

// 价格优先 p-price 原文：带 priceText 时直接显示原文，不做二次格式化（避免单位/千分位误差）
const cardPText = UI._buildOwnCard({ id: 9, name: 'pt', priceText: '¥1,288.00', currentPrice: 128800 });
ok('价格优先显示 p-price 原文', /¥1,288\.00/.test(cardPText.textContent) && !/128,800/.test(cardPText.textContent));
const cardNoText = UI._buildOwnCard({ id: 10, name: 'nt', currentPrice: 128800 });
ok('无 priceText 回退 formatPrice', /128,800/.test(cardNoText.textContent));

console.log('\n[price] 脏数据/异常回归');
// 仅 cappedPrice 有值：主价回退 cappedPrice 会与划线原价重复，
// 现仅渲染 .jds-product-orig（去划线），不渲染主价格行（jds-price-int 等），避免重复显示
const cardCapOnly = UI._buildOwnCard({ id: 3, name: 'z', cappedPrice: 199 });
const bodyCap = cardCapOnly.childNodes.find(c => c.className === 'jds-product-body');
ok('仅封顶价：不渲染主价格行(无 jds-product-price)', !bodyCap.childNodes.find(c => c.className === 'jds-product-price'));
ok('仅封顶价：仅显示 jds-product-orig 价格 ¥199', !!bodyCap.childNodes.find(c => c.className === 'jds-product-subprice' && /¥199/.test(c.textContent)));
ok('仅封顶价：orig-only 去划线(不标"封顶"也不标"起拍")', !/封顶/.test(cardCapOnly.textContent) && !/起拍/.test(cardCapOnly.textContent));
// 流拍：currentPrice 为 0（有效现价）不应误判为未开拍标「起拍」
const cardZero = UI._buildOwnCard({ id: 4, name: 'w', currentPrice: 0, cappedPrice: 100 });
ok('流拍 currentPrice:0：不标"起拍"', !/起拍/.test(cardZero.textContent) && /¥\s*0/.test(cardZero.textContent));
// 现价优先级：currentPrice 存在时不被 cappedPrice 覆盖
ok('现价优先 cappedPrice', U.getProductPrice({ currentPrice: 50, cappedPrice: 200 }) === 50);
// 兜底：常规价格字段全缺失时回退封顶价（不再返回 0）
ok('无现价字段→回退封顶价', U.getProductPrice({ cappedPrice: 199 }) === 199);
// formatPrice 非有限值兜底为 0，杜绝 "NaN"
ok('formatPrice(NaN)→0', U.formatPrice(NaN) === '0');
ok('formatPrice(undefined)→0', U.formatPrice(undefined) === '0');
ok('formatPrice(Infinity)→0', U.formatPrice(Infinity) === '0');

console.log('\n[paginator] 跨页聚合');
(async () => {
  A._requestTemplate = { url: 'https://api.jd.com/list?page=1', method: 'GET', headers: {} };
  A._firstPageProducts = [];
  const all = await A.loadAllProducts({}, 30);
  ok('跨页聚合条数=50', all.length === 50); // 20+20+10
  ok('fetch 调用3次(到末页停止)', fetchCalls === 3);
  ok('聚合结果均含 id', all.every(p => U.getProductId(p)));

  // #1 分页重放补齐 Referer：京东接口常校验 Referer，缺失会 403/空
  A._requestTemplate = { url: 'https://api.jd.com/list?page=1', method: 'GET', headers: {} };
  const built = A._buildPageRequest('https://api.jd.com/list?page=1', A._requestTemplate,
    { where: 'url', key: 'page' }, 2);
  ok('分页请求补齐 Referer', !!built.options.headers.Referer &&
    built.options.headers.Referer === 'https://1paipai.jd.com/auction-list');

  // #2 拦截器列表评分：functionId=paipai.auction.list 加权最高
  ok('_listScore 拍拍列表接口加权', A._listScore('https://api.jd.com/?functionId=paipai.auction.list') >= 20);
  ok('_listScore 非列表接口为0', A._listScore('https://api.jd.com/?functionId=other') === 0);

  // #2 分页参数识别（URL / body JSON / body 表单）
  const ppUrl = A._findPageParam('https://api.jd.com/list?page=1', { url: 'x', method: 'GET', body: null });
  ok('_findPageParam url', ppUrl && ppUrl.where === 'url' && ppUrl.key === 'page');
  const ppBody = A._findPageParam('https://api.jd.com/list', { url: 'x', method: 'POST', body: { pageNo: 1, kw: 'a' } });
  ok('_findPageParam body JSON', ppBody && ppBody.where === 'body' && ppBody.key === 'pageNo');
  const ppForm = A._findPageParam('https://api.jd.com/list', { url: 'x', method: 'POST', body: 'pageNum=1&kw=a' });
  ok('_findPageParam body 表单', ppForm && ppForm.where === 'body' && ppForm.key === 'pageNum');

  console.log('\n=== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + ' ===');
  process.exit(fail === 0 ? 0 : 1);
})();
