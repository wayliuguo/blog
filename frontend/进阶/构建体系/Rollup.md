# Rollup

## 一、ESM 优先意味着什么

CJS 的 `require` 是运行时函数调用，依赖关系只有在执行到那一行才知道；ESM 的 `import` 是静态声明，**不执行代码就能得到完整的依赖图**。Rollup 的全部优势都建立在这点上：

```
CJS：  const a = require(condition ? 'x' : 'y')   ← 构建期不知道依赖谁
ESM：  import a from 'x'                          ← 构建期静态可见
```

所以 Rollup 能做的事：

1. **静态分析导出/导入的对应关系**，精确知道哪个导出没被用到。
2. **把模块"展平"到同一个作用域**（scope hoisting），产物里没有模块加载运行时。
3. **按引用关系重命名**，避免命名冲突，同时让压缩器有更大的优化空间。

对比 webpack：webpack 为了兼容 CJS 与动态依赖，产物里必须带一套模块运行时（实测见[webpack](./webpack.md)：业务 981 bytes、运行时 6.37 KiB）。Rollup 打同样的代码，产物就是"模块体拼在一起"。

代价也很直接：**Rollup 对 CJS 的支持依赖插件**（`@rollup/plugin-commonjs`），遇到动态 `require` 就无能为力——第八节专门讲这件事。

## 二、tree-shaking：摇掉了什么，留下了什么

先看实测。输入是一个入口 + 两个模块，其中 `math.js` 有一个没人用的导出，`meta.js` 顶层有一句 `console.log`：

> 摘自 `./code/build-lab/rollup-lab/src/math.js`（运行：`npm run rollup:shake`）

```js
export function add(a, b) {
    return a + b
}

export function mul(a, b) {
    return a * b
}

// 这个函数没人用 —— 看它会不会出现在产物里
export function unusedHelper() {
    return '不应该出现在最终产物'
}
```

> 摘自 `./code/build-lab/rollup-lab/src/meta.js`（运行：`npm run rollup:shake`）

```js
export const VERSION = '1.0.0'

// 顶层副作用：会被保留（即使没人引用它的返回值）
console.log('meta.js 被求值了')
```

跑一遍看产物里还剩什么：

> 摘自 `./code/build-lab/rollup-lab/shake.cjs`（运行：`npm run rollup:shake`）

```js
async function build(input, label) {
    const bundle = await rollup({ input })
    const { output } = await bundle.generate({ format: 'es' })
    const code = output[0].code
    console.log(`\n---- ${label} ----`)
    console.log('  含 unusedHelper（未被引用的导出）：', code.includes('unusedHelper'))
    console.log('  含"meta.js 被求值了"（顶层副作用）：', code.includes('meta.js 被求值了'))
    console.log('  产物字符数：', code.length)
}
```

```
---- 入口引用了 math 与 meta ----
  含 unusedHelper（未被引用的导出）： false
  含"meta.js 被求值了"（顶层副作用）： true
  产物字符数： 365

---- 结论 ----
未被引用的导出会被摇掉；但"模块顶层的副作用"会被保留（Rollup 不知道它重不重要）
所以库要声明 sideEffects:false，或者别在模块顶层写有副作用的语句
```

这就是 tree-shaking 的边界，也是三条实践规则的来源：

1. **未被引用的导出会被删**——所以"从大包里按需引入"是有效的。
2. **顶层副作用会被保留**——`console.log`、给 `window` 挂属性、修改原型，这些 Rollup 不敢删，因为它不知道你是不是故意的。
3. **想让整块被删，要么没有副作用，要么声明没有**。库要在 `package.json` 写 `"sideEffects": false`（或数组列出有副作用的文件），打包器才敢把"引用了但没用到导出"的整个模块删掉。

对比[构建全景与选型](./构建全景与选型.md)里的实测：webpack 必须**同时**满足 `sideEffects` 声明和开启压缩（两步）才删得掉；Rollup 一步完成——它自己在构建期就删。

### 二·一、副作用的两档控制：PURE 注解与 moduleSideEffects

"有副作用"这件事其实有两个粒度：**单个表达式**和**整个模块**。分别对应两种声明方式，很多人只知其一。

样本里两个模块各有顶层副作用，`pure.js` 里还有同一工厂函数的两次调用——一次带 PURE 注解，一次不带：

> 摘自 `./code/build-lab/rollup-lab/src-se/pure.js`（运行：`npm run rollup:side-effects`）

