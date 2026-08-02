# Changelog

## v1.5.0
- 工程化：新增 ESLint 配置(.eslintrc.json) 与 `npm run lint`，GitHub Actions CI（lint+test+build）接入 PR/推送校验
- 测试增强：新增 `integration.test.js`（jsdom 集成测试，覆盖 DOM 兜底提取字段映射、未命中显式告警、搜索 searchMode 编排、结果分页渲染），`npm test` 串联单元+集成共 47 断言
- 选择器集中化：新建 `src/dom/selectors.js` 统一维护挂载/列表/卡片/观察/价格等京东 DOM 选择器，toolbar/filter/observer/extract 改为引用，改版时一处调整
- DOM 提取健壮性：名称提取精确类优先（product-name/title 等）再回退模糊类（排除 username 等误匹配）；全部选择器未命中时显式 Toast 告警（不再静默空结果）
- 结果渲染分页：移除 200 条硬截断，改为首屏 60 条 + “加载更多”按需追加，超量结果可完整查看（新增 `.jds-load-more` 样式）
- 拦截器模板锁定：首次成功聚合后锁定列表模板，避免被相关推荐等其它接口误替；`_listScore` 对 `functionId=paipai.auction.list` 加权
- i18n 收敛单一来源：优先 `chrome.i18n`（_locales 多语言），移除占位符双格式死代码；新增 `toastDomExtractFailed` 键（zh-CN/zh-TW）
- 资源清理：`destroy()` 解绑 window scroll/resize 监听避免泄漏；骨架屏移除无意义的同步 `aria-busy`
- 细节打磨：挂载重试窗口延长至 ~4s 避免过早回退浮动条；非搜索态拦截响应不再冗余重渲染；结果网格去掉 maxWidth 以贴合面板对齐宽度
- 构建：build.js 新增文件头版本自动同步（从 manifest.version 注入 src 首行），避免多文件版本手动同步漏改
- UI 易用性：整体放大字号——搜索栏输入/按钮(13→15/12→14)、商品名/价格(12/18→14/22)、骨架屏与空状态字号同步放大、卡片图片高度(120→140)、加载更多按钮尺寸加大；工具栏内边距同步放宽
- UI 细节：Toast 日志窗口左缘对齐可见的左侧结果面板列（与左侧商品栏同宽对齐），无面板时回退居中；工具栏新增实时匹配计数（共 N 件）；原型 index.html 同步字号与版本至 v1.5.0
- 修复价格显示异常：仅 `cappedPrice` 有值时主价不再回退 ¥0（`getProductPrice` 兜底取封顶/参考价）；流拍 `currentPrice:0` 不再误判为未开拍标「起拍」（`products.js` 改用 `currentPrice != null` 判据）；区分「起拍/封顶/仅封顶」三种语义，避免同一数字重复显示；`formatPrice` 非有限值(NaN/Infinity/undefined)兜底为 0 杜绝「¥NaN」；`.func.test.js` 新增 9 条脏数据/异常回归断言
- 价格只显示现价（span.p-price）：搜索结果卡片仅渲染一个现价，移除封顶价/划线原价次价格行（`products.js`）；DOM 提取现价优先取京东精确现价元素 `.p-price`（`selectors.js` PRICE / `dom/extract.js`），确保兜底路径价格等于页面 `p-price` 实际显示值；未开拍仍保留「起拍」标签作为现价语义修饰
- 修复价格仍不准：渲染价格改为优先使用页面原生卡片 `span.p-price` 实际文本（新增 `JDSDom.getProductPriceText` 按名称回查，原生列表隐藏时 textContent 仍可读取），彻底不再依赖接口字段名/单位(分/元)猜测；DOM 提取同步存 `priceText` 原文；无对应原生卡片时回退 `formatPrice(currentPrice)`，避免单位误差导致的 ¥128,800 等错价
- 调试友好：为所有动态容器补充语义化 id——`#jds-search-wrapper`、`#jds-toolbar-root`、`#jds-results-host`、`#jds-results-panel`、`#jds-product-grid`、`#jds-empty-overlay`、`#jds-toast-stack`、`#jds-load-more`，商品卡片 `id="jds-card-{id|name}"`，便于 DevTools 直接定位
- 价格展示优化：重新渲染划线原价（原价/封顶价高于现价时显示 `.jds-product-subprice`，灰色 `line-through`、12px 较小字），与主价红色现价明显区分；出价人数 badge 缩至 11px 灰色（`jds-product-bid`），`.func.test.js` 同步更新划线次行断言
- 当前价优先：商品只要能显示当前价（`currentPrice` 或页面 `p-price` 文本任一存在）即用当前价展示，不再标注/使用起拍价；仅当两者皆无且存在 `startPrice` 时才显示「起拍」标签与起拍价
- UI 布局修复：结果网格由硬编码 `repeat(5, minmax(0,1fr))` 改为响应式 `repeat(auto-fill, minmax(200px,1fr))`（对齐原型），避免窄列表拥挤、宽列表留白；移除 `_createGrid` 与 CSS 类冲突的内联网格样式；结果面板内边距归零，消除与网格内边距叠加导致的上下过大留白

