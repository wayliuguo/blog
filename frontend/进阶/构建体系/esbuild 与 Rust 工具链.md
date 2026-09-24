# esbuild 与 Rust 工具链

## 一、esbuild：两个 API 对应两件事

最常被混淆的一点是 `transform` 和 `build`：

| API | 做什么 | 是否解析依赖 |
| ---- | ---- | ---- |
| `transform` | 单个文件内容 → 转换后内容 | 否 |
| `build` | 从入口出发解析依赖图 → 产物 | 是 |

实测（同一段 TS）：

> 摘自 `./code/build-lab/esbuild-lab/build.cjs`（运行：`npm run esbuild`）

```js
// 跑两次：第一次含加载 esbuild 原生二进制的成本，第二次才是转换本身
esbuild.transformSync(RAW, { loader: 'ts', target: 'es2015' })
const t0 = performance.now()
const out = esbuild.transformSync(RAW, {
    loader: 'ts',
    target: 'es2015'
})
const t1 = performance.now()
```

```
---- 1. transform：只转换，不解析依赖 ----
耗时: 3 ms
const list = [{ id: 1, name: "a" }];
export const names = list.map((u) => {
  var _a;
  return (_a = u.name) != null ? _a : "";
});
  注意：`??` 被降级了吗： 已降级
```

要跑两次才量得准：**第一次调用要加载 esbuild 的原生二进制，实测约 700 ms；第二次才是转换本身，3 ms**。只跑一次就把加载成本算进转换耗时，会得出完全错误的结论——这个坑在评估所有原生工具（SWC、Rspack）时都一样。

`transform` 只做语法转换，`import` 语句原样保留——所以它适合"批量转换文件"这类场景（比如给每个文件注入 banner），不适合产出可运行的产物。

## 二、target 决定降级力度

同一个语法，target 不同产物差 8 倍：

```
---- 2. target 决定降级力度 ----
  target=esnext   产物长度   82  const f = async () => {   const x = await Promise.resolve(1);   return
  target=es2020   产物长度   82  const f = async () => {   const x = await Promise.resolve(1);   return
  target=es2015   产物长度  685  var __pow = Math.pow; var __async = (__this, __arguments, generator) =
```

`es2015` 那一行里出现了 `__pow` 和 `__async` 两个辅助函数——**降级是要注入运行时辅助代码的**。这解释了一个常见困惑：为什么"只改了个 target，产物大了一圈"。

实践规则：**target 应该由浏览器基线决定，不是越新越好**。现代项目通常给"支持原生 ESM 的浏览器"一份 `esnext` 产物，再给老浏览器一份降级产物（`<script type="module">` + `nomodule` 双轨）。

## 三、metafile：产物里到底塞了什么

体积优化的第一步是"看清楚"，esbuild 的 `metafile` 就是干这个的：

> 摘自 `./code/build-lab/esbuild-lab/build.cjs`（运行：`npm run esbuild`）

```js
// metafile 的 inputs 给的是"源文件自身大小"，要看"各模块在产物里占多少"得读 outputs.inputs
const outMeta = Object.values(bundle.metafile.outputs)[0]
const rows = Object.entries(outMeta.inputs)
    .map(([k, v]) => ({ name: k.replace(ROOT, ''), bytes: v.bytesInOutput }))
    .sort((a, b) => b.bytes - a.bytes)
```

```
---- 4. metafile：产物里到底塞了什么 ----
  esbuild-lab/src/util.ts         141 bytes
  esbuild-lab/src/main.ts         105 bytes
  产物总字节: 320
  未使用的 unused() 是否进产物： false
```

两个要点：

1. **`metafile.inputs` 给的是源文件大小，不是它在产物里占多少**。要看占比必须读 `metafile.outputs[*].inputs` 里的 `bytesInOutput`——这个字段名踩过一次。
2. **tree-shaking 默认生效**：`unused()` 没进产物。esbuild 的摇树不需要额外配置。

压缩效果实测：

```
---- 5. minify 的效果 ----
  未压缩: 320 字符
  压缩后: 186 字符
  压缩比: 0.58
```

## 四、三个工具转换同一份源码

esbuild（Go）、SWC（Rust）、Babel（JS），同一份 ES2020 源码降级到 ES2015，各跑 50 次：

> 摘自 `./code/build-lab/swc-lab/compare.cjs`（运行：`npm run swc`）

