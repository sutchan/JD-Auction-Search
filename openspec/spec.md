# 京东夺宝岛搜索增强 - 项目规范文档

## 项目概述

**项目名称**: JD-Auction-Search  
**版本**: 1.5.5 
**类型**: 浏览器扩展插件

为京东夺宝岛页面（1paipai.jd.com/auction-list/）增加商品关键词搜索功能（含 API 拦截缓存与 DOM 提取兜底）。

## 目录结构

```
JD-Auction-Search/
├── manifest.json          # 扩展配置
├── background.js          # 后台服务
├── metadata.json          # 项目元数据
├── package.json           # 项目配置
├── build.js               # 构建脚本
├── CHANGELOG.md           # 变更日志
├── openspec/              # 规范文档
│   ├── spec.md            # 项目规范
│   ├── check_list.md      # 检查清单
│   └── tasks.md           # 任务列表
├── src/
│   ├── utils/             # 工具函数（i18n/字段提取/价格/格式化/响应转换/UI共享）
│   │   ├── index.js       # 命名空间引导
│   │   ├── i18n.js        # 国际化 getMessage（zh_CN/en 双语兜底 + 占位符替换）
│   │   ├── extract.js     # 商品基础字段提取（id/name/主图/链接）
│   │   ├── price.js       # 价格提取（现价/原价/出价人数/parsePrice 单位归一）
│   │   ├── format.js      # escapeHtml / formatPrice
│   │   ├── transform.js   # 响应提取 / 去重（id 或内容指纹）
│   │   └── ui-shared.js   # Toast / 样式注入 / Shadow 查询
│   ├── api/               # API 拦截与分页重放
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── interceptor.js # fetch/XHR 拦截、请求模板捕获
│   │   ├── template.js    # 列表打分 / 模板捕获锁定 / 首页捕获 / URL 判定
│   │   └── paginator.js   # 分页重放聚合全部分页商品
│   ├── ui/                # UI 渲染（shadcn · Shadow DOM 内联样式）
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── tokens.js      # 设计令牌（语义令牌 CSS，注入 :host）
│   │   ├── components.js   # 组件样式（SearchBar/Grid/Card/Badge/Empty/Skeleton）
│   │   ├── styles.js      # 内联样式聚合（令牌 + 工具栏 + 组件）
│   │   ├── toolbar.js     # 工具栏挂载（含 insertBefore 直接子节点锚定修复）
│   │   ├── toolbar/        # 工具栏子模块
│   │   │   ├── history.js  # 历史持久化（storage 回退内存）+ 下拉渲染
│   │   │   └── events.js   # 事件绑定 + 历史导航
│   │   ├── results/        # 结果面板
│   │   │   ├── host.js     # 宿主挂载/面板定位（rAF 节流）/网格容器
│   │   │   ├── styles.js   # 结果面板样式聚合 _getResultsCss()
│   │   │   └── results.js  # 公开 API（展示/隐藏/骨架/空状态/销毁/清理定时器）
│   │   ├── products.js    # 商品渲染（克隆卡片 / 填充 / 回退卡片）
│   │   ├── price-render.js# 价格区块渲染（主价/原价/出价人数 国际化）
│   │   └── skeleton.js    # 骨架屏（网格容器 / shimmer 占位）
│   ├── dom/               # DOM 观察与处理
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── observer.js    # MutationObserver 监听
│   │   ├── extract.js     # 从 DOM 提取商品（价格原文优先回查）
│   │   ├── price-text.js  # 原生卡片现价文本回查
│   │   ├── native-list.js # 原生列表显隐（_toggleNativeProducts）
│   │   ├── filter.js      # 原生列表过滤与卡片定位
│   │   └── selectors.js   # 京东 DOM 选择器集中维护
│   ├── content/            # 主内容脚本（拆分后）
│   │   ├── enhancer.js     # 增强器：状态/初始化/生命周期/页面类型
│   │   └── search.js       # 搜索编排：响应处理/过滤/跨页加载
│   ├── content.js          # 入口：引导增强器初始化
│   └── styles.css         # Toast全局样式（Shadow DOM外）
├── _locales/              # 国际化文件（v1.5.3 起仅保留简体中文 + 英文）
│   ├── zh_CN/messages.json
│   └── en/messages.json
├── README.md              # 中文说明（默认）
├── README_EN.md           # 英文说明
└── icons/                 # 插件图标目录（可选）
```

## 技术规范

### 浏览器支持

- Chrome/Edge (Chromium) 88+
- Firefox 88+

### 核心技术

