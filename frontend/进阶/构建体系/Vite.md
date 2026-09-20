# Vite

Vite 的核心主张只有一句：**开发态不打包**。这一个决定带来了冷启动、热更新两个数量级的体验提升，也带来了它最容易被误解的地方——开发和生产是两套引擎。本篇用实测把双引擎的差异讲清楚：dev 到底少做了什么、依赖预构建解决了什么问题、环境变量是怎么消失的、静态资源什么时候内联、插件该挂在哪一侧、以及一个生产里真会写的插件长什么样。

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
- **`exclude` 是反方向的开关**：不该被预构建的要剔出去。最常见的是 **monorepo 里的本地 workspace 包**——它被预构建成 `node_modules/.vite` 下的一个文件后，你在源码里改它不会触发更新，必须 exclude 掉才能走正常的热更新链路。
- **`esbuildOptions` 直接透传给预构建用的 esbuild**（如 `target`、`plugins`）。想让预构建产物也降级到某个语法档位，就写在这里而不是 `build.target`——两者作用的对象不同。
- **预构建缓存**落在最近的 `node_modules/.vite` 下，能否复用取决于"依赖版本 + 相关配置"算出的元信息：改了依赖版本、改了 `optimizeDeps`、改了 Vite 配置，都可能触发重新预构建。出现"改了依赖没生效"时，删掉它或用 `--force` 是最快的排查手段。
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

## 四、静态资源与产物形态：三个会影响体积的决策

资源怎么处理、模块怎么分批、语法降到哪一年，这三个决策都只发生在 build 侧。样本里两个大小悬殊的 svg、三个同构的特性模块，加上 `??` 与 `?.` 两个语法观察点：

> 摘自 `./code/build-lab/vite-lab/assets.cjs`（运行：`npm run vite:assets`）

```js
// glob 默认懒加载：每个匹配到的模块单独出一个 chunk
fs.writeFileSync(
    path.join(DIR, 'main.js'),
    [
        "import small from './small.svg'",
        "import big from './big.svg'",
        '',
        '// 一次导入一个目录：构建期展开成 N 条 import，不用手写也不用维护清单',
        "const modules = import.meta.glob('./features/*.js')",
        '',
        '// 语法降级观察点：?? 与 ?. 在 es2015 下会被改写',
        'export const title = window.__TITLE__ ?? "default"',
        'export const names = Object.keys(modules).sort()',
        '',
        'console.log(small, big, title, names?.length)'
    ].join('\n') + '\n'
)
```

只改构建配置，跑出三组对照：

```
---- ① assetsInlineLimit 决定"内联还是发文件" ----
  4096（默认）：small.svg(0.6KB) 内联=true · big.svg(10.8KB) 独立文件=true
  512（收紧） ：small.svg 内联=false · big.svg 独立文件=true

---- ② build.target 决定降级到哪一档语法 ----
  target=esnext：产物里还有 "??"  = true · 还有 "?." = true
  target=es2015：产物里还有 "??"  = false · 还有 "?." = false
  主 chunk 体积：esnext 4863 字符 · es2015 5135 字符

---- ③ import.meta.glob：懒加载 vs eager ----
  默认（懒加载）：chunk 数 4（入口 1 + 每个特性 1）
  eager: true   ：chunk 数 1（全部并进主 chunk）

---- 结论 ----
  assetsInlineLimit 是字节阈值：小图标内联省请求，大图必须独立文件才能被缓存
  build.target 只管语法降级，不管 API polyfill：Object.fromEntries 这类还得自己补
  glob 默认懒加载（每个模块一个 chunk），eager 会合并——选哪个取决于"这些模块是不是首屏就要"
```

三个决策各自的判断标准：

| 决策 | 配置 | 怎么选 | 踩过的坑 |
| --- | --- | --- | --- |
| 内联还是发文件 | `build.assetsInlineLimit`（字节，默认 4096） | 小图标内联省一个请求；大图必须独立文件，否则它没法被浏览器单独缓存，还会撑大 JS | 内联进 JS 的图片**不会**进 HTTP 缓存，JS 一变它就要重下 |
| 语法降不降级 | `build.target`（默认 `'baseline-widely-available'`） | 看真实用户的最低版本；不要为了"兼容性保险"无脑降到 es2015 | `target` 只管语法，**不管 API**：`Object.fromEntries`、`Array.at` 这类还得靠 polyfill |
| 批量导入怎么分批 | `import.meta.glob(pattern, { eager })` | 首屏就要的用 `eager: true` 合并；可延迟的用默认懒加载 | 懒加载会把每个模块切成独立 chunk，模块多时会变成一堆小文件 |

