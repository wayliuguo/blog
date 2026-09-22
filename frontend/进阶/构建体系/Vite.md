# Vite

Vite 的核心主张只有一句：**开发态不打包**。这一个决定带来了冷启动、热更新两个数量级的体验提升，也带来了它最容易被误解的地方——开发和生产是两套引擎。本篇用实测把双引擎的差异讲清楚：dev 到底少做了什么、依赖预构建解决了什么问题、环境变量是怎么消失的、静态资源什么时候内联、插件该挂在哪一侧、以及一个生产里真会写的插件长什么样。

> 本文基于本仓实测版本：**Vite 8.3.0**（生产打包器 **Rolldown 1.2.9**，Rust 实现的 Rollup 兼容版）。特别注意：8.x 起生产构建默认走 Rolldown，"Vite 生产走 Rollup"这个说法在 8.x 上已不准确。

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

Vite 插件的钩子是两类之和：**打包器兼容钩子**（8.x 的打包器是 Rolldown 1.2.9，它兼容 Rollup 的插件接口）+ **Vite 专属钩子**。写插件时有三件事必须先想清楚：**顺序**（`enforce`）、**生效范围**（`apply`）、**属于哪一侧**（dev 还是 build）。

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
                const entry = Object.values(ctx.bundle).find(o => o.type === 'chunk' && o.isEntry)
                // Vite 默认已经注入过 modulepreload，不查重就会重复发请求
                const imports = (entry?.imports || []).filter(f => !(skipExisting && html.includes(f)))
                const preloads = imports
                    .map(f => `<link rel="modulepreload" href="/${f}" nonce="${nonce}">`)
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
| `hotUpdate` | 仅 dev | 接管热更新逻辑（过滤模块、返回空数组阻止更新） |
| `transformIndexHtml` | dev + build（但 `ctx.bundle` 仅 build） | 改 HTML |
| `generateBundle` | 仅 build | 产物处理 |

表里最后一项值得单独提醒：**8.x 里 `handleHotUpdate` 已经不再被调用**，由 `hotUpdate` 取代。这不是"被新钩子抢了"——实测只注册老钩子、完全不注册新钩子时，它依然一次都不触发。钩子全集、调用顺序、以及"此刻能拿到什么"，见下一小节。

写插件时最容易犯的错是**在 dev 没生效**：因为用了只有 build 才跑的钩子（`generateBundle`），或者反过来把 dev 中间件写进了通用钩子。判断 command 的写法：

> 摘自 `./code/build-lab/vite-lab/counter-plugin.mjs`（运行：`npm run vite`）

```js
        configResolved(config) {
            command = config.command // serve | build
        },
```

### 六·四、钩子全景：什么时候被调用、能拿到什么

上一小节的表只回答了"属于哪一侧"。真正写插件时要回答的是更细的三个问题：**它什么时候被调用**、**回调里能拿到什么**、**我的插件插在链的哪个位置**。下面三张图是同一个探针插件在 Vite 8.3.0 上跑出来的实测结果（`npm run vite:hooks`）。

**图 1 · build 侧主干**——一次生产构建里，21 个钩子被调用的先后：

```
┌─ ① 配置期 · 全程只跑一次 ──────────────────────────────────────────┐
│ config → configResolved → options                                  │
│ config 能改配置；configResolved 里能读到 command 与最终插件链      │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ② 构建期 · 每个模块各走一遍（build 走全量） ──────────────────────┐
│ buildStart → resolveId → load → transform                          │
│ → resolveDynamicImport → moduleParsed → buildEnd                   │
│ 返回 null 表示「这个模块我不管」，交给链上的下一个插件             │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ③ 输出期 · 每个 chunk 各走一遍 ───────────────────────────────────┐
│ renderStart → banner · intro · outro · footer                      │
│ → renderChunk → augmentChunkHash                                   │
│ → generateBundle → transformIndexHtml → writeBundle                │
│ 改产物的唯一安全窗口是 generateBundle（已生成、未写盘）            │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ④ 收尾 ───────────────────────────────────────────────────────────┐
│ closeBundle                                                        │
└────────────────────────────────────────────────────────────────────┘
```

**图 2 · dev 侧主干**——一次 dev server + 请求页面里，13 个钩子被调用的先后：