- **Manifest V3** - 现代扩展标准
- **Shadow DOM** - 样式隔离（工具栏样式内联至 Shadow DOM `:host`）
- **设计令牌共享** - `tokens._getTokensCss(scope)` 按作用域注入：工具栏用 `:host`，结果面板（浅 DOM）用 `#jds-results-host`，二者共用同一套 prototype 浅色令牌
- **结果面板用浅 DOM** - 为继承京东原生卡片样式，结果面板覆盖层使用真实 DOM 承载；其组件样式（骨架/空状态/网格）严格作用域 `#jds-results-host`，不泄漏到京东页面
- **MutationObserver** - DOM变化监听
- **Fetch/XHR Interceptor** - API拦截
- **Internationalization (i18n)** - 多语言支持（`getMessage` 优先 `chrome.i18n`，缺失回退内置双语字典；占位符 `$1/$2` 替换；UI 文案零硬编码）

## 设计系统

采用 shadcn 设计语言（浅色极简风），以 zinc 中性灰阶 + 京东红作为唯一强调色。原型（prototype/index.html）已预演深色模式、容器查询响应式与指数缓动等增强，可作为后续扩展实装的参考（扩展当前仅浅色）。

### 语义令牌（Semantic Tokens）

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--background` / `--foreground` | #ffffff / #18181b | 主背景/文本 |
| `--primary` / `--primary-hover` | #e1251b / #c1170f | 京东红强调 |
| `--secondary` / `--muted` | #f4f4f5 / #fafafa | 次级/静默背景 |
| `--muted-foreground` / `--subtle-foreground` | #71717a / #a1a1aa | 次级/静默文本 |
| `--border` / `--border-strong` | #e4e4e7 / #d4d4d8 | 边框/强边框 |
| `--success` / `--warning` / `--destructive` | #16a34a / #d97706 / #dc2626 | 状态色 |

### 组件库（三层架构）

| 层级 | 组件 | 数量 |
|------|------|------|
| 基础（Atoms） | Button, Input, Badge, Separator, Skeleton, Toast | 6 |
| 复合（Molecules） | SearchBar, Card, Alert, EmptyState | 4 |
| 业务（Organisms） | AuctionToolbar, ProductGrid | 2 |

### 交互标准

- **反馈**：Toast（sonner 风格，图标 + 自动堆叠，2.5s 自动消失）
- **加载**：Skeleton 骨架屏（shimmer 动画，数据加载 >300ms 触发）
- **错误**：Alert 内联提示 + 降级策略（API 失败 → DOM 提取）
- **空状态**：EmptyState（图标 + 标题 + 描述 + 建议）

### 无障碍

- ARIA 角色：`role="region"`, `role="status"`
- ARIA 状态：`aria-live`, `aria-busy`, `aria-hidden`
- 键盘导航：Enter 搜索、Tab 切换焦点
- `prefers-reduced-motion` 适配

## 功能清单

| 功能模块 | 功能描述 | 状态 |
|---------|---------|------|
| 关键词搜索 | 输入商品名称/ID实时过滤 | ✅ |
| Tab分类筛选 | 全部/正在夺宝/即将开始 | 已移除（v1.2.9 简化 UI，仅保留关键词搜索） | ❌ |
| API拦截缓存 | 自动拦截并缓存API响应 | ✅ |
| DOM提取数据 | API不可用时从DOM提取 | ✅ |
| 一键启停 | 已移除（简化 UI，默认常驻启用） | ❌ |
| 国际化支持 | 简体中文 / 英文界面（zh_CN / en），内置双语兜底字典全覆盖 | ✅ |
| 构建打包 | 支持一键打包发布 | ✅ |

## 代码规范

### 文件头注释

所有代码文件第一行必须包含：

```javascript
// JD-Auction-Search/path/to/file.js vX.Y.Z
```

### 命名约定

- 常量：全大写下划线分隔（`API_BASE_URL`）
- 类/构造函数：大驼峰（`AuctionSearchEnhancer`）
- 变量/函数：小驼峰（`getProductId`）
- 私有成员：下划线前缀（`_interceptFetch`）

### 代码风格

- 缩进：2空格
- 单引号优先
- 分号必须
- 函数必须有注释

## 版本历史

### v1.5.5
- 全面代码审计与对齐：修复语法/安全/性能问题，所有源文件头版本统一至 v1.5.5
- 超 200 行模块拆分：`toolbar.js`→`toolbar/history.js`+`toolbar/events.js`；`results/host.js` 样式抽至 `results/styles.js`；`utils/extract.js` 价格逻辑抽至 `utils/price.js`；`dom/extract.js` 拆 `dom/price-text.js`+`dom/native-list.js`；`ui/products.js` 价格渲染抽至 `ui/price-render.js`；`api/interceptor.js` 打分/模板抽至 `api/template.js`（manifest content_scripts 同步）
- 国际化全覆盖：新增 13 个翻译键（计数/起拍/出价/加载更多/ARIA 等），`getMessage` 支持 `$N` 占位符替换，UI 渲染文件零硬编码中文字面量
- 安全：移除 `javascript:void(0)` 回退（无链接卡片改 `role=button`+`tabIndex=0`），图片/链接 URL 白名单，无 `innerHTML` 拼接用户数据
- 性能：结果面板定位 `scroll/resize` 改为 rAF 节流；批量插入 `DocumentFragment` 减少重排；XHR 解析前先按 URL 过滤
- 修复挂载 bug：`_mountWithRetry` 的 `insertBefore` 在 `rightEl` 为深层子孙（非直接子节点）时抛 `NotFoundError`，现向上回溯到直接子节点作锚点
- 生命周期清理：`results.destroy()` 清除所有定时器与 `focusout` 监听，避免泄漏
- 测试与构建：`scripts/smoke.js` 升级为 117 断言全覆盖（命名空间/i18n/价格/安全/DOM/去重/拦截/渲染/历史/清理/规范）；`build.js` 多行化并校验 manifest 脚本完整性

### v1.5.3
- 恢复国际化：`getMessage` 优先 `chrome.i18n`，缺失回退内置双语字典；仅保留 zh_CN 与 en，移除 zh_TW；`_locales` 重建（zh_CN 补 history 三键、新增 en/messages.json）；manifest 加 `default_locale`
- 搜索历史持久化：`manifest.json` 新增 `storage` 权限；`toolbar.js` 用 `chrome.storage.local`（`_STORAGE_KEY='jds_search_history'`）在增/删/清空时 `_persistHistory()`、渲染时 `_loadSearchHistory()` 回填，无 storage 环境自动回退内存
- 历史下拉关闭逻辑由 document pointerdown 改为 Shadow `focusout`，规避 closed Shadow DOM 下 retarget 不可靠导致的误关/吞点击
- 测试对齐：func 测试 zh-TW 断言改为 en 兜底校验

### v1.5.2
- 修复搜索后清空原生列表空白：`hideNativeProducts` 优先隐藏整个列表容器（虚拟列表/懒加载下，仅隐藏卡片会导致清空后原生列表仍空白），容器重见时京东自行重渲染
- DOM 提取商品性校验：无详情链接且无主图的导航/标签类非商品项不再混入结果（价格非硬要求）
- 修复价格重复显示：主价等于划线原价时仅保留划线原价行并去划线，新增 `.jds-product-orig-only`
- 集成测试增强：新增非商品项过滤、搜索态隐藏/恢复列表容器断言

### v1.5.1
- 修复分页重放缺 Referer（`_buildPageRequest` 以当前页地址兜底）导致翻页失败、搜索只命中首页
- 样式幂等注入（`injectStyles` 同路径只注入一次），避免 SPA 重渲染重复注入
- 详情页直达无全局数据时展示空态而非白屏
- observer 回调 150ms 节流，避免京东列表高频抖动冗余重渲染
- 性能优化：`getProductPriceText` 首调构建 name→priceText 缓存（O(1)），消除 O(N²) 开销
- 搜索匹配扩展：新增分类名/店铺名/副标题字段召回
- 测试增强：`.func.test.js` 新增分页 Referer、列表评分、分页参数识别断言
- 版本同步：manifest/metadata 升至 1.5.1，构建脚本统一同步 src 文件头版本号

### v1.5.0
- 工程化：新增 ESLint 配置与 `npm run lint`，GitHub Actions CI（lint+test+build）接入 PR/推送校验
- 测试增强：新增 `integration.test.js`（jsdom 集成测试，47 断言）
- 选择器集中化：新建 `src/dom/selectors.js` 统一维护京东 DOM 选择器
- DOM 提取健壮性：名称精确类优先再回退模糊类；未命中显式 Toast 告警
- 结果渲染分页：移除 200 条硬截断，改为首屏 60 条 + 加载更多
- 拦截器模板锁定：首次聚合后锁定列表模板，避免被相关推荐误替
- i18n 收敛单一来源：优先 `chrome.i18n`，移除占位符双格式死代码
- 资源清理：`destroy()` 解绑 window scroll/resize 监听
- UI 易用性：整体放大字号、卡片图片高度 120→140、工具栏实时匹配计数
- 价格展示修复：仅现价值回退 ¥0 修复、流拍不再误标「起拍」、价格单位归一、原生卡片 p-price 回查
- UI 布局修复：结果网格响应式 `auto-fill minmax(200px,1fr)`、卡片间距/焦点环优化

## 代码审查与健壮性改进
- 焦点令牌补全：`tokens.js` 新增 `--ring`
- 幂等初始化与资源还原：`enhancer.init()` 增加 `_inited` 守卫；`destroy()` 调用 `JDSApi.restoreApi()` 还原原生 fetch/XHR
- 详情链接回退基于 `location.origin` 拼接，修复子域下 404
- 价格单位归一：疑似「分」的大整数 ÷100 还原为元
- 卡片 id 稳定性：无商品 id 时改用自增序号 `jds-card-n{n}`
- 浏览态原生过滤精确化：优先按 `filteredProducts` id 集合 + 卡片链接比对，回退关键词全文匹配
- 价格行三容器拆分：`.jds-price-label` / `.jds-price-yen` / `.jds-price-amount`

### v1.4.0
- 拆分超 200 行模块：`content.js`(218) 拆分为 `content.js`(入口) + `content/enhancer.js`(增强器) + `content/search.js`(搜索编排)；`results.js`(230) 拆分为 `results.js`(公开 API) + `results/host.js`(宿主/定位/网格)，`manifest` content_scripts 同步
- 国际化修复：补齐 `toastNetworkError`/`toastRequestError` 翻译键并清除语言包死键（logoText/tabAll/tabOngoing 等），扩展可翻译 Toast 键集合，chrome.i18n 不可用时简繁中文文案仍全覆盖
- 构建增强：`build.js` 新增构建产物预览、zh-TW 本地化输出（`--tw`）、Firefox 字符串转义（`--firefox`），统一 `path` 跨平台路径处理
- 修复跨页搜索失效（critical）：`paginator.js` 末页判定以首页实际 `pageSize` 为基准，仅「非首页且条数 < pageSize（真正末页）」或「整页重复」时停止
- 优化结果面板宽度对齐原生列表：新增 `dom.getProductListContainer`，滚动/缩放时重算
- 详情页搜索保持全局一致：仅非详情页走 DOM 兜底，详情页只用全局聚合 `state.products`
- `transform.extractProductsFromResponse` 有界递归（深度 4）取「元素最多」数组，兼容嵌套响应
- `toolbar` 搜索输入 120ms 防抖；`products.renderProducts` 单次渲染上限 200 条
- 骨架屏接线：新增 `JDSUI.showLoading()`，搜索态加载中显示骨架屏
- `ui-shared` Toast 文案经 `escapeHtml` 转义后注入，纵深防御 XSS

### v1.3.5
- 修复“清空搜索按钮失效”：结果面板宿主 `#jds-results-host` 为全屏透明覆盖层未设 `pointer-events`，搜索激活时盖住嵌入态工具栏致按钮点击被拦截；现宿主 `pointer-events:none`、面板/空状态 `pointer-events:auto`，工具栏与页面恢复可交互

