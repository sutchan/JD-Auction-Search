# 京东夺宝岛搜索增强 — 任务清单（Tasks）

## 进行中

_（当前无进行中任务）_

---

## 已完成任务

### v1.6.10
- [x] 修复版本同步脚本：bump-version.js 正则仅匹配 `.js` 之后文件头版本，避免污染路径（native-list.js/observer.js）；修正已损坏文件头；工具栏/倒计时元素补充语义化 id；版本号全量同步 v1.6.10

### v1.6.8
- [x] 完善项目文档：修正 spec.md 目录树（移除 icons/、补 countdown.js、补 v1.6.6/v1.6.7 版本历史）、check_list.md（断言数 108/拍卖倒计时验收）、README 版本同步命令、docs/README 截图说明；版本号全量同步 v1.6.8
- [x] 补全扩展图标：生成 icons/（icon16/48/128.png，红底白锤搜索风格）、manifest 增加 icons 与 action.default_icon、build.js 打包 icons/ 目录、spec.md 目录树补回 icons/

### v1.6.7
- [x] 重构 build.js：模块化拆分、zip 打包 Promise 化、构建失败设置退出码；版本号全量同步 v1.6.7

### v1.6.6
- [x] 去除 README/README_EN 关于 PNG 图标的可选说明（manifest 未引用图标）；版本号全量同步 v1.6.6

### v1.6.5
- [x] 文档更新：README/README_EN 补「拍卖倒计时」说明、断言数 108、README_EN 徽章→1.6.5；版本号全量同步 v1.6.5

### v1.6.4
- [x] 修复拍卖倒计时不跳动：新增 `src/ui/countdown.js` 单例计时器，渲染时注册，重渲染/销毁时清理

### v1.6.3
- [x] 规范与版本号统一：openspec 三文档、prototype 设计系统、版本同步脚本文件头对齐至 v1.6.3
- [x] 代码审查：全量源码 ESLint 0 错、冒烟测试 97/0 全绿、无超 200 行文件、安全与性能达规范

### v1.6.2
- [x] 卡片新增拍卖时间展示（`.p-time`），信息层级调整（价格区上移、名称置底）

### v1.6.1
- [x] 卡片价格与名称显示微调：修复底部边距过高（`.jds-product-body` flex:1 撑满 + 移除 `.note` 多余 margin-top）
- [x] 货币符号 `.jds-price-yen` 与现价整数同色（`var(--primary)`）
- [x] 现价整数 `.jds-price-int` 字号 16→20px；商品名 `.jds-product-name` 字号 14→12px

### v1.6.0
- [x] 价格渲染重构：结果卡片 class 对齐京东语义（`.p-price`/`.origin-price`/`.note`，作用域隔离 `#jds-results-host`）
- [x] 修复 `.p-price` 不显示（移除 `priceEqualsOrig` 对主价行跳过）
- [x] 现价取数修复：提取层优先取 `div.p-price > i` 文本，避免杂文干扰
- [x] `.origin-price` 与现价同行（新增 `.jds-product-price-row` 横向 flex）
- [x] 出价人数渲染移出 `priceEqualsOrig` 分支，与价格平级
- [x] 卡片下边距优化（body 14→12px，网格 40→28px）
- [x] API 加载失败兜底增强：保留增量数据、未达重试上限保持等待、达上限才标记失败空态（不再永久放弃重试）

### v1.5.5
- [x] src 架构重构：拆分 `api/`、`content/`、`dom/`、`ui/`、`utils/` 多层模块，各层 `index.js` 命名空间引导
- [x] 结果面板样式迁移至 `ui/results/styles.js`（浅 DOM 组件 CSS），工具栏样式收敛 Shadow DOM
- [x] 设计令牌 `ui/tokens.js` 引入，与 prototype 设计系统对齐，支持 Shadow/浅 DOM 双 scope 注入
- [x] 搜索历史持久化落地：`ui/toolbar/history.js` + `storage` 权限 + 下拉 focusout 收起
- [x] 国际化收敛（zh_CN / en，`default_locale`），`getMessage` 优先 chrome.i18n
- [x] 打包输出目录改为 `releases/`（build.js + clean 脚本 + README 说明）
- [x] 文档重构：README 使用说明优化 + SEO/GEO，openspec 三文档重建
- [x] 生成真实预览截图 `docs/screenshots/`（search/history/empty），README 预览区恢复引用
- [x] 搜索召回增强：放宽拦截主机白名单至 `*.jd.com`、候选模板回退、清除搜索覆盖层遮挡（替代 `display:none` 恢复）
- [x] 深度后台搜索：边搜边显（onPage 增量刷新）+ 排序维度深搜 + 分片续搜（单片 20 页续搜至末页/200 页上限）；新增 `paginator-deep.js`/`deep-search.js`/`history-item.js`
- [x] 代码审查修复：XHR 重复监听、init 依赖判空、decodeURIComponent 保护、observer 容器兜底、死代码移除、rAF 清理

### v1.5.3
- [x] 搜索历史持久化（chrome.storage.local），下拉关闭改 Shadow focusout
- [x] 恢复国际化（chrome.i18n 优先，移除 zh_TW），_locales 重建
- [x] 文档与 SEO/GEO 优化

### v1.5.2
- [x] DOM 提取商品性校验（跳过无详情链接且无主图的非商品项）
- [x] 修复清空搜索后原生列表空白（隐藏整个列表容器）
- [x] 修复价格重复显示（现价等于封顶价时，主价行始终渲染、不再重复渲染划线原价行）
- [x] 集成测试增强（非商品项过滤、隐藏/恢复容器断言）

### v1.5.1
- [x] 修复分页重放缺 Referer 导致翻页失败
- [x] 样式幂等注入、observer 150ms 节流、价格缓存 O(1)
- [x] 搜索匹配扩展分类名/店铺名/副标题
- [x] 测试增强（分页 Referer、列表评分、分页参数识别）

### v1.5.0
- [x] 工程化：ESLint + CI（lint+test+build 接入 PR/推送）
- [x] 集成测试（jsdom，47 断言）
- [x] 选择器集中化（src/dom/selectors.js）
- [x] 结果渲染分页（首屏 60 + 加载更多）
- [x] i18n 单一来源、UI 易用性提升

### v1.4.0
- [x] 基础搜索增强与 UI 初版

---

## 待规划（Backlog）

- [ ] 真实运行截图替换 AI 演示图（docs/screenshots）
- [ ] Firefox 官方商店发布流水线（`--firefox` 构建已支持，待上架）
- [ ] 搜索结果按价格/热度排序选项
- [ ] 关键词高亮与命中字段提示
