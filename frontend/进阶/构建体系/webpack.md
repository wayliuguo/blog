# webpack

> 本篇只讲**生产配置**：单入口、内容哈希、代码分割、压缩、抽 CSS、生成 HTML，全部用**手写 loader / plugin** 实现。示例是一个真实的 Vue 3 应用——单文件组件（SFC）+ `vue-router` 多路由 + 路由级懒加载；除官方 `vue-loader` 外，其余环节都是手写。不提供 dev 模式（无 HMR、无 development 构建），`mode` 恒为 `production`——开发体验的差距交给 Vite，这里专注"上线产物怎么来"。

## 一、五个对象：webpack 的心智模型

```
Compiler     一次 webpack 进程的入口，持有配置与钩子（只创建一次）
  └─ Compilation   一次具体编译的产物容器，模块、chunk、产物都挂在它上面
       ├─ Module   一个源文件（经过 loader 处理后的结果）
       ├─ Chunk    一组模块的集合（决定"哪些模块进哪个文件"）
       └─ Asset    最终写盘的文件（chunk 渲染后的结果，含 sourcemap）
```

理解这点能解开很多困惑：

- **为什么 `stats` 里模块数和文件数对不上**？模块是 Module，文件是 Asset，中间还隔着 Chunk 的分组规则。
- **为什么改一个文件会重新编译很多文件**？Compilation 以模块为单位缓存，模块变则其所属 Chunk 全部重渲染。
- **plugin 能改什么**？挂在 Compiler 上的钩子能拿到配置与整次编译；挂在 Compilation 上的钩子能拿到模块、chunk 和产物。

## 二、生产配置全览（单入口）

配置本身只有五类，读懂这五类就够看绝大多数项目：

| 类别 | 作用 | 关键项 |
| ---- | ---- | ---- |
| 入口 | 从哪开始建图 | `entry`（单入口） |
| 出口 | 产物写到哪、叫什么 | `output.path` / `filename` / `chunkFilename` / `publicPath` |
| 转换 | 单个模块怎么变 | `module.rules` + loader |
| 扩展 | 编译流程里插手 | `plugins` |
| 优化 | 产物怎么组织 | `optimization`（splitChunks / minimize / runtimeChunk） |

