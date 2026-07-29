# 京东夺宝搜索增强

> 为京东夺宝页面 (`1paipai.jd.com/auction-list/`) 增加商品关键词搜索功能的浏览器插件。

## 功能特性

| 功能 | 说明 |
|------|------|
| **关键词搜索** | 输入商品名称/ID 实时过滤夺宝商品（跨页聚合） |
| **API 拦截 + 分页重放** | 自动拦截页面真实列表请求作模板，跨页聚合全部商品，搜索/筛选结果跨页生效 |
| **DOM 提取兜底** | API 不可用时自动从页面 DOM 提取商品数据（主图/价格/链接） |
| **Shadow DOM 隔离** | UI 组件使用 Shadow DOM 渲染，完全隔离样式 |
| **多语言支持** | 简体中文 / 繁体中文（zh_CN / zh_TW） |
| **无障碍支持** | ARIA 标签、键盘导航、语义化 HTML |
| **动画优化** | 支持 prefers-reduced-motion 减少动画 |

## 设计系统

本项目采用 **shadcn 设计语言**（扩展当前为浅色主题），以 zinc 中性灰阶 + 京东红作为唯一强调色，建立语义化令牌体系确保 UI 一致性；原型 (`prototype/index.html`) 额外预演深色模式与容器查询响应式，可作为后续实装的参考。

