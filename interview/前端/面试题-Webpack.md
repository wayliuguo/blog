# 面试题 · Webpack

> 对齐知识体系 frontend/构建体系/webpack.md（配套代码 `code/webpack-lab` + `code/mini-webpack`，所有结论可实跑复现）。
> 全篇按「一句结论 + ①②③ 分层论证 + ⭐ 加分点」组织；深入阅读回链 webpack.md 对应小节。

## 一、原理与心智模型

### 1. webpack 的构建流程是怎样的？Compiler 和 Compilation 有什么区别？

**结论：一条流水线——初始化 Compiler → make 阶段从入口递归建模块图（逐个跑 loader）→ seal 冻结模块图并分 chunk → processAssets 优化产物 → emit 写盘；Compiler 是进程级单例（持有配置与钩子），Compilation 是单次编译的容器（模块、chunk、assets 都挂在它上面）。**

**① 主流程五段**

- `beforeRun / run`：读取配置，创建 Compiler
- `make`：从 entry 出发 DFS 解析依赖，每个文件经 loader 链转成 Module，边解边建图
- `seal`：模块图冻结，按 splitChunks 等规则把 Module 分组成 Chunk
- `processAssets`：Chunk 渲染成 Asset（产物），压缩、抽 CSS、生成 HTML 都在这个窗口
- `emit / done`：写盘，产出 stats

**② 两个对象的分工**

- Compiler：一次进程只创建一个，持有 options 与 `compiler.hooks`；watch 模式下多次编译复用它
- Compilation：每触发一次编译就新建一个，`modules / chunks / assets` 全在上面——所以增量编译其实是「新 Compilation 复用旧模块缓存」
- 推论：plugin 想跨编译存数据挂 Compiler，想存本次产物挂 Compilation（如 CSS 登记表 `compilation.__miniCss`）

**③ 为什么是五个对象而不是两个**

- Module（一个源文件）→ Chunk（一组模块）→ Asset（一个产物文件）是三层映射：stats 里模块数与文件数对不上，就是因为中间隔着 chunk 分组规则
- 改一个文件会重渲染它所属的整个 Chunk——「增量」的粒度是模块缓存 + chunk 重渲染

**⭐ 加分点**

- `thisCompilation` 是注册 compilation 级钩子的**最后时机**；`seal` 之后不能再加模块；`processAssets` 是动产物内容的**唯一安全窗口**——三个边界能答出来说明真写过 plugin
- watch 模式「改一个文件为什么重建一堆」：模块缓存命中，但它所属 chunk 及引用了该 chunk 的产物都要重渲染
- mini-webpack（约百行）复刻的正是这条流水线：Hook（tapable 极简版）+ make 建图 + seal + emit，产物真的能跑

### 2. loader 和 plugin 的区别？各自解决什么问题？

**结论：loader 管「单个模块怎么转换」（输入源码字符串、输出代码字符串，在 make 阶段逐文件执行）；plugin 管「编译流程里插手」（有 `apply(compiler)`，挂在钩子事件流上，能跨模块、跨阶段操作模块图与产物）。**

**① loader：模块级转换器**

- 本质是纯函数：`source 进、代码文本出`，`use` 数组从右往左串行（pitch 阶段相反，从左往右）
- 典型：css-loader 内联 `@import`、改写 `url()` → `require()`；babel-loader 转译语法
- 边界：只能看到「当前这一个文件」，拿不到其他模块、拿不到产物

**② plugin：流程级扩展**

- 本质是「有 `apply(compiler)` 的对象」，在 `compiler.hooks` / `compilation.hooks` 上注册回调
- 能做的事远超 loader：新增产物（HtmlWebpackPlugin）、优化产物（TerserPlugin）、切 chunk（SplitChunksPlugin）、定义编译期常量（DefinePlugin）
- webpack 本体的大部分能力（splitChunks、runtimeChunk、侧效分析）就是内置 plugin

**③ 选型判断**

- 「把 X 文件变成 JS 能 import 的模块」→ loader；「在产物层面加东西/改东西/卡门禁」→ plugin
- 特殊资源两段式：loader 登记单个模块的内容（如 CSS 文本登记到 compilation），plugin 在 `processAssets` 汇总成独立产物——想加任何「特殊资源」都照这个拆法

**⭐ 加分点**