`mode` 不是"环境名"，它是**一组默认配置的开关**：`production` 默认开压缩、作用域提升、`sideEffects` 分析。很多"生产环境才出现的问题"其实是 `mode` 带出来的行为差异。

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

        // 省略扩展名时按这个顺序补全；.vue 不加进来，`import App from './App'` 会解析失败
        resolve: { extensions: ['.js', '.json', '.vue'] },

        module: {
            rules: [
                // 官方 vue-loader 编译 .vue 单文件组件（template / script / style 三块分流）
                { test: /\.vue$/, loader: 'vue-loader' },
                {
                    // 生产链路：css-loader 产出 CSS 字符串，extract-css-loader 登记，插件汇总成独立文件
                    test: /\.css$/,
                    use: [
                        path.join(ROOT, 'loaders/extract-css-loader.cjs'),
                        path.join(ROOT, 'loaders/css-loader.cjs')
                    ]
                },
                // webpack 5 内置的 asset module，用来配合 css-loader 的 url() 改写
                { test: /\.svg$/, type: 'asset/resource' }
            ]
        },
        // …
        plugins: [
            // Vue 的 esm-bundler 产物把这三个开关留给构建方定义；
            // 定成字面量，Options API / devtools 的死代码才能被压缩器摇掉（Vite 由官方插件代劳）
            new webpack.DefinePlugin({
                __VUE_OPTIONS_API__: false,
                __VUE_PROD_DEVTOOLS__: false,
                __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
            }),
            // 把上面的 .css 规则克隆到 .vue 的 <style> 请求上，SFC 样式才能走手写链路（见 3.4）
            new VueLoaderPlugin(),
            // 顺序即注册顺序；真正的先后由各自的 processAssets stage 决定
            new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' }),
            new MiniHtmlPlugin({ filename: 'index.html', title: 'webpack 生产构建 demo' })
        ],
        // …
    }

    return config
}
```

三个出口项决定了"能不能长缓存"：`[contenthash:8]` 让文件名随内容变，内容不变 CDN 就一直命中；`chunkFilename` 管懒加载切出来的 chunk；`assetModuleFilename` 管图片 / 字体这类资源（本 demo 里是一个 svg）。`clean: true` 保证每次构建先清空 `dist/`，不留上一轮的残骸。

与 Vue 相关的四处是本节新增：`resolve.extensions` 里的 `.vue`、`module.rules` 里的 `vue-loader`、`plugins` 里的 `VueLoaderPlugin` 与 `DefinePlugin`。前两者让 SFC 能被编译，后两者分别负责"把 SFC 的 `<style>` 接进手写 CSS 链"和"剔除 Vue 的开发期分支"——3.4 展开。

## 三、手写 loader：css-loader / extract-css-loader

loader 的全部秘密就一句话：**输入源码字符串，输出代码字符串**。生产里最典型的 loader 链是 CSS，本节的两位主角就是官方 `css-loader` 与 `mini-css-extract-plugin.loader` 的手写替代。

### 3.1 css-loader：把 CSS 变成 JS 模块

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
2. **改写 `url()` 时保留包装**。`url(...)` 的括号本身要留在字符串里，只把中间的资源地址换成运行时插值（② 的 `last` 计算），否则产物会变成一段裸路径。

`inlineImports` 递归读 `@import` 的文件、并 `ctx.addDependency(abs)` 告诉 webpack"这也是本次构建的依赖"——所以被 `@import` 的文件改了，会触发重新编译。

### 3.2 extract-css-loader：在 pitch 阶段登记 CSS

CSS 文本要交给 plugin 汇总成独立 `.css` 文件，但轮到这条 loader 的普通阶段时，`source` 已经是 `css-loader` 产出的 **JS 代码**，取不到 CSS 文本。所以必须用 **pitch**——它从左往右先执行，能拿到它后面那条链（`remainingRequest`）：

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

它把 CSS 文本登记到 `compilation.__miniCss`（一个 Map），然后返回一个**占位模块** `export default undefined`——样式已经进独立文件了，JS 侧不需要再塞内容。真正把它汇总成产物的是第四节的手写 plugin。

### 3.3 为什么生产用"抽离"而不是"注入"

同样的 CSS，还有一条经典链路是 `style-loader`——把 CSS 文本塞进 JS bundle，运行时 `document.head.appendChild(<style>)`。生产里默认选抽离：

| | `style-loader`（运行时注入 `<style>`） | `extract-css-loader`（抽成独立 `.css`） |
| --- | --- | --- |
| 原理 | CSS 文本进 JS bundle，运行时创建 `<style>` 插入 `<head>` | CSS 进单独文件，HTML 里 `<link rel="stylesheet">` |
| 生效时机 | 要等 JS 执行完，有 FOUC 风险 | 随 HTML 并行加载，首屏更稳 |
| 独立缓存 | 拿不到独立 `contenthash`，CSS 变了 JS 文件名也变 | 有自己的 `contenthash`，CSS 单独命中缓存 |
| 其他 | 无法 `<link rel="preload">`；严格 CSP 下 `style-src` 需放行 inline | 无这些代价 |

`style-loader` 并非 dev 专属——微前端沙箱、Web Components / Shadow DOM、要求单文件产物的场景也会在生产用它。但两条链路互斥：同一个 `.css` 规则只能二选一。本模块只保留生产链路（抽离），所以 `style-loader` 不出现在配置里。

### 3.4 SFC 的 `<style>` 怎么接进手写链路（VueLoaderPlugin）

`.vue` 文件由官方 `vue-loader` 拆成 template / script / style 三块，其中 style 块会变成一条带 `?vue&type=style` 查询串的请求。**它匹配不上配置里 `test: /\.css$/` 那条规则**——于是 SFC 里的样式就绕过了手写的 `css-loader` / `extract-css-loader`，产物里看不到它们。

`VueLoaderPlugin` 正是来补这一刀的：它读一遍 `module.rules`，把每条规则克隆成带 `?vue` 查询串的版本。所以只要配置里有一条 `.css` 规则，SFC 的 `<style>` 就会自动走同一条链路——本 demo 里 `App.vue` / `HelloCard.vue` 的 `<style scoped>` 因此和 `style.css` 一样被抽进 `main.*.css`（实测汇总 3 个模块：`style.css` + 两个 SFC 的 style 块）。

配套的另一半是 `DefinePlugin`：Vue 的 `esm-bundler` 产物把 `__VUE_OPTIONS_API__` / `__VUE_PROD_DEVTOOLS__` / `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` 三个开关留给构建方。不定成字面量，压缩器无法判定分支真假，Options API 与 devtools 的代码就会被打进生产产物。Vite 由官方插件自动处理，webpack 必须自己写。

## 四、手写 plugin：Html / CssExtract / Terser

plugin 是一个有 `apply(compiler)` 方法的对象，能不能写好取决于**知不知道挂在哪个钩子、哪个 stage**。三个手写插件覆盖了生产最常见的三件事，且它们在同一条 `processAssets` 钩子上按 stage 排队——顺序本身就说明了分工。

### 4.1 MiniCssExtractPlugin：汇总 CSS 成独立文件

它读第三节 loader 登记进 `compilation.__miniCss` 的文本，合成一个 `.css` 产物：

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

这是**"loader + plugin 两段式"**的典型：loader 管单个模块（把 CSS 文本登记进来），plugin 管跨文件汇总（合成产物）。想加哪种"特殊资源"，就照它这样拆两半。

### 4.2 MiniTerserPlugin：压缩 JS

压缩本质就是"在产物优化阶段，把 `.js` 过一遍 terser 再覆盖回 assets"：

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

它作为 `optimization.minimizer` 顶掉了 webpack 默认的 `TerserPlugin`。注意用的是 `updateAsset`（覆盖已有产物）而非 `emitAsset`（新增产物）。

### 4.3 MiniHtmlPlugin：生成 HTML 并注入资源

它的灵魂只有一句：**从 `compilation.assets` 里"现读"带 hash 的最终文件名**，拼进模板再产出 `index.html`：

> 摘自 `./code/webpack-lab/plugins/mini-html-plugin.cjs`（运行：`npm run build`）

```js
compilation.hooks.processAssets.tap(
    {
        name: this.name,
        // 排在 MiniCssExtractPlugin(ADDITIONS/-100) 之后、压缩之前，
        // 保证 CSS/JS 产物都已就位，且拿到的是压缩后的最终文件名
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
    },
    () => {
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
        // …
        compilation.emitAsset(this.filename, new webpack.sources.RawSource(html))
        console.log(`  [MiniHtmlPlugin] 注入 ${jsTags.length} 个 script / ${cssTags.length} 个 link → ${this.filename}`)
    }
)
```

JS 的 `<script>` 顺序取自 `entrypoint.getFiles()`——它保证 `runtime` 排在 `main` 之前，这是运行时先就位的前提。生成结果（`npm run build` 的 `dist/index.html`）：

```
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>webpack 生产构建 demo</title>
<link rel="stylesheet" href="/main.59468b17.css" />
</head>
<body>
<div id="app"></div>
<script src="/runtime.5ce6fe71.js"></script>
<script src="/vendors.95bdb4bd.js"></script>
<script src="/main.3047e806.js"></script>
</body>
</html>
```

`<script>` / `<link>` 引用的是**从 assets 现读出来的最终文件名**。这就是 `HtmlWebpackPlugin` 不让你手写 `<script src="app.js">` 的原因——hash 变了它自动跟着变。`<div id="app">` 是 Vue 的挂载点（`src/index.js` 里 `createApp(App).use(router).mount('#app')` 对的就是它）；三个 `<script>` 的顺序由 `entrypoint.getFiles()` 保证——`runtime` → `vendors` → `main`，运行时先就位。

### 4.4 三个插件都遵守同一条纪律

**产出新文件用 `compilation.emitAsset`，覆盖已有产物用 `compilation.updateAsset`，不要自己 `fs.writeFileSync`。** 手写 `fs.writeFileSync` 也能"看起来能用"，但会漏掉三件事：不参与 `output.clean`、不进 stats、不跟随 watch 模式。

### 4.5 stage：一堆插件挤在 `processAssets` 上，谁先谁后

几乎所有"动产物"的插件都挂在这一个钩子上。它们之间不按注册顺序排队，而按 `stage` 数值——数字小的先执行：

| stage | 常量 | 本篇谁在这一层 | 官方常见插件 |
| ---- | ---- | ---- | ---- |
| -2000 | `PROCESS_ASSETS_STAGE_ADDITIONAL` | — | `CopyPlugin`（复制静态资源） |
| -100 | `PROCESS_ASSETS_STAGE_ADDITIONS` | `MiniCssExtractPlugin`（产出 `.css`） | — |
| 400 | `PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE` | `MiniTerserPlugin`（压缩 `.js`） | `TerserPlugin` |
| 700 | `PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE` | — | `HtmlWebpackPlugin` |
| 1000 | `PROCESS_ASSETS_STAGE_SUMMARIZE` | `MiniHtmlPlugin`（注入标签、产出 `index.html`） | — |
| 2500 | `PROCESS_ASSETS_STAGE_OPTIMIZE_HASH` | — | `RealContentHashPlugin` |

顺序就是依赖关系：**先产出 CSS（-100）→ 再压缩 JS（400）→ 最后注入标签（1000）**。stage 填错就会出现"HTML 里引用的是压缩前的旧文件名"这类问题。

### 4.6 主干钩子速查（webpack 5）

读图只能记住，这张表用来查"某个时机能不能拿到我要的数据"：

| 钩子 | 阶段 | 此刻能看到 | 谁在这一步干活 |
| ---- | ---- | ---- | ---- |
| `compiler.hooks.beforeRun` | 启动 | 还没开始解析 | 读外部配置、清理目录 |
| `compiler.hooks.thisCompilation` | 编译前 | 空的 | 注册 compilation 级钩子的**最后时机** |
| `compiler.hooks.make` | 建模块 | 0 个模块 | 开始递归解析依赖、逐个跑 loader |
| `compilation.hooks.finishModules` | 建模块末 | 模块图完成 | 模块解析结束、尚未分 chunk |
| `compilation.hooks.seal` | 封装 | 模块图已冻结 | 此后不能再加模块 |
| `compilation.hooks.optimizeChunks` | 优化 | chunk 已切分 | `SplitChunksPlugin` |
| `compilation.hooks.processAssets` | 产物 | 全部产物就绪 | 压缩、生成 HTML、改 assets 的**唯一安全窗口** |
| `compiler.hooks.emit` | 收尾 | 产物即将写盘 | `CleanPlugin`、统计校验 |
| `compiler.hooks.done` | 收尾末 | stats 可用 | 报告、通知类插件 |

记住三件事：`thisCompilation` 之后注册 compilation 级钩子就晚了；`seal` 之后模块图冻结；`processAssets` 是动产物内容的唯一安全窗口——早于此产物尚未生成，晚于此已经写盘。

## 五、代码分割与压缩

`optimization` 是"生产产物怎么组织"的总开关。单入口下，代码分割靠两条：**动态 `import()`** 切懒加载 chunk，**splitChunks** 把 node_modules 与公共模块拆出来。

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
},
```

