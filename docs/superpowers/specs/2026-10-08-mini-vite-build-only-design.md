# mini-vite 收敛为单 build 引擎 · 设计文档

- 日期：2026-10-08
- 范围：`frontend/进阶/构建体系/code/mini-vite/` + `frontend/进阶/构建体系/Vite.md`（§一、§十、配套代码表）+ `总结.md` + `code/README.md`
- 选定方案：**删掉 dev 引擎，`mini-vite` 收敛为「单 build 引擎」**，与 `mini-webpack` 的「一次构建、一个产物」对齐；钩子调用约定由四种收敛为三种

## 一、背景与目标

`mini-vite` 目前是**双引擎**（dev 按 URL 按需转换 + build 全量建图打包），两段共用同一个插件容器，`npm run mini` 一次跑完 dev + build 并打印「dev vs build 钩子调用对照表」。这套双引擎是上一轮（`2026-10-02-vite-钩子双轴分类与mini-vite双引擎-design.md`）刻意加上的。

本轮读者的反馈是：**双引擎让 `mini-vite` 比对照物 `mini-webpack` 复杂**——`mini-webpack` 是「一次构建、一个产物」，`mini-vite` 却要维护两套引擎、五个插件（含 dev 专属）、一张 dev/build 对照表。诉求是**简化**：`mini-vite` 只需要 build 即可，与 `mini-webpack` 的定位对齐。

本轮目标：

1. 删除 dev 引擎（`lib/server.mjs`）及一切 dev 专属物（`mini-mock` 插件、`configureServer` 约定、URL 改写 `toUrl` / `fromUrl`）；
2. 钩子调用约定由四种（`call` / `first` / `pipe` / `collect`）收敛为三种（去掉只服务 `configureServer` 的 `collect`）；
3. 入口 `index.mjs` 只跑 build，并保留一张 **build 单引擎的钩子触发次数表**；
4. 文档 §十 同步改写为 build-only；§一 里「用 `mini-vite` 演示 dev 不打包」的说法改由真实 Vite / `vite-lab` 承担。

### 决策记录

| 决策点 | 选定 |
| --- | --- |
| 简化程度 | **只留 build 引擎**（非最小改动、也非激进压文件数） |
| `collect`（第四种约定） | **删**，收敛为 `call` / `first` / `pipe` 三种 |
| 读数形态 | **保留** build 单引擎的钩子触发次数表（方案 A） |
| `lib/` 粒度 | 不动（仍一文件一概念，对齐 `mini-webpack`） |
| 示例插件 | 由 5 个减为 4 个（删 dev 专属的 `mini-mock`） |
| `lib/build.mjs` / `emit.mjs` / `module-graph.mjs` | 算法不动 |

### 不做的事

- 不实现 dev server / HMR / preview（dev 侧演示统一交给 `vite-lab` 的真实 Vite）；
- 不把 `mini-vite` 改成 `mini-webpack` 的 `Compiler → Compilation` 流水线命名（保留 Vite 味的「插件容器 + 钩子」骨架，只对齐「定位与规模」）；
- 不动 `vite-lab` / `webpack-lab`；
- 不改 `构建全景与选型.md`（其中的「双引擎」指 webpack 与 Vite 的引擎差异，与 `mini-vite` 无关）。

## 二、代码改造（`code/mini-vite/`）

### 2.1 删除

| 文件 | 原因 |
| --- | --- |
| `lib/server.mjs` | dev 引擎整个文件（http + 中间件链 + 按需转换 + `configureServer` / `transformIndexHtml` 的 dev 侧） |
| `plugins/mini-mock.mjs` | dev 专属（`apply: 'serve'` + `configureServer`），没有 server 可挂 |
| `src/lazy.js` | 只为演示「dev 按需不请求」而存在；build 下本就不在依赖图里 |

### 2.2 修改

