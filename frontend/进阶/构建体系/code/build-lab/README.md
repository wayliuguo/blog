# build-lab

前端「构建体系」模块的配套实验代码。所有结论都来自本机实跑，数字可直接对照文档里的实测段落。

对应文档：`frontend/进阶/构建体系/` 下 8 篇。

## 环境要求

- Node.js 22+（Vite 8 要求 Node 20.19+ / 22.12+，实测用 22.22）
- **必须先 `npm install`**：本 lab 依赖 webpack / rollup / vite / esbuild / swc / babel / unplugin，非零依赖
- 主要版本（实测）：webpack 5 · rollup 4 · vite 8 · esbuild 0.28 · @swc/core 1.16
- 部分脚本会写临时产物到各自的 `dist*`/`.wp-cache`/`node_modules/.vite` 目录，可随时删除重跑

## 脚本清单

| 运行命令 | 演示什么 | 对应篇目 | 关键结论（实测） |
| ---- | ---- | ---- | ---- |
| `npm run bench` | 200 个模块下 esbuild / rollup / webpack 的耗时与体积对照 | 构建全景与选型 | esbuild 557ms / rollup 1303ms / webpack 3698ms；webpack 只有「声明 `sideEffects:false` + 开 minimize」两步齐了才删代码 |
| `npm run ast` | parse 出 AST 结构，再手工遍历、transform 改写并 generate | 编译与 AST | AST 与源码是两份数据，改树必须 generate |
| `npm run ast:plugin` | 手写 Babel 插件：`__DEV__` 编译期替换 | 编译与 AST | plugins 先于 presets；plugins 顺序、presets 逆序 |
| `npm run ast:codemod` | 批量改写 + 正则误伤对照 | 编译与 AST | 正则会误伤字符串与注释，AST 不会 |
| `npm run webpack` | 多入口 + 自定义 loader + 自定义 plugin + splitChunks | Webpack 深入 | loader 是「源码字符串 → 代码字符串」；产出文件用 `emitAsset` |
| `npm run webpack:split` | `minSize` 20000 vs 0 的对照 | Webpack 深入 | 默认 20KB 下限是「抽不出来」的常见原因；改成 0 才抽出 common |
| `npm run webpack:cache` | 持久化缓存：小样本 vs 大样本，独立子进程采样 | Webpack 深入 | 小样本 1.11x、大样本 2.21x；`require('webpack')` 本身要 2.8~3.3s |
| `npm run vite` | dev server 按需转换 vs build 全量，环境变量静态替换，依赖预构建产物 | Vite | dev 只转 1 个模块、build 转 3 个；`import.meta.env` 在产物里已消失 |
| `npm run vite:optimize` | 单独触发依赖预构建 | Vite | 产物落在 `node_modules/.vite`；诡异问题先删缓存 |
| `npm run vite:assets` | 静态资源内联阈值 / `import.meta.glob` / `build.target` 降级 | Vite | 0.6KB svg 在默认 4096 下内联、阈值 512 时变独立文件；glob 懒加载 4 chunk vs eager 1 chunk |
| `npm run vite:plugins` | 插件顺序（enforce/apply）+ 真实插件：HTML 注入 modulepreload 与 CSP nonce | Vite | 同一模块上 pre → normal → post；不查重会注入 2 条 modulepreload（Vite 默认 1 条 + 插件 1 条） |
| `npm run rollup:shake` | tree-shaking 边界：未用导出 vs 顶层副作用 | Rollup | 未用导出被删（false），顶层副作用保留（true） |
| `npm run rollup:formats` | esm / cjs / iife / umd / system 五种格式体积对比 | Rollup | esm 0.45 KB → cjs 0.50 → iife 0.64 → system 0.86 → umd 0.91 KB |
| `npm run rollup:side-effects` | PURE 注解（表达式级）vs moduleSideEffects（模块级）三档对照 | Rollup | 带注解的 `make("pure")` 被删，紧邻不带的保留；`moduleSideEffects:false` 不等于"模块内副作用可删" |
| `npm run rollup:external` | external / UMD globals / manualChunks / preserveModules 五种产物策略 | Rollup | 忘记 external：10170 字符；external 后 23 字符（440 倍） |
| `npm run rollup:hooks` | 钩子全景：执行顺序 + 每个钩子调用次数 + 第二次 generate 的增量 | Rollup | build 钩子 12 个里前 7 个只跑一次；output 钩子每个 output 各跑一次 |
| `npm run rollup:context` | PluginContext：构建期拿模块图、检测循环依赖、emitFile 出清单 | Rollup | 3 模块 / 3 边 / 1 环；`failOnCycle` 一开就从"报告"变"门禁" |
| `npm run rollup:gate` | 真实场景插件：产物体积门禁（gzip）+ bundle-manifest.json | Rollup | gzip 358B，预算 0.15KB 时构建被中断 |
| `npm run rollup:cjs` | CJS 互操作：不加插件的报错 + 手写 20 行 commonjs 替身 | Rollup | 不加插件：`"default" is not exported by dep.cjs` |
| `npm run rollup:plugin` | 虚拟模块插件：resolveId / load / transform / generateBundle | Rollup | 虚拟 id 用 `\0` 前缀；不处理就返回 `null` |
| `npm run esbuild` | transform vs build、target 降级代价、metafile 分析 | esbuild 与 Rust 工具链 | transform 第二次 3ms（首次约 700ms）；`??` 降级 es2015 685 字符 vs esnext 82 |
| `npm run swc` | esbuild / SWC / Babel 同跑 50 次转换 | esbuild 与 Rust 工具链 | SWC 0.13ms / esbuild 1.50ms / Babel 20.10ms（167x） |
| `npm run plugin` | 同一需求（虚拟模块）的 Rollup / webpack / Vite 三套实现 | 构建插件开发 | 三套产物都含 BUILD_INFO；webpack 要占位文件 + loader |
| `npm run plugin:unplugin` | unplugin：一份实现跑三处 | 构建插件开发 | API 是 `unplugin.rollup(options)`；虚拟 id 别用冒号 |
| `npm run analyze` | 四种打包姿势的体积对照、tree-shaking 验证、代码分割、压缩对照 | 产物分析与体积优化 | 全量 2509 vs 按需 165 字节（15 倍）；首屏 2946 → 175 |
| `npm run mini` | 手写打包器：模块图 / ESM→CJS 转换 / 运行时，并与原生 ESM 对照执行 | 手写 mini-bundler | 5 模块 878 字节 → 产物 2035 字节；两边输出逐行相同 |
| `npm run mini:cycle` | 循环依赖（函数导出） | 手写 mini-bundler | 原生 ESM 读到 `function`，产物读到 `undefined` |
| `npm run mini:tdz` | 循环依赖（const 导出） | 手写 mini-bundler | 原生 ESM 抛 `ReferenceError` 并中止，产物静默 `undefined` 且跑完 |