- loader 链的执行顺序是高频坑：普通阶段**从右往左**（`use: [a, b]` 先跑 b），pitch 阶段从左往右——mini-css-extract 的 loader 必须用 pitch，因为普通阶段拿到的已是 css-loader 产出的 JS 代码，取不到 CSS 文本
- loader 里 `this.addDependency(file)` 告诉 webpack「这也是依赖」——被 `@import` 的 CSS 改了能触发重新编译就靠它
- plugin 的产出纪律：`emitAsset` 新增、`updateAsset` 覆盖，不要 `fs.writeFileSync`——后者不进 stats、不参与 `output.clean`、不跟随 watch

### 3. 什么是 tapable？webpack 的插件机制建立在什么之上？

**结论：tapable 是 webpack 的「事件流」库——提供一组 Hook 类（SyncHook / AsyncSeriesHook / AsyncParallelHook 等），plugin 用 `tap/tapAsync/tapPromise` 注册，webpack 在固定时机 `call/callAsync` 触发；插件机制 = 钩子注册表 + 按约定触发。**

**① 极简模型**

- 一个 Hook 就是「先注册、后触发」：`tap(name, fn)` 存进数组，`call(...args)` 按序执行
- mini-webpack 的 `lib/hook.cjs` 十几行就是 tapable 的原理版

**② Hook 类型决定插件语义**

- Sync 系列：同步串行；`SyncBailHook` 有返回值就「熔断」跳过后面（resolve 类场景）
- Waterfall：上一个的返回值是下一个的入参
- AsyncSeries / AsyncParallel：异步串行（一个完再下一个）与异步并行（一起发、等齐）

**③ 这对写 plugin 意味着什么**

- 选错 Hook 类型 = 语义错误：要串行等待的用了 Parallel，可能读到中间态产物
- `tap` / `tapAsync(callback)` / `tapPromise(返回 Promise)` 三种注册方式对应 Hook 的异步能力
- 同一钩子上多个插件的先后：`processAssets` 按 **stage 数值**排（数字小先执行），不是注册顺序

**⭐ 加分点**

- `processAssets` 的 stage 表值得背几个：`ADDITIONS(-100)` 产新资源（如抽 CSS）→ `OPTIMIZE_SIZE(400)` 压缩 → `SUMMARIZE(1000)` 生成 HTML → `OPTIMIZE_HASH(2500)` 重算 contenthash
- stage 填错的真实后果：HTML 插件排在压缩之前，引用的就是压缩前的旧文件名；TerserPlugin 日志里的 hash 与最终产物对不上，正是因为 hash 在 2500 才重算
- 追问「tapable 与 EventEmitter 区别」：Hook 有类型语义（熔断/瀑布/并行），EventEmitter 只是无序通知

## 二、loader 深入

### 4. 手写一个 loader 需要注意什么？pitch loader 是什么？

**结论：loader 是「输入源码、输出代码字符串」的函数，三个要点——返回的是代码文本不是值、异步用 `this.async()`、依赖其他文件要 `this.addDependency`；pitch loader 是普通阶段之前从左往右先跑的「前置关卡」，能拿到剩余链的请求串，常用于「截胡」整条链。**

**① 基本形态与三个坑**

- 返回代码文本：想导出字符串要自己 `JSON.stringify` 拼进 `export default ...`，不能直接 return CSS
- 异步：拿 `const cb = this.async()`，完成后 `cb(err, content)`；同步 loader 直接 return
- 外部依赖：`this.addDependency(abs)` 登记，`@import` 的 CSS 改动才能触发重建

**② 链式执行顺序**

- `use: [a, b, c]`：pitch 阶段 a→b→c（从左往右），普通阶段 c→b→a（从右往左）
- 任一 pitch 有返回值，**跳过后续所有 loader 的普通阶段**，直接把它当最终结果——这就是「截胡」

**③ pitch 的典型用途**

- mini-css-extract 的 loader：普通阶段 source 已是 css-loader 的 JS 产物，取不到 CSS 文本；pitch 里用 `this.importModule('!!' + remainingRequest)` 在构建期跑完剩余链、拿回 CSS 导出，登记后返回占位模块
- `!!` 前缀含义：禁用配置里的所有 loader，只跑请求串里显式写的这条链

**⭐ 加分点**

