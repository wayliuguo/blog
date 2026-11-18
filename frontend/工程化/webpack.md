# webpack

本篇配两个工程，各管一半：

| 工程 | 是什么 | 用在哪 |
| --- | --- | --- |
| `./code/h5-webpack/` | 「赴演记 H5」的 webpack 版：与 Vite 篇同一个应用、同一份业务源码，产出同一套 chunk | 使用 & 核心模型、工程化 & 性能 |
| `./code/webpack-lab/` | Loader / Plugin 实验工程：手写 css-loader、抽离 loader 与三个产物插件 | Loader 与 Plugin |

两篇的验收口径一致：`h5-vite` 与 `h5-webpack` 跑同一个后端、同一批页面，产物按 gzip 对比。

## 使用 & 核心模型

### 核心设计思想

```
入口 ──递归解析 import──> 模块图 ──按规则分 chunk──> 每个 chunk 包一层运行时 ──> assets
```

与 Vite「dev 不打包」相反，webpack 从始至终只做一件事：**先把整张图打进 bundle，再交给浏览器**。dev server 只是把产物放在内存里，编译流程与生产完全一致——所以 `h5-webpack` 的 dev 也能起 HMR，只是不用另外一套「按请求转译」的引擎。

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

### 基础使用

`h5-webpack` 的依赖清单（pnpm 管理）：

| 类型 | 包 | 作用 |
| --- | --- | --- |
| 运行时 | `vue`、`vue-router`、`pinia`、`vant`、`axios` | 与 Vite 版完全相同 |
| 编译 | `webpack`、`webpack-cli`、`webpack-dev-server` | 构建器、命令行、dev server |
| 编译 | `vue-loader`、`@vue/compiler-sfc`、`ts-loader` | SFC 与 TS 转译（只转译，不查类型） |
| 编译 | `css-loader`、`mini-css-extract-plugin` | CSS 解析与抽离 |
| 产物 | `html-webpack-plugin`、`compression-webpack-plugin`、`terser-webpack-plugin` | HTML、gzip、压缩 |
| 其他 | `typescript`、`vue-tsc`、`unplugin-auto-import`、`unplugin-vue-components` | 类型检查与按需引入 |

脚本与端口：

| 命令 | 做什么 | 端口 / 产物 |
| --- | --- | --- |
| `pnpm dev` | `webpack serve --mode development`，内存产物 + HMR，`/api` 走代理 | 5185 |
| `pnpm build` | `vue-tsc --noEmit` + `webpack --mode production` | `dist/` |
| `pnpm build:only` | 跳过类型检查直接构建 | `dist/` |
| `pnpm preview` | 以 production 配置起 dev server | 5185（内存产物） |
| `pnpm typecheck` | 只跑类型检查 | — |

配置只有五类：

| 类别 | 作用 | 关键项 |
| --- | --- | --- |
| 入口 | 从哪开始建图 | `entry`（单入口） |
| 出口 | 产物写到哪、叫什么 | `output.path` / `filename` / `chunkFilename` / `publicPath` |
| 转换 | 单个模块怎么变 | `module.rules` + loader |
| 扩展 | 编译流程里插手 | `plugins` |
| 优化 | 产物怎么组织 | `optimization`（splitChunks / minimize / runtimeChunk） |

`mode` 不是「环境名」，而是一组默认配置的开关：`production` 默认开压缩、作用域提升、`sideEffects` 分析，并通过内置 `DefinePlugin` 把 `process.env.NODE_ENV` 定成 `'production'`。

完整配置（ESM，因为 `package.json` 里有 `"type": "module"`）：

> 摘自 `./code/h5-webpack/webpack.config.mjs`（运行：`pnpm build`）

