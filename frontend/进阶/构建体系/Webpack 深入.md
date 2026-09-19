# Webpack 深入

webpack 仍然是大厂存量项目的主力：微前端的 Module Federation、复杂资源处理、老浏览器兼容，目前都还是它最稳。但它的配置项多到让人望而生畏，多数人停留在"改改现成配置"的阶段。

本篇的目标是把 webpack 拆成五个对象（Compiler / Compilation / Module / Chunk / Asset），理解它们之后，配置就只是"给这几个对象填参数"。所有结论都来自本仓可运行的脚本实测。

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

## 二、配置全览：从入口到产物

> 摘自 `./code/build-lab/webpack-lab/webpack.config.cjs`（运行：`npm run webpack`）

```js
module.exports = {
    mode: 'production',
    // 关掉压缩，方便观察 tree-shaking 之外的产物结构
    optimization: {
        minimize: false,
        splitChunks: {
            chunks: 'all',
            // 默认有体积下限（20KB），小模块不会被抽出来；用环境变量做对照
            minSize: Number(process.env.WP_MIN_SIZE ?? 20000),
            // 把 node_modules 里被引用两次以上的模块抽成 vendors
            cacheGroups: {
                vendor: {
                    test: /node_modules/,
                    name: 'vendors',
                    priority: 10,
                    reuseExistingChunk: true
                },
                common: {
                    minChunks: 2,
                    name: 'common',
                    priority: 5,
                    reuseExistingChunk: true
                }
            }
        }
    },
    entry: {
        main: path.join(ROOT, 'src/index.js'),
        // 两个入口共享 shared / heavy，用来演示 common chunk 的抽取条件
        pageB: path.join(ROOT, 'src/pageB.js')
    },
    output: {
        path: path.join(ROOT, 'dist'),
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
        clean: true
    },
```

配置项的归类其实只有五类：

| 类别 | 作用 | 关键项 |
| ---- | ---- | ---- |
| 入口 | 从哪开始建图 | `entry`（单入口 / 多入口 / 动态入口） |
| 出口 | 产物写到哪、叫什么 | `output.path` / `filename` / `chunkFilename` / `publicPath` |
| 转换 | 单个模块怎么变 | `module.rules` + loader |
| 扩展 | 编译流程里插手 | `plugins` |
| 优化 | 产物怎么组织 | `optimization`（splitChunks / minimize / runtimeChunk） |

`mode` 不是"环境名"，它是**一组默认配置的开关**：`production` 默认开压缩、作用域提升、`sideEffects` 分析；`development` 默认关压缩、开更详细的模块名。很多"生产环境才出现的问题"其实是 `mode` 带出来的行为差异。

## 三、loader：本质是一个字符串函数

loader 的全部秘密就一句话：**输入源码字符串，输出代码字符串**。

> 摘自 `./code/build-lab/webpack-lab/txt-loader.cjs`（运行：`npm run webpack`）

```js
module.exports = function txtLoader(source) {
    // this.query / this.getOptions() 拿 loader 配置
    const options = this.getOptions() || {}
    const varName = options.exportName || 'content'

    // 开发时打印一下，方便看到"loader 被谁、被调用了几次"
    if (options.verbose) {
        console.log('  [txt-loader] 处理:', this.resourcePath.split(/[\\/]/).pop())
    }

    // 关键：返回的是"代码字符串"，不是值
    return `export const ${varName} = ${JSON.stringify(source.trim())};\nexport default ${varName};\n`
}
```

三个容易踩的点：

1. **返回的是代码文本，不是值**。想导出字符串就得自己 `JSON.stringify` 拼进代码里。
2. **loader 链从右往左执行**。`use: ['style-loader', 'css-loader']` 的执行顺序是 css-loader 先、style-loader 后。
3. **loader 会缓存**。开发模式下没改文件就不会重新跑 loader，打印出来的日志看不到第二次——这不是 bug。

实测里这行日志确认了 loader 被正确调用：

```
  [txt-loader] 处理: note.txt
```

自定义 loader 的典型用途：把非标准资源（自定义 DSL、i18n 词条文件、SVG sprite）变成 JS 模块，比引入一个通用 loader 更轻。

## 四、plugin：在钩子上插手

plugin 是一个有 `apply(compiler)` 方法的对象/类。能不能写好 plugin，取决于知不知道有哪些钩子、什么时候触发。