```js
// 有副作用的工厂：改了全局对象 —— Rollup 自己证明不了它"纯"
function make(tag) {
    window.__lastTag = tag
    return { tag }
}

// 带注解：Rollup 知道"删掉这个调用不会有副作用"
export const withPure = /*#__PURE__*/ make('pure')

// 不带注解：Rollup 不敢删，因为 make() 里可能干了别的事
export const noPure = make('nopure')
```

只改 `treeshake` 配置，同一份源码出三种产物：

> 摘自 `./code/build-lab/rollup-lab/side-effects.cjs`（运行：`npm run rollup:side-effects`）

```js
async function build(label, treeshake) {
    const bundle = await rollup({ input: INPUT, treeshake })
    const { output } = await bundle.generate({ format: 'es' })
    const code = output[0].code
    const hit = s => String(code.includes(s)).padEnd(5)
    console.log(
        `  ${label.padEnd(26)} lib求值:${hit('lib 被求值')} pure求值:${hit('pure 被求值')} make('pure'):${hit(
            "'pure'"
        )} make('nopure'):${hit("'nopure'")} ${String(code.length).padStart(4)} 字符`
    )
    await bundle.close()
}
```

```
---- 同一份源码，只改 treeshake 配置 ----
  ① 默认（都存在副作用）               lib求值:true  pure求值:true  make('pure'):false make('nopure'):true   404 字符
  ② moduleSideEffects: false lib求值:true  pure求值:false make('pure'):false make('nopure'):false  151 字符
  ③ 只把 pure.js 标成无副作用        lib求值:true  pure求值:false make('pure'):false make('nopure'):false  151 字符

---- 结论 ----
  PURE 注解管「单个表达式」：① 里带注解的 make("pure") 被删，紧邻的不带的没删
  moduleSideEffects 管「整个模块」：② 里 lib.js 与 pure.js 的顶层语句一起消失
  两者粒度不同：注解写在源码里（库作者负责），声明写在配置里（库使用者负责）
  ③ 是真实库的正确姿势：给「确定无副作用的模块」开白名单，而不是一刀切
```

三个读数要连着看：

- **① 里 `make('pure')` 被删、`make('nopure')` 保留**：两个调用长得一模一样，差别只有注解。这就是 `/*#__PURE__*/` 的作用——它告诉 Rollup"这个函数调用除了返回值什么都不影响"，于是"返回值没人用"就等价于"整句可删"。
- **② 里连 `lib.js` 的顶层 `console.log` 都还在**：`moduleSideEffects: false` 说的是"模块没被引用时可以整块删掉"，**不是**"模块内部有副作用的语句可以删"。已经在图里的模块，里面的 `console.log` 照样保留——Rollup 无法证明 `console` 这个全局对象的方法是纯的。
- **③ 才是库的正确用法**：用函数给确定的模块开白名单，而不是全局 `false`。全局关掉的代价是"某个模块真的靠顶层语句初始化"时，你会得到一个能构建成功、运行即崩的产物。

## 三、五种输出格式

同一份输入，切不同格式，差的是"包裹层"：

> 摘自 `./code/build-lab/rollup-lab/formats.cjs`（运行：`npm run rollup:formats`）

```js
const FORMATS = [
    { format: 'es', name: 'esm', ext: 'mjs', desc: 'ES Module：现代浏览器 <script type=module> 与打包器' },
    { format: 'cjs', name: 'cjs', ext: 'cjs', desc: 'CommonJS：Node require' },
    { format: 'umd', name: 'umd', ext: 'js', desc: 'UMD：浏览器全局 + AMD + CJS 三合一' },
    { format: 'iife', name: 'iife', ext: 'js', desc: 'IIFE：直接 <script> 引入，挂到全局变量' },
    { format: 'system', name: 'system', ext: 'js', desc: 'SystemJS：老式模块加载器' }
]
```

实测输出：

```
  [esm] 0.45 KB — ES Module：现代浏览器 <script type=module> 与打包器
  首行: function add(a, b) {
  末行: export { VERSION, calc, sum };

  [cjs] 0.50 KB — CommonJS：Node require
  首行: 'use strict';
  末行: exports.sum = sum;

  [umd] 0.91 KB — UMD：浏览器全局 + AMD + CJS 三合一
  首行: (function (global, factory) {
  末行: }));

  [iife] 0.64 KB — IIFE：直接 <script> 引入，挂到全局变量
  首行: var MyLib = (function (exports) {
  末行: })({});

  [system] 0.86 KB — SystemJS：老式模块加载器
  首行: System.register('MyLib', [], (function (exports) {
  末行: }));

---- 结论 ----
同一份源码，格式差异只在"包裹层"：模块体是一样的
esm 体积最小（没有包裹层），umd 最大（要兼容三种加载方式）
只有 es 格式能被 tree-shaking 二次优化，所以 package.json 的 module/exports 字段要指向它
```

