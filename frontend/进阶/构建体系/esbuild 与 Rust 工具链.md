# esbuild 与 Rust 工具链

"用 Go / Rust 重写前端工具链"是这几年最确定的趋势。但"快"这个词太笼统了：esbuild 快在哪一步？SWC 和 Babel 的差距到底多少？Rspack 能不能直接替换 webpack？本篇用实测把这些拆开。

先给结论：**快的是"转换"这一步，不是"整个构建"**。转换变快之后，打包、写盘、压缩这些环节的成本就凸显出来了——这也是为什么 esbuild 单文件转换会输给 SWC，却在整包构建里赢过 Rollup。

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

## 五、Rust 工具链全景

"Rust 工具链"不是单一工具，是按职责替换的：

| 工具 | 语言 | 替换谁 | 成熟度 | 落地建议 |
| ---- | ---- | ---- | ---- | ---- |
| SWC | Rust | Babel | 高（Next.js 默认） | 新项目直接用；老项目先做产物对比 |
| esbuild | Go | 转换 + 打包 | 高（Vite 预构建） | 工具链、预构建、内部工具 |
| Rspack | Rust | webpack | 中高 | webpack 项目提速，配置基本兼容 |
| Rolldown | Rust | Rollup | 中（Vite 8 起默认生产打包器） | 跟着 Vite 走即可 |
| Turbopack | Rust | webpack（Next.js 场景） | 中 | Next.js 项目可用，独立使用慎重 |
| Biome | Rust | ESLint + Prettier | 中 | 新项目可试；存量规则迁移成本高 |
| Oxlint | Rust | ESLint | 中 | 作为 CI 的"快速第一道检查"很好用 |

选型时最该问的不是"谁更快"，而是**替换成本**：

- **配置兼容性**：Rspack 兼容大部分 webpack 配置，但专有 loader/plugin 要逐个验证。
- **行为一致性**：Rust 版工具与 JS 版在边界行为上可能有差异（比如对某些提案语法的处理）。迁移前必须做产物对比（同一份源码两边产物 diff + 跑测试）。
- **生态插件**：Babel 插件生态是十年积累，SWC 的插件需要用 Rust 写或走 `swc-plugin` ——这是最大的迁移阻力。

## 六、什么时候不该换

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
| `./code/build-lab/swc-lab/compare.cjs` | esbuild / SWC / Babel 转换速度对比 | 四、三个工具对比 |

运行：`cd code/build-lab && npm install`，然后 `npm run esbuild`、`npm run swc`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Rollup](./Rollup.md)
- 下一篇：[构建插件开发](./构建插件开发.md)
- [esbuild 文档](https://esbuild.github.io/)
- [SWC 文档](https://swc.rs/)
- [Rspack 文档](https://rspack.dev/)
