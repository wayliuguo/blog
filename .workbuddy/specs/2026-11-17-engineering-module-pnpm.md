# Spec：构建体系模块改为工程化并新增 pnpm

日期：2026-11-17
状态：已确认

## 目标

把 `frontend/构建体系/` 整体改名为 `frontend/工程化/`，侧边栏、总结、配套代码 README 与面试题引用同步更新；在模块内新增《pnpm》一篇及 `code/pnpm-lab` 实验台。现有 Vite / Webpack 篇与各 lab 的 npm 命令保持不动。

## 改名清单

| 位置 | 改动 |
| --- | --- |
| `frontend/构建体系/` | `git mv` 为 `frontend/工程化/` |
| `.vitepress/config/frontend.js` | 分组 `text` 改「工程化」；四项顺序 pnpm → Vite → Webpack → 模块总结（工程化）；link 前缀全部改 `/frontend/工程化/` |
| `frontend/工程化/总结.md` | 标题改「模块总结 · 工程化」；大纲与正文编号重排为 1. pnpm / 2. Vite / 3. Webpack；新增 pnpm 章 |
| `frontend/工程化/code/README.md` | 标题改「工程化 · 配套代码」；模块路径改 `frontend/工程化/`；实验台表补 pnpm-lab |
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

## 《pnpm》七章骨架

| 章 | 结论 | 表达 |
| --- | --- | --- |
| 一、npm 平坦树的两个后果 | 重复安装 + 幽灵依赖可被 require | ASCII 目录树 + 示意片段 |
| 二、安装模型：store / 硬链接 / `.pnpm` / 符号链接 | 全局 store 内容寻址，文件硬链接进项目，顶层是链接不是副本 | ASCII + 示意 |
| 三、严格 node_modules | 未声明依赖在 pnpm 下直接 `MODULE_NOT_FOUND`；`public-hoist-pattern` / `shamefully-hoist` 的取舍 | ASCII + 示意 |
| 四、lockfile 固化解析结果 | `pnpm-lock.yaml` 结构；`--frozen-lockfile` 让锁文件与 package.json 不一致时失败 | 示意 yaml + 示意命令 |
| 五、workspace 多包仓库 | `workspace:*` 建本地链接；`--filter` / `-r` 按依赖图执行 | `workspace`（`pnpm-lab`） |
| 六、CI：fetch + 冻结 + 缓存 | 只凭锁文件预热 store，再离线安装 | 示意命令 |
| 七、迁移与命令对照 | npm → pnpm 命令表；`packageManager` + corepack | 速查表 |

结尾固定 `## 配套代码` + `## 参考`（参考首行为本模块总结）。只有第五章的代码块逐字摘自 lab 脚本并标注来源与运行命令，其余小节标注「示意片段（无配套脚本）」。

## 实验台结构

只保留 pnpm 侧的 workspace 实验，npm 侧不建 lab。

```
frontend/工程化/code/pnpm-lab/
├── package.json          # private；scripts.lab = node lab.mjs；无第三方依赖
├── lab.mjs               # case 分发（当前只有 workspace）
├── cases/
│   ├── workspace.mjs     # 工作区链接目标、--filter 拓扑执行
│   └── _util.mjs         # 执行命令、复制 fixture、路径格式化
├── fixtures/
│   └── workspace/        # pnpm-workspace.yaml + packages/utils + packages/ui + apps/web + 锁文件
├── .work/                # 运行期临时工程与安装目录（gitignore）
└── README.md             # case ↔ 篇目对照表
```

约束：

- 输出只收稳定事实（链接目标、运行结果、锁文件片段、构建顺序），不收耗时。
- lab 无第三方依赖，`pnpm lab workspace` 直接运行；`.work/` 由 `code/.gitignore` 忽略。
- workspace fixture 的 `pnpm-lock.yaml` 入库，保证解析结果可复现。

## 总结.md 重排

- 大纲：`1. pnpm`（1.1–1.5）、`2. Vite`（2.1–2.10）、`3. Webpack`（3.1–3.9）
- 正文：新增 `## 1. pnpm` 与五个知识域；原 `## 1. Vite` / `### 1.x` 改为 `## 2.` / `### 2.x`；原 `## 2. Webpack` / `### 2.x` 改为 `## 3.` / `### 3.x`
- pnpm 章内容与《pnpm》篇结论一致，不重复贴代码

## 验收

1. `pnpm lab workspace` 可跑，第五章读数与输出一致；其余小节标注「示意片段（无配套脚本）」
2. `NODE_OPTIONS` 清空后 VitePress build 通过（含新页面与中文路径）
3. 全库 grep `构建体系` 无残留（git 历史除外）
4. 侧边栏四项与 `frontend/工程化/` 文件一一对应
