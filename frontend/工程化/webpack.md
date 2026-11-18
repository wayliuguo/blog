# webpack

> 三段式：**使用与核心模型 → Loader 与 Plugin → 最小实现**。示例是一个真实的 Vue 3 单入口应用——SFC + `vue-router` 路由懒加载；除官方 `vue-loader` 外，CSS 链路与全部产物收尾都是手写。不提供 dev / HMR，`mode` 恒为 `production`：开发体验交给 Vite，这里专注「上线产物怎么来」。

## 一、使用 & 核心模型

### 1.1 核心设计思想

```
入口 ──递归解析 import──> 模块图 ──按规则分 chunk──> 每个 chunk 包一层运行时 ──> assets
```

与 Vite「dev 不打包」相反，webpack 从始至终只做一件事：**先把整张图打进 bundle，再交给浏览器**。dev server 只是把产物放在内存里，编译流程与生产完全一致。

理解 webpack 的关键是五个对象：

```
Compiler     一次 webpack 进程的入口，持有配置与钩子（只创建一次）
  └─ Compilation   一次具体编译的产物容器，模块、chunk、产物都挂在它上面
       ├─ Module   一个源文件（经过 loader 处理后的结果）
       ├─ Chunk    一组模块的集合（决定「哪些模块进哪个文件」）
       └─ Asset    最终写盘的文件（chunk 渲染后的结果，含 sourcemap）
```

这解释了三个常见困惑：

- **`stats` 里模块数和文件数对不上**：模块是 Module，文件是 Asset，中间隔着 Chunk 的分组规则。
- **改一个文件会重新编译很多文件**：Compilation 以模块为单位缓存，模块变则其所属 Chunk 全部重渲染。
- **plugin 能改什么**：挂在 Compiler 上的钩子拿得到配置与整次编译，挂在 Compilation 上的钩子拿得到模块、chunk 和产物。

两个扩展点分工不同：

| | Loader | Plugin |
| --- | --- | --- |
| 作用对象 | **单个模块**的源码 | **整次编译**的流程与产物 |
| 形态 | 导出函数：`source => newSource` | 有 `apply(compiler)` 的对象 |
| 典型任务 | TS / Vue / CSS / 图片转成 JS 能 import 的模块 | 抽 CSS、生成 HTML、压缩、上报 |
| 能否跨文件 | 不能（只看得到当前模块） | 能（拿得到 `compilation.assets`） |

### 1.2 基础使用

初始化：`npm i -D webpack webpack-cli`，加一个 `webpack.config.js`（本 lab 用 `.cjs`，因为根目录 `package.json` 没有 `"type": "module"` 时 CommonJS 更直观）。

配置只有五类：

| 类别 | 作用 | 关键项 |
| --- | --- | --- |
| 入口 | 从哪开始建图 | `entry`（单入口） |
| 出口 | 产物写到哪、叫什么 | `output.path` / `filename` / `chunkFilename` / `publicPath` |
| 转换 | 单个模块怎么变 | `module.rules` + loader |
| 扩展 | 编译流程里插手 | `plugins` |
| 优化 | 产物怎么组织 | `optimization`（splitChunks / minimize / runtimeChunk） |

`mode` 不是「环境名」，而是一组默认配置的开关：`production` 默认开压缩、作用域提升、`sideEffects` 分析，并通过内置 `DefinePlugin` 把 `process.env.NODE_ENV` 定成 `'production'`。

> 摘自 `./code/webpack-lab/webpack.config.cjs`（运行：`npm run build`）

```js
module.exports = (env = {}) => {
    // webpack serve 时由 webpack-cli 自动注入；本模块唯一的 serve 场景就是预览
    const isServe = env.WEBPACK_SERVE === true

    const config = {
        mode: 'production',

        // 单入口：生产应用最常见的形态
        entry: { main: path.join(ROOT, 'src/index.js') },

        output: {
            path: path.join(ROOT, 'dist'),
            // 内容变了文件名才变 → CDN 长缓存
            filename: '[name].[contenthash:8].js',
            chunkFilename: '[name].[contenthash:8].chunk.js',
            // asset 模块（本 demo 里的 svg）走这里
            assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
            publicPath: '/',
            clean: true
        },

        resolve: { extensions: ['.js', '.json', '.vue'] },

        module: {
            rules: [
                // 官方 vue-loader 编译 .vue 单文件组件（template / script / style 三块分流）
                { test: /\.vue$/, loader: 'vue-loader' },
                {
                    // 生产链路：css-loader 产出 CSS 字符串，extract-css-loader 登记，插件汇总成独立文件
                    test: /\.css$/,
                    use: [path.join(ROOT, 'loaders/extract-css-loader.cjs'), path.join(ROOT, 'loaders/css-loader.cjs')]
                },
                // webpack 5 内置的 asset module，用来配合 css-loader 的 url() 改写
                { test: /\.svg$/, type: 'asset/resource' }
            ]
        },

        // …optimization / plugins 见 1.3 与第二节
    }

    return config
}
```

