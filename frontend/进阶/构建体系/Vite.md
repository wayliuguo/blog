# Vite

> 本篇讲**两套引擎的插件**：dev 侧（`configureServer` / `hotUpdate`）与 build 侧（虚拟模块 / 剔除 / HTML 收尾 / 压缩 / 体积门禁）。示例是一个真实的 Vue 3 应用——单文件组件（SFC）+ `vue-router` 多路由 + 路由级懒加载；SFC 的编译交给官方 `@vitejs/plugin-vue`，其余插件全部手写。组织方式与 [webpack](./webpack.md) 篇对齐：一份配置 + 手写插件 + 断点调试。差别在两处——Vite 有 dev / build **两套引擎**，且插件排序不靠 `stage` 数值。第三节先给**两张钩子全貌速查表**（通用 / Vite 专有），后面每一章都对应表里的某几行。

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

- **dev 快在"不打包"**。第十节的 `mini-vite` 把这件事跑给你看：只请求入口，`helper.js` 被 import 到才会被转换，`lazy.js` 没人请求就一次都不转；同一份插件表切到 build 引擎，则一次走完整张模块图、拼成一个文件。
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

**HMR** 是 dev 的招牌能力，原理同样来自"模块粒度 = 文件粒度"：服务端只重转变更模块，再通过 WebSocket 告诉浏览器重新发一个 ESM 请求，不需要重新打包，所以更新耗时与项目规模无关。代价是：模块没有 `import.meta.hot.accept` 边界时会向上冒泡，冒泡不到就整页刷新。第四节手写的 `mini-hmr` 会把这条链路打出来。

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
        // 顺序即注册顺序；真正的先后由各自的 enforce / order 决定（见 3.3）
        miniVirtual(),
        miniDrop(),
        miniHtml({ nonce: 'lab-nonce' }),
        // 下面两个只在 dev 生效（各自声明了 apply: 'serve'），build 时根本不加载
        miniMock(),
        miniHmr()
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
- **`minify: false` 是有意的**：关掉内置压缩器，把这一步交给第六节手写的 `mini-terser`——与 webpack 篇用 `MiniTerserPlugin` 顶掉默认 `TerserPlugin` 是同一个套路。
- **`.vue` 的编译只能靠官方插件**：Vite 内置的转换覆盖 JS / TS / CSS / 静态资源，但不认 SFC，需要 `@vitejs/plugin-vue`。所以"生产配置全手写"针对的是**产物收尾**（HTML / 压缩 / 门禁），不是语言编译——语言编译两边都用官方方案（webpack 是 `vue-loader`，Vite 是这个插件）。

配置按阶段分四类，混淆它们是常见错误：

| 类别 | 配置 | 生效阶段 |
| --- | --- | --- |
| 通用 | `root` / `plugins` / `resolve.alias` / `define` / `envPrefix` | dev + build |
| 仅 dev | `server.*`（含 `proxy`）/ `optimizeDeps.*` | 只有 dev server |
| 仅 build | `build.*`（`outDir` / `minify` / `assetsInlineLimit` / `rollupOptions`） | 只有 `vite build` |
| SSR | `ssr.*` | 只有 `vite build --ssr` |

最容易想错的两条：**`server.proxy` 只在 dev 生效**（生产没有 Vite，代理要在 nginx / 网关层做，"本地能调通"不等于"上线也能调通"）；**`assetsInlineLimit` 属于 build**（dev 下资源都按 URL 直接请求，不存在内联一说）。

## 三、钩子全貌速查（Vite 8）

webpack 篇的钩子收敛在 `processAssets` + 一堆 `stage` 数字里，一张表就能看全。Vite 不一样：钩子有**两条正交的轴**——**归属**（通用即 Rollup / Rolldown 兼容，还是 Vite 专有）与**生效端**（dev / build / 两者 / preview）。判"能不能复用"看归属，判"什么时候触发"看生效端。所以下面拆成两张表，各自带一列「参数」；排序规则另分三层，放在 3.3。这一节先给地图，后面每一章都对应表里的某几行。

### 3.1 通用钩子速查（Rollup / Rolldown 兼容）

`interface Plugin extends Rolldown.Plugin`——这一组是继承来的，Rollup 里同名同义，换个工具还能用。

| 钩子 | 参数 | 生效端 | 阶段 | 此刻能看到 | 本篇谁在这一步 | 官方 / 开源常见插件 |
| --- | --- | --- | --- | --- | --- | --- |
| `buildStart` | `(options)` | 两者 | 启动 | 已解析的 options | — | `unplugin-auto-import` |
| `resolveId` | `(source, importer, options)` | 两者 | 解析 | 说明符、importer | `mini-virtual` | `vite-plugin-virtual` |
| `load` | `(id)` | 两者 | 加载 | 已解析的 id | `mini-virtual` | — |
| `transform` | `(code, id)` | 两者 | 转换 | 源码 + id | `mini-drop` | `vite-plugin-remove-console` |
| `buildEnd` | `(error?)` | 两者 | 收尾 | 构建结束 / 报错 | — | — |
| `renderChunk` | `(code, chunk, options)` | **build** | 产物 | 已生成的 chunk 代码 | `mini-terser` | `vite-plugin-terser` |
| `generateBundle` | `(options, bundle)` | **build** | 产物 | 完整 bundle | `mini-size-gate` | `size-limit` |
| `closeBundle` | `()` | **build** | 收尾 | 已写盘的产物 | — | 通知 / 上报类 |

### 3.2 Vite 专有钩子速查

这一组 Rollup 里没有，是 Vite 自己加的——只在 Vite 项目里有意义。

| 钩子 | 参数 | 生效端 | 阶段 | 此刻能看到 | 本篇谁在这一步 | 官方 / 开源常见插件 |
| --- | --- | --- | --- | --- | --- | --- |
| `config` | `(config, env)` | 两者 | 配置 | 用户配置 | `mini-virtual`（缓存 `mode`） | `vite-plugin-html` |
| `configResolved` | `(config)` | 两者 | 配置 | 最终配置 | — | — |
| `configureServer` | `(server)` | **dev** | 起服务 | `ViteDevServer` | `mini-mock` | `vite-plugin-mock` |
| `transformIndexHtml` | `(html, ctx)` | 两者 | HTML | HTML（build 侧另有 `ctx.bundle`） | `mini-html` | `vite-plugin-html` |
| `hotUpdate` | `(ctx)` | **dev** | 热更 | 变更模块、模块图 | `mini-hmr` | HMR 增强类 / `vite-plugin-inspect` |
| `configurePreviewServer` | `(server)` | **preview** | 预览 | `PreviewServer` | —（本 lab 未用） | 预览期鉴权 / 代理类 |