- css-loader 改写 `url()` 的细节：保留 `url(...)` 包装本身，只把资源地址换成运行时插值——否则产物变成裸路径
- loader 不能访问 webpack 配置对象，但能通过 `this.getOptions()` 拿到自己的 options
- 追问「loader 能不能返回多个文件」：可以，`this.emitFile()`（如 file-loader 产图片），返回值仍是「当前模块」的代码

### 5. style-loader 和 mini-css-extract-plugin 的区别？生产为什么用后者？

**结论：style-loader 把 CSS 文本塞进 JS bundle、运行时创建 `<style>` 插入 head；mini-css-extract 把 CSS 抽成独立 `.css` 文件、HTML 用 `<link>` 引；生产默认选抽离——并行加载无 FOUC、独立 contenthash 单独命中缓存。**

**① 两条链路的原理**

- 注入：CSS → JS 字符串 → 打进 bundle → 运行时 `document.head.appendChild(<style>)`
- 抽离：loader 在 pitch 阶段登记 CSS 文本 → 返回占位模块 → plugin 在 `processAssets` 汇总成 `.css` 产物 → HTML 注入 `<link>`

**② 生产选抽离的三个理由**

- 生效时机：注入要等 JS 下载+执行完，首屏有 FOUC；`<link>` 与 JS 并行加载
- 缓存：注入的 CSS 没有独立 hash，CSS 一变 JS 文件名跟着变、缓存全失效；抽离后 CSS 单独 contenthash
- 能力：注入无法 `<link rel="preload">`，严格 CSP 下 `style-src` 要放行 inline

**③ 注入并没死**

- 微前端沙箱、Web Components / Shadow DOM、要求单文件产物的场景仍会用它
- 两条链互斥：同一个 `.css` 规则只能二选一

**⭐ 加分点**

- 抽离链是「loader+plugin 两段式」的最佳教学案例：loader 管单模块登记、plugin 管跨文件汇总
- Vue SFC 的 `<style>` 走抽离链的坑：style 块是带 `?vue&type=style` 查询串的请求，匹配不上 `test: /\.css$/`——`VueLoaderPlugin` 把规则克隆成带 `?vue` 的版本才接上
- 追问「CSS 抽离后怎么做按需加载」：路由懒加载 chunk 里的 CSS 会被拆到对应 chunk 的 css 文件，随 chunk 一起按需拉取（webpack 5 的 css chunk 跟随 js chunk）

## 三、plugin 与钩子

### 6. 你写过哪些 webpack plugin？手写 plugin 的核心是什么？

**结论：plugin 是「有 `apply(compiler)` 的对象」，核心不是 API 而是「知道挂在哪个钩子、哪个 stage」——产物类插件几乎都挂在 `processAssets` 上按 stage 排队：先产 CSS（-100）→ 再压缩 JS（400）→ 最后生成 HTML（1000）。**

**① 骨架**

```js
class MyPlugin {
    apply(compiler) {
        compiler.hooks.thisCompilation.tap('MyPlugin', compilation => {
            compilation.hooks.processAssets.tap(
                { name: 'MyPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS },
                () => { /* 读/改 compilation.assets */ }
            )
        })
    }
}
```

**② 三个自测能用插件讲清楚的例子**

- MiniCssExtractPlugin：读 loader 登记的 CSS → `emitAsset` 产 `.css`（stage -100）
- MiniTerserPlugin：遍历 `.js` assets 过 terser → `updateAsset` 覆盖（stage 400）
- MiniHtmlPlugin：从 `compilation.assets` 与 `entrypoint.getFiles()` 现读带 hash 的文件名 → 拼模板产 `index.html`（stage 1000）

**③ 为什么 stage 比注册顺序重要**

- `processAssets` 上挤着几乎所有「动产物」的插件，彼此按 stage 数值排队
- 顺序即依赖：CSS 产物先存在，HTML 才引得到；压缩先完成，HTML 引用的才是最终文件名

**⭐ 加分点**

- JS 的 `<script>` 顺序要从 `entrypoint.getFiles()` 取（保证 runtime 在 main 之前），不是遍历 assets——这是 HtmlWebpackPlugin 级插件才知道的细节
- `compiler.hooks` 与 `compilation.hooks` 的选择：要拿配置/整次编译挂前者，要拿模块/chunk/产物挂后者；在 `thisCompilation` 里注册 compilation 级钩子是通用范式
- 高频追问「怎么让插件支持异步」：`tapPromise` 返回 Promise（如压缩要 await terser.minify），或 `tapAsync` 用 callback

