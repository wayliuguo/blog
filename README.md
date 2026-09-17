# well's blog

个人技术总结博客，基于 VitePress 构建，覆盖 **前端**（`frontend/`）与 **Node.js 后端**（`node/`）两大知识体系。每篇正文配套小结、模块总结、模块面试题，node 侧还配可运行示例代码。文档组织与写作规则统一见仓库根的《文档组织规范》。

## 本地开发

```bash
npm install        # 安装依赖
npm run dev        # 本地开发预览（VitePress dev）
npm run build      # 构建站点
npm run serve      # 预览构建产物
```

- 构建产物输出到 `.vitepress/dist/`。
- 站点根路径 `base: '/blog/'`，本地预览时通过开发服务器访问即可。

## 配套代码怎么跑

node 模块下的配套代码位于 `node/<模块>/code/<项目名>/`，用法见各项目内 README：

```bash
cd node/01-运行环境/code/node-basics
npm install
npm run <对应篇号脚本>     # 每个脚本对应一篇正文，篇号见文件名前缀
```

- `node-basics` 零依赖，文件名前缀 = 篇号（`01-` ~ `06-`），正文 `## 配套代码` 表标注了每个脚本对应的小节与运行命令。
- 新增脚本时必须同步三处：项目 README、`package.json` 的 `scripts`、对应篇正文的配套代码表（见《文档组织规范》第 3 章「代码片段与配套代码表」）。

## 内容规范

文档组织与写作规则见仓库根 [`文档组织规范.md`](./文档组织规范.md)，要点：

- 板块 / 模块 / 配套代码目录结构，文件名编号仅作文档 ID，真实阅读顺序以侧栏为准；
- 单篇结尾顺序固定：小结 → 配套代码 → 参考；
- 正文代码块逐字来自标注的配套脚本，无脚本的速查片段显式标注「示意片段」；
- 小结为两级知识树（概念域 → 知识点）；
- 模块面试题按四段组织（基础概念 / 机制与原理 / 排障与选型 / 场景设计题），每题含结论 / 原理 / 边界 / 追问，并标注出处篇号。

## 质量校验

提交前运行：

```bash
npm run prettier    # prettier --write .，统一格式
npm run build      # vitepress build，确认无 404 警告
```

文档层面的链接、侧栏覆盖、代码同步等检查与判定标准见《文档组织规范》第 6 章「改动后的校验」。

## 提交与部署

- 提交遵循 conventional commits（husky + commitlint 强制，可用 `npm run commit` 引导）。
- 推送到 `master` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动构建并部署到 GitHub Pages。