### v1.3.4
- 彻底修复“搜索结果不显示”：jsdom 全链路复现确认克隆京东原生卡片在真实页面“尺寸正常却整片空白”，原兜底无法识别；现彻底弃用克隆，统一扩展自带内联样式卡片（图片+标题+价格，京东红），完全脱离京东 DOM/CSS 依赖

### v1.3.3
- 彻底修复“搜索结果不显示”：京东虚拟列表把克隆卡片内容高度压为 0（`display` 非 `none`），v1.3.2 兜底无法覆盖；现统一自带网格容器 + 实测可见性校验（`display:none` 或 `height===0`）自动回退内联样式卡片

### v1.3.2
- 修复“搜索后显示空白”：克隆卡片类级 `display:none` 未被覆盖；现挂载后 `getComputedStyle` 检测并兜底为 `block`；空状态补充背景/边框/内边距/阴影

### v1.3.1
- 进一步拆分超 200 行模块：`styles.js`→`tokens.js`+`components.js`+`styles.js`；`results.js`→`results.js`+`products.js`+`skeleton.js`，`manifest` content_scripts 同步
- 安全：移除 fallback 卡片内联 `onerror`（MV3 CSP 拦截），改 `img.onerror` 属性绑定
- 国际化：补充 `zh_TW` 兜底翻译；清理源码全部 `console.log`/`console.warn`