| 文件 | 改动 |
| --- | --- |
| `lib/hook.mjs` | 删 `collect`；文件头注释由「四种调用约定」改为「三种」 |
| `lib/plugin-container.mjs` | 删 `COLLECT_HOOKS` 与 `configureServer` 分发方法；`RUN_HOOKS` / `ALL_HOOKS` / `hookCalls` 同步收窄 |
| `lib/resolve.mjs` | 删 `toUrl` / `fromUrl` 与 `/@id/`、`/@deps/` 前缀常量；裸导入占位改用虚拟 id `\0deps:<name>`；`createFsPlugin` 跳过 `\0` 开头 |
| `lib/transform.mjs` | 删 `command === 'serve'` 的改写分支与 `toUrl` import；只保留「解析说明符 + 记图」，不再改代码 |
| `lib/build.mjs` | 仅 `label()` 去掉已成死分支的 `/@` 判断（URL 前缀已删） |
| `plugins/mini-html.mjs` | 日志去掉 `ctx.server`（build 恒无），只留 `ctx.bundle` |
| `plugins/mini-banner.mjs` | 注释去掉「dev 里一次都不触发」的表述 |
| `index.mjs` | 删 `runDev` 与 `mini-mock` 引入；只跑 build；钩子表去 dev 列；`ORDER` 去掉 `configureServer`；`setup(command)` 简化为 build |
| `package.json` | `description` 改为「最小 Vite（build 单引擎）：插件容器 + 三种钩子调用约定 + 全量建图打包」 |

> 副作用：`transform.mjs` 去掉改写分支后，`transform` 钩子只剩「登记依赖」，不再修改代码——`pipe` 约定在它身上变成「原样透传」，真正的 `pipe` 演示落到 `renderChunk`（`mini-banner`）与 `transformIndexHtml`（`mini-html`）上。

### 2.3 保留不动

`lib/emit.mjs`、`lib/module-graph.mjs`、`plugins/mini-virtual.mjs`、`plugins/mini-report.mjs`、`src/main.js`、`src/helper.js`、`src/deep.js`、`src/deep2.js`、`index.html`。

### 2.4 新入口与读数

`index.mjs` 只跑一段 build：

1. `setup('build')` 组装插件表 + 容器 + 模块图；
2. `build()` 全量建图 → 拓扑排序 → 拼接 → `renderChunk`；
3. `emitBundle()` → `generateBundle` → 写盘 → HTML（`transformIndexHtml`）→ `closeBundle`；
4. 打印：参与打包的模块顺序、产物体积、**钩子触发次数（单列）**；
5. `spawnSync(node dist/assets/index.js)` 执行产物，打印其输出。

读数形态（数字以真实运行为准）：

```
=== build 引擎：一次走完整张模块图，拼成一个文件 ===
  参与打包的模块 6 个：src/deep2.js → src/deep.js → src/helper.js → \0deps:tiny-lib → \0virtual:build-info → src/main.js
  产物 assets/index.js：xxx B
  执行产物（node dist/assets/index.js）：
    hi, mini-vite! (deep:deep2)
    hello from tiny-lib
    mode = production

=== 钩子调用（一次构建）===
  钩子                build
  config              1
  configResolved      1
  buildStart          1
  resolveId           5
  load                6
  transform           6
  renderChunk         1
  generateBundle      1
  closeBundle         1
  transformIndexHtml  1
  buildEnd            1
```

## 三、文档改造

### 3.1 `Vite.md` §一（第 21 行）

原句用 `mini-vite` 演示「dev 按需不打包」。改为：dev 侧「按需转换、不打包」由 `vite-lab` 的真实 dev server 演示；`mini-vite`（§十）只演示 build 侧全量建图。

### 3.2 `Vite.md` §十 重写

| 位置 | 改动 |
| --- | --- |
| 标题 | `## 十、mini-vite：双引擎（dev 不打包 / build 才打包）` → `## 十、mini-vite：一次构建（插件容器 + 打包）` |
| 导读段 | 改为 build-only；说明「dev 不打包」的原理见 §一（真实 Vite），`npm run mini` 一次跑 build |
| 读法段 + 文件表 | 删 `lib/server.mjs` 行；`hook.mjs` 改「三种调用约定」；`resolve.mjs` 去「id ↔ URL 互转」；`transform.mjs` 改「解析说明符 + 记图」；`plugins/` 改 4 个；`src/` 去 `lazy` |
| 10.2 | 标题「钩子的四种调用约定」→「三种调用约定」；删 `collect` 代码块与表格行 |
| 10.3（dev 引擎：改写说明符 + 记图） | 删除；`transform.mjs` 的「记图」说明并入 10.2 |
| 10.4（build 引擎） | 保留，去掉「与 dev 的区别」措辞 |
| 10.5（读数） | 改为 build 单引擎输出；文字由「通用 / dev 专属 / build 专属」改为「通用钩子 vs build 专属钩子」 |
| 末尾「对照真实 Vite」段 | 去掉「两套引擎共用一份插件表」，改为「单引擎但机制齐全」 |

