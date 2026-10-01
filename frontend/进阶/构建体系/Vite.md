# Vite

> 本篇只讲**生产配置**：单入口、内容哈希、代码分割、压缩、抽 CSS、生成 HTML，全部用**手写插件**实现。示例是一个真实的 Vue 3 应用——单文件组件（SFC）+ `vue-router` 多路由 + 路由级懒加载；SFC 的编译交给官方 `@vitejs/plugin-vue`，产物收尾全部手写。组织方式与 [webpack](./webpack.md) 篇完全一致：一份配置 + 两个命令 + 手写插件 + 断点调试。差别只在一处——Vite 还有一个 dev 引擎，那里**不打包**。

## 一、双引擎：dev 不打包，build 才打包

```
dev   按 URL 返回源码，import 原样保留 ──> 浏览器原生 ESM 自己加载（不打包）
build 从入口全量解析依赖图 ──> 打包、分割、压缩（产物与 webpack 同类）
```

一句话概括两边差别：**dev 处理的是"被请求到的模块"，build 处理的是"整个依赖图"**。

| | dev | build |
| --- | --- | --- |
| 引擎 | esbuild（预构建 + 单文件转换） | Rolldown（8.x 起，兼容 Rollup 配置） |
| 工作量 | 与"浏览器请求了什么"成正比 | 与项目规模成正比 |
| 产物 | 一个个真实 ESM 请求，不拼 bundle | chunk / asset，与 webpack 同类 |
| 谁在用 | 本地开发 | 上线 |

- **dev 快在"不打包"**。第 8 节的 `mini-vite` 用几十行把这件事跑给你看：只请求入口，`helper.js` 被 import 到才会被转换，`lazy.js` 没人请求就一次都不转。
- **build 是同一张图的一次快照**。从入口全量走一遍 `resolveId → load → transform`，把图固化成 chunk。本 lab 一次 `npm run build` 实测 `40 modules transformed`（Vue + vue-router + 两个路由视图一起进图）。

dev 侧维护的东西叫**模块图**（module graph）：一个 URL ↔ 一个模块节点，节点上挂 `importers`（谁 import 我）与 `importedModules`（我 import 谁）。它解释了 Vite 的几个反直觉行为：

| 现象 | 原因 |
| --- | --- |
| 冷启动快 | 图只生长到"首屏请求到的那几条边"，其余节点待定 |
| HMR 快 | 改一个文件只重转它自己，再逆着 `importers` 找 accept 边界，不碰打包 |
| `optimizeDeps.exclude` 的坑 | 本地 workspace 包被预构建成一个文件后，图上这个节点对编辑不再敏感 |
| 源码必须是 ESM | dev 下 import 原样交给浏览器，CJS 必须先预构建 |

dev 带来两个只在 dev 存在的概念，写配置时必须分清：

- **依赖预构建**（`optimizeDeps`）：把 `node_modules` 里 CJS 的、或碎片化的包，预先转成单个 ESM 文件放进 `node_modules/.vite`。一次解决"浏览器不认 CJS"和"一个包几百个请求"两件事。本 lab 显式 `include: ['magic-string']`——动态 import 或插件引入的依赖可能扫不到，显式声明可以避免 dev 中途重新预构建并刷新页面。
- **环境变量**：`import.meta.env` 是**编译期静态替换**，不是运行时读取。只有 `VITE_` 前缀会暴露给客户端（`envPrefix` 可改）。三条规则：

  1. 前缀是闸门——防止把数据库密码打进前端产物。
  2. 替换是字面量内联，所以 `if (import.meta.env.PROD) {...}` 的假分支能被压缩器删掉。
  3. 不能动态拼接：`import.meta.env[key]` 替换不了，因为构建期不知道 `key` 是什么。

  本 lab 里 `.env` 写 `VITE_APP_NAME=vite-lab-dev`、`.env.production` 写 `vite-lab-prod`，生产构建取后者。

**HMR** 是 dev 的招牌能力，原理同样来自"模块粒度 = 文件粒度"：服务端只重转变更模块，再通过 WebSocket 告诉浏览器重新发一个 ESM 请求，不需要重新打包，所以更新耗时与项目规模无关。代价是：模块没有 `import.meta.hot.accept` 边界时会向上冒泡，冒泡不到就整页刷新。本 lab 只做生产，不展开。