三个出口项决定「能不能长缓存」：`[contenthash:8]` 让文件名随内容变，内容不变 CDN 就一直命中；`chunkFilename` 管懒加载切出来的 chunk；`assetModuleFilename` 管图片 / 字体。`clean: true` 保证每次构建先清空 `dist/`。

#### 环境变量

webpack 没有 `.env` 约定，环境变量分两类：

| 变量 | 谁提供 | 怎么用 |
| --- | --- | --- |
| `process.env.NODE_ENV` | `mode: 'production'` 内置注入 | 源码里直接读，生产分支才会保留 |
| 自定义变量 | 自己用 `DefinePlugin` / `dotenv` | 值必须 `JSON.stringify` |

与 Vite 的对照：

| | webpack | Vite |
| --- | --- | --- |
| 注入方式 | `DefinePlugin` 显式定义 | 自动读 `.env*`，`VITE_` 前缀暴露 |
| 读取写法 | `process.env.XXX` | `import.meta.env.XXX` |
| 默认注入 | `process.env.NODE_ENV` | `MODE` / `PROD` / `DEV` / `BASE_URL` |
| 动态 key | 替换不了 | 替换不了 |

`DefinePlugin` 替换的是代码文本，所以 `__VUE_OPTIONS_API__: false` 写布尔值而不是字符串；写 `'false'` 会变成字符串字面量，压缩器判不了真假。

本 lab 用它关掉 Vue 的 Options API / devtools 分支（配置见 1.2）；自定义常量也走同一个插件。

#### 静态资源

webpack 5 用**asset modules** 取代了 `file-loader` / `url-loader`：

| `type` | 行为 | 对应旧 loader |
| --- | --- | --- |
| `asset/resource` | 输出文件，import 得到 URL | `file-loader` |
| `asset/inline` | 转成 data URL | `url-loader` |
| `asset/source` | 导出文件内容字符串 | `raw-loader` |
| `asset` | 按 `parser.dataUrlCondition.maxSize` 自动二选一 | `url-loader` + limit |

本 lab 的 `{ test: /\.svg$/, type: 'asset/resource' }` 就是「始终出文件」；CSS 里 `url()` 被 `css-loader` 改写成 `require()` 后，最终由这条规则产出一个带 hash 的 URL。

#### CSS

| 需求 | 方案 |
| --- | --- |
| 普通 CSS | `style-loader`（运行时注入）或抽离成 `.css`（生产推荐） |
| CSS Modules | `css-loader` 的 `modules: true`，`import s from './a.css'` |
| Sass / Less | 在 `use` 数组末尾加 `sass-loader` / `less-loader` |
| PostCSS | 在 `use` 数组里加 `postcss-loader` + `postcss.config.js` |
| 生产抽离 | 本 lab 的手写 `css-loader` + `extract-css-loader` + `MiniCssExtractPlugin` |

两条链路互斥：同一个 `.css` 规则只能二选一。生产默认选抽离，原因见 2.1。

#### 命令

| 命令 | 做什么 | 产物 |
| --- | --- | --- |
| `npm run build` | `webpack --config webpack.config.cjs` | 写盘 `dist/` |
| `npm run preview` | `webpack serve --config webpack.config.cjs` | 构建到内存 + 写盘，起 5180 端口 |

`preview` 不是 dev 模式：配置里 `hot: false`、`client: false`，目的只是「用静态服务器看真实产物」。如果注入 dev-server 客户端，它会被 `splitChunks` 抽进 `vendors`，预览到的就不是纯生产产物了。

### 1.3 工程化 & 性能

#### 代码分割

`optimization` 决定产物怎么切。本 lab 的四个开关各有明确目标：

> 摘自 `./code/webpack-lab/webpack.config.cjs`（运行：`npm run build`）