记住三件事：

1. **两条轴是正交的**。通用钩子也分两端：`transform` 两端都跑、`renderChunk` 只在 build 跑；专有钩子里也有跑两端的（`transformIndexHtml`）。看一行的"归属"判断能不能复用，看"生效端"判断什么时候触发。
2. **"两端都跑"不等于"含义相同"**。`resolveId` / `load` / `transform` 在 dev 与 build 都会触发，但 dev 只处理**被请求到的模块**，build 处理**整个依赖图**。第十节的实测读数里，同一个 `transform` 在 dev 触发 4 次、build 触发 6 次。
3. **不是所有钩子都会在你的项目里跑**。`configurePreviewServer` 只在 `vite preview` 时触发，本 lab 没用它，所以表里标"未用"——**表里的空行也是信息**。钩子不触发时先查 `apply`：`apply: 'serve'` 的插件在 build 里根本不加载，断点当然打不中。

> 参数列按 Vite 8 的 `Plugin` 类型标注，省略了可选的尾参（`transform(code, id, options?)` 记作 `(code, id)`）。完整清单以 `node_modules/vite/dist/node/index.d.ts` 里的 `Plugin` 类型为准——它同时是"插件能实现哪些钩子"的唯一权威。

### 3.3 排序：enforce 与 order

webpack 用 `stage` 数值（`PROCESS_ASSETS_STAGE_*`）给同一阶段内的插件排序。Vite 没有这类数字，排序分三层，且**只有中间一层是跨插件的**：

| 层 | 手段 | 作用范围 | 例子 |
| --- | --- | --- | --- |
| 1 | 不用排 | 跨钩子 | `resolveId → load → transform` 天然有先后，排不了也没必要排 |
| 2 | `enforce: 'pre' \| 'normal' \| 'post'` | **跨插件、同一个钩子** | `mini-drop` 用 `pre` 抢在内置转换前看源码 |
| 3 | `order: 'pre' \| 'normal' \| 'post'` | **同插件、同一个钩子的多个 handler** | `mini-html` 的 `transformIndexHtml: { order: 'post', handler }` |

第 2 层的官方顺序链（引自 Vite 8 `Plugin` 类型注释）：

```
alias → pre → vite core → normal → vite build → post → vite build post
```

一句话对照：**webpack 的 `stage` 是全局数值，Vite 的是分层相对顺序**。`stage` 能表达"我排在 3000 和 4000 之间"，Vite 只能表达"我在内置之前 / 之后"——需要更细的次序时，只能拆成多个钩子，或借助第 3 层。

> 排在前面的插件会**改数据**，后面的人看到的是改过的结果。第四节的 `mini-hmr` 就实测到了这一点：`@vitejs/plugin-vue` 排在它前面，把 `ctx.modules` 收窄了。

### 3.4 三个钩子的分工纪律

build 侧最后三道工序该挂在哪，是实操里最容易选错的：

| 想干的事 | 用哪个钩子 | 为什么是它 |
| --- | --- | --- |
| 改 chunk 代码（压缩、替换常量） | `renderChunk` | 代码已生成、hash 未算、未写盘 |
| 增删产物、改文件名、产出清单 | `generateBundle` | "已生成、未写盘"的唯一安全窗口 |
| 改 HTML | `transformIndexHtml` | 只有它拿得到 `ctx.bundle`（build 侧） |

一句话：**改代码在 `renderChunk`，动产物结构在 `generateBundle`**。删一个 chunk 时还要留意它的引用边，否则别的 chunk 会指向一个不存在的文件。这条纪律对 webpack / Vite / Rollup 通用。

### 3.5 插件开发技巧

前四节讲"钩子长什么样"，这一节讲"写起来容易错在哪"。按主题分四组。

**（1）声明与门禁**

- **`name` 是唯一必填字段，且要唯一**。钩子报错、`enforce` 排序、调试输出都靠它定位；重名会让排查失去线索。
- **门禁一律用 `apply`，不要在钩子里判 `command`**。`apply: 'serve' | 'build'` 决定插件是否被加载；写成钩子体内 `if (command === 'build')`，插件在另一端仍会被加载、`config` 仍会被调用，只是钩子体不干活。

> 示意片段（无配套脚本）

```js
// 声明式门禁：build 才加载这个插件
{ name: 'mini-drop', apply: 'build', transform(code, id) { /* … */ } }
```

**（2）排序**

- **两级排序别用混**。`enforce`（`'pre' | 'normal' | 'post'`）管**跨插件、同一个钩子**；`order` 管**同插件、同一个钩子的多个 handler**。用错层级等于没排。
- **对象钩子是排序的载体**。要 `order` 就得把钩子写成 `{ handler, order }`；直接写函数等于 `normal`。
- **排在前面的人会改数据**。后面的人看到的是改过的结果——`@vitejs/plugin-vue` 排在 `mini-hmr` 前面，就收窄了 `ctx.modules`。

**（3）返回值与虚拟模块**

- **`resolveId` / `load` / `transform` 返回空 = 交给下一个插件**。返回 `null` / `undefined` 表示"我不处理"；返回 `''` 不是"不处理"，而是"我把它处理成了空字符串"，会截断后面的插件。

> 示意片段（无配套脚本）

```js
// 命中才返回；未命中返回 undefined，交给下一个插件
transform(code, id) {
    if (!id.endsWith('.js')) return
    return { code: code.replace(/console\.log\([^)]*\)/g, '') }
}
```

- **虚拟模块用 `\0` 前缀**。`\0` 开头的 id 是社区约定：视为虚拟、不再落盘，别的插件看到也会跳过。

> 示意片段（无配套脚本）

```js
// resolveId 认领说明符，load 提供内容
const VIRTUAL = '\0virtual:build-info'
resolveId(id) { if (id === 'virtual:build-info') return VIRTUAL },
load(id) { if (id === VIRTUAL) return `export const mode = ${JSON.stringify(mode)}` }
```

**（4）常见误用**

- **钩子可以 async，但容器是串行 `await`**。不是并发——以为并发、在后面插件里读前面插件的"半成品"，就会读到旧值。
- **`config` 里注入插件无效**。用户插件在 `config` 执行前就已解析完。
- **改产物去 `generateBundle`**。`transform` 拿不到 bundle，`renderChunk` 拿不到最终文件名。
- **`transform` 拿不到 HTML**。那是 `transformIndexHtml` 的活。