> 摘自 `./code/build-lab/webpack-lab/emit-list-plugin.cjs`（运行：`npm run webpack`）

```js
class EmitListPlugin {
    constructor(options = {}) {
        this.name = options.name || 'EmitListPlugin'
    }
    apply(compiler) {
        // emit：产物即将写盘，此时 compilation.assets 已经就绪
        compiler.hooks.emit.tap(this.name, (compilation) => {
            const names = Object.keys(compilation.assets)
            console.log('\n---- 产物清单（emit 钩子）----')
            for (const n of names) {
                const size = compilation.assets[n].size()
                console.log(`  ${n.padEnd(28)} ${(size / 1024).toFixed(1)} KB`)
            }
            console.log('  chunk 数:', compilation.chunks.size)
        })

        // done：整次构建结束，stats 可用
        compiler.hooks.done.tap(this.name, (stats) => {
            const { errors, warnings } = stats.compilation
            console.log('  构建结束：error', errors.length, '/ warning', warnings.length)
        })
    }
}
```

实测输出：

```
---- 产物清单（emit 钩子）----
  main.40fb3e2b.js             11.4 KB
  pageB.4591e024.js            0.6 KB
  894.b5b3ab40.chunk.js        0.6 KB
  build-manifest.json          0.1 KB
  chunk 数: 3
  构建结束：error 0 / warning 0
```

常用钩子的时机：

| 钩子 | 时机 | 能做什么 |
| ---- | ---- | ---- |
| `compiler.hooks.beforeRun` | 编译开始前 | 读外部配置、清理目录 |
| `compiler.hooks.thisCompilation` | 创建 Compilation 时 | 注册 compilation 级钩子 |
| `compilation.hooks.processAssets` | 产物处理阶段 | 增删改产物（带 `stage` 控制顺序） |
| `compiler.hooks.emit` | 产物写盘前 | 统计、校验 |
| `compiler.hooks.done` | 全部结束 | 输出结果摘要、通知 |

要**产出新文件**时，正确做法是用 `compilation.emitAsset`，而不是 `fs.writeFileSync`：

> 摘自 `./code/build-lab/webpack-lab/emit-list-plugin.cjs`（运行：`npm run webpack`）

```js
compilation.hooks.processAssets.tap(
    {
        name: 'WriteManifestPlugin',
        // 在"产物优化之后、写盘之前"插入，能拿到压缩后的最终体积
        stage: require('webpack').Compilation.PROCESS_ASSETS_STAGE_REPORT
    },
    () => {
        const manifest = {}
        for (const [name, asset] of Object.entries(compilation.assets)) {
            manifest[name] = { size: asset.size() }
        }
        const json = JSON.stringify(manifest, null, 2)
        // 用 emitAsset 而不是 fs.writeFileSync：产物要进 webpack 的输出流
        compilation.emitAsset(
            this.out,
            new (require('webpack').sources.RawSource)(json)
        )
    }
)
```

手写 `fs.writeFileSync` 写进 `output.path` 也能"看起来能用"，但会漏掉三件事：不参与 `clean`、不进 stats、不跟随 watch 模式。

## 五、代码分割：SplitChunks 的三个条件

`optimization.splitChunks` 是"生产环境产物怎么切"的总开关。多数人只知道配 `cacheGroups`，却不知道模块被抽出来要**同时满足**三个条件，缺一个都不抽：

1. **被足够多的 chunk 引用**（`minChunks`）
2. **体积够大**（`minSize`，默认 20000 字节 ≈ 20KB）
3. **不在排除规则里**（`chunks` / `test` / `cacheGroups` 的匹配）

实测对照（两个入口共享 `shared.js` 与 `heavy.js`）：

> 摘自 `./code/build-lab/webpack-lab/split.cjs`（运行：`npm run webpack:split`）

```js
for (const minSize of [20000, 0]) {
    const { files } = build(minSize)
    console.log(`\n---- splitChunks.minSize = ${minSize} ----`)
    for (const f of files.sort()) {
        console.log('  ', f, (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(1), 'KB')
    }
    console.log('   抽出了独立 common chunk：', files.some((f) => f.startsWith('common')))
}
```

