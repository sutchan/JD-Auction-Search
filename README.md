# 京东夺宝岛搜索增强（JD Auction Search）

[![Version](https://img.shields.io/badge/version-1.5.3-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](./package.json)
[![Manifest](https://img.shields.io/badge/manifest%20v3-FF9800.svg)](./manifest.json)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Firefox-cyan.svg)](./README.md#安装)

> 京东夺宝岛（拍拍）列表页商品搜索浏览器插件 · 关键词实时过滤 · 跨页聚合 · 自动兜底

**京东夺宝岛怎么搜索商品？** 京东夺宝岛（1paipai.jd.com）原生列表页不支持关键词搜索，只能手动翻页找商品。本扩展为夺宝岛列表页注入一个搜索栏，输入关键词即可**跨页聚合、实时过滤**所有夺宝商品——手机、华为、数码、显卡……一搜即得，无需逐页翻找。

[English](./README_EN.md) · [更新日志](./CHANGELOG.md) · [项目规范](./openspec/spec.md)

---

## 效果预览

> 将扩展运行截图放入 `docs/screenshots/`（建议 `search.png`、`empty.png`、`history.png`），
> 并在下方替换路径即可在仓库主页展示。

| 搜索过滤 | 空状态 | 搜索历史 |
|----------|--------|----------|
| ![搜索](./docs/screenshots/search.png) | ![空状态](./docs/screenshots/empty.png) | ![历史](./docs/screenshots/history.png) |

---

## 三步上手（30 秒）

1. **装**：把本项目作为「已解压扩展」加载到 Chrome / Edge / Firefox（见下方[安装](#安装)）。
2. **开**：打开任意京东夺宝岛列表页，页面顶部自动出现**红色搜索栏**。
3. **搜**：在搜索框输入关键词（如 `手机`、`华为`），结果**实时**刷新并覆盖展示；点 **×** 清空恢复原生列表。

就是这么简单，无需刷新页面、无需登录。

---

## 使用说明

打开京东夺宝岛列表页后，扩展会自动接管搜索体验：

| 步骤 | 操作 | 效果 |
|------|------|------|
| ① 出现搜索栏 | 进入夺宝岛列表页，等待约 2 秒 | 页面顶部自动注入红色搜索栏 |
| ② 输入关键词 | 在搜索框键入商品名 / ID / 分类 / 店铺 | 结果**实时**过滤，已跨页汇总全部匹配商品 |
| ③ 查看结果 | 结果面板覆盖原生列表展示 | 支持加载更多、点击卡片**新标签页**打开详情 |
| ④ 清空搜索 | 点搜索框右侧 **×** | 原生夺宝列表自动恢复，无需刷新 |
| ⑤ 无结果时 | 未匹配到商品 | 面板显示「未找到匹配商品」空状态提示 |

> 搜索时原生列表自动隐藏，清空后自动恢复；整个过程无需刷新页面。
> 搜索框聚焦且为空时会显示**历史记录下拉**（支持单条删除与一键清空），刷新后仍保留。

---

## 核心功能

- **关键词实时搜索**：按商品名称、ID、分类名、店铺名、副标题即时过滤。
- **跨页聚合**：自动翻页汇总多页夺宝商品，搜索结果覆盖全部分页，告别手动翻页。
- **接口兜底**：夺宝接口不可用时自动降级为页面 DOM 数据提取，搜索不中断。
- **搜索历史**：本地持久化最近 10 条关键词，刷新不丢失。
- **多语言**：简体中文 / 英文界面。

---

## 安装

### 1. 准备图标（可选）
在 `icons/` 目录放入 3 个 PNG 图标：`icon16.png`、`icon48.png`、`icon128.png`。缺少图标也不影响加载。

### 2. 加载到浏览器
- **Chrome / Edge**：打开 `chrome://extensions/` → 开启「开发者模式」→ 点击「加载已解压的扩展程序」→ 选择本项目文件夹。
- **Firefox**：打开 `about:debugging#/runtime/this-firefox` → 点击「临时加载附加组件」→ 选择 `manifest.json`。

> 发布到应用商店时通过 `npm run build` 打包为 zip（见[打包发布](#打包发布)）。

---

## 打包发布

```bash
npm install
npm run build
```

将在项目根目录生成 `jd-auction-search-v1.5.3.zip`，可直接发布。

可选构建参数：
- `node build.js --tw`：以繁体中文（zh-TW）命名输出 `jd-auction-search-v1.5.3-zh-TW.zip`
- `node build.js --firefox`：对 `messages.json` 做 Firefox 字符串转义（`'` → `\'`、`\` → `\\`）
- `node build.js --no-preview`：跳过构建产物预览

---

## 常见问题

| 情况 | 处理 |
|------|------|
| 页面加载后插件无响应 | 刷新页面，或等待约 2 秒自动加载 |
| 搜索无结果 / 接口失败 | 插件会自动降级为页面数据提取模式 |
| 跨域拦截 | 已配置 `host_permissions`，通常无需处理 |

---

## 许可证

MIT License

---

### 关键词

京东夺宝岛搜索 · 拍拍搜索插件 · 夺宝岛商品筛选 · 京东拍卖关键词搜索 · 浏览器扩展 · Chrome 扩展 · Edge 插件 · Firefox 插件 · 跨页聚合搜索 · 实时过滤