### 3.6 本篇插件 ↔ 官方 / 开源对照

| lab 插件 | 挂的钩子 | 对应的真实插件 | 什么时候直接用现成的 |
| --- | --- | --- | --- |
| `mini-virtual` | `resolveId` + `load` | `vite-plugin-virtual`、各类 codegen 插件 | 只是要个虚拟常量，用现成的更省 |
| `mini-drop` | `transform` | `vite-plugin-remove-console` | 只想删 `console`，别自己写 |
| `mini-html` | `transformIndexHtml` | `vite-plugin-html` | 要 EJS 模板 / 多页注入，用现成的 |
| `mini-terser` | `renderChunk` | `vite-plugin-terser` | 没有自定义压缩策略就用现成的 |
| `mini-size-gate` | `generateBundle` | `size-limit`、`rollup-plugin-bundle-size` | 门禁要接 CI 报告，现成的更全 |
| `mini-mock` | `configureServer` | `vite-plugin-mock` | 要延时 / 分页 / 数据文件，用现成的 |
| `mini-hmr` | `hotUpdate` | HMR 增强类插件 | 只想"看"模块图，用 `vite-plugin-inspect` |

一条总纲：**语言编译一律用官方（`@vitejs/plugin-vue`）；产物收尾才值得自己写；生态里已有成熟插件时优先用现成的。** 本 lab 手写这七个，是为了把钩子讲透，不是建议你在项目里重造它们。

## 四、dev 期插件：mock API 与 HMR

dev 引擎只在 `vite dev` 时存在，所以这两个插件都声明了 `apply: 'serve'`——build 时根本不加载。它们也是"Vite 的插件不止 build 侧"最直接的证据。

### 4.1 mini-mock：dev 期的假接口（configureServer）

页面里 `fetch('/api/user')`，请求由这里的中间件直接应答，背后没有真实后端。

> 摘自 `./code/vite-lab/plugins/mini-mock.mjs`（运行：`npm run dev`）

```js
export default function miniMock(options = {}) {
    const data = options.data || {
        '/api/user': { id: 1, name: 'vite-lab', role: 'admin' },
        '/api/pages': [
            { path: '/', title: '首页' },
            { path: '/about', title: '关于' }
        ]
    }

    return {
        name: 'mini-mock',
        apply: 'serve', // 只在 dev 加载，build 完全不加载

        configureServer(server) {
            // 直接挂 → 抢在 Vite 内置中间件之前，/api/* 的 200 与 404 都在这里处理完
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0]
                if (!url?.startsWith('/api/')) return next()

                const hit = data[url]
                res.statusCode = hit ? 200 : 404
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(hit || { error: 'mock 未定义该接口' }))
                console.log(`  [mini-mock] ${req.method} ${url} → ${res.statusCode}`)
            })

            // 返回的函数排在 Vite 内置中间件之后，适合做收尾动作（这里打印注册表）
            return () => {
                const routes = Object.keys(data)
                console.log(`  [mini-mock] 已注册 ${routes.length} 条 mock 路由：${routes.join(', ')}`)
            }
        }
    }
}
```

两个要点：

1. **中间件有两种挂法，差别就是"排在内置中间件之前还是之后"**。直接 `server.middlewares.use()` 是立刻挂；`return () => {...}` 是交给 Vite 等内置中间件装完再调用。
2. **这个差别有后果**：`/api/*` 的 404 必须放在靠前那个中间件里。写这篇时我先把它放在返回的函数里，实测 `/api/nope` 返回的是 `index.html`（状态码 200）——浏览器发来的请求带 `Accept: text/html`，被排在更前面的 Vite HTML 回退先吞掉了。

实测（`npm run dev`，另开终端发请求）：

```
  [mini-mock] 已注册 2 条 mock 路由：/api/user, /api/pages
  [mini-mock] GET /api/user → 200
  [mini-mock] GET /api/pages → 200
  [mini-mock] GET /api/nope → 404
```

```
$ curl http://localhost:5182/api/user
{"id":1,"name":"vite-lab","role":"admin"}
```

### 4.2 mini-hmr：看清一次改动波及了谁（hotUpdate）

`hotUpdate` 在文件变更时触发，拿到的是"这次变更涉及哪些模块"。插件顺着模块图往上一查，就知道会波及多少 import 它的模块。

> 摘自 `./code/vite-lab/plugins/mini-hmr.mjs`（运行：`npm run dev`）

```js
export default function miniHmr(options = {}) {
    const watched = options.watched || /[/\\]src[/\\]/

    return {
        name: 'mini-hmr',
        apply: 'serve', // 只在 dev 加载，build 里没有"热更新"这回事

        hotUpdate(ctx) {
            const { type, file, modules } = ctx
            if (!watched.test(file)) return

            // modules 是"这个文件自身对应的模块"；importers 是"谁引用了它"——逆着模块图往上查
            const importers = new Set()
            for (const mod of modules) {
                for (const imp of mod.importers) importers.add(imp.url)
            }

            const names = [...importers].map(u => u.split('/').pop())
            console.log(
                `  [mini-hmr] ${type} ${file.split(/[/\\]/).pop()}：自身模块 ${modules.length} 个，` +
                    `被 ${importers.size} 个模块引用${names.length ? `（${names.join(', ')}）` : ''}`
            )

            // 不返回 = 交给 Vite 默认逻辑自己算 HMR 边界
        }
    }
}
```

三个要点：

1. **`hotUpdate` 是新名，`handleHotUpdate` 仍可用**。新写法的 `ctx` 带 `environment`，插件里也能通过 `this.environment` 拿到当前环境；旧名走的是兼容路径。两者目前都还在 `Plugin` 类型里。
2. **返回值决定这次更新发给谁**：不返回 → Vite 自己算 HMR 边界；返回 `[]` → 吞掉这次更新，改用 `server.ws.send()` 自己通知前端；返回模块数组 → 把更新限定在这几个模块。本插件选第一种。
3. **`ctx.modules` 是"已经被更早的插件过滤过"的结果，不是原始候选集**。这一条是实测撞出来的，见下。

实测（`npm run dev`）：

```
  [mini-hmr] update HelloCard.vue：自身模块 1 个，被 1 个模块引用（Home.vue）   ← 改 HelloCard.vue 的 <template>
  [mini-hmr] update router.js：自身模块 1 个，被 1 个模块引用（main.js）        ← 改普通 .js
  [mini-hmr] update HelloCard.vue：自身模块 0 个，被 0 个模块引用               ← 只改 SFC 块外的注释
```