## 二、生产配置全览（单入口）

配置本身只有五类，与 webpack 那五类一一对应：

| 类别 | Vite 配置 | 对应 webpack |
| --- | --- | --- |
| 入口 | `root` + `index.html` 里的 `<script type="module" src="/src/main.js">` | `entry` |
| 出口 | `build.outDir` / `rollupOptions.output.*FileNames` | `output.path` / `filename` |
| 转换 | 内置（按文件类型自动分流） | `module.rules` + loader |
| 扩展 | `plugins`（Rollup 兼容钩子 + Vite 专属钩子） | `plugins` |
| 优化 | `build.rollupOptions.output.manualChunks` / `minify` | `optimization` |

一个与 webpack 不同的点：**Vite 的入口写在 HTML 里**。`index.html` 是构建的起点（不是产物模板），那句 `<script type="module" src="/src/main.js">` 就是 entry。

> 摘自 `./code/vite-lab/vite.config.mjs`（运行：`npm run build`）

```js
export default defineConfig({
    root: DIR,

    // 环境变量前缀：只有 VITE_ 开头的才会暴露给客户端代码
    envPrefix: 'VITE_',

    define: {
        // 编译期常量，与 webpack DefinePlugin 等价
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },

    plugins: [
        // 官方 @vitejs/plugin-vue 编译 .vue 单文件组件；它是本 lab 唯一的非手写插件
        vue(),
        // 顺序即注册顺序；真正的先后由各自的 enforce / order 决定
        miniVirtual(),
        miniDrop(),
        miniHtml({ nonce: 'lab-nonce' })
    ],

    optimizeDeps: {
        include: ['magic-string']
    },

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 关掉内置压缩，改用我们手写的 miniTerser（与 webpack 篇同构）
        minify: false,
        assetsInlineLimit: 4096,
        cssCodeSplit: true,

        rollupOptions: {
            output: {
                // 内容变了文件名才变 → CDN 长缓存
                entryFileNames: 'assets/[name].[hash:8].js',
                chunkFileNames: 'assets/[name].[hash:8].chunk.js',
                assetFileNames: 'assets/[name].[hash:8][extname]',
                manualChunks(id) {
                    if (id.includes('node_modules')) return 'vendor'
                    return null
                }
            },
            // 挂在 output 上的手写插件：压缩在前、称重在后的顺序即依赖关系
            plugins: [
                miniTerser(),
                miniSizeGate({ limitKb: 60, manifest: 'build-manifest.json' })
            ]
        }
    }
})
```

四件事值得单独说：

- **`define` 替换的是代码文本，值必须 `JSON.stringify`**。不加引号会被当成标识符而报错——这一点与 webpack 的 `DefinePlugin` 完全一样。
- **`[hash:8]` 对应 webpack 的 `[contenthash:8]`**：内容变文件名才变，内容不变 CDN 就一直命中。Vite 里 `entryFileNames` / `chunkFileNames` / `assetFileNames` 三项各管一类产物。
- **`minify: false` 是有意的**：关掉内置压缩器，把这一步交给第四节手写的 `mini-terser`——与 webpack 篇用 `MiniTerserPlugin` 顶掉默认 `TerserPlugin` 是同一个套路。
- **`.vue` 的编译只能靠官方插件**：Vite 内置的转换覆盖 JS / TS / CSS / 静态资源，但不认 SFC，需要 `@vitejs/plugin-vue`。所以"生产配置全手写"针对的是**产物收尾**（HTML / 压缩 / 门禁），不是语言编译——语言编译两边都用官方方案（webpack 是 `vue-loader`，Vite 是这个插件）。

配置按阶段分四类，混淆它们是常见错误：

| 类别 | 配置 | 生效阶段 |
| --- | --- | --- |
| 通用 | `root` / `plugins` / `resolve.alias` / `define` / `envPrefix` | dev + build |
| 仅 dev | `server.*`（含 `proxy`）/ `optimizeDeps.*` | 只有 dev server |
| 仅 build | `build.*`（`outDir` / `minify` / `assetsInlineLimit` / `rollupOptions`） | 只有 `vite build` |
| SSR | `ssr.*` | 只有 `vite build --ssr` |

