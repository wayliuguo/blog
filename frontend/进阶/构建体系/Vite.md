# Vite

Vite 的核心主张只有一句：**开发态不打包**。这一个决定带来了冷启动、热更新两个数量级的体验提升，也带来了它最容易被误解的地方——开发和生产是两套引擎。本篇用实测把双引擎的差异讲清楚：dev 到底少做了什么、依赖预构建解决了什么问题、环境变量是怎么消失的、插件该挂在哪一侧。

> 本文基于本仓实测版本：**Vite 8.3.0**。特别注意：8.x 起生产构建的默认打包器已经是 **Rolldown**（Rust 实现的 Rollup 兼容版），"Vite 生产走 Rollup"这个说法在 8.x 上已不准确。

## 一、双引擎：dev 与 build 各做什么

```
dev  ── esbuild：依赖预构建 + 单文件转换 ──> 浏览器原生 ESM 直接加载（不打包）
build ─ Rolldown/Rollup：全量解析依赖图 ──> 打包、分割、压缩（产物与 webpack 同类）
```

实测最能说明问题的是"转换了哪些模块"：

> 摘自 `./code/build-lab/vite-lab/counter-plugin.mjs`（运行：`npm run vite`）

```js
export function transformCounter() {
    const seen = new Set()
    let command = 'serve'
    return {
        name: 'transform-counter',
        configResolved(config) {
            command = config.command // serve | build
        },
        transform(code, id) {
            if (!id.includes('/vite-lab/src/') && !id.includes('\\vite-lab\\src\\')) return null
            seen.add(id.split(/[\\/]/).pop())
            return null
        },
        buildEnd() {
            const label = command === 'serve' ? 'dev（只转被请求的）' : 'build（全量）'
            console.log(`  [${label}] 已转换的源码模块:`, [...seen].join(', ') || '(无)')
        }
    }
}
```

启动 dev server 后只请求入口 JS，再跑一次 build：

```
---- 1. dev server（按需转换）----
  请求 /src/main.js 状态: 200
  返回内容里 import.meta.env.VITE_APP_NAME 被替换成： build-lab-dev
  dev 下还留有原始 import 语句： true
  [dev（只转被请求的）] 已转换的源码模块: main.js

---- 2. build（Rollup 全量构建）----
  [build（全量）] 已转换的源码模块: main.js, lazy.js, helper.js
  构建耗时: 563 ms
  产物：
    assets/index-2WcN4Vx4.js     3.9 KB
    assets/lazy-B0Lvs_Sf.js      0.1 KB
    assets/vendor-BaqaY0LU.js    30.9 KB
    index.html                   0.3 KB
```

同一份源码，dev 只动了 1 个模块，build 动了 3 个。这就是"冷启动快"的全部秘密：**dev 的工作量只和"浏览器请求了什么"成正比，与项目规模无关**。

dev 下 `import` 语句原样保留（`dev 下还留有原始 import 语句： true`）——浏览器拿到的是一个个真实的 ESM 请求，而不是拼好的 bundle。这也解释了 Vite 的一个硬约束：源码必须是 ESM，CJS 依赖必须先预构建。

## 二、依赖预构建：解决两件事

`node_modules` 里的包有两个问题：一是很多仍是 CJS（浏览器不认），二是一个包内部可能拆成几百个小 ESM 文件（几百个请求）。预构建一次性解决：

1. **CJS → ESM 转换**
2. **碎片合并**：把包内部的多个模块打成一个文件

实测产物：

```
---- 4. 依赖预构建产物（optimizeDeps）----
   magic-string.js 37.3 KB
  预构建做的事：CJS → ESM 转换 + 把碎片化的内部模块合并成一个文件
```

一个 `magic-string` 变成一个 37.3 KB 的文件，而不是散落的十几个模块。

配置入口是 `optimizeDeps`：

> 摘自 `./code/build-lab/vite-lab/vite.config.mjs`（运行：`npm run vite`）

```js
    // 依赖预构建：把 CJS / 碎片化依赖预先转成 ESM 并合并
    optimizeDeps: {
        include: ['magic-string']
    },
```

实践要点：