### v1.3.0
- 源码模块化拆分：utils/api/ui/dom 四个超 200 行单体文件拆分为 17 个子模块，`manifest` content_scripts 同步，运行时行为不变
- 修复 `:host(.jds-inline)` 被错误嵌套在 `:host {}` 内的 CSS 语法错误与 `renderSkeletons` 调用未定义 `_ensureGrid` 的 TypeError
- 清理死代码（`API_BASE_URL`/废弃 i18n 键/`storage`/`activeTab` 权限等）

### v1.2.14
- 修复商品名称提取脏数据：`extractProductsFromDOM` 标题选择器误命中包裹整卡的 `<a>`，改为优先取 class 化名称元素，仅回退取 `<a>` 的 title 属性

### v1.2.13
- 修复搜索不显示结果核心根因：克隆原生卡片继承的 display:none 未清除，于 cloneNode 后及 _fillNativeCard 内统一 `card.style.display=''`，结果卡片必定可见
- 精确化商品卡片选择器：列表容器内优先查找商品卡片类，全局回退排除 nav/menu/page 等非商品项
- 增强 DOM 提取兜底：API 失败时搜索也能渲染真实主图/价格/链接

### v1.2.12
- 修复搜索结果不显示：克隆京东原生列表容器时显式强制可见 grid 布局，规避继承「未展开/懒加载」状态导致的整片 display:none；搜索时若尚无商品数据则先从 DOM 提取当前页，确保结果面板必定渲染