`cacheGroups` 里其实是**两种不同的抽取规则**，别混成一句话：

- **`vendor`**：按范围切，**不设 `minChunks`**（默认 1）。凡是命中 `test: /node_modules/` 且体积过 `minSize` 的模块都会进 `vendors`，与"被几个入口引用"无关。
- **`common`**：才管"被引用次数"——`minChunks: 2` 表示业务模块要被两个以上 chunk 复用才会被抽。
- **`priority`**：`vendor=10 > common=5`，数值大优先；node_modules 模块因此永远先归 vendors。

模块要被抽出来得**同时满足**三个条件：`minChunks`（被引用次数够）、`minSize`（体积够大，默认 20000 字节 ≈ 20KB）、命中 `cacheGroups` 规则。缺一个都不抽——"我明明配了 cacheGroups 却没生效"通常就是被 20KB 的下限挡住了。

单入口场景下最自然的分割是**路由级懒加载**：`vue-router` 路由表里写 `component: () => import('./views/Home.vue')`，`() => import()` 就是动态 `import()`，webpack 会为每个视图切出独立 chunk，首屏不下载。`src/router.js` 里两条路由各切一个：

> 摘自 `./code/webpack-lab/src/router.js`（运行：`npm run build`）

```js
import { createRouter, createWebHistory } from 'vue-router'

// 路由级懒加载：() => import() 是动态 import，webpack 会为每个视图切出独立 chunk，首屏不下载
const routes = [
    { path: '/', name: 'home', component: () => import('./views/Home.vue') },
    { path: '/about', name: 'about', component: () => import('./views/About.vue') }
]

export default createRouter({
    history: createWebHistory(),
    routes
})
```