```js
export default (env, argv) => {
    const mode = argv.mode || 'development'
    const isProd = mode === 'production'
    const fileEnv = loadEnvFiles(mode)
    // 命令行 / CI 注入的真实 token 优先于 .env.local
    const apiToken = process.env.VITE_API_TOKEN ?? fileEnv.VITE_API_TOKEN ?? ''

    return {
        mode,
        entry: './src/main.ts',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'assets/[name].[contenthash:8].js',
            chunkFilename: 'assets/[name].[contenthash:8].js',
            publicPath: '/',
            clean: true
        },
        resolve: {
            // .mjs 必须显式列出：Vant 的 ESM 产物是 .mjs，目录入口是 index.mjs
            extensions: ['.mjs', '.ts', '.js', '.vue', '.json'],
            alias: { '@': path.resolve(__dirname, 'src') }
        },
        module: {
            rules: [
                { test: /\.vue$/, loader: 'vue-loader' },
                // 只转译不查类型（transpileOnly），类型检查交给 vue-tsc，与 Vite 的分工一致
                {
                    test: /\.ts$/,
                    loader: 'ts-loader',
                    options: { transpileOnly: true, appendTsSuffixTo: [/\.vue$/] }
                },
                { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
                {
                    test: /\.(png|jpe?g|gif|svg|webp)$/i,
                    type: 'asset',
                    parser: { dataUrlCondition: { maxSize: 4096 } }
                }
            ]
        },
        plugins: [
            new VueLoaderPlugin(),
            AutoImport({ imports: ['vue', 'vue-router', 'pinia'], dts: 'src/auto-imports.d.ts' }),
            Components({ resolvers: [VantResolver()], dts: 'src/components.d.ts' }),
            new HtmlWebpackPlugin({ template: 'public/index.html' }),
            new MiniCssExtractPlugin({
                filename: 'assets/[name].[contenthash:8].css',
                // 按需引入的 Vant 组件样式来自不同 chunk，顺序告警无实际影响
                ignoreOrder: true
            }),
            // 环境变量的编译期替换：与 Vite 的 import.meta.env 是同一种机制
            new webpack.DefinePlugin({
                __ENV__: JSON.stringify({
                    VITE_APP_TITLE: fileEnv.VITE_APP_TITLE || '赴演记 H5',
                    VITE_API_BASE: fileEnv.VITE_API_BASE || '/api',
                    VITE_ASSET_BASE: fileEnv.VITE_ASSET_BASE || 'https://api.show-track.top',
                    VITE_API_TOKEN: apiToken,
                    DEV: !isProd
                }),
                __VUE_OPTIONS_API__: JSON.stringify(true),
                __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
                __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
            }),
            ...(isProd
                ? [
                      new CompressionPlugin({
                          filename: '[path][base].gz',
                          algorithm: 'gzip',
                          test: /\.(js|css)$/,
                          threshold: 1024
                      })
                  ]
                : [])
        ],
        optimization: { /* 略，见「代码分割」 */ },
        devtool: isProd ? false : 'eval-cheap-module-source-map',
        devServer: {
            port: 5185,
            hot: true,
            historyApiFallback: true,
            client: { overlay: true },
            proxy: [{ context: ['/api'], target: API_TARGET, changeOrigin: true }]
        },
        performance: { hints: false },
        stats: 'minimal'
    }
}
```

五处是移植 Vue + TS + Vant 时最容易踩的：

1. **`resolve.extensions` 必须包含 `.mjs`**。Vant 的 ESM 产物是 `.mjs`，目录入口是 `index.mjs`；漏了它，`import 'vant/es/toast/style'` 会直接报 `Can't resolve`。
2. **`ts-loader` 开 `transpileOnly` + `appendTsSuffixTo`**。前者把类型检查留给 `vue-tsc`（与 Vite 版同一条命令），后者让 `.vue` 里的 `<script lang="ts">` 也能走这条规则。
3. **`DefinePlugin` 只注入一个 `__ENV__` 对象**。散着注 5 个全局变量会让类型声明和业务代码都变脏，收成一个对象后 `src/env.ts` 只改一处。
4. **`MiniCssExtractPlugin` 要 `ignoreOrder: true`**。Vant 的组件样式来自不同 chunk，拼接顺序不稳定，默认会刷一屏 `Conflicting order` 警告——这不是错误。
5. **`devServer.proxy` 是数组形式**，`context` 写明前缀。写成对象形式是 webpack-dev-server 4 的老语法。

三个出口项决定「能不能长缓存」：`[contenthash:8]` 让文件名随内容变，内容不变 CDN 就一直命中；`chunkFilename` 管懒加载切出来的 chunk；`clean: true` 保证每次构建先清空 `dist/`。

#### 环境变量

webpack 没有 `.env` 约定，环境变量分两类：

| 变量 | 谁提供 | 怎么用 |
| --- | --- | --- |
| `process.env.NODE_ENV` | `mode: 'production'` 内置注入 | 源码里直接读，生产分支才会保留 |
| 自定义变量 | 自己写 `loadEnvFiles` + `DefinePlugin` | 值必须 `JSON.stringify` |