前两行符合直觉：文件自己算 1 个模块，`importers` 逆查得到引用它的那个文件。第三行才是重点——差别来自 `@vitejs/plugin-vue`（插件名 `vite:vue`）：它排在 `mini-hmr` 前面，且仍走旧的 `handleHotUpdate`，会按"到底改了哪个块"收窄模块列表；只改块外注释时它认为没有块受影响，于是把列表收窄成了空。这正是 3.3 节"排序"的现实版本：**同钩子内，排在前面的人先改数据**。

> 顺带一个实操提示：`ctx.modules` 为空时，不代表插件写错了——先想想是不是有更早的插件收窄过，或者这个文件当时根本不在模块图里（没有浏览器请求过它）。

## 五、build 期插件（一）：虚拟模块与剔除

### 5.1 mini-virtual：给源码一个"磁盘上不存在"的模块

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

这两个钩子在 dev 侧同样跑：dev 下请求 `virtual:build-info` 也会走一遍 `resolveId → load → transform`，所以虚拟模块在开发时也能用。

### 5.2 mini-drop：构建期清掉不该上线的东西

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
        apply: 'build', // 只在构建期加载，dev 下不加载

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

三个要点：

- **(a) 返回空模块 `export {}`，而不是"删文件"**。让这个文件照常进依赖图，再由 tree-shaking 把整块摇掉——若改用 `generateBundle` 去删已生成的 chunk，import 它的那条边会变成孤儿。
- **(b) 只对本项目文件判断**（`SRC_RE` 限定 `src/`），`node_modules` 一律不碰。这是所有源码级插件的安全底线，正则一刀切最容易误伤依赖。
- **`apply: 'build'` 是补上的，而且必须补**。最初这个插件没写 `apply`，加了 `npm run dev` 之后它会在 dev 下也执行 `transform`，把源码里的 `console.log` 和注释行一起删掉——调试信息凭空消失，还很难查。**dev / build 门禁优先用 `apply`，而不是在钩子内部判 `command`**：不加载就不会被误触发（对照 6.1 的 `mini-html`）。

`enforce: 'pre'` 决定的是**同一个钩子内部**的先后（`pre → normal → post`），跨钩子无效（`transform` 一定晚于 `resolveId`）。要"抢在内置转换之前看源码"就用它——见 3.3。

实测（`npm run build`）：

```
  [mini-drop] 已清空 main.spec.js, mock.js
```

`main.js` 主动 `import './mock.js'` 与 `'./main.spec.js'`——它们照常进了依赖图，然后在产物里彻底消失。

> 注意**这两行只在 build 被清掉**：`mini-drop` 是 `apply: 'build'`，dev 下根本不加载，所以 `npm run dev` 时 `mock.js` 的 `console.log` 照常打印、`main.spec.js` 也照常进浏览器。后者用的是 `describe` / `it` / `expect`，浏览器里没有测试运行器，直接执行会抛 `ReferenceError`——所以它写成 `if (typeof describe === 'function') { … }` 守卫，dev 下是空操作，build 下整个文件被清空，两种模式都不出问题。

## 六、build 期插件（二）：HTML 收尾 / 压缩 / 体积门禁

这三个插件覆盖生产产物的最后三道工序，且挂在不同钩子上——**钩子的选择本身就是分工**（见 3.4）。

### 6.1 mini-html：给 HTML 收尾（modulepreload 查重 + CSP nonce）

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
3. **`ctx.bundle` 只有构建期才有**：它是"文件名 → 产物"的映射，所以能现读带 hash 的入口文件名和它的依赖 chunk。dev 阶段没有 `bundle`，要做同类事得走 `configureServer` 挂中间件（见 4.1）。

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

### 6.2 mini-terser：压缩 JS

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

### 6.3 mini-size-gate：产物体积门禁

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

## 七、代码分割与压缩

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

压缩由手写 `mini-terser` 完成（见 6.2）。因为配置里写了 `minify: false`，那 248.33 KB → 127.61 KB 的读数完全来自我们的插件，而不是内置压缩器。

## 八、三个命令与预览

配套代码有三个 Vite 命令，且**共用同一份配置**：

| 命令 | 做什么 | 产物 / 服务 |
| --- | --- | --- |
| `npm run dev` | 起 dev server，按请求即时转换 | 端口 5182 |
| `npm run build` | production 构建，写盘 | `vite-lab/dist/` |
| `npm run preview` | 先 `vite build`、再 `vite preview` 预览真实产物 | 写盘 + 端口 5181 |

三个命令共用 `vite.config.mjs`，**不需要第二份配置文件**：`build.*` 只在构建期生效，dev 自然走内置开发服务器；两个 dev 插件用 `apply: 'serve'` 自己把自己挡在 build 之外，`mini-html` / `mini-drop` 用 `apply: 'build'` 反向挡住 dev。

端口这样分配是为了和 webpack 篇错开：webpack 的 serve 占 5180，vite preview 占 5181，vite dev 占 5182，三者在同一台机器上互不冲突。

`vite preview` 是纯静态服务，它服务的就是 `build` 写盘的 `dist/`——所以"预览到的"和"要上线的"是同一批文件。

> 一句提醒：`vite preview` **不是 dev server**，没有 HMR、不做任何转换。它的定位是"上线前的最后一眼"。

对照 webpack 篇可以发现一处差异：webpack 的 preview 要挂 `webpack-dev-server`，还得关掉 `client: false` 防止它的客户端代码被 `splitChunks` 抽成 vendors 污染产物；Vite 的 preview 是纯静态服务，没有这个问题。

第十节的 `mini-vite` 是**独立项目** `code/mini-vite/`，命令不在 vite-lab 里（见那一节）。

## 九、断点调试

调试自己写的插件，不需要任何"调试插件"——断点直接打在 `plugins/*.mjs`、`vite.config.mjs` 里就行，因为它们是我们自己的源码，不在 `node_modules`。但有两个"看不见的手"会在背后换掉正在执行的代码，不处理就会看到空心灰圈。

**一、进程：断点只能暂停"由调试器启动或附加的进程"。** 在终端里敲 `npm run build`，那个 node 进程和调试器毫无关系——日志照打、断点不动。所以用 VS Code 的 `launch.json`，让调试器**直接启动 vite 的 CLI 入口**，整条构建链路跑在这一个 node 进程里。

