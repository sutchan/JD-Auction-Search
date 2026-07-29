# 京东夺宝搜索增强 - 任务清单

## 已完成任务

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