```js
optimization: {
    minimize: true,
    // 用我们手写的压缩插件顶掉 webpack 默认的 TerserPlugin
    minimizer: [new MiniTerserPlugin()],
    // 运行时单独成文件：业务 chunk 的 hash 不因运行时变化而全部失效
    runtimeChunk: 'single',
    splitChunks: {
        chunks: 'all',
        // 默认体积下限 20KB，小模块不会被抽出来
        minSize: 20000,
        cacheGroups: {
            // 按范围切：命中 node_modules 就抽进 vendors，与「被引用几次」无关
            vendor: {
                test: /node_modules/,
                name: 'vendors',
                priority: 10,
                reuseExistingChunk: true
            },
            // 按次数切：业务模块被两个以上 chunk 复用才抽
            common: {
                minChunks: 2,
                name: 'common',
                priority: 5,
                reuseExistingChunk: true
            }
        }
    }
}
```

- **`runtimeChunk: 'single'`**：把 webpack 运行时（模块注册表、`require` 实现）单独成文件。不拆的话，运行时一变，所有 chunk 的 hash 全变，CDN 缓存全废。
- **`vendor` 按范围切**：只看路径是否命中 `node_modules`，不看引用次数——第三方库的版本变化频率远低于业务代码。
- **`common` 按次数切**：业务模块被两个以上 chunk 复用才抽，避免把一次性模块也切碎。
- **`minSize: 20000`**：小于 20KB 的组不单独出文件，防止请求数膨胀。

#### tree-shaking

三个条件同时成立才会真正删代码：

1. **ESM**。CJS 的 `require` 有副作用，静态分析不敢删。
2. **`sideEffects` 声明**。包在 `package.json` 里标 `"sideEffects": false`（或列出有副作用的文件），webpack 才敢整块跳过没被引用的模块。
3. **`minimize: true`**。`usedExports` 只标记「哪些导出没被用」，真正删除靠压缩器的 `dead_code`。

对库作者还有一条：纯函数调用加 `/*#__PURE__*/` 注释，否则压缩器不敢删。

#### 压缩与产物读数

压缩挂在 `processAssets` 的 `OPTIMIZE_SIZE` 阶段，逐个 `.js` 过 `terser` 后 `updateAsset` 覆盖：

> 摘自 `./code/webpack-lab/plugins/mini-terser-plugin.cjs`（运行：`npm run build`）

```js
compilation.hooks.processAssets.tapPromise(
    {
        name: this.name,
        // 官方 TerserPlugin 挂在 OPTIMIZE_SIZE(400)：此时产物内容已定，
        // 排在它之后的插件（如 MiniHtmlPlugin）才能引用到压缩后的最终结果
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
    },
    async () => {
        const targets = Object.keys(compilation.assets).filter(name => name.endsWith('.js'))

        await Promise.all(
            targets.map(async name => {
                const before = compilation.assets[name].source().toString()
                const result = await terser.minify(before, {
                    format: { comments: false },
                    ...this.terserOptions
                })
                if (result.error) throw result.error
                // updateAsset 是覆盖已有产物的正确方式，文件名不变、hash 由 webpack 重算
                compilation.updateAsset(name, new webpack.sources.RawSource(result.code))
                const kb = n => (n / 1024).toFixed(2)
                console.log(`  [MiniTerserPlugin] ${name}: ${kb(before.length)} KB → ${kb(result.code.length)} KB`)
            })
        )
    }
)
```

一次 `npm run build` 的实测输出（节选）：

```
  [MiniCssExtractPlugin] 汇总 3 个模块 → main.b507f2ef.css
  [MiniTerserPlugin] main.1b5d47ed.js: 4.23 KB → 1.09 KB
  [MiniTerserPlugin] runtime.75af38a6.js: 10.74 KB → 2.62 KB
  [MiniTerserPlugin] 353.23cee64b.chunk.js: 3.26 KB → 0.75 KB
  [MiniTerserPlugin] 376.3c238530.chunk.js: 1.42 KB → 0.35 KB
  [MiniTerserPlugin] vendors.faae68eb.js: 505.32 KB → 85.98 KB
  [MiniHtmlPlugin] 注入 3 个 script / 1 个 link → index.html

Entrypoint main 89.7 KiB = runtime.18747689.js 2.62 KiB vendors.2d3a2b47.js 86 KiB main.a01565e0.js 1.14 KiB
webpack 5.112.2 compiled successfully in 2273 ms
```