最容易想错的两条：**`server.proxy` 只在 dev 生效**（生产没有 Vite，代理要在 nginx / 网关层做，"本地能调通"不等于"上线也能调通"）；**`assetsInlineLimit` 属于 build**（dev 下资源都按 URL 直接请求，不存在内联一说）。

## 三、手写插件（一）：虚拟模块与剔除

### 3.1 mini-virtual：给源码一个"磁盘上不存在"的模块

`src/main.js` 里写着 `import { BUILD_INFO } from 'virtual:build-info'`，但磁盘上没有这个文件。虚拟模块靠两个钩子配合：`resolveId` 认领说明符、`load` 提供内容。

> 摘自 `./code/vite-lab/plugins/mini-virtual.mjs`（运行：`npm run build`）

```js
export default function miniVirtual() {
    const VIRTUAL_ID = 'virtual:build-info'
    const RESOLVED_ID = '\0' + VIRTUAL_ID

    // configResolved 能读到最终配置；把 mode 缓存下来，load 时注入字面量
    let mode = 'production'

    return {
        name: 'mini-virtual',

        configResolved(config) {
            mode = config.mode
        },

        resolveId(source) {
            if (source === VIRTUAL_ID) return RESOLVED_ID
            return null // 返回 null = 这个模块我不管，交给链上的下一个插件
        },

        load(id) {
            if (id !== RESOLVED_ID) return null
            // 这里返回的就是"模块源码"，它会像真实文件一样被后续插件 transform
            return `export const BUILD_INFO = { name: 'vite-lab', mode: ${JSON.stringify(mode)} }\n`
        }
    }
}
```

三个关键点：

1. **虚拟 id 用 `\0` 打头**。这是 Rollup 生态的约定，表示"这不是真实路径"，避免后续插件或解析器再去磁盘找它。Vite 的 `virtual:` 前缀模块也是同一套机制。
2. **`resolveId` 返回 `null` 表示"我不处理"**，把说明符交还给插件链。返回 `undefined` 也行，显式写 `null` 更好读。
3. **`load` 返回的字符串就是模块源码**，它会像真实文件一样被后续插件 `transform`——所以虚拟模块里也能写 `import`、也会被 tree-shaking。

`configResolved` 里缓存 `mode`，是为了在 `load` 时把值内联成字面量。这和 `import.meta.env` 的静态替换是同一个道理：**构建期能定下来的东西，就别留到运行期**。

### 3.2 mini-drop：构建期清掉不该上线的东西

生产里两个高频诉求：测试 / mock 文件不能进产物，注释与调试日志不能进产物。一个插件演示两种写法。

> 摘自 `./code/vite-lab/plugins/mini-drop.mjs`（运行：`npm run build`）

```js
const SRC_RE = /[/\\]src[/\\]/

export default function miniDrop(options = {}) {
    const dropRe = options.drop || /\.spec\.js$|mock\.js$/
    const removed = []

    return {
        name: 'mini-drop',
        enforce: 'pre', // 抢在 Vite 内置转换之前处理源码

        transform(code, id) {
            const clean = id.split('?')[0]
            if (!SRC_RE.test(clean)) return null

            // (a) 测试 / mock 文件：清空即可，import 它的那条边会指向一个空模块
            if (dropRe.test(clean)) {
                removed.push(clean.split(/[/\\]/).pop())
                return { code: 'export {}' }
            }

            // (b) 剔除注释行与调试行（生产里往往精确到项目自己的 logger）
            const cleaned = code
                .split('\n')
                .map(l => (l.trim().startsWith('//') || /^\s*console\.log\(/.test(l) ? '' : l))
                .join('\n')
            return cleaned === code ? null : { code: cleaned }
        },

        buildEnd() {
            if (removed.length) console.log(`  [mini-drop] 已清空 ${removed.join(', ')}`)
        }
    }
}
```

两个写法的分工：

- **(a) 返回空模块 `export {}`，而不是"删文件"**。让这个文件照常进依赖图，再由 tree-shaking 把整块摇掉——若改用 `generateBundle` 去删已生成的 chunk，import 它的那条边会变成孤儿。
- **(b) 只对本项目文件判断**（`SRC_RE` 限定 `src/`），`node_modules` 一律不碰。这是所有源码级插件的安全底线，正则一刀切最容易误伤依赖。

`enforce: 'pre'` 决定的是**同一个钩子内部**的先后（`pre → normal → post`），跨钩子无效（`transform` 一定晚于 `resolveId`）。要"抢在内置转换之前看源码"就用它。

