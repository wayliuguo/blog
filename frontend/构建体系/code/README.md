# 构建体系 · 配套代码

前端「构建体系」模块的配套实验代码。所有结论都来自本机实跑，数字可直接对照文档里的实测段落。

对应文档：`frontend/构建体系/` 下各篇（Vite、Rollup、总结）。

## 环境要求

- Node.js 22+（Vite 8 要求 Node 20.19+ / 22.12+，实测用 22.22）
- **每个实验台都是独立的 npm 项目，必须进到各自目录 `npm install`**：`vite-lab` / `rollup-lab` / `mini-*` 等各自维护 `package.json` 与 `node_modules`，互不干扰
- 主要版本（实测）：rollup 4 · vite 8 · vue 3（`vite-lab` 的 SFC 与路由）
- 部分脚本会写临时产物到各自的 `dist*` / `node_modules/.vite` 目录，可随时删除重跑

## 实验台

每个实验台单独 `cd` 进去、单独 `npm install`。命令都在该实验台的 `package.json` 里。

| 实验台 | 命令（在该目录下执行） | 演示什么 | 对应篇目 |
| ---- | ---- | ---- | ---- |
| `vite-lab/` | `npm run dev` · `build` · `preview` | Vue 3 单入口工程：`.vue` SFC + `vue-router` 路由懒加载，官方 `@vitejs/plugin-vue` + 手写插件（dev 期 mock API / HMR 观测；build 期虚拟模块 / 剔除 / HTML 收尾 / 压缩 / 体积门禁） | Vite |
| `rollup-lab/` | `npm run build` · `mini:cjs` | 库打包：external + 多格式 + 手写插件（虚拟模块 / 禁用 API / CJS 替身 / 体积门禁）；`mini:cjs` 对照 CJS 互操作 | Rollup |
| `plugin-lab/` | `npm run three-ways` · `unplugin` · `ondemand` · `ban` | 同一需求的多套钩子实现对照、unplugin 统一、按需引入、禁用 API 门禁 | Vite / Rollup（跨工具插件） |
| `analyze-lab/` | `npm run analyze` | 多种打包姿势的体积对照、tree-shaking 验证、代码分割、压缩对照 | Vite / Rollup 的产物分析 |

## 独立的最小实现（mini-*）

这些是**独立项目**，与上面各 lab 平级、不进任何 lab 目录，用来把文档里的原理落成能跑的最小代码。核心逻辑按概念拆进 `lib/`，一个文件一个概念。

| 项目 | 命令（在该目录下执行） | 演示什么 | 对应篇目 |
| ---- | ---- | ---- | ---- |
| `mini-vite/` | `npm run mini` | build 单引擎最小 Vite：插件容器 + 三种钩子调用约定 + 全量建图打包，并打印钩子触发次数 | Vite 第十节 |

## 目录结构

| 目录 | 内容 |
| ---- | ---- |
| `vite-lab/` | Vue 3 工程配置：`src/` 为 SFC + 路由源码，`vite.config.mjs` + 官方 `vue()` + 手写插件（`plugins/`：dev 期 `mini-mock` / `mini-hmr`，build 期 `mini-virtual` / `mini-drop` / `mini-html` / `mini-terser` / `mini-size-gate`） |
| `rollup-lab/` | 库打包配置：`rollup.config.mjs` + 手写插件（`plugins/`）+ `mini-cjs.mjs` CJS 互操作对照 |
| `plugin-lab/` | 多套钩子对照 + unplugin 一次编写多处运行 |
| `analyze-lab/` | 体积对照实验（脚本自己生成 `src/` 与 `dist/`） |
| `mini-vite/` | build 单引擎最小 Vite：`index.mjs` 编排 + `lib/{hook,plugin-container,resolve,module-graph,transform,build,emit}.mjs` + 示例插件 `plugins/` + 演示源码 `src/`（唯一依赖 `acorn`） |

## 断点调试

`vite-lab` / `rollup-lab` 各自带一份 `.vscode/launch.json`，**以该 lab 目录为工作区根打开时**，F5 即可调试对应的构建命令；断点直接打在 `plugins/*`、`*.config.*` 里就能命中。

## 注意事项

- 各 lab 的依赖预构建产物（如 `vite-lab/node_modules/.vite`）遇到诡异问题时，先删缓存再重跑
