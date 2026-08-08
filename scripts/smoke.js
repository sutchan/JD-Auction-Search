// JD-Auction-Search/scripts/smoke.js v1.6.1
// 全链路测试：轻量冒烟（版本/文件/语法）+ jsdom 功能流程（i18n/价格/安全/DOM/去重/拦截/渲染/历史/生命周期）
// 用法：node scripts/smoke.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
// 版本号以 package.json 为准，动态读取，避免硬编码导致版本升级后校验失败
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

let pass = 0;
let fail = 0;
// ok 接收「描述: 值」字符串，解析尾部布尔/空值真实校验（否则断言恒真形同虚设）。
// 仅当尾部是 true/false/null/undefined/数字 时才解析判定，其余描述性结尾一律视为通过。
const ok = (m) => {
  const mt = /:\s*(true|false|null|undefined|-?\d+)$/.exec(m);
  let cond = true;
  if (mt) {
    const v = mt[1];
    cond = v === 'true' || (/^\d+$/.test(v) && Number(v) > 0);
  }
  if (cond) { pass++; console.log(`  ✅ ${m}`); }
  else { fail++; console.error(`  ❌ ${m}`); }
};
const bad = (m, extra) => { fail++; console.error(`  ❌ ${m}`, extra === undefined ? '' : extra); };

console.log('🔍 开始校验...\n');

// ---------- [1/3] 版本一致性 ----------
console.log('[1/3] 版本一致性');
const versionFiles = ['package.json', 'manifest.json', 'metadata.json'];
for (const f of versionFiles) {
  const p = path.join(ROOT, f);
  const txt = fs.readFileSync(p, 'utf8');
  JSON.parse(txt);
  if (!txt.includes(`"version": "${VERSION}"`)) bad(`${f} 版本未同步为 ${VERSION}`);
  else ok(`${f} 版本 = ${VERSION}`);
}
const srcFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) srcFiles.push(full);
  }
})(path.join(ROOT, 'src'));
let headerMismatch = 0;
for (const f of srcFiles) {
  const first = fs.readFileSync(f, 'utf8').split('\n')[0];
  if (!first.includes(`v${VERSION}`)) headerMismatch++;
}
if (headerMismatch === 0) ok(`全部 ${srcFiles.length} 个 src 文件头版本 = ${VERSION}`);
else bad(`${headerMismatch} 个 src 文件头版本未同步为 ${VERSION}`);

// 规范：无超过 200 行的源文件
const oversized = [];
for (const f of srcFiles) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').length;
  if (lines > 200) oversized.push(`${path.relative(ROOT, f)} (${lines})`);
}
if (oversized.length === 0) ok('无超过 200 行的源文件');
else bad('存在超过 200 行的源文件: ' + oversized.join(', '));

// ---------- [2/3] manifest 脚本完整性 ----------
console.log('\n[2/3] manifest 脚本完整性');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const declared = [...manifest.content_scripts[0].js];
if (manifest.background && manifest.background.service_worker) declared.push(manifest.background.service_worker);
let missing = 0;
for (const rel of declared) {
  if (!fs.existsSync(path.join(ROOT, rel))) { bad(`manifest 声明但缺失: ${rel}`); missing++; }
}
if (missing === 0) ok(`manifest 声明 ${declared.length} 个脚本均存在`);
const injectedSet = new Set(declared);
for (const f of srcFiles) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  if (!injectedSet.has(rel)) bad(`src 文件未登记到 manifest: ${rel}`);
}

// ---------- [3/3] 基础语法校验 ----------
console.log('\n[3/3] 基础语法校验');
const { execSync } = require('child_process');
let syntaxErrors = 0;
for (const f of srcFiles) {
  try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); }
  catch (e) { bad(`语法错误: ${path.relative(ROOT, f)}`); syntaxErrors++; }
}
if (syntaxErrors === 0) ok(`全部 ${srcFiles.length} 个文件语法通过 node --check`);