实测（`npm run build`）：

```
  [mini-drop] 已清空 main.spec.js, mock.js
```

`main.js` 主动 `import './mock.js'` 与 `'./main.spec.js'`——它们照常进了依赖图，然后在产物里彻底消失。

## 四、手写插件（二）：HTML 收尾 / 压缩 / 体积门禁

这三个插件覆盖生产产物的最后三道工序，且挂在不同钩子上——**钩子的选择本身就是分工**。

### 4.1 mini-html：给 HTML 收尾（modulepreload 查重 + CSP nonce）

> 摘自 `./code/vite-lab/plugins/mini-html.mjs`（运行：`npm run build`）

```js
export default function miniHtml(options = {}) {
    const nonce = options.nonce || 'lab-nonce'

    return {
        name: 'mini-html',
        apply: 'build', // 只在 vite build 时加载，dev 完全不加载

        transformIndexHtml: {
            order: 'post', // 排在其它 HTML 变换之后，保证看到的是最终产物
            handler(html, ctx) {
                // ctx.bundle 只有构建期才有：里面是"文件名 → 产物"的映射
                const entry = Object.values(ctx.bundle).find(o => o.type === 'chunk' && o.isEntry)

                // Vite 默认已经注入过 modulepreload，不查重就会让同一个 chunk 被请求两次
                const deps = entry?.imports || []
                const missing = deps.filter(f => !html.includes(`href="/${f}"`))
                const preloads = missing
                    .map(f => `<link rel="modulepreload" href="/${f}" nonce="${nonce}">`)
                    .join('\n    ')

                const withNonce = html.replace(/<script /g, `<script nonce="${nonce}" `)
                // …（此处打印一行实测读数，见下）
                return preloads ? withNonce.replace('</head>', `    ${preloads}\n  </head>`) : withNonce
            }
        }
    }
}
```

三个要点：

1. **`apply: 'build'`**：插件只在构建期加载，dev 完全不加载。这比"在钩子里判 command"更干净——不加载就不会被误触发。
2. **`order: 'post'`**：`transformIndexHtml` 也按 `order`（`pre/normal/post`）排队，`post` 保证看到的是最终 HTML。
3. **`ctx.bundle` 只有构建期才有**：它是"文件名 → 产物"的映射，所以能现读带 hash 的入口文件名和它的依赖 chunk。dev 阶段没有 `bundle`，要做同类事得走 `configureServer` 挂中间件。

**"补 0 条"是本段最有价值的读数**：Vite 默认已经注入了 `modulepreload`（`build.modulePreload`），自研插件不查重就会让同一个 chunk 被请求两次。实测：

```
  [mini-html] 入口依赖 1 条，Vite 已注入 1 条，补 0 条；脚本加 nonce="lab-nonce"
```

`deps.length - missing.length = 1`，说明查重命中，一条都没重复注入。生成的 `dist/index.html`：

```
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>vite-lab 生产构建</title>
  <script nonce="lab-nonce" type="module" crossorigin src="/assets/index.CphOY7iM.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/vendor.Cq48c57l.chunk.js">
  <link rel="stylesheet" crossorigin href="/assets/index.w0buB3h3.css">
</head>
```

`<script>` / `<link>` 引用的是**现读出来的最终文件名**——这就是你从不手写 `<script src="app.js">` 的原因，hash 变了它自动跟着变。

### 4.2 mini-terser：压缩 JS

> 摘自 `./code/vite-lab/plugins/mini-terser.mjs`（运行：`npm run build`）

```js
import { minify } from 'terser'

export default function miniTerser(options = {}) {
    const kb = n => (n / 1024).toFixed(2)

    return {
        name: 'mini-terser',

        async renderChunk(code, chunk) {
            const result = await minify(code, { format: { comments: false }, ...options })
            if (result.error) throw result.error
            // Rolldown 在 renderChunk 阶段给的是占位文件名（真实文件名要等 generateBundle）
            const label = chunk.name || chunk.fileName
            console.log(`  [mini-terser] ${label}: ${kb(code.length)} KB → ${kb(result.code.length)} KB`)
            return { code: result.code, map: null }
        }
    }
}
```

挂在 `renderChunk` 而不是 `generateBundle`：此时 chunk 代码已生成、还没算 hash、还没写盘，正是**改代码**的时机。实测：