两个值得注意的细节：

1. **压缩日志里的文件名和最终 stats 里的不一样**。日志打印的是 `OPTIMIZE_SIZE` 阶段的 `main.1b5d47ed.js`；`updateAsset` 改了内容，webpack 在 emit 前重算 `contenthash`，最终成了 `main.a01565e0.js`。所以「压缩插件里拿到的文件名」不等于「写盘的文件名」。
2. **`vendors` 从 505KB 压到 86KB**。第三方库的原始体积主要来自未压缩的注释与空格；这也是「量 gzip / 压缩后体积」比量 raw 有意义的原因。

产物结构：

| 产物 | 来源 | 能否长缓存 |
| --- | --- | --- |
| `vendors.*.js` | `node_modules`（vendor 组） | 能：版本不变 hash 不变 |
| `runtime.*.js` | webpack 运行时 | 能：业务代码变化不影响它 |
| `main.*.js` | 入口 + 未被拆走的业务模块 | 随业务变 |
| `<id>.*.chunk.js` | 路由懒加载的 `import()` | 随对应路由变 |
| `main.*.css` | 抽离出的样式 | 随样式变 |
| `index.html` | `MiniHtmlPlugin` | 不缓存（引用的都是带 hash 的名字） |

#### 兼容与体积提示

- **`target`**：默认 `'browserslist'`（读 `.browserslistrc` 或 `package.json`），也可显式写 `'web'` / `'es2015'`。它决定运行时与语法降级的程度。
- **`performance.hints`**：默认对超过 244KB 的产物告警；本 lab 的 `vendors` 压缩前有 505KB，所以显式关掉，避免噪音——**关掉提示不等于没有体积问题**，生产里应该用门禁（Vite 篇 2.3.4 的 `mini-size-gate` 是同一思路）。

## 二、Loader 与 Plugin

### 2.1 Loader 的结构与执行顺序

loader 的全部秘密一句话：**输入源码字符串，输出代码字符串**。

```js
module.exports = function (source) {
    // this: loader context（resourcePath / addDependency / async / importModule…）
    return newSource
}
```

loader 链分两个阶段，方向相反：

```
pitch  （从左往右）: loaderA.pitch → loaderB.pitch → 读取资源
normal （从右往左）: loaderB       ← loaderA       ← 资源内容
```

`use: [extract, css]` 的写法里，`css-loader` 在右、先执行 normal；`extract-css-loader` 在左、后执行 normal。想「在别人之前」拿资源，就用 `pitch`——它从左往右先跑，且能拿到 `remainingRequest`（它右边那条还没跑的链）。

#### css-loader：把 CSS 变成 JS 模块

它做两件官方 `css-loader` 也在做的事：递归内联 `@import`，把相对 `url()` 改写成 `require()`。

> 摘自 `./code/webpack-lab/loaders/css-loader.cjs`（运行：`npm run build`）

```js
module.exports = function cssLoader(source) {
    const dir = path.dirname(this.resourcePath)

    // ① 内联 @import
    const css = inlineImports(source, dir, this)

    // ② 相对 url() → require()，拼成「字符串 + 变量」的拼接表达式
    //    不用模板字符串是为了避开 CSS 里反引号 / ${} 的转义坑
    const requires = []
    const parts = []
    let last = 0
    let n = 0
    css.replace(URL_RE, (whole, quote, request, offset) => {
        if (isRemote(request)) return whole
        const abs = path.resolve(dir, request)
        const name = `__asset${n++}`
        requires.push(`const ${name} = require(${JSON.stringify(abs.replace(/\\/g, '/'))})`)
        // 保留 url( 与 ) 本身，只把中间那个资源地址换成运行时插值
        parts.push(JSON.stringify(css.slice(last, offset) + 'url('), name)
        last = offset + whole.length - 1 // 停在结尾的 ')'，下一段从它开始
        return whole
    })
    parts.push(JSON.stringify(css.slice(last)))

    // ③ loader 的输出必须是「JS 代码字符串」，而不是 CSS 文本本身
    return [...requires, `const css = ${parts.join(' + ')}`, 'export default css', ''].join('\n')
}
```

两个关键点：