实测产物（`npm run build`）：

```
assets by status 89.1 KiB [cached] 6 assets
assets by path . 1.58 KiB
  asset main.59468b17.css 1.18 KiB [compared for emit]
  asset index.html 412 bytes [compared for emit]
Entrypoint main 87.6 KiB = runtime.5ce6fe71.js 2.62 KiB vendors.95bdb4bd.js 83.8 KiB main.3047e806.js 1.14 KiB
chunk (runtime: runtime) vendors.95bdb4bd.js (vendors) (id hint: vendor) 518 KiB [initial] [rendered] split chunk (cache group: vendor) (name: vendors)
  dependent modules 350 KiB [dependent] 3 modules
  cacheable modules 168 KiB
    ./node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js 63.1 KiB [built] [code generated]
    ./node_modules/vue-loader/dist/exportHelper.js 328 bytes [built] [code generated]
    ./node_modules/vue-router/dist/vue-router.mjs + 1 modules 105 KiB [built] [code generated]
chunk (runtime: runtime) 114.8406850f.chunk.js 739 bytes [rendered]
  ./src/views/About.vue + 1 modules 739 bytes [built] [code generated]
chunk (runtime: runtime) runtime.5ce6fe71.js (runtime) 6.67 KiB [entry] [rendered]
  runtime modules 6.67 KiB 10 modules
chunk (runtime: runtime) 353.8be785fb.chunk.js 2.5 KiB [rendered]
  ./src/views/Home.vue + 4 modules 2.5 KiB [built] [code generated]
chunk (runtime: runtime) main.3047e806.js (main) 2.73 KiB [initial] [rendered]
  ./src/index.js + 3 modules 2.73 KiB [built] [code generated]
webpack 5.111.1 compiled successfully in 1296 ms
```