**二、配置加载：Vite 默认会把你的配置和插件打包成临时文件再跑。** 这才是"明明连上了、断点还是灰圈"的真正原因。默认 `configLoader: 'bundle'` 下，Vite 用 Rolldown 把 `vite.config.mjs` **连同它 import 的所有本地插件**打成 `node_modules/.vite-temp/vite.config.mjs.timestamp-*.mjs`，再 `import()` 这个副本（对应 Vite 源码里的 `loadConfigFromFile → loadConfigFromBundledFile`）。于是运行期执行的是副本，磁盘上的 `plugins/*.mjs` 从头到尾没被 import 过，断点找不到对应代码；而临时文件落在 `node_modules/` 下，又会被 js-debug 默认 skip 掉。解法是在启动参数里加 `--configLoader native`：Vite 直接 `import()` 磁盘上的原文件，断点就绑在真源码上。

> 摘自 `./code/vite-lab/.vscode/launch.json`（以 `vite-lab` 为工作区根打开，F5 前先选对应的那条）

```jsonc
{
    "version": "0.2.0",
    "configurations": [
        {
            // ① 浏览器端：调 app 代码（.vue / src/*.js）。
            // 启动 npm run dev → 等终端打出 "Local: http://localhost:5182/" →
            // 自动打开 Chrome 并挂上调试器，此时在 src/ 里打断点即可命中。
            // VS Code 内置的 debug-server-ready 扩展会在匹配前剥掉 ANSI 颜色码，
            // 所以下面的 pattern 能匹配到 Vite 带色的输出。
            "type": "node",
            "request": "launch",
            "name": "① dev + Chrome（调 app 代码）",
            "runtimeExecutable": "npm",
            "runtimeArgs": ["run", "dev"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal",
            "autoAttachChildProcesses": true,
            "serverReadyAction": {
                "pattern": "Local:\\s+(https?://\\S+)",
                "uriFormat": "%s",
                "action": "debugWithChrome"
            }
        },
        {
            // ② Node 端 · dev 引擎：调 dev 插件（apply:'serve'，如 mini-mock / mini-hmr）。
            // 直连 vite.js，省掉 npm → cmd → vite.cmd 的包装（Windows 上 .bin/vite 是
            // #!/bin/sh 脚本，runtimeExecutable 指它会 ENOENT）。
            // --configLoader native 让插件按磁盘原文件执行，断点精确命中。
            "type": "node",
            "request": "launch",
            "name": "② 调试 dev 插件",
            "program": "${workspaceFolder}/node_modules/vite/bin/vite.js",
            "args": ["dev", "--port", "5182", "--configLoader", "native"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        },
        {
            // ③ Node 端 · build 引擎：调 build 插件（apply:'build'，如 mini-drop /
            // mini-terser / mini-html / mini-size-gate）。这些插件在 dev 下根本不加载，
            // 必须走 build 才断得到。
            "type": "node",
            "request": "launch",
            "name": "③ 调试 build 插件",
            "program": "${workspaceFolder}/node_modules/vite/bin/vite.js",
            "args": ["build", "--configLoader", "native"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        }
    ]
}
```

三条配置对应三种场景：**①** 断点打在浏览器里跑的 app 代码（`.vue` / `src/*.js`）；**②** 断点打在 dev 插件（`apply: 'serve'`）里；**③** 断点打在 build 插件（`apply: 'build'`）里。②③ 的 `program` 直指 `node_modules/vite/bin/vite.js`，等价于 `vite dev|build --configLoader native`，但省掉了 `npm → cmd → vite.cmd` 的包装——调试器附加的就是真正跑插件的那个进程。位置在 `vite-lab/.vscode/launch.json`，以 `vite-lab` 为工作区根打开时 F5 即可；以仓库根为工作区打开时嵌套配置不生效，根目录另放了一条等价的 build 版。

三种 `configLoader` 对调试的意义（"断点"一列是用 CDP 在 `Debugger.setBreakpointByUrl` 上直接打点实测出来的）：

| 值 | 行为 | 断点 |
| --- | --- | --- |
| `bundle`（默认） | Rolldown 把配置 + 插件打包成 `.vite-temp/` 临时文件再 import | 跑的是副本，**绑不上**（实测 0 解析、0 命中） |
| `runner` | 同进程内 module runner 按原文件执行，支持 TS | 能命中，但**行号映射粗**：build 里请求第 19 行解析到第 23 行；dev 里 26–29 行全塌到第 30 行 |
| `native` | Node 原生 `import()` 原文件，最快 | **精确命中**（请求第 19 行就解析到第 19 行）；但仅纯 ESM、不支持 TS |

后两者在 Vite 8 仍标 experimental。本 lab 配置是纯 `.mjs`，两者都能跑，但只有 `native` 的行号是准的——**调试要的就是"停在我写的那一行"，所以选 `native`**；若将来配置改成 `.ts`，只能退回 `runner`（代价是断点行号会偏移）。生产脚本 `npm run build` 不加这个参数——它是调试期的开关，不该进生产命令。

> 一个 `native` 的细节：它用 `import(url + '?fresh-import-…')` 强制每次加载新配置，所以调试器里看到的脚本 URL 会带一串 query。VS Code 的 js-debug 把 URL 转回文件路径时会丢掉 query（路径与 query 分开解析），断点仍按路径匹配，不影响使用。

四条注意：

- 断点打在 `transform` 里，能看到 `code` 与 `id`。排查"我的插件为什么没生效"就下在这：看 `id` 是否符合预期、`enforce` 是否让你排在了别人后面。
- 断点打在 `renderChunk` 里能看到压缩前后的 `code`；打在 `generateBundle` 里能看到 `bundle` 的最终形态。
- **dev 插件用配置②、build 插件用配置③，别选错**：`apply: 'serve'` 的插件（mini-mock / mini-hmr）在 build 下根本不加载，`apply: 'build'` 的（mini-drop / mini-terser / mini-html / mini-size-gate）在 dev 下也不加载——选错配置，断点自然不命中。dev 是常驻进程，不会自己退出，断完手动停。
- **断点是空心灰圈就是没绑定**，两种原因：一是调试器没连上、或连错了进程（终端里敲命令、F5 跑成了别的配置都会这样）；二是连上了、但跑的是 `configLoader: 'bundle'` 打包出来的副本——加 `--configLoader native` 即可。以仓库根为工作区打开时，嵌套的 `.vscode/launch.json` 不生效，需把这段配置合并进根配置（根目录已放了一条 `--configLoader native` 的 build 版）。

## 十、mini-vite：双引擎（dev 不打包 / build 才打包）