```
┌─ ① 配置期 · 与 build 同一套，只是 command=serve ───────────────────┐
│ config → configResolved → options                                  │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ② 启动 · 只跑一次 ────────────────────────────────────────────────┐
│ configureServer        ← 挂中间件的唯一入口                        │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ③ 请求期 · 每个请求走一遍，且只处理被请求的模块 ──────────────────┐
│ HTML 请求： resolveId → transformIndexHtml                         │
│ 模块请求： resolveId → load → transform                            │
│ 注意顺序与 build 相反：transformIndexHtml 早于 load/transform      │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ④ 改文件时 ───────────────────────────────────────────────────────┐
│ watchChange → hotUpdate                                            │
│ hotUpdate 是 8.x 的钩子；老的 handleHotUpdate 注册了也不会被调用   │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ ⑤ 收尾 ───────────────────────────────────────────────────────────┐
│ buildEnd → closeBundle     （关服务时触发）                        │
└────────────────────────────────────────────────────────────────────┘
```

两张图放一起看，有四个与直觉相反的点：

1. **dev 也有 `buildStart` / `buildEnd` / `options`**。Vite 6 起 dev 也走打包器管线（Environment API），"dev 只是个裸 ESM 服务、没有插件管线"的直觉已经不成立。
2. **`transformIndexHtml` 在两侧位置不同**：build 在 `generateBundle` 之后（先有全部产物，再生成 HTML），dev 在 `load` 之前。同一个钩子，build 里能看见所有 chunk，dev 里只能看见 HTML。
3. **`handleHotUpdate` 已不再触发**，由 `hotUpdate` 取代（见上一小节）。
4. **dev 只处理被请求到的模块**：同一个插件，build 侧 `transform` 把 `src/` 下 3 个源码模块（`main` / `helper` / `lazy`）全转了一遍；dev 侧请求 `/` 时 `transform` **0 次**（HTML 走的是 `transformIndexHtml`），再请求 `/src/main.js` 才转 1 次。模块图里其实已经有 `lazy.js`——`main.js` 的 `import()` 被静态分析出来了——但只要没人请求它，就不会被转译。

探针把每次请求之后的 `transform` 次数直接打了出来，这是上一条的直接证据：

```
  fetch /                  → 200  302 字节  transform 0 次
  fetch /src/main.js       → 200  4906 字节  transform 1 次
```

**图 3 · 两侧对照**：

```
┌─────────────────────────────────┬───────┬───────┬──────────────────────────────────┐
│ 钩子                            │ build │  dev  │ 差异原因                         │
├─────────────────────────────────┼───────┼───────┼──────────────────────────────────┤
│ config · configResolved         │   ✓   │   ✓   │ 配置期，两侧都跑                 │
│ options                         │   ✓   │   ✓   │ Vite 6 起 dev 也走打包器管线     │
│ buildStart · buildEnd           │   ✓   │   ✓   │ dev 的 buildEnd 在关服务时触发   │
│ resolveId · load · transform    │   ✓   │   ✓   │ dev 只处理被请求到的模块         │
│ transformIndexHtml              │   ✓   │   ✓   │ 位置不同（见图 1 / 图 2）        │
│ configureServer                 │   -   │   ✓   │ 挂中间件的唯一入口               │
│ watchChange · hotUpdate         │   -   │   ✓   │ dev 专属；老钩子已失效           │
│ moduleParsed                    │   ✓   │   -   │ 只有构建期有完整模块图           │
│ resolveDynamicImport            │   ✓   │   -   │ 构建期才需要静态化动态导入       │
│ renderStart                     │   ✓   │   -   │ 输出阶段起点                     │
│ banner · intro · outro · footer │   ✓   │   -   │ 往 chunk 头尾注入代码            │
│ renderChunk · augmentChunkHash  │   ✓   │   -   │ 改最终代码 / 影响内容哈希        │
│ generateBundle · writeBundle    │   ✓   │   -   │ 产物就绪 / 已写盘                │
│ closeBundle                     │   ✓   │   ✓   │ 两侧都有                         │
└─────────────────────────────────┴───────┴───────┴──────────────────────────────────┘
```

**表 1 · 钩子速查**。"回调参数"一列是探针真实打印出来的类型，dev 与 build 的差异都单独标了出来：