## v1.4.0
- 拆分 `content.js`(218)、`results.js`(230) 等超 200 行模块，提升可维护性（manifest content_scripts 同步）
- 国际化：补齐 `toastNetworkError`/`toastRequestError` 翻译键，清除语言包死键（logoText/tabAll 等），扩展可翻译 Toast 键集合
- 构建：`build.js` 新增产物预览、zh-TW 本地化输出（`--tw`）、Firefox 字符串转义（`--firefox`），统一 `path` 跨平台路径
- 修复跨页搜索失效（`paginator.js` 末页判定基准改为首页实际 `pageSize`）
- 修复搜索结果价格显示错误：字段名对齐京东拍拍 `auction.list` 真实接口——现价 `currentPrice`（未开拍回退 `startPrice`）、原价 `cappedPrice`（页面 `origin-price`）、出价人数 `recordCount`、主图 `primaryPic` 拼 `m.360buyimg.com` CDN、详情链接 `1paipai.jd.com/auction-detail/{id}`；DOM 兜底同步匹配 `origin-price`
- 优化搜索结果价格布局：将「现价 + 原价」聚合在同一价格行（红色现价 + 灰色删除线原价），「出价人数」独立为 badge/pill，避免三者视觉混排
- 修复起拍价/封顶价混淆：未开拍商品(currentPrice 为 null)此前被当成「现价」显示，与封顶价(cappedPrice)并排造成误混。现未开拍时显式标注「起拍」前缀、封顶价标注「封顶」且不划线，有出价时仍显示现价 + 划线原价
- 起拍价/封顶价分开成行：将封顶价（未开拍）或原价（有出价）从价格行内移到独立 `.jds-product-subprice` 行，与原价划线样式解耦，避免与现价同行混排；`.func.test.js` 新增 4 条卡片布局断言（共 34 条通过）
- 修复卡片标题双重 HTML 转义：`products.js` 对标题先 `escapeHtml` 再赋 `textContent`，导致含 `& < >` 的标题被原样显示成 `&amp; &lt; &gt;`；`textContent` 本已防 XSS，移除多余的 `escapeHtml`
- 修复 DOM 兜底字段名不匹配：搜索降级路径（接口拦截失败/JSONP）`extractProductsFromDOM` 输出 `price/originalPrice/bidCount`，而统一渲染层只读 `currentPrice/cappedPrice/recordCount`，导致所有兜底卡片被误标「起拍」、原价被当「封顶」。现按出价情况映射：有出价→`currentPrice`、无出价→`startPrice`、`originalPrice`→`cappedPrice`、`bidCount`→`recordCount`，与接口路径语义一致
- 优化结果面板宽度对齐原生列表、详情页全局搜索一致性、`transform` 有界递归、`toolbar` 防抖、`products` 渲染上限、骨架屏接线、Toast `escapeHtml` 转义

## v1.3.5

### Fixes
- 修复“清空搜索按钮失效”：结果面板宿主 `#jds-results-host` 是 `position:fixed; inset:0; z-index:999990` 的全屏透明覆盖层，但未设 `pointer-events`，搜索激活时会盖住嵌入在 `auction_head` 中（页面级 z-index 低于本层）的工具栏，导致清空/搜索按钮点击被拦截；清空后宿主仍在 DOM 中，亦持续拦截整页点击。现给宿主加 `pointer-events:none`、结果面板与空状态加 `pointer-events:auto`，工具栏与页面恢复可交互，结果卡片仍可点击

## v1.3.4

