# well's blog

个人技术总结博客，基于 VitePress 构建，覆盖 **前端**（`frontend/`）与 **Node.js 后端**（`node/`）两大知识体系，node 侧配可运行示例代码。文档组织与写作规则统一见仓库根的《文档组织规范》。

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

node 模块下的配套代码位于 `node/<模块>/code/<章节名>/`，**每个有配套代码的章节一个项目**，各自维护 `package.json` 与 README：

```bash
cd node/运行环境/code/事件循环：六个阶段与微任务
npm run <对应小节脚本>     # 脚本与正文的对应关系见各章节 README 与正文 `## 配套代码` 表
```

- 各章节项目零依赖，无需 `npm install`；正文 `## 配套代码` 表标注了每个脚本对应的小节与运行命令。
- 新增脚本时必须同步三处：章节 README、`package.json` 的 `scripts`、对应章节正文的配套代码表（见《文档组织规范》的「代码片段与配套代码表」一节）。

## 内容规范

文档组织与写作规则见仓库根 [`文档组织规范`](./文档组织规范/readme.md)，要点：

- 板块 / 模块 / 配套代码目录结构，文件名不带数字前缀，真实阅读顺序以侧栏为准；
- 单篇以 `## 配套代码` 收束，不写参考小节；不设模块总结页，篇间导航交给 VitePress 自动 prev/next；
- 正文代码块逐字来自标注的配套脚本，无脚本的速查片段显式标注「示意片段」；
- 面试题不内嵌各模块，统一收敛到 `/interview` 板块。

## 质量校验

提交前运行：

```bash
npm run prettier    # prettier --write .，统一格式
npm run build      # vitepress build，确认无 404 警告
```

文档层面的链接、侧栏覆盖、代码同步等检查与判定标准见《文档组织规范》的「改动后的校验」一节。

## 提交与部署

- 提交遵循 conventional commits（husky + commitlint 强制，可用 `npm run commit` 引导）。
- 推送到 `master` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动构建并部署到 GitHub Pages。
