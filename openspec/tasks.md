# 京东夺宝搜索增强 - 任务清单

## 已完成任务

### v1.5.3
- [x] 恢复国际化：`getMessage` 优先 `chrome.i18n`，仅保留 zh_CN/en，移除 zh_TW；`_locales` 重建（zh_CN 补 history 三键、新增 en/messages.json）；manifest 加 `default_locale`
- [x] 搜索历史持久化：`manifest.json` 新增 `storage` 权限；`toolbar.js` 用 `chrome.storage.local`（`_STORAGE_KEY='jds_search_history'`）增/删/清空调 `_persistHistory()`、渲染调 `_loadSearchHistory()` 回填，无 storage 回退内存
- [x] 历史下拉关闭逻辑由 document pointerdown 改为 Shadow `focusout`，规避 closed Shadow DOM retarget 不可靠导致的误关/吞点击
- [x] 测试对齐：func 测试 zh-TW 断言改为 en 兜底校验
- [x] 版本统一升至 v1.5.3（manifest / metadata / package / 各文件头 / prototype 徽标 / README 打包名 / CHANGELOG/spec/tasks）

### v1.5.2
- [x] 修复搜索后清空原生列表空白：`hideNativeProducts` 优先隐藏整个列表容器（`getProductListContainer`），容器重见时京东自行重渲染，清空后原生列表稳定恢复
- [x] DOM 提取商品性校验：`extractProductsFromDOM` 跳过无详情链接且无主图的非商品项（分类导航/标签/文字项），不再误混入结果
- [x] 修复价格重复显示：主价等于划线原价时仅保留划线原价行并去 `line-through`（`.jds-product-orig-only`），避免同一金额双重显示
- [x] `host.js` 新增 `.jds-product-subprice .jds-product-orig-only` 样式
- [x] 集成测试增强：`integration.test.js` 新增非商品项过滤、搜索态隐藏/清空恢复列表容器断言
- [x] 版本统一升至 v1.5.2（manifest / metadata / package / 各文件头 / prototype 徽标 / README 打包名 / CHANGELOG/spec/tasks）

### v1.4.0
- [x] 拆分超 200 行模块：`content.js`(218)→`content.js`+`content/enhancer.js`+`content/search.js`；`results.js`(230)→`results.js`+`results/host.js`，manifest content_scripts 同步
- [x] 国际化修复：补齐 `toastNetworkError`/`toastRequestError` 翻译键并清除语言包死键（logoText/tabAll 等），扩展可翻译 Toast 键集合，chrome.i18n 不可用时简繁文案仍全覆盖
- [x] 构建增强：`build.js` 新增产物预览、zh-TW 本地化输出（`--tw`）、Firefox 字符串转义（`--firefox`），统一 `path` 跨平台路径
- [x] 修复跨页搜索失效（critical）：`paginator.js` 末页判定硬编码 50 条阈值，京东每页仅 20~30 条导致第 1 页后停止翻页；改为以首页 `pageSize` 为基准，仅真正末页或整页重复时停止
- [x] 结果面板宽度对齐原生列表：新增 `dom.getProductListContainer`，`results._positionResultsPanel` 测量原生容器设 `left`/`width` 与原始页一致（滚动/缩放重算）
- [x] 详情页搜索保持全局一致：`content._isDetailPage()` 仅非详情页走 DOM 兜底，详情页只用全局聚合数据
- [x] `transform.extractProductsFromResponse` 有界递归（深度 4）取元素最多的商品数组，兼容嵌套响应、排除面包屑/分类误判
- [x] `toolbar` 搜索输入 120ms 防抖，减少全量重渲染
- [x] `products.renderProducts` 单次渲染上限 200 条，超出显示「已显示前 N 条，共 M 条」
- [x] 骨架屏接线：新增 `JDSUI.showLoading()`，`init` 提前置 `isLoading`，搜索态无结果且加载中显示骨架屏
- [x] `ui-shared` Toast 文案经 `escapeHtml` 转义注入，纵深防御 XSS
- [x] 代码审查（code-reviewer 技能）：11 处超长行折行清零；为魔法数字补常量说明（DEBOUNCE_MS / maxPages=30 / 加载延时）

### v1.3.5
- [x] 修复“清空搜索按钮失效”：结果面板宿主全屏透明覆盖层未设 pointer-events，搜索激活时盖住嵌入态工具栏致按钮点击被拦截；现宿主 pointer-events:none、面板/空状态 pointer-events:auto，工具栏与页面恢复可交互