`import.meta.glob` 是 Vite 独有的能力（webpack 要靠 `require.context`）：构建期把匹配到的文件展开成真实的 import 列表，所以它是**静态可分析**的——这也是它能被摇树、能被切成 chunk 的原因。

## 五、配置全览

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
| 仅 dev | `server.*`（含 `proxy`）/ `optimizeDeps.*` / `hmr` | 只有 dev server |
| 仅 build | `build.*`（含 `rollupOptions` / `outDir` / `minify` / `assetsInlineLimit` / `target`） | 只有 `vite build` |
| SSR | `ssr.*`（`noExternal` / `external` / `target`） | 只有 `vite build --ssr` |

三个容易想错的地方：

- **`server.proxy` 只在 dev 生效**。它是 dev server 的中间件，生产环境没有 Vite，代理要在 nginx / 网关层做。把"本地能调通"当成"上线也能调通"是跨域问题最常见的由来。
- **`assetsInlineLimit` 属于 build**，dev 下不存在内联一说（资源都是按 URL 直接请求）。
- **`ssr.external` 与 `build.rollupOptions.external` 是两件事**：前者决定 SSR 产物里依赖是"留在 require 里"还是"打进产物"，后者决定浏览器产物。

一个踩过的坑（实测）：**Rolldown 下 `manualChunks` 只接受函数形式**。写成对象形式 `manualChunks: { vendor: ['magic-string'] }` 会直接报 `Invalid type: Expected Function but received Object`。迁移老配置时要逐个验证——这也是 8.x 迁移清单里最常撞到的一条。

## 六、插件：顺序、两侧、与一个真实场景

Vite 插件是"Rollup 插件 + Vite 专属钩子"的超集。写插件时有三件事必须先想清楚：**顺序**（`enforce`）、**生效范围**（`apply`）、**属于哪一侧**（dev 还是 build）。

### 六·一、顺序由 enforce 决定

> 摘自 `./code/build-lab/vite-lab/plugins.cjs`（运行：`npm run vite:plugins`）

```js
// 按模块分组记录：同一个模块上，三个插件的 transform 谁先谁后
const orders = new Map()
function marker(name, enforce) {
    return {
        name: `marker-${name}`,
        enforce,
        transform(code, id) {
            if (!id.includes('main.js')) return null
            const arr = orders.get(id) || []
            arr.push(name)
            orders.set(id, arr)
            return null
        }
    }
}
```

实测（三个插件在配置里故意写成 post、normal、pre 的乱序）：

```
---- ① enforce 决定同一钩子的执行顺序 ----
  main.js 上三个插件的先后： pre → normal → post
```

`enforce` 只排**同一个钩子内部**的顺序，跨钩子无效（`transform` 一定晚于 `resolveId`）。典型用法：要"抢在 Vite 内置转换之前处理源码"用 `enforce: 'pre'`（如 TS 语法剥离），要"看到最终产物 HTML"用 `order: 'post'`。

### 六·二、真实场景插件：产物 HTML 收尾

下面这个插件干三件生产里真会干的事：给首屏依赖补 `modulepreload`、给脚本加 CSP nonce、并且只在构建期加载。

> 摘自 `./code/build-lab/vite-lab/plugins.cjs`（运行：`npm run vite:plugins`）

```js
function htmlGuard({ nonce = 'lab-nonce', skipExisting = false } = {}) {
    return {
        name: 'html-guard',
        apply: 'build', // 只在 vite build 时生效，dev 完全不加载
        transformIndexHtml: {
            order: 'post', // 排在其它 HTML 变换之后，保证看到的是最终产物
            handler(html, ctx) {
                const entry = Object.values(ctx.bundle).find((o) => o.type === 'chunk' && o.isEntry)
                // Vite 默认已经注入过 modulepreload，不查重就会重复发请求
                const imports = (entry?.imports || []).filter((f) => !(skipExisting && html.includes(f)))
                const preloads = imports
                    .map((f) => `<link rel="modulepreload" href="/${f}" nonce="${nonce}">`)
                    .join('\n    ')
                const withNonce = html.replace(/<script /g, `<script nonce="${nonce}" `)
                return withNonce.replace('</head>', `    ${preloads}\n  </head>`)
            }
        }
    }
}
```

跑两遍，差别只在"要不要查重"：