`loadEnvFiles` 是工程里唯一一段「自己造轮子」的配置代码——webpack 不像 Vite 自带 `.env` 加载：

> 摘自 `./code/h5-webpack/webpack.config.mjs`（运行：`pnpm build`）

```js
/**
 * 自己读 .env 文件：webpack 不像 Vite 自带 env 加载。
 * 优先级 .env < .env.<mode> < .env.local，只取 VITE_ 前缀。
 */
function loadEnvFiles(mode) {
    const result = {}
    for (const file of ['.env', `.env.${mode}`, '.env.local']) {
        const full = path.resolve(__dirname, file)
        if (!fs.existsSync(full)) continue
        for (const rawLine of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
            const line = rawLine.trim()
            if (!line || line.startsWith('#')) continue
            const index = line.indexOf('=')
            if (index === -1) continue
            const key = line.slice(0, index).trim()
            if (!key.startsWith('VITE_')) continue
            result[key] = line.slice(index + 1).trim()
        }
    }
    return result
}
```

顺序即优先级：后读的文件覆盖先读的，`.env.local` 天然最大。而 `process.env.VITE_API_TOKEN ?? fileEnv.VITE_API_TOKEN` 让 CI 注入的值再压过本地文件——token 只从环境变量走，仓库里只有 `.env.local.example`。

与 Vite 的对照：

| | webpack | Vite |
| --- | --- | --- |
| 注入方式 | `DefinePlugin` 显式定义 | 自动读 `.env*`，`VITE_` 前缀暴露 |
| 读取写法 | `process.env.XXX` / `__ENV__.XXX` | `import.meta.env.XXX` |
| 默认注入 | `process.env.NODE_ENV` | `MODE` / `PROD` / `DEV` / `BASE_URL` |
| 动态 key | 替换不了 | 替换不了 |

`DefinePlugin` 替换的是代码文本，所以 `__VUE_OPTIONS_API__: false` 写布尔值而不是字符串；写 `'false'` 会变成字符串字面量，压缩器判不了真假。

业务侧同样收口到一处，只是来源从 `import.meta.env` 换成全局对象：

> 摘自 `./code/h5-webpack/src/env.ts`

```ts
export const ENV = {
    appTitle: __ENV__.VITE_APP_TITLE || '赴演记 H5',
    apiBase: __ENV__.VITE_API_BASE || '/api',
    assetBase: __ENV__.VITE_ASSET_BASE || 'https://api.show-track.top',
    apiToken: __ENV__.VITE_API_TOKEN || '',
    isDev: __ENV__.DEV
}
```

这就是两个工程唯一的源码差异：`env.ts` + `env.d.ts`（多一行 `declare const __ENV__`）。其余业务代码逐字节相同，因此下文所有读数都可以和 Vite 篇直接对表。

#### 静态资源

webpack 5 用**asset modules** 取代了 `file-loader` / `url-loader`：

| `type` | 行为 | 对应旧 loader |
| --- | --- | --- |
| `asset/resource` | 输出文件，import 得到 URL | `file-loader` |
| `asset/inline` | 转成 data URL | `url-loader` |
| `asset/source` | 导出文件内容字符串 | `raw-loader` |
| `asset` | 按 `parser.dataUrlCondition.maxSize` 自动二选一 | `url-loader` + limit |

本工程的 `maxSize: 4096` 与 Vite 的 `assetsInlineLimit: 4096` 是同一个阈值，行为也一致。海报这类后端地址不走 asset module，仍由 `posterOf()` 拼 `VITE_ASSET_BASE`（见 Vite 篇「静态资源」）。

#### CSS

| 需求 | 方案 |
| --- | --- |
| 普通 CSS | `MiniCssExtractPlugin.loader` + `css-loader`（本工程） |
| CSS Modules | `css-loader` 的 `modules: true`，`import s from './a.css'` |
| Sass / Less | 在 `use` 数组末尾加 `sass-loader` / `less-loader` |
| PostCSS | 在 `use` 数组里加 `postcss-loader` + `postcss.config.js` |
| 运行时注入 | `style-loader`（不出独立 `.css`，见「Loader 与 Plugin」的对比） |

SFC 里的 `<style>` 不需要单独配规则：`VueLoaderPlugin` 会把 `.css` 规则克隆成带 `?vue&type=style` 的版本，`style.css` 与各组件的样式最后汇总进 `main.css` / 各页面的 `.css`。

