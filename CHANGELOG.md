# Changelog

## v1.2.2

### Features
- 建立完整设计系统（色彩/字体/间距/圆角/阴影/动效）
- 创建高保真可交互原型（prototype/index.html）
- 实现组件库规范（Button/SearchBar/Tabs/Toast/EmptyState）
- 增强无障碍支持（ARIA 标签、键盘导航、语义化 HTML）
- 支持 prefers-reduced-motion 动画优化

### Security
- 添加消息发送者验证（background.js）
- 添加 URL 白名单验证（api.js）
- 强制 HTTPS 协议
- API 参数白名单过滤
- 商品数据输入验证

### Improvements
- 更新 src/styles.css 使用完整设计令牌
- 优化 src/ui.js 引入外部样式文件
- 更新 OpenSpec 规范文档
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