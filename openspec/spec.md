# 京东夺宝搜索增强 - 项目规范文档

## 项目概述

**项目名称**: JD-Auction-Search  
**版本**: 1.2.2  
**类型**: 浏览器扩展插件

为京东夺宝页面（1paipai.jd.com/auction-list/）增加商品关键词搜索和分类过滤功能。

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
│   ├── utils.js           # 工具函数
│   ├── api.js             # API管理
│   ├── ui.js              # UI渲染
│   ├── dom.js             # DOM处理
│   ├── content.js         # 主内容脚本
│   └── styles.css         # 样式文件
├── _locales/              # 国际化文件
│   ├── en/messages.json
│   ├── zh_CN/messages.json
│   ├── zh_TW/messages.json
│   ├── es/messages.json
│   ├── ar/messages.json
│   ├── fr/messages.json
│   ├── pt_BR/messages.json
│   ├── de/messages.json
│   ├── ja/messages.json
│   ├── ko/messages.json
│   └── ru/messages.json
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
- **Shadow DOM** - 样式隔离
- **MutationObserver** - DOM变化监听
- **Fetch/XHR Interceptor** - API拦截
- **Internationalization (i18n)** - 多语言支持

## 功能清单

| 功能模块 | 功能描述 | 状态 |
|---------|---------|------|
| 关键词搜索 | 输入商品名称/ID实时过滤 | ✅ |
| Tab分类筛选 | 全部/正在夺宝/即将开始 | ✅ |
| API拦截缓存 | 自动拦截并缓存API响应 | ✅ |
| DOM提取数据 | API不可用时从DOM提取 | ✅ |
| 一键启停 | 随时启用/禁用插件 | ✅ |
| 国际化支持 | 多语言界面（11种语言） | ✅ |
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