### v1.3.4
- [x] 彻底修复“搜索结果不显示”：jsdom 全链路复现确认克隆京东原生卡片在真实页面“display:block 且高度>0 却整片空白”，原兜底无法识别；现彻底弃用克隆，统一扩展自带内联样式卡片（图片+标题+价格，京东红），完全脱离京东 DOM/CSS 依赖

### v1.3.3
- [x] 彻底修复“搜索结果不显示”：克隆卡片在真实页面除类级 display:none 外，京东虚拟列表还会把克隆卡片内容高度压为 0（display 非 none），v1.3.2 兜底无法覆盖；现统一扩展自带网格容器 + 实测可见性校验（display:none 或 height===0 时）自动回退内联样式自带卡片，确保跨页结果稳定可见

### v1.3.2
- [x] 修复“搜索后显示空白”：克隆原生卡片仅清除了内联 display:none，类级隐藏（京东 CSS 懒加载/隐藏态变体）未被覆盖；现挂载后用 getComputedStyle 检测，确为 none 时兜底为 block
- [x] 增强空状态可见性：浅色 DOM 浮层补充背景/边框/内边距/阴影

### v1.3.1
- [x] 代码审查修复：拆分 styles.js(285行)→tokens.js + components.js + styles.js 聚合器，results.js(360行)→results.js(面板生命周期) + products.js(商品渲染) + skeleton.js(骨架屏)，manifest content_scripts 同步引入新模块
- [x] 安全修复：移除 fallback 卡片内联 `onerror` 事件处理器，改为属性绑定（`img.onerror`），规避 MV3 默认 CSP 对 `on*` 内联属性的拦截
- [x] 国际化修复：i18n 兜底字典补充 zh_TW 繁体翻译，确保 chrome.i18n 不可用时简繁中文仍全覆盖
- [x] 规范清理：移除扩展源码中全部调试 `console.log` / `console.warn`（background/content/toolbar/results）
- [x] 版本统一升至 v1.3.1（manifest / metadata / package / 各文件头 / prototype 徽标 / README 打包名）
- [x] 文档同步：README / README_EN 项目结构与说明对齐拆分后的模块，spec.md 目录树同步

### v1.3.0
- [x] 源码模块化拆分：utils/api/ui/dom 四个超 200 行单体文件拆分为 17 个子模块（index 引导 + 职责子模块），manifest content_scripts 同步更新，运行时行为不变
- [x] 修复 CSS 语法错误：ui 内联样式中 `:host(.jds-inline)` 被错误嵌套在 `:host {}` 内导致内联定位失效，调整为独立兄弟规则
- [x] 修复潜在 TypeError：补全 `ui._ensureGrid`（renderSkeletons 此前引用未定义方法）
- [x] 清理死代码：api 的 API_BASE_URL/API_LIST_ENDPOINT/loadProductList、utils 的 9 个废弃 i18n 键、background 的 UPDATE_CACHE/GET_CACHE 处理、content 的 PRODUCTS_UPDATE 无发送方监听、manifest 未使用的 storage/activeTab 权限
- [x] 对齐文档与原型：README/README_EN 功能/结构/安全说明同步；prototype 移除废弃开关死样式并同步版本徽标
- [x] 功能回归测试：逻辑级注入测试 7/7 通过，0 运行期异常

### v1.2.12
- [x] 修复搜索结果不显示：ui.js renderProducts 克隆京东列表容器时显式强制可见 grid 布局（覆盖 display:none 懒加载态）；content.js _applyFilterAndUpdate 搜索时若 products 为空先 DOM 提取兜底
- [x] 版本升至 v1.2.12，同步 manifest/metadata/package、各文件头、README、prototype、CHANGELOG/spec/tasks

### v1.2.13
- [x] 修复搜索不显示结果核心根因：克隆原生卡片继承的 display:none 未清除，于 cloneNode 后及 _fillNativeCard 内统一 `card.style.display=''`，结果卡片必定可见
- [x] 精确化商品卡片选择器（审查高优 #1）：列表容器内优先查找商品卡片类，全局回退排除 nav/menu/page 等非商品项，避免误匹配
- [x] 增强 DOM 提取兜底：extractProductsFromDOM 提取完整字段（id/name/price/image/url），API 失败时搜索仍能渲染真实主图/价格/链接
- [x] 版本升至 v1.2.13，同步 manifest/metadata/package、各文件头、README、prototype、CHANGELOG/spec/tasks

### v1.2.14
- [x] 修复商品名称提取脏数据：extractProductsFromDOM 标题选择器去掉 `a[title]` 整段文本命中，优先取 class 化名称元素，仅回退 `<a>` 的 title 属性
- [x] Playwright 功能测试覆盖：工具栏内联挂载 / API 降级 Toast / 搜索渲染克隆卡片 / 清除恢复 / 无匹配空态 / API 拦截逻辑，7/7 通过，0 个运行期异常
- [x] 版本升至 v1.2.14，同步 manifest/metadata/package、各文件头、README、prototype、CHANGELOG/spec/tasks