```
---- splitChunks.minSize = 20000 ----
   480.10bd4ed9.chunk.js 0.6 KB
   main.5def85e8.js 11.3 KB
   pageB.195146c2.js 0.6 KB
   抽出了独立 common chunk： false

---- splitChunks.minSize = 0 ----
   480.10bd4ed9.chunk.js 0.6 KB
   common.7883b39e.js 0.8 KB
   main.0523ae85.js 12.2 KB
   pageB.9edd52e2.js 5.8 KB
   抽出了独立 common chunk： true
```

同样的代码，只改一个数字，产物从"重复打包"变成"抽出公共块"。这就是为什么"我明明配了 cacheGroups 却没生效"——被 20KB 的下限挡住了。

但要注意反直觉的一点：**抽出来不一定更快**。上面 `minSize=0` 的结果里，两个入口各自变大（main 11.3 → 12.2 KB，pageB 0.6 → 5.8 KB），因为公共块被拆走后，入口里多了跨 chunk 的引用代码；同时浏览器多了一个请求。切分的目标不是"抽得越多越好"，而是：

- **vendor 与业务分离**：vendor 变更频率低，长缓存收益大 → 值得切
- **路由级懒加载**：首屏用不到的代码不加载 → 值得切
- **为了"共享"而共享的小模块**：不值得切

动态 `import()` 是最自然的一种分割：它一定产生独立 chunk，且能按需加载。实测里 `894.chunk.js` 就是这么来的（见 `src/index.js` 里的 `import('./lazy.js')`）。

## 六、构建加速：持久化缓存值不值

webpack 5 的 `cache: { type: 'filesystem' }` 把模块转换结果落盘。听起来必开，但实测显示要看项目规模：

> 摘自 `./code/build-lab/webpack-lab/one-cache.cjs`（运行：`npm run webpack:cache`）

```js
const t0 = performance.now()
webpack(config, (err, stats) => {
    if (err) {
        console.log(JSON.stringify({ ok: false }))
        process.exit(1)
    }
    const info = stats.toJson({ errors: true })
    console.log(
        JSON.stringify({
            ok: info.errors.length === 0,
            buildMs: Math.round(performance.now() - t0),
            // webpack 自报的构建时间（不含 CLI 启动与 Node 启动）
            selfMs: Math.round(info.time),
            errors: info.errors.slice(0, 1)
        })
    )
})
```

实测输出（每次构建都在独立子进程里跑，冷启动那次丢弃）：

```
---- 小样本：webpack-lab/src（4 个模块） ----
  无缓存：构建 3145 ms（webpack 自报 320 ms）/ 进程 3507 ms
  有缓存：构建 3214 ms（webpack 自报 288 ms）/ 进程 3667 ms
  构建提速（按 webpack 自报时间算）：1.11x
  注意：进程内 3145 ms 里约 2825 ms 是 require('webpack') 的固定成本，与缓存无关

---- 大样本：bench/src（200 个模块） ----
  无缓存：构建 4247 ms（webpack 自报 900 ms）/ 进程 4619 ms
  有缓存：构建 4048 ms（webpack 自报 407 ms）/ 进程 4426 ms
  构建提速（按 webpack 自报时间算）：2.21x
  注意：进程内 4247 ms 里约 3347 ms 是 require('webpack') 的固定成本，与缓存无关

---- 结论 ----
小样本 1.11x，大样本 2.21x（按 webpack 自报的构建时间算）
模块越多收益越大：缓存省的是"模块转换"，模块少时还不够抵销读写缓存的开销
进程总耗时比构建耗时多约 378 ms（Node 启动）+ 3347 ms（加载 webpack）
所以持久化缓存不是默认就该开：先量，再决定；真要用，缓存目录要进 CI 缓存
```

这组数据里最有价值的其实是那句"注意"：**`require('webpack')` 本身要 2.8~3.3 秒**。这意味着：

- 用"敲命令到结束"的墙钟时间评估构建优化，会被这 3 秒淹没，得出"优化没效果"的错误结论。
- 想提速，减少 webpack 进程启动次数（比如合并多次构建）可能比调缓存更有效。

缓存的代价也要记账：缓存目录（默认 `node_modules/.cache/webpack`）需要进 CI 缓存，否则 CI 上永远是冷启动；依赖或配置变化时依赖 webpack 的失效逻辑判断，偶尔会有"改了配置没生效"的诡异问题——此时删掉缓存目录是最快的排查手段。

## 七、webpack 运行时的代价

观察实测产物：

```
chunk (runtime: main) main.40fb3e2b.js (main) 981 bytes (javascript) 6.37 KiB (runtime) [entry] [rendered]
  runtime modules 6.37 KiB 8 modules
```