### 3.3 `Vite.md` 配套代码表（1178–1188 行）

删 `lib/server.mjs` 行；`index.mjs` 行改「单 build 引擎入口：建图打包 + 钩子次数读数」；`hook.mjs` 行改「三种调用约定」；`resolve.mjs` 行去「id ↔ URL 互转」；`transform.mjs` 行改「解析说明符 + 记图」；插件行改 4 个（去 `mini-mock`）；`src/` 行去 `lazy`。

### 3.4 `总结.md` / `code/README.md`

| 文件 | 改动 |
| --- | --- |
| `总结.md` 第 371 行 | 「升级成双引擎…四种调用约定 `call` / `first` / `pipe` / `collect`…`server.mjs`」→ 单 build 引擎 + 三种约定 + 文件清单去 `server.mjs` |
| `总结.md` 第 375 行 | 实测描述去掉「裸导入改写为 `/@deps/`」「`lazy.js` 从不被转换」「对照表 dev 列」 |
| `code/README.md` 第 36 行 | `mini-vite` 行描述改「build 单引擎：插件容器 + 三种钩子调用约定 + 全量建图打包」 |
| `code/README.md` 第 51 行 | 文件清单去 `server.mjs` |

## 四、验收标准

1. `cd code/mini-vite && npm install && npm run mini` 跑通：建图 → 打包 → 执行产物，输出 `hi, mini-vite! …` / `hello from tiny-lib` / `mode = production`；
2. 钩子次数表为 build 单列，`transform` / `load` = 6，`renderChunk` / `generateBundle` / `closeBundle` / `transformIndexHtml` = 1；
3. `dist/` 真实写出且可 `node` 执行；
4. 文档所有 `> 摘自` 代码块与 `code/mini-vite/` 实际文件逐字一致；
5. `grep 'server.mjs|mini-mock|collect|lazy|/@deps/'` 在 `Vite.md` §十 与配套代码表无残留；
6. `check-code-sync` / `check-links` / `check-sidebar-coverage` 通过；`vitepress build` 通过。

## 五、风险与取舍

| 风险 | 说明 | 应对 |
| --- | --- | --- |
| 失去「dev vs build 对照」这个亮点 | §十 不再有 dev 列，教学张力下降 | dev/build 差异改由 §一 文字 + `vite-lab` 真实 dev 承担；§三 两张速查表的「生效端」列仍在 |
| `apply` 过滤在 `mini-vite` 里不再筛掉任何插件 | 删 `mini-mock` 后无 `apply: 'serve'` 示例 | 容器保留 `apply` 机制（核心 Vite 语义）；示例语义由 `vite-lab` 的 `mini-mock` / `mini-drop` 承担 |
| `transform` 钩子不再改代码 | `pipe` 约定少一个「改数据」的示例 | 真正的 `pipe` 演示由 `renderChunk` / `transformIndexHtml` 承担 |
| 与 `mini-webpack` 职能重叠 | 两者都「建图 + 打包」 | 定位写清：`mini-webpack` 讲五对象流水线，`mini-vite` 讲插件容器与钩子调用约定 |

## 六、与上一篇设计的关系

本设计**推翻** `2026-10-02-vite-钩子双轴分类与mini-vite双引擎-design.md` 里「`mini-vite` 双引擎」的结论（该篇 3.1–3.6、决策记录中的「双引擎 / 5 个插件」等），改为单 build 引擎。该篇关于 §三 速查表拆分、「插件开发技巧」3.5 节的部分**仍然有效**，本设计不动。
