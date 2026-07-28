# Changelog

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