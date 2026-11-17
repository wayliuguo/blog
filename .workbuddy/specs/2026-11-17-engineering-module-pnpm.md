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

| 章 | 结论 | 实验 |
| --- | --- | --- |
| 一、npm 平坦树的两个后果 | 重复安装 + 幽灵依赖可被 require | `strict` 对照 |
| 二、安装模型：store / 硬链接 / `.pnpm` / 符号链接 | 全局 store 内容寻址，文件硬链接进项目，顶层是链接不是副本 | `store` |
| 三、严格 node_modules | 未声明依赖在 pnpm 下直接 `MODULE_NOT_FOUND`；`public-hoist-pattern` / `shamefully-hoist` 的取舍 | `strict` |
| 四、lockfile 固化解析结果 | `pnpm-lock.yaml` 结构；`--frozen-lockfile` 让锁文件与 package.json 不一致时失败 | `lockfile` |
| 五、workspace 多包仓库 | `workspace:*` 建本地链接；`--filter` / `-r` 按依赖图执行 | `workspace` |
| 六、CI：fetch + 冻结 + 缓存 | 只凭锁文件预热 store，再离线安装 | `ci` |
| 七、迁移与命令对照 | npm → pnpm 命令表；`packageManager` + corepack | 速查表（示意） |

结尾固定 `## 配套代码` + `## 参考`（参考首行为本模块总结）。代码块逐字摘自 lab 脚本并标注来源与运行命令。

## pnpm-lab 结构

```
frontend/工程化/code/pnpm-lab/
├── package.json          # private；scripts.lab = node lab.mjs；依赖 is-odd@3.0.1
├── lab.mjs               # case 分发：store / strict / lockfile / workspace / ci
├── cases/
│   ├── store.mjs         # store 路径、.pnpm 目录、junction 目标、nlink
│   ├── strict.mjs        # npm/pnpm 两个临时工程安装并 require 未声明依赖
│   ├── lockfile.mjs      # 锁文件顶层结构、改 package.json 后 frozen 安装失败
│   ├── workspace.mjs     # 工作区链接目标、--filter 拓扑执行
│   └── ci.mjs            # pnpm fetch + --offline 安装
├── fixtures/
│   ├── strict-pkg/       # 只声明 is-odd，src/check.js 里 require('is-number')
│   └── workspace/        # pnpm-workspace.yaml + packages/utils + packages/ui + apps/web
├── .work/                # 运行期临时工程与安装目录（gitignore）
└── README.md             # case ↔ 篇目小节对照表
```

约束：

- 输出只收稳定事实（路径、链接目标、`nlink`、错误码、依赖树、锁文件片段），不收耗时。
- `strict` 用例在 `.work/` 下建两个临时工程，分别执行 `npm install` 与 `pnpm install`，再 `node -e "require('is-number')"` 取结果。
- store 已在 `E:\.pnpm-store\v11`，与工程同盘，硬链接成立，不额外配置 `store-dir`。
- `code/.gitignore` 增加 `.work/`（lab 的临时安装目录不入库）；lab 根与 workspace fixture 的 `pnpm-lock.yaml` 入库，保证解析结果可复现。

## 总结.md 重排

- 大纲：`1. pnpm`（1.1–1.5）、`2. Vite`（2.1–2.10）、`3. Webpack`（3.1–3.9）
- 正文：新增 `## 1. pnpm` 与五个知识域；原 `## 1. Vite` / `### 1.x` 改为 `## 2.` / `### 2.x`；原 `## 2. Webpack` / `### 2.x` 改为 `## 3.` / `### 3.x`
- pnpm 章内容与《pnpm》篇结论一致，不重复贴代码

## 验收

1. `pnpm lab store|strict|lockfile|workspace|ci` 均可跑，正文读数与输出一致
2. `NODE_OPTIONS` 清空后 VitePress build 通过（含新页面与中文路径）
3. 全库 grep `构建体系` 无残留（git 历史除外）
4. 侧边栏四项与 `frontend/工程化/` 文件一一对应