最后一句是发包时最容易搞错的事：`package.json` 里的入口字段必须指向对应格式：

```
main        → cjs 产物（Node / 老打包器）
module      → esm 产物（能被 tree-shaking 的打包器）
exports     → 条件导出（推荐，能同时区分 import / require / types）
```

如果 `main` 指向了 cjs 而没配 `module`，使用方即使只引一个函数也会把整个包打进去。

## 四、external / globals / manualChunks / preserveModules：四个产物开关

格式只影响"怎么包"，这四个开关才决定"包什么、分成几个文件"。样本是一个 200 个导出的假依赖，入口把它整体 re-export 出去——这样依赖一个都摇不掉，差异看得最清楚。

> 摘自 `./code/build-lab/rollup-lab/external.cjs`（运行：`npm run rollup:external`）

```js
// 把裸导入 'react' 指到本地样本（等价于 @rollup/plugin-node-resolve 干的事）
const resolver = {
    name: 'resolver',
    resolveId(source) {
        if (source === 'react') return VENDOR
        return null
    }
}
```

同一份源码，五种产物策略：

```
---- 同一份源码，改产物策略 ----
  ① 全都打进来                    文件  1 个 ·  10170 字符 · 含 helper199:true  含 global.React:false
  ② external 掉 react         文件  1 个 ·     23 字符 · 含 helper199:false 含 global.React:false
  ③ external + UMD globals   文件  1 个 ·    621 字符 · 含 helper199:false 含 global.React:true
  ④ manualChunks 拆 vendor    文件  2 个 ·  14619 字符 · 含 helper199:true  含 global.React:false
     产物： entry.js(3296B) vendor-BwOWxUWu.js(11322B)
  ⑤ preserveModules          文件  2 个 ·  12305 字符 · 含 helper199:true  含 global.React:false
     产物： entry.js(2134B) react.js(10170B)

---- 结论 ----
  external 决定「打不打进来」：② 之后产物里再没有 helper199
  UMD/IIFE 必须配 output.globals：③ 里外部依赖靠 global.React 取，不配就取到 undefined
  manualChunks 决定「分成几个文件」：④ 把依赖单独切出去，便于长缓存
  preserveModules 是「不合并」：⑤ 按源目录结构一比一输出，适合组件库让使用方自己摇
```

**① 和 ② 差了 440 倍**，这就是"忘记 external"的代价：把 `react`、`lodash` 这类使用方一定也有的依赖打进自己的产物，体积翻倍，还可能因为两份实例导致 hooks 报错或 `instanceof` 失效。判断标准很简单——**使用方也可能用到的东西就该 external**，只有内部工具函数才应该打进去。

**③ 是 UMD/IIFE 独有的坑**：external 之后产物里没有依赖源码，运行时去哪取？只能去全局变量取，而"外部模块名 → 全局变量名"的映射必须写在 `output.globals` 里。不配的话 Rollup 只能给个警告，产物里 `React` 变成未定义变量，用户一打开就是白屏。

**④ 和 ⑤ 看起来都是"拆成两个文件"，目的完全不同**：

| 开关 | 产物 | 目的 | 典型场景 |
| --- | --- | --- | --- |
| `manualChunks` | 依赖单独一个 chunk | 长缓存：依赖不常变，业务变不影响它 | 应用 |
| `preserveModules` | 一比一还原源目录 | 不合并：让使用方的打包器自己摇 | 组件库（antd 的 `es/` 目录就是这思路） |

## 五、插件钩子全景：build 钩子与 output 钩子

插件是一个返回钩子对象的函数。但真正决定"代码该写在哪"的，是钩子的**分类**——Rollup 把构建分成两个阶段，各跑一次：

- **build 阶段**（`options` → `buildEnd`）：解析模块、建依赖图。**一次构建只跑一次**，跟你配了几个 output 无关。
- **output 阶段**（`renderStart` → `closeBundle`）：为每个 output 各跑一次。

实测一个"只记录不改写的"插件，看钩子按什么顺序来、各来几次：

> 摘自 `./code/build-lab/rollup-lab/hooks.cjs`（运行：`npm run rollup:hooks`）