| 钩子 | 侧 | 时机 | 回调参数（实测） | 典型用途 |
| ---- | ---- | ---- | ---- | ---- |
| `config` | 两侧 | 配置解析前 | `(config, env)`，env 含 `mode/command/isSsrBuild/isPreview` | 改配置、按 command 注入插件 |
| `configResolved` | 两侧 | 配置解析后 | `(config)`，`command` 为 `serve` / `build` | 读最终配置、缓存 command |
| `options` | 两侧 | 交给打包器前 | `(inputOptions)` | 改打包器输入选项 |
| `buildStart` | 两侧 | 开始建模块 | `(inputOptions)` | 初始化、读外部数据 |
| `resolveId` | 两侧 | 每个 import | `(source, importer, opts)`，**dev 的 opts 多 `attributes`** | 虚拟模块、路径别名 |
| `load` | 两侧 | 命中模块后 | `(id, opts)` | 返回虚拟模块内容 |
| `transform` | 两侧 | 拿到源码后 | `(code, id, opts)`，**dev 的 opts 多 `inMap`** | 转译、注入代码 |
| `moduleParsed` | 仅 build | 模块解析完 | `(info)`，含 `ast/code/id/importers` | 依赖分析 |
| `resolveDynamicImport` | 仅 build | 遇到 `import()` | `(specifier, importer)` | 静态化动态导入 |
| `buildEnd` | 两侧 | 模块都建完 | 无参 | 汇总报错 |
| `renderStart` | 仅 build | 开始出产物 | `(outputOptions, inputOptions)` | 记录输出目标 |
| `banner` / `intro` / `outro` / `footer` | 仅 build | 每个 chunk | `(chunk)` | 注入版权头、包装代码 |
| `renderChunk` | 仅 build | chunk 代码已生成 | `(code, chunk, options, meta)` | 改最终代码 |
| `augmentChunkHash` | 仅 build | 算哈希之前 | `(chunk)` | 让哈希反映非代码因素 |
| `generateBundle` | 仅 build | 产物就绪、未写盘 | `(outputOptions, bundle, isWrite)`，bundle 是 `{文件名: 产物}` | 增删改产物 |
| `writeBundle` | 仅 build | 已经写盘 | `(outputOptions, bundle)` | 报告、校验 |
| `transformIndexHtml` | 两侧 | HTML 处理 | build：`ctx` 有 `bundle/chunk`；dev：`ctx` 有 `server/originalUrl` | 改 HTML |
| `configureServer` | 仅 dev | 服务启动时 | `(server)`，含 `middlewares/watcher/ws` | 挂中间件 |
| `watchChange` | 仅 dev | 文件变更 | `(id, { event })` | 记录变更 |
| `hotUpdate` | 仅 dev | 热更新前 | `(ctx)`，含 `type/file/timestamp/read/server/modules`；`ctx.server.moduleGraph` 可查/失效模块 | 接管热更新 |
| `closeBundle` | 两侧 | 收尾 | 无参 | 清理资源 |

**表 2 · 谁在这些钩子上干活**。Vite 的内置插件本身就是最好的钩子教材——把解析出的插件链按阶段归类（实测 25 个插件用到了本轮考察的钩子）：

| 阶段 | 在这一步出手的内置插件（实测） |
| ---- | ---- |
| 解析路径 | `vite:pre-alias`、`vite:resolve-dev`、`vite:optimized-deps`、`vite:html-inline-proxy`、`vite:modulepreload-polyfill` |
| 加载内容 | `vite:asset`、`vite:css`、`builtin:vite-json`、`builtin:oxc-runtime`、`vite:worker` |
| 转换代码 | `vite:oxc`、`vite:define`、`vite:css`、`vite:import-analysis`、`vite:dynamic-import-vars`、`vite:import-glob`、`vite:client-inject`、`vite:worker-import-meta-url`、`vite:asset-import-meta-url`、`vite:css-analysis` |
| 产出产物 | `vite:css-post`、`vite:build-html` |
| 变更响应 | `vite:watch-package-data`、`vite:import-glob` |

表 2 里没有出现 `vite:resolve-builtin`——它是 Environment API 的壳插件，自身只暴露 `name` 和 `applyToEnvironment` 两个属性，解析动作实际由 `vite:resolve-dev` 承担。用 `Object.keys(plugin)` 扫内置插件时，这类"把钩子挂在别处"的写法会被整条漏掉，统计内置插件能力时要知道有这回事。