### Fixes
- 彻底修复“搜索结果不显示”：经 jsdom 全链路复现确认，此前克隆的京东原生卡片在真实页面中表现为“`display:block` 且计算高度 > 0（实测可见）却整片空白”，原 `getComputedStyle`/`getBoundingClientRect` 兜底无法识别这种“尺寸正常却不可见”的状态，导致克隆卡片被保留而结果面板呈空白。现**彻底放弃克隆京东原生卡片**，统一使用扩展自带的内联样式卡片（图片+标题+价格，京东红主色，主图失败回退占位、新窗口打开、悬停阴影），完全脱离京东 DOM/CSS 依赖，保证跨页搜索结果在任意京东页面稳定可见

## v1.3.3

### Fixes
- 彻底修复“搜索结果不显示”：克隆京东原生卡片在真实页面中，除类级 `display:none` 外，京东虚拟列表/懒加载还会把克隆卡片的内容高度压为 0（整片不可见但 `display` 非 `none`），v1.3.2 的 `getComputedStyle` 兜底无法覆盖该场景。现统一使用扩展自带网格容器（内联样式，避免继承京东列表的 flex/`!important` 布局干扰），并对每张克隆卡片做**实测可见性校验**（`getComputedStyle` 的 `display` 为 `none` 或 `getBoundingClientRect().height === 0` 时），不可见即自动替换为扩展自带的内联样式卡片（图片+标题+价格，京东红主色），确保跨页搜索结果在任何页面都稳定可见
- 扩展自带卡片支持主图加载失败回退占位图标、新窗口打开商品详情、悬停阴影反馈，视觉对齐原型空状态/商品卡设计

## v1.3.2

### Fixes
- 修复“搜索后显示空白”问题：克隆京东原生卡片时，部分商品卡片/图片容器被京东页面 CSS 通过 class 设为 `display:none`（懒加载/隐藏态的其它变体），原逻辑仅清除了 `hideNativeProducts` 写入的**内联** `display:none`，类级隐藏未被覆盖，导致克隆卡片整片不可见、结果面板呈空白。现于卡片挂载到文档后，用 `getComputedStyle` 检测真实计算样式，仅在确为 `none` 时兜底为 `block`（网格项会被块化，不影响整体网格布局），其余情况保持与原页面一致的视觉
- 增强空状态可见性：浅色 DOM 浮层（Shadow 组件样式不作用于外部）补充背景/边框/内边距/阴影，无匹配关键词时也能清晰呈现

## v1.3.1

### Refactor
- 进一步拆分超 200 行模块：`styles.js`(285) → `tokens.js`(设计令牌) + `components.js`(组件样式) + `styles.js`(聚合)；`results.js`(360) → `results.js`(面板生命周期) + `products.js`(商品渲染) + `skeleton.js`(骨架屏)。`manifest.json` content_scripts 同步引入新模块，运行时行为不变

### Security
- 修复 MV3 CSP 兼容问题：移除 fallback 卡片 `innerHTML` 中的内联 `onerror` 事件处理器，改为 `img.onerror` 属性绑定，避免默认扩展 CSP 拦截内联脚本导致主图错误回退失效

### Fixes
- 国际化兜底补充 zh_TW 繁体中文翻译，确保 `chrome.i18n` 不可用时简繁中文文案仍全覆盖、多语言切换正常
- 清理扩展源码中全部调试 `console.log` / `console.warn`，符合项目规范（构建脚本日志保留）

### Docs
- README / README_EN 项目结构与打包文件名对齐拆分模块；prototype 版本徽标同步；openspec spec 目录树同步

## v1.3.0

### Refactor
- 源码模块化拆分：将 utils/api/ui/dom 四个超过 200 行的单体文件拆分为按职责划分子模块（共 17 个文件），保持 content_scripts 经典脚本顺序加载与 window 命名空间挂载，运行时行为不变
- 各模块以 `index.js` 引导命名空间，子模块自挂载到 `JDSUtils` / `JDSApi` / `JDSUI` / `JDSDom`，manifest 同步更新脚本清单

### Fixes
- 修复 `_getInlineStyles` 中 `:host(.jds-inline)` 规则被错误嵌套在 `:host {}` 声明块内部、导致内联定位样式失效的 CSS 语法错误（现为独立兄弟规则）
- 修复 `ui.renderSkeletons` 调用未定义的 `_ensureGrid` 导致的潜在 TypeError，补全该方法