### v1.2.11
- [x] 修复「API加载失败」：api.js 拦截页面真实列表请求作模板（_captureRequestTemplate + _listScore 选优）、分页重放（_findPageParam/_buildPageRequest）；放宽 _isAuctionUrl；content.js 降级逻辑不再误弹 Toast
- [x] 版本升至 v1.2.11，同步 manifest/metadata/package、各文件头、README、prototype、CHANGELOG/spec/tasks

### v1.2.10
- [x] 搜索结果视觉一致：结果面板改为 light DOM，克隆京东原生卡片（含 grid 容器）并填主图/标题/价格/链接；新增 utils.getProductUrl、dom.getFirstProductCard、ui._fillNativeCard/_renderFallbackCards

### v1.2.9
- [x] 移除 jds-tabs 容器与「全部」按钮；清理 currentTab 字段、onTabChange 处理、tab 过滤 switch 及 tabs CSS/事件

### v1.2.8
- [x] 工具栏定位优化：检测到 auction_head_right 时，将 jds-search-wrapper 内联到其左侧

### v1.2.7
- [x] 移除中文以外的国际化语言（保留 zh_CN/zh_TW），清理英文回退翻译
- [x] 去除 jds-toolbar 边框
- [x] 移除「正在夺宝」「即将开始」选项，默认展示全部结果
- [x] 修复搜索结果主图与价格显示（多字段提取 + URL 白名单 + 数值归一 + 转义格式化）

### v1.2.6
- [x] 简化工具栏 UI：移除「夺宝搜索」标题、搜索结果计数、已启用本地开关
- [x] 移除启用/禁用运行开关及相关 isEnabled 守卫与消息处理，默认常驻启用

### v1.2.5
- [x] 支持多页面搜索：分页聚合全部商品，搜索/筛选结果跨页生效
- [x] 新增独立结果面板，搜索态展示跨页结果、隐藏原生列表
- [x] 观察器增加 searchMode 守卫

### v1.2.4
- [x] 修正挂载容器选择器：真实页头为 div.auction_head（class 带下划线），原选择器无法匹配导致回退浮动条

### v1.2.3
- [x] 扩展工具栏嵌入夺宝岛页面 auction_head 容器（含缺失回退浮动条）
- [x] 精简嵌入态样式，适配页头显示
- [x] 移除浮动条遗留偏移 hack，空状态浮层居中

### v1.2.2
- [x] 采用 shadcn 设计语言，建立语义令牌体系（zinc + 京东红）
- [x] 创建高保真整合原型（设计系统+组件库+交互标准）
- [x] 重写 src/ui.js：样式内联至 Shadow DOM，对齐原型组件结构
- [x] 更新 src/styles.css：Toast 升级为 sonner 风格
- [x] 更新 src/utils.js：showToast 支持图标与类型
- [x] 组件库三层架构（Atoms 8 / Molecules 4 / Organisms 3）
- [x] 交互标准统一（反馈/加载/错误/空状态）
- [x] ARIA 无障碍增强（aria-selected, aria-pressed, aria-live）
- [x] 清理冗余原型文件（删除 interactive.html、design-tokens.css）
- [x] 同步 OpenSpec 文档与 README

### v1.2.1
- [x] 完善多语言支持（11种语言）
- [x] 优化 DOM 匹配算法，提高准确性
- [x] 添加构建脚本和打包流程
- [x] 更新项目文档和规范
- [x] 让 README 默认为中文
- [x] 更新 openspec 文档

### v1.2.0
- [x] 重构代码，模块化拆分
- [x] 实现 API 拦截和缓存功能
- [x] 实现 DOM 提取数据功能
- [x] 实现 Shadow DOM 样式隔离
- [x] 添加一键启停功能
- [x] 优化移动端响应式布局

### v1.1.0
- [x] 添加 Tab 分类筛选功能
- [x] 优化搜索体验
- [x] 添加空状态提示

### v1.0.0
- [x] 初始版本发布
- [x] 基础关键词搜索功能
- [x] 基础 UI 界面

## 待实现功能

### 未来规划
- [ ] 支持更多电商平台
- [ ] 添加历史搜索记录
- [ ] 添加收藏功能
- [ ] 价格提醒功能
- [ ] 导出搜索结果
- [ ] 暗黑模式支持
- [ ] 用户配置面板
- [ ] 搜索结果排序