```js
// 一个只记录、不改写的插件：把每次钩子调用按顺序记下来
function trace() {
    const log = []
    const plugin = { name: 'trace-hooks' }
    for (const hook of [...BUILD_HOOKS, ...OUTPUT_HOOKS]) {
        plugin[hook] = () => {
            log.push(hook)
            return null // 返回 null = 不改写，交给后面的插件
        }
    }
    return { plugin, log }
}
```

```
---- ① 一次 write 走完的钩子（按首次出现排序）----
   1. options         build 
   2. buildStart      build 
   3. resolveId       build 
   4. load            build 
   5. transform       build 
   6. moduleParsed    build 
   7. buildEnd        build 
   8. renderStart     output
   9. renderChunk     output
  10. generateBundle  output
  11. writeBundle     output
  12. closeBundle     output

---- 每个钩子实际被调用几次（入口 + 2 个依赖模块）----
  options         build  1
  buildStart      build  1
  resolveId       build  3
  load            build  3
  transform       build  3
  moduleParsed    build  3
  buildEnd        build  1
  renderStart     output 1
  renderChunk     output 1
  generateBundle  output 1
  writeBundle     output 1

---- ② 第二次 generate 新增的调用 ----
  options         build  +0
  buildStart      build  +0
  resolveId       build  +0
  load            build  +0
  transform       build  +0
  moduleParsed    build  +0
  buildEnd        build  +0
  renderStart     output +1
  renderChunk     output +1
  generateBundle  output +1
  writeBundle     output +0
  closeBundle     output +0

---- 结论 ----
  build 钩子（options → buildEnd）：一次构建只跑一次，与配了几个 output 无关
  output 钩子（renderStart → closeBundle）：每个 output 各跑一次
  resolveId / load / transform / moduleParsed 按模块数放大：3 个模块就是 3 次
  所以「读源码、解析、建图」放 build 阶段，「改产物、写盘、上报」放 output 阶段
```

三个容易踩的点：

1. **`closeBundle` 只在 bundle 关闭时触发**（`bundle.close()`，或 `bundle.write()` 之后再 close）。只用 `generate()` 且忘了 close，这个钩子不会来。
2. **`resolveId` / `load` / `transform` / `moduleParsed` 是按模块数量放大的**。在这四个钩子里做重活（读磁盘、正则全量替换、起子进程），模块一多就是构建变慢的主因——这也是 Vite 生产构建比 Rollup 快的原因之一（它把 transform 交给了 esbuild/rolldown）。
3. **返回 `null` 表示"我不处理"**，Rollup 会继续问下一个插件。返回 `undefined` 也可以，显式写 `null` 更好读。改代码要返回 `{ code, map }`，只返回字符串等于声明"没有 sourcemap"，调试时定位会错位。

常用钩子的职责边界：

| 钩子 | 阶段 | 干什么 | 不干什么 |
| --- | --- | --- | --- |
| `options` | build | 改输入配置 | 不要在这里读文件 |
| `resolveId` | build | 决定 import 说明符指向哪个 id | 不要改代码 |
| `load` | build | 提供模块内容（虚拟模块就在这） | 不要解析依赖 |
| `transform` | build | 改单个模块的代码 | 看不到最终产物 |
| `moduleParsed` | build | 模块解析完的通知（此时依赖已知） | 改不了代码了 |
| `renderChunk` | output | 改单个 chunk 的代码（能做跨模块改写） | 拿不到最终文件名 |
| `generateBundle` | output | 产物都出来了：加文件、删文件、算体积 | 此时改 chunk 内容要用 `renderChunk` |
| `writeBundle` | output | 已落盘：上报、通知、触发后续流程 | 改产物已经晚了 |

## 六、PluginContext：构建期能拿到什么

钩子函数里的 `this` 就是 PluginContext，它是插件和 Rollup 内核之间的接口。写一个"构建期生成模块依赖图 + 循环依赖检测"的插件，把常用的几个方法走一遍——依赖治理工具就是这么干的：

> 摘自 `./code/build-lab/rollup-lab/context.cjs`（运行：`npm run rollup:context`）

```js
        async buildEnd() {
            // ① this.getModuleIds()：模块图里所有模块的 id
            const ids = [...this.getModuleIds()]

            // ② this.resolve()：用 Rollup 自己的解析器解析一个说明符（不是自己拼路径）
            const resolved = await this.resolve('./a.js', ids[0])
            console.log('  this.resolve("./a.js", entry) →', short(resolved.id))

            // ③ this.getModuleInfo()：读模块的导入/被导入关系
            const edges = []
            for (const id of ids) {
                for (const dep of this.getModuleInfo(id).importedIds) edges.push([short(id), short(dep)])
            }
```

