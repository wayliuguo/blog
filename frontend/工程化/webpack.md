# webpack

本篇配两个工程，各管一半：

| 工程 | 是什么 | 用在哪 |
| --- | --- | --- |
| `./code/h5-webpack/` | 「赴演记 H5」：Vue 3 + TS + Vue Router + Vant + Axios + Pinia，接真实后端 | 使用层 |
| `./code/webpack-lab/` | Loader / Plugin 实验工程：手写 markdown-loader、css-loader、抽离 loader 与五个产物插件 | 插件 & Loader 原理 |

## 一、使用层（业务落地，简历 / 基础面试）

### 核心概念

```
入口 ──递归解析 import──> 模块图 ──按规则分 chunk──> 每个 chunk 包一层运行时 ──> assets
```

webpack 从始至终只做一件事：**先把整张图打进 bundle，再交给浏览器**。dev server 只是把产物放在内存里，编译流程与生产完全一致——所以 dev 也能起 HMR，用的还是同一套打包引擎。

理解 webpack 的关键是五个对象：

```
Compiler     一次 webpack 进程的入口，持有配置与钩子（只创建一次）
  └─ Compilation   一次具体编译的产物容器，模块、chunk、产物都挂在它上面
       ├─ Module   一个源文件（经过 loader 处理后的结果）
       ├─ Chunk    一组模块的集合（决定「哪些模块进哪个文件」）
       └─ Asset    最终写盘的文件（chunk 渲染后的结果，含 sourcemap）
```

八个名词各就各位：

| 名词 | 是什么 | 在本工程里对应什么 |
| --- | --- | --- |
| Entry | 建图的起点 | `entry: './src/main.ts'` |
| Output | 产物写到哪、叫什么 | `output.path` / `filename` |
| Module | 一个源文件经过 loader 后的形态 | `.vue`、`.ts`、`.css` 各是若干模块 |
| Chunk | 一组模块的集合，最终渲染成文件 | `vant` / `vue` / `list.js` 各是一个 chunk |
| Bundle | chunk 渲染出的产物文件，口语里常与 chunk 混用 | `dist/assets/vant.js` |
| Loader | 转换**单个文件**的函数 | `vue-loader`、`ts-loader`、`css-loader` |
| Plugin | 介入**整个打包生命周期**的对象 | `HtmlWebpackPlugin`、`MiniCssExtractPlugin` |
| Mode | 一组默认配置的开关 | `mode: 'production'` |

这解释了三个常见困惑：

- **`stats` 里模块数和文件数对不上**：模块是 Module，文件是 Asset，中间隔着 Chunk 的分组规则。
- **改一个文件会重新编译很多文件**：Compilation 以模块为单位缓存，模块变则其所属 Chunk 全部重渲染。
- **plugin 能改什么**：挂在 Compiler 上的钩子拿得到配置与整次编译，挂在 Compilation 上的钩子拿得到模块、chunk 和产物。

两个扩展点分工不同（高频考点）：

| | Loader | Plugin |
| --- | --- | --- |
| 作用对象 | **单个模块**的源码 | **整次编译**的流程与产物 |
| 形态 | 导出函数：`source => newSource` | 有 `apply(compiler)` 的对象 |
| 典型任务 | TS / Vue / CSS / 图片转成 JS 能 import 的模块 | 抽 CSS、生成 HTML、压缩、上报 |
| 能否跨文件 | 不能（只看得到当前模块） | 能（拿得到 `compilation.assets`） |

### 基础配置

`h5-webpack` 的依赖清单（pnpm 管理）：

| 类型 | 包 | 作用 |
| --- | --- | --- |
| 运行时 | `vue`、`vue-router`、`pinia` | 视图、路由、状态 |
| 运行时 | `vant` | 移动端组件库 |
| 运行时 | `axios` | 请求后端 |
| 编译 | `webpack`、`webpack-cli`、`webpack-dev-server` | 构建器、命令行、dev server |
| 编译 | `vue-loader`、`@vue/compiler-sfc`、`ts-loader` | SFC 与 TS 转译（只转译，不查类型） |
| 编译 | `css-loader`、`mini-css-extract-plugin` | CSS 解析与抽离 |
| 产物 | `html-webpack-plugin`、`compression-webpack-plugin`、`terser-webpack-plugin` | HTML、gzip、压缩 |
| 其他 | `typescript`、`vue-tsc`、`unplugin-auto-import`、`unplugin-vue-components` | 类型检查与按需引入 |

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
                // 只转译不查类型（transpileOnly），类型检查交给独立的 vue-tsc 命令
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
            // 环境变量的编译期替换：值必须 JSON.stringify，替换的是代码文本
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

