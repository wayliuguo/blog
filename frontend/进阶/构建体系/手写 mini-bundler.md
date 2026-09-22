# 手写 mini-bundler

## 一、一个打包器最少要做什么

前面几篇讲的都是「怎么用打包器」。这一篇换一个方向：自己写一个能跑的打包器，把 webpack / Rollup 内部那些名词（模块图、模块 id、运行时、循环依赖）落到 200 行可读的代码上。

去掉所有优化之后，打包器只剩四件事：

```
1. 解析依赖      从入口读文件，找出它 import 了谁
2. 建模块图      DFS 递归下去，给每个模块分配一个 id
3. 转换          把 ESM 语法改成 CJS 的 require / exports
4. 生成产物      模块表 + 一个几十行的运行时，包成 IIFE
```

产物结构就长这样：

```
(function (modules) {
    const cache = {}
    function __require(id) { ... }     ← 运行时：30 行左右
    __require(0)                        ← 从入口开始执行
})({
    0: function (module, exports, __require) { /* 入口代码 */ },
    1: function (module, exports, __require) { /* 第二个模块 */ },
    // ...
})
```

真实打包器的产物也是这个骨架（webpack 的 `__webpack_require__`、Rollup 的 cjs 输出同理），区别只在运行时里的功能多寡。

## 二、跑起来：5 个模块进，1 个文件出

被处理的源码是一个普通的小项目，四种 import 形式各用一遍：

```
mini-bundler/src/
├── entry.js          import { greet } / import config / import * as ns / import '副作用'
├── greet.js          依赖 utils/upper.js
├── config.js         export default + export { x as y }
├── side-effect.js    没有任何 export，只为副作用被引入
└── utils/upper.js    叶子模块
```

> 摘自 `./code/build-lab/mini-bundler/src/entry.js`

```js
// 入口：四种 import 形式各用一遍
import { greet, SEPARATOR } from './greet.js'
import config from './config.js'
import * as upperUtils from './utils/upper.js'
import './side-effect.js'

console.log(greet(config.name))
console.log(upperUtils.upper('namespace import'))
console.log(SEPARATOR)
console.log('版本：' + config.version)
```

`src/` 下放了一份 `package.json`（`{"type": "module"}`），所以这些文件可以被 Node 直接按 ESM 执行——这正是后面做对照实验的前提。

> 摘自 `./code/build-lab/mini-bundler/bundle.cjs`（运行：`npm run mini`）

```js
const ROOT = __dirname
const ENTRY = path.resolve(ROOT, process.argv[2] || 'src/entry.js')
const OUT_FILE = path.join(ROOT, 'dist', 'bundle.js')
```

实测输出：

```
---- 1. 模块图（DFS 发现顺序，id 0 是入口）----
   0  src/entry.js                 → 依赖 [1, 3, 2, 4]
   1  src/greet.js                 → 依赖 [2]
   2  src/utils/upper.js           → 依赖 []
   3  src/config.js                → 依赖 []
   4  src/side-effect.js           → 依赖 []
  共 5 个模块

---- 2. ESM → CJS 转换（取第一个含 import 的模块）----
  文件：src/entry.js
  - import { greet, SEPARATOR } from './greet.js'
  - import config from './config.js'
  - import * as upperUtils from './utils/upper.js'
  - import './side-effect.js'
  =>
  + const { greet, SEPARATOR } = __require(1)
  + const __m3 = __require(3); const config = __m3.default
  + const upperUtils = __require(2)
  + __require(4)

---- 3. 产物 ----
  写出 dist/bundle.js：2035 字节
  源码合计 878 字节 → 产物是源码的 2.32 倍（差额是运行时 + 包装）

---- 4. 执行结果对照 ----
  原生 ESM：node src/entry.js
    [side-effect] 模块被加载了
    hello, MINI-BUNDLER
    NAMESPACE IMPORT
    ----------------
    版本：1.0.0
  打包产物：node dist/bundle.js
    [side-effect] 模块被加载了
    hello, MINI-BUNDLER
    NAMESPACE IMPORT
    ----------------
    版本：1.0.0
```