1. **返回的是代码文本，不是值**。想导出 CSS 字符串，就得自己 `JSON.stringify` 把片段拼进代码里（③）。
2. **改写 `url()` 时保留包装**。`url(...)` 的括号要留在字符串里，只把中间的资源地址换成运行时插值（② 的 `last` 计算），否则产物会变成一段裸路径。

`inlineImports` 递归读 `@import` 的文件、并 `ctx.addDependency(abs)` 告诉 webpack「这也是本次构建的依赖」——所以被 `@import` 的文件改了会触发重新编译。

#### extract-css-loader：为什么必须用 pitch

轮到 `extract-css-loader` 的 normal 阶段时，`source` 已经是 `css-loader` 产出的 **JS 代码**，取不到 CSS 文本。所以必须用 pitch：

> 摘自 `./code/webpack-lab/loaders/extract-css-loader.cjs`（运行：`npm run build`）

```js
module.exports.pitch = function (remainingRequest) {
    const callback = this.async()
    const compilation = this._compilation

    // importModule 是 webpack 5 提供的 loader API：在构建期把一条 loader 链跑一遍并拿回它的导出
    this.importModule(`!!${remainingRequest}`, {}, (err, exports) => {
        if (err) return callback(err)

        const css = typeof exports === 'string' ? exports : exports && exports.default
        if (typeof css !== 'string') {
            return callback(new Error('[extract-css-loader] 没拿到 CSS 文本，检查 css-loader 是否在这条链上'))
        }

        // 登记到 compilation：plugin 在 processAssets 阶段会来取
        if (!compilation.__miniCss) compilation.__miniCss = new Map()
        compilation.__miniCss.set(this.resourcePath, css)

        // 返回占位模块：样式已经由 plugin 汇总成独立文件，JS 侧不需要再塞内容
        callback(null, 'export default undefined\n')
    })
}
```

`this.importModule('!!' + remainingRequest)` 里的 `!!` 表示「只用这条链、不要再套前面的 loader」，否则会递归回自己。它跑完右半边链、拿回 `css-loader` 的导出，登记到 `compilation.__miniCss`，再返回一个占位模块。

#### 抽离 vs 注入

| | `style-loader`（运行时注入 `<style>`） | `extract-css-loader`（抽成独立 `.css`） |
| --- | --- | --- |
| 原理 | CSS 文本进 JS bundle，运行时创建 `<style>` | CSS 进单独文件，HTML 里 `<link rel="stylesheet">` |
| 生效时机 | 要等 JS 执行完，有 FOUC 风险 | 随 HTML 并行加载，首屏更稳 |
| 独立缓存 | 拿不到独立 `contenthash`，CSS 变了 JS 文件名也变 | 有自己的 `contenthash`，CSS 单独命中缓存 |
| 其他 | 无法 `<link rel="preload">`；严格 CSP 下需放行 inline | 无这些代价 |

`style-loader` 并非 dev 专属——微前端沙箱、Web Components / Shadow DOM、要求单文件产物的场景也会在生产用它。但两条链路互斥。

#### SFC 的 `<style>` 怎么接进手写链路

`.vue` 由官方 `vue-loader` 拆成 template / script / style 三块，其中 style 块会变成带 `?vue&type=style` 的请求——**它匹配不上 `test: /\.css$/`**，于是 SFC 样式会绕开手写链路。

`VueLoaderPlugin` 读一遍 `module.rules`，把每条规则克隆成带 `?vue` 查询串的版本。所以只要配置里有一条 `.css` 规则，SFC 的 `<style>` 就会自动走同一条链路。本 lab 的 `main.b507f2ef.css` 汇总了 3 个模块：`style.css` + `App.vue` + `HelloCard.vue` 的 style 块。

### 2.2 Plugin 的结构与钩子

plugin 是一个有 `apply(compiler)` 方法的对象：

```js
class MyPlugin {
    apply(compiler) {
        compiler.hooks.thisCompilation.tap('MyPlugin', compilation => {
            compilation.hooks.processAssets.tap(
                { name: 'MyPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS },
                () => { /* 读写 compilation.assets */ }
            )
        })
    }
}
```

两类钩子先分清：

| 钩子来源 | 生命周期 | 能拿到什么 |
| --- | --- | --- |
| `compiler.hooks.*` | 整个 webpack 进程 | 配置、`compilation`、watch 状态 |
| `compilation.hooks.*` | 一次编译 | `modules` / `chunks` / `assets` |

产物阶段几乎都挂在 `compilation.hooks.processAssets`，靠 `stage` 数值排队：

