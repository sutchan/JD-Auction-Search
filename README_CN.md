# 京东夺宝搜索增强

> 为京东夺宝页面 (`1paipai.jd.com/auction-list/`) 增加商品关键词搜索和分类过滤功能的浏览器插件。

## 功能特性

| 功能 | 说明 |
|------|------|
| **关键词搜索** | 输入商品名称/ID 实时过滤夺宝商品 |
| **Tab 分类** | 全部 / 正在夺宝 / 即将开始 三种状态切换 |
| **API 拦截缓存** | 自动拦截京东夺宝 API 响应，缓存完整商品列表 |
| **DOM 提取** | API 不可用时自动从页面 DOM 提取商品数据 |
| **Shadow DOM 隔离** | UI 组件使用 Shadow DOM 渲染，完全隔离样式 |
| **一键启停** | 顶部工具栏可随时启用/禁用插件 |
| **多语言支持** | 支持中文、英文、西班牙文、阿拉伯文、法文、葡萄牙文、德文、日文、韩文、俄文 |

## 项目结构

```
JD-Auction-Search/
├── manifest.json          # 扩展配置 (Manifest V3)
├── background.js          # 后台脚本（状态管理）
├── metadata.json          # 项目元数据
├── CHANGELOG.md           # 变更日志
├── openspec/              # 规范文档目录
│   ├── spec.md            # 项目规范
│   ├── check_list.md      # 检查清单
│   └── tasks.md           # 任务列表
├── src/
│   ├── utils.js           # 工具函数
│   ├── api.js             # API 管理
│   ├── ui.js              # UI 渲染
│   ├── dom.js             # DOM 处理
│   ├── content.js         # 主内容脚本
│   └── styles.css         # 搜索 UI 样式
├── locales/               # 国际化文件目录
│   ├── en/messages.json
│   ├── zh-CN/messages.json
│   ├── zh-TW/messages.json
│   ├── es/messages.json
│   ├── ar/messages.json
│   ├── fr/messages.json
│   ├── pt-BR/messages.json
│   ├── de/messages.json
│   ├── ja/messages.json
│   ├── ko/messages.json
│   └── ru/messages.json
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
4. 支持 Tab 切换分类筛选

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

## 技术栈

- **Manifest V3** - 现代浏览器插件标准
- **Shadow DOM** - 样式隔离，避免冲突
- **MutationObserver** - 高效 DOM 变化监听
- **Fetch/XHR 拦截** - 无侵入式数据获取

## 许可证

MIT License