```js
const rows = [
    bench('esbuild (Go)', () => esbuild.transformSync(SOURCE, { loader: 'js', target: 'es2015' }).code),
    bench('SWC (Rust)', () =>
        swc.transformSync(SOURCE, {
            jsc: { parser: { syntax: 'ecmascript' }, target: 'es2015' }
        }).code
    ),
    bench('Babel (JS)', () =>
        babel.transformSync(SOURCE, {
            configFile: false,
            babelrc: false,
            presets: [[require('@babel/preset-env'), { targets: { esmodules: false } }]]
        }).code
    )
]
```

实测输出（本仓环境 Node 22.22.2 / i7-7700HQ）：

```
---- 同一份 ES2020 源码降级到 ES2015，各转换 50 次 ----
SWC (Rust)     总计      6 ms  单次    0.13 ms  1.0x  产物 381 字符
esbuild (Go)   总计     75 ms  单次    1.50 ms  12.5x  产物 302 字符
Babel (JS)     总计   1005 ms  单次   20.10 ms  167.5x  产物 1990 字符
```

三个结论：

1. **Babel 慢 167 倍**。这不是"稍微慢一点"，是两个数量级。Babel 的价值在插件生态和提案支持，不在速度。
2. **单文件转换 SWC 比 esbuild 快 12 倍**。这一点和"esbuild 更快"的直觉相反：esbuild 的 `transformSync` 每次都要跨进程与 Go 二进制通信，有固定开销；SWC 是 Node 原生插件，调用几乎零成本。
3. **但整包构建 esbuild 赢**（见[构建全景与选型](./构建全景与选型.md)实测：esbuild 557ms vs Rollup 1303ms）。因为它把"解析 + 转换 + 拼装"放在同一个 Go 进程里一次做完，避免了 Node 与原生层之间反复传递 AST。

一句话总结：**批量转换用 SWC，整包构建用 esbuild**。

> Rust/Go 工具链的选型全景（Rspack / Rolldown / Turbopack / Biome / Oxlint 等按职责替换谁、成熟度分级）已并入[构建全景与选型](./构建全景与选型.md)第七节。

## 四、插件机制：只有三个钩子，够用吗

和 webpack 的几十上百个钩子不同，esbuild 的插件整套就三个钩子——**解析、内容、收尾**，再加两个生命周期。少，但每个都是构建流程上不可绕过的点：

```
解析    onResolve    一个 import / 入口该由谁来回答、用什么 loader          （返回 namespace）
内容    onLoad       给上一步划过来的模块喂内容（可现造，不必在磁盘上）     （返回 contents）
收尾    onEnd        所有产物生成之后：读体积、改产物、写清单、报错         （可 throw 中断）
生命周期 onStart 构建开始 · onDispose 插件被移除
```

触发顺序固定：`onStart → onResolve → onLoad → （……递归到所有模块……）→ onEnd`。中间两步可能交替、重复运行多次，onStart/onEnd 各一次。跟 webpack 对比（见[webpack](./webpack.md)第十二节），esbuild 没有"改配置"、"挂载外部资源"这类私货钩子——**能做的只有三件事，反过来也让插件的思考被压缩成一句：这个能力发生在解析、内容、还是收尾。**

