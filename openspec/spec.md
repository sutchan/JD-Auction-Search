# 京东夺宝岛搜索增强 — 项目规范（Spec）

**项目名称**: JD-Auction-Search
**版本**: 1.6.3
**类型**: 浏览器扩展插件（Manifest V3）
**适用浏览器**: Chrome / Edge / Firefox
**目标站点**: 京东夺宝岛 / 拍拍列表页（`*.jd.com` 下含 auction/paimai/paipai 路径的接口均可被捕获）

---

## 1. 项目定位

为京东夺宝岛列表页注入商品关键词搜索能力。原生夺宝列表页不支持搜索、只能手动翻页。
本扩展通过**接口拦截 + 跨页聚合 + DOM 兜底**三套机制，提供跨页实时过滤的搜索体验。

核心特性：
- 关键词实时搜索（商品名 / ID / 分类名 / 店铺名 / 副标题）
- 跨页聚合（自动重放分页请求，汇总全部分页商品）
- **深度后台搜索**：显示当前结果的同时，后台分片续搜更多页（每片 20 页，触顶续搜至末页或全局上限 200 页），每页新命中即时增量刷新结果面板（边搜边显）
- **排序维度深搜**：识别模板排序参数，翻完默认维度后尝试其它排序值重放，聚合不同排序下暴露的不同商品
- **候选模板回退**：拦截过程按分数缓存候选模板，最优模板无法分页重放时遍历候选取聚合最多者
- 接口失效自动兜底（降级为页面 DOM 提取）
- **加载进度提示**：全量未聚合完时，工具栏计数后显示「（已聚合 N 条，继续加载中）」
- 搜索历史本地持久化（刷新保留）
- 多语言界面（简体中文 / 英文）

---

## 2. 目录结构

```
JD-Auction-Search/
├── manifest.json            # Manifest V3 配置（权限/脚本注入/资源）
├── build.js                 # 打包脚本（输出 releases/）
├── metadata.json            # 扩展元数据（名称/描述/关键词）
├── package.json             # 工程配置（lint/test/build/clean）
├── CHANGELOG.md             # 版本变更日志
├── README.md / README_EN.md # 使用文档
├── prototype/               # 设计原型（index.html 设计系统）
├── docs/                    # 仓库展示素材（banner.png / screenshots/）
├── _locales/                # 国际化资源（zh_CN / en）
├── icons/                   # 扩展图标（16/48/128）
├── src/
│   ├── background.js        # Service Worker 后台（MV3 service_worker）
│   ├── content.js           # 主入口：引导增强器初始化
│   ├── styles.css           # 全局样式（web_accessible_resources）
│   ├── api/                 # 接口层：拦截 / 模板 / 分页 / 深搜
│   │   ├── index.js         #   命名空间引导（含 MAX_SORT_AXES/MAX_CANDIDATE_TPL 常量）
│   │   ├── interceptor.js   #   fetch/XHR 拦截，捕获真实列表请求
│   │   ├── template.js      #   请求模板打分选优、锁定、首页缓存、候选模板缓存
│   │   ├── paginator.js     #   分页重放（fromPage/分片续搜/finished 元信息）
│   │   ├── paginator-rules.js #   分页重放辅助（absUrl/findPageParam/buildPageRequest）
│   │   └── paginator-deep.js  #   排序维度深搜（collectSortAxes/applySortAxis/replayTemplateDeep）
│   ├── content/             # 内容编排层
│   │   ├── enhancer.js      #   主增强器：状态/初始化/生命周期/页面判断
│   │   ├── search.js        #   搜索编排：响应处理/过滤/跨页自动加载/清除恢复
│   │   └── deep-search.js   #   后台深度搜索（分片续搜循环 + 边搜边显合并）
│   ├── dom/                 # 京东页面 DOM 适配层
│   │   ├── index.js         #   命名空间引导
│   │   ├── selectors.js     #   京东选择器集中配置（单一维护点）
│   │   ├── observer.js      #   列表变化观察（搜索态跳过原生更新）
│   │   ├── extract.js       #   DOM 商品字段提取（含商品性校验）
│   │   ├── price-text.js    #   原生卡片价格文本回查（带缓存）
│   │   ├── native-list.js   #   原生列表显隐辅助（hideNativeProducts/showNativeProducts）
│   │   └── filter.js        #   浏览态原生列表关键词过滤
│   ├── ui/                  # 界面层
│   │   ├── index.js         #   命名空间引导
│   │   ├── tokens.js        #   设计令牌（中性灰 + 京东红，按 scope 注入）
│   │   ├── styles.js        #   内联样式聚合（令牌+工具栏+组件）
│   │   ├── components.js    #   Shadow DOM 工具栏组件样式
│   │   ├── toolbar.js       #   工具栏外壳（Shadow DOM 注入/挂载 + setLoadingHint）
│   │   ├── toolbar/
│   │   │   ├── events.js    #   输入防抖/提交/键盘导航/失焦收起
│   │   │   ├── history.js   #   搜索历史持久化与下拉渲染
│   │   │   └── history-item.js #   单条历史项构建（防 XSS/交互）
│   │   ├── results.js       #   结果面板公开 API（展示/隐藏/空态/销毁）
│   │   ├── results/
│   │   │   ├── host.js      #   面板宿主：覆盖层/定位/网格容器
│   │   │   └── styles.js    #   面板与浅 DOM 组件样式
│   │   ├── products.js      #   商品卡渲染（内联样式，脱离原生 DOM）
│   │   ├── price-render.js  #   价格区渲染（主价/划线原价）
│   │   └── skeleton.js      #   骨架屏 fallback
│   └── utils/               # 工具层
│       ├── index.js         #   命名空间引导
│       ├── i18n.js          #   国际化（chrome.i18n 优先，内置字典回退）
│       ├── extract.js       #   商品基础字段提取（多态兼容）
│       ├── price.js         #   价格解析（分单位归一/文本解析）
│       ├── format.js        #   文本格式化（HTML 转义/价格格式化）
│       ├── transform.js     #   响应转换（提取数组/去重）
│       └── ui-shared.js     #   Toast/样式注入/Shadow DOM 查询
└── openspec/                # 本文档集
    ├── spec.md              #   项目规范
    ├── tasks.md             #   任务清单
    └── check_list.md        #   验收清单
```