另外，探针把 27 个待测钩子全注册了一遍，实测有 3 个全程没被调用：`handleHotUpdate`（被 `hotUpdate` 取代）、`configurePreviewServer`（只在 `vite preview` 下触发）、`renderDynamicImport`（本次 Rolldown 管线没有调它）。**注册了不等于会被调用**，所以别照着文档的钩子清单抄，以自己跑出来的这份表为准。

最后回到本节开头那个"顺序"问题，实测答案是：**`enforce` 不等于"排到最前 / 最后"**。把 `enforce: 'pre'` 和 `'post'` 的插件插进去，`resolveConfig` 解析出的 29 个插件（build 时还会追加几个内部插件，实测 38 个）里，它们落在：

```
  0  (normal) vite:optimized-deps
  2  (normal) vite:pre-alias
  3  (normal) alias
  4  pre      aa-probe-pre        ← enforce: 'pre' 的用户插件
  5  (normal) vite:modulepreload-polyfill
  …
 24  (normal) vite:import-glob
 25  post     zz-probe-post       ← enforce: 'post' 的用户插件
 26  (normal) vite:client-inject
 28  (normal) vite:import-analysis
```

`pre` 排在"解析类内置插件"之后，`post` 之后还压着三个内置插件。所以 `enforce` 决定的是**用户插件彼此之间**的先后、以及你落在内置链的哪一段，而不是绝对的第一个或最后一个。

探针本身很简单——把待测钩子全注册一遍，回调里记录参数类型，需要返回值的钩子统一返回 `null` 表示"不处理"：

> 摘自 `./code/build-lab/vite-lab/hooks-probe.mjs`（运行：`npm run vite:hooks`）

```js
// 记录一次调用；state 里放「此刻能拿到什么」
function makeProbe(tag, enforce, records, state) {
    const plugin = { name: `probe-${tag}` }
    if (enforce) plugin.enforce = enforce
    // --legacy-hmr：只注册老的 handleHotUpdate，不注册 hotUpdate，用来验证前者是否还生效
    const hooks = process.argv.includes('--legacy-hmr') ? HOOKS.filter(h => h !== 'hotUpdate') : HOOKS
    for (const hook of hooks) {
        plugin[hook] = (...args) => {
            records.push({
                seq: records.length + 1,
                tag,
                hook,
                args: args.map(typeOf),
                command: state.command,
                env: state.environment,
                hasBundle: !!state.hasBundle,
                note: state.note
            })
            if (hook === 'transformIndexHtml') return args[0]
            if (hook === 'config') return undefined
            if (RETURN_NULL.has(hook)) return null
            return undefined
        }
    }
    return plugin
}
```

## 七、HMR：为什么热更新这么快

webpack 的 HMR 需要把变更模块及其"依赖链上的父模块"重新生成 chunk；Vite 只做两件事：

1. 服务端把**变更模块**重新转换一次
2. 通过 WebSocket 告诉浏览器"这个模块变了"，浏览器重新发一个 ESM 请求

因为模块粒度就是文件粒度，**不需要重新打包**，所以更新耗时与项目规模无关。代价是：如果某个模块没有 `import.meta.hot.accept` 边界，会向上冒泡直到有边界为止，冒泡不到就整页刷新。

想接管这个过程就写 `hotUpdate(ctx)`。实测 `ctx` 有六个字段：`type`（`create` / `update` / `delete`）、`file`、`timestamp`、`read()`（读新内容）、`server`、`modules`（受影响的模块数组）。返回**空数组**表示"这次变更不需要更新任何模块"，返回筛选后的数组可以精确控制更新范围——比如改了一个纯样式文件，只想让样式热替换而不触发组件重渲染。`ctx.server.moduleGraph`（`getModulesByFile` / `invalidateModule`）和 `ctx.server.environments`（实测有 `client` / `ssr` 两个环境）也都在手边，要按文件反查模块、或者按环境区分处理时用得上。

这个钩子在 8.x 之前叫 `handleHotUpdate`，改名后**老名字不再被调用**（实测：只注册 `handleHotUpdate` 时它一次都不触发），迁移时直接替换即可，不要两边都写。

## 八、什么时候不该用 Vite

诚实地说清楚边界：