```
  [mini-terser] index: 6.00 KB → 3.90 KB
  [mini-terser] About: 0.78 KB → 0.57 KB
  [mini-terser] Home: 1.46 KB → 1.06 KB
  [mini-terser] vendor: 248.33 KB → 127.61 KB
```

一个 8.x 的细节：`renderChunk` 阶段拿到的是**占位文件名**（真实文件名要等 `generateBundle`），所以日志里用 `chunk.name` 做标签；直接打印 `chunk.fileName` 会得到 `!~{001}~` 这类占位符。

### 4.3 mini-size-gate：产物体积门禁

> 摘自 `./code/vite-lab/plugins/mini-size-gate.mjs`（运行：`npm run build`）

```js
import zlib from 'node:zlib'

export default function miniSizeGate({ limitKb = Infinity, manifest = 'build-manifest.json' } = {}) {
    return {
        name: 'mini-size-gate',

        generateBundle(_options, bundle) {
            const rows = []
            for (const [fileName, item] of Object.entries(bundle)) {
                const source = item.type === 'chunk' ? item.code : item.source
                rows.push({
                    fileName,
                    type: item.type,
                    raw: Buffer.byteLength(source),
                    gzip: zlib.gzipSync(Buffer.from(source)).length
                })
            }
            rows.sort((a, b) => b.gzip - a.gzip)

            // …（此处打印一行行清单，见下）
            // this.emitFile：额外产出一个清单文件（走 asset 通道，不占 chunk）
            this.emitFile({
                type: 'asset',
                fileName: manifest,
                source: JSON.stringify(rows, null, 2)
            })

            const over = rows.filter(r => r.gzip > limitKb * 1024)
            if (over.length) {
                this.error(`产物超预算：${over.map(r => `${r.fileName} gzip ${r.gzip}B > ${limitKb}KB`).join('；')}`)
            }
            // …（末尾再打印一行合计读数）
        }
    }
}
```

三个设计点：

1. **量 gzip 而不是 raw**。浏览器拿到的都是压缩后的字节，raw 与 gzip 差 3 倍很常见，拿 raw 定阈值等于自欺欺人。
2. **产出清单而不是只打印**。构建日志会丢，`build-manifest.json` 会进 CI 产物；下次体积涨了，diff 两份清单就知道是哪个 chunk、涨了多少。
3. **`this.error` 让插件从"报告"变成"门禁"**。CI 里的非零退出码就是靠它。

实测（`npm run build`）：

```
  ---- 产物清单（按 gzip 排序）----
    assets/vendor.Cq48c57l.chunk.js  chunk  raw 163457B  gzip  46275B
    assets/index.CphOY7iM.js         chunk  raw   4688B  gzip   2039B
    assets/Home.CuH3FUhR.chunk.js    chunk  raw   1274B  gzip    743B
    assets/About.T_HEhohc.chunk.js   chunk  raw    721B  gzip    473B
    index.html                       asset  raw    536B  gzip    336B
    assets/index.w0buB3h3.css        asset  raw    563B  gzip    290B
    assets/Home.BOdmc5nG.css         asset  raw    127B  gzip    118B
    合计 gzip 50274B，预算 60KB —— 通过
```

阈值定在 60KB 而不是更小：Vue + vue-router 进 `vendor` 后 gzip 已 46KB，门禁的意义是**挡住继续膨胀**，不是卡一个脱离技术栈的绝对值。哪天真超了，`build-manifest.json` 的 diff 会告诉你是哪个 chunk 涨的。

### 4.4 三个钩子的分工纪律

| 想干的事 | 用哪个钩子 | 为什么是它 |
| --- | --- | --- |
| 改 chunk 代码（压缩、替换常量） | `renderChunk` | 代码已生成、hash 未算、未写盘 |
| 增删产物、改文件名、产出清单 | `generateBundle` | "已生成、未写盘"的唯一安全窗口 |
| 改 HTML | `transformIndexHtml` | 只有它拿得到 `ctx.bundle`（build 侧） |

一句话：**改代码在 `renderChunk`，动产物结构在 `generateBundle`**。删一个 chunk 时还要留意它的引用边，否则别的 chunk 会指向一个不存在的文件。这条纪律对 webpack / Vite / Rollup 通用。