两边输出逐行相同。注意 `0` 号的依赖是 `[1, 3, 2, 4]`——不是源码里写的顺序，而是**深度优先的完成顺序**，这一点下一节解释。

## 三、依赖解析：相对路径怎么变成磁盘文件

打包器拿到的只是字符串 `'./greet.js'`，得先算出它到底是谁：

> 摘自 `./code/build-lab/mini-bundler/bundle.cjs`

```js
/**
 * 把 import 语句里的裸字符串，解析成磁盘上真实存在的文件绝对路径。
 *
 * 是打包器的「寻址」步骤：拿到字符串 './greet.js'，算出它到底是谁。
 *
 * @param {string} specifier - import 里的模块标识，如 './greet.js' 或 'react'
 * @param {string} importer   - 引用者（当前模块）的绝对路径，作为相对路径的基准目录
 * @returns {string} 命中磁盘文件的绝对路径
 * @throws {Error} 裸模块（不以 . 开头）或三个候选文件都不存在时抛错
 */
function resolveId(specifier, importer) {
    // 只支持相对路径依赖；裸模块（node_modules 包）一律报错，第 5 篇的 @rollup/plugin-node-resolve 才处理
    if (!specifier.startsWith('.')) {
        throw new Error(`只支持相对路径依赖，遇到裸模块 ${specifier}（来自 ${rel(importer)}）`)
    }
    // 相对路径的基准是「引用者所在目录」，不是入口目录——这是必须带 importer 的原因
    const abs = path.resolve(path.dirname(importer), specifier)
    // 浏览器要求写全后缀，真实打包器会替我们补：./x → ./x.js → ./x/index.js
    for (const candidate of [abs, abs + '.js', path.join(abs, 'index.js')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    throw new Error(`找不到模块 ${specifier}（来自 ${rel(importer)}）`)
}
```

三件事值得对照真实工具：

- **相对路径的基准是「引用者所在目录」**，不是入口目录。所以 `resolveId` 必须带 `importer` 参数。webpack 里对应 `resolve` 配置与 `enhanced-resolve`。
- **补后缀**：浏览器里 `import './x.js'` 必须写全后缀，bundler 会替我们试 `.js` / `/index.js`。这也是为什么打包后的代码能在没有文件系统的环境里跑——后缀在构建期就定死了。
- **裸模块会直接抛错**：不处理 `node_modules`，也不处理 `exports` 字段。真实打包器在这一步要做几件事：按 `node_modules` 逐级向上找、读 `package.json` 的 `main` / `module` / `exports` 条件导出、处理别名与 `external`。第 5 篇 Rollup 的 `@rollup/plugin-node-resolve` 干的就是这个活。

## 四、建图：DFS + 「先登记再递归」

> 摘自 `./code/build-lab/mini-bundler/bundle.cjs`（运行：`npm run mini`）

```js
/** @type {Map<string, {id:number, file:string, code:string, ast:object, deps:Array<{spec:string,id:number}>}>} 绝对路径 → 模块记录 */
const modules = new Map()

/**
 * 深度优先收集模块：从一个入口开始，递归读文件、解析 AST、收集 import/export。
 *
 * 兼做去重与防环（见内部 modules.has 的注释），是理解整个打包器的核心。
 *
 * @param {string} file - 模块绝对路径
 * @returns {{id:number, file:string, code:string, ast:object, deps:Array}} 该模块的记录（已登记进 modules）
 */
function collect(file) {
    if (modules.has(file)) return modules.get(file)

    const code = fs.readFileSync(file, 'utf8')
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
    // id = modules.size：发现顺序即编号；入口最先 collect，所以 id 是 0
    const record = { id: modules.size, file, code, ast, deps: [] }
    // 先登记再递归：循环依赖（a → b → a）靠这一步终止（否则无限递归栈溢出）
    modules.set(file, record)

    for (const node of ast.body) {
        if (!node.source) continue
        if (!/^(Import|Export)/.test(node.type)) continue
        record.deps.push({ spec: node.source.value, id: collect(resolveId(node.source.value, file)).id })
    }
    return record
}
```