业务代码只有 981 bytes，**webpack 运行时却有 6.37 KiB**——它是模块加载、chunk 加载、hash 映射那一套胶水代码。这解释了两个现象：

1. **小项目用 webpack 打包，产物反而变大**。这也是库（npm 包）不该用 webpack 打包的原因：用户引你的库会多背一份运行时。
2. **`optimization.runtimeChunk: 'single'` 值得开**。把运行时单独抽成一个小文件，业务 chunk 的 hash 就不会因为运行时变化而全部失效——长缓存命中率显著提升。

## 八、什么时候不该用 webpack

诚实地说清楚边界，比无脑推荐更重要：

| 场景 | 更合适的选择 | 原因 |
| ---- | ---- | ---- |
| npm 库 / SDK | Rollup / tsup | 产物干净，无运行时注入 |
| 新业务应用 | Vite | 开发体验差距是数量级的 |
| 只需要 TS 转译 | esbuild / SWC | 一次转换 vs 一次完整编译 |
| webpack 项目想提速 | Rspack | 兼容大部分配置，Rust 实现 |

webpack 仍然无可替代的场景：需要 Module Federation 的微前端、依赖大量 webpack 专有 loader 的老项目、需要精确到模块级的产物控制。

## 小结

- Webpack 深入
  - 五个对象
    - Compiler（进程级）/ Compilation（一次编译）/ Module / Chunk / Asset
    - 模块数 ≠ 文件数，中间隔着 Chunk 分组
  - 配置全览
    - 只有五类：入口 / 出口 / 转换 / 扩展 / 优化
    - `mode` 是一组默认配置的开关，不是环境名
  - loader
    - 本质是"源码字符串 → 代码字符串"的函数
    - 返回的是代码文本；链式从右往左；结果会被缓存
  - plugin
    - 有 `apply(compiler)` 的对象；靠钩子插手编译流程
    - 产出文件用 `compilation.emitAsset`，不要 `fs.writeFileSync`
    - `processAssets` 带 `stage` 控制顺序
  - SplitChunks
    - 三个条件同时满足才抽：minChunks / minSize（默认 20KB）/ 匹配规则
    - 实测：同样代码 minSize 20KB → 不抽，0 → 抽出 common
    - 抽出来不一定更快：vendor 与路由级值得切，小共享模块不值得
  - 持久化缓存
    - 实测小样本 1.11x、大样本 2.21x（按 webpack 自报时间）
    - `require('webpack')` 本身要 2.8~3.3s，墙钟时间会淹没优化效果
    - 缓存目录要进 CI 缓存；诡异问题先删缓存目录
  - 运行时代价
    - 实测业务 981 bytes / 运行时 6.37 KiB
    - 库不该用 webpack 打包；`runtimeChunk: 'single'` 值得开
  - 不该用 webpack 的场景
    - 库用 Rollup、新应用用 Vite、纯转译用 esbuild、提速用 Rspack

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/webpack-lab/webpack.config.cjs` | 配置全览：多入口 / loader / plugin / splitChunks / cache | 二、配置全览 · 五、代码分割 |
| `./code/build-lab/webpack-lab/txt-loader.cjs` | 手写 loader：把 .txt 变成 JS 模块 | 三、loader |
| `./code/build-lab/webpack-lab/emit-list-plugin.cjs` | 手写 plugin：产物清单 + emitAsset 产出 manifest | 四、plugin |
| `./code/build-lab/webpack-lab/src/index.js` | 动态 import 产生异步 chunk | 五、代码分割 |
| `./code/build-lab/webpack-lab/split.cjs` | `minSize` 20000 vs 0 的对照实验 | 五、代码分割 |
| `./code/build-lab/webpack-lab/cache.cjs` | 持久化缓存：小样本 vs 大样本 | 六、构建加速 |
| `./code/build-lab/webpack-lab/one-cache.cjs` | 单次构建采样（独立子进程，避免互相影响） | 六、构建加速 |

运行：`cd code/build-lab && npm install`，然后 `npm run webpack`、`npm run webpack:split`、`npm run webpack:cache`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[编译与 AST](./编译与%20AST.md)
- 下一篇：[Vite](./Vite.md)
- [webpack 官方文档](https://webpack.js.org/concepts/)
- [webpack 钩子列表](https://webpack.js.org/api/compiler-hooks/)