## 五、代码分割与压缩

Vite 的代码分割完全走 Rollup 的配置口——`build.rollupOptions.output.manualChunks`：

> 摘自 `./code/vite-lab/vite.config.mjs`（运行：`npm run build`）

```js
manualChunks(id) {
    if (id.includes('node_modules')) return 'vendor'
    return null
}
```

**8.x 的坑：Rolldown 下 `manualChunks` 只接受函数形式**。写成对象形式 `manualChunks: { vendor: ['magic-string'] }` 会直接报 `Invalid type: Expected Function but received Object`。迁移老配置时要逐个验证——这是 8.x 迁移清单里最常撞到的一条。

单入口下最自然的分割是**路由级懒加载**：`vue-router` 路由表里写 `component: () => import('./views/Home.vue')`，`() => import()` 就是动态 `import()`，Vite 会为每个视图切出独立 chunk，首屏不下载。`src/router.js` 里两条路由各切一个：

> 摘自 `./code/vite-lab/src/router.js`（运行：`npm run build`）

```js
import { createRouter, createWebHistory } from 'vue-router'

// 路由级懒加载：() => import() 是动态 import，Vite 会为每个视图切出独立 chunk，首屏不下载
const routes = [
    { path: '/', name: 'home', component: () => import('./views/Home.vue') },
    { path: '/about', name: 'about', component: () => import('./views/About.vue') }
]

export default createRouter({
    history: createWebHistory(),
    routes
})
```

一次 `npm run build` 的实测产物（按 gzip 排序，来自 `dist/build-manifest.json`）：

```
assets/vendor.Cq48c57l.chunk.js  163457B raw / 46275B gzip  ← node_modules（vue / vue-router / magic-string）
assets/index.CphOY7iM.js           4688B raw /  2039B gzip  ← 入口
assets/Home.CuH3FUhR.chunk.js      1274B raw /   743B gzip  ← 路由懒加载：Home.vue
assets/About.T_HEhohc.chunk.js      721B raw /   473B gzip  ← 路由懒加载：About.vue
index.html                          536B raw /   336B gzip
assets/index.w0buB3h3.css           563B raw /   290B gzip  ← 抽出的 CSS（style.css + SFC 的 <style>）
assets/Home.BOdmc5nG.css            127B raw /   118B gzip  ← Home.vue 的 <style scoped> 单独成块
```

产出层层咬合：`vendor.*.chunk.js` 是 `manualChunks` 按"命中 node_modules"切出来的依赖 chunk（依赖不常变，它的 hash 稳定就能长缓存）；`index.*.js` 是入口；`Home.*.chunk.js` / `About.*.chunk.js` 是路由表里 `() => import()` 切出的两个视图，导航到对应路径时才下载。

CSS 由 `cssCodeSplit: true` 单独成文件，与 webpack 篇抽离 CSS 的目的一样——**拿到独立 hash，单独命中缓存**；同时它随 HTML 并行加载，不会像运行时注入那样有 FOUC 风险。路由视图的 `<style scoped>` 会被切成各自的 CSS（`Home.*.css`），只在该视图被加载时才拉取。

压缩由手写 `mini-terser` 完成（见 4.2）。因为配置里写了 `minify: false`，那 248.33 KB → 127.61 KB 的读数完全来自我们的插件，而不是内置压缩器。

## 六、两个命令与预览

配套代码只有两个 Vite 命令，且**共用同一份配置**：

| 命令 | 做什么 | 产物 / 服务 |
| --- | --- | --- |
| `npm run build` | production 构建，写盘 | `vite-lab/dist/` |
| `npm run preview` | 先 `vite build`、再 `vite preview` 预览真实产物 | 写盘 + 端口 5181 |

第八节的 `mini-vite` 是**独立项目** `code/mini-vite/`，命令不在 vite-lab 里（见那一节）。

`preview` 与 `build` 共用 `vite.config.mjs`，**不需要第二份配置文件**。`vite preview` 是纯静态服务，它服务的就是 `build` 写盘的 `dist/`——所以"预览到的"和"要上线的"是同一批文件。

> 一句提醒：`vite preview` **不是 dev server**，没有 HMR、不做任何转换。它的定位是"上线前的最后一眼"。