| 场景 | 问题 |
| ---- | ---- |
| 需要 IE11 / 很老的 WebView | Vite 的 dev 依赖原生 ESM，老浏览器只能靠 build 产物调试，开发体验优势消失 |
| 已有大量 webpack 专有 loader | 需要逐个找替代品或改写 |
| 需要 Module Federation | webpack 生态最成熟（Vite 有插件方案但成熟度不同） |
| 库打包 | 用 `vite build --lib` 可以，但多格式产物与类型声明不如 Rollup/tsup 直接 |

库场景要特别说明：Vite 的 lib 模式一次只能输出配置里指定的格式，要出 esm + cjs 双产物通常跑两次配置，而 Rollup 一次 `output` 数组就能出五种格式（见[Rollup](./Rollup.md)篇实测）。

**与 Rollup 的分工**要说清楚：Vite 不是"Rollup 的替代品"，而是"dev server + 一套构建封装"。生产构建的能力来自 Rolldown/Rollup，所以 `build.rollupOptions` 是透传的，`manualChunks`、`external`、`output` 这些知识两边通用；反过来，`config` / `configResolved` / `configureServer` / `transformIndexHtml` / `hotUpdate` 是 Vite 独有，用了它们插件就不能给纯 Rollup 用——这正是 unplugin 存在的理由（跨工具写法见第十二节）。

## 九、怎么调试插件

写完插件后最常撞的三个问题——**钩子没被调用**、**被调用了但参数和预期不一样**、**顺序不对**——都能靠调试直接看到答案，不用猜。

**第一步：确认它到底有没有被调用**

先跑一遍钩子探针，它会按真实执行顺序列出所有被调用的钩子；你的插件没出现在列表里，就说明这一侧根本没走到它：

```
npm run vite:hooks                  # 同时跑 build 与 dev 两轮
npm run vite:hooks:serve            # 只看 dev 侧
npm run vite:hooks:build            # 只看 build 侧
npm run vite:hooks -- --legacy-hmr  # 把老钩子也挂上，验证"是不是改名了"
```

Vite 自己也有调试日志：`--debug` 会把每个内置插件的内部日志打出来（实测一次构建 936 行，命名空间形如 `vite:config` / `vite:env` / `vite:css` / `vite:build-html`）：

```
node node_modules/vite/bin/vite.js build --config vite-lab/vite.config.mjs --debug
DEBUG="vite:*" node node_modules/vite/bin/vite.js build --config vite-lab/vite.config.mjs  # 等价写法
```

**第二步：把断点下在钩子里**

推荐走 JS API——进程是你自己起的，断点位置也写在看得见的文件里。`vite-lab/debug-entry.mjs` 预置了四个断点位置，需要时把 `// debugger` 的注释去掉：

> 摘自 `./code/build-lab/vite-lab/debug-entry.mjs`（运行：`npm run vite:debug`）

```js
// 四个预设断点：需要时把 debugger 前面的注释去掉即可
function markerPlugin() {
    return {
        name: 'debug-marker',
        configResolved(config) {
            // 断点①：配置已解析。这里能拿到 command、完整插件链、最终配置
            // debugger
            console.log(`  [① configResolved] command=${config.command} 插件数=${config.plugins.length}`)
        },
        buildStart() {
            // 断点②：构建开始，还没有任何模块被加载
            // debugger
        },
        transform(code, id) {
            // 断点③：每个模块经过时都会停。排查「我的插件为什么没生效」就下在这里，
            // 看 id 是否符合预期、enforce 是否让你排在了别人后面
            // debugger
            if (id.includes('main.js')) console.log(`  [③ transform] 命中 main.js，源码 ${code.length} 字节`)
            return null
        },
        generateBundle(_options, bundle) {
            // 断点④：产物已生成、还没写盘——bundle 里有全部产物，改内容有效
            // debugger
            console.log(`  [④ generateBundle] 产物 ${Object.keys(bundle).length} 个`)
        }
    }
}
```

启动方式二选一：

```
npm run vite:debug:inspect    # ① 命令行：停在第一行，再打开 chrome://inspect
npm run vite:debug            # 普通执行（断点自动跳过），只跑构建
```

VS Code 的话，把 `vite-lab/debug-launch.json` 的内容复制到 `code/build-lab/.vscode/launch.json`——注意不是仓库根的 `.vscode/`，因为 `workspaceFolder` 要指向 build-lab：