---

## 3. 架构与数据流

```
页面加载
  └─ content.js → enhancer.init()
       ├─ api/interceptor 包裹 fetch/XHR，捕获夺宝列表请求
       ├─ dom/observer 监听列表变化
       └─ ui/toolbar 注入搜索栏（Shadow DOM）
                    │
用户输入关键词
  └─ ui/toolbar/events → content/search 编排
       ├─ 即时：用「当前已聚合」的商品先渲染结果面板（不等待全量分页）
       ├─ 后台：api/paginator 重放分页 → 跨页聚合；每翻完一页 onPage 回调
       │        增量合并新命中并刷新结果面板（边搜边显、计数实时增长）
       ├─ 深搜：排序维度深搜 + 候选模板回退，聚合更多不同分页/维度的商品
       ├─ 分片续搜：单片 20 页，翻满未到末页则继续下一片，直到末页或 200 页上限
       ├─ 过滤：关键词匹配（name/id/category/shop/subtitle）
       ├─ 兜底：api 不可用时 dom/extract 从页面 DOM 提取
       └─ ui/results 展示结果面板（fixed 覆盖层遮挡原生列表，原生列表始终存活）
                    │
清空搜索
  └─ 隐藏结果面板，原生列表（始终未被 display:none）天然恢复显示
```

**样式隔离策略**
- 工具栏：Shadow DOM（`:host`），由 `ui/styles.js` 组合令牌+组件样式注入
- 结果面板：浅 DOM（挂载 `#jds-results-host`，fixed 全屏 `pointer-events:none` 覆盖层），由 `results/styles.js` 注入；搜索态时 `.jds-results-panel.is-visible` 白底覆盖层遮挡原生列表，**原生列表不被 `display:none`**（避免京东虚拟列表卸载后无法恢复）
- 设计令牌 `ui/tokens.js` 与 `prototype/index.html` 设计系统保持一致

---

## 4. 功能清单

| 功能 | 说明 | 状态 |
|------|------|------|
| 实时关键词搜索 | 输入即过滤，覆盖 name/id/分类/店铺/副标题 | ✅ |
| 跨页聚合 | api/paginator 重放分页，汇总全部分页 | ✅ |
| 接口兜底 | api 失败时降级 dom/extract DOM 提取 | ✅ |
| 搜索历史持久化 | chrome.storage.local，刷新保留，上限 10 | ✅ |
| 历史下拉交互 | 聚焦显示、单条删除、一键清空、focusout 收起 | ✅ |
| 结果面板 | 覆盖层、骨架屏、空状态、加载更多 | ✅ |
| 原生列表遮挡 | 搜索态用结果面板覆盖层遮挡，原生列表始终存活，清除即恢复 | ✅ |
| 深度后台搜索 | 边搜边显 + 分片续搜（单片 20 页，续搜至末页/200 页上限） | ✅ |
| 排序维度深搜 | 翻完默认维度后尝试其它排序值，聚合不同商品 | ✅ |
| 候选模板回退 | 最优模板失败则遍历候选模板聚合最多者 | ✅ |
| 加载进度提示 | 全量未完成时显示「（已聚合 N 条，继续加载中）」 | ✅ |
| 多语言 | 简体中文 / 英文（chrome.i18n + 内置字典） | ✅ |
| 设计令牌 | 中性灰 + 京东红，Shadow/浅 DOM 双 scope | ✅ |

---

## 5. 技术约定