写两个生产里真会用的插件，把三个钩子走一遍（虚拟模块 + 体积门禁），见[配套代码](#配套代码)：

> 摘自 `./code/build-lab/esbuild-lab/plugins.cjs`（运行：`npm run esbuild:plugins`）

```js
// 一、虚拟模块：磁盘上根本没有 build-info 文件，靠 onResolve + onLoad 凭空提供
const versionInfo = {
    name: 'version-info',
    setup(build) {
        // ① onResolve：import 'build-info' 划到我们的 namespace
        build.onResolve({ filter: /^build-info$/ }, () => ({
            namespace: 'virtual',
            path: 'build-info'
        }))
        // ② onLoad：对 namespace 为 virtual 的模块，返回现造的内容
        build.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({
            loader: 'js',
            contents: `export const commit = 'a1b2c3d'
export const branch = 'main'`
        }))
    }
}
```

```js
// 二、体积门禁：构建结束称一次重，超预算就 fail（体积回退不会让测试变红）
function sizeGate(limitBytes) {
    return {
        name: 'size-gate',
        setup(build) {
            build.onEnd(result => {
                const files = result.outputFiles.map(f => ({ name: path.basename(f.path), raw: f.contents.length }))
                const total = files.reduce((s, f) => s + f.raw, 0)
                if (total > limitBytes) throw new Error(`[size-gate] 产物超预算：${total}B > ${limitBytes}B`)
            })
        }
    }
}
```

跑一遍（三组插件不同，只看钩子行为是否被正确地"包"住）：

```
---- ① 虚拟模块注入构建信息 ----
  含 commit 常量（来自不存在的虚拟模块）： true
  产物字符数： 170

---- ② 体积门禁 · 预算宽松（不超） ----
  预算 2000 字节
    <stdout>              170 字节
  onEnd 合计 170 字节 —— 在预算内，通过

---- ③ 体积门禁 · 预算压紧（必超） ----
  预算 30 字节
    <stdout>              170 字节
  构建被中断： Build failed with 1 error:
  ...plugins.cjs:47:26: ERROR: [plugin: size-gate] [size-gate] 产物超预算：170B > 30B
```

几个要点：

1. **虚拟模块靠" namespace"而不是"路径"划隔**。onResolve 返回 `{ namespace, path }`，namespace 是插件间互不干扰的原子边界；onLoad 用 `filter: /.*/, namespace` 限定"只接管我们划过来的模块"。这在 webpack/Rollup 是 `resolveId` + `load` 的活，esbuild 拆得更直白。
2. **onLoad 能"凭空造内容"**，所以构建期注入版本号、git 分支、特性开关都很便宜——一次都不用引磁盘上真实存在的文件。
3. **onEnd 的 `throw` = 构建失败**。它和 onStart 一样只在一次 build 里跑一次，是体积门槛、产物清单这类"收尾"逻辑的唯一落脚点。
4. **esbuild 插件是纯 JS、无副作用**——`setup(build)` 是唯一的入口，props 和 hooks 都挂在 `build` 对象上。代价是没有 webpack loader / Vite transform 那种"按文件类型重编译"的深度定制能力；esbuild 的定位就是**快 + 覆盖常规需求**，深度定制交给更重的工具。

顺带回答开头的问题：**esbuild 官方插件极其精简，`esbuild/plugins` 就像 `@esbuild-plugins/*` 里那些千行小工具一样，都是围绕这三个钩子打转**。想看完整 API 表，[esbuild 插件文档](https://esbuild.github.io/plugins/)是唯一准出处——这里只讲心智模型和它与其他工具的分工。

## 五、什么时候不该换

| 情况 | 建议 |
| ---- | ---- |
| 项目构建只要几秒 | 换工具省下的时间不如迁移风险值钱 |
| 重度依赖自定义 Babel 插件 | 先用 SWC 跑通主流程，插件部分保留 Babel 做二次处理 |
| CI 时间瓶颈不在构建 | 先定位瓶颈（依赖安装？测试？上传产物？）再决定 |
| 团队没人能排查原生工具的问题 | 出问题只能回滚，风险不可控 |

一个务实的中间路线：**让快工具做它最擅长的那一环**。比如 Vite 就是典型——esbuild 负责预构建与单文件转换，打包交给 Rolldown/Rollup。不必全套替换。

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/esbuild-lab/build.cjs` | transform vs build、target 对比、metafile 分析、minify | 一、两个 API · 二、target · 三、metafile |
| `./code/build-lab/esbuild-lab/src/main.ts` | 打包入口（引用 util.ts） | 三、metafile |
| `./code/build-lab/esbuild-lab/src/util.ts` | 含未被引用导出的模块，验证 tree-shaking | 三、metafile |
| `./code/build-lab/esbuild-lab/plugins.cjs` | 插件机制：onResolve/onLoad/onEnd + 虚拟模块 + 体积门禁 | 四、插件机制 |
| `./code/build-lab/esbuild-lab/src-plugins/index.js` | 引用"不存在的" build-info 的入口 | 四、插件机制 |
| `./code/build-lab/swc-lab/compare.cjs` | esbuild / SWC / Babel 转换速度对比 | 五、三个工具对比 |

运行：`cd code/build-lab && npm install`，然后 `npm run esbuild`、`npm run esbuild:plugins`、`npm run swc`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[webpack](./webpack.md)
- 下一篇：[Rollup](./Rollup.md)
- [esbuild 文档](https://esbuild.github.io/)
- [SWC 文档](https://swc.rs/)
- [Rspack 文档](https://rspack.dev/)