环检测用 DFS 找回头边，然后 `this.warn` / `this.error` 决定它是"报告"还是"门禁"，最后 `this.emitFile` 把图落成一个文件：

> 摘自 `./code/build-lab/rollup-lab/context.cjs`（运行：`npm run rollup:context`）

```js
            // ⑤ this.warn / this.error：诊断带插件名前缀，error 会中断构建
            for (const c of cycles) this.warn(`循环依赖：${c.join(' → ')}`)
            if (cycles.length && failOnCycle) {
                this.error(`存在 ${cycles.length} 处循环依赖，构建终止`)
            }

            // ⑥ this.emitFile：额外产出一个文件（不占 chunk，走 asset 通道）
            this.emitFile({
                type: 'asset',
                fileName: 'module-graph.json',
                source: JSON.stringify({ modules: ids.map(short), edges, cycles }, null, 2)
            })
```

同一个插件换个开关，行为就变了：

```
---- ① 只警告（failOnCycle: false） ----
  this.resolve("./a.js", entry) → src-cycle/a.js
  模块 3 个 · 依赖边 3 条 · 环 1 处
  构建通过；emitFile 产出的 module-graph.json： 394 字节
  警告条数： 2

---- ② 当门禁（failOnCycle: true） ----
  this.resolve("./a.js", entry) → src-cycle/a.js
  构建被中断： [plugin dep-graph] 存在 1 处循环依赖，构建终止

---- 结论 ----
  this.getModuleIds / getModuleInfo 让你在构建期就能拿到完整的模块图
  this.emitFile 产出的是 asset，不进 chunk，适合放清单、报告、类型文件
  this.warn 只提示、this.error 直接中断 —— 同一个插件换个开关就是「报告」或「门禁」
```

PluginContext 常用方法：

| 方法 | 用途 | 注意 |
| --- | --- | --- |
| `this.resolve(source, importer)` | 用 Rollup 的解析器解析说明符 | 别自己 `path.join`，会绕过插件的解析链 |
| `this.getModuleInfo(id)` | 读模块的 `importedIds` / `importers` / `isEntry` | 要在 `moduleParsed` 之后才有完整信息 |
| `this.getModuleIds()` | 遍历模块图 | 返回迭代器，配 `for...of` |
| `this.emitFile({type:'asset'\|'chunk'})` | 产出额外文件 | asset 直接给内容；chunk 可触发新的入口 |
| `this.addWatchFile(file)` | 声明"这个文件变了也要重新构建" | 只在 watch 模式有意义，比如插件读了配置文件 |
| `this.warn(msg)` / `this.error(msg)` | 诊断与中断 | `error` 抛出的错误带 `[plugin xxx]` 前缀 |

## 七、一个真实场景插件：产物体积门禁 + 清单

前面的例子都是"演示钩子"。生产里真正会写的插件长这样：它不改任何代码，只在产物生成后称重量——超预算就中断构建，并留下一份可对比的清单。体积回退是最容易混进代码库的退化，因为它不会让任何测试变红。

> 摘自 `./code/build-lab/rollup-lab/size-gate.cjs`（运行：`npm run rollup:gate`）

```js
function bundleGuard({ limitKb = Infinity, manifest = 'bundle-manifest.json' } = {}) {
    return {
        name: 'bundle-guard',

        // generateBundle 是最后一个能改产物的钩子：此时的 code 就是最终落盘的内容
        generateBundle(outputOptions, bundle) {
            const rows = []
            for (const [fileName, item] of Object.entries(bundle)) {
                const source = item.type === 'chunk' ? item.code : item.source
                rows.push({
                    fileName,
                    type: item.type,
                    raw: Buffer.byteLength(source),
                    gzip: zlib.gzipSync(Buffer.from(source)).length
                })
            }
            rows.sort((a, b) => b.gzip - a.gzip)

            // this.emitFile：额外产出一个清单文件（不占 chunk）
            this.emitFile({
                type: 'asset',
                fileName: manifest,
                source: JSON.stringify(rows, null, 2)
            })
```

超预算的部分用 `this.error` 中断：

> 摘自 `./code/build-lab/rollup-lab/size-gate.cjs`（运行：`npm run rollup:gate`）

```js
            const over = rows.filter(r => r.gzip > limitKb * 1024)
            if (over.length) {
                this.error(`产物超预算：${over.map(r => `${r.fileName} gzip ${r.gzip}B > ${limitKb}KB`).join('；')}`)
            }
```