### 7. 说几个你熟悉的 webpack 钩子，分别能拿到什么？

**结论：记「边界」比背清单有用——`thisCompilation`（注册 compilation 钩子的最后时机）、`make`（开始建图）、`seal`（模块图冻结）、`processAssets`（动产物的唯一安全窗口）、`emit`（写盘前）、`done`（stats 可用）。**

**① 编译建立期**

- `compiler.hooks.beforeRun`：还没开始解析，读外部配置、清理目录
- `compiler.hooks.thisCompilation`：拿到新建的 compilation（还是空的）——注册 compilation 级钩子的最后时机
- `compiler.hooks.make`：从这里开始递归解析依赖、跑 loader

**② 模块到产物期**

- `compilation.hooks.finishModules`：模块图完成、尚未分 chunk
- `compilation.hooks.seal`：模块图冻结，之后不能再加模块
- `compilation.hooks.optimizeChunks`：chunk 已切分——SplitChunksPlugin 在这干活

**③ 产物与收尾期**

- `compilation.hooks.processAssets`：全部产物就绪，压缩、生成 HTML、改 assets 的唯一安全窗口
- `compiler.hooks.emit`：产物即将写盘（CleanPlugin、统计校验）
- `compiler.hooks.done`：stats 可用，报告/通知类插件

**⭐ 加分点**

- 「想在产物里加 banner 该挂哪个钩子」：processAssets——早于它产物没生成，晚于它已写盘
- watch 模式下钩子按「次」触发：每次重编译都新建 compilation、重跑 compilation 级钩子，compiler 级钩子不重来
- 调试技巧：断点打在 `processAssets` 回调里能看到 `compilation.assets` 的最终形态；打在自己 loader 里能看到 source 与返回值

## 四、产物优化（高频深挖区）

### 8. Tree-Shaking 的原理与前提？为什么有时摇不掉？

**结论：Tree-Shaking = 「标记 + 删除」两步——构建期基于 ESM 静态结构标记未引用的导出，压缩阶段由 Terser 删除死代码；前提三个：ESM 静态结构、`sideEffects` 标记、生产模式压缩，缺一不可。**

**① 为什么必须 ESM**

- `import/export` 是静态声明：不执行代码就能算出「谁导出了什么、谁引用了什么」
- CJS 的 `require` 是运行时函数调用（`require(condition ? 'x' : 'y')`），构建期无法确定依赖，摇不了

**② 两个前提条件**

- `sideEffects`：webpack 标记了「未引用」，但不敢删有副作用的模块（顶层执行代码、polyfill）；`package.json` 里 `"sideEffects": false` 是给打包器的承诺——「没引用的模块删掉不影响行为」
- 生产模式：`mode: 'production'` 才启用 Terser，标记的死代码真正被删；只标记不压缩，代码还在产物里

**③ 摇不掉的常见场景**

- 从「桶文件」（barrel，index.js 统一 re-export）导入：整个桶进了依赖图，sideEffects 未标记时全部保留
- babel 把 ESM 转成了 CJS（`@babel/preset-env` 默认 modules 转换）——要关：`modules: false`
- 类的方法、对象属性默认不摇（可能动态访问）；CommonJS 依赖整体不摇

**⭐ 加分点**

- 「`sideEffects: false` ≠ 模块内副作用语句可删」：它说的是「模块没被引用可整块删」，已在依赖图里的模块，顶层副作用语句照样保留
- 与 Rollup 的对比是加分项：Rollup 解析期一步完成删除；webpack 是「标记+压缩」两步——只配 `sideEffects` 不开生产压缩，一个字节都不会少
- 实测验证方法：构建产物里搜未引用函数名，或用 analyze-lab 做对照实验

### 9. Code Splitting 怎么做？splitChunks 的 cacheGroups 怎么配？

**结论：两条路——动态 `import()` 切懒加载 chunk（路由级最自然），`splitChunks` 把 node_modules 与公共模块抽成独立 chunk；cacheGroups 里「按范围切」（vendor）与「按次数切」（common）是两种规则，别混成一句。**

**① 动态 import()**

- `() => import('./views/Home.vue')` 就是分割点：webpack 为它切独立 chunk，运行到才下载
- 路由级懒加载是单入口应用最自然的分割——首屏只带入口 chunk

