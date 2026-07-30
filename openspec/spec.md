# 京东夺宝搜索增强 - 项目规范文档

## 项目概述

**项目名称**: JD-Auction-Search  
**版本**: 1.3.5  
**类型**: 浏览器扩展插件

为京东夺宝页面（1paipai.jd.com/auction-list/）增加商品关键词搜索功能（含 API 拦截缓存与 DOM 提取兜底）。

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
│   ├── utils/             # 工具函数（i18n/字段提取/格式化/响应转换/UI共享）
│   │   ├── index.js       # 命名空间引导
│   │   ├── i18n.js        # 国际化 getMessage（简繁中文兜底）
│   │   ├── extract.js     # 商品字段提取（id/name/主图/价格/链接）
│   │   ├── format.js      # escapeHtml / formatPrice
│   │   ├── transform.js   # 响应提取 / 去重
│   │   └── ui-shared.js   # Toast / 样式注入 / Shadow 查询
│   ├── api/               # API 拦截与分页重放
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── interceptor.js # fetch/XHR 拦截、请求模板捕获、列表打分
│   │   └── paginator.js   # 分页重放聚合全部分页商品
│   ├── ui/                # UI 渲染（shadcn · Shadow DOM 内联样式）
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── tokens.js      # 设计令牌（语义令牌 CSS，注入 :host）
│   │   ├── components.js   # 组件样式（SearchBar/Grid/Card/Badge/Empty/Skeleton）
│   │   ├── styles.js      # 内联样式聚合（令牌 + 工具栏 + 组件）
│   │   ├── toolbar.js     # 工具栏挂载与事件
│   │   ├── results.js     # 结果面板生命周期（挂载/定位/空状态/销毁）
│   │   ├── products.js    # 商品渲染（克隆卡片 / 填充 / 回退卡片）
│   │   └── skeleton.js    # 骨架屏（网格容器 / shimmer 占位）
│   ├── dom/               # DOM 观察与处理
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── observer.js    # MutationObserver 监听
│   │   ├── extract.js     # 从 DOM 提取商品
│   │   └── filter.js      # 原生列表过滤与卡片定位
│   ├── content.js         # 主内容脚本（整合调度）
│   └── styles.css         # Toast全局样式（Shadow DOM外）
├── _locales/              # 国际化文件（v1.2.7 起仅保留简繁中文）
│   ├── zh_CN/messages.json
│   └── zh_TW/messages.json
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
- **MutationObserver** - DOM变化监听
- **Fetch/XHR Interceptor** - API拦截
- **Internationalization (i18n)** - 多语言支持

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
| 国际化支持 | 简繁中文界面（zh_CN / zh_TW） | ✅ |
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

### 待发布改进（2026-07-30，未升版）
- 修复跨页搜索失效（critical）：`paginator.js` 末页判定硬编码 50 条阈值，京东拍卖每页仅 20~30 条，导致第 1 页抓取后立刻停止翻页、跨页搜索失效；改为以首页实际条数 `pageSize` 为基准，仅「非首页且条数 < pageSize（真正末页）」或「整页重复」时停止
- 优化结果面板宽度对齐原生列表：新增 `dom.getProductListContainer`；`results._positionResultsPanel` 测量原生容器设 `left`/`width` 与原始页一致，滚动/缩放时重算
- 详情页搜索保持全局一致：`content._isDetailPage()` 仅非详情页走 DOM 兜底，详情页只用全局聚合 `state.products`，避免只搜当前详情页
- `transform.extractProductsFromResponse` 有界递归（深度 4）取「元素最多」的商品数组，兼容 `{data:{list}}` 等嵌套响应，排除面包屑/分类误判
- `toolbar` 搜索输入 120ms 防抖，减少全量重渲染
- `products.renderProducts` 单次渲染上限 200 条，超出显示「已显示前 N 条，共 M 条」提示
- 骨架屏接线：新增 `JDSUI.showLoading()`，`init` 提前置 `isLoading`，搜索态无结果且加载中显示骨架屏
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