五处是搭 Vue + TS + Vant 项目最容易踩的：

1. **`resolve.extensions` 必须包含 `.mjs`**。Vant 的 ESM 产物是 `.mjs`，目录入口是 `index.mjs`；漏了它，`import 'vant/es/toast/style'` 会直接报 `Can't resolve`。
2. **`ts-loader` 开 `transpileOnly` + `appendTsSuffixTo`**。前者把类型检查留给独立的 `vue-tsc` 命令，后者让 `.vue` 里的 `<script lang="ts">` 也能走这条规则。
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

`loadEnvFiles` 是工程里唯一一段「自己造轮子」的配置代码：

> 摘自 `./code/h5-webpack/webpack.config.mjs`（运行：`pnpm build`）

```js
/**
 * 自己读 .env 文件：webpack 没有 .env 约定，加载逻辑得自己写。
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

`DefinePlugin` 的三条机制要记牢：

1. **替换的是代码文本**，所以 `__VUE_OPTIONS_API__: false` 写布尔值而不是字符串；写 `'false'` 会变成字符串字面量，压缩器判不了真假。
2. **没有前缀闸门**，定义了什么就替换什么——数据库密码这类敏感值想不进产物，靠的是别定义，而不是机制兜底。
3. **不能动态拼接 key**，`__ENV__[key]` 替换不了，构建期不知道 `key` 是什么。

业务侧同样收口到一处：

> 摘自 `./code/h5-webpack/src/env.ts`

```ts
export const ENV = {
    appTitle: __ENV__.VITE_APP_TITLE || '赴演记 H5',
    apiBase: __ENV__.VITE_API_BASE || '/api',
    assetBase: __ENV__.VITE_ASSET_BASE || 'https://api.show-track.top',
    apiToken: __ENV__.VITE_API_TOKEN || '',
    isDev: __ENV__.DEV,
    bundler: 'webpack 5'
}
```

#### 静态资源（Asset Modules）

webpack 5 用**asset modules** 取代了 `file-loader` / `url-loader`：

| `type` | 行为 | 对应旧 loader |
| --- | --- | --- |
| `asset/resource` | 输出文件，import 得到 URL | `file-loader` |
| `asset/inline` | 转成 data URL | `url-loader` |
| `asset/source` | 导出文件内容字符串 | `raw-loader` |
| `asset` | 按 `parser.dataUrlCondition.maxSize` 自动二选一 | `url-loader` + limit |

本工程的 `maxSize: 4096` 意为：小于 4KB 的图片直接内联成 data URL，省一次请求；更大的输出成独立文件、拿到带 hash 的 URL。海报这类后端地址不走 asset module，仍由 `posterOf()` 拼 `VITE_ASSET_BASE`（见「环境变量」）。

#### CSS

| 需求 | 方案 |
| --- | --- |
| 普通 CSS | `MiniCssExtractPlugin.loader` + `css-loader`（本工程） |
| CSS Modules | `css-loader` 的 `modules: true`，`import s from './a.css'` |
| Sass / Less | 在 `use` 数组末尾加 `sass-loader` / `less-loader` |
| PostCSS | 在 `use` 数组里加 `postcss-loader` + `postcss.config.js` |
| 运行时注入 | `style-loader`（不出独立 `.css`，对比见「抽离 vs 注入」） |

SFC 里的 `<style>` 不需要单独配规则：`VueLoaderPlugin` 会把 `.css` 规则克隆成带 `?vue&type=style` 的版本，`style.css` 与各组件的样式最后汇总进 `main.css` / 各页面的 `.css`。

Vant 的样式同样分两种入口：模板里用到的组件由 `VantResolver` 注入；`showToast` / `showConfirmDialog` 这类函数式组件不经过模板解析，要手动引：

> 摘自 `./code/h5-webpack/src/main.ts`

```ts
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import './styles/index.css'
```

### 性能优化（高级前端重点）

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
- **`drop_console` / `drop_debugger`**：生产产物里没有调试残留。

分割点除了 cacheGroup，还有两处：

1. **动态 `import()`**：最自然的分割点，见下。
2. **魔法注释**：`import(/* webpackPrefetch: true */ './chart')` 让浏览器**空闲时**预取，下次导航秒开；`webpackPreload: true` 则是**当前导航立即并行下载**（适合当前页面马上要用的资源）。prefetch 面向「将来」，preload 面向「现在」，别混。

#### 路由懒加载与 chunk 名

靠 `webpackChunkName` 让产物可读：

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

#### 缓存策略：三种 hash 与持久化缓存

三种 hash 的粒度从粗到细：

| 占位符 | 粒度 | 后果 |
| --- | --- | --- |
| `[hash]` | 整次构建全局同一个 | 任何文件变了，**所有**产物名全变，缓存全废——只适合内部调试 |
| `[chunkhash]` | 同一 chunk 内共享 | chunk 里任何一个模块变，整个 chunk 的文件名变 |
| `[contenthash]` | 只看文件自身内容 | 适合产物命名：JS / CSS 内容不变，文件名就不变 |

本工程全用 `[contenthash:8]`，再配 `runtimeChunk: 'single'`：运行时单独成文件后，业务 chunk 的内容与运行时解耦，改页面不会让所有 chunk 的 hash 跟着动。

第二层是**构建本身的缓存**。webpack 5 内置持久化缓存，dev 默认开（内存），production 要显式打开：

```js
cache: {
    type: 'filesystem',
    buildDependencies: { config: [__filename] }, // 配置文件变了缓存失效
    name: 'production'
}
```

命中后 rebuild 只重新构建变更的模块及其依赖链，二次构建能快一个数量级。`cache-loader` / `thread-loader` 这类 loader 级方案主要服务 webpack 4——有了 filesystem cache，`cache-loader` 已无必要，`thread-loader` 也只在 loader 特别重（babel 全量转译）时才值得。

#### 构建优化清单

- **Tree-Shaking**：三个条件同时成立才真正删代码——**ESM**（CJS 的 `require` 有副作用，静态分析不敢删）、**`sideEffects` 声明**（包在 `package.json` 里标 `"sideEffects": false`，webpack 才敢整块跳过没被引用的模块）、**`minimize: true`**（`usedExports` 只标记哪些导出没被用，真正删除靠压缩器的 `dead_code`）。对库作者还有一条：纯函数调用加 `/*#__PURE__*/` 注释，否则压缩器不敢删。
- **externals + CDN**：把大依赖（Vue、element-ui 这类）排除出 bundle，用 `<script>` 从 CDN 引入，`import` 指向全局变量。代价是失去按需引入与版本锁定，React/Vue 全家桶场景慎用。
- **DllPlugin（老方案）**：webpack 4 时代把不常变的依赖预打包成 dll，dev 增量编译不再重复处理它们。webpack 5 的持久化缓存 + 预构建已覆盖其价值，新项目不推荐。
- **devtool 选择**：生产 `false`（不出 sourcemap），dev 用 `eval-cheap-module-source-map`——这是 dev 下页面能秒开的原因之一。
- **performance.hints**：默认对超过 244KB 的产物告警；本工程 `vue.js` 有 111KB、`vant` 一组超过 200KB，显式关掉避免噪音——**关掉提示不等于没有体积问题**，生产里应该用门禁（构建期量 gzip，超预算直接报错，见原理篇的 `MiniTerserPlugin` 一节配套思路）。

### 开发体验：devServer 与 HMR

devServer 关键项（本工程配置）：`hot: true` 开热更新；`historyApiFallback` 让 `/shows/123` 这类前端路由回退到 `index.html`；`client.overlay` 把编译错误盖在页面上；`proxy` 把 `/api` 转到真实后端，浏览器全程同源。

**HMR 是模块粒度的热替换，不是全量刷新**。流程四步：

```
文件变更 ──watch──> 重新编译受影响模块 ──HMR runtime 经 WebSocket 收到更新──> module.hot.accept 处理替换 ──失败则整页刷新
```

1. webpack watch 到文件变更，**重新编译**——编译发生在构建器侧，产出 `manifest`（新 hash）+ 更新 chunk。
2. dev server 通过 WebSocket 把 manifest 推给浏览器内嵌的 HMR runtime。
3. runtime 对比 hash 后用 JSONP 拉取更新的 chunk。
4. 沿模块图向上找 `accept` 边界：找到了就执行替换回调，模块状态由业务代码自己接管；找不到就 `location.reload()`。

需要自己接管替换时写 `module.hot`：

```js
if (module.hot) {
    module.hot.accept('./render', () => {
        // 新模块到达：重渲染 / 更新引用
    })
    module.hot.dispose(data => {
        // 保存状态，供新模块恢复
    })
}
```

没有 `accept` 边界会一路冒泡到入口，最后整页刷新——所以「改了没反应还闪了一下」通常是没人 accept。

#### preview 的真实形态

`pnpm preview` 不是「静态服务 + 磁盘产物」：`webpack serve` 总是构建到内存，`--mode production` 只保证产物是生产版本。要验证真实 `dist/` 目录，用任意静态服务器（`npx serve dist`）。

### 产物分析

标准工具是 **webpack-bundle-analyzer**：装上后在 `plugins` 里加 `new BundleAnalyzerPlugin()`（或 `webpack --profile --json > stats.json` 后跑 `npx webpack-bundle-analyzer stats.json`），构建完会打开一张 treemap——矩形面积即产物体积（可切换 gzip），一眼看出「哪个包占掉了大头」。

看图时三个动作：面积大的包先看「用到了多少」（组件库该优化的是按需引入）；同一个模块出现在多个 chunk 说明 cacheGroup 没配好；`module.js?commonjs` 结尾的模块说明走了 CJS，tree-shaking 不生效。

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

`vant` 一组占了总量的五分之一以上，这是组件库的固定成本；继续压只能减少用到的组件，而不是换压缩器。`vue` 组 111.6 kB 是因为 Vue 运行时与 `vue-router`、`pinia` 被同一个 cacheGroup 归并——cacheGroup 表达「我希望怎么分」，最终落点是模块归属规则，配了函数不等于拿到的分组和字面一一对应。

### 版本差异：webpack4 vs webpack5

| 差异点 | webpack 4 | webpack 5 |
| --- | --- | --- |
| 构建缓存 | 无内置；靠 `cache-loader` / `hard-source-webpack-plugin` 民间方案 | 内置**持久化缓存** `cache.type: 'filesystem'` |
| 静态资源 | `file-loader` / `url-loader` / `raw-loader` 三个 loader | 内置 **Asset Modules**（`asset/resource` 等 4 种 `type`） |
| Node polyfill | 自动注入 `crypto` / `process` / `buffer`（node-libs-browser） | **移除自动 polyfill**；前端用到要在 `resolve.fallback` 里显式给包，否则报 `Can't resolve 'crypto'` |
| tree-shaking | 顶层导出级别 | 更强：嵌套属性、CommonJS 也能部分摇掉 |
| 新能力 | — | Module Federation（跨应用模块共享，微前端基座） |