- **`include` 用来"提前声明"**。Vite 默认靠首次扫描发现依赖，但动态 import 或某些插件引入的依赖可能扫不到，导致 dev 中途重新预构建并刷新页面——显式 `include` 可以避免这个抖动。
- **预构建缓存**落在最近的 `node_modules/.vite` 下。出现"改了依赖没生效"时，删掉它或用 `--force` 是最快的排查手段。
- **旧版本有 `vite optimize` 命令**；8.x 实测会提示 `manually calling optimizeDeps is deprecated`，预构建已由 dev server 自动完成。

## 三、环境变量与模式

Vite 的环境变量是**编译期静态替换**，不是运行时读取：

> 摘自 `./code/build-lab/vite-lab/src/main.js`（运行：`npm run vite`）

```js
// import.meta.env 会被 Vite 在构建期静态替换成字面量
const appName = import.meta.env.VITE_APP_NAME
const inProd = import.meta.env.PROD
```

实测证据（`.env` 里是 `build-lab-dev`，`.env.production` 里是 `build-lab-prod`）：

```
---- 3. 编译期替换证据 ----
  产物里含 "build-lab-prod"（.env.production）： true
  产物里含 "build-lab-dev"（.env）： false
  产物里还留有 import.meta.env： false
```

三条规则：

1. **只有 `VITE_` 前缀的变量会暴露给客户端**（`envPrefix` 可改）。这是防止把数据库密码打进前端产物的闸门。
2. **替换是字面量内联**，所以 `import.meta.env.VITE_X` 可以参与常量折叠：`if (import.meta.env.PROD) { ... }` 的假分支会被压缩器删掉。
3. **不能动态拼接**：`import.meta.env[key]` 这种写法替换不了，因为构建期不知道 `key` 是什么。

`define` 用于自定义常量，与 webpack 的 `DefinePlugin` 等价：

> 摘自 `./code/build-lab/vite-lab/vite.config.mjs`（运行：`npm run vite`）

```js
    define: {
        // 编译期常量，与 webpack DefinePlugin 等价
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
```

注意必须 `JSON.stringify`——`define` 替换的是**代码文本**，不加引号会被当成标识符而报错。

## 四、配置全览

> 摘自 `./code/build-lab/vite-lab/vite.config.mjs`（运行：`npm run vite`）

```js
export default defineConfig({
    root: DIR,
    // 环境变量前缀：只有 VITE_ 开头的才会暴露给客户端代码
    envPrefix: 'VITE_',
    define: {
        // 编译期常量，与 webpack DefinePlugin 等价
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    plugins: [transformCounter()],
    // 依赖预构建：把 CJS / 碎片化依赖预先转成 ESM 并合并
    optimizeDeps: {
        include: ['magic-string']
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 产物统计用：关掉压缩便于观察
        minify: false,
        rollupOptions: {
            output: {
                // 手动分组：把 node_modules 依赖单独打一个 chunk
                // 注意：Vite 8 起生产构建走 Rolldown，manualChunks 只接受函数形式
                manualChunks(id) {
                    if (id.includes('magic-string')) return 'vendor'
                    return null
                }
            }
        }
    }
})
```

配置项按阶段分两类，混淆它们是常见错误：

| 类别 | 配置 | 作用阶段 |
| ---- | ---- | ---- |
| 通用 | `root` / `plugins` / `resolve.alias` / `define` / `envPrefix` | dev + build |
| 仅 dev | `server.*` / `optimizeDeps.*` / `hmr` | 只有 dev server |
| 仅 build | `build.*`（含 `rollupOptions` / `outDir` / `minify`） | 只有 `vite build` |

一个踩过的坑（实测）：**Rolldown 下 `manualChunks` 只接受函数形式**。写成对象形式 `manualChunks: { vendor: ['magic-string'] }` 会直接报 `Invalid type: Expected Function but received Object`。迁移老配置时要逐个验证。

## 五、插件挂在两侧

Vite 插件是"Rollup 插件 + Vite 专属钩子"的超集，所以要区分钩子属于哪一侧：

| 钩子 | 阶段 | 典型用途 |
| ---- | ---- | ---- |
| `config` / `configResolved` | 配置期 | 改配置、记录 command |
| `transform` | dev + build | 转译源码、注入代码 |
| `resolveId` / `load` | dev + build | 虚拟模块 |
| `configureServer` | 仅 dev | 加中间件、自定义 HMR |
| `handleHotUpdate` | 仅 dev | 接管热更新逻辑 |
| `generateBundle` | 仅 build | 产物处理 |

写插件时最容易犯的错是**在 dev 没生效**：因为用了只有 build 才跑的钩子（`generateBundle`），或者反过来把 dev 中间件写进了通用钩子。

