# 京东夺宝搜索增强 - 项目规范文档

## 项目概述

**项目名称**: JD-Auction-Search  
**版本**: 1.2.0  
**类型**: 浏览器扩展插件

为京东夺宝页面（1paipai.jd.com/auction-list/）增加商品关键词搜索和分类过滤功能。

## 目录结构

```
JD-Auction-Search/
├── manifest.json          # 扩展配置
├── background.js          # 后台服务
├── src/
│   ├── utils.js           # 工具函数
│   ├── api.js             # API管理
│   ├── ui.js              # UI渲染
│   ├── dom.js             # DOM处理
│   ├── content.js         # 主内容脚本
│   └── styles.css         # 样式文件
├── locales/               # 国际化文件
│   ├── en/
│   ├── zh_CN/
│   └── ...
├── openspec/              # 规范文档
│   ├── spec.md
│   ├── check_list.md
│   └── tasks.md
├── README.md              # 英文说明
├── README_CN.md           # 中文说明
├── CHANGELOG.md           # 变更日志
└── metadata.json          # 元数据
```

## 技术规范

### 浏览器支持

- Chrome/Edge (Chromium) 88+
- Firefox 88+

### 核心技术

- **Manifest V3** - 现代扩展标准
- **Shadow DOM** - 样式隔离
- **MutationObserver** - DOM变化监听
- **Fetch/XHR Interceptor** - API拦截

## 功能清单

| 功能模块 | 功能描述 | 状态 |
|---------|---------|------|
| 关键词搜索 | 输入商品名称/ID实时过滤 | ✅ |
| Tab分类筛选 | 全部/正在夺宝/即将开始 | ✅ |
| API拦截缓存 | 自动拦截并缓存API响应 | ✅ |
| DOM提取数据 | API不可用时从DOM提取 | ✅ |
| 一键启停 | 随时启用/禁用插件 | ✅ |
| 国际化支持 | 多语言界面 | ✅ |

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