五处产出层层咬合：`runtime.*.js` 是 `runtimeChunk: 'single'` 抽出的独立运行时；`vendors.*.js` 83.8 KiB 是 `node_modules`——现在里面装的是 `vue` / `vue-router`（`cacheGroups.vendor` 命中即抽，与"被引用几次"无关）；`main.*.js` 是入口 `src/index.js`；`353.*.chunk.js` 与 `114.*.chunk.js` 分别是 `Home.vue` / `About.vue` 两个路由视图，由路由表里的 `() => import()` 切出，导航到对应路径时才下载；`main.*.css` 是手写 CSS 链的产出（3 个模块：`style.css` + 两个 SFC 的 `<style>`）。

压缩由手写 `MiniTerserPlugin` 完成，实测体积（Vue 全家桶进 vendors 后收益最明显）：

```
  [MiniCssExtractPlugin] 汇总 3 个模块 → main.59468b17.css
  [MiniTerserPlugin] main.ed8ebf5a.js: 4.21 KB → 1.09 KB
  [MiniTerserPlugin] runtime.16c33436.js: 10.74 KB → 2.62 KB
  [MiniTerserPlugin] 353.64eba12b.chunk.js: 3.25 KB → 0.75 KB
  [MiniTerserPlugin] 114.f5da8e68.chunk.js: 1.42 KB → 0.35 KB
  [MiniTerserPlugin] vendors.3d11f649.js: 492.43 KB → 83.84 KB
  [MiniHtmlPlugin] 注入 3 个 script / 1 个 link → index.html
```