Vant 的样式同样分两种入口：模板里用到的组件由 `VantResolver` 注入；`showToast` / `showConfirmDialog` 这类函数式组件不经过模板解析，要手动引：

> 摘自 `./code/h5-webpack/src/main.ts`

```ts
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import './styles/index.css'
```

#### 命令

| 命令 | 做什么 | 产物 |
| --- | --- | --- |
| `pnpm dev` | dev server，内存编译 + HMR | 5185 |
| `pnpm build` | 类型检查 + production 构建 | 写盘 `dist/` |
| `pnpm preview` | 以 production 配置起 dev server | 5185，内存产物 |

`preview` **不是**「静态服务 + 磁盘产物」：`webpack serve` 总是构建到内存，`--mode production` 只保证产物是生产版本。要验证真实 `dist/` 目录，用任意静态服务器（`npx serve dist`）——这是与 `vite preview` 的一个实际差异。

### 工程化 & 性能

#### 代码分割

`optimization` 决定产物怎么切。本工程的四个组按依赖来源划分，priority 从高到低：

> 摘自 `./code/h5-webpack/webpack.config.mjs`（运行：`pnpm build`）

```js
optimization: {
    runtimeChunk: 'single',
    splitChunks: {
        cacheGroups: {
            vant: { test: /[\\/]node_modules[\\/]vant[\\/]/, name: 'vant', chunks: 'all', priority: 30 },
            axios: { test: /[\\/]node_modules[\\/]axios[\\/]/, name: 'axios', chunks: 'all', priority: 20 },
            vue: {
                test: /[\\/]node_modules[\\/](vue|@vue|pinia|vue-router)[\\/]/,
                name: 'vue',
                chunks: 'all',
                priority: 10
            },
            vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendor',
                chunks: 'all',
                priority: 1,
                reuseExistingChunk: true
            }
        }
    },
    minimizer: [
        new TerserPlugin({
            terserOptions: { compress: { drop_console: true, drop_debugger: true } }
        })
    ]
}
```

- **`runtimeChunk: 'single'`**：把 webpack 运行时（模块注册表、`require` 实现）单独成文件。不拆的话，运行时一变，所有 chunk 的 hash 全变，CDN 缓存全废。
- **`chunks: 'all'`**：懒加载 chunk 里用到的依赖也要抽出来，否则 `vant` 会被复制进每个页面 chunk。
- **`priority` 决定归属**：`vant` 的路径同时命中 `vendor` 的正则，priority 高的先生效；没写 priority 时由 `minSize` 和默认值兜底，结果不可控。
- **`drop_console` / `drop_debugger`**：与 Vite 侧 `esbuild.drop` 等价，生产产物里没有 `console`。

这四个组的边界与 Vite 的 `manualChunks` 刻意写成一致，产物名可以直接对照。

#### 路由懒加载与 chunk 名

路由表与 Vite 版是同一个文件，靠 `webpackChunkName` 让产物可读：

> 摘自 `./code/h5-webpack/src/router.ts`（运行：`pnpm build`）

```ts
{
    path: '/shows',
    name: 'shows',
    component: () => import(/* webpackChunkName: "list" */ './views/shows/ListView.vue')
},
{
    path: '/shows/new',
    name: 'show-create',
    component: () => import(/* webpackChunkName: "edit" */ './views/shows/EditView.vue')
}
```

不加这个注释，产物就是 `100.js` / `408.js` 这类数字名——能跑，但排查问题时看不出是哪个页面。加完之后 `dist/assets/` 里是 `list.js` / `detail.js` / `stats.js` / `mine.js` / `edit.js`（新增与编辑共用一个 chunk，因为指向同一个组件）。

#### tree-shaking

三个条件同时成立才会真正删代码：

1. **ESM**。CJS 的 `require` 有副作用，静态分析不敢删。
2. **`sideEffects` 声明**。包在 `package.json` 里标 `"sideEffects": false`（或列出有副作用的文件），webpack 才敢整块跳过没被引用的模块。
3. **`minimize: true`**。`usedExports` 只标记「哪些导出没被用」，真正删除靠压缩器的 `dead_code`。

对库作者还有一条：纯函数调用加 `/*#__PURE__*/` 注释，否则压缩器不敢删。

#### 压缩与产物读数