前面的原理是"纸上结论"，`mini-vite` 把它变成能跑的代码。它是**独立项目**（`code/mini-vite/`，与 vite-lab 平级；只有一个 devDependency `acorn`，用来解析 import/export），`npm run mini` 一次跑完 dev + build 两段，不需要浏览器、也不需要真实项目。

它复刻的不是"另一个打包器"，而是**同一套插件容器如何跨两个引擎**：

- **dev 引擎**：按 URL 按需转换，import 原样保留，浏览器原生 ESM 自己加载；
- **build 引擎**：从入口全量建图，拓扑排序后拼成一个文件。

两段跑的是**同一份插件表**——插件只声明"我在哪个钩子上做什么"，至于这个钩子是在 dev 还是 build 触发，由引擎决定。这正是 §三 两张速查表里「生效端」那一列的代码版。

**读法（由内向外）**：先看 `lib/hook.mjs`（钩子怎么被调用）与 `lib/plugin-container.mjs`（插件怎么被过滤、排序、注册）——这两份把插件机制讲完；再看 `lib/server.mjs` / `lib/build.mjs` 两个引擎，它们只是"在什么时机调用容器"。文件按职责拆开，一个文件一件事，与 `mini-webpack` 的 `lib/` 粒度对齐：

| 文件 | 承担的概念 | 对应真实 Vite |
| --- | --- | --- |
| `index.mjs` | 入口：跑一遍 dev、跑一遍 build，最后打印钩子调用对照表 | — |
| `lib/hook.mjs` | 极简 tapable：`call` / `first` / `pipe` / `collect` 四种调用约定 | `getSortedPluginHooks` |
| `lib/plugin-container.mjs` | 插件容器：`config` → `apply` 过滤 → `enforce`/`order` 排序 → 钩子注册 → 分发 | `pluginContainer.ts` |
| `lib/resolve.mjs` | 说明符 → id（相对 / 裸导入 / 虚拟模块），id ↔ URL 互转 | `vite:resolve` |
| `lib/module-graph.mjs` | 模块图：节点 + `imports` / `importers` + 拓扑排序 | `moduleGraph.ts` |
| `lib/transform.mjs` | import-analysis：acorn 解析 import → 改写说明符 + 记图 | `vite:import-analysis` |
| `lib/server.mjs` | dev 引擎：http + 中间件链 + 按需转换 | dev server 内置中间件链 |
| `lib/build.mjs` | build 引擎：全量建图 + 打包（scope hoisting 极简版） | Rollup / Rolldown |
| `lib/emit.mjs` | 产物：`generateBundle` → 写盘 → HTML → `closeBundle` | `generateBundle` / `closeBundle` |
| `plugins/` | 5 个示例插件（`mini-virtual` / `mini-banner` / `mini-report` / `mini-mock` / `mini-html`） | — |
| `src/` | 演示源码（`main.js` / `helper.js` / `deep*.js` / `lazy.js`） | — |

### 10.1 插件容器：过滤、排序、注册

`lib/plugin-container.mjs` 是插件机制真正落地的地方。它按顺序做四件事：跑 `config` / `configResolved`、按 `apply` 过滤、把每个钩子收集成有序数组、暴露分发方法。**排序只在这一处**——主键 `enforce`（跨插件）、次键 `order`（同钩子内）、末键注册顺序兜底，正是 §3.3 那张三层表：

> 摘自 `./code/mini-vite/lib/plugin-container.mjs`（运行：`npm run mini`）

```js
    // ---- 3. apply 过滤 ----
    const activePlugins = rawPlugins.filter(p => applyMatches(p, command, mode))

    // ---- 4. 每个钩子收集成一个有序 Hook ----
    //    排序：主键 enforce（跨插件），次键 order（同一钩子内），末键注册顺序（稳定）
    const hooks = {}
    for (const name of RUN_HOOKS) {
        const entries = []
        activePlugins.forEach((plugin, index) => {
            const entry = hookEntry(plugin, name)
            if (!entry) return
            entries.push({
                plugin,
                fn: entry.fn,
                tier: TIER[plugin.enforce] ?? TIER.normal,
                order: TIER[entry.order] ?? TIER.normal,
                index
            })
        })
        entries.sort((a, b) => a.tier - b.tier || a.order - b.order || a.index - b.index)

        const hook = new Hook()
        for (const e of entries) {
            const ctx = context(e.plugin)
            hook.tap(e.plugin.name, (...args) => e.fn.apply(ctx, args))
        }
        hooks[name] = hook
    }
```

`apply` 过滤把 `apply: 'serve'` 的插件从 build 的插件表里剔除、`apply: 'build'` 的从 dev 里剔除——所以 §4.2 的 `mini-hmr` 那类插件在 build 时根本不加载，断点自然打不中。

### 10.2 钩子的四种调用约定

容器把钩子按语义分成四类，`lib/hook.mjs` 各给一个方法——这就是"钩子怎么被调用"的全部：

> 摘自 `./code/mini-vite/lib/hook.mjs`（运行：`npm run mini`）

```js
export class Hook {
    constructor() {
        this.taps = []
    }

    /** 注册一个 handler；name 只用于报错定位，真实 tapable 用它做去重 */
    tap(name, fn) {
        this.taps.push({ name, fn })
    }

    async call(...args) {
        for (const t of this.taps) await t.fn(...args)
    }

    async first(...args) {
        for (const t of this.taps) {
            const result = await t.fn(...args)
            if (result != null) return result
        }
        return null
    }

    async pipe(seed, ...rest) {
        let current = seed
        for (const t of this.taps) {
            const result = await t.fn(current, ...rest)
            if (result != null) current = result
        }
        return current
    }

    async collect(...args) {
        const out = []
        for (const t of this.taps) {
            const result = await t.fn(...args)
            if (result != null) out.push(result)
        }
        return out
    }
}
```

| 约定 | 行为 | 用在哪些钩子 |
| --- | --- | --- |
| `call` | 依次 `await`，忽略返回值 | `buildStart` / `buildEnd` / `closeBundle` / `generateBundle` |
| `first` | 依次 `await`，第一个非空结果即返回 | `resolveId` / `load` |
| `pipe` | 上一个的返回值喂给下一个 | `transform` / `renderChunk` / `transformIndexHtml` |
| `collect` | 收齐所有非空返回值 | `configureServer`（收各插件返回的 post hook） |

容器暴露的分发方法只是"挑一种约定去调"——`resolveId` / `load` 用 `first`（第一个认领的插件赢）、`transform` 用 `pipe`（代码依次流经所有插件）：

> 摘自 `./code/mini-vite/lib/plugin-container.mjs`（运行：`npm run mini`）