| stage | 数值 | 典型用途 |
| --- | --- | --- |
| `PROCESS_ASSETS_STAGE_ADDITIONS` | -100 | 新增产物（本 lab 的 CSS） |
| `PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE` | 400 | 压缩（本 lab 的 Terser） |
| `PROCESS_ASSETS_STAGE_SUMMARIZE` | 1000 | 汇总生成 HTML（本 lab 的 Html） |

**顺序就是依赖关系**：CSS 必须在 `ADDITIONS` 产出，压缩才能在 `OPTIMIZE_SIZE` 拿到它，HTML 才能在 `SUMMARIZE` 引用最终文件名。

#### MiniCssExtractPlugin：汇总 CSS

> 摘自 `./code/webpack-lab/plugins/mini-css-extract-plugin.cjs`（运行：`npm run build`）

```js
compilation.hooks.processAssets.tap(
    {
        name: this.name,
        // 排在 ADDITIONS(-100)：要早于 MiniHtmlPlugin(SUMMARIZE/1000)，
        // 否则 HTML 生成时还看不到这个 .css 产物
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
    },
    () => {
        const registry = compilation.__miniCss
        if (!registry || registry.size === 0) return

        // 教学版简化：所有登记到的 CSS 拼成一个文件（真实实现按 chunk 分组、各自产出）
        const css = [...registry.values()].join('\n')

        // 官方靠 filename 里的 [contenthash] 占位符；这里手算一个，效果一样
        const hash = crypto.createHash('md5').update(css).digest('hex').slice(0, 8)
        const entryName = [...compilation.entrypoints.keys()][0] || 'main'
        const file = this.filename.replace('[name]', entryName).replace('[contenthash:8]', hash)

        // 用 emitAsset 产出新文件，而不是 fs.writeFileSync：
        // 这样它才进 stats、参与 output.clean、跟随 watch
        compilation.emitAsset(file, new webpack.sources.RawSource(css))
        console.log(`  [MiniCssExtractPlugin] 汇总 ${registry.size} 个模块 → ${file}`)
    }
)
```

这是**「loader + plugin 两段式」**的典型：loader 管单个模块（把 CSS 文本登记进来），plugin 管跨文件汇总（合成产物）。

#### MiniHtmlPlugin：现读最终文件名

> 摘自 `./code/webpack-lab/plugins/mini-html-plugin.cjs`（运行：`npm run build`）

```js
const publicPath = compilation.outputOptions.publicPath || ''

// JS 用 entrypoint 给的顺序（runtime 必须在 main 之前），不是 assets 的遍历顺序
const jsTags = []
for (const entrypoint of compilation.entrypoints.values()) {
    for (const file of entrypoint.getFiles()) {
        if (file.endsWith('.js')) jsTags.push(`<script src="${publicPath}${file}"></script>`)
    }
}

// CSS 不是 entrypoint 的文件（由我们自己的插件产出），所以从 assets 里筛
const cssTags = Object.keys(compilation.assets)
    .filter(name => name.endsWith('.css'))
    .map(name => `<link rel="stylesheet" href="${publicPath}${name}" />`)

// …拼模板
compilation.emitAsset(this.filename, new webpack.sources.RawSource(html))
```

两个点：

1. **JS 必须按 `entrypoint.getFiles()` 的顺序输出**。`runtime` 里有模块注册表，必须排在 `main` 之前；直接遍历 `compilation.assets` 的 key 会拿到插入顺序，可能把 `main` 写在前面。
2. **CSS 从 `assets` 里筛**。它是由自己的插件 `emitAsset` 出来的，不属于任何 entrypoint 的 `getFiles()`。

### 2.3 三个易错点

**（1）`emitAsset` 与 `updateAsset` 不能混**

| 想干的事 | API | 原因 |
| --- | --- | --- |
| 新增产物 | `compilation.emitAsset(name, source)` | 走 stats / clean / watch |
| 覆盖已有产物 | `compilation.updateAsset(name, source)` | 文件名不变，hash 由 webpack 重算 |
| 直接写盘 | `fs.writeFileSync` | **不要**：绕过 stats、clean、watch |

**（2）`compilation.assets[name].source()` 的类型**

`RawSource` 返回 `Buffer` / 字符串，`SourceMapSource` 等可能不同。压缩前统一 `.toString()`，否则 `terser.minify` 拿到 Buffer 会报错。

