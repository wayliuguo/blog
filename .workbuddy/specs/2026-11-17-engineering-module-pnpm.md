# Spec：构建体系模块改为工程化并新增 pnpm

日期：2026-11-17
状态：已确认（2026-11-18 按「三部分 + 三台真实工程实验台」调整）

## 目标

把 `frontend/构建体系/` 整体改名为 `frontend/工程化/`，侧边栏、总结、配套代码 README 与面试题引用同步更新；在模块内新增《pnpm》一篇及三台配套实验台（`npm-lab`、`pnpm-core-lab`、`pnpm-workspace-lab`）。现有 Vite / Webpack 篇与各 lab 的 npm 命令保持不动。

## 改名清单

| 位置 | 改动 |
| --- | --- |
| `frontend/构建体系/` | `git mv` 为 `frontend/工程化/` |
| `.vitepress/config/frontend.js` | 分组 `text` 改「工程化」；四项顺序 pnpm → Vite → Webpack → 模块总结（工程化）；link 前缀全部改 `/frontend/工程化/` |
| `frontend/工程化/总结.md` | 标题改「模块总结 · 工程化」；大纲与正文编号重排为 1. pnpm / 2. Vite / 3. Webpack；新增 pnpm 章 |
| `frontend/工程化/code/README.md` | 标题改「工程化 · 配套代码」；模块路径改 `frontend/工程化/`；实验台表补三台 pnpm 实验台 |
| `interview/前端/面试题-Vite.md`、`面试题-Webpack.md` | 开头对齐路径改 `frontend/工程化/...` |

不改：Vite.md、webpack.md 正文与 code 下既有 lab 的命令、锁文件。

## 侧边栏终态

```js
{
    text: '工程化',
    collapsed: false,
    items: [
        { text: 'pnpm', link: '/frontend/工程化/pnpm' },
        { text: 'Vite', link: '/frontend/工程化/Vite' },
        { text: 'Webpack', link: '/frontend/工程化/webpack' },
        { text: '模块总结（工程化）', link: '/frontend/工程化/总结' }
    ]
}
```

## 《pnpm》三部分骨架

| 部分 | 小节 | 结论 | 表达 |
| --- | --- | --- | --- |
| 一、npm 问题 | 重复安装 | 平坦树同名包只留一份顶层，另一份嵌进依赖方；同一行 `require` 从不同目录命中不同版本 | `npm-lab`（package.json + `npm ls --all` 实测输出） |
| | 幽灵依赖 | 传递依赖被拍到顶层，未声明的包也能 `require` | 同一工程（顶层目录 + `require` 实测输出） |
| 二、pnpm 核心特性 | store 硬链接 + 符号链接 | 全局 store 内容寻址，文件硬链接进 `.pnpm`，顶层是指向 `.pnpm` 的符号链接 | `pnpm-core-lab/app-a`、`app-b`（`LinkType` / `.Target` / `fsutil hardlink list` 实测输出） |
| | 严格 node_modules | 未声明依赖在 pnpm 下直接 `MODULE_NOT_FOUND`；`public-hoist-pattern` / `shamefully-hoist` / `node-linker=hoisted` 三档放宽；`onlyBuiltDependencies` 管安装脚本 | 同一工程内 `node -e` 实测输出 + 三档表 |
| 三、构建 monorepo | 工作区骨架 / 建包与声明本地依赖 / 安装后的链接与锁文件 / 按依赖图执行脚本 / 日常管理 / 发布 | `pnpm-workspace.yaml` 声明成员；`workspace:*` 建本地链接；`--filter` / `-r` 按拓扑序执行；增删依赖、`pnpm why`、发布 | `pnpm-workspace-lab`（yaml / package.json / 锁文件片段 / 命令实测输出） |

尾注固定 `## 配套代码` + `## 参考`（参考首行为本模块总结）。所有代码块逐字摘自真实文件，所有输出逐字来自本机运行。

已删除（用户确认）：锁文件与冻结安装、CI 只凭锁文件安装、npm 迁移对照。

## 实验台结构

三台都是**普通可安装工程**，没有 `scripts`、没有 `lab.mjs` / `cases/` / `fixtures/`；读者 `install` 后自行观察 `node_modules`。

```
frontend/工程化/code/
├── npm-lab/
│   ├── package.json               # is-even@1.0.0 + is-odd@3.0.1（两个 is-number 版本；未声明的 is-number 在顶层）
│   └── README.md                  # 安装与观察命令
├── pnpm-core-lab/
│   ├── app-a/package.json         # is-even@1.0.0
│   ├── app-b/package.json         # is-even@1.0.0（与 app-a 共享 store 里的同一份硬链接）
│   └── README.md                  # 安装与观察命令（LinkType / Target / hardlink list / MODULE_NOT_FOUND）
└── pnpm-workspace-lab/
    ├── package.json               # 根：private + packageManager + 汇总脚本
    ├── pnpm-workspace.yaml        # packages/* + apps/*
    ├── pnpm-lock.yaml             # 入库，保证解析结果可复现
    ├── packages/utils/            # @lab/utils：无依赖
    ├── packages/ui/               # @lab/ui：@lab/utils（workspace:*）+ is-odd
    ├── apps/web/                  # @lab/web：@lab/ui（workspace:*）
    └── README.md                  # 建工作区 → 声明本地依赖 → 安装形态 → 编排 → 日常管理 → 发布
```

约束：

- 三台都只声明依赖、不写 scripts（`pnpm-workspace-lab` 的根与成员保留 build/start，用于演示 `-r` / `--filter` 编排）。
- `node_modules` / `package-lock.json` 由 `code/.gitignore` 忽略；`pnpm-lock.yaml` 入库。
- 输出只收稳定事实（链接目标、运行结果、锁文件片段、构建顺序），不收耗时。

## 总结.md 重排

- 大纲：`1. pnpm`（1.1–1.4）、`2. Vite`（2.1–2.10）、`3. Webpack`（3.1–3.9）
- 正文：`## 1. pnpm` 四节（npm 平坦树两个后果 / 安装模型 / 严格 node_modules / 构建 monorepo）；原 `## 1. Vite` / `### 1.x` 改为 `## 2.` / `### 2.x`；原 `## 2. Webpack` / `### 2.x` 改为 `## 3.` / `### 3.x`
- pnpm 章内容与《pnpm》篇结论一致，不重复贴代码

## 验收

1. `npm-lab` 执行 `npm install` 成功；`pnpm-core-lab/{app-a,app-b}` 与 `pnpm-workspace-lab` 各自 `pnpm install` 成功
2. 文档中「摘自」代码块与源文件逐字一致，实测输出与当前机器重跑一致
3. `NODE_OPTIONS` 清空后 VitePress build 通过（含新页面与中文路径）
4. 全库 grep `构建体系`、`pnpm-lab`、`pnpm lab` 无残留（git 历史与本 spec 除外）
5. 侧边栏四项与 `frontend/工程化/` 文件一一对应