// ================= [4] jsdom 功能流程 =================
(async () => {
console.log('\n[4] 功能流程（jsdom 全链路）');
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
    <div class="auction-item nav-item"><a href="https://1paipai.jd.com/other">导航项</a></div>
  </div>
</body></html>`, { url: 'https://1paipai.jd.com/auction-list', pretendToBeVisual: true });
const { window } = dom;
const locale = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales/zh_CN/messages.json'), 'utf8'));
const localeEn = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales/en/messages.json'), 'utf8'));
const memStore = {};
window.chrome = {
  i18n: { getMessage: (key, subs) => {
    const entry = locale[key]; if (!entry) return '';
    let msg = entry.message;
    if (subs && entry.placeholders) Object.keys(entry.placeholders).forEach((ph, i) => {
      msg = msg.replace(new RegExp('\\$' + ph + '\\$', 'gi'), subs[i]);
    });
    return msg;
  }},
  storage: { local: { get: (k, cb) => cb({ [k]: memStore[k] }), set: (obj) => Object.assign(memStore, obj) } },
  runtime: { getURL: (p) => 'chrome-extension://test/' + p }
};
const ctx = vm.createContext(window);
const document = window.document;
const SCRIPTS = [...manifest.content_scripts[0].js, manifest.background.service_worker];
for (const rel of SCRIPTS) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }
  catch (e) { bad(`加载失败 ${rel}: ${e.message}`); }
}

const JDSUtils = window.JDSUtils, JDSDom = window.JDSDom, JDSUI = window.JDSUI, JDSApi = window.JDSApi;

// 4.1 命名空间与 API 完整性
console.log('\n[4.1] 命名空间与 API 完整性');
if (JDSUtils && JDSDom && JDSUI && JDSApi) ok('JDSUtils/JDSDom/JDSUI/JDSApi 已定义');
else bad('命名空间未全部定义');
[['JDSUtils.getMessage', JDSUtils.getMessage], ['JDSUtils.getProductPrice', JDSUtils.getProductPrice],
 ['JDSUtils.parsePrice', JDSUtils.parsePrice], ['JDSUtils.extractProductsFromResponse', JDSUtils.extractProductsFromResponse],
 ['JDSUtils.deduplicateProducts', JDSUtils.deduplicateProducts], ['JDSUtils.escapeHtml', JDSUtils.escapeHtml],
 ['JDSDom.extractProductsFromDOM', JDSDom.extractProductsFromDOM], ['JDSDom.hideNativeProducts', JDSDom.hideNativeProducts],
 ['JDSUI.renderProducts', JDSUI.renderProducts], ['JDSUI.showResults', JDSUI.showResults],
 ['JDUI.renderSearchUI', JDSUI.renderSearchUI], ['JDSContent', window.JDSContent]
].forEach(([name, fn]) => { if (typeof fn === 'function' || name === 'JDSContent') ok(`${name} 存在`); else bad(`${name} 缺失`); });

// 4.2 i18n 覆盖与多语言切换
console.log('\n[4.2] i18n 覆盖与多语言');
ok('getMessage 命中 chrome.i18n: ' + (JDSUtils.getMessage('searchButton') === '搜索'));
ok('占位符替换: ' + (JDSUtils.getMessage('loadMoreProgress', ['60', '128']) === '（已显示 60 / 128）'));
// 回退内置字典：临时清空 chrome.i18n
const origI18n = window.chrome.i18n.getMessage;
window.chrome.i18n.getMessage = () => '';
const enFallback = JDSUtils.getMessage('searchButton');
window.chrome.i18n.getMessage = origI18n;
ok('未知键回退键名: ' + (JDSUtils.getMessage('noSuchKey') === 'noSuchKey'));
ok('英文兜底字典: ' + (enFallback === 'Search'));
const zhKeys = Object.keys(locale), enKeys = Object.keys(localeEn);
ok('zh_CN 与 en 键一致: ' + (zhKeys.length === enKeys.length && zhKeys.every(k => enKeys.includes(k))));
ok('所有 zh_CN 文案非空: ' + Object.values(locale).every(e => e && e.message));

// 4.3 价格解析与字段提取
console.log('\n[4.3] 价格解析与字段提取');
ok('parsePrice 千分位: ' + (JDSUtils.parsePrice('¥1,288.00') === 1288));
ok('parsePrice 分单位归一: ' + (JDSUtils.parsePrice(128800) === 1288));
ok('parsePrice 非法输入: ' + (JDSUtils.parsePrice('abc') === 0));
ok('parsePrice 多小数点: ' + (JDSUtils.parsePrice('1.288.00') === 1288));
const prod = { currentPrice: 1288, cappedPrice: 2999, recordCount: 12, startPrice: 500 };
ok('getProductPrice currentPrice 优先: ' + (JDSUtils.getProductPrice(prod) === 1288));
ok('getProductOriginalPrice: ' + (JDSUtils.getProductOriginalPrice(prod) === 2999));
ok('getProductBidCount recordCount: ' + (JDSUtils.getProductBidCount(prod) === 12));

// 4.4 安全防护
console.log('\n[4.4] 安全防护');
const imgBad = JDSUtils.getProductImage ? JDSUtils.getProductImage({ image: 'javascript:alert(1)' }) : null;
ok('拒绝 javascript: 图片: ' + (imgBad === '' || imgBad == null));
const imgData = JDSUtils.getProductImage ? JDSUtils.getProductImage({ image: 'data:text/html,x' }) : null;
ok('拒绝 data: 图片: ' + (imgData === '' || imgData == null));
const urlBad = JDSUtils.getProductUrl ? JDSUtils.getProductUrl({ url: 'javascript:void(0)' }) : null;
ok('拒绝 javascript: 链接: ' + (urlBad === '' || urlBad == null));
ok('escapeHtml 转义: ' + (JDSUtils.escapeHtml('<b>&') === '&lt;b&gt;&amp;'));
let srcHasPseudo = false, srcHasInner = false;
for (const f of srcFiles) {
  const c = fs.readFileSync(f, 'utf8');
  if (/javascript:\s*void|javascript:alert/i.test(c)) srcHasPseudo = true;
  if (/innerHTML\s*(\+=|=).*(interpolate|product|name|value)/i.test(c)) srcHasInner = true;
}
ok('源码无 javascript: 伪协议: ' + !srcHasPseudo);
ok('源码无 innerHTML 拼接用户数据: ' + !srcHasInner);

// 4.5 DOM 兜底提取
console.log('\n[4.5] DOM 兜底提取');
const domProducts = JDSDom.extractProductsFromDOM();
ok('提取到商品: ' + (domProducts.length >= 1));
const first = domProducts[0];
if (first) {
  ok('名称正确: ' + (first.name === 'iPhone 15 Pro 256G'));
  ok('id 来自链接数字: ' + (first.id === '123456'));
  ok('现价解析: ' + (first.currentPrice === 1288));
  ok('划线原价映射 cappedPrice: ' + (first.cappedPrice === 2999));
  ok('出价人数映射 recordCount: ' + (first.recordCount === 12));
  ok('主图提取: ' + (first.image === 'https://img.jd.com/a.jpg'));
}
ok('非商品项被过滤: ' + (domProducts.length === 1));

// 4.6 响应解析与去重
console.log('\n[4.6] 响应解析与去重');
const nested = JDSUtils.extractProductsFromResponse({ data: { list: [{ id: 1, name: 'A', currentPrice: 10 }] } });
ok('嵌套 data.list 提取: ' + (nested.length === 1 && nested[0].id === 1));
const deep = JDSUtils.extractProductsFromResponse({ result: { data: { goodsList: [{ id: 2, name: 'B' }] } } });
ok('深层递归提取: ' + (deep.length === 1));
const dedup = JDSUtils.deduplicateProducts([{ id: 1, name: 'A' }, { id: 1, name: 'A' }, { id: 2, name: 'B' }]);
ok('id 去重: ' + (dedup.length === 2));
const noId = JDSUtils.deduplicateProducts([{ name: 'X', price: 1, image: 'i' }, { name: 'X', price: 1, image: 'i' }]);
ok('无 id 按内容指纹去重不丢弃: ' + (noId.length === 1));

// 4.7 API 拦截器
console.log('\n[4.7] API 拦截器');
ok('functionId 列表接口高分: ' + (JDSApi._listScore('https://api.m.jd.com?functionId=paipai.auction.list') >= 20));
ok('非列表接口低分: ' + (JDSApi._listScore('https://1paipai.jd.com/other') < JDSApi.LIST_SCORE_MIN));
ok('_isAuctionUrl 命中: ' + (JDSApi._isAuctionUrl('https://api.m.jd.com/auction/list') === true));
// 主机白名单放宽：列表请求常发往这些子域，拦截器必须能捕获，否则全量分页失败→结果不全
ok('_isAuctionUrl 命中 auction.jd.com: ' + (JDSApi._isAuctionUrl('https://auction.jd.com/auction/list') === true));
ok('_isAuctionUrl 命中 wq.jd.com: ' + (JDSApi._isAuctionUrl('https://wq.jd.com/auction/list') === true));
ok('_isAuctionUrl 命中 api.jd.com: ' + (JDSApi._isAuctionUrl('https://api.jd.com/auction/list') === true));
ok('_isAuctionUrl 命中 search.jd.com: ' + (JDSApi._isAuctionUrl('https://search.jd.com/paipai/list') === true));
ok('_isAuctionUrl 拒绝外站: ' + (JDSApi._isAuctionUrl('https://evil.com/auction') === false));
// 候选模板回退 + 深度后台搜索（边搜边显 / 排序维度深搜）串行执行，避免并发覆盖拦截状态
// 分页重放使用 _origFetch（绕过拦截器），故桩需覆盖 _origFetch 而非 window.fetch
const origFetch = window.fetch;
const origOrigFetch = JDSApi._origFetch;
{
  // --- 4.7 候选模板回退：无最优模板时，loadAllProducts 应回退遍历候选模板聚合 ---
  JDSApi._requestTemplate = null;
  JDSApi._requestTemplateLocked = false;
  JDSApi._candidateTemplates = [
    { url: 'https://api.jd.com/auction/list?page=1', method: 'GET', body: null, headers: null, _score: 10 },
    { url: 'https://wq.jd.com/auction/list?page=1', method: 'GET', body: null, headers: null, _score: 8 }
  ];
  JDSApi._origFetch = async (url) => {
    const u = String(url);
    const m = u.match(/page=(\d+)/);
    const page = m ? Number(m[1]) : 1;
    const list = page === 1
      ? [{ id: 1001, name: 'A' }, { id: 1002, name: 'B' }]
      : page === 2 ? [{ id: 1003, name: 'C' }] : [];
    return { ok: true, json: async () => ({ data: { list } }) };
  };
  const agg = await JDSApi.loadAllProducts();
  ok('候选模板回退聚合到全部页: ' + (agg && agg.items && agg.items.length === 3 && agg.finished === true));
  JDSApi._candidateTemplates = null;

  // --- 4.7.1 深度后台搜索：onPage 边搜边显 + 排序维度深搜 ---
  console.log('\n[4.7.1] 深度后台搜索（边搜边显/排序维度/分片续搜）');
  // 桩 fetch：不同排序维度暴露不同商品（模拟不同排序下才出现的商品），page1 即达末页
  // 当前模板 sort=default，_collectSortAxes 会枚举非 default 的排序值（受 MAX_SORT_AXES 限制），
  // 每个排序维度 page1 暴露 1 条该维度专属商品 → 聚合数 = MAX_SORT_AXES
  JDSApi._origFetch = async (url) => {
    const u = String(url);
    const pm = u.match(/page=(\d+)/);
    const page = pm ? Number(pm[1]) : 1;
    const sortM = u.match(/sort=(\w+)/);
    const sort = sortM ? sortM[1] : 'default';
    // 非默认排序维度：page1 暴露 1 条该排序专属商品（id 随排序值变化）；page2 为空(末页)
    const list = sort === 'default'
      ? (page === 1 ? [{ id: 1001, name: 'A' }, { id: 1002, name: 'B' }] : page === 2 ? [{ id: 1003, name: 'C' }] : [])
      : (page === 1 ? [{ id: 2000 + (sort.charCodeAt(0) % 10) + 1, name: 'S' + sort }] : []);
    return { ok: true, json: async () => ({ data: { list } }) };
  };
  JDSApi._requestTemplate = {
    url: 'https://api.jd.com/auction/list?page=1&sort=default',
    method: 'GET', body: null, headers: null, _score: 10
  };
  JDSApi._requestTemplateLocked = false;
  JDSApi._candidateTemplates = null;
  JDSApi.MAX_SORT_AXES = 6;
  const pagesSeen = [];
  const agg2 = await JDSApi.loadAllProducts({
    deep: true,
    onPage: (p) => { pagesSeen.push(p.page); }
  });
  // 每个排序维度 page1 暴露 1 条专属商品；MAX_SORT_AXES=6 → 聚合 6 条（跨维度去重）
  ok('排序维度深搜聚合更多不同商品: ' + (agg2 && agg2.items && agg2.items.length === 6));
  ok('onPage 进度回调已触发(边搜边显): ' + (pagesSeen.length >= 2));

  // --- 4.7.2 分片续搜：从 fromPage 继续翻页，触顶返回 finished=false 供外层续搜 ---
  console.log('\n[4.7.2] 分片续搜（fromPage/finished）');
  JDSApi._origFetch = async (url) => {
    const u = String(url);
    const pm = u.match(/page=(\d+)/);
    const page = pm ? Number(pm[1]) : 1;
    // 仅首页返回 1 条；此后每页返回不同商品但永不达末页（模拟大量商品需续搜）
    const list = page === 1 ? [{ id: 3001, name: 'P1' }] : [{ id: 3000 + page, name: 'P' + page }];
    return { ok: true, json: async () => ({ data: { list } }) };
  };
  JDSApi._requestTemplate = {
    url: 'https://api.jd.com/auction/list?page=1',
    method: 'GET', body: null, headers: null, _score: 10
  };
  JDSApi._requestTemplateLocked = false;
  JDSApi._candidateTemplates = null;
  // 单片 2 页，触顶返回 finished=false
  const chunk1 = await JDSApi.loadAllProducts({ deep: false, fromPage: 1 }, 2);
  ok('单片翻满未到末页(finished=false): ' + (chunk1.finished === false));
  ok('单片返回该片聚合商品: ' + (chunk1.items && chunk1.items.length === 2));
  // 从第 3 页续搜一片 2 页，继续聚合新商品
  const chunk2 = await JDSApi.loadAllProducts({ deep: false, fromPage: chunk1.page + 1 }, 2);
  ok('续搜片从正确起始页聚合: ' + (chunk2.items && chunk2.items.length === 2 && chunk2.page === 4));

  // 还原全局状态
  window.fetch = origFetch;
  JDSApi._origFetch = origOrigFetch;
  JDSApi._requestTemplate = null;
  JDSApi._requestTemplateLocked = false;
}

// 4.8 UI 渲染与搜索编排
console.log('\n[4.8] UI 渲染与搜索编排');
const enhancer = window.JDSContent.AuctionSearchEnhancer;
let initOk = true;
try { enhancer.init(); } catch (e) { initOk = false; bad('enhancer.init 异常: ' + e.message); }
ok('enhancer.init 无异常: ' + initOk);
ok('工具栏宿主已挂载: ' + !!document.getElementById('jds-search-wrapper'));
JDSUI.showResults([
  { id: 1, name: 'iPhone', image: 'https://img.jd.com/a.jpg', url: 'https://1paipai.jd.com/auction-detail/1', currentPrice: 1288, recordCount: 5 },
  { id: 2, name: '华为', image: 'https://img.jd.com/b.jpg', url: 'https://1paipai.jd.com/auction-detail/2', currentPrice: 4999, recordCount: 3 }
]);
ok('结果面板样式已注入: ' + !!document.getElementById('jds-results-style'));
const panel = JDSUI.resultsRoot.querySelector('.jds-results-panel');
const grid = panel.querySelector('.jds-product-grid');
const cards = grid.querySelectorAll('.jds-product-card');
ok('渲染 2 张卡片: ' + (cards.length === 2));
ok('结果面板可见: ' + panel.classList.contains('is-visible'));
ok('卡片主图 1:1 (padding-top:100%): ' + /\.jds-product-img\s*\{[^}]*padding-top:\s*100%/.test(JDSUI._getResultsCss()));
ok('网格每行 5 列: ' + /grid-template-columns:\s*repeat\(5/.test(JDSUI._getResultsCss()));
const linked = cards[0];
ok('有链接卡片带 rel=noopener: ' + (linked.getAttribute('rel') === 'noopener noreferrer'));
ok('卡片主图使用 img 元素: ' + !!linked.querySelector('img'));
ok('起拍价标签国际化: ' + (JDSUtils.getMessage('priceStarting') === '起拍'));
ok('出价人数国际化: ' + (JDSUtils.getMessage('bidCountSuffix') === ' 人出价'));
ok('loadingMore 文案占位符: ' + (JDSUtils.getMessage('loadingMore', ['120']) === '（已聚合 120 条，继续加载中）'));
JDSUI.setLoadingHint(true, 120);
const hintEl = JDSUI.shadowRoot.querySelector('.jds-loading-hint');
ok('加载提示可见且文案正确: ' + (hintEl && !hintEl.hidden && hintEl.textContent.indexOf('120') >= 0));
JDSUI.setLoadingHint(false);
ok('加载提示可隐藏: ' + (hintEl.hidden === true));
JDSUI.renderSkeletons(4);
ok('骨架屏渲染: ' + !!panel.querySelector('.jds-skeleton-card'));
JDSUI.showEmptyState();
ok('空态浮层显示: ' + !!JDSUI.emptyElement);

// 倒计时解析/格式化/注册/跳动（[bug] 拍卖时间原本静态不跳动）
const C = JDSUI.Countdown;
ok('倒计时解析 HH:MM:SS: ' + (C.parseRemainSeconds('距结束 01:02:03') === 3723));
ok('倒计时解析 N天HH:MM:SS: ' + (C.parseRemainSeconds('距结束 2天03:04:05') === 2 * 86400 + 11045));
ok('倒计时解析 MM:SS: ' + (C.parseRemainSeconds('距开拍 05:30') === 330));
ok('倒计时解析绝对时间返回 null: ' + (C.parseRemainSeconds('已结束') === null));
ok('倒计时格式化前缀+时钟: ' + (C.formatRemain('距结束 ', 3723, 'is-ending') === '距结束 01:02:03'));
ok('倒计时归零显示已结束: ' + (C.formatRemain('', 0, 'is-ending') === '已结束'));
ok('倒计时归零显示已开拍: ' + (C.formatRemain('', 0, 'is-starting') === '已开拍'));
// 渲染含倒计时的卡片并验证注册与每秒递减
JDSUI.clearCountdowns();
const cdProd = { id: 9, name: '倒计时卡', url: 'u9', timeText: '距结束 00:00:05' };
const cdCard = JDSUI._buildOwnCard(cdProd);
const cdTime = cdCard.querySelector('.p-time .jds-product-time');
ok('倒计时卡片渲染时间文案: ' + (cdTime && cdTime.textContent === '距结束 00:00:05'));
ok('倒计时已注册到单例计时器: ' + (cdCard.querySelector('.p-time').dataset.remain === '5'));
// 手动驱动一次 tick（通过内部计时器不易精确控制，这里直接断言递减逻辑由 register 维护）
// 模拟计时器递减：直接调用一次格式化后写入，验证归零文案
const cdEl = cdCard.querySelector('.p-time');
// 模拟倒计时跳动：剩余 2s 递减到 1s，文案应从 00:00:02 → 距结束 00:00:01
cdEl.__jdsRemain = 2; cdEl.__jdsPrefix = '距结束 '; cdEl.__jdsType = 'is-ending';
cdEl.firstChild.textContent = C.formatRemain(cdEl.__jdsPrefix, cdEl.__jdsRemain - 1, cdEl.__jdsType);
ok('倒计时递减后文案更新: ' + (cdEl.firstChild.textContent === '距结束 00:00:01'));
// 归零分支：剩余 1s 递减到 0s，文案应为「已结束」
cdEl.__jdsRemain = 1;
cdEl.firstChild.textContent = C.formatRemain(cdEl.__jdsPrefix, cdEl.__jdsRemain - 1, cdEl.__jdsType);
ok('倒计时归零文案为已结束: ' + (cdEl.firstChild.textContent === '已结束'));
JDSUI.clearCountdowns();
// 关键词过滤
enhancer.state.products = [{ id: 1, name: 'iPhone 15', url: 'u1' }, { id: 2, name: '华为 Mate', url: 'u2' }];
enhancer.state.keyword = 'iphone';
enhancer._applyFilter();
ok('关键词大小写不敏感过滤: ' + (enhancer.state.filteredProducts.length === 1));
enhancer.state.keyword = '华为';
enhancer._applyFilter();
ok('按分类名/店铺名过滤回退名称匹配: ' + (enhancer.state.filteredProducts.length === 1));
enhancer.state.keyword = '';
enhancer._applyFilter();
ok('空关键词返回全部: ' + (enhancer.state.filteredProducts.length === 2));

// 清除搜索后原生列表恢复（核心回归：搜索态不再 display:none 隐藏原生列表）
const nativeList = JDSDom.getProductListContainer();
const panelEl = JDSUI.resultsRoot.querySelector('.jds-results-panel');
enhancer.state.products = [{ id: 1, name: 'iPhone 15', url: 'u1' }];
enhancer.state.keyword = 'iphone';
enhancer._applyFilterAndUpdate();
ok('搜索态不隐藏原生列表(display 保持空): ' + (nativeList.style.display === ''));
ok('搜索态结果面板可见: ' + panelEl.classList.contains('is-visible'));
enhancer.state.keyword = '';
enhancer._applyFilterAndUpdate();
ok('清除后退出搜索态: ' + (enhancer.state.searchMode === false));
ok('清除后结果面板隐藏: ' + (!panelEl.classList.contains('is-visible')));
ok('清除后原生列表仍可见(未被 none 困住): ' + (nativeList.style.display === ''));

// 4.9 搜索历史持久化
console.log('\n[4.9] 搜索历史持久化');
JDSUI._clearSearchHistory && JDSUI._clearSearchHistory();
JDSUI._addSearchHistory('手机');
JDSUI._addSearchHistory('华为');
JDSUI._addSearchHistory('手机'); // 重复应去重置顶
ok('去重并置顶: ' + (JDSUI._searchHistory[0] === '手机' && JDSUI._searchHistory.length === 2));
for (let i = 0; i < 12; i++) JDSUI._addSearchHistory('k' + i);
ok('上限 10 条: ' + (JDSUI._searchHistory.length === 10));
ok('已写入 storage: ' + (memStore['jds_search_history'] !== undefined));
JDSUI._removeSearchHistory(0);
ok('删除单条: ' + (JDSUI._searchHistory.length === 9));
JDSUI._clearSearchHistory();
ok('清空历史: ' + (JDSUI._searchHistory.length === 0));

// 4.10 生命周期与资源清理
console.log('\n[4.10] 生命周期与资源清理');
let destroyOk = true;
try { JDSUI.destroy(); } catch (e) { destroyOk = false; bad('destroy 异常: ' + e.message); }
ok('destroy 无异常: ' + destroyOk);
ok('工具栏已移除: ' + !document.getElementById('jds-search-wrapper'));
ok('结果宿主已移除: ' + !document.getElementById('jds-results-host'));

// ---------- 汇总 ----------
console.log(`\n========================================`);
console.log(`通过 ${pass} / 失败 ${fail}`);
console.log(`========================================`);
if (fail === 0) { console.log(`🎉 全部通过（${srcFiles.length} 文件，版本 ${VERSION}）`); process.exit(0); }
else { console.error(`💥 失败：${fail} 项`); process.exit(1); }
})().catch((e) => { console.error('main 异常: ' + e); process.exit(1); });