注意日志里的文件名和上面 stats 里的对不上：`MiniTerserPlugin` 挂在 `OPTIMIZE_SIZE(400)`，此时文件名是按**压缩前**内容算的；压缩改了内容，webpack 随后在 `OPTIMIZE_HASH(2500)` 用 `RealContentHashPlugin` 重算 hash（见 4.5 的 stage 表），所以最终文件名是 `main.3047e806.js` 这一批。

## 六、两个命令与预览

配套代码只有两个 webpack 命令，且**不传任何 `--env` 参数**——配置本身就是一份生产配置，两个命令的差别只在于"有没有被 dev-server 包一层"：

| 命令 | 做什么 | 产物 / 服务 |
| ---- | ---- | ---- |
| `npm run build` | production 构建，写盘 | `webpack-lab/dist/` |
| `npm run preview` | production 构建 + 起 dev-server 预览真实产物 | 写盘 + 内存，端口 5180，自动开浏览器 |

第八节的最小 webpack 是**独立项目** `code/mini-webpack/`，命令不在 webpack-lab 里（见那一节）。

分流靠 `webpack-cli` 自动注入的 `env.WEBPACK_SERVE`，不需要自定义环境变量，也不需要第二份配置文件：

> 摘自 `./code/webpack-lab/webpack.config.cjs`（运行：`npm run preview`）

```js
// 只有 npm run preview 才挂 dev-server
if (isServe) {
    config.devServer = {
        port: 5180,
        open: true,
        hot: false,
        // 不注入 dev-server 客户端。否则它会往 entry 里塞一段 node_modules 里的代码，
        // 被 splitChunks 抽成 vendors chunk，预览到的就不是纯生产产物了
        client: false,
        // 预览的是真实产物：既写盘也服务，和 npm run build 的输出一致
        devMiddleware: { writeToDisk: true },
        static: { directory: path.join(ROOT, 'dist'), watch: false }
    }
}
```

两个配置项值得单独说：

- **`client: false`**：dev-server 默认会往 entry 里注入一段自己的客户端代码（HMR / 重连逻辑）。它来自 node_modules，会被 `splitChunks` 抽成 `vendors` chunk——预览到的就不是纯生产产物了。关掉它，预览页与 `build` 的产物完全一致。
- **`writeToDisk: true`**：预览时既写盘也服务，`dist/` 里的文件与 `build` 命令的输出相同，方便对照。

`preview` 是自包含的——自己编译、自己写盘、自己起服务，不依赖先执行过 `build`。

## 七、断点调试

调试自己写的 loader / plugin，不需要任何"调试插件"——断点直接打在 `loaders/*.cjs`、`plugins/*.cjs`、`webpack.config.cjs` 里就能命中，因为它们是我们自己的源码，不在 `node_modules`。

唯一要解决的是**入口**：`npm run build` 的链路是 `npm.cmd → node → … → webpack-cli`，中间隔了一层，Windows 下 `--inspect-brk` 传不到 node。所以用 VS Code 的 `launch.json`，让 `program` 走 npm 命令：

> 摘自 `./code/webpack-lab/.vscode/launch.json`（运行：`npm run build`）

```jsonc
{
    // 以 webpack-lab 为工作区根打开时可直接 F5。
    // 走 npm 命令而不是直接指向 cli.js：改脚本不用改这里。
    // 断点直接打在 loaders/*.cjs、plugins/*.cjs、webpack.config.cjs 里就能命中。
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "调试 webpack 构建",
            "runtimeExecutable": "npm",
            "runtimeArgs": ["run", "build"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        }
    ]
}
```

`runtimeExecutable: "npm"` + `runtimeArgs: ["run", "build"]` 就是"用 npm 命令方式调试"——改脚本不用改 `launch.json`。位置在 `webpack-lab/.vscode/launch.json`，以 `webpack-lab` 为工作区根打开时可直接 F5。

三条注意：

- 调试用 `build`（单次执行、进程会退出）；`preview` 会起常驻服务，不适合打断点。
- 断点打在 `processAssets` 回调里，就能看到 `compilation.assets` 的最终形态；打在 loader 里，能看到 `source` 与返回值。
- 若断点不命中，退回到 `program` 直指 `node_modules/webpack-cli/bin/cli.js`（`args` 带 `--config`）这一备用写法。若以仓库根为工作区打开 VS Code，嵌套的 `.vscode/launch.json` 不生效，需把这段配置合并进根配置。

