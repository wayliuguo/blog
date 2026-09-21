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
            // cacheGroups：按规则拆包分 chunk。vendors / common 的差异主要看三处：
            // 1. test（命中范围）：vendors 只处理 node_modules，common 面向业务代码
            //    ——“被引用两次以上”是 common 用 minChunks:2 管的；vendors 不设 minChunks
            //    （默认 1），只要命中 node_modules 且体积过 minSize(默认20KB) 就抽进 vendors。
            // 2. priority（优先级，越大越先被选中）：vendors=10 > common=5，
            //    node_modules 模块永远优先归 vendors，不会被业务 common 抢走。
            // 3. reuseExistingChunk：模块若已在某个命中的 chunk 中，直接复用而非再拆一次。
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
        compiler.hooks.emit.tap(this.name, compilation => {
            const names = Object.keys(compilation.assets)
            console.log('\n---- 产物清单（emit 钩子）----')
            for (const n of names) {
                const size = compilation.assets[n].size()
                console.log(`  ${n.padEnd(28)} ${(size / 1024).toFixed(1)} KB`)
            }
            console.log('  chunk 数:', compilation.chunks.size)
        })

        // done：整次构建结束，stats 可用
        compiler.hooks.done.tap(this.name, stats => {
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

### 4.1 钩子全景：一次构建到底发生了什么

只知道"有个 emit 钩子"是不够的。把 compiler / compilation 上的钩子全部 tap 一遍跑一次构建，实测结果如下（webpack 5.111.1，本篇这份 demo：**237 次触发、96 个不同钩子**）：

运行 `npm run webpack:hooks` 可复现，源码见 `./code/build-lab/webpack-lab/hooks-probe.cjs`。

```
【图 1】webpack 一次构建的主干全景（实测 237 次钩子触发 / 96 个不同钩子，webpack 5.111.1）

阶段          │ 钩子（按实测触发顺序）
─────────────┼──────────────────────────────────────────────────────────────────────────
① 初始化     │ validate → environment → afterEnvironment → entryOption → afterPlugins →
              │ afterResolvers → initialize
              │ └ compiler 就绪、配置校验完
② 启动       │ beforeRun → run → readRecords → normalModuleFactory → contextModuleFactory
              │ └ 一次构建开始
③ 编译前     │ beforeCompile → compile → thisCompilation → compilation
              │ └ compilation 诞生
④ 建模块     │ make → addEntry → buildModule → normalModuleLoader → succeedModule →
              │ succeedEntry → finishMake → finishModules
              │ └ 递归解析依赖、逐个跑 loader
⑤ 封装       │ seal → needAdditionalSeal
              │ └ 冻结模块图，此后不能加模块
⑥ 优化       │ optimizeDependencies → beforeChunks → afterChunks → optimize →
              │ optimizeModules → optimizeChunks → optimizeTree → optimizeChunkModules
              │ └ SplitChunks 在这一段切包
⑦ 编号       │ moduleIds → optimizeModuleIds → chunkIds → optimizeChunkIds →
              │ recordModules → recordChunks
              │ └ 定 module.id 与 chunk.id
⑧ 代码生成   │ optimizeCodeGeneration → beforeCodeGeneration → afterCodeGeneration →
              │ beforeRuntimeRequirements → runtimeModule → afterRuntimeRequirements
              │ └ 生成运行时代码
⑨ 哈希       │ beforeHash → chunkHash → contentHash → assetPath → fullHash → afterHash →
              │ recordHash
              │ └ 算 contenthash，文件名落定
⑩ 产物       │ renderManifest → chunkAsset → additionalChunkAssets → additionalAssets →
              │ processAssets → afterProcessAssets
              │ └ 产物逐个生成，改 assets 的最后窗口
⑪ 收尾       │ afterSeal → afterCompile → shouldEmit → emit → assetEmitted → afterEmit →
              │ needAdditionalPass → emitRecords → done
              │ └ 写盘、出结论
```

三件事值得记住：③ 是注册 compilation 级钩子的**最后时机**，错过之后你的 tap 就不会被调用；⑤ 之后不能再往编译里加新模块；⑩ 是动产物内容的唯一安全窗口——早于此产物尚未生成，晚于此已经写盘了。

### 4.2 各阶段能拿到什么

同一个 compilation 对象，不同阶段手里的东西完全不同：

```
【图 2】各阶段能拿到什么（assets / modules / chunks 的实测变化）

  检查点                        assets  modules  chunks  说明
  ──────────────────────────────────────────────────────────────────────────────────────
  compiler.make                 0       0        0       Compilation 刚创建，什么都没有
  compiler.finishMake           0       6        0       模块解析完，还没有 chunk
  compilation.afterChunks       0       6        3       SplitChunks 已切完
  compilation.runtimeModule     0       7→14     3       runtime 模块并入（实测 8 个）
  compilation.renderManifest    0       14       3       开始按 chunk 渲染
  compilation.chunkAsset        1→3     14       3       产物逐个落地
  compilation.processAssets     3       14       3       全部就绪，增删改最后窗口
  compiler.emit                 4       14       3       manifest 已被自定义插件加入
  compiler.done                 4       14       3       Stats 可用，能读 errors/warnings

  同一份编译里 modules 从 6 涨到 14：多出的 8 个是 runtimeModule 钩子现场合成的运行时模块，
  不是你的源码。哈希阶段之后 assets 从 3 到 4，是自定义插件用 emitAsset 补的产物。
```

这张图能直接回答两类问题："我在这儿能不能拿到压缩后的体积"（要到 ⑩ 之后）、"我在这儿能不能拿到模块依赖信息"（⑤ 之前最全，之后模块图就冻结了）。

### 4.3 钩子速查：时机、参数、谁在这一步干活

| 钩子 | 阶段 | 回调参数（实测类型） | 此刻能看到 | 谁在这一步干活 |
| ---- | ---- | ---- | ---- | ---- |
| `compiler.hooks.beforeRun` | ② | `(Compiler)` | 还没开始解析 | 读外部配置、清理目录 |
| `compiler.hooks.thisCompilation` | ③ | `(Compilation, Object)` | 空的 | 注册 compilation 级钩子（不含子编译器） |
| `compiler.hooks.compilation` | ③ | `(Compilation, Object)` | 空的 | 同上，但包含子编译器 |
| `compiler.hooks.make` | ④ | `(Compilation)` | modules 0 | 开始递归解析依赖 |
| `compilation.hooks.buildModule` | ④ | `(JavascriptModule)` | 逐个模块 | 单模块开始构建 |
| `compilation.hooks.normalModuleLoader` | ④ | `(Object, JavascriptModule)` | — | loader 真正执行（5.x 已迁到 `NormalModule.getCompilationHooks`） |
| `compilation.hooks.finishMake` | ④末 | `(Compilation)` | modules 6 | 模块图完成 |
| `compilation.hooks.seal` | ⑤ | 无参 | modules 6 | 冻结模块图 |
| `compilation.hooks.optimizeChunks` | ⑥ | `(Set(3), Array(3))` | chunks 3 | `SplitChunksPlugin` |
| `compilation.hooks.runtimeModule` | ⑧ | `(RuntimeModule, Chunk)` | 7→14 | 现场合成运行时模块 |
| `compilation.hooks.contentHash` | ⑨ | `(Chunk)` | chunks 3 | 每个 chunk 各触发一次 |
| `compilation.hooks.renderManifest` | ⑩ | `(Array(0), Object)` | modules 14 | `JavascriptModulesPlugin`、`mini-css-extract-plugin` |
| `compilation.hooks.chunkAsset` | ⑩ | `(Chunk, String)` | assets 1→3 | 产物逐个落地 |
| `compilation.hooks.processAssets` | ⑩ | `(assets 对象)` | assets 3 | `TerserPlugin`、`HtmlWebpackPlugin`、`CopyPlugin` |
| `compiler.hooks.emit` | ⑪ | `(Compilation)` | assets 4 | `CleanPlugin`、统计校验 |
| `compiler.hooks.afterEmit` | ⑪ | `(Compilation)` | assets 4 | `SizeLimitsPlugin`（体积门禁在这报） |
| `compiler.hooks.done` | ⑪末 | `(Stats)` | 全部结论 | 报告、通知类插件 |

最后一列的插件名是实测出来的：探针会把每个钩子上挂的 tap 全列出来（`npm run webpack:hooks` 的第 4 段），换成常见生产插件配置后（`npm run webpack:hooks -- --prod`）还能看到 `HtmlWebpackPlugin`、`mini-css-extract-plugin`、`TerserPlugin`、`CopyPlugin` 各自挂在哪。顺带一个实测结论：`additionalChunkAssets`、`optimizeChunkAssets`、`afterOptimizeChunkAssets`、`normalModuleLoader` 这四个在 5.x 已经废弃（运行会打 DeprecationWarning），统一改用 `processAssets` + `stage`。

### 4.4 stage：一堆插件挤在 processAssets 上，谁先谁后

几乎所有"动产物"的插件都挂在这一个钩子上。它们之间不按注册顺序排队，而按 `stage` 数值——数字小的先执行：

```
【图 3】processAssets 的 stage 顺序（数字越小越早，实测同一份编译里的注册者）

  stage   常量名                    实测谁在这一层
  ──────────────────────────────────────────────────────────────────────────────────────
  -2000   ADDITIONAL                CopyPlugin（复制静态资源）
  -1000   PRE_PROCESS
  -200    DERIVED
  -100    ADDITIONS
  100     OPTIMIZE
  200     OPTIMIZE_COUNT
  300     OPTIMIZE_COMPATIBILITY
  400     OPTIMIZE_SIZE             TerserPlugin（压缩）
  500     DEV_TOOLING
  700     OPTIMIZE_INLINE           HtmlWebpackPlugin（注入标签）
  1000    SUMMARIZE
  2500    OPTIMIZE_HASH             RealContentHashPlugin
  3000    OPTIMIZE_TRANSFER
  4000    ANALYSE
  5000    REPORT                    WriteManifestPlugin（本篇示例）

  stage 决定顺序：想拿到「压缩后的最终体积」，必须把自己排在 OPTIMIZE_SIZE(400) 之后，
  也就是用 REPORT(5000)——本篇 WriteManifestPlugin 正是这么做的。
```

这张图解释了一件容易出错的事：`CopyPlugin(-2000)` 最先补静态资源，`TerserPlugin(400)` 压缩，`HtmlWebpackPlugin(700)` 再把**压缩后**的文件名注入 HTML，`RealContentHashPlugin(2500)` 最后统一重算 hash。stage 填错就有可能出现"HTML 里引用的是压缩前的旧文件名"。

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
    console.log(
        '   抽出了独立 common chunk：',
        files.some(f => f.startsWith('common'))
    )
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

回到上面的 `cacheGroups`，它里面其实是**两种不同的抽取规则**，别混成一句话：

- **`vendor`**：按范围切，**不设 `minChunks`**（默认 1）。凡是命中 `test: /node_modules/` 且体积极过 `minSize` 的模块都会进 `vendors` chunk，与"被几个入口引用"无关。
- **`common`**：才管"被引用次数"——`minChunks: 2` 表示业务模块要被两个以上 chunk 复用才会被抽。
- **`priority`**：`vendor=10 > common=5`，数值大优先；node_modules 模块因此永远先归 vendors，不会被业务 common 抢走。

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

## 九、断点调试：把插件执行过程亲眼看一遍

前面那些顺序、参数、stage 排队，读图只能记住，上手跑一次才真的理解。这一节讲怎么把断点打进钩子。

### 9.1 入口：别从 `npm run webpack` 开始

调试的第一道坎是入口。`npm run webpack` 的链路是 `npm.cmd → node → … → webpack-cli`，中间隔了一层，Windows 下 `--inspect-brk` 根本传不到 node 上。正确做法是把"跑构建"变成一段普通 JS 文件：

> 摘自 `./code/build-lab/webpack-lab/debug-entry.cjs`（VS Code 里 F5 直接跑这个文件）

```js
class DebugTargetPlugin {
    apply(compiler) {
        // 断点 1：compilation 刚诞生，assets / modules / chunks 此刻都是空的
        compiler.hooks.compilation.tap('DebugTarget', compilation => {
            const snap = () => ({
                assets: compilation.getAssets().length,
                modules: compilation.modules.size,
                chunks: compilation.chunks.size
            })

            // 断点 2：seal 之后不能再往里加模块，这里能看到完整的模块图
            compilation.hooks.seal.tap('DebugTarget', () => {
                debugger
            })

            // 断点 3：产物已就绪，增删改 assets 的最后窗口（stage 决定你在哪一层）
            compilation.hooks.processAssets.tap(
                {
                    name: 'DebugTarget',
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
                },
                assets => {
                    // 在这里可以观察：Object.keys(assets) 就是最终产物清单
                    debugger
                }
            )
        })

        // 断点 4：everything 结束，stats 里是本次构建的全部结论
        compiler.hooks.done.tap('DebugTarget', stats => {
            debugger
        })
    }
}
```

两条路，挑一个：

| 方式 | 怎么做 | 适合 |
| ---- | ---- | ---- |
| VS Code | 在上面文件里点红点 → F5 → 选「调试 webpack 插件」 | 日常开发，改完直接重跑 |
| 纯命令行 | `node --inspect-brk=9229 webpack-lab/debug-entry.cjs`，再打开 `chrome://inspect` | 不想配 IDE，或在服务器上排查 |

VS Code 的 `.vscode/launch.json`（也可直接复制仓库里的这份）：

> 摘自 `./code/build-lab/webpack-lab/debug-launch.json`

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "调试 webpack 插件",
            "program": "${workspaceFolder}/webpack-lab/debug-entry.cjs",
            "cwd": "${workspaceFolder}",
            "skipFiles": ["<node_internals>/**"],
            "console": "integratedTerminal"
        }
    ]
}
```

`program` 指向 `webpack-lab/debug-entry.cjs`，`cwd` 用 build-lab 目录——webpack 是按 cwd 解析 loader 的，指错目录会报"找不到 loader"。

### 9.2 断点该打在哪

按你想验证的事情选位置，别乱打：

- **想知道"这个钩子到底有没有触发"** → 打在钩子回调第一行。触发不了时先看 9.3 的坑一。
- **想知道"此刻我能看到哪些数据"** → 配 4.2 那张图看：在 `compilation.hooks.compilation` 里看空状态，`seal` 里看模块图，`processAssets` 里看 `Object.keys(assets)`。
- **想知道"我的插件为什么排在别人后面"** → 在 4.4 的 stage 表里先确认 stage 值，再去 `processAssets` 断点里看 `assets` 已被谁改过。
- **想知道 tapable 怎么调度的** → 在 `node_modules/tapable/lib/Hook.js` 的 `_call` 上打断点，4.3 表格里那些插件会被一个一个调起来，顺序一目了然。

### 9.3 三个坑

**坑一：缓存会让钩子干脆不触发。** 这是最容易误判的一条。同一份配置连跑两次，实测钩子计数如下：

```
第一次（冷）        {"buildModule":6,"normalModuleLoader":6,"succeedModule":6,"seal":1,"processAssets":1}
第二次（命中缓存）  {"buildModule":0,"normalModuleLoader":0,"succeedModule":0,"seal":1,"processAssets":1}
```

第二次 `buildModule` 系列直接归零——模块从缓存恢复，压根没重新构建。调试时务必 `cache: false` 或先删掉缓存目录，否则会得出"这个钩子根本不执行"的错误结论。`debug-entry.cjs` 里已经强制关掉了。

**坑二：watch 模式进程不退出。** `compiler.watch()` 下 `done` 之后进程会继续等待文件变化，第二轮还会叠加坑一的缓存行为。调试一律用单次 `run`。

**坑三：断点掉进 node_modules 出不来。** webpack 内部调用链很深，一路单步会陷进 `node_modules`。用 `skipFiles` 跳过 node 内部，只在自己写的文件和明确想看的 tapable 源码上停。

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
| `./code/build-lab/webpack-lab/hooks-probe.cjs` | 钩子探针：触发顺序 / 各阶段产物 / stage / 谁挂在哪 | 四、plugin |
| `./code/build-lab/webpack-lab/webpack.prod.config.cjs` | 常见生产插件配置（Html / MiniCss / Terser / Copy） | 四、plugin |
| `./code/build-lab/webpack-lab/debug-entry.cjs` | Node API 调试入口，四个预设断点 | 九、断点调试 |
| `./code/build-lab/webpack-lab/debug-launch.json` | VS Code 调试配置样例 | 九、断点调试 |

运行：`cd code/build-lab && npm install`，然后 `npm run webpack`、`npm run webpack:split`、`npm run webpack:cache`、`npm run webpack:hooks`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[编译与 AST](./编译与%20AST.md)
- 下一篇：[Vite](./Vite.md)
- [webpack 官方文档](https://webpack.js.org/concepts/)
- [webpack 钩子列表](https://webpack.js.org/api/compiler-hooks/)