压缩跑在内置 `TerserPlugin` 上（配置见上），它同时把 license 注释抽成一个 `.LICENSE.txt` 文件。gzip 由 `CompressionPlugin` 在 emit 之后补：

> 摘自 `./code/h5-webpack/webpack.config.mjs`（运行：`pnpm build`）

```js
new CompressionPlugin({
    filename: '[path][base].gz',
    algorithm: 'gzip',
    test: /\.(js|css)$/,
    threshold: 1024
})
```

`threshold: 1024` 与 Vite 侧 `vite-plugin-compression` 的配置一致：小于 1KB 的文件不值得再压一份。差别只在命名——Vite 默认产出 `xxx.js.gz` 放在同目录，这里用 `[path][base].gz` 得到同样的结果。

一次 `pnpm build:only` 的实测产物（按 raw 排序）：

```
18 assets / 708 modules
webpack 5.112.2 compiled successfully in 6951 ms

assets/vue.js           111619 B  gzip 41572   ← vue + vue-router + pinia
assets/vant.css         100665 B  gzip 38953   ← 用到的组件样式
assets/vant.js           93689 B  gzip 31722   ← 组件库
assets/axios.js          58678 B  gzip 21138   ← 请求库
assets/edit.js            9602 B  gzip  3747   ← 路由懒加载：新增 / 编辑
assets/list.js            8780 B  gzip  3707   ← 路由懒加载：列表
assets/stats.js           6900 B  gzip  3115   ← 路由懒加载：统计
assets/detail.js          6711 B  gzip  3065   ← 路由懒加载：详情
assets/main.js            5457 B  gzip  2415   ← 入口
assets/mine.js            5239 B  gzip  2644   ← 路由懒加载：我的
assets/runtime.js         4332 B  gzip  2025   ← webpack 运行时
assets/main.css           1190 B  gzip   547
assets/list.css           1044 B  gzip   400
index.html                 630 B
合计 gzip 155.1 kB；整包（含未压缩的小文件与 HTML）≈ 158.7 kB
首屏（HTML + vue + vant + axios + main + runtime + 列表页）≈ 123 kB
```

与 Vite 篇的读数对照：

| | Vite | webpack |
| --- | --- | --- |
| 模块数 | 452（Rolldown 计数） | 708（含 loader 拆出的虚拟模块） |
| 构建耗时 | 1.02 s | 6.9～8.8 s（多次实测） |
| 整包 gzip | ≈ 147.1 kB | ≈ 158.7 kB |
| 路由 chunk 名 | 文件名（`ListView`） | 注释（`list`） |
| 产物目录 | `dist/assets/*.gz` | `dist/assets/*.gz` |

**总量差 12KB 左右（约 8%），不该读成「谁更小」**：两边同名分组的边界不一样——webpack 的 `vue` 组把 Vue 运行时与 `vue-router`、`pinia` 一起归组（111.6 kB），Vite 侧运行时被 Rolldown 归进了 `vant` chunk，所以 `vue` / `vant` 两组不可逐组对比。同一份源码、同一批页面、同一套阈值，产物在同一水位——这才是这个对照要说明的事。

模块数与耗时差的是机制：webpack 每个模块都要过 loader 链（TS 转译、CSS 解析、SFC 三段拆分），Rolldown 用原生实现一次扫描完成。这也是「dev 用 Vite、构建看团队」这条常见分工的来源。

#### 兼容与体积提示

- **`target`**：默认 `'browserslist'`（读 `.browserslistrc` 或 `package.json`），也可显式写 `'web'` / `'es2015'`。它决定运行时与语法降级的程度。
- **`devtool`**：生产 `false`（不出 sourcemap），dev 用 `eval-cheap-module-source-map`——这是 dev 下 5 个页面能秒开的原因之一。
- **`performance.hints`**：默认对超过 244KB 的产物告警；本工程的 `vue.js` 有 111KB、`vant` 一组超过 200KB，显式关掉避免噪音——**关掉提示不等于没有体积问题**，生产里应该用门禁（Vite 篇的 `mini-size-gate` 是同一思路）。

## Loader 与 Plugin

使用篇里的 loader / plugin 全是现成的。这一节换到 `./code/webpack-lab`：除 `vue-loader` 外，CSS 链路与全部产物收尾都是手写，用来把「模块怎么变、产物怎么来」看清。

### Loader 的结构与执行顺序

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

### Plugin 的结构与钩子

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