### v1.2.11
- 修复「API加载失败」：拦截页面真实列表请求作模板，分页重放（仅替换 page 参数），移除硬编码端点猜测；放宽拦截匹配（paimai/api.m.jd.com）并按列表相似度打分选优；拦截器已拿到首页则不再误弹错误提示

### v1.2.10
- 搜索结果视觉一致：结果面板改为 light DOM（非 Shadow），克隆京东原生列表容器+商品卡片，填入主图/标题/价格/链接，倒计时等动态残留信息清理

### v1.2.9
- 移除 `jds-tabs` 容器与「全部」按钮；`currentTab` 相关字段/过滤逻辑一并清理，仅保留关键词搜索

### v1.2.8
- 工具栏定位：检测到 `auction_head_right` 时，将 `jds-search-wrapper` 内联到其左侧（不再占满整行）

### v1.2.7
- 移除非中文语言包（保留 zh_CN/zh_TW），清理英文回退翻译
- 去除工具栏边框；移除分类 Tab（正在夺宝/即将开始），默认展示全部结果
- 修复主图/价格：多字段提取 + URL 白名单 + 数值归一 + 转义格式化

### v1.2.6
- 简化工具栏 UI：移除标题（Logo）、结果计数（Count）、启用本地开关（Toggle）
- 移除启用/禁用运行开关及 isEnabled 相关守卫，扩展默认常驻启用

### v1.2.5
- 支持多页面搜索：分页聚合全部商品，搜索/筛选结果跨页生效
- 新增独立结果面板（fixed 定位在嵌入工具栏下方），搜索态展示跨页结果并隐藏原生列表
- 观察器增加 searchMode 守卫

### v1.2.4
- 修正挂载容器选择器：真实页头为 div.auction_head（class 带下划线），原选择器无法匹配导致回退浮动条

### v1.2.3
- 扩展工具栏嵌入夺宝岛页面 auction_head 容器（优先挂载，缺失时回退浮动条）
- 精简嵌入态样式：去除浮动偏移/底栏/重阴影，改为贴合页头的静态内联卡片
- 移除商品网格浮动让位 margin-top 偏移 hack
- 空状态浮层改为居中显示

### v1.2.2
- 采用 shadcn 设计语言（浅色极简风）
- 重写 UI：语义令牌体系（zinc 中性 + 京东红强调）
- 组件库三层架构（Atoms/Molecules/Organisms）
- 交互标准统一（反馈/加载/错误/空状态）
- 修复 Shadow DOM 样式注入问题（样式内联至 Shadow DOM）
- Toast 升级为 sonner 风格（图标 + 自动堆叠）
- ARIA 无障碍增强（aria-selected, aria-pressed, aria-live, aria-busy）
- 整合原型为单一文件（含设计系统+组件库+交互标准展示）

### v1.2.1
- 完善多语言支持（11种语言）
- 优化 DOM 匹配算法
- 添加构建脚本
- 更新项目文档

### v1.2.0
- 重构代码，模块化拆分
- 实现 API 拦截和缓存功能
- 实现 DOM 提取数据功能
- 实现 Shadow DOM 样式隔离
- 添加一键启停功能

## 发布流程

1. 确保所有测试通过
2. 更新版本号（manifest.json, metadata.json, 代码文件头）
3. 运行 `npm run build` 打包
4. 验证打包文件内容
5. 发布到应用商店