对照 webpack 篇可以发现一处差异：webpack 的 preview 要挂 `webpack-dev-server`，还得关掉 `client: false` 防止它的客户端代码被 `splitChunks` 抽成 vendors 污染产物；Vite 的 preview 是纯静态服务，没有这个问题。

## 七、断点调试

调试自己写的插件，不需要任何"调试插件"——断点直接打在 `plugins/*.mjs`、`vite.config.mjs` 里就能命中，因为它们是我们自己的源码，不在 `node_modules`。

要解决的同样是**入口**：`npm run build` 的链路是 `npm.cmd → node → … → vite`，中间隔了一层，Windows 下 `--inspect-brk` 传不到真正的 node 进程。所以用 VS Code 的 `launch.json`，让 `program` 走 npm 命令：

> 摘自 `./code/vite-lab/.vscode/launch.json`（运行：`npm run build`）

```jsonc
{
    // 在 vite-lab 目录打开工作区，F5 即可调试 vite build。
    // 断点直接打在 plugins/*.mjs、vite.config.mjs 里就能命中。
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "调试 vite build",
            "runtimeExecutable": "npm",
            "runtimeArgs": ["run", "build"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        }
    ]
}
```

`runtimeExecutable: "npm"` + `runtimeArgs: ["run", "build"]` 就是"用 npm 命令方式调试"——改脚本不用改 `launch.json`。位置在 `vite-lab/.vscode/launch.json`，以 `vite-lab` 为工作区根打开时可直接 F5。

三条注意：

- 断点打在 `transform` 里，能看到 `code` 与 `id`。排查"我的插件为什么没生效"就下在这：看 `id` 是否符合预期、`enforce` 是否让你排在了别人后面。
- 断点打在 `renderChunk` 里能看到压缩前后的 `code`；打在 `generateBundle` 里能看到 `bundle` 的最终形态。
- 别用 `node_modules/.bin/vite` 启动调试：Windows 下 `vite.cmd` 多包了一层批处理，`--inspect-brk` 传不到 node。要命令行调试就直指 `node_modules/vite/bin/vite.js`。若以仓库根为工作区打开 VS Code，嵌套的 `.vscode/launch.json` 不生效，需把这段配置合并进根配置。

## 八、mini-vite：几十行看懂"不打包"

前面的原理是"纸上结论"，`mini-vite` 把它变成能跑的代码。它是**独立项目**（`code/mini-vite/`，与 vite-lab 平级、无第三方依赖、`npm run mini` 即可跑），只复刻 dev 内核最关键的三件事：**按 URL 返回、import 原样保留、只转被请求的**。文件按职责拆开，一个文件一件事：

| 文件 | 承担的概念 |
| --- | --- |
| `index.mjs` | 入口：起服务、发几个请求、打印本轮转换了谁 |
| `lib/server.mjs` | 路由：按 URL 找文件、只转被请求到的模块 |
| `lib/transform.mjs` | 转换：改写 import 说明符，并记录模块图 |
| `src/` | 演示源码（`main.js` / `helper.js` / `lazy.js`） |

转换逻辑在 `lib/transform.mjs`——相对导入原样放过，裸导入改写成 `/@deps/` 前缀，并把被转换的模块记进模块图：

> 摘自 `./code/mini-vite/lib/transform.mjs`（运行：`npm run mini`）

```js
// 模块图的最小形态：只记录本轮 dev server 转换过哪些模块
export const transformed = new Set()

// 匹配 import / export 语句里的模块说明符；捕获「关键字 + 引号」以便原地替换
const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g

export function transform(id, code) {
    // 只有被浏览器请求到的模块才会走到这里 —— 这就是"按需转换"
    transformed.add(id)

    const out = code.replace(SPECIFIER_RE, (whole, keyword, quote, specifier) => {
        // 相对导入原样保留：浏览器会再发一个 ESM 请求，服务端到时再按需转换它
        if (specifier.startsWith('.')) return whole
        // 裸导入指向预构建前缀，对应真实 Vite 的 node_modules/.vite/deps
        return `${keyword}${quote}/@deps/${specifier}.js${quote}`
    })

    return { code: out }
}
```

路由在 `lib/server.mjs`：三个 `if` 对应真实 Vite 的中间件链（`vite:resolve` / `vite:import-analysis` / `vite:transform`），**没有任何打包步骤**：

> 摘自 `./code/mini-vite/lib/server.mjs`（运行：`npm run mini`）