判断 command 的写法：

> 摘自 `./code/build-lab/vite-lab/counter-plugin.mjs`（运行：`npm run vite`）

```js
        configResolved(config) {
            command = config.command // serve | build
        },
```

## 六、HMR：为什么热更新这么快

webpack 的 HMR 需要把变更模块及其"依赖链上的父模块"重新生成 chunk；Vite 只做两件事：

1. 服务端把**变更模块**重新转换一次
2. 通过 WebSocket 告诉浏览器"这个模块变了"，浏览器重新发一个 ESM 请求

因为模块粒度就是文件粒度，**不需要重新打包**，所以更新耗时与项目规模无关。代价是：如果某个模块没有 `import.meta.hot.accept` 边界，会向上冒泡直到有边界为止，冒泡不到就整页刷新。

## 七、什么时候不该用 Vite

诚实地说清楚边界：

| 场景 | 问题 |
| ---- | ---- |
| 需要 IE11 / 很老的 WebView | Vite 的 dev 依赖原生 ESM，老浏览器只能靠 build 产物调试，开发体验优势消失 |
| 已有大量 webpack 专有 loader | 需要逐个找替代品或改写 |
| 需要 Module Federation | webpack 生态最成熟（Vite 有插件方案但成熟度不同） |
| 库打包 | 用 `vite build --lib` 可以，但多格式产物与类型声明不如 Rollup/tsup 直接 |

库场景要特别说明：Vite 的 lib 模式一次只能输出配置里指定的格式，要出 esm + cjs 双产物通常跑两次配置，而 Rollup 一次 `output` 数组就能出五种格式（见[Rollup](./Rollup.md)篇实测）。

## 小结

- Vite
  - 双引擎
    - dev：esbuild 预构建 + 单文件转换，浏览器原生 ESM 加载，不打包
    - build：8.x 起默认 Rolldown（兼容 rollupOptions），全量打包
    - 实测：dev 只转 1 个模块，build 转 3 个
  - 依赖预构建
    - 解决 CJS→ESM 与碎片合并；实测 magic-string → 单个 37.3 KB 文件
    - `optimizeDeps.include` 提前声明，避免中途重新预构建导致页面刷新
    - 缓存在 `node_modules/.vite`，诡异问题先删缓存
  - 环境变量
    - 编译期静态替换，实测产物里 `import.meta.env` 已消失
    - 只有 `VITE_` 前缀暴露；不能动态拼接 key
    - `define` 替换的是代码文本，必须 `JSON.stringify`
  - 配置
    - 按阶段分：通用 / 仅 dev / 仅 build
    - Rolldown 下 `manualChunks` 只接受函数形式
  - 插件
    - Rollup 插件超集；`configureServer`/`handleHotUpdate` 仅 dev
    - 用 `configResolved` 里的 `config.command` 区分阶段
  - HMR
    - 只重转变更模块 + WS 通知，与项目规模无关
    - 没有 accept 边界会向上冒泡，冒泡不到就整页刷新
  - 边界
    - 老浏览器、webpack 专有 loader、MF、多格式库产物

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/vite-lab/run.cjs` | dev server 按需转换 vs build 全量的完整对比 | 一、双引擎 · 三、环境变量 |
| `./code/build-lab/vite-lab/counter-plugin.mjs` | 统计转换模块的插件（区分 serve / build） | 一、双引擎 · 五、插件 |
| `./code/build-lab/vite-lab/vite.config.mjs` | 配置全览：envPrefix / define / optimizeDeps / manualChunks | 二、预构建 · 四、配置 |
| `./code/build-lab/vite-lab/src/main.js` | `import.meta.env` 与动态 import 示例 | 一、双引擎 · 三、环境变量 |
| `./code/build-lab/vite-lab/.env` | 开发环境变量（`VITE_APP_NAME=build-lab-dev`） | 三、环境变量 |
| `./code/build-lab/vite-lab/.env.production` | 生产环境变量（`VITE_APP_NAME=build-lab-prod`） | 三、环境变量 |

运行：`cd code/build-lab && npm install && npm run vite`

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Webpack 深入](./Webpack%20深入.md)
- 下一篇：[Rollup](./Rollup.md)
- [Vite 官方文档](https://vite.dev/)
- [Vite 插件 API](https://vite.dev/guide/api-plugin.html)