面试中最常被追问的是第一条与第三条：**持久化缓存让「老项目构建慢」的标准答案从 DllPlugin 变成开 filesystem cache**；**移除 polyfill 让「升级后莫名报错」的标准排查动作变成看 `resolve.fallback`**。

## 二、插件 & Loader 原理（面试重头戏）

使用层里的 loader / plugin 全是现成的。这一节换到 `./code/webpack-lab`：除 `vue-loader` 外，CSS 链路与全部产物收尾都是手写，另加两个最简插件（清目录、注入全局变量），用来把「模块怎么变、产物怎么来」看清。

### Loader：本质与执行链

#### 本质：一个函数

loader 的全部秘密一句话：**输入源码字符串，输出代码字符串**。

```js
module.exports = function (source) {
    // this: loader context（resourcePath / addDependency / async / importModule…）
    return newSource
}
```

按返回方式分两类：

- **同步 loader**：直接 `return` 结果；也可以调 `this.callback(null, code, map)` 同时给出 sourcemap 或额外抽象语法。
- **异步 loader**：loader 内部有 IO（读文件、请求）时先 `const callback = this.async()`，算完再 `callback(null, code)`——不调 `this.async()` 就在异步回调里 return，webpack 会拿到 undefined。

#### 链式执行与 pitch

