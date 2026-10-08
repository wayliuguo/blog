# mini-vite 收敛为单 build 引擎 · 实现计划

- 日期：2026-10-08
- 依据：[`2026-10-08-mini-vite-build-only-design.md`](../specs/2026-10-08-mini-vite-build-only-design.md)
- 目标产物：`code/mini-vite/`（单 build 引擎最小实现）+ `Vite.md` §一 / §十 / 配套代码表 + `总结.md` / `code/README.md` 同步

## 执行顺序总览

```
P0 删 dev 专属文件（server.mjs / mini-mock.mjs / lazy.js）
P1 收敛钩子约定（hook.mjs / plugin-container.mjs）
P2 去 dev 痕迹（resolve.mjs / transform.mjs / build.mjs / plugins）
P3 入口改单 build（index.mjs / package.json），采集真实读数
P4 文档同步（Vite.md §一 / §十 / 配套代码表；总结.md；code/README.md）
P5 校验（code-sync / links / sidebar / vitepress build）
```

每阶段末尾都有「阶段验证」，验证不通过不进下一阶段。

---

## P0 删除 dev 专属文件

| # | 动作 | 文件 |
| --- | --- | --- |
| 0.1 | 删 dev 引擎整个文件 | `lib/server.mjs` |
| 0.2 | 删 dev 专属插件 | `plugins/mini-mock.mjs` |
| 0.3 | 删只为演示「dev 按需」的模块 | `src/lazy.js` |

**验证**：`grep -r "server.mjs\|mini-mock\|lazy" code/mini-vite --include=*.mjs --include=*.js` 无 import 残留（P1/P3 会清掉剩余引用）。

---

## P1 收敛钩子调用约定

### 1.1 `lib/hook.mjs`

- 删 `collect` 方法（只服务 `configureServer`）。
- 文件头注释由「四种调用约定」改为「三种」，删 `collect` 那行。

### 1.2 `lib/plugin-container.mjs`

- 删 `COLLECT_HOOKS = ['configureServer']`；`RUN_HOOKS` / `ALL_HOOKS` 同步收窄。
- 删分发方法 `configureServer(server)`。
- `hookCalls` 的注释由「dev vs build 对照表」改为「钩子触发次数表」。
- 末尾导出去掉 `COLLECT_HOOKS`。
- 保留 `apply` 过滤与 `enforce` / `order` 排序（核心 Vite 语义，不动）。

**验证**：`grep "collect\|configureServer" code/mini-vite/lib` 无残留。

---

## P2 去 dev 痕迹

### 2.1 `lib/resolve.mjs`

- 删 `toUrl` / `fromUrl` 与 `ID_URL_PREFIX` / `DEP_URL_PREFIX` 常量。
- 裸导入占位改用虚拟 id：`\0deps:<name>`（新增 `DEPS_PREFIX = '\0deps:'`）。
- `createFsPlugin` 的兜底判断由 `startsWith('\0') || startsWith('/@')` 收敛为 `startsWith('\0')`。
- 文件头注释去掉「id ↔ 浏览器 URL 互转」。

### 2.2 `lib/transform.mjs`

- 删 `command === 'serve'` 的改写分支与 `toUrl` import。
- 只保留「解析说明符 + 记图」，`transform` 恒返回 `null`（原样透传）。
- 入参去掉 `command` / `root`；文件头注释去掉「改写」与 dev 措辞。

### 2.3 `lib/build.mjs`

- `label()` 去掉已成死分支的 `startsWith('/@')` 判断。

### 2.4 `plugins/mini-html.mjs`

- 日志去掉 `ctx.server`，只留 `ctx.bundle`；注释由「两端入参不同」改为 build 侧说明。

### 2.5 `plugins/mini-banner.mjs`

- 注释去掉「dev 里一次都不触发 / 从 dev 插件表剔掉」的表述。

**验证**：`grep "toUrl\|fromUrl\|/@deps\|/@id\|command === 'serve'" code/mini-vite` 无残留。

---

## P3 入口改单 build + 读数

### 3.1 `index.mjs`

1. 删 `runDev` 与 `createDevServer` / `miniMock` 引入；
2. `setup(command)` 简化为 `setup()`（固定 `command: 'build'`、`mode: 'production'`）；
3. 只跑 build：建图 → 打包 → `emitBundle` → 子进程执行产物；
4. `ORDER` 去掉 `configureServer`；
5. `printHookTable` 由两列（dev / build）改为单列 build；
6. 文件头注释由「dev + build 两套引擎」改为「一次构建、一个产物」。

### 3.2 `package.json`

- `description` 改为「最小 Vite（build 单引擎）：插件容器 + 三种钩子调用约定 + 全量建图打包」。

**验证**：`cd code/mini-vite && npm run mini` 跑通；钩子表为单列，`load` / `transform` = 6，`resolveId` = 5，`renderChunk` / `generateBundle` / `closeBundle` / `transformIndexHtml` = 1；产物可 `node dist/assets/index.js` 执行。

---

## P4 文档同步

| # | 动作 | 文件 |
| --- | --- | --- |
| 4.1 | §一（第 21 行）「用 mini-vite 演示 dev 不打包」改由真实 Vite / `vite-lab` 承担 | `Vite.md` |
| 4.2 | §十 重写为 build-only：标题 / 导读 / 文件表 / 10.2 三种约定 / 删 10.3 / 10.4 去对照措辞 / 10.5 单列读数 / 末尾段 | `Vite.md` |
| 4.3 | 配套代码表（1178–1188）删 `server.mjs` 行、改 `index/hook/resolve/transform` 行、插件改 4 个、`src/` 去 `lazy` | `Vite.md` |
| 4.4 | 第 371 / 375 行：单 build 引擎 + 三种约定 + 去 dev 实测描述 | `总结.md` |
| 4.5 | 第 36 / 51 行：描述改 build 单引擎、文件清单去 `server.mjs` | `code/README.md` |

**验证**：文档中所有 `> 摘自` 代码块与 `code/mini-vite/` 实际文件逐字一致；`grep 'server.mjs|mini-mock|collect|lazy|/@deps/'` 在 §十 与配套代码表无残留。

---

## P5 校验

按序执行：

1. `node .workbuddy/scripts/check-code-sync.cjs`（必要时 `--module` 缩窄到构建体系）
2. `node .workbuddy/scripts/check-links.cjs`
3. `node .workbuddy/scripts/check-sidebar-coverage.cjs`
4. `NODE_OPTIONS= node node_modules/vitepress/bin/vitepress.js build .`（判断成功看 `.vitepress/dist` 产物）

---

## 风险与回退

| 风险 | 应对 |
| --- | --- |
| `transform` 不再改代码，`pipe` 少一个「改数据」示例 | 真正 `pipe` 由 `renderChunk`（mini-banner）/ `transformIndexHtml`（mini-html）承担 |
| 删 `mini-mock` 后无 `apply: 'serve'` 示例 | 容器保留 `apply` 机制；示例语义由 `vite-lab` 承担 |
| 文档摘录与实际文件漂移 | P4 验证强制逐字比对 |

## 不做（对齐设计文档）

dev server / HMR / preview 不实现；`vite-lab` / `webpack-lab` / `构建全景与选型.md` 不改。