同一份源码，只改预算：

```
---- ① 预算 100KB（宽松） ----
    ---- 产物清单 ----
      index.js                 chunk  raw    465B  gzip    358B
      合计 gzip 358B，预算 100KB —— 通过
    清单落盘： bundle-manifest.json 92 字节

---- ② 预算 0.15KB（严格） ----
    ---- 产物清单 ----
      index.js                 chunk  raw    465B  gzip    358B
    构建被中断： [plugin bundle-guard] 产物超预算：index.js gzip 358B > 0.15KB

---- 结论 ----
  体积门禁必须用 gzip 后的字节：raw 差 3 倍，用户下载的是 gzip
  清单（manifest）比「打印一行」有用：两次构建对拍才知道是哪天、哪个 chunk 涨上去的
  this.error 让插件从「报告」变成「门禁」——CI 里非零退出码就是靠它
```

三个设计点是这类插件的关键：

1. **量 gzip 而不是 raw**。浏览器拿到的都是压缩后的字节，raw 和 gzip 差 3 倍很常见，拿 raw 定阈值等于自欺欺人。
2. **产出清单而不是只打印**。构建日志会丢，清单文件会进 CI 产物；下次体积涨了，diff 两份 manifest 就知道是哪个 chunk、涨了多少。
3. **阈值按 chunk 而不是总量**。总量会被"新增了一个懒加载 chunk"骗过去，单独给首屏 chunk 定阈值才有意义。

> 虚拟模块（`resolveId` 返回一个 `\0` 开头的 id，再由 `load` 提供内容）也是真实技术，Vite 的 `virtual:` 前缀模块就靠它。但它是"手段"不是"场景"——真要写插件，先想清楚要解决什么问题，再挑钩子。

### 七·一、另一个真实场景：禁用 API 门禁（走 AST）

体积之外，插件另一个高频用途是把**团队约定**变成构建期报错：不许直连 `localStorage`、`console.log` 不许进生产。靠 CR 人肉盯必漏，做成 `fail` 开关的检查就永远漏不了。

规则写成数据、遍历用 `transform` + AST（正则扫得到关键字，扫不到"这是调用还是字符串字面量"）：

> 摘自 `./code/build-lab/plugin-lab/ban-api.mjs`（运行：`npm run plugin:ban`）

```js
const RULES = [
    { id: 'no-direct-storage', test: c => c.object?.name === 'localStorage',
      msg: '禁止直连 localStorage：请用统一的 storage 封装' },
    { id: 'no-console', test: c => c.object?.name === 'console' && c.property?.name === 'log',
      msg: '生产构建不允许 console.log：请用 logger（线上可关）' }
]
// ...在 transform 里 traverse AST，命中的 CallExpression 收集起来
sink.push(...hits.map(h => ({ ...h, file: rel(id) })))
for (const h of hits) {
    // this.warn 只提示、this.error 直接中断：同一个插件换个开关就是「报告」或「门禁」
    if (fail) this.error(`[${h.rule}] ${rel(id)}:${h.line}:${h.column} ${h.msg}`)
    this.warn(`[${h.rule}] ${rel(id)}:${h.line}:${h.column} ${h.msg}`)
}
```

```

---- ① 只警告（fail: false） ----
  构建通过；命中 2 处（警告 2 条）：
    src-ban/order.js:2:4  [no-console] 生产构建不允许 console.log：请用 logger（线上可关）

---- ② 当门禁（fail: true） ----
  构建被中断： [plugin ban-api] ...: [no-console] src-ban/order.js:2:4 生产构建不允许 console.log：请用 logger（线上可关）
```

两个踩点直接复用第七节的结论：`this.error` 抛出的那一刻构建就停，所以**门禁模式只报出第一处**；想一次报全所有违规，正确的做法是 `transform` 里只收集、到 `buildEnd` 再统一 `this.error` 一次（和 `sizeGate` 在 `generateBundle` 收尾是一个道理）。这套 `warn`/`error` 双档、数据化规则、AST 判定，是组件库按需引入之外的另一个跨三工具通用模板——想让 webpack/Vite 也跑，用 unplugin 包一层即可（见 [webpack](./webpack.md) 第十二节、[Vite](./Vite.md) 第十二节）。

## 八、CJS 互操作：为什么离不开 plugin-commonjs

Rollup 只认 ESM。一个 CommonJS 文件在它眼里就是"给一个叫 `module` 的变量赋值"：

> 摘自 `./code/build-lab/rollup-lab/src-cjs/dep.cjs`（运行：`npm run rollup:cjs`）