### 三个易错点

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

## 配套代码

两个独立工程，各自 `pnpm install`（`webpack-lab` 用 `npm install`）后即可运行。

### h5-webpack

「赴演记 H5」的 webpack 版：与 `h5-vite` 同一份业务源码（差异只有 `src/env.ts` 与 `env.d.ts`），同一批页面、同一个后端。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/h5-webpack/package.json` | 五个命令：`dev` / `build` / `build:only` / `preview` / `typecheck` | 基础使用 |
| `./code/h5-webpack/webpack.config.mjs` | **唯一配置**：loader、插件、分组、代理、gzip | 基础使用、代码分割 |
| `./code/h5-webpack/public/index.html` | HTML 模板（入口由 `HtmlWebpackPlugin` 注入，不手写 `<script>`） | 基础使用 |
| `./code/h5-webpack/.env`、`.env.development`、`.env.production` | 环境变量（由 `loadEnvFiles` 读取） | 环境变量 |
| `./code/h5-webpack/.env.local.example` | token 模板（复制为 `.env.local`，已被 gitignore） | 环境变量 |
| `./code/h5-webpack/src/env.ts`、`env.d.ts` | 读 `__ENV__`，全项目唯一注入点 | 环境变量 |
| `./code/h5-webpack/src/main.ts` | 入口脚本：Pinia、Router、Vant 函数式样式 | CSS |
| `./code/h5-webpack/src/router.ts` | 五条路由 + `webpackChunkName` | 路由懒加载与 chunk 名 |
| `./code/h5-webpack/src/views/` | 列表 / 详情 / 新增+编辑 / 统计 / 我的 | 工程化 & 性能 |
| `./code/h5-webpack/src/api/` | `client.ts`（拦截器 + 响应解包）+ `show` / `stats` / `user` | 工程化 & 性能 |
| `./code/h5-webpack/src/stores/me.ts` | Pinia store | 工程化 & 性能 |
| `./code/h5-webpack/src/utils/format.ts` | 金额、费用口径、艺人文本、海报地址、日期倒计时 | 静态资源 |
| `./code/h5-webpack/src/components/ShowCard.vue` | 列表卡片 | — |
| `./code/h5-webpack/src/styles/index.css` | 全局样式 | CSS |

运行：

```bash
cd code/h5-webpack
pnpm install
cp .env.local.example .env.local   # 填入 VITE_API_TOKEN
pnpm dev        # http://localhost:5185
pnpm build      # 类型检查 + 产物到 dist/
```

### webpack-lab

Loader / Plugin 实验工程：单入口 + 手写 CSS 链路 + 三个产物插件，`mode` 恒为 `production`。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/webpack-lab/package.json` | 两个命令：`build` / `preview` | Loader 与 Plugin |
| `./code/webpack-lab/webpack.config.cjs` | **唯一配置**：入口 / 出口 / 规则 / 优化 / 插件 | Loader 与 Plugin |
| `./code/webpack-lab/src/index.js` | 入口：建 Vue 应用 → 装路由 → 挂载 | 基础使用 |
| `./code/webpack-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件 | 代码分割 |
| `./code/webpack-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 路由懒加载与 chunk 名 |
| `./code/webpack-lab/src/style.css`、`src/assets/` | 样式与 svg 资源 | CSS |
| `./code/webpack-lab/loaders/css-loader.cjs` | 手写 css-loader：`@import` 内联 + `url()` 改写 | css-loader |
| `./code/webpack-lab/loaders/extract-css-loader.cjs` | 手写抽离 loader：pitch + `importModule` | extract-css-loader |
| `./code/webpack-lab/plugins/mini-css-extract-plugin.cjs` | 手写 CSS 汇总插件 | MiniCssExtractPlugin |
| `./code/webpack-lab/plugins/mini-html-plugin.cjs` | 手写 HTML 生成插件 | MiniHtmlPlugin |
| `./code/webpack-lab/plugins/mini-terser-plugin.cjs` | 手写压缩插件 | 压缩与产物读数 |

运行：

```bash
cd code/webpack-lab
npm install
npm run build
npm run preview   # http://localhost:5180
```

## 参考

- 本模块总结：[总结](./总结.md)
- 相关篇：[Vite](./Vite.md)
- [webpack 官方文档](https://webpack.js.org/)
- [webpack 插件 API](https://webpack.js.org/api/plugins/)