**② splitChunks 的两种抽取规则**

- `vendor`（按范围）：`test: /node_modules/`，不设 `minChunks`——命中且过 `minSize` 就抽，与被引用几次无关
- `common`（按次数）：`minChunks: 2`——业务模块被两个以上 chunk 复用才抽
- `priority` 数值大优先：vendor=10 > common=5，node_modules 永远先归 vendors

**③ 生效的三个必要条件（同时满足）**

- `minChunks`：被引用次数够
- `minSize`：体积够大（默认 20KB）——「配了没生效」通常是被它挡住
- 命中 cacheGroup 的 test 规则

**⭐ 加分点**

- `runtimeChunk: 'single'` 的动机：webpack 运行时装着模块表与 chunk 映射，业务一变它跟着变；抽成独立文件后，业务 chunk 的 hash 不因运行时变化全部失效
- `chunks: 'all'` 的含义：初始 chunk 与异步 chunk 都参与拆分（默认只拆异步）
- 过度拆分的代价：chunk 过多抬高请求数，且每个 chunk 都有运行时开销——「能缓存」与「请求数」要平衡

### 10. contenthash / chunkhash / hash 的区别？长缓存怎么配？

**结论：`hash` 是整次构建一个值（任何文件变全变）、`chunkhash` 按 chunk 内容算（同 chunk 内文件互相牵连）、`contenthash` 按单个产物内容算（变谁换谁）——长缓存只认 `contenthash`。**

**① 三种 hash 的粒度**

- `[hash]`：一次编译一个值，改任何文件所有产物名全变——缓存全军覆没
- `[chunkhash]`：同一 chunk 的产物共享，CSS 变了同 chunk 的 JS 名也变
- `[contenthash]`：按产物自身内容算，CSS 变只换 CSS 的名——JS 缓存不受影响

**② 长缓存配置组合**

- `output.filename: '[name].[contenthash:8].js'` + `chunkFilename` 管懒加载 chunk + `assetModuleFilename` 管图片字体
- HTML 必须由插件生成（从 assets 现读最终文件名）——这就是不能手写 `<script src="app.js">` 的原因
- `output.clean: true` 每次先清 dist，不留旧 hash 残骸

**③ hash 稳定性的坑**

- 压缩会改内容：TerserPlugin 在 stage 400 改完，webpack 在 2500 用 RealContentHashPlugin 重算——插件日志里的文件名与最终产物对不上是正常的
- 模块 id 默认按发现顺序编号，新增模块会让后续 id 全位移 → 内容变 → hash 变；生产配 `optimization.moduleIds: 'deterministic'` 让 id 稳定

**⭐ 加分点**

- 「为什么 vendors 能长缓存」：第三方库不常变，contenthash 不变 → 文件名不变 → CDN/浏览器一直命中；业务代码频繁变，只换自己的小 chunk
- runtimeChunk 独立也是为 hash 稳定性服务（见上题）
- 追问「hash 冲突可能吗」：理论上 md5 截 8 位有碰撞概率，工程上不构成问题；内容寻址的意义是「变才换名」，不是全局唯一 id

### 11. webpack 构建速度怎么优化？

**结论：三个方向——少编译（缩小范围）、编译快（缓存与并行）、少重做（增量与持久化缓存）；先量后优，用 speed-measure-webpack-plugin 定位耗时大户。**

**① 少编译：缩小处理范围**

- loader 配 `include/exclude`：babel 别碰 `node_modules`
- `resolve.extensions` 别写太长（每个省略后缀的 import 都要逐个试）、`resolve.alias` 直连常用库
- `externals` 把大库排除在打包外（改走 CDN，前提全局变量可用）

**② 编译快：缓存与并行**

- `cache: { type: 'filesystem' }`（webpack 5 持久化缓存）——二次构建提速最明显的一项
- thread-loader 给重 loader（babel/ts）开 worker 池；esbuild-loader / swc 替换 babel（Go/Rust 实现快一个量级）
- `parallelism` 与 TerserPlugin 的 `parallel`（默认已开）

**③ 少重做：dev 与 watch**

- dev 用 webpack-dev-server / HMR 替代整包重建
- watch 模式的增量：模块级缓存命中，只重渲染受影响 chunk
- 大项目评估 rspack / turbopack（同 API 的 Rust 重写）是「换引擎」路线