> 摘自 `./code/build-lab/vite-lab/debug-launch.json`

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "调试 Vite build（插件钩子断点）",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/vite-lab/debug-entry.mjs",
            "cwd": "${workspaceFolder}",
            "skipFiles": ["<node_internals>/**"],
            "console": "integratedTerminal"
        },
        {
            "name": "调试 Vite dev server",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/vite-lab/debug-entry.mjs",
            "args": ["--serve"],
            "cwd": "${workspaceFolder}",
            "skipFiles": ["<node_internals>/**"],
            "console": "integratedTerminal"
        },
        {
            "name": "附加到已启动的 node（--inspect-brk 9229）",
            "type": "node",
            "request": "attach",
            "port": 9229,
            "skipFiles": ["<node_internals>/**"]
        }
    ]
}
```

**三个必踩的坑**

1. **dev server 不会自己退出**。`--serve` 起来后一直挂着，这正是能反复下断点的原因，但放进脚本里跑就会卡住——所以 `debug-entry.mjs` 留了 `--once`：请求一次页面就关掉。
2. **dev 下"什么都没发生"是正常的**。Vite 只处理**被请求到的**模块，不主动发请求的话 `resolveId` / `load` / `transform` 一次都不会触发（实测：dev 起来后不请求 = 0 次）。所以调试入口里必须自己 `fetch` 一次页面和模块。
3. **不要用 `.bin/vite` 启动调试**。Windows 上 `node_modules/.bin/vite.cmd` 多包了一层批处理，`--inspect-brk` 传不到真正的 node 进程；要么直接指 `node_modules/vite/bin/vite.js`（实测可用），要么用 `debug-entry.mjs` 这类 JS API 入口。

最后：`debug-entry.mjs` 里的 `timingPlugin` 会打印各里程碑耗时（实测一次构建：`buildStart` 201ms → `buildEnd` 285ms → `generateBundle` 314ms → `writeBundle` 360ms）。构建慢的时候先看这一段读数，能直接分出"慢在模块构建"还是"慢在产物生成"。

## 十、机制全景图：dev 维护的不是"打包"，是"模块图"

前面说了 dev 不打包，那 dev 脑子里装的是什么？一张**模块图**（module graph）。这是理解 Vite 所有行为（冷启动、HMR 边界、依赖预构建、为什么"改包不生效"）的关键概念，它和 webpack 的"chunk 图"是两套东西：

```
webpack：模块 →（合并）→ chunk →（写盘）→ 一张"产物文件图"
Vite dev：模块（一个 URL ↔ 一个文件）→ 用 import 边连起来 → 一张"模块依赖图"
```

Vite 的 dev 世界里只有一个实体——**模块**，一个 URL 对应一个模块节点，节点上挂着四个字段：`id`（真实文件路径）、`file`、`importers`（谁 import 我）、`importedModules`（我 import 谁）。这张图在 dev server 启动后随"浏览器请求"逐步生长，而不是一次全量构建出来：

```
请求 /src/main.js ──> 生成节点 main ──> 解析它的 import：
                          ├─ './helper.js' ──> 记录边 main → helper（另起一个 ESM 请求去取）
                          └─ '<pkg>'       ──> 改写为 /@deps/...（指向预构建产物）