**（3）插件里读到的文件名可能不是最终文件名**

压缩在 `OPTIMIZE_SIZE`、文件名定稿在 emit。`MiniCssExtractPlugin` 自己手算 hash 是为了让日志和产物一致；`MiniTerserPlugin` 则只能打印旧名，最终名以 stats 为准。**要在 HTML 里引用最终名，只能挂在更晚的 `SUMMARIZE`**。

## 三、最小实现：mini-webpack

`mini-webpack` 是独立项目（`code/mini-webpack/`，`npm run mini`），约百行，复刻 **Compiler → Compilation → Module → Chunk → Asset** 的流水线。只支持 ESM 静态 `import`，不含 loader 链、代码分割、tree-shaking，但「流水线顺序 + 运行时怎么生成」是真的。

| 文件 | 承担的概念 | 对应真实 webpack |
| --- | --- | --- |
| `index.cjs` | 编排：注册内置 `make` / `seal` / `emit`，再 `apply` 用户插件 | `webpack()` |
| `lib/hook.cjs` | tapable 极简版：先注册、后触发 | `tapable` |
| `lib/compiler.cjs` | Compiler：持有配置与 hooks，定义 `make → seal → emit` | `Compiler` |
| `lib/compilation.cjs` | Compilation：`modules` / `chunks` / `assets` | `Compilation` |
| `lib/module.cjs` | Module：一个源文件 | `Module` |
| `lib/resolver.cjs` | 相对路径 → 磁盘绝对路径 | `enhanced-resolve` |
| `lib/graph.cjs` | `make` 阶段：DFS 建模块图 | `NormalModuleFactory` |
| `lib/transpile.cjs` | ESM → CJS | `javascript/auto` 解析 |
| `lib/runtime.cjs` | 把模块图拼成可执行的运行时 | chunk 渲染 |
| `lib/emit.cjs` | `emit` 阶段：渲染 + 写盘 | `emitAssets` |
| `plugins/emit-list.cjs` | 示例插件：`emit` 阶段打印产物 | 任意 plugin |

### 3.1 Compiler：一条三段式流水线

`Compiler` 只做一件事：创建 `Compilation`，按固定顺序触发三组钩子。

> 摘自 `./code/mini-webpack/lib/compiler.cjs`（运行：`npm run mini`）

```js
class Compiler {
    constructor(options) {
        this.options = options
        // webpack 上各种 compiler.hooks.xxx 的缩小版；重点演示 make(建图) → seal(封装) → emit(写盘)
        this.hooks = { make: new Hook(), seal: new Hook(), emit: new Hook(), done: new Hook() }
    }

    run() {
        const compilation = new Compilation(this)
        // ① make：从入口出发递归解析依赖，构建模块图
        this.hooks.make.call(compilation)
        // ② seal：冻结模块图，按规则分 chunk
        this.hooks.seal.call(compilation)
        // ③ emit：渲染 chunk 为 asset
        this.hooks.emit.call(compilation)
        this.hooks.done.call(compilation, compilation.assets)
    }
}
```

真实 webpack 的钩子有几十个，但主干就是这三步：**建图（make）→ 封装（seal）→ 写盘（emit）**。`done` 只在全部完成后触发，适合上报。

`Compilation` 是这三个对象的容器：

> 摘自 `./code/mini-webpack/lib/compilation.cjs`（运行：`npm run mini`）

```js
class Compilation {
    constructor(compiler) {
        this.compiler = compiler
        this.modules = new Map() // id -> Module，模块图
        this.chunks = [] // 一组 Module 的集合（本实现只有一个 chunk）
        this.assets = {} // 最终写盘的文件：文件名 -> 内容
    }
}
```

watch 模式下每轮编译都会 new 一个 `Compilation`，所以**不要把跨轮状态挂在 Compilation 上**——这是 webpack 插件里最常见的状态泄漏。

### 3.2 运行时：模块函数 + 缓存 + require

`make` 建完图、`seal` 冻结后，`emit` 把每个模块包成 `function (module, exports, require)`，再拼一个 `require` 实现：

> 摘自 `./code/mini-webpack/lib/runtime.cjs`（运行：`npm run mini`）

```js
const runtime = `(function () {
  var modules = { ${modulesCode.join(',\n')} }
  var cache = {}
  function require(id) {
    if (cache[id]) return cache[id].exports
    var module = (cache[id] = { exports: {} })
    modules[id](module, module.exports, require)
    return module.exports
  }
  require(0)
})();`
```