```js
// 一个 CommonJS 模块：Rollup 眼里这就是"给一个叫 module 的变量赋值"
function greet(name) {
    return 'hi ' + name
}

module.exports = { greet }
```

不加插件直接打包，入口 `import pkg from './dep.cjs'` 会失败——因为这个文件根本没有导出：

```
---- ① 不加 commonjs 插件 ----
  构建失败： rollup-lab/src-cjs/entry.js (1:7): "default" is not exported by "rollup-lab/src-cjs/dep.cjs", imported by "rollup-lab/src-cjs/entry.js".

---- ② 手写 mini-commonjs ----
  构建通过；产物：
    // 一个 CommonJS 模块：Rollup 眼里这就是"给一个叫 module 的变量赋值"
    function greet(name) {
        return 'hi ' + name
    }
    var pkg = { greet };
    console.log(pkg.greet('rollup'));
  含 module.exports： false

---- 结论 ----
  Rollup 只认 ESM：CJS 的 module.exports 在它眼里就是一行普通赋值语句
  @rollup/plugin-commonjs 干的就是「把赋值改写成导出」，上面 20 行是它的最小形态
  真实插件还要处理：动态 require、混合导出、条件导出、interop 的 default 包装
  所以「库里带 CJS 依赖」不是 Rollup 的短板，而是必须多配一个插件的成本
```

手写的 20 行替身只处理了两种最常见的写法：

> 摘自 `./code/build-lab/rollup-lab/cjs.cjs`（运行：`npm run rollup:cjs`）

```js
// 一个 20 行能跑的 @rollup/plugin-commonjs 替身：只处理两种最常见的写法
function miniCommonjs() {
    return {
        name: 'mini-commonjs',
        transform(code, id) {
            if (!id.endsWith('.cjs')) return null
            let out = code
            if (/module\.exports\s*=/.test(out)) {
                out = out.replace(/module\.exports\s*=/g, 'export default')
            } else {
                out = out.replace(/exports\.(\w+)\s*=/g, 'export const $1 =')
            }
            return { code: out, map: null }
        }
    }
}
```

真实插件比这复杂得多，因为它要处理：动态 `require`、一个文件里同时有 `module.exports` 和 `exports.x`、条件分支里的导出、以及最麻烦的 **interop**——CJS 的 `module.exports` 对应到 ESM 到底是 `default` 还是命名空间，需要按调用方式生成包装函数（产物里那些 `_interopDefault`、`__toESM` 就是这么来的）。

判断一个依赖"能不能不打插件直接用"，看它的 `package.json`：有 `module` 或 `exports.import` 字段的走 ESM 分支，只有 `main` 且是 CJS 的必须过插件。

## 九、库打包的实践清单

| 事项 | 做法 | 原因 |
| ---- | ---- | ---- |
| 依赖不打包 | `external: ['react', 'vue']`，或用函数按 `package.json` 的 dependencies 自动生成 | 避免把 react 打两份、体积翻倍（实测第四节：440 倍） |
| 双格式 | `output` 传数组：`[{ format: 'es', file: 'x.mjs' }, { format: 'cjs', file: 'x.cjs' }]` | esm 给打包器、cjs 给 Node |
| UMD/IIFE 配 globals | `output.globals: { react: 'React' }` | 不配就取到 undefined |
| 类型声明 | 用 `tsc --emitDeclarationOnly` 或 `rollup-plugin-dts` | 转译器不产出 `.d.ts` |
| 声明副作用 | `package.json` 里 `"sideEffects": false`，或用 `treeshake.moduleSideEffects` 开白名单 | 让使用方能整块摇掉（实测第二节） |
| 保留 sourcemap | `output.sourcemap: true` | 使用方报错能定位到源码 |
| 产物体积检查 | `generateBundle` 里算 gzip 并卡阈值（第七节） | 体积回退要能及时发现 |
| 依赖图门禁 | `buildEnd` 里查循环依赖，`this.error` 中断（第六节） | 循环依赖在 ESM 下会静默变成 `undefined` |

一个常见错误：把 lodash 这类依赖打进产物。判断标准很简单——**使用方也可能用到的东西就该 external**；只有内部工具函数才应该打进去。

## 十、Rollup 与 Vite：什么透传，什么不通用

Vite 的生产构建用的就是 Rollup（新版本逐步换成 Rolldown，配置兼容），所以很多知识是通用的：