### 语义令牌（Semantic Tokens）

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--background` | #ffffff | 主背景 |
| `--foreground` | #18181b (zinc-900) | 主文本 |
| `--primary` | #e1251b | 京东红强调色 |
| `--primary-hover` | #c1170f | 强调色悬停 |
| `--secondary` | #f4f4f5 (zinc-100) | 次级背景 |
| `--muted` | #fafafa (zinc-50) | 静默背景 |
| `--muted-foreground` | #71717a (zinc-500) | 次级文本 |
| `--border` | #e4e4e7 (zinc-200) | 边框 |
| `--success` | #16a34a | 成功状态 |
| `--warning` | #d97706 | 警告状态 |
| `--destructive` | #dc2626 | 错误状态 |

### 组件库（三层架构）

**基础组件（Atoms · 6）**：Button、Input、Badge、Separator、Skeleton、Toast
**复合组件（Molecules · 4）**：SearchBar、Card、Alert、EmptyState
**业务组件（Organisms · 2）**：AuctionToolbar、ProductGrid

### 交互标准

- **反馈**：Toast 通知（sonner 风格，图标 + 自动堆叠）
- **加载**：Skeleton 骨架屏（shimmer 动画，>300ms 触发）
- **错误**：Alert 内联提示 + 降级策略（API→DOM 提取）
- **空状态**：EmptyState（图标 + 标题 + 描述 + 建议）

详见 [prototype/index.html](prototype/index.html) 高保真可交互原型（含设计系统、组件库、交互标准完整展示，支持浅色 / 深色主题切换与容器查询响应式）。

## 项目结构

```
JD-Auction-Search/
├── manifest.json          # 扩展配置 (Manifest V3)
├── background.js          # 后台脚本（生命周期钩子）
├── metadata.json          # 项目元数据
├── CHANGELOG.md           # 变更日志
├── openspec/              # 规范文档目录
│   ├── spec.md            # 项目规范
│   ├── check_list.md      # 检查清单
│   └── tasks.md           # 任务列表
├── prototype/             # 设计原型目录
│   └── index.html         # 高保真可交互原型（含设计系统+组件库+交互标准）
├── src/
│   ├── utils/             # 工具函数（i18n / 字段提取 / 格式化 / 响应转换 / UI 共享）
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
│   │   ├── styles.js      # 内联设计令牌与组件样式
│   │   ├── toolbar.js     # 工具栏挂载与事件
│   │   └── results.js     # 结果面板 / 克隆卡片 / 空状态
│   ├── dom/               # DOM 观察与处理
│   │   ├── index.js       # 命名空间引导 + 共享状态
│   │   ├── observer.js    # MutationObserver 监听
│   │   ├── extract.js     # 从 DOM 提取商品
│   │   └── filter.js      # 原生列表过滤与卡片定位
│   ├── content.js         # 主内容脚本（整合调度）
│   └── styles.css         # Toast 全局样式（Shadow DOM 外）
├── _locales/              # 国际化文件目录（简体 / 繁体中文）
│   ├── zh_CN/messages.json
│   └── zh_TW/messages.json
├── package.json           # 项目配置（构建脚本）
├── build.js               # 构建脚本
└── icons/                 # 插件图标目录（可选）
```

## 安装步骤

### 1. 添加图标（可选）

插件需要 3 个 PNG 图标文件，放到 `icons/` 目录：

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `icon16.png` | 16×16px | 地址栏小图标 |
| `icon48.png` | 48×48px | 扩展管理页面 |
| `icon128.png` | 128×128px | Chrome 应用商店 |

可使用 [Favicon Generator](https://favicon.io/) 生成，或使用任意图标工具制作。

### 2. 加载插件

**Chrome / Edge (Chromium):**

1. 打开 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `JD-Auction-Search` 文件夹

**Firefox:**

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击 **临时加载附加组件**
3. 选择 `manifest.json` 文件

### 3. 使用插件

1. 访问 [京东夺宝](https://1paipai.jd.com/auction-list/)
2. 页面顶部自动出现红色搜索栏
3. 输入关键词，点击"搜索"或按 Enter

## 构建打包

使用以下命令打包插件：

```bash
npm install
npm run build
```

这将在项目根目录下生成 `jd-auction-search-v1.3.0.zip` 文件，可直接用于发布。

## 核心实现原理

### 1. API 拦截

```javascript
window.fetch = async function(...args) {
  const res = await origFetch.apply(this, args);
  // 克隆响应，解析JSON，缓存商品数据
  const clone = res.clone();
  clone.json().then(data => { /* 缓存 */ });
  return res;
};
```

### 2. Shadow DOM 隔离

```javascript
const wrapper = document.createElement('div');
document.body.appendChild(wrapper);
this.shadowRoot = wrapper.attachShadow({ mode: 'closed' });
// UI组件渲染在shadowRoot中，完全与页面样式隔离
```

### 3. DOM 变化监听

```javascript
const observer = new MutationObserver((mutations) => {
  // 监听页面DOM变化，自动更新显示
});
observer.observe(container, { childList: true, subtree: true });
```

## 数据结构

商品对象字段映射（支持多种命名）：

| 字段 | 别名 |
|------|------|
| `id` | `skuId`, `productId`, `auctionId` |
| `name` | `title`, `productName` |
| `status` | `state`, `auctionStatus` |

状态值：
- `0` / `upcoming` → 即将开始
- `1` / `ongoing` → 正在夺宝

## 已知问题

| 问题 | 解决方案 |
|------|---------|
| 页面加载时插件未响应 | 刷新页面或等待 2 秒自动加载 |
| API 请求失败 | 插件自动降级为 DOM 提取模式 |
| 跨域 CORS 拦截 | 已配置 `host_permissions`，正常情况无需处理 |

## 安全特性

- **最小权限**: 仅声明 `host_permissions`（jd.com），不申请 storage / activeTab 等无关权限
- **URL 白名单**: 仅允许访问 jd.com 域名，并对商品主图/链接做协议白名单校验
- **HTTPS 强制**: 所有 API 请求使用 HTTPS
- **参数过滤**: API 分页重放仅替换白名单内的分页参数
- **输入验证**: 商品字段提取与 HTML 转义，防止 XSS / 非法 scheme 注入

## 技术栈

- **Manifest V3** - 现代浏览器插件标准
- **Shadow DOM** - 样式隔离，避免冲突
- **MutationObserver** - 高效 DOM 变化监听
- **Fetch/XHR 拦截** - 无侵入式数据获取
- **CSS Design Tokens** - 设计令牌系统

## 许可证

MIT License