四个细节决定了它能不能正确工作：

1. **`modules.has(file)` 既去重又防环**。同一个模块被两个地方 import，只会有一条记录；`a → b → a` 这种环，第二次进 `a` 时直接返回已有记录。
2. **`modules.set` 必须在递归之前**。如果先递归再登记，循环依赖会无限递归直到栈溢出——这正是第 2 篇讲的编译器「先建容器再填内容」的同一手法。
3. **id = `modules.size`**，也就是「发现顺序」。因为 `collect(target)` 写在 `push` 之前，id 是**子树先分配完、父节点后 push**——所以出现 `deps: [1, 3, 2, 4]` 这种看着乱、实际是 DFS 前序的结果。真实打包器用数字 id 也正是为了产物里能用 `__require(3)` 这种最短写法。
4. **用 acorn 解析而不是正则**。`import` 可能有多种写法（`import x, { y } from`、多行、注释），正则匹配在真实代码里一定会翻车。这里只用 `ast.body` 的顶层语句就够，不需要遍历整棵树——因为 ESM 的 import / export 只能出现在顶层。

## 五、转换：四种 import 形式 → 一种 require

AST 拿到手，剩下的就是把 ESM 语法映射成 CJS 语义。因为要**原地改写**（其余代码一行不动、行号尽量不变），这里用 `magic-string`：

> 摘自 `./code/build-lab/mini-bundler/bundle.cjs`

```js
/**
 * 把一条 import 语句映射成一段 __require 表达式，覆盖四种形式。
 *
 * @param {object} node - 对应的 ImportDeclaration AST 节点
 * @param {number} id   - 该依赖在依赖图中的编号（transform 已解析好的最短数字）
 * @returns {string} 拼好的 CJS 代码片段
 */
function renderImport(node, id) {
    const specs = node.specifiers
    if (specs.length === 0) return `__require(${id})` // 只为副作用

    const ns = specs.find(s => s.type === 'ImportNamespaceSpecifier')
    if (ns) return `const ${ns.local.name} = __require(${id})`

    const def = specs.find(s => s.type === 'ImportDefaultSpecifier')
    const named = specs
        .filter(s => s.type === 'ImportSpecifier')
        .map(s => (s.imported.name === s.local.name ? s.local.name : `${s.imported.name}: ${s.local.name}`))

    if (!def) return `const { ${named.join(', ')} } = __require(${id})`

    // default 与具名混用：先拿一份命名空间，再分别解构（__m3 是临时变量）
    const tmp = `__m${id}`
    const parts = [`const ${tmp} = __require(${id})`, `const ${def.local.name} = ${tmp}.default`]
    if (named.length) parts.push(`const { ${named.join(', ')} } = ${tmp}`)
    return parts.join('; ')
}
```

对应关系：

| ESM 写法 | 转换结果 |
| ---- | ---- |
| `import './x.js'` | `__require(4)` |
| `import * as ns from './x.js'` | `const ns = __require(2)` |
| `import { a, b as c } from './x.js'` | `const { a, b: c } = __require(1)` |
| `import d from './x.js'` | `const __m3 = __require(3); const d = __m3.default` |

三条容易忽略的点：

- **别名要换向**。`import { b as c }` 里 `imported` 是 `b`、`local` 是 `c`，展开成解构要写成 `{ b: c }`——顺序和 ESM 相反，写反了会静默拿到 undefined。
- **default 要显式取 `.default`**。CJS 没有 default 的概念，`module.exports` 就是导出对象本身，所以 default 导出被约定放在 `exports.default` 上。ESM 的 `import d` 因此必须翻译成 `.default` 而不是整个对象。
- **混用时要临时变量**。`import d, { a } from 'm'` 这一条语句里有两种取值方式，只能先拿命名空间再拆开（代码里的 `__m3`）。