## 八、mini-webpack：约百行看懂执行流程

前面的钩子速查是"纸上顺序"，`mini-webpack` 把它变成能跑的代码。它是**独立项目**（`code/mini-webpack/`，与 webpack-lab 平级、单独 `npm install`、`npm run mini`），复刻 webpack 的 **Compiler → Compilation → Module → Chunk → Asset** 五对象流水线：极简的 Hook（就是 tapable 的原理）、make 建图、seal 冻结、emit 写盘。

核心能力按对象拆进 `lib/`，**一个文件一个概念**，`index.cjs` 只做编排与演示：

| 文件 | 承担的概念 |
| --- | --- |
| `lib/hook.cjs` | tapable 极简版：先注册、后触发 |
| `lib/compiler.cjs` | Compiler：配置 + hooks + `make → seal → emit` |
| `lib/compilation.cjs` | Compilation：一次编译的容器（modules / chunks / assets） |
| `lib/module.cjs` | Module：一个源文件 |
| `lib/resolver.cjs` | 依赖寻址：相对路径 → 磁盘绝对路径 |
| `lib/graph.cjs` | make 阶段：DFS 建模块图 |
| `lib/transpile.cjs` | ESM → CJS |
| `lib/runtime.cjs` | 把模块图拼成可执行产物 |
| `lib/emit.cjs` | emit 阶段：渲染 + 写盘 |
| `plugins/emit-list.cjs` | 示例插件 |

先看 `lib/hook.cjs`——tapable 的极简版，"先注册、后触发"就是它的全部：

> 摘自 `./code/mini-webpack/lib/hook.cjs`（运行：`npm run mini`）

```js
class Hook {
    constructor() {
        this.taps = []
    }
    tap(name, fn) {
        this.taps.push({ name, fn })
    }
    call(...args) {
        for (const t of this.taps) t.fn(...args)
    }
}
```

`lib/compiler.cjs` 持有配置与 hooks，`run()` 就是那条流水线本身：

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

`make` 钩子的实现单独放在 `lib/graph.cjs`——建图的两个要点（**先登记再递归**防循环依赖、**按文件去重**）都在这里：

> 摘自 `./code/mini-webpack/lib/graph.cjs`（运行：`npm run mini`）

```js
const visit = fileName => {
    if (visited.has(fileName)) return
    visited.add(fileName)

    const code = fs.readFileSync(fileName, 'utf8')
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })

    // 只认静态 import；裸模块（不以 . 开头）交给 resolver 报错
    const deps = []
    for (const node of ast.body) {
        if (node.type !== 'ImportDeclaration') continue
        if (node.source.value.startsWith('.')) deps.push(resolve(fileName, node.source.value))
    }

    // id = modules.size：发现顺序即编号，入口最先登记所以是 0
    const module = new Module(compilation.modules.size, fileName, code, deps)
    compilation.modules.set(module.id, module)

    for (const dep of deps) visit(dep)
}
```

`seal` 里只有一个动作——所有模块进一个 chunk（注释明说了真实 webpack 在这儿按 splitChunks 切多个 chunk）。`emit` 钩子交给 `lib/emit.cjs`：把 chunk 渲染成 asset 并写盘，产物先登记进 `compilation.assets`，之后注册的插件（如 `EmitListPlugin`）就能读到清单。渲染本身是最关键的**运行时生成**：把每个模块包成 `function(module, exports, require)`，再加一个缓存版 `require`，最后 `require(0)` 启动入口。webpack 产物里那坨压缩代码，拆开看就是这个：

> 摘自 `./code/mini-webpack/lib/runtime.cjs`（运行：`npm run mini`）

```js
const runtime = `(function () {
  var modules = { ${modulesCode.join(',\n')} }
  // …
  require(0)
})();`
```

产物**真的能跑**——入口 `var greet = require(1)`，`greet.js` 的 `export default` 转成 `module.exports =`，脚本最后用子进程把产物执行一遍：

```
产物实际执行（node dist-min/bundle.js）：
  entry 用到: hello min-webpack
```