这段骨架就是 webpack 产物里那层 `(() => { var modules = {...}; ... })()`——只是被压缩和混淆得看不出原样。三个要素缺一不可：

- **`modules`**：id → 模块函数，id 在构建期分配（入口固定是 0）。
- **`cache`**：同一模块只执行一次，导出对象被复用——这就是 CJS 的「单例」语义。
- **`require(0)`**：从入口开始执行，其余模块由各自的 `require` 按需拉起。

### 3.3 一次运行的读数

```
---- 产物清单（emit 钩子）----
  bundle.js                0.6 KB

产物片段（bundle.js 的运行时骨架，与 webpack 同构）：
(function () {
  var modules = { 0: function (module, exports, require) {
// mini-webpack 演示源码：入口（默认导入）
var greet = require(1);
const used = greet('min-webpack')
console.log('entry 用到: ' + used)
  // deps: { "greet.js": 1 }
}, 1: function (module, exports, require) {
…
  require(0)
})();

产物实际执行（node dist-min/bundle.js）：
  entry 用到: hello min-webpack
```

三个读数对应三件事：

- **`deps: { "greet.js": 1 }`**：`make` 阶段解析出的依赖边，被 `transpile` 改写成了 `require(1)`。
- **模块函数包裹**：每个源文件都被包进 `function (module, exports, require)`，ESM 的 `import` / `export` 已在 `transpile` 里降级成 CJS。
- **产物真的能跑**：`node dist-min/bundle.js` 输出 `entry 用到: hello min-webpack`，说明运行时拼接没有出错。

真实 webpack 在这套骨架上叠加的是：loader 链（每个模块先过一遍 loader）、`splitChunks`（按规则切多个 chunk）、`runtimeChunk`（把运行时抽走）、tree-shaking（在 `seal` 阶段标记、压缩阶段删除）、以及 `processAssets` 一整套产物钩子。**流水线没变，只是每一步都可以插插件**。

## 配套代码

本篇示例来自 `code/webpack-lab`（独立 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/webpack-lab/package.json` | 两个命令：`build` / `preview` | 1.2 |
| `./code/webpack-lab/webpack.config.cjs` | **唯一配置**：入口 / 出口 / 规则 / 优化 / 插件 | 1.2、1.3 |
| `./code/webpack-lab/src/index.js` | 入口：建 Vue 应用 → 装路由 → 挂载 | 1.2 |
| `./code/webpack-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件 | 1.3 |
| `./code/webpack-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 1.3 |
| `./code/webpack-lab/src/style.css`、`src/assets/` | 样式与 svg 资源 | 1.2 |
| `./code/webpack-lab/loaders/css-loader.cjs` | 手写 css-loader：`@import` 内联 + `url()` 改写 | 2.1 |
| `./code/webpack-lab/loaders/extract-css-loader.cjs` | 手写抽离 loader：pitch + `importModule` | 2.1 |
| `./code/webpack-lab/plugins/mini-css-extract-plugin.cjs` | 手写 CSS 汇总插件 | 2.2 |
| `./code/webpack-lab/plugins/mini-html-plugin.cjs` | 手写 HTML 生成插件 | 2.2 |
| `./code/webpack-lab/plugins/mini-terser-plugin.cjs` | 手写压缩插件 | 1.3、2.2 |
| `./code/mini-webpack/index.cjs` | 单次构建入口：注册三段流水线 + 演示 | 三 |
| `./code/mini-webpack/lib/` | `hook` / `compiler` / `compilation` / `module` / `resolver` / `graph` / `transpile` / `runtime` / `emit` | 三 |
| `./code/mini-webpack/plugins/emit-list.cjs` | 示例插件：`emit` 阶段打印产物 | 三 |
| `./code/mini-webpack/src/` | 演示源码（entry / greet / deep） | 三 |

运行：`cd code/webpack-lab && npm install`，然后 `npm run build`、`npm run preview`（5180）。

`mini-webpack` 是独立项目：`cd code/mini-webpack && npm install && npm run mini`。

## 参考

- 本模块总结：[总结](./总结.md)
- 相关篇：[Vite](./Vite.md)
- [webpack 官方文档](https://webpack.js.org/)
- [webpack 插件 API](https://webpack.js.org/api/plugins/)
