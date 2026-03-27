# CLAUDE.md

本文件用于为 Claude Code 提供本仓库的工作指引。

## 语言要求

- 本文件内容统一使用中文。
- 后续在此仓库内与用户的所有对话、说明、总结、提问，默认全部使用中文。
- 除非用户明确要求使用其他语言，否则不要切换到英文。

## 项目概览

这是一个基于 VitePress 的博客站点，内容按 AI、算法、文章、工程化、面试、Node.js、React、可视化、Vue 等分类组织。站点部署基础路径为 `/blog/`。

## 开发命令

### 常用命令

- `npm run dev`：启动 VitePress 开发服务器
- `npm run serve`：本地预览生产构建结果
- `npm run build`：构建静态站点到 `.vitepress/dist`
- `npm run lint`：对所有文件执行 ESLint
- `npm run lint:fix`：自动修复 ESLint 问题
- `npm run prettier`：使用 Prettier 格式化代码
- `npm run commit`：通过 Commitizen 进行交互式提交

### 单测说明

主博客未配置测试套件。`code/` 目录下的示例项目可能各自有独立的测试脚本。

## 项目结构

```
├── ai/                    # AI 相关文章
├── alg/                   # 算法文章
├── article/               # 通用技术文章
├── code/                  # 独立示例项目（browser、node、rollup 等）
├── engineer/              # 工程化实践
├── interview/             # 面试题内容
├── node/                  # Node.js 文章
├── react/                 # React 文章与教程
├── visualization/         # 数据可视化内容
├── vue/                   # Vue 文章
├── assets/                # 图片与静态资源
├── public/                # 公共静态文件
├── .vitepress/            # VitePress 配置
│   ├── config.js          # 主配置，负责引入各分类侧边栏配置
│   ├── config/            # 各分类侧边栏定义
│   └── dist/              # 构建产物（生成文件）
├── .husky/                # Git hooks（pre-commit 会执行 lint-staged）
├── .eslintrc.js           # ESLint 配置（React + TypeScript）
├── .prettierrc.js         # Prettier 配置（4 空格缩进、单引号）
└── package.json           # 根目录依赖与脚本
```

各分类目录中的 Markdown 文件对应侧边栏链接。侧边栏配置拆分在 `.vitepress/config/` 中，导航配置定义在 `.vitepress/config/nav.js`。

`code/` 目录中的项目为独立示例工程，不参与博客主站构建，但可能会被文章引用。

## 代码规范

- ESLint 已为 React 和 TypeScript 配置 4 空格缩进规则。
- Prettier 使用 120 字符行宽、不加分号、单引号。
- `lint-staged` 会在 pre-commit 阶段对已暂存的 `code/**/*.{js,jsx,ts,tsx}` 文件执行 Prettier。
- 提交信息遵循 conventional commits；已安装 Commitizen，但 commit-lint hook 当前处于注释状态。

## Git 工作流

1. 提交时会通过 Husky + lint-staged 自动格式化变更。
2. 可使用 `npm run commit` 进行交互式 conventional commit。
3. 默认分支为 `master`。

## 部署说明

- 通过 GitHub Actions（`.github/workflows/deploy.yml`）在推送到 `master` 后自动部署。
- 工作流会构建 VitePress 站点并发布到 GitHub Pages。
- 站点基础路径为 `/blog/`，配置见 `.vitepress/config.js`。

## 补充说明

- 当前站点使用 VitePress `1.0.0-beta.6`。
- 图片资源存放在 `assets/` 中，并通过相对路径引用。
- 示例项目不会作为主站的一部分被统一 lint 或 build，应将其视为独立代码库。
- `commit-msg` hook 当前未启用，如需启用，可取消 `.husky/commit-msg` 中对应配置的注释。