## 六、转换：三种 export 形式 → exports 赋值

export 侧的处理策略是「**就地删关键字 + 末尾统一赋值**」：

> 摘自 `./code/build-lab/mini-bundler/bundle.cjs`

```js
        } else if (node.type === 'ExportDefaultDeclaration') {
            s.overwrite(node.start, node.declaration.start, 'exports.default = ')
            s.appendLeft(node.end, ';')
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
            // export const a = 1  →  const a = 1（末尾再补 exports.a = a）
            s.overwrite(node.start, node.declaration.start, '')
            for (const name of declaredNames(node.declaration)) tail.push(`exports.${name} = ${name}`)
        } else if (node.type === 'ExportNamedDeclaration') {
            if (node.source) throw new Error(`暂不支持 export ... from（${rel(record.file)}）`)
            s.overwrite(node.start, node.end, '')
            for (const sp of node.specifiers) tail.push(`exports.${sp.exported.name} = ${sp.local.name}`)
        } else if (node.type === 'ExportAllDeclaration') {
            throw new Error(`暂不支持 export * from（${rel(record.file)}）`)
        }
```

实测产物里三个模块的 export 部分：

> 摘自 `./code/build-lab/mini-bundler/dist/bundle.js`

```
    // 1: src/greet.js
    1: function (module, exports, __require) {
        const { upper } = __require(2)

        function greet(name) {
            return 'hello, ' + upper(name)
        }

        const SEPARATOR = '-'.repeat(16)

        exports.greet = greet
        exports.SEPARATOR = SEPARATOR
    },
```

`export function greet` 被拆成两步：删掉 `export ` 前缀变回普通函数声明，再在末尾补 `exports.greet = greet`。`export { config as defaultConfig }` 同理，末尾出现 `exports.defaultConfig = config`。

这个「末尾统一赋值」的做法有个明确的语义损失，必须说清楚：

- **赋值发生在模块执行完之后**，所以导出是**快照**而不是活绑定。ESM 里 `export let n = 0` 之后改 `n`，引用方能立刻看到新值；在这里只能看到模块执行结束那一刻的值。
- **写反了的顺序会咬人**：`declaredNames` 要处理解构声明（`export const { a, b } = obj`），漏了某个名字，产物里就没有对应的 `exports`。
- **`export * from` 直接抛错**而不是静默忽略——这是有意的：静默忽略会让产物在运行时缺字段，排查成本远高于构建期报错。

## 七、运行时：缓存的写入时机决定一切

> 摘自 `./code/build-lab/mini-bundler/bundle.cjs`

```js
/**
 * 把全部模块拼装成一个自执行函数：一个模块表 + 一个精简的 __require 运行时。
 *
 * 每个模块被包进 `function (module, exports, __require)`，天然获得独立作用域；
 * 运行时最关键的几行是 cache 的写入时机（见下方生成代码里的注释）。
 *
 * @param {Array<{id:number, file:string, output:string}>} list - 全部模块，按 id 顺序排列
 * @returns {string} 最终产物代码文本（可直接用 node 运行）
 */
function generate(list) {
    const out = [
        '// 由 mini-bundler 生成（手写打包器，仅供理解原理，勿用于生产）',
        '(function (modules) {',
        '    const cache = {}                 // 已执行模块的导出缓存（保证每个模块只跑一次）',
        '    function __require(id) {',
        '        if (cache[id]) return cache[id].exports',
        '        const module = { exports: {} }',
        '        // 先入缓存再执行：循环依赖时对方才能拿到「未完成」的导出对象',
        '        cache[id] = module',
        '        modules[id](module, module.exports, __require)',
        '        return module.exports',
        '    }',
        '    __require(0)                     // 从入口（id 0，第一个被 collect 的模块）开始执行',
        '})({'
    ]
```