对照第一节和 4.6 节能看到同一套骨架：真正执行的是运行时 `require(0)` → 逐个拉模块、`module.exports` 接力；webpack 5 的差别只是把这张模块表拆进多个 chunk、加了代码分割与懒加载的 `__webpack_require__.e`，架构没变。**先看懂这个约百行的版本，再去读 webpack 源码就不会迷路。**

## 配套代码

本篇示例来自 `code/webpack-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/webpack-lab/package.json` | 两个命令：`build` / `preview`；依赖 `vue` / `vue-router` / `vue-loader` | 六 |
| `./code/webpack-lab/webpack.config.cjs` | **唯一配置**：单入口 / `.vue` 规则 + `VueLoaderPlugin` / loader 链 / 手写插件 / splitChunks / runtimeChunk，`WEBPACK_SERVE` 分流 build 与 preview | 二、五、六 |
| `./code/webpack-lab/loaders/css-loader.cjs` | 手写 css-loader：内联 `@import` + 改写 `url()` | 三 |
| `./code/webpack-lab/loaders/extract-css-loader.cjs` | 手写 extract loader：pitch 阶段登记 CSS 文本 | 三 |
| `./code/webpack-lab/plugins/mini-css-extract-plugin.cjs` | 手写 MiniCssExtractPlugin：汇总 CSS 成独立文件 | 四 |
| `./code/webpack-lab/plugins/mini-terser-plugin.cjs` | 手写 TerserPlugin：压缩 `.js` 产物 | 四 |
| `./code/webpack-lab/plugins/mini-html-plugin.cjs` | 手写 HtmlWebpackPlugin：现读 assets 生成 HTML（挂载点 `#app`） | 四 |
| `./code/webpack-lab/src/index.js` | 入口：`createApp(App).use(router).mount('#app')` | 二、五 |
| `./code/webpack-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件（含 `<style scoped>`） | 二、三、五 |
| `./code/webpack-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 五 |
| `./code/webpack-lab/src/style.css`、`base.css`、`logo.svg` | 样式与资源样本（`@import` 内联 / `url()` 改写） | 三 |
| `./code/webpack-lab/.vscode/launch.json` | VS Code 调试配置（`program` 走 npm 命令） | 七 |
| `./code/mini-webpack/index.cjs` | 最小 webpack 入口：注册内置 make/seal/emit、apply 插件、跑演示并执行产物 | 八 |
| `./code/mini-webpack/lib/hook.cjs` | 极简 Hook：tapable 的原理 | 八 |
| `./code/mini-webpack/lib/compiler.cjs` | Compiler：持有配置与 hooks，`run()` 走 make → seal → emit | 八 |
| `./code/mini-webpack/lib/compilation.cjs` | Compilation：Module / Chunk / Asset 的容器 | 八 |
| `./code/mini-webpack/lib/module.cjs` | Module：一个源文件（转换后的结果） | 八 |
| `./code/mini-webpack/lib/resolver.cjs` | 依赖解析：相对路径 → 磁盘上的真实文件 | 八 |
| `./code/mini-webpack/lib/graph.cjs` | make 阶段：DFS 建模块图（防环 + 去重） | 八 |
| `./code/mini-webpack/lib/transpile.cjs` | 转换：ESM → CJS | 八 |
| `./code/mini-webpack/lib/runtime.cjs` | 运行时生成：模块表 + 缓存版 require | 八 |
| `./code/mini-webpack/lib/emit.cjs` | emit 阶段：渲染 + 写盘、登记 assets | 八 |
| `./code/mini-webpack/plugins/emit-list.cjs` | 演示插件：emit 时打印产物清单 | 八 |
| `./code/mini-webpack/src/` | 演示源码（entry / greet） | 八 |

运行：`cd code/webpack-lab && npm install`，然后 `npm run build`（构建）、`npm run preview`（预览）。

第八节的 `mini-webpack` 是**独立项目**：`cd code/mini-webpack && npm install && npm run mini`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[手写 mini-bundler](./手写%20mini-bundler.md)
- 下一篇：[Vite](./Vite.md)
- [webpack 官方文档](https://webpack.js.org/concepts/)
- [webpack 钩子列表](https://webpack.js.org/api/compiler-hooks/)