### Cleanup
- 清理死代码：api.js 的 `API_BASE_URL` / `API_LIST_ENDPOINT` / `loadProductList`；utils.js 的 9 个废弃 i18n 键（logoText / tabAll / tabOngoing / tabUpcoming / resultCount / loading / enabled / disabled / enabledLocal）；background.js 的 `UPDATE_CACHE` / `GET_CACHE` 消息处理；content.js 无发送方的 `PRODUCTS_UPDATE` 监听；manifest 未使用的 `storage` / `activeTab` 权限
- 对齐文档与原型：README/README_EN 功能与结构说明同步当前模块结构；prototype 移除已废弃开关的死样式并同步版本徽标

## v1.2.14

### Fixes
- 修复商品名称提取脏数据（测试发现）：`dom.extractProductsFromDOM` 的标题选择器含 `a[title]`，而包裹整张卡片的 `<a>` 在文档顺序上早于内部 `.name`，querySelector 命中外层 `<a>` 并取走整卡文本（含价格/倒计时），导致搜索匹配与克隆卡片标题区重复显示价格/倒计时。改为优先取 class 化名称元素，仅当取不到时回退 `<a>` 的 `title` 属性（取属性而非整段文本）

## v1.2.13

### Fixes
- 修复搜索不显示结果（核心根因）：搜索态下 `hideNativeProducts` 将原生卡片设为 `display:none`，克隆模板的 `cloneNode(true)` 继承了该内联样式，而 `_fillNativeCard` 仅恢复 opacity/visibility 未清除 `display`，导致克隆卡片整片不可见。现于克隆后立即 `card.style.display = ''` 并在 `_fillNativeCard` 内统一清除，结果面板必定渲染可见卡片
- 精确化商品卡片选择器（审查高优 #1）：`dom._getProductContainers` 改用「列表容器内优先 + 排除导航/分页等非商品项」策略，避免 `[class*="item"]` 过宽误匹配 `nav-item`/`page-item` 导致取错模板或误伤原生元素
- 增强 DOM 提取兜底：`extractProductsFromDOM` 现从真实商品卡片提取完整字段（id/name/price/image/url），API 拦截失败时搜索兜底也能渲染真实主图/价格/链接，而非仅文本

## v1.2.12

### Fixes
- 修复搜索结果不显示：克隆京东原生列表容器时显式强制为可见 grid 布局，避免继承京东「未展开/懒加载」状态导致的整片 `display:none`
- 兜底增强：搜索时若尚未聚合到商品数据，先尝试从当前 DOM 提取当前页商品，确保有结果可搜、搜索结果面板必定渲染

## v1.2.11

### Fixes
- 修复「API加载失败」提示：不再硬编码猜测列表端点，改为拦截页面真实请求并作为模板做分页重放（仅替换 `page` 参数），彻底规避端点/参数不匹配导致的请求失败
- 放宽 API 拦截匹配（覆盖 `paimai.jd.com` / `api.m.jd.com` 等真实列表接口），并按“像不像列表接口”打分挑选最佳模板
- 优化降级逻辑：拦截器已捕获到首页数据时不再误弹错误 Toast，仅当无任何商品数据时才提示并回退 DOM 提取

## v1.2.10

### Fixes
- 搜索结果与原始页面一致：结果面板改为真实 DOM（非 Shadow），克隆京东原生商品卡片（含其 grid 容器）并填充主图/标题/价格/链接，外观与 `auction-list` 原始卡片完全一致

## v1.2.9

### Improvements
- 移除 `jds-tabs` 容器与「全部」按钮：分类筛选不再需要，搜索框独立工作

## v1.2.8

### Improvements
- 工具栏定位优化：嵌入页头时若检测到 `auction_head_right`，将 `jds-search-wrapper` 插入到其**左侧**（内联），而非占满整行

## v1.2.7

### Improvements
- 精简国际化：移除中文以外的全部语言包（仅保留 zh_CN / zh_TW），并清理 utils.js 中硬编码的英文回退翻译
- 去除工具栏边框（嵌入态与浮动态均移除 border），更贴合页头
- 分类选项精简：移除「正在夺宝」「即将开始」Tab，默认展示全部结果

### Fixes
- 修复搜索结果主图不显示问题：新增 `getProductImage` 多字段兼容提取真实商品图（含 URL 白名单防注入），改以 `<img>` 渲染，加载失败回退图标
- 修复搜索结果价格不准确：新增 `getProductPrice` 多字段归一化为数值（单位元），`formatPrice` 智能格式化（整数不带小数/小数两位），并对名称与价格做 HTML 转义