| 配置 | 在 Vite 里 | 说明 |
| ---- | ---- | ---- |
| `build.rollupOptions.input/output/external` | 直接透传 | 想配 manualChunks、globals 就写在这 |
| `build.rollupOptions.plugins` | 直接透传 | Rollup 插件大多能直接用 |
| Rollup 的 `resolveId/load/transform` 钩子 | 通用 | 两边写起来一样 |
| Vite 的 `config` / `configResolved` | **Vite 独有** | Rollup 没有"改配置"这个阶段 |
| Vite 的 `configureServer` / `handleHotUpdate` | **Vite 独有** | dev server 与 HMR 是 Vite 的产物 |
| Vite 的 `transformIndexHtml` | **Vite 独有** | Rollup 不产出 HTML |
| `optimizeDeps` | **Vite 独有** | 依赖预构建是 dev 阶段的概念，见 [Vite](./Vite.md) |

反过来说，一个为 Vite 写的插件如果用了 `configureServer` 或 `transformIndexHtml`，它就不能给纯 Rollup 用——unplugin 存在的理由就是给 Rollup/Vite/webpack 三端一致的外壳，跨工具的自定义插件写法见 [Vite](./Vite.md) 第十二节。

## 十一、Rollup 不适合什么

| 场景 | 为什么不用 Rollup |
| ---- | ---- |
| 应用开发 | 没有 dev server、没有 HMR、对 CJS 依赖要靠插件——这正是 Vite 存在的原因 |
| 需要 Module Federation | 运行时共享依赖的能力在 webpack 生态 |
| 复杂非 JS 资源 | 图片、字体、CSS 的处理链 webpack 更成熟 |
| 依赖大量 CJS 的老项目 | 每个 CJS 依赖都要过 commonjs 插件，转换结果还可能有 interop 陷阱 |

一句话总结分工：**应用用 Vite（开发）+ Rolldown/Rollup（生产），库用 Rollup**。两者不是竞争关系，Vite 的生产构建本身就是用同一套打包能力。

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/rollup-lab/shake.cjs` | tree-shaking 边界：未用导出 vs 顶层副作用 | 二、tree-shaking |
| `./code/build-lab/rollup-lab/src/math.js` | 含未被引用导出的模块 | 二、tree-shaking |
| `./code/build-lab/rollup-lab/src/meta.js` | 含顶层副作用的模块 | 二、tree-shaking |
| `./code/build-lab/rollup-lab/side-effects.cjs` | PURE 注解 vs moduleSideEffects 三档对照 | 二·一、副作用 |
| `./code/build-lab/rollup-lab/src-se/pure.js` | 带/不带 PURE 注解的两个调用 | 二·一、副作用 |
| `./code/build-lab/rollup-lab/formats.cjs` | 五种输出格式体积与首末行对比 | 三、五种输出格式 |
| `./code/build-lab/rollup-lab/external.cjs` | external / globals / manualChunks / preserveModules | 四、四个产物开关 |
| `./code/build-lab/rollup-lab/hooks.cjs` | 钩子全景：执行顺序与调用次数（build vs output） | 五、插件钩子全景 |
| `./code/build-lab/rollup-lab/context.cjs` | PluginContext：模块图 + 环检测 + emitFile | 六、PluginContext |
| `./code/build-lab/rollup-lab/src-cycle/a.js` | 循环依赖样本（a ↔ b） | 六、PluginContext |
| `./code/build-lab/rollup-lab/size-gate.cjs` | 真实插件：产物体积门禁 + 清单 | 七、真实场景插件 |
| `./code/build-lab/plugin-lab/ban-api.mjs` | 真实插件：禁用 API 门禁（AST + warn/error） | 七·一、禁用 API 门禁 |
| `./code/build-lab/rollup-lab/cjs.cjs` | CJS 互操作：不加插件的报错 + 手写 commonjs 替身 | 八、CJS 互操作 |
| `./code/build-lab/rollup-lab/src-cjs/dep.cjs` | CommonJS 样本 | 八、CJS 互操作 |

运行：`cd code/build-lab && npm install`，然后 `npm run rollup:shake`、`npm run rollup:side-effects`、`npm run rollup:formats`、`npm run rollup:external`、`npm run rollup:hooks`、`npm run rollup:context`、`npm run rollup:gate`、`npm run rollup:cjs`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[esbuild 与 Rust 工具链](./esbuild%20与%20Rust%20工具链.md)
- 下一篇：[Vite](./Vite.md)
- [Rollup 官方文档](https://rollupjs.org/)
- [Rollup 插件钩子](https://rollupjs.org/plugin-development/)