运行时只有 8 行有效代码，但每一步都有原因：

- **`cache` 让模块只执行一次**。这也是 CJS `require` 的行为——第 5 篇 Rollup 篇里「模块只执行一次」的结论，在这里就是三行代码。
- **`cache[id] = module` 必须写在执行模块代码之前**。这是整个运行时最关键的一行，下一节用实测说明。
- **`module.exports` 作为参数传进去**，所以模块代码里既能写 `exports.x = 1`，也能写 `module.exports = {...}`。
- **包装成函数 = 模块作用域**。每个模块的变量关在自己的函数里，天然不会互相污染——第 2 篇讲模块化的「文件即模块、有独立作用域」，实现手段就是这个包装。

## 八、循环依赖：打包改变了模块语义

这是自己写一遍打包器才能看清的事：**同一份源码，跑原生 ESM 和跑打包产物，结果不一样**。

先看函数导出（`a.js` 导出 `function a`，`b.js` 在顶层就读它）：

> 摘自 `./code/build-lab/mini-bundler/src/cycle/b.js`

```js
import { a } from './a.js'

// 顶层就读 a：ESM 的 import 是活绑定，且函数声明会被提升，所以这里拿得到值；
// 打包成 CJS 后 exports.a 还没赋值，拿到的就是 undefined
console.log('b.js 顶层读到 a：' + typeof a)

export function b() {
    return 'b'
}
```

实测输出（`npm run mini:cycle`）：

```
---- 4. 执行结果对照 ----
  原生 ESM：node src/cycle/entry.js
    b.js 顶层读到 a：function
    entry 拿到 a：a -> b
  打包产物：node dist/bundle.js
    b.js 顶层读到 a：undefined
    entry 拿到 a：a -> b
```

同一个位置，原生跑是 `function`，打包产物是 `undefined`。原因在「缓存的写入时机」：

```
原生 ESM：绑定是"活"的
  entry → a.js 开始执行 → import b → b.js 开始执行
        → import a（a.js 已在执行中，但绑定已在模块环境里注册）
        → 读 a：函数声明提升，值已存在 → function

打包产物：绑定是"快照"
  __require(0) → a.js 开始执行 → __require(2) → b.js 开始执行
        → __require(1) 命中 cache（a.js 的 module 已登记）
        → 返回 a.js 那个还没赋值的 exports 对象 → exports.a === undefined → undefined
```

`cache[id] = module` 提前写入，正是为了让循环引用能拿到「半成品」而不是死循环——代价就是**半成品里可能还没有你要的东西**。

换成 `const` 导出，差别会从「值不同」升级成「行为不同」：

> 摘自 `./code/build-lab/mini-bundler/src/cycle-tdz/b.js`

```js
import { a, A_NAME } from './a.js'

// 顶层就读：函数声明有提升，const 没有 —— 两者命运不同
console.log('b.js 顶层读到 a：' + typeof a)
console.log('b.js 顶层读到 A_NAME：' + A_NAME)

export function b() {
    return 'b'
}
```

实测输出（`npm run mini:tdz`）：

```
---- 4. 执行结果对照 ----
  原生 ESM：node src/cycle-tdz/entry.js
    [退出码 1] ReferenceError: Cannot access 'A_NAME' before initialization
  打包产物：node dist/bundle.js
    b.js 顶层读到 a：undefined
    b.js 顶层读到 A_NAME：undefined
    entry 拿到 a：a -> b
```

原生 ESM **直接抛错并中止**（`const` 没有提升，读它就是 TDZ 错误）；打包产物把这次「本该炸掉的访问」静默变成 `undefined`，然后**一路跑完了**。

这就是循环依赖在真实项目里难查的根源：**打包把「构建期/加载期就该暴露的错误」推迟成了「运行期的 undefined」**。第三篇讲 webpack 时提过「模块数 ≠ 文件数」，那是结构上的差异；这里看到的是语义上的差异，代价更隐蔽。