## 目录结构

| 目录 | 内容 |
| ---- | ---- |
| `bench/` | 构建耗时与 tree-shaking 对照（`gen.cjs` 生成样本、`one.cjs` 单工具、`run.cjs` 汇总） |
| `ast-lab/` | Babel 解析 / 遍历 / transform / 插件 / codemod |
| `webpack-lab/` | loader、plugin、splitChunks、持久化缓存（含 `one-cache.cjs` 子进程采样） |
| `vite-lab/` | dev vs build 双引擎、环境变量、预构建、`counter-plugin.mjs`、静态资源（内联阈值 / glob / target）、插件顺序与 HTML 注入（样本 `src-*` 由脚本生成） |
| `rollup-lab/` | tree-shaking 边界、五种输出格式、副作用两档控制、external 四开关、钩子全景、PluginContext、体积门禁、CJS 互操作（样本 `src-*` 由脚本生成） |
| `esbuild-lab/` | transform / build / target / metafile / minify |
| `swc-lab/` | esbuild / SWC / Babel 三工具转换速度对比 |
| `plugin-lab/` | 三套钩子对照 + unplugin 一次编写多处运行 |
| `analyze-lab/` | 体积对照实验（脚本自己生成 `src/` 与 `dist/`） |
| `mini-bundler/` | 手写打包器（`bundle.cjs`）+ 被测源码 `src/`（含 `cycle/` 与 `cycle-tdz/` 两组循环依赖） |

## 注意事项

- `bench/` 与 `webpack-lab/cache.cjs` 都用**独立子进程**采样：同一个进程里连续跑多次 webpack 会因累积状态栈溢出，且墙钟时间会被 Node 启动开销污染
- `vite-lab/run.cjs` 会真实启动 dev server（端口交给系统分配）并跑一次生产构建，耗时比其它脚本长
- 依赖预构建产物在 `vite-lab/node_modules/.vite`，webpack 持久化缓存在 `webpack-lab/.wp-cache`
- `mini-bundler/src/` 有自己的 `package.json`（`{"type":"module"}`）：这是为了让源码能**被 Node 原生按 ESM 执行**，`npm run mini` 才能把「原生 ESM」与「打包产物」放在一起对照。产物写在 `mini-bundler/dist/bundle.js`
