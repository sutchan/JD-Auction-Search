# 京东夺宝岛搜索增强 — 验收清单（Check List）

> 用于版本发布前的功能与质量验收。✅ 为已满足，⚠️ 为需注意项。

## 功能验收

- [x] 扩展加载到 Chrome/Edge/Firefox 后，夺宝岛列表页自动注入红色搜索栏
- [x] 输入关键词后结果实时过滤，覆盖商品名/ID/分类/店铺/副标题
- [x] 跨页聚合生效：翻页后全部分页商品均参与搜索
- [x] 接口失效时自动降级为页面 DOM 提取，搜索不中断
- [x] 搜索时结果面板覆盖层遮挡原生列表（原生始终存活），清空后自动恢复且无空白
- [x] 深度后台搜索生效：显示当前结果的同时后台持续搜更多页，命中数实时增长
- [x] 搜索历史持久化（刷新保留），支持单条删除与一键清空
- [x] 聚焦空搜索框显示历史下拉，点击外部/失焦正常收起
- [x] 结果面板含骨架屏、空状态、加载更多
- [x] 多语言切换（zh_CN / en）正常

## 质量验收

- [x] `npm run build` 成功输出 `releases/jd-auction-search-v1.6.3.zip`
- [x] 测试（`npm test` 即 `node scripts/smoke.js` jsdom 全链路冒烟，约 97 断言）全部通过
- [x] ESLint（`npm run lint`）无错误
- [x] 版本号一致：manifest / metadata / package / 各文件头 / 文档
- [x] 名称统一为「京东夺宝岛」（无「京东夺宝」旧称残留）
- [x] 样式隔离：工具栏 Shadow DOM、结果面板浅 DOM，无全局污染
- [x] 安全：HTML 转义、无内联事件、无外部网络请求

## 文档验收

- [x] README 含三步上手、核心功能、使用说明、安装、工作原理、贡献
- [x] README 顶部 badges 与效果预览截图展示正常
- [x] CHANGELOG 记录至 v1.6.3
- [x] openspec 三文档（spec/tasks/check_list）与代码一致
- [x] _locales 含 zh_CN 与 en，manifest 含 `default_locale`

## 发布前

- [ ] 仓库 About 描述与 Topics 设置（jd-auction-search / 浏览器扩展 / 京东夺宝岛）
- [ ] Social Preview 封面图上传（Settings → General）
- [ ] 真实运行截图替换 AI 演示图（可选）
- [ ] Chrome / Firefox 商店上架或内部分发