```js
        /** 解析说明符：第一个返回结果的插件赢 */
        async resolveId(source, importer) {
            count('resolveId')
            const result = await hooks.resolveId.first(source, importer)
            if (result == null) return null
            return typeof result === 'string' ? result : result.id
        },

        /** 加载模块内容：第一个返回代码的插件赢 */
        async load(id) {
            count('load')
            const result = await hooks.load.first(id)
            if (result == null) return null
            return typeof result === 'string' ? result : result.code
        },

        /** 转换：code 依次流经所有插件 */
        async transform(code, id) {
            count('transform')
            return hooks.transform.pipe(code, id)
        },
```

### 10.3 dev 引擎：改写说明符 + 记图

`lib/transform.mjs` 把源码里的静态说明符交给容器的 `resolveId` 解析，并在 **dev 侧**改写成浏览器能请求的 URL（build 侧不改——打包时整条 import 会被删掉），顺手把依赖关系写进模块图：

> 摘自 `./code/mini-vite/lib/transform.mjs`（运行：`npm run mini`）

```js
export function createImportAnalysisPlugin({ command, root, resolve, moduleGraph }) {
    return {
        name: 'mini:import-analysis',
        // 排在用户 transform 之后：用户插件看到的是原始源码
        enforce: 'post',

        async transform(code, id) {
            if (!/\.[cm]?js$/.test(id)) return null

            const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
            const deps = []
            const edits = []

            for (const node of ast.body) {
                const source = node.source // import ... from 'x' / export ... from 'x'
                if (!source) continue
                const resolved = await resolve(source.value, id)
                if (!resolved) continue
                deps.push(resolved)
                if (command === 'serve') {
                    edits.push({ start: source.start, end: source.end, text: JSON.stringify(toUrl(resolved, root)) })
                }
            }

            moduleGraph.setImports(id, deps)
            if (!edits.length) return null

            // 从后往前替换，避免前面的改写让后面的位置错位
            let out = code
            for (const e of edits.sort((a, b) => b.start - a.start)) {
                out = out.slice(0, e.start) + e.text + out.slice(e.end)
            }
            return out
        }
    }
}
```

"按需"体现在 `lib/server.mjs` 的 `serveModule`：**只有被请求到的模块才会走 `load → transform`**，浏览器没请求的 `lazy.js` 一次都不会被碰：

> 摘自 `./code/mini-vite/lib/server.mjs`（运行：`npm run mini`）

```js
    async function serveModule(url, res) {
        const id = fromUrl(url, root)
        const code = await container.load(id)
        if (code == null) {
            res.statusCode = 404
            return res.end(`// 没有插件提供 ${id}`)
        }
        const transformed = await container.transform(code, id)
        moduleGraph.markTransformed(id)
        const deps = moduleGraph.get(id)?.imports ?? []
        log(`GET ${url}  →  转换（依赖 ${deps.length} 个）`)
        res.setHeader('Content-Type', 'application/javascript')
        res.end(transformed)
    }
```

### 10.4 build 引擎：全量建图 + 拼成一个文件

build 引擎从入口出发把**整张图**走一遍（这就是与 dev 的差别），再按拓扑序把各模块摊平进一个作用域——删掉 import 语句、去掉 export 关键字，即"scope hoisting 极简版"：

> 摘自 `./code/mini-vite/lib/build.mjs`（运行：`npm run mini`）

```js
function flatten(code, id) {
    const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
    const cuts = []

    for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
            cuts.push({ start: node.start, end: node.end })
        } else if (node.type === 'ExportNamedDeclaration') {
            // export const x = … / export function f() …  → 只删 'export ' 关键字
            // export { a, b }                          → 整条删掉（a / b 已在同一作用域里）
            if (node.declaration) cuts.push({ start: node.start, end: node.declaration.start })
            else cuts.push({ start: node.start, end: node.end })
        } else if (node.type === 'ExportDefaultDeclaration' || node.type === 'ExportAllDeclaration') {
            throw new Error(`${label(id, process.cwd())}: mini 的 linker 只支持具名导出`)
        }
    }

    let out = code
    for (const c of cuts.sort((a, b) => b.start - a.start)) out = out.slice(0, c.start) + out.slice(c.end)
    return out.trim()
}
// …
    // 全量建图：与 dev 的区别就在这里——dev 只处理被请求到的模块，这里处理整张图
    async function visit(id) {
        if (visited.has(id)) return
        visited.add(id)
        const code = await container.load(id)
        if (code == null) throw new Error(`无法加载 ${id}`)
        codeById.set(id, await container.transform(code, id))
        moduleGraph.markTransformed(id)
        for (const dep of moduleGraph.get(id)?.imports ?? []) await visit(dep)
    }
    await visit(entry)

    // 拓扑排序：依赖在前、入口在后
    const order = moduleGraph.topoSort([entry])
    const parts = order.map(id => `// ---- ${label(id, root)} ----\n${flatten(codeById.get(id), id)}`)
    let code = parts.join('\n\n') + '\n'

    const chunk = { type: 'chunk', fileName: 'assets/index.js', isEntry: true, modules: order }
    code = await container.renderChunk(code, chunk, { format: 'es' })

    await container.buildEnd()
    return { code, chunk, entry, order }
}
```

真实 Rollup / Rolldown 还会做重命名、作用域分析与 tree-shaking，这里只保留最小闭环——够说明"打包 = 建图 + 拓扑 + 拼接"。

### 10.5 一次运行的读数

`npm run mini` 一次跑完三段：build 建图打包、dev 按需转换、钩子调用对照。实测输出（节选）：

```
=== build 引擎：一次走完整张模块图，拼成一个文件 ===
  [mini-banner] renderChunk：给产物加 banner
  [mini-report] generateBundle：输出目录 …/mini-vite/dist
    - assets/index.js  606 B
  参与打包的模块 6 个：src/deep2.js → src/deep.js → src/helper.js → /@deps/tiny-lib.js → \0virtual:build-info → src/main.js
  执行产物（node dist/assets/index.js）：
    hi, mini-vite! (deep:deep2)
    hello from tiny-lib
    mode = production

