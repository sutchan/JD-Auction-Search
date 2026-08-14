# 贡献指南（Contributing）

感谢你考虑为 **京东夺宝岛搜索增强（JD Auction Search）** 做出贡献！本文件说明如何参与开发与提交流程。

## 开始之前

- 阅读 [README.md](./README.md) 了解项目背景与功能。
- 设计类变更请先查阅 [openspec/spec.md](./openspec/spec.md) 与 [openspec/tasks.md](./openspec/tasks.md)。
- 重要功能或破坏性变更，建议先在 Issue 中讨论，或更新 `openspec/` 三件套文档（spec / tasks / check_list）后再实现。

## 开发环境

```bash
npm install        # 安装依赖（仅开发期，如 jsdom 用于冒烟测试）
npm test           # 运行 jsdom 全链路冒烟测试（node scripts/smoke.js，约 108 断言）
npm run build      # 构建扩展产物至 releases/jd-auction-search-vX.Y.Z.zip
npm run version:sync   # 从 manifest.json 全量同步版本号（node scripts/bump-version.js）
```

## 分支策略

| 分支         | 用途                     |
|--------------|--------------------------|
| `main`       | 生产环境代码             |
| `develop`    | 集成分支                 |
| `feature/*`  | 新功能开发               |
| `fix/*`      | 修复分支                 |
| `hotfix/*`   | 紧急生产修复             |

请从 `develop` 或 `main` 切出 `feature/*` / `fix/*` 分支进行开发。

## 提交规范

提交信息遵循 Conventional Commits：

```
<type>: <description>

[可选正文]

[可选页脚]
```

类型：`feat` / `fix` / `docs` / `refactor` / `style` / `test` / `chore` / `perf`。

- 描述简短明了，≤50 字符，首字母小写，动词开头，无句号结尾。
- 涉及版本变更时，正文或页脚标注新版本号。

## 版本号规则（SemVer）

每次修改都需升级一次最小版本号（见 [CHANGELOG.md](./CHANGELOG.md)）：

- **patch**：修复、文档、重构、样式、配置等任意修改 → 第三位 +1
- **minor**：新功能、向后兼容变更 → 第二位 +1
- **major**：破坏性变更 → 第一位 +1

发版流程：

1. 修改 `manifest.json` 的 `version` 字段；
2. 运行 `npm run version:sync` 同步全局版本；
3. 更新 `CHANGELOG.md` 对应小节；
4. 提交并创建 PR。

## 代码质量

- 源码文件（`.ts/.js/.vue/.py` 等）超过 **200 行**需按职责拆分为更小模块。
- 关键逻辑添加中文注释；函数超过 20 行考虑拆分。
- 提交前确保 `npm test` 与 `npm run build` 通过，无 `console.log` / `debugger` 遗留。

## 提交 Pull Request

1. 将分支推送到你的 Fork 或本仓库；
2. 向 `main` 或 `develop` 创建 PR，标题格式同提交规范；
3. PR 描述包含：变更总结 + 动机 + 测试说明；
4. 勾选 PR 模板中的审查清单。

## 行为准则

参与本项目即表示你同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