实践上的结论：**不要依赖循环依赖**。真遇到了，先怀疑设计（两个模块互相需要，通常说明职责边界没划清），改不了的就在函数内部延迟引用（把 `import` 拿到的值在调用时才用），而不是在模块顶层读。

## 九、它离真实打包器还差什么

这个实现能正确处理 import / export / 副作用 / 循环依赖，但**不能拿去用**。差距清单：

| 能力 | 这里 | 真实打包器 |
| ---- | ---- | ---- |
| 解析依赖 | 只支持相对路径 | `node_modules` 查找、`exports` 条件导出、别名、`external` |
| Tree-shaking | 无，导出全留 | 基于静态分析标记未使用导出（第 1 / 5 篇） |
| 作用域提升 | 无，每个模块包一层函数 | Rollup 把多个模块合并进同一作用域 |
| 代码分割 | 无，永远单文件 | 动态 `import()` 切 chunk（第 8 篇） |
| 非 JS 资源 | 无 | loader / plugin 处理 CSS、图片、JSON |
| Sourcemap | 无 | 转换时同步生成（第 7 篇「transform 要还 sourcemap」） |
| 循环依赖语义 | 快照，可能静默 undefined | 同样有这个限制——这是打包成 CJS 的固有代价 |
| 增量构建 | 无 | 持久化缓存（第 3 篇） |
| HMR | 无 | dev server + 模块热替换（第 4 篇） |

最有意思的一条是第七行：**循环依赖的语义损失不是「我这个实现太简陋」，而是「打包成 CJS」这件事本身的代价**。webpack 用 CJS 语义实现 ESM，就同样带着这个限制；Rollup 通过作用域提升能部分缓解，但也无法完全还原 ESM 的活绑定与 TDZ 行为。理解了这一层，再看「为什么有的打包器一定要走原生 ESM」，就不只是「快」的问题了。

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/mini-bundler/bundle.cjs` | 打包器主体：依赖解析 / 建图 / 转换 / 生成 / 对照执行 | 三 · 四 · 五 · 六 · 七 |
| `./code/build-lab/mini-bundler/src/entry.js` | 入口：四种 import 形式各用一遍 | 二、跑起来 |
| `./code/build-lab/mini-bundler/src/greet.js` | 具名导出 + 依赖叶子模块 | 六、三种 export |
| `./code/build-lab/mini-bundler/src/config.js` | `export default` + `export { x as y }` | 六、三种 export |
| `./code/build-lab/mini-bundler/src/side-effect.js` | 无导出的副作用模块 | 五、四种 import |
| `./code/build-lab/mini-bundler/src/utils/upper.js` | 叶子模块（相对路径多一层） | 三、依赖解析 |
| `./code/build-lab/mini-bundler/src/cycle/b.js` | 循环依赖：函数导出在顶层被读 | 八、循环依赖 |
| `./code/build-lab/mini-bundler/src/cycle-tdz/b.js` | 循环依赖：const 导出在顶层被读 | 八、循环依赖 |
| `./code/build-lab/mini-bundler/src/package.json` | `{"type":"module"}`，让源码能被原生 ESM 直接跑（对照的前提） | 二、跑起来 |

运行：`cd code/build-lab && npm install`，然后

- `npm run mini` —— 正常项目，产物与原生 ESM 逐行对照
- `npm run mini:cycle` —— 循环依赖（函数导出）
- `npm run mini:tdz` —— 循环依赖（const 导出）

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[编译与 AST](./编译与%20AST.md)
- 下一篇：[webpack](./webpack.md)
- [acorn 文档](https://github.com/acornjs/acorn)
- [magic-string 文档](https://github.com/Rich-Harris/magic-string)
- [webpack 运行时代码解析](https://webpack.js.org/concepts/modules/)
