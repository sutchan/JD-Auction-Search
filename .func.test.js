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
sandbox.document = {
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, classList: { add() {}, remove() {} } }),
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

// 1) 加载全部模块，捕获加载期错误
for (const f of files) {
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
sandbox.navigator = { language: 'zh-TW', userLanguage: 'zh-TW' };
ok('zh-TW 兜底 toastRequestError', U.getMessage('toastRequestError') === '請求失敗，請稍後重試');
sandbox.navigator = { language: 'zh-CN', userLanguage: 'zh-CN' };
// 回归：之前缺失的键曾返回原始键，现在必须返回译文而非键名
ok('缺失键已修复(非原始键)', U.getMessage('toastNetworkError') !== 'toastNetworkError');

console.log('\n[paginator] 跨页聚合');
(async () => {
  A._requestTemplate = { url: 'https://api.jd.com/list?page=1', method: 'GET', headers: {} };
  A._firstPageProducts = [];
  const all = await A.loadAllProducts({}, 30);
  ok('跨页聚合条数=50', all.length === 50); // 20+20+10
  ok('fetch 调用3次(到末页停止)', fetchCalls === 3);
  ok('聚合结果均含 id', all.every(p => U.getProductId(p)));

  console.log('\n=== ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + ' ===');
  process.exit(fail === 0 ? 0 : 1);
})();