=== dev 引擎：按 URL 按需转换，import 原样保留 ===
  [mini-mock] configureServer：注册 /api/* 中间件
  [dev] GET /src/main.js  →  转换（依赖 3 个）
  [dev] GET /src/helper.js  →  转换（依赖 1 个）
  main.js 里的说明符已被改写：
    ✓ /src/helper.js   ✓ /@deps/tiny-lib.js   ✓ /@id/__x00__virtual:build-info
  GET /api/user  →  {"name":"mini-vite","from":"mini-mock"}
  GET /  →  HTML 已被 mini-html 处理
  deep.js 被转换过吗：否 —— 浏览器还没请求到它
  lazy.js 进入模块图了吗：否 —— 它不在依赖图里
```

最后一段是钩子调用对照（**一次实测样本**，数字受请求顺序影响）：

```
  钩子                dev   build
  config              1     1
  configResolved      1     1
  buildStart          1     1
  resolveId           4     5
  load                4     6
  transform           4     6
  renderChunk         0     1       ← build 专属
  generateBundle      0     1       ← build 专属
  closeBundle         0     1       ← build 专属
  configureServer     1     0       ← dev 专属
  transformIndexHtml  1     1
  buildEnd            1     1
```

这张表同时落地三件事：

- **通用钩子两端都跑、但次数不同**：`transform` 在 dev 触发 4 次（只处理被请求到的模块），build 触发 6 次（整张图 6 个模块）——正是 §一 讲的"dev 处理被请求到的模块，build 处理整个依赖图"；
- **build 专属钩子在 dev 为 0**：`renderChunk` / `generateBundle` / `closeBundle`；
- **dev 专属钩子在 build 为 0**：`configureServer`。

对照真实 Vite，这个最小实现已经"骨架齐全"：插件容器（过滤 / 排序 / 注册 / 分发）、四种调用约定、两套引擎共用一份插件表、虚拟模块、模块图与拓扑排序。Vite 真身叠加的，是内置插件链（`vite:resolve` / `vite:import-analysis` / `vite:transform` …）、HMR 的 accept 边界、依赖预构建的缓存、以及 Rolldown 生产引擎——**机制没变，只是把每一步做重、做对、做成可插拔**。

## 配套代码

本篇示例来自 `code/vite-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/vite-lab/package.json` | 三个命令：`dev` / `build` / `preview`；依赖 `vue` / `vue-router` / `@vitejs/plugin-vue` | 八 |
| `./code/vite-lab/vite.config.mjs` | **唯一配置**：`vue()` 插件 / 入口 / 输出 hash / 七个手写插件 / manualChunks / 压缩 | 二、三、七 |
| `./code/vite-lab/index.html` | 入口（Vite 的 entry 写在 HTML 里，挂载点 `#app`） | 二 |
| `./code/vite-lab/src/main.js` | 入口：`createApp(App).use(router).mount('#app')` / 环境变量 / 虚拟模块 / 引 mock 与 spec | 一、二、五、七 |
| `./code/vite-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件（含 `<style scoped>`） | 二、四、七 |
| `./code/vite-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 四、七 |
| `./code/vite-lab/src/style.css`、`base.css`、`helper.js` | 样式（`@import`）与工具函数样本 | 一、七 |
| `./code/vite-lab/src/mock.js`、`src/main.spec.js` | 不该上线的样本（被 mini-drop 清空） | 五 |
| `./code/vite-lab/.env`、`.env.production` | 环境变量（`VITE_APP_NAME`） | 一 |
| `./code/vite-lab/plugins/mini-mock.mjs` | 手写 dev 期 mock（`configureServer`） | 三、四 |
| `./code/vite-lab/plugins/mini-hmr.mjs` | 手写 HMR 观测（`hotUpdate`） | 三、四 |
| `./code/vite-lab/plugins/mini-virtual.mjs` | 手写虚拟模块插件（`resolveId` + `load`） | 三、五 |
| `./code/vite-lab/plugins/mini-drop.mjs` | 手写剔除插件（`transform` + `apply: 'build'`） | 三、五 |
| `./code/vite-lab/plugins/mini-html.mjs` | 手写 HTML 收尾（modulepreload 查重 + CSP nonce） | 三、六 |
| `./code/vite-lab/plugins/mini-terser.mjs` | 手写压缩插件（`renderChunk`） | 三、六 |
| `./code/vite-lab/plugins/mini-size-gate.mjs` | 手写体积门禁 + manifest（`generateBundle`） | 三、六 |
| `./code/vite-lab/.vscode/launch.json` | VS Code 调试配置（三条：① 浏览器端 app ② dev 插件 ③ build 插件，Node 端 `program` 直指 `vite.js` + `--configLoader native`） | 九 |
| `./code/mini-vite/index.mjs` | 双引擎入口：跑一遍 dev、跑一遍 build，打印钩子调用对照表 | 十 |
| `./code/mini-vite/lib/hook.mjs` | 极简 tapable：`call` / `first` / `pipe` / `collect` 四种调用约定 | 十 |
| `./code/mini-vite/lib/plugin-container.mjs` | 插件容器：`config` → `apply` 过滤 → `enforce`/`order` 排序 → 钩子注册 → 分发 | 十 |
| `./code/mini-vite/lib/resolve.mjs` | 说明符 → id（相对 / 裸导入 / 虚拟模块），id ↔ URL 互转 | 十 |
| `./code/mini-vite/lib/module-graph.mjs` | 模块图：`imports` / `importers` + 拓扑排序 | 十 |
| `./code/mini-vite/lib/transform.mjs` | import-analysis：acorn 解析 import → 改写说明符 + 记图 | 十 |
| `./code/mini-vite/lib/server.mjs` | dev 引擎：http + 中间件链 + 按需转换 | 十 |
| `./code/mini-vite/lib/build.mjs` | build 引擎：全量建图 + 打包（scope hoisting 极简版） | 十 |
| `./code/mini-vite/lib/emit.mjs` | 产物：`generateBundle` → 写盘 → HTML → `closeBundle` | 十 |
| `./code/mini-vite/plugins/mini-virtual.mjs`、`mini-banner.mjs`、`mini-report.mjs`、`mini-mock.mjs`、`mini-html.mjs` | 5 个示例插件，各挂一个（或一组）钩子 | 十 |
| `./code/mini-vite/src/` | 演示源码（main / helper / deep / deep2 / lazy） | 十 |

运行：`cd code/vite-lab && npm install`，然后 `npm run dev`（开发，5182）、`npm run build`（构建）、`npm run preview`（构建 + 预览，5181）。

第十节的 `mini-vite` 是**独立项目**（只有一个 devDependency `acorn`，首次运行前先 `npm install`）：`cd code/mini-vite && npm run mini`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[webpack](./webpack.md)
- 下一篇：[Rollup](./Rollup.md)
- [Vite 官方文档](https://vite.dev/)
- [Vite 插件 API](https://vite.dev/guide/api-plugin.html)