loader 链分两个阶段，方向相反：

```
pitch  （从左往右）: loaderA.pitch → loaderB.pitch → 读取资源
normal （从右往左）: loaderB       ← loaderA       ← 资源内容
```

`use: [extract, css]` 的写法里，`css-loader` 在右、先执行 normal；`extract-css-loader` 在左、后执行 normal。想「在别人之前」拿资源，就用 `pitch`——它从左往右先跑，且能拿到 `remainingRequest`（它右边那条还没跑的链）。pitch 返回了值会**跳过剩余链**直接回卷，这是少数「能截胡」的钩子。

#### loader-runner

webpack 执行 loader 的逻辑被单独抽成了 [loader-runner](https://github.com/webpack/loader-runner) 包——webpack 的模块加载就是调它，它也可以**脱离 webpack 单独跑**：

```js
const { runLoaders } = require('loader-runner')

runLoaders(
    {
        resource: './intro.md',                       // 要处理的文件
        loaders: [require.resolve('./markdown-loader.cjs')],
        readResource: fs.readFile.bind(fs)
    },
    (err, result) => {
        console.log(result.result[0]) // loader 链的最终输出
    }
)
```

写 loader 调试器、做 loader 单测（不装 webpack 就能测）、研究 pitch 顺序，用的都是它。

#### 手写最简 loader：markdown-loader

一个同步 loader，把 `.md` 编译成「导出 HTML 字符串」的 JS 模块：

> 摘自 `./code/webpack-lab/loaders/markdown-loader.cjs`（运行：`npm run build`）

```js
const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function mdToHtml(md) {
    const lines = escapeHtml(md).split(/\r?\n/)
    const out = []
    let inList = false

    for (const line of lines) {
        // 无序列表：连续的 "- " 行收进一个 <ul>
        const li = line.match(/^- (.*)$/)
        if (li) {
            if (!inList) {
                out.push('<ul>')
                inList = true
            }
            out.push(`<li>${li[1]}</li>`)
            continue
        }
        if (inList) {
            out.push('</ul>')
            inList = false
        }

        const h = line.match(/^(#{1,4}) (.*)$/)
        if (h) {
            const level = h[1].length
            out.push(`<h${level}>${h[2]}</h${level}>`)
            continue
        }
        if (!line.trim()) continue
        out.push(`<p>${line}</p>`)
    }
    if (inList) out.push('</ul>')

    // 行内语法在块级结构拼完之后统一替换，避免干扰逐行匹配
    return out
        .join('\n')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// 同步 loader：直接 return；异步 loader 才需要 this.async() + callback
module.exports = function markdownLoader(source) {
    return `export default ${JSON.stringify(mdToHtml(source))}\n`
}
```

三个要点：

1. **输出必须是 JS 代码文本，不是渲染结果**。源码里 `import md from './intro.md'` 拿到的是字符串值，靠的是这里 `export default` 了一个 JS 表达式。
2. **先 escape 再匹配**。HTML 特殊字符先转义，防止 `.md` 内容里的 `<` 被当成标签透传到页面。
3. **`JSON.stringify` 负责把 HTML 变成合法的 JS 字符串字面量**——引号、换行都由它处理，不要手拼。

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

### Plugin：Tapable 与编译生命周期

#### 结构与 Tapable 钩子类型

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

钩子由 **Tapable** 提供——一个独立的发布/订阅库，webpack 所有生命周期事件都是它的实例。钩子类型决定「订阅了多个回调时怎么执行、返回值怎么传递」：

| 钩子类型 | 执行方式 | 订阅方法 |
| --- | --- | --- |
| `SyncHook` | 同步按序执行，返回值被忽略 | `tap` |
| `SyncBailHook` | 同步按序，**返回非 `undefined` 就停止** | `tap` |
| `SyncWaterfallHook` | 同步瀑布，上一个的返回值作为下一个的入参 | `tap` |
| `AsyncSeriesHook` | 异步**串行**，等上一个完成 | `tap` / `tapAsync` / `tapPromise` |
| `AsyncParallelHook` | 异步**并行**，一起跑不等待 | `tapAsync` / `tapPromise` |

两类钩子先分清：

| 钩子来源 | 生命周期 | 能拿到什么 |
| --- | --- | --- |
| `compiler.hooks.*` | 整个 webpack 进程 | 配置、`compilation`、watch 状态 |
| `compilation.hooks.*` | 一次编译 | `modules` / `chunks` / `assets` |

#### 常用钩子与一次编译的时间线

| 钩子 | 挂在哪 | 此刻发生什么 | 典型用途 |
| --- | --- | --- | --- |
| `entryOption` | compiler | 读到 `entry` 配置后 | 替换/追加入口（多页方案） |
| `compile` | compiler | 新一次编译即将开始（watch 下每次重编都触发） | 初始化本次编译的辅助状态 |
| `make` | compiler (compilation) | **从 entry 开始递归建模块**——依赖图的生长阶段 | 添加额外入口模块（如虚拟模块） |
| `buildModule` / `succeedModule` | compilation | 单个模块构建前 / 后 | 统计、跳过模块 |
| `seal` | compilation | 模块收集完毕，开始封包成 chunk | 介入 chunk 划分 |
| `emit` | compiler | **产物已定稿、尚未写盘** | 清目录、上报产物 |
| `afterEmit` | compiler | 写盘之后 | 通知 CI、上传 CDN |
| `done` | compiler | 整个构建结束 | 统计、成功通知 |

背时间线的口诀：**先配入口（entryOption），再开始编译（compile），从入口长出依赖图（make），长完封包（seal），定稿写盘（emit），写完收工（done）**。

产物阶段的操作几乎都挂在 `compilation.hooks.processAssets`，靠 `stage` 数值排队：

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

#### 手写最简插件：清目录（MiniCleanPlugin）

官方等价物是 `output.clean: true` / clean-webpack-plugin。挂在 `compiler.hooks.emit`——产物已定稿、尚未写盘的窗口，拿本次清单做白名单，把上次构建遗留的旧 hash 文件删掉：

> 摘自 `./code/webpack-lab/plugins/mini-clean-plugin.cjs`（运行：`npm run build`）

```js
const fs = require('node:fs')
const path = require('node:path')

class MiniCleanPlugin {
    constructor(options = {}) {
        this.dryRun = options.dryRun === true // 只报不删
        this.name = options.name || 'MiniCleanPlugin'
    }

    apply(compiler) {
        compiler.hooks.emit.tapAsync(this.name, (compilation, callback) => {
            const outDir = compiler.outputPath
            if (!fs.existsSync(outDir)) return callback()

            // 白名单：本次构建要写的所有文件（相对路径统一成 /，Windows 下也一致）
            const keep = new Set(Object.keys(compilation.assets))
            const stale = []

            const walk = dir => {
                for (const name of fs.readdirSync(dir)) {
                    const abs = path.join(dir, name)
                    if (fs.statSync(abs).isDirectory()) {
                        walk(abs)
                        continue
                    }
                    const rel = path.relative(outDir, abs).split(path.sep).join('/')
                    if (!keep.has(rel)) stale.push(abs)
                }
            }
            walk(outDir)

            for (const file of stale) {
                if (!this.dryRun) fs.unlinkSync(file)
                console.log(`  [${this.name}] 删除旧产物 ${path.relative(outDir, file)}`)
            }

            // 删完文件后，空目录一并收缩（depth-first：子目录空了才轮到父目录）
            const prune = dir => {
                let empty = true
                for (const name of fs.readdirSync(dir)) {
                    const abs = path.join(dir, name)
                    if (fs.statSync(abs).isDirectory() ? prune(abs) : false) fs.rmdirSync(abs)
                    else empty = false
                }
                return empty
            }
            prune(outDir)

            console.log(`  [${this.name}] 白名单 ${keep.size} 个文件，清理 ${stale.length} 个旧产物`)
            callback()
        })
    }
}

module.exports = MiniCleanPlugin
```

实测（上次构建的 hash 文件名还在 `dist/` 里，本次内容变了、hash 变了）：

```
  [MiniCleanPlugin] 删除旧产物 353.c934ba21.chunk.js
  [MiniCleanPlugin] 删除旧产物 376.ce1ff4.chunk.js
  …
  [MiniCleanPlugin] 白名单 8 个文件，清理 5 个旧产物
```

三个设计点：

1. **为什么挂在 `emit` 而不是 `afterEmit`**：emit 时白名单（`compilation.assets`）已定稿，且还没写盘——新文件尚未落盘，不存在误删风险；afterEmit 再删就是和新文件抢写盘时序了。
2. **白名单是 `compilation.assets` 的 key**：它是「本次构建一定会写的文件」的权威来源，`output.clean` 内置实现也是同一思路。
3. **本 lab 配置故意 `clean: false`**——把清理交给插件，正好用真实构建验证机制。

#### 手写最简插件：注入全局变量（MiniDefinePlugin）

官方等价物是 DefinePlugin（编译期文本替换）/ BannerPlugin（往产物头部注入）。DefinePlugin 挂在 parser 上做表达式替换，实现复杂；教学版走 BannerPlugin 的路子——往每个 `.js` 产物头部插一行 `window` 全局赋值：

> 摘自 `./code/webpack-lab/plugins/mini-define-plugin.cjs`（运行：`npm run build`）

```js
const webpack = require('webpack')

class MiniDefinePlugin {
    constructor(options = {}) {
        this.globalName = options.globalName || '__APP_VERSION__'
        this.value = options.value || '0.0.0'
        this.name = options.name || 'MiniDefinePlugin'
    }

    apply(compiler) {
        const banner = `window["${this.globalName}"] = ${JSON.stringify(this.value)};\n`

        compiler.hooks.thisCompilation.tap(this.name, compilation => {
            // ① 注入内容参与 chunk hash 计算：版本变了 → 文件名变了 → 缓存失效
            compilation.hooks.chunkHash.tap(this.name, (chunk, hash) => {
                hash.update(banner)
            })

            // ② ADDITIONS(-100)：早于压缩(OPTIMIZE_SIZE/400)，banner 会一起被 terser 处理；
            //    早于 HTML(SUMMARIZE/1000)，HTML 引用到的文件名已带上新 hash
            compilation.hooks.processAssets.tap(
                { name: this.name, stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS },
                () => {
                    let count = 0
                    for (const name of Object.keys(compilation.assets)) {
                        if (!name.endsWith('.js')) continue
                        const source = compilation.assets[name].source().toString()
                        compilation.updateAsset(name, new webpack.sources.RawSource(banner + source))
                        count++
                    }
                    console.log(
                        `  [${this.name}] 注入 ${this.globalName}=${JSON.stringify(this.value)} → ${count} 个 JS 产物`
                    )
                }
            )
        })
    }
}

module.exports = MiniDefinePlugin
```

实测：

```
  [MiniDefinePlugin] 注入 __APP_VERSION__="1.0.0" → 5 个 JS 产物
```

两个设计点：

1. **`chunkHash` 是灵魂**。contenthash 在 processAssets 之前就算完了——只改产物内容，文件名里的 hash 不会变，改版本号也不会让浏览器缓存失效。官方 BannerPlugin 同样 tap 了 `chunkHash` 把 banner 算进 hash，这正是「三个易错点」第 3 条的反例解法。
2. **和 DefinePlugin 的定位差异**：DefinePlugin 在编译期做文本替换（`__VUE_OPTIONS_API__` 变成字面量，死代码能被摇掉）；本插件在产物期注入运行时全局（页面里 `window.__APP_VERSION__` 随时可读）。一个「替换进代码」，一个「挂在全局」。

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

「赴演记 H5」的 webpack 版：Vue 3 + TypeScript + Vue Router + Vant + Axios + Pinia，接真实后端 `https://api.show-track.top`，只做核心闭环五页（列表 / 详情 / 新增 + 编辑 / 统计 / 我的）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/h5-webpack/package.json` | 五个命令：`dev` / `build` / `build:only` / `preview` / `typecheck` | 基础配置 |
| `./code/h5-webpack/webpack.config.mjs` | **唯一配置**：loader、插件、分组、代理、gzip | 基础配置、代码分割 |
| `./code/h5-webpack/public/index.html` | HTML 模板（入口由 `HtmlWebpackPlugin` 注入，不手写 `<script>`） | 基础配置 |
| `./code/h5-webpack/.env`、`.env.development`、`.env.production` | 环境变量（由 `loadEnvFiles` 读取） | 环境变量 |
| `./code/h5-webpack/.env.local.example` | token 模板（复制为 `.env.local`，已被 gitignore） | 环境变量 |
| `./code/h5-webpack/src/env.ts`、`env.d.ts` | 读 `__ENV__`，全项目唯一注入点 | 环境变量 |
| `./code/h5-webpack/src/main.ts` | 入口脚本：Pinia、Router、Vant 函数式样式 | CSS |
| `./code/h5-webpack/src/router.ts` | 五条路由 + `webpackChunkName` | 路由懒加载与 chunk 名 |
| `./code/h5-webpack/src/views/` | 列表 / 详情 / 新增+编辑 / 统计 / 我的 | 性能优化 |
| `./code/h5-webpack/src/api/` | `client.ts`（拦截器 + 响应解包）+ `show` / `stats` / `user` | 性能优化 |
| `./code/h5-webpack/src/stores/me.ts` | Pinia store | 性能优化 |
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

Loader / Plugin 实验工程：单入口 + 手写 loader 链 + 五个手写插件，`mode` 恒为 `production`。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/webpack-lab/package.json` | 两个命令：`build` / `preview` | 插件 & Loader 原理 |
| `./code/webpack-lab/webpack.config.cjs` | **唯一配置**：入口 / 出口 / 规则 / 优化 / 插件 | 插件 & Loader 原理 |
| `./code/webpack-lab/src/index.js` | 入口：建 Vue 应用 → 装路由 → 挂载 + 渲染 markdown demo | 手写最简 loader |
| `./code/webpack-lab/src/intro.md` | markdown-loader 的输入文件 | 手写最简 loader |
| `./code/webpack-lab/src/App.vue`、`src/views/`、`src/components/` | SFC 根组件 + 两个路由视图 + 卡片组件 | 代码分割 |
| `./code/webpack-lab/src/router.js` | 路由表：`() => import()` 路由级懒加载 | 路由懒加载与 chunk 名 |
| `./code/webpack-lab/src/style.css`、`src/assets/` | 样式与 svg 资源 | CSS |
| `./code/webpack-lab/loaders/markdown-loader.cjs` | 手写最简同步 loader：md → HTML 字符串模块 | 手写最简 loader |
| `./code/webpack-lab/loaders/css-loader.cjs` | 手写 css-loader：`@import` 内联 + `url()` 改写 | css-loader |
| `./code/webpack-lab/loaders/extract-css-loader.cjs` | 手写抽离 loader：pitch + `importModule` | extract-css-loader |
| `./code/webpack-lab/plugins/mini-clean-plugin.cjs` | 手写清目录插件（`emit` 钩子） | MiniCleanPlugin |
| `./code/webpack-lab/plugins/mini-define-plugin.cjs` | 手写注入全局变量插件（`chunkHash` + `processAssets`） | MiniDefinePlugin |
| `./code/webpack-lab/plugins/mini-css-extract-plugin.cjs` | 手写 CSS 汇总插件 | MiniCssExtractPlugin |
| `./code/webpack-lab/plugins/mini-html-plugin.cjs` | 手写 HTML 生成插件 | MiniHtmlPlugin |
| `./code/webpack-lab/plugins/mini-terser-plugin.cjs` | 手写压缩插件 | stage 表 |

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
- [loader-runner](https://github.com/webpack/loader-runner)
- [Tapable](https://github.com/webpack/tapable)