```

所以"模块图"说到底是**按 URL 求值**的：图上每个节点只在被请求时才生成、才经过 `resolveId → load → transform`。这解释了几个反直觉现象：

1. **冷启动快**——图的初始化只走到你首屏请求的那几条边，图上其余节点全是"待定"。
2. **HMR 快**——`hotUpdate` 拿到 `ctx.modules` 是"受影响的模块节点"，返回空数组就不更新；改一个文件，逆着 `importers` 边找 accept 边界即可，不用碰打包（见第七节）。
3. **`optimizeDeps.exclude` 的坑**——本地 workspace 包被预构建成一个文件后，图上这个节点对你的编辑不再敏感，改了不触发更新；`exclude` 让它回归"源码节点"才走正常链路（见第二节）。
4. **`moduleParsed` 只在 build 侧触发**——它拿到的 `info.ast` 是完整 AST，dev 侧每请求才解析一次，没有"全图解析"这个动作，所以没有全量 `moduleParsed`。

而 build 侧做的是同一张图的一次**快照**：`vite build` 从入口出发全量走完 `resolveId → load → transform`，把图固化成 chunk，这在第六节图 1 那条主干链里看得一清二楚。**同一个插件、同一套钩子，右侧是"按需取"，左侧是"全量快照"**——这就是双引擎的最本质差别。

## 十一、常见自定义插件：剔除与产物门槛

生产里四种高频诉求（剔测试/mock 文件、剔注释与调试日志、删指定产物、体积门槛），一个插件全演示。样本入口同时 import 了 `helper`（正常代码）、`mock.js` 与 `main.spec.js`（不该上线的），并主动引了一个 fake 依赖制造 vendor chunk：

> 摘自 `./code/build-lab/vite-lab/drop-plugin.mjs`（运行：`npm run vite:drop`）

```js
const dropPlugin = () => ({
    name: 'lab-drop',
    enforce: 'pre', // 抢在内置转换之前处理源码
    transform(code, id) {
        if (!id.includes('/src-drop/')) return null
        // (a) 测试 / mock 文件：直接清空，让 tree-shaking 把整个模块摇掉
        if (/\.spec\.js$|mock\.js$/.test(id)) {
            removed.push(path.basename(id))
            return { code: 'export {}' }
        }
        // (b) 剔除注释行与 console.log 调试行
        const cleaned = code
            .split('\n')
            .map(l => (l.trim().startsWith('//') || /^\s*console\.log\(/.test(l) ? '' : l))
            .join('\n')
        return cleaned === code ? null : { code: cleaned }
    },
    // (c) 生成完删掉不想发布的 chunk
    generateBundle(_options, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type !== 'chunk') continue
            sizes.push({ file: fileName, bytes: chunk.code.length })
            if (fileName.startsWith('vendor')) {
                delete bundle[fileName] // 直接删产物，写盘时就没有它了
                removed.push(fileName)
            }
        }
        sizes.sort((a, b) => b.bytes - a.bytes)
        const total = sizes.reduce((s, x) => s + x.bytes, 0)
        // (d) 体积门槛：超过 20 KB 即失败
        if (total > 20 * 1024) {
            throw new Error(`体积门槛未过：${(total / 1024).toFixed(1)} KB > 20 KB`)
        }
    }
})
```

实测（真实产物，只留一个有意义的文件做门槛演示）：

```
---- ①②③ 剔除与清空 ----
  源码里注释行数： 1
  明显被剔除的调试位： main.spec.js, mock.js
  mock.js 是否还在依赖里： 已剔除
  依赖 react 是否仍被解析为外部： external（不进产物）

---- ④ 产物分析与体积门槛 ----
    assets/main-D6NTFdfe.js        0.16 KB
    assets/vendor-lab-BzzafWM-.js  0.09 KB
    产物总字节: 259