## v1.2.6

### Improvements
- 简化扩展工具栏 UI：移除「夺宝搜索」标题（Logo）、搜索结果数量统计（Count）与「已启用本地」开关（Toggle）
- 移除启用/禁用运行开关及其相关运行时代码（content/dom/api/background 的 isEnabled 守卫与消息处理），扩展默认常驻启用

## v1.2.5

### Features
- 支持多页面搜索：分页聚合 `1paipai.jd.com/auction-list/` 全部商品，搜索/筛选结果跨页生效

### Improvements
- 新增独立结果面板（Shadow DOM 宿主挂在 body，fixed 定位在嵌入工具栏下方），搜索态展示跨页结果、隐藏京东原生列表
- 浏览态（无筛选）恢复京东原生列表与 DOM 实时过滤，降级路径（API 失败时从 DOM 提取当前页）保留
- 观察器增加 searchMode 守卫，搜索态下跳过原生列表显示重建

## v1.2.4

### Fixes
- 修正挂载容器选择器：真实页头为 `div.auction_head`（class 带下划线），原 `[class*="auctionHead"]` 无法匹配导致回退浮动条；现以 `div.auction_head` 为首选匹配

## v1.2.3

### Features
- 扩展工具栏嵌入夺宝岛页面 `auction_head` 容器（优先挂载，缺失时回退为浮动条）

### Improvements
- 精简嵌入态样式：去除浮动偏移、底栏与重阴影，改为贴合页头的静态内联卡片
- 移除商品网格为浮动条让位的 `margin-top` 偏移 hack
- 空状态浮层改为居中显示，不再依赖浮动条高度

## v1.2.2

### Features
- 采用 shadcn 设计语言（浅色极简风，zinc 中性 + 京东红强调）
- 建立语义令牌体系（--background/--foreground/--primary 等）
- 创建高保真整合原型（设计系统+组件库+交互标准，prototype/index.html）
- 组件库三层架构（Atoms 8 / Molecules 4 / Organisms 3）
- 交互标准统一（反馈/加载/错误/空状态）
- 增强无障碍支持（ARIA 角色/状态、键盘导航、语义化 HTML）
- 支持 prefers-reduced-motion 动画优化

### Security
- 添加消息发送者验证（background.js）
- 添加 URL 白名单验证（api.js）
- 强制 HTTPS 协议
- API 参数白名单过滤
- 商品数据输入验证

### Improvements
- 重写 src/ui.js：样式内联至 Shadow DOM :host，修复样式注入问题
- 更新 src/styles.css：Toast 升级为 sonner 风格（图标+自动堆叠）
- 更新 src/utils.js：showToast 支持类型与图标
- 更新 src/content.js：toggle 同步工具栏视觉态
- 清理冗余原型文件（删除 interactive.html、design-tokens.css）
- 更新 OpenSpec 规范文档（新增设计系统章节）
- 同步 README.md 和 README_EN.md 文档

## v1.2.1

### Improvements
- 统一国际化支持：使用 chrome.i18n API 和 _locales 目录
- 移除重复代码：getMessage 函数统一在 utils.js 中
- 优化代码结构：消除硬编码字符串，使用翻译键
- 修复 content.js 中重复的选择器定义
- 更新 manifest.json 配置 default_locale
- 重命名 locales 目录为 _locales（符合 Chrome 扩展标准）

## v1.2.0

### Features
- 重构代码，实现模块化架构
- 新增 API 拦截和缓存功能
- 新增 DOM 提取数据功能（API失败时降级）
- 实现 Shadow DOM 样式隔离
- 新增一键启停功能
- 优化移动端响应式布局

### Improvements
- 增强错误处理机制
- 优化搜索性能
- 完善代码注释

### Fixes
- 修复样式冲突问题
- 修复空状态显示问题

## v1.1.0

### Features
- 新增 Tab 分类筛选功能（全部/正在夺宝/即将开始）
- 新增搜索结果计数显示
- 新增清空搜索按钮

### Improvements
- 优化搜索体验，支持实时搜索
- 新增空状态提示

## v1.0.0

### Features
- 初始版本发布
- 基础关键词搜索功能
- 基础 UI 界面