```js
const server = createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url
    // …
    if (urlPath.startsWith('/src/')) {
        const file = path.join(root, urlPath.replace('/src/', ''))
        // …
        // 关键一步：只有这个文件被请求到才走 transform
        const { code } = transform(urlPath, fs.readFileSync(file, 'utf8'))
        res.setHeader('Content-Type', 'application/javascript')
        res.end(code)
        return
    }
    res.statusCode = 404
    res.end('not found')
})
```

跑一遍（样本里 `helper.js` 被入口引用、`lazy.js` 存在但从不被任何 import 指向）：

```
---- mini-vite：按需转换、不打包 ----
  请求 /src/main.js → 200
  main.js 里 import 是否保留（不打包）： true
  main.js 里裸导入被改写： true
  helper.js 被请求 → 转换
  lazy.js 没被任何 import 指向，/src/lazy.js 没人请求
  本轮实际转换的模块： /src/main.js, /src/helper.js
```

对照真实 Vite，这几十行已经"骨架齐全"：相对导入保留（浏览器发第二个 ESM 请求）、裸导入改写（指向依赖预构建产物）、有模块才转换（`lazy.js` 从不被转换）。Vite 真身叠加的，是内置插件链、HMR 的 accept 边界、依赖预构建的缓存、以及 Rolldown 生产引擎——**机制没变，只是把每一步做重、做对、做成可插拔**。

## 配套代码

本篇示例来自 `code/vite-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/vite-lab/package.json` | 两个命令：`build` / `preview`；依赖 `vue` / `vue-router` / `@vitejs/plugin-vue` | 六 |
| `./code/vite-lab/vite.config.mjs` | **唯一配置**：`vue()` 插件 / 入口 / 输出 hash / 手写插件 / manualChunks / 压缩 | 二、五 |
| `./code/vite-lab/index.html` | 入口（Vite 的 entry 写在 HTML 里，挂载点 `#app`） | 二 |
| `./code/vite-lab/src/main.js` | 入口：`createApp(App).use(router).mount('#app')` / 环境变量 / 虚拟模块 / 引 mock 与 spec | 一、二、三、五 |
| `./code/vite-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件（含 `<style scoped>`） | 二、五 |
| `./code/vite-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 五 |
| `./code/vite-lab/src/style.css`、`base.css`、`helper.js` | 样式（`@import`）与工具函数样本 | 一、五 |
| `./code/vite-lab/src/mock.js`、`src/main.spec.js` | 不该上线的样本（被 mini-drop 清空） | 三 |
| `./code/vite-lab/.env`、`.env.production` | 环境变量（`VITE_APP_NAME`） | 一 |
| `./code/vite-lab/plugins/mini-virtual.mjs` | 手写虚拟模块插件 | 三 |
| `./code/vite-lab/plugins/mini-drop.mjs` | 手写剔除插件（剔文件 / 剔调试） | 三 |
| `./code/vite-lab/plugins/mini-html.mjs` | 手写 HTML 收尾（modulepreload 查重 + CSP nonce） | 四 |
| `./code/vite-lab/plugins/mini-terser.mjs` | 手写压缩插件 | 四 |
| `./code/vite-lab/plugins/mini-size-gate.mjs` | 手写体积门禁 + manifest | 四 |
| `./code/vite-lab/.vscode/launch.json` | VS Code 调试配置（`program` 走 npm 命令） | 七 |
| `./code/mini-vite/index.mjs` | dev server 最小内核入口：起服务、发请求、打印本轮转换了谁 | 八 |
| `./code/mini-vite/lib/server.mjs` | 路由：按 URL 找文件、只转被请求到的模块 | 八 |
| `./code/mini-vite/lib/transform.mjs` | 转换：改写 import 说明符 + 记录模块图 | 八 |
| `./code/mini-vite/src/` | 演示源码（main / helper / lazy） | 八 |

运行：`cd code/vite-lab && npm install`，然后 `npm run build`（构建）、`npm run preview`（构建 + 预览）。

第八节的 `mini-vite` 是**独立项目**（无第三方依赖）：`cd code/mini-vite && npm run mini`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[webpack](./webpack.md)
- 下一篇：[Rollup](./Rollup.md)
- [Vite 官方文档](https://vite.dev/)
- [Vite 插件 API](https://vite.dev/guide/api-plugin.html)