```
---- ② 真实插件：产物 HTML 收尾 ----
  入口 chunk 的依赖 chunk： assets/vendor-Cqulm8dp.js
  不查重时 modulepreload 条数： 2 （Vite 默认 1 条 + 插件又加 1 条）
  查重后   modulepreload 条数： 1
  <script> 带 nonce： true
  最终 HTML：
    <head><title>lab</title>  <script nonce="lab-nonce" type="module" crossorigin src="/assets/index-DgctqD4a.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor-Cqulm8dp.js">
```

**"不查重会多出一条"是本段最有价值的读数**：Vite 自己已经默认注入了 `modulepreload`（`build.modulePreload`），自研插件再注入一遍就会让同一个 chunk 被请求两次。这类"我以为是补能力，实际是重复"的问题，只能靠看最终 HTML 发现。

dev 侧要干同样的事得走另一条路——`transformIndexHtml` 的 `ctx.bundle` 只在构建期存在，dev 阶段用中间件：

> 摘自 `./code/build-lab/vite-lab/plugins.cjs`（运行：`npm run vite:plugins`）

```js
function devManifest() {
    return {
        name: 'dev-manifest',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/__manifest', (_req, res) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ deps: ['vendor.js'], mode: 'serve' }))
            })
        }
    }
}
```

```
---- ③ dev 侧：apply 与中间件 ----
  GET /__manifest → 200 {"deps":["vendor.js"],"mode":"serve"}
  apply:'build' 的插件在 dev 下被调用： 否（build 时 true、dev 时未被调用）

---- 结论 ----
  enforce 只影响"同一钩子里谁先谁后"：pre → normal → post，跨钩子无效
  apply 决定插件加载与否：dev 专属逻辑写 apply:"serve"，产物处理写 apply:"build"
  transformIndexHtml 的 ctx.bundle 只有构建期才有 —— dev 阶段想做同样的事要走 configureServer
  modulepreload 解决的是"入口 JS 下载完才知道还要下依赖"的串行等待
  但 Vite 默认已经注入过了：自定义注入必须先查重，否则同一个 chunk 会被请求两次
```

### 六·三、钩子属于哪一侧

| 钩子 | 阶段 | 典型用途 |
| ---- | ---- | ---- |
| `config` / `configResolved` | 配置期 | 改配置、记录 command |
| `transform` | dev + build | 转译源码、注入代码 |
| `resolveId` / `load` | dev + build | 虚拟模块 |
| `configureServer` | 仅 dev | 加中间件、自定义 HMR |
| `handleHotUpdate` | 仅 dev | 接管热更新逻辑（过滤模块、返回空数组阻止更新） |
| `transformIndexHtml` | dev + build（但 `ctx.bundle` 仅 build） | 改 HTML |
| `generateBundle` | 仅 build | 产物处理 |

写插件时最容易犯的错是**在 dev 没生效**：因为用了只有 build 才跑的钩子（`generateBundle`），或者反过来把 dev 中间件写进了通用钩子。判断 command 的写法：

> 摘自 `./code/build-lab/vite-lab/counter-plugin.mjs`（运行：`npm run vite`）

```js
        configResolved(config) {
            command = config.command // serve | build
        },
```

## 七、HMR：为什么热更新这么快

webpack 的 HMR 需要把变更模块及其"依赖链上的父模块"重新生成 chunk；Vite 只做两件事：

1. 服务端把**变更模块**重新转换一次
2. 通过 WebSocket 告诉浏览器"这个模块变了"，浏览器重新发一个 ESM 请求

因为模块粒度就是文件粒度，**不需要重新打包**，所以更新耗时与项目规模无关。代价是：如果某个模块没有 `import.meta.hot.accept` 边界，会向上冒泡直到有边界为止，冒泡不到就整页刷新。

想接管这个过程就写 `handleHotUpdate(ctx)`：`ctx.file` 是变更文件、`ctx.modules` 是受影响的模块数组。返回**空数组**表示"这次变更不需要更新任何模块"，返回筛选后的数组可以精确控制更新范围——比如改了一个纯样式文件，只想让样式热替换而不触发组件重渲染。

## 八、什么时候不该用 Vite

诚实地说清楚边界：

| 场景 | 问题 |
| ---- | ---- |
| 需要 IE11 / 很老的 WebView | Vite 的 dev 依赖原生 ESM，老浏览器只能靠 build 产物调试，开发体验优势消失 |
| 已有大量 webpack 专有 loader | 需要逐个找替代品或改写 |
| 需要 Module Federation | webpack 生态最成熟（Vite 有插件方案但成熟度不同） |
| 库打包 | 用 `vite build --lib` 可以，但多格式产物与类型声明不如 Rollup/tsup 直接 |