- **Manifest V3**：Service Worker 后台，content script `run_at: document_idle`
- **权限最小化**：仅 `storage` + host_permissions（`*.jd.com`，拦截器按路径含 auction/paimai/paipai 过滤）
- **选择器集中**：所有京东 DOM 依赖集中在 `dom/selectors.js`，改版只改一处
- **模块命名空间**：各层 `index.js` 作为引导聚合，避免 content_script 注入顺序混乱
- **安全**：HTML 转义（`utils/format.js`）、无内联事件、无外部网络请求
- **版本一致**：manifest / metadata / package / 各文件头 / 文档统一同步

---

## 6. 版本历史

### v1.6.3
- 规范与版本号统一：openspec 三文档（spec/tasks/check_list）、prototype 设计系统、版本同步脚本文件头统一对齐至 v1.6.3
- 代码审查结论：全量源码通过 ESLint（0 错误）、冒烟测试 97/0 全绿、无超 200 行文件、XSS 防护（textContent/escapeHtml/SAFE_URL_RE）与接口白名单（`JD_HOST_RE`/`SAFE_URL_RE`）到位、资源清理与幂等守卫完善，无需语法/安全/性能修复

### v1.6.2
- 卡片新增拍卖时间展示（`.p-time`），信息层级调整（价格区上移、名称置底），选择器集中维护 `TIME`

### v1.6.1
- 卡片价格与名称显示微调：修复搜索结果卡片底部边距过高（`.jds-product-body` 加 `flex:1` 撑满卡片剩余高度，移除 `.note` 多余 `margin-top`）
- 货币符号 `.jds-price-yen` 颜色改为主色 `var(--primary)`，与现价整数 `.jds-price-int` 同色
- 现价整数 `.jds-price-int` 字号 16→20px；商品名 `.jds-product-name` 字号 14→12px

### v1.6.0
- 价格渲染重构：结果卡片价格 class 对齐京东原生语义——现价/起拍价 `.p-price`、原价 `.origin-price`、出价人数 `.note`（作用域隔离 `#jds-results-host`，不污染页面）
- 修复 `.p-price` 不显示：移除 `priceEqualsOrig` 对主价行的跳过（夺宝岛商品当前价常等于封顶价，扩展卡片原不渲染主价行），现价与出价人数始终显示
- 修复现价取数错位：京东现价实际位于 `div.p-price > i`，提取层（`extract.js`/`price-text.js`）优先取 `.p-price i` 文本，避免混入「起拍/封顶」杂文
- 原价与现价同行：新增 `.jds-product-price-row` 横向 flex 容器，`.origin-price` 与 `.p-price` 基线对齐同行
- 出价人数渲染移出 `priceEqualsOrig` 分支，与价格分支平级，避免连坐吞掉
- 卡片下边距优化：`.jds-product-body` 底部内边距 14→12px，结果网格容器 `padding-bottom` 40→28px

### v1.5.5
- 架构重构：src 拆分为 `api/`、`content/`、`dom/`、`ui/`、`utils/` 多层模块，各模块 `index.js` 命名空间引导
- 结果面板样式迁移至 `ui/results/styles.js`（浅 DOM 组件 CSS），工具栏样式收敛 Shadow DOM
- 设计令牌 `ui/tokens.js` 引入，与 prototype 设计系统对齐，支持 Shadow/浅 DOM 双 scope 注入
- 搜索历史持久化落地（`ui/toolbar/history.js` + `storage` 权限 + 下拉 focusout 收起）
- 国际化收敛（zh_CN / en，`default_locale`），`getMessage` 优先 chrome.i18n
- 打包输出目录改为 `releases/`
- 文档重构：README 优化使用说明 + SEO/GEO，openspec 三文档重建
- 搜索召回增强：放宽拦截主机白名单至 `*.jd.com`，新增候选模板回退；清除搜索后覆盖层遮挡替代 `display:none` 恢复
- 深度后台搜索：边搜边显（onPage 增量刷新）+ 排序维度深搜 + 分片续搜（单片 20 页续搜至末页/200 页上限）；新增 `paginator-deep.js`/`deep-search.js`/`history-item.js`

### v1.5.3
- 搜索历史持久化（chrome.storage.local），下拉关闭由 document pointerdown 改为 Shadow focusout
- 恢复国际化（chrome.i18n 优先，移除 zh_TW），_locales 重建
- 文档与 SEO/GEO 优化

### v1.5.2
- DOM 提取商品性校验（跳过无详情链接且无主图的非商品项）
- 修复清空搜索后原生列表空白（隐藏整个列表容器）
- 修复价格重复显示（现价等于封顶价时，主价行始终渲染、不再重复渲染划线原价行）
- 集成测试增强

### v1.5.1
- 修复分页重放缺 Referer 导致翻页失败
- 样式幂等注入、observer 节流、价格缓存 O(1)
- 搜索匹配扩展分类名/店铺名/副标题

### v1.5.0
- 工程化：ESLint + CI（lint+test+build）
- 集成测试（jsdom，47 断言）
- 选择器集中化、DOM 提取健壮性、结果分页加载更多
- i18n 单一来源、UI 易用性提升

### v1.4.0
- 基础搜索增强与 UI 初版