```

四种写法的分工，是猜"这段逻辑值多少钱"时最实用的框架：

| 诉求 | 钩子 | 为什么是它 | 注意 |
| ---- | ---- | ---- | ---- |
| 剔测试/mock 文件 | `transform` 返回空模块 | 让该文件进图、再被 tree-shake 摇掉；若用 `generateBundle` 删已生成的 chunk，它的 import 边会报孤儿 | 只对本项目文件判断（`id.includes`），别误伤 node_modules |
| 剔注释/调试日志 | `transform` 改写源码 | 在"这行代码进图"之前就净化 | 生产用精确 logger 判断，别用一刀切的正则去删所有 `console.log` |
| 删指定产物 | `generateBundle` 改 `bundle` | 这是"已生成、未写盘"的唯一安全窗口 | 删一个 chunk 要同时留意它的引用边，否则别的 chunk 还指它 |
| 体积门槛 | `generateBundle` 读字节 + `throw` | 让"超标的 CI"在构建期就失败，而不是发上线才后悔 | 阈值按"未压缩/压缩后"分开定，别混用 |

顺带印证[webpack](./webpack.md)里那个坑：**改产物的唯一安全窗口是 `generateBundle`**，不是 `renderChunk`——后者改的是 chunk 代码，删文件、改文件名、动产物结构都要在 `generateBundle`。这条对 webpack 和 Vite 通用。

## 十二、官方插件的实现思想

Vite 官方插件的本质，是**把"框架专属的东西"翻译成 Vite 的通用钩子**。它们不用任何私货 API，全靠第一节、第六节讲过的那些钩子组合起来。三个最代表性的下手点：

| 插件 | 它干的事 | 挂的钩子 | 实现思想 |
| ---- | ---- | ---- | ---- |
| `@vitejs/plugin-vue` | 把 `.vue` 的 template/script/style 拆成三段编译 | `transform` | 自己做一次"按语言分块"的解析（对应 Vue SFC 编译器的 `parse`），再分别交给编译器；用它自己的 loader 链替代 Vite 对 `.js` 的默认处理 |
| `@vitejs/plugin-react` | 注入 React HMR 边界 + 编译 JSX | `transform` + `config` | 在 transform 里把 `.jsx/.tsx` 交给 Babel 跑 preset-react；靠 `config` 往产物注入 React 的运行时/HMR 客户端，保证"开发态能热更、生产态能跑" |
| `@vitejs/plugin-legacy` | 给现代产物配套喂老浏览器的降级包 | `config` + `transformIndexHtml` | 用 terser 打一份 ES5 产物；`transformIndexHtml` 在 HTML 里生成 `<script type="module">` + `<script nomodule>` 双轨，由浏览器自己挑能吃的那份 |

读三个插件会收获同一个道理：**多数"官方插件"其实没发明新机制，只是把一件事做对——在哪一步、对哪些文件、做什么转换**。你手上的业务预处理（加密、加关键头、合规开关）都能用同一个思路落到 `transform` 或 `generateBundle`。想跨工具复用，`unplugin` 提供 webpack/Rollup/Vite 三端一致的外壳——官方插件如 `plugin-vue` 平级迁移时也常是"底层换壳、钩子逻辑不动"。

## 十三、mini-vite：一个"冷启动快"的最小内核

> 摘自 `./code/build-lab/vite-lab/mini-vite.mjs`（运行：`npm run mini:vite`）

写一个几十行的 dev server，只复刻 Vite 内核最关键的三件事——**按 URL 返回、import 原样保留、只转被请求的**：

```js
// 极简"转换"：把裸导入改写成预构建前缀 /@deps/，并记录命中
function transform(id, code) {
    transformed.add('/src/' + path.basename(id))
    const lines = code.split('\n')
        // 相对导入 ./x 原样保留，让浏览器发第二个 ESM 请求
        .map(l => (/(^|[^'.])from '\.\/?/.test(l) ? l : l))
        // 裸导入（不是相对路径）指向 /@deps/，对应真实 Vite 的依赖预构建产物
        .map(l => {
            const m = /from '([^']+)'/.exec(l)
            return m && !m[1].startsWith('.') ? l.replace(m[1], `/@deps/${m[1]}.js`) : l
        })
    return { code: lines.join('\n') }
}

const server = createServer((req, res) => {
    // ... 命中 /src/ 下的文件才走 transform，命中 /@deps/ 只返回"依赖已就绪"
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

对照真实 Vite，这几十行已经是"骨架齐全"的雏形：相对导入保留（浏览器发第二个请求）、裸导入改写（指向依赖预构建产物）、有模块才转换（`lazy.js` 从不被转换）。Vite 真身在此基础上叠加的，是第六节那 20 多个钩子、第七节的 HMR 边界、以及 esbuild/Rolldown 两个引擎——**机制没变，只是把每一步做重、做对、做成可插拔**。

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
| `./code/build-lab/vite-lab/hooks-probe.mjs` | 钩子探针：调用顺序 / 回调参数 / 两侧归属 / 插件链与 enforce 排序 | 六·四、钩子全景 |
| `./code/build-lab/vite-lab/debug-entry.mjs` | 插件调试入口（四个预设断点 + 各里程碑耗时） | 九、怎么调试插件 |
| `./code/build-lab/vite-lab/debug-launch.json` | VS Code 调试配置（launch / attach） | 九、怎么调试插件 |
| `./code/build-lab/vite-lab/drop-plugin.mjs` | 自定义插件：剔文件/剔调试/删产物/体积门槛 | 十一、常见自定义插件 |
| `./code/build-lab/vite-lab/mini-vite.mjs` | 几行的 dev server 最小内核（按需转换） | 十三、mini-vite |

运行：`cd code/build-lab && npm install`，然后 `npm run vite`、`npm run vite:assets`、`npm run vite:plugins`、`npm run vite:hooks`、`npm run vite:debug`、`npm run vite:drop`、`npm run mini:vite`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Rollup](./Rollup.md)

- [Vite 官方文档](https://vite.dev/)
- [Vite 插件 API](https://vite.dev/guide/api-plugin.html)