**⭐ 加分点**

- 先量后优：`speed-measure-webpack-plugin` 打出每个 loader/plugin 耗时——优化没有数据的构建是猜
- 持久化缓存的安全：`cache.buildDependencies` 把配置文件声明进去，配置变了缓存自动失效
- thread-loader 不是免费的：worker 启动与通信有开销，小项目反而变慢——只放在耗时大的 loader 前

## 五、对比与工程判断

### 12. webpack 和 Vite 的区别？各自适用什么场景？

**结论：差在 dev 架构——webpack 是「bundle-based」：先全量建图打包再服务，项目越大 dev 启动与 HMR 越慢；Vite 是「native-ESM-based」：dev 不打包，浏览器按 URL 请求、服务端按需编译，启动与 HMR 和项目规模解耦；生产端两者都全量打包优化。**

**① dev 架构对比**

- webpack：make 建图 → 打包 → 起服务；改一个文件 → 重编模块 + 重渲染 chunk → HMR 推送——链路随项目规模线性变长
- Vite：起服务即用；浏览器请求到哪个模块才编译哪个；HMR 只重转单个模块经 WebSocket 通知——耗时与项目规模无关
- 依赖预构建：Vite 用 esbuild 把 node_modules 的 CJS/碎片包预转成单文件 ESM（这是它唯一的「提前打包」）

**② 生产端没那么大差异**

- 都要全量建图、分割、压缩；Vite 生产走 Rollup 体系（8.x 起 Rolldown），概念（chunk、contenthash、manualChunks）与 webpack 一一对应
- 「Vite 生产也快」主要来自 Rolldown/esbuild 的实现语言优势，不是架构差异

**③ 选型判断**

- 新项目、现代浏览器目标：Vite（dev 体验碾压，生态已成熟）
- 存量大项目、复杂定制（特殊 loader 链、Module Federation、IE 级兼容）：webpack——生态深、坑都被踩过
- 组件库/工具库：Rollup 系（产物干净、ESM 优先、无运行时注入）

**⭐ 加分点**

- 别只说「Vite 快」：快来自「dev 不做不需要的事」（bundleless），不是「同样的活干得快」——能讲出这句说明理解架构差异
- webpack 的应对：esbuild-loader、持久化缓存、懒编译（experiments.lazyCompilation）都是在补 dev 体验的课
- 面试被追「为什么生产不用原生 ESM」：瀑布请求（几百个模块逐个请求）在真实网络下不可接受，兼容性与优化空间也依赖打包产物

### 13. Module Federation（模块联邦）是什么？解决什么问题？

**结论：webpack 5 的运行时模块共享机制——多个独立构建的应用（host/remote）在运行时互相加载对方暴露的模块，并共享依赖单例；解决微前端「独立开发部署 + 共享公共依赖」的问题。**

**① 角色与配置**

- remote（提供方）：`exposes` 声明暴露的模块（`./Button: './src/Button.vue'`）
- host（消费方）：`remotes` 声明远端地址，代码里 `import('app2/Button')` 像本地模块一样用
- `shared`：声明共享依赖（vue、react）——host 与 remote 协商出**同一个实例**，版本兼容就复用

**② 它解决了什么**

- 传统微前端（路由级拼接、iframe）共享依赖要各打一份：vue 打两份 = 体积翻倍 + 响应式系统两份实例直接出 bug
- 公共库升级不必所有子应用同时重新发布——remote 独立部署，host 运行时拉最新

**③ 代价与边界**

- 运行时拉取远端 entry：网络失败要有兜底（ErrorBoundary / 降级组件）
- 共享依赖版本协商有规则：大版本不一致会警告/各自加载，「共享」不等于「永远单例」
- 构建与部署复杂度上升：remoteEntry 的 hash、缓存策略、跨端类型同步都要工程化配套

**⭐ 加分点**

- 「为什么共享依赖必须单例」：vue/react 这类库有内部状态（响应式 effect 链、hooks 上下文），两个实例互相不认——这是 MF 的 `shared` 存在的根本原因，与库打包 external 的动机同源
- MF 是**运行时**集成，与普通 npm 依赖的**构建时**集成对比着讲
- 追问「和 vite 的 federation 插件关系」：社区有 vite-plugin-federation，但原生实现与生态以 webpack 为主——存量 webpack 微前端项目是 MF 的主要战场
