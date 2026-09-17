# well's blog

个人技术总结博客，基于 VitePress 构建。覆盖 **前端**（`frontend/`）与 **Node.js 后端**（`node/`）两大知识体系，每篇正文配套小结、模块总结、模块面试题与（node 侧）可运行示例代码。

## 知识体系总览

### 前端（frontend/）

12 个模块、48 篇文章，分「基础」与「进阶」两级：

| 层级 | 模块 | 篇数 |
| --- | --- | --- |
| 基础 | HTML 基础 | 2 |
| 基础 | CSS | 6 |
| 基础 | JavaScript 核心 | 6 |
| 基础 | 网络与浏览器 | 4 |
| 基础 | 前端框架 - React | 6 |
| 基础 | 前端框架 - Vue | 3 |
| 进阶 | TypeScript | 2 |
| 进阶 | 前端工程化与构建 | 5 |
| 进阶 | 交付与质量 | 6 |
| 进阶 | 前端框架原理 | 2 |
| 进阶 | 性能优化与监控 | 4 |
| 进阶 | 工程实践与架构 | 2 |

每模块含 `总结.md`（模块总结）与 `面试题.md`（模块面试题）；`进阶/面试方法论.md` 提供五步答题法、追问链与 STAR 项目包装，是复习面试题的入口。

### Node.js 后端（node/）

11 个模块、67 篇文章、20 个可运行配套代码项目：

| 模块 | 内容主线 | 配套代码 |
| --- | --- | --- |
| 01-运行环境 | Node.js 是什么 / 模块系统 / 事件循环 / 异步 / Buffer 与 Stream / 进程线程 | node-basics |
| 03-网络编程与实时通信 | TCP / HTTP / WebSocket 与 SSE / 一次请求完整经历 | net-lab |
| 04-Express 与 Koa | 快速入门 / 项目模板 / 源码分析 | express-* / koa-* |
| 05-数据库 | MySQL / MongoDB / PostgreSQL 与 pgvector | *-demo |
| 06-Redis | 基础与数据类型 / 持久化 / 缓存实战 / 进阶 | redis-demo |
| 07-NestJS 入门 | 学习地图 / IOC / 模块提供器 / 控制器 / 请求链 / 数据库集成 | nestjs-basics / nestjs-mini |
| 08-NestJS 进阶 | 装饰器 / 认证 / 微服务 / Fastify / 源码 / 项目模板 | nestjs-template / advanced-* / microservice-demo |
| 09-部署与工程化 | 环境 / 日志 / PM2 / Docker / Nginx / 发布 / CI-CD | deploy-lab |
| 10-脚手架开发 | 脚手架开发入门 | — |
| 11-进阶主题 | 消息队列 / 性能 / 安全 / 测试 / 设计模式 / 系统设计 / Git | — |

学习路径建议按模块编号顺序推进（01 → 03 → 04 → …），每个模块先读正文、再跑配套代码、最后用模块面试题自测。`node/12-面试方法论/` 提供后端侧的答题方法论。

## 目录结构

```text
.
├── .vitepress/            # VitePress 配置（导航 / 侧栏 / 站点配置）
├── .github/workflows/     # 部署流水线
├── .workbuddy/            # 内部文档（方案 / 规范 / 脚本）
├── docs/                  # 设计规格文档（superpowers specs）
├── frontend/              # 前端知识体系（基础 / 进阶 + 面试方法论）
├── node/                  # Node.js 知识体系（11 模块 + 方法论 + 配套代码）
└── index.md               # 站点首页
```

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
- 新增脚本时必须同步三处：项目 README、`package.json` 的 `scripts`、对应篇正文的配套代码表（见《文档组织规范》第 7 章）。

## 内容规范

文档组织与写作规则见 `.workbuddy/docs/文档组织规范.md`，要点：目录/文件名保留编号、侧栏标题不写编号前缀、总结为两级知识树、面试题每题五步法（结论/原理/边界/追问/场景）、代码块给出处与实测输出。

## 质量校验

提交前运行：

```bash
npm run prettier    # prettier --write .，统一格式
npm run build       # vitepress build，确认无 404 警告
```

校验脚本与判定标准见《文档组织规范》第 8 章。

## 提交与部署

- 提交遵循 conventional commits（husky + commitlint 强制，可用 `npm run commit` 引导）。
- 推送到 `master` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动构建并部署到 GitHub Pages。
