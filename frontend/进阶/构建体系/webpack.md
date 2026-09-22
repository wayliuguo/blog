# webpack

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
module.exports = (env = {}) => {
    // 场景开关：--env 或 process.env 决定"观测哪个场景"，一份配置跑所有演示
    const flag = k => env[k] === true || env[k] === '1' || process.env[k] === '1'
    const isProd = flag('prod')   // --env prod：官方插件组 Html/MiniCss/Terser/Copy
    const isDrop = flag('drop')   // --env drop：Drop 插件剔除 test/mock
    const isMiniHtml = flag('minihtml') // --env minihtml：用迷你 Html 替代官方
    const isDebug = flag('debug') // --env debug：挂 DebugProbePlugin 打断点

    return {
        mode: 'production',
        // 关掉压缩，方便观察 tree-shaking 之外的产物结构（--env prod 才开压缩）
        optimization: {
            minimize: isProd,
            runtimeChunk: 'single', // 运行时单独一个文件（长缓存）
            splitChunks: {
                chunks: 'all',
                // 默认有体积下限（20KB），小模块不会被抽出来；用环境变量做对照
                minSize: Number(process.env.WP_MIN_SIZE ?? 20000),
                // cacheGroups：按规则拆包分 chunk。vendors / common 的差异主要看三处：
                // 1. test（命中范围）：vendors 只处理 node_modules，common 面向业务代码
                //    ——"被引用两次以上"是 common 用 minChunks:2 管的；vendors 不设 minChunks
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
        // 功能入口：构建期动态返回「多入口」，main 与 pageB 共享
        // shared / heavy，这是演示 common chunk 抽取的典型条件
        entry: () =>
        Promise.resolve({
            main: path.join(ROOT, 'src/index.js'),
            pageB: path.join(ROOT, 'src/pageB.js')
        }),
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
  main.1a4c3706.js             2.0 KB
  pageB.fec65efc.js            1.6 KB
  runtime.dd01471d.js          9.6 KB
  894.b5b3ab40.chunk.js        0.6 KB
  build-manifest.json          0.2 KB
  chunk 数: 4
  构建结束：error 0 / warning 0
```

同一份配置默认开了 `runtimeChunk: 'single'`（第三节开始统一多入口主配置后新增），所以产物比旧版多一个 `runtime.dd01471d.js`，chunk 数从 3 变 4。

### 4.1 钩子全景：一次构建到底发生了什么

只知道"有个 emit 钩子"是不够的。把 compiler / compilation 上的钩子全部 tap 一遍跑一次构建，实测结果如下（webpack 5.111.1，本篇这份 demo：**245 次触发、96 个不同钩子**）：

运行 `npm run webpack:hooks` 可复现，源码见 `./code/build-lab/webpack-lab/hooks-probe.cjs`。

```
【图 1】webpack 一次构建的主干全景（实测 245 次钩子触发 / 96 个不同钩子，webpack 5.111.1）

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
  compilation.afterChunks       0       6        4       SplitChunks 已切完
  compilation.renderManifest    0       14       4       开始按 chunk 渲染（modules 已并入 8 个运行时模块，共 14）
  compilation.chunkAsset        1       14       4       第一个产物已落地
  compilation.processAssets     4       14       4       全部就绪，增删改最后窗口
  compiler.emit                 5       14       4       manifest 已被自定义插件加入
  compiler.done                 5       14       4       Stats 可用，能读 errors/warnings

  同一份编译里 modules 从 6 涨到 14：多出的 8 个是 runtimeModule 钩子现场合成的运行时模块，
  不是你的源码。产物从 processAssets 的 4 个到 emit 的 5 个，是自定义插件用 emitAsset 补的 manifest。
  chunks 从旧 demo 的 3 变 4，是因为开了 runtimeChunk:'single' 多分出一个 runtime chunk。
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
| `compilation.hooks.optimizeChunks` | ⑥ | `(Set(4), Array(4))` | chunks 4 | `SplitChunksPlugin` |
| `compilation.hooks.runtimeModule` | ⑧ | `(RuntimeModule, Chunk)` | 6→14 | 现场合成运行时模块 |
| `compilation.hooks.contentHash` | ⑨ | `(Chunk)` | chunks 4 | 每个 chunk 各触发一次 |
| `compilation.hooks.renderManifest` | ⑩ | `(Array(0), Object)` | modules 14 | `JavascriptModulesPlugin`、`mini-css-extract-plugin` |
| `compilation.hooks.chunkAsset` | ⑩ | `(Chunk, String)` | assets 1 | 产物逐个落地 |
| `compilation.hooks.processAssets` | ⑩ | `(assets 对象)` | assets 4 | `TerserPlugin`、`HtmlWebpackPlugin`、`CopyPlugin` |
| `compiler.hooks.emit` | ⑪ | `(Compilation)` | assets 5 | `CleanPlugin`、统计校验 |
| `compiler.hooks.afterEmit` | ⑪ | `(Compilation)` | assets 5 | `SizeLimitsPlugin`（体积门禁在这报） |
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
   main.0598ddfe.js 2.0 KB
   pageB.f3e60585.js 1.6 KB
   runtime.58e089c3.js 9.5 KB
   抽出了独立 common chunk： false

---- splitChunks.minSize = 0 ----
   480.10bd4ed9.chunk.js 0.6 KB
   common.7883b39e.js 0.8 KB
   main.c8b2d134.js 1.3 KB
   pageB.d6c2e94b.js 0.9 KB
   runtime.58e089c3.js 9.5 KB
   抽出了独立 common chunk： true
```

同样的代码，只改一个数字，产物从"重复打包"变成"抽出公共块"。这就是为什么"我明明配了 cacheGroups 却没生效"——被 20KB 的下限挡住了。

回到上面的 `cacheGroups`，它里面其实是**两种不同的抽取规则**，别混成一句话：

- **`vendor`**：按范围切，**不设 `minChunks`**（默认 1）。凡是命中 `test: /node_modules/` 且体积极过 `minSize` 的模块都会进 `vendors` chunk，与"被几个入口引用"无关。
- **`common`**：才管"被引用次数"——`minChunks: 2` 表示业务模块要被两个以上 chunk 复用才会被抽。
- **`priority`**：`vendor=10 > common=5`，数值大优先；node_modules 模块因此永远先归 vendors，不会被业务 common 抢走。

注意拆分不是免费的：这次 `minSize=0` 虽然抽出了 `common.7883b39e.js`，但入口产物实际变小（main 2.0 → 1.3 KB、pageB 1.6 → 0.9 KB）——公共块被拆走后入口只剩自身代码，代价是浏览器多了一个请求（外加独立 runtime 也占一个请求）。切分的目标不是"抽得越多越好"，而是：

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
chunk (runtime: runtime) runtime.dd01471d.js (runtime) 5.84 KiB [entry] [rendered]
  runtime modules 5.84 KiB 8 modules
```

这段就来自 `runtimeChunk: 'single'` 抽出的独立 `runtime.dd01471d.js`。业务代码只有 977 bytes（`main.1a4c3706.js`），**webpack 运行时却有 5.84 KiB**——它是模块加载、chunk 加载、hash 映射那一套胶水代码。这解释了两个现象：

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

调试的第一道坎是入口。`npm run webpack` 的链路是 `npm.cmd → node → … → webpack-cli`，中间隔了一层，Windows 下 `--inspect-brk` 根本传不到 node 上。第二道坎是"断点写哪"——以前要单独维护一个 debug 入口文件，现在直接写进主配置：主配置里有一个 `DebugProbePlugin`，只在 `--env debug` 时才挂上去，在主干各阶段钩子写 `debugger`；调试用 `node --inspect-brk` 起 webpack-cli，命中这个插件即可：

> 摘自 `./code/build-lab/webpack-lab/webpack.config.cjs`（运行：`npm run webpack:debug`）

```js
class DebugProbePlugin {
    apply(compiler) {
        compiler.hooks.beforeRun.tap('DebugProbe', () => { debugger })    // ① 编译开始前
        compiler.hooks.compile.tap('DebugProbe', params => { debugger })  // ② 即将编译，entry 已由函数解析出来
        compiler.hooks.make.tapAsync('DebugProbe', (compilation, callback) => {
            debugger // ④ 从一个 entry 递归建图
            callback()
        })
        compiler.hooks.finishMake.tapAsync('DebugProbe', (compilation, callback) => {
            debugger // ⑤ 模块图已成、还没分 chunk
            callback()
        })
        compiler.hooks.thisCompilation.tap('DebugProbe', compilation => {
            compilation.hooks.seal.tap('DebugProbe', () => {
                debugger // ⑥ seal：按 splitChunks 分 chunk
            })
            compilation.hooks.processAssets.tap(
                { name: 'DebugProbe', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
                assets => {
                    debugger // ⑦ Object.keys(assets) 就是最终产物清单
                }
            )
        })
        compiler.hooks.emit.tap('DebugProbe', compilation => { debugger }) // ⑧ 写盘前最后窗口
        compiler.hooks.done.tap('DebugProbe', stats => { debugger })       // ⑨ stats 总结本次构建
    }
}
```

两条路，挑一个：

| 方式 | 怎么做 | 适合 |
| ---- | ---- | ---- |
| VS Code | 在主配置 `DebugProbePlugin` 的 `debugger` 行点红点 → F5 → 选「调试 webpack 插件」 | 日常开发，改完直接重跑 |
| 纯命令行 | `npm run webpack:debug`（即 `node --inspect-brk=9229 node_modules/webpack-cli/bin/cli.js --config webpack-lab/webpack.config.cjs --env debug`），再打开 `chrome://inspect` | 不想配 IDE，或在服务器上排查 |

VS Code 的 `.vscode/launch.json`（也可直接复制仓库里的这份，`program` 指向 webpack-cli，`args` 里带 `--env debug`）：

> 摘自 `./code/build-lab/webpack-lab/debug-launch.json`

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "调试 webpack 插件",
            "program": "${workspaceFolder}/node_modules/webpack-cli/bin/cli.js",
            "args": ["--config", "${workspaceFolder}/webpack-lab/webpack.config.cjs", "--env", "debug"],
            "cwd": "${workspaceFolder}",
            "skipFiles": ["<node_internals>/**"],
            "console": "integratedTerminal"
        }
    ]
}
```

`program` 指向 `webpack-cli/bin/cli.js`（不指向 npm.cmd 那层包装），`args` 手工加上 `--config` 与 `--env debug`；`cwd` 用 build-lab 目录——webpack 是按 cwd 解析 loader 的，指错目录会报"找不到 loader"。

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

第二次 `buildModule` 系列直接归零——模块从缓存恢复，压根没重新构建。调试时务必 `cache: false` 或先删掉缓存目录，否则会得出"这个钩子根本不执行"的错误结论。主配置在 `--env debug` 时已自动 `cache: false`（见 `webpack.config.cjs`），调试场景不用再手动关。

**坑二：watch 模式进程不退出。** `compiler.watch()` 下 `done` 之后进程会继续等待文件变化，第二轮还会叠加坑一的缓存行为。调试一律用单次 `run`。

**坑三：断点掉进 node_modules 出不来。** webpack 内部调用链很深，一路单步会陷进 `node_modules`。用 `skipFiles` 跳过 node 内部，只在自己写的文件和明确想看的 tapable 源码上停。

## 十、多入口生产模板：一份能直接落地的配置

前面拆了配置（二）、loader（三）、plugin（四）、拆包（五），但要真搭一个能上线的应用，还差三样：**HTML 入口**、**资源规则**、**开发服务器**。第二节那份多入口主配置就是贴近生产的模板——第二节看的是「怎么读」，这里看「怎么用」：哪些配置块是上线标配、切出不同场景要动哪些 `--env`。

先看一个常被忽略的点——**入口可以是函数**。`entry` 支持对象、数组，也支持返回对象/Promise 的函数，webpack 在构建期调用它拿结果。这比写死数组灵活得多：多页应用可以在这里遍历页面清单生成入口，CI 里也能按需注入页面。主配置用函数返回**两个入口**（`main`＋`pageB`），这正是演示 common chunk 的多入口形态：

> 摘自 `./code/build-lab/webpack-lab/webpack.config.cjs`（运行：`npm run webpack`）

```js
// 功能入口：构建期动态返回多入口；--env/APP 还能切到 spa-app / pit-app / prod-app
entry: () => {
    if (srcDir === 'src') {
        return Promise.resolve({
            main: path.join(ROOT, 'src/index.js'),
            pageB: path.join(ROOT, 'src/pageB.js')
        })
    }
    return Promise.resolve({ app: path.join(ROOT, srcDir, 'src/index.js') })
}
```

模板里其余几处生产标配，逐一说明它们解决什么问题：

| 配置块 | 做法 | 解决什么 |
| ---- | ---- | ---- |
| `output.filename: '[name].[contenthash:8].js'` | 内容变化才改文件名 | 长缓存：内容没变 CDN 就一直命中 |
| `optimization.runtimeChunk: 'single'` | 运行时单独一个文件 | 业务 chunk 的 hash 不因运行时变动全部失效 |
| `splitChunks` 的 vendors / common | node_modules 与公共模块分类拆包 | vendor 变更频率低，长缓存收益最大 |
| `--env prod`（官方插件组） | HtmlWebpackPlugin / MiniCssExtractPlugin / TerserPlugin / CopyPlugin | 生成 index.html、CSS 抽独立文件、压缩、静态资源拷贝 |

用主配置默认场景（`npm run webpack`）跑一次实测产物：

```
assets by path *.js 13.2 KiB
  asset runtime.dd01471d.js 9.58 KiB [emitted] [immutable] (name: runtime)
  asset main.1a4c3706.js 2.03 KiB [emitted] [immutable] (name: main)
  asset pageB.fec65efc.js 1.6 KiB [emitted] [immutable] (name: pageB)
asset build-manifest.json 194 bytes [emitted]
Entrypoint main 11.6 KiB = runtime.dd01471d.js 9.58 KiB main.1a4c3706.js 2.03 KiB
Entrypoint pageB 11.2 KiB = runtime.dd01471d.js 9.58 KiB pageB.fec65efc.js 1.6 KiB
```

三个产出点层层咬合：`runtime.dd01471d.js` 是七节说过的独立运行时代码；`main`/`pageB` 是 `src/index.js` 与 `src/pageB.js` 各自渲染的结果（同一套 `runtime` 共享）；`894` 开头的懒加载 chunk 是 `index.js` 里动态 `import('./lazy.js')` 切出来的（首屏不加载）。想加官方插件组就 `npm run webpack:prod`（切到 `prod-app`，产出 index.html + 独立 css + 压缩后的 js）。

**想把这套模板从头到尾断点走一遍**，不用再单独写入口——九节的 `DebugProbePlugin` 就挂在主配置里，`npm run webpack:debug`（或 `--env debug`）即可在 `beforeRun → compile → make → finishMake → seal → processAssets → emit → done` 各阶段停住。每停一处就对照 4.1 的钩子全景：这一步能拿到 modules/chunks 还是 assets，自己亲手确认一遍，"钩子能拿什么"就再也不会忘——真正轮到的钩子顺序固定，参数随阶段递进。

## 十一、官方插件实现思想：看一眼它们怎么写的

看懂两个最常见的官方插件，就能举一反三。核心就一句话：**官方插件和我们手写的差别只有两点——挂在更合适的阶段、做得更周全**。

| 插件 | 挂在哪个阶段 | 它到底做什么 | 实现思想 |
| ---- | ---- | ---- | ---- |
| `HtmlWebpackPlugin` | `processAssets`（官方在 `OPTIMIZE_INLINE` 附近） | 读产物清单，把带 hash 的 `<script>`/`<link>` 注入模板，`emitAsset` 输出 `index.html` | 不要写死文件名：**从 `compilation.assets` 现读现拼** |
| `MiniCssExtractPlugin` | loader + `processAssets` 各干一半 | CSS 由它的 loader 标记并收集，插件再把 CSS 抽成独立 `.css` 文件 | **loader 负责单模块，plugin 负责汇总成产物**，一个插件可以同时注册两者 |

第一个思想用一段迷你实现来验证——`MiniHtmlWebpackPlugin`（约 40 行，`HtmlWebpackPlugin` 的灵魂就是这个）。它作为零件被主配置加载：主配置里 `--env minihtml` 会用这个迷你版顶替官方 `HtmlWebpackPlugin`（源码仍见 `mini-html-plugin.cjs`），跑 `npm run webpack:minihtml` 即可复现：

> 摘自 `./code/build-lab/webpack-lab/mini-html-plugin.cjs`（运行：`npm run webpack:minihtml`）

```js
compilation.hooks.processAssets.tap(
    {
        name: this.name,
        // HtmlWebpackPlugin 官方也挂这边；这里用 SUMMARIZE 阶段在压缩前后都成立
        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
    },
    assets => {
        const jsTags = []
        const cssTags = []
        for (const name of Object.keys(assets)) {
            if (name.endsWith('.js')) jsTags.push(`<script src="/${name}"></script>`)
            else if (name.endsWith('.css')) cssTags.push(`<link rel="stylesheet" href="/${name}" />`)
        }
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${cssTags.join('\n')}</head>
<body><div id="root"></div>${jsTags.join('\n')}</body></html>`
        // 用 emitAsset（不要 fs.writeFileSync），产物才进 stats、跟随 clean/watch
        compilation.emitAsset(this.filename, new webpack.sources.RawSource(html))
    }
)
```

实测主配置 `--env minihtml` 生成的 `index.html`：

```
<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="/css/app.8c8937b8.css" /></head>
<body><div id="root"></div><script src="/app.d2e1e8bc.js"></script>
<script src="/runtime.a69afb56.js"></script>
<script src="/675.db3e2815.chunk.js"></script></body></html>
```

注意 `<script>` 引用的是**从 assets 里读出来的最终文件名**（`app.d2e1e8bc.js`、`runtime.a69afb56.js`、`675.db3e2815.chunk.js`）。这就是 HtmlWebpackPlugin 不让你手写 `<script src="app.js">` 的原因——hash 变了它自动跟着变（这里比官方版多出的 `runtime` script 正是第四/七节说的独立运行时代码）。真实实现还额外管 favicon、模板引擎、多页、minify，架构不变。

`MiniCssExtractPlugin` 是"loader + plugin 两段式"的典型：它的 `loader` 把 CSS 转成"这段样式要提取"的标记并收集文本，插件在 `processAssets` 里把收集到的文本合并、写成一个 `<name>.css` 文件并注册为 asset。**想加哪种"特殊资源"，就照它这样拆两半：loader 做单文件转换，plugin 做跨文件汇总。**

## 十二、常见自定义插件场景

"我要怎么把这些想法变成代码"是最常问的。建表先给答案，再给一个完整可跑的 demo：

| 需求 | 实现思路 | 关键钩子 / 机制 |
| ---- | ---- | ---- |
| 剔除测试 / mock / spec 文件（不进产物） | 依赖解析时对命中路径 `return false` 跳过该模块 | `normalModuleFactory.hooks.beforeResolve` |
| 打包后删除指定产物文件（LICENSE、sourcemap、多余 chunk） | 从 `assets` 对象里 `delete` 目标文件 | `processAssets`（stage ≥ OPTIMIZE） |
| 剔除注释、`__DEV__` 调试块、console | 编译期常量替换用 `DefinePlugin`；代码删减交给压缩器 | 不必手写插件：`DefinePlugin` + `TerserPlugin({ terserOptions:{ format:{ comments:false } } })` |
| 产物体积门禁 / 构建信息注入 | 在 `done`/`processAssets` 读 stats 或写 manifest | `compiler.hooks.done`、`emitAsset` |

头两行是"真会写进项目"的自定义插件，配套一个 demo 一次演示两个：`DropTestAndMockPlugin` 去掉 mock/test，`DropAssetsPlugin` 去掉指定产物。

> 摘自 `./code/build-lab/webpack-lab/drop-test-mock-plugin.cjs`（运行：`npm run webpack:drop`）

```js
class DropTestAndMockPlugin {
    apply(compiler) {
        // NormalModuleFactory 管「依赖→模块」的解析；beforeResolve 返回 false 等价于 webpack.IgnorePlugin
        compiler.hooks.normalModuleFactory.tap(this.name, factory => {
            factory.hooks.beforeResolve.tap(this.name, resolveData => {
                if (resolveData.request && /\.(test|spec|mock)\.js$/.test(resolveData.request)) {
                    return false // 命中 test/spec/mock → 跳过这个模块
                }
                return undefined
            })
        })
    }
}
```

> 摘自 `./code/build-lab/webpack-lab/drop-assets-plugin.cjs`（运行：`npm run webpack:drop`）

```js
compilation.hooks.processAssets.tap(
    {
        name: this.name,
        stage: require('webpack').Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE + 1
    },
    assets => {
        const matched = Object.keys(assets).filter(name =>
            this.ignore.some(rule => (typeof rule === 'string' ? name === rule : rule.test(name)))
        )
        for (const name of matched) {
            delete assets[name] // 直接删「产物对象」，比删磁盘文件更干净
            console.log('  [DropAssetsPlugin] 剔除:', name)
        }
    }
)
```

主配置用 `--env drop` 同时挂载这两者（`npm run webpack:drop`，入口走 `pit-app`，还配了 `DefinePlugin({ __DEV__: JSON.stringify(false) })` 演示编译期常量），构建后看 `stats.modules`：

```
---- stats.modules（剔除后实际参与打包的模块）----
   ./webpack-lab/pit-app/src/index.js + 1 modules
   ./webpack-lab/pit-app/src/api.js
```

`config.mock.js`、`feature.test.js` 两个源文件都 import 了，却没出现在模块清单——它们在解析阶段就被跳过，**连打包的功夫都省了**。这比"产物里再删一遍"更彻底。

## 十三、min-webpack：约百行看懂源码执行流程

前文的钩子全景是"纸上顺序"，`min-webpack` 把它变成能跑的代码。它复刻 webpack 的 **Compiler → Compilation → Module → Chunk → Asset** 五对象流水线：极简的 Hook（就是 tapable 的原理）、make 建图、seal 冻结、emit 写盘，入口注入 `require(0)`。

> 摘自 `./code/build-lab/webpack-lab/min-webpack/bundle.cjs`（运行：`npm run mini:webpack`）

```js
// —— Hook：tapable 的极简版。webpack 的 hook 就是这个原理：注册一批 fn，触发时按序调用 ——
class Hook {
    constructor() { this.taps = [] }
    tap(name, fn) { this.taps.push({ name, fn }) }
    call(...args) { for (const t of this.taps) t.fn(...args) }
}

class Compiler {
    constructor(options) {
        this.options = options
        this.hooks = { make: new Hook(), seal: new Hook(), emit: new Hook(), done: new Hook() }
    }
    run() {
        const compilation = new Compilation(this)
        this.hooks.make.call(compilation)  // ① 建图
        this.hooks.seal.call(compilation)  // ② 冻结、分 chunk
        this.hooks.emit.call(compilation)  // ③ 渲染成 asset
        this.hooks.done.call(compilation, compilation.assets)
    }
}
```

`seal` 里只有一个动作——所有模块进一个 chunk，注释明说了真实 webpack 在这儿按 splitChunks 切多个 chunk。`emit` 里做最关键的**运行时生成**：把每个模块包成 `function(module, exports, require)`，再加一个缓存版 `require`，最后 `require(0)` 启动入口。webpack 产物里那坨多行压缩代码，拆开看就是这个：

> 摘自 `./code/build-lab/webpack-lab/min-webpack/bundle.cjs`

```js
(function () {
  var modules = { /* id: function(module, exports, require){...} */ }
  var cache = {}
  function require(id) {
    if (cache[id]) return cache[id].exports
    var module = (cache[id] = { exports: {} })
    modules[id](module, module.exports, require)
    return module.exports
  }
  require(0)
})();
```

产物**真的能跑**——入口 `var greet = require(1)`，`greet.js` 的 `export default` 转成 `module.exports =`：

```
entry 用到: hello min-webpack
```

对照本节和第 4.1 节能看到同一套骨架：真正执行的是运行时 `require(0)` → 逐个拉模块、`module.exports` 接力；webpack 5 的差别只是把这张模块表拆进多个 chunk、加了代码分割与懒加载的 `__webpack_require__.e`，架构没变。**先看懂这个约百行的版本，再去读 webpack 源码就不会迷路。**

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/webpack-lab/webpack.config.cjs` | **多入口主配置**：函数入口 / loader / 官方+自定义插件 / splitChunks / runtimeChunk / cache / 断点探针，`--env` 切换场景 | 二、四、五、九、十、十一、十二 |
| `./code/build-lab/webpack-lab/txt-loader.cjs` | 手写 loader：把 .txt 变成 JS 模块 | 三、loader |
| `./code/build-lab/webpack-lab/emit-list-plugin.cjs` | 手写 plugin：产物清单 + emitAsset 产出 manifest | 四、plugin |
| `./code/build-lab/webpack-lab/src/` | 多入口 demo 源码（index/pageB/shared/heavy/lazy） | 二、五、十 |
| `./code/build-lab/webpack-lab/spa-app/`、`prod-app/`、`pit-app/` | 演示入口目录（`--env spa/prod/drop` 切换） | 十、十一、十二 |
| `./code/build-lab/webpack-lab/split.cjs` | `minSize` 20000 vs 0 的对照实验 | 五、代码分割 |
| `./code/build-lab/webpack-lab/cache.cjs` | 持久化缓存：小样本 vs 大样本 | 六、构建加速 |
| `./code/build-lab/webpack-lab/one-cache.cjs` | 单次构建采样（独立子进程，避免互相影响） | 六、构建加速 |
| `./code/build-lab/webpack-lab/hooks-probe.cjs` | 钩子探针：触发顺序 / 各阶段产物 / stage / 谁挂在哪 | 四、plugin |
| `./code/build-lab/webpack-lab/debug-launch.json` | VS Code 调试配置样例（指向主配置 `--env debug`） | 九、断点调试 |
| `./code/build-lab/webpack-lab/mini-html-plugin.cjs` | 模仿 HtmlWebpackPlugin 的迷你实现（注入带 hash 的资源） | 十一、官方插件思想 |
| `./code/build-lab/webpack-lab/drop-test-mock-plugin.cjs` | 剔除 test/mock 模块（normalModuleFactory.beforeResolve） | 十二、自定义插件 |
| `./code/build-lab/webpack-lab/drop-assets-plugin.cjs` | 剔除指定产物文件（processAssets.delete） | 十二、自定义插件 |
| `./code/build-lab/webpack-lab/min-webpack/bundle.cjs` | 约百行最小 webpack：五对象流水线 + 可运行产物 | 十三、min-webpack |

除 `webpack.config.cjs`（一份多入口主配置）与上述插件/探针零件外，webpack 篇不再有其它独立配置文件——所有场景（官方插件 / drop / minihtml / 断点）都是同一份主配置用 `--env` 切出来的。

运行：`cd code/build-lab && npm install`，然后依次 `npm run webpack`（多入口主构建）、`npm run webpack:split`、`npm run webpack:cache`、`npm run webpack:hooks`、`npm run webpack:hooks -- --prod`、`npm run webpack:prod`、`npm run webpack:drop`、`npm run webpack:minihtml`、`npm run webpack:debug`、`npm run mini:webpack`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[手写 mini-bundler](./手写%20mini-bundler.md)
- 下一篇：[esbuild 与 Rust 工具链](./esbuild%20与%20Rust%20工具链.md)
- [webpack 官方文档](https://webpack.js.org/concepts/)
- [webpack 钩子列表](https://webpack.js.org/api/compiler-hooks/)