库场景要特别说明：Vite 的 lib 模式一次只能输出配置里指定的格式，要出 esm + cjs 双产物通常跑两次配置，而 Rollup 一次 `output` 数组就能出五种格式（见[Rollup](./Rollup.md)篇实测）。

**与 Rollup 的分工**要说清楚：Vite 不是"Rollup 的替代品"，而是"dev server + 一套构建封装"。生产构建的能力来自 Rolldown/Rollup，所以 `build.rollupOptions` 是透传的，`manualChunks`、`external`、`output` 这些知识两边通用；反过来，`config` / `configResolved` / `configureServer` / `transformIndexHtml` / `handleHotUpdate` 是 Vite 独有，用了它们插件就不能给纯 Rollup 用——这正是 unplugin 存在的理由（见[构建插件开发](./构建插件开发.md)）。

## 小结

- Vite
  - 双引擎
    - dev：esbuild 预构建 + 单文件转换，浏览器原生 ESM 加载，不打包
    - build：8.x 起默认 Rolldown（兼容 rollupOptions），全量打包
    - 实测：dev 只转 1 个模块，build 转 3 个
  - 依赖预构建
    - 解决 CJS→ESM 与碎片合并；实测 magic-string → 单个 37.3 KB 文件
    - `include` 提前声明避免抖动；`exclude` 给本地 workspace 包留活路
    - 缓存在 `node_modules/.vite`，诡异问题先删缓存或用 `--force`
  - 环境变量
    - 编译期静态替换，实测产物里 `import.meta.env` 已消失
    - 只有 `VITE_` 前缀暴露；不能动态拼接 key
    - `define` 替换的是代码文本，必须 `JSON.stringify`
  - 静态资源与产物形态
    - `assetsInlineLimit`：0.6KB 内联 / 10.8KB 发文件；内联的图不进 HTTP 缓存
    - `build.target` 只管语法不管 API；es2015 下 `??` 与 `?.` 都被改写
    - `import.meta.glob`：默认懒加载（4 chunk），`eager` 合并（1 chunk）
  - 配置
    - 按阶段分：通用 / 仅 dev / 仅 build / SSR
    - `server.proxy` 只在 dev 生效；SSR 的 external 与浏览器产物的 external 是两件事
    - Rolldown 下 `manualChunks` 只接受函数形式
  - 插件
    - `enforce` 排同一钩子的顺序：实测 pre → normal → post
    - `apply` 决定加载与否：`'build'` / `'serve'`
    - `transformIndexHtml` 的 `ctx.bundle` 仅 build；dev 侧用 `configureServer`
    - 真实插件案例：注入 modulepreload 时必须查重，Vite 默认已注入过
  - HMR
    - 只重转变更模块 + WS 通知，与项目规模无关
    - 没有 accept 边界会向上冒泡，冒泡不到就整页刷新；`handleHotUpdate` 可接管
  - 边界
    - 老浏览器、webpack 专有 loader、MF、多格式库产物

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/vite-lab/run.cjs` | dev server 按需转换 vs build 全量的完整对比 | 一、双引擎 · 三、环境变量 |
| `./code/build-lab/vite-lab/counter-plugin.mjs` | 统计转换模块的插件（区分 serve / build） | 一、双引擎 · 六、插件 |
| `./code/build-lab/vite-lab/vite.config.mjs` | 配置全览：envPrefix / define / optimizeDeps / manualChunks | 二、预构建 · 五、配置 |
| `./code/build-lab/vite-lab/src/main.js` | `import.meta.env` 与动态 import 示例 | 一、双引擎 · 三、环境变量 |
| `./code/build-lab/vite-lab/.env` | 开发环境变量（`VITE_APP_NAME=build-lab-dev`） | 三、环境变量 |
| `./code/build-lab/vite-lab/.env.production` | 生产环境变量（`VITE_APP_NAME=build-lab-prod`） | 三、环境变量 |
| `./code/build-lab/vite-lab/assets.cjs` | 内联阈值 / `import.meta.glob` / `build.target` 三组对照 | 四、静态资源与产物形态 |
| `./code/build-lab/vite-lab/plugins.cjs` | 插件顺序（enforce/apply）+ HTML 注入 modulepreload 与 CSP nonce | 六、插件 |

运行：`cd code/build-lab && npm install`，然后 `npm run vite`、`npm run vite:assets`、`npm run vite:plugins`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Webpack 深入](./Webpack%20深入.md)
- 下一篇：[Rollup](./Rollup.md)
- [Vite 官方文档](https://vite.dev/)
- [Vite 插件 API](https://vite.dev/guide/api-plugin.html)
