# Rollup

> 本篇只讲**生产配置**——具体到 Rollup，就是**库打包**：`external` 排除依赖、一次出多份格式、tree-shaking、体积门禁，全部用**手写插件**实现。组织方式与 [webpack](./webpack.md) / [Vite](./Vite.md) 两篇一致：一份配置 + 手写插件 + 断点调试；差别在于库打包关注的东西不一样——不是"页面多快打开"，而是"**使用方能不能按需引入、会不会被多打一份依赖**"。

## 一、ESM 优先：Rollup 的心智模型

```
CJS：  const a = require(condition ? 'x' : 'y')   ← 构建期不知道依赖谁
ESM：  import a from 'x'                          ← 构建期静态可见
```

CJS 的 `require` 是运行时函数调用，依赖关系只有执行到那一行才知道；ESM 的 `import` 是静态声明，**不执行代码就能得到完整依赖图**。Rollup 的全部优势都建立在这点上：

1. **静态分析导出 / 导入的对应关系**，精确知道哪个导出没被用到（tree-shaking 的前提）。
2. **把模块"展平"到同一个作用域**（scope hoisting），产物里没有模块加载运行时。
3. **按引用关系重命名**，避免命名冲突，同时给压缩器更大的优化空间。

对比 webpack：webpack 为兼容 CJS 与动态依赖，产物里必须带一套模块运行时（业务代码之外还要多背一份 runtime）。Rollup 打同样的代码，产物就是"模块体拼在一起"——本 lab 的 `dist/index.mjs` 里既没有 `__webpack_require__`，也没有 `__webpack_require__.e`，只有函数定义加一行 `export {...}`。

代价也很直接：**Rollup 对 CJS 的支持依赖插件**（`@rollup/plugin-commonjs`），遇到动态 `require` 就无能为力——第七节专门讲这件事。

## 二、生产配置全览（库打包）

先分清"库打包"和"应用打包"的差别，配置项才有意义：

| | 应用打包（webpack / Vite） | 库打包（Rollup） |
| --- | --- | --- |
| 依赖怎么处理 | 全打进来 | 使用方一定也有的依赖 `external` 掉 |
| 产物格式 | 一种（给浏览器） | 多份（esm 给打包器、cjs 给 Node） |
| 产物体积 | 压缩 + 分割 + hash 长缓存 | 越小越好，且要能被打包器二次 tree-shaking |
| 门禁 | 首屏体积 | 库体积 + 禁用 API + 依赖图 |

配置本身只有五类，与 webpack 那五类一一对应：

| 类别 | Rollup 配置 | 对应 webpack |
| --- | --- | --- |
| 入口 | `input` | `entry` |
| 出口 | `output`（**数组**：多格式） | `output.path` / `filename` |
| 转换 | `plugins`（Rollup 没有内置转换，全靠插件） | `module.rules` + loader |
| 扩展 | `plugins` | `plugins` |
| 优化 | `external` / `treeshake` | `optimization` / `externals` |

> 摘自 `./code/rollup-lab/rollup.config.mjs`（运行：`npm run build`）

```js
export default defineConfig({
    input: 'src/index.js',

    // 使用方一定也有的依赖不打进来：否则 react 会被打两份，hooks 直接报错
    external: ['react'],

    // 声明副作用：让使用方能整块摇掉"引用了但没用到导出"的模块
    treeshake: { moduleSideEffects: false },

    plugins: [
        miniVirtual(),
        // fail: false 只警告；改成 true 就从"报告"变成"门禁"（CI 里非零退出码靠它）
        banApi({ fail: false }),
        miniCommonjs()
    ],

    output: [
        {
            format: 'es',
            file: 'dist/index.mjs',
            sourcemap: true,
            // 体积门禁 + 清单只挂在一个 output 上，避免每种格式各出一份
            plugins: [sizeGate({ limitKb: 2, manifest: 'bundle-manifest.json' })]
        },
        {
            format: 'cjs',
            file: 'dist/index.cjs',
            exports: 'named',
            sourcemap: true
        }
    ]
})
```

三个要点：

- **`output` 是数组**：一次构建出多份格式，这是 Rollup 的招牌能力（webpack 要跑多次构建）。
- **`external` 是库打包的第一原则**。忘了它，`react` 会被打进产物——体积翻倍，还可能因为两份实例导致 hooks 报错、`instanceof` 失效（见第六节）。
- **`treeshake.moduleSideEffects` 是"给使用方的承诺"**：声明本库的模块没有副作用，使用方才能把"引用了但没用到导出"的整个模块删掉。它等价于 `package.json` 里的 `"sideEffects": false`，只是写在构建配置里。

配套代码只有两个命令，且共用同一份配置：

| 命令 | 做什么 | 产物 |
| --- | --- | --- |
| `npm run build` | `rollup -c`，构建多格式产物 | `rollup-lab/dist/` |
| `npm run mini:cjs` | CJS 互操作对照（第七节） | 控制台输出 |

**没有 preview 命令**——库产物不是给人打开看的页面。它的验收方式是三件事：读产物、跑单测、让使用方试装（`npm pack` 后装进一个 demo 项目里 import 一次）。

## 三、tree-shaking：摇掉了什么，留下了什么

先看实测。入口引用了 `math.js`（里面有一个没人用的导出）和 `meta.js`（顶层有一句副作用）：

> 摘自 `./code/rollup-lab/src/math.js`（运行：`npm run build`）

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

> 摘自 `./code/rollup-lab/src/meta.js`（运行：`npm run build`）

```js
export const VERSION = '1.0.0'

// 顶层副作用：会被保留（即使没人引用它的返回值）
globalThis.__metaLoaded = true
```

跑一遍看 `dist/index.mjs` 里还剩什么：

```
export { useState } from 'react';

function add(a, b) { return a + b }
function mul(a, b) { return a * b }

const VERSION = '1.0.0';

// 顶层副作用：会被保留（即使没人引用它的返回值）
globalThis.__metaLoaded = true;
// …

export { VERSION, calc, describe, logOrder, sum };
```

两个读数：

- **`unusedHelper` 不见了**——未被引用的导出被删掉了。所以"从大包里按需引入"是有效的。
- **`globalThis.__metaLoaded = true` 还在**——顶层副作用被保留。Rollup 不敢删，因为它不知道你是不是故意的。

这就是 tree-shaking 的边界，也是三条实践规则的来源：

1. **未被引用的导出会被删**。
2. **顶层副作用会被保留**：`console.log`、给 `window` 挂属性、修改原型，这些 Rollup 一律不敢动。
3. **想让整块被删，要么没有副作用，要么声明没有**——库要在 `package.json` 写 `"sideEffects": false`（或用数组列出有副作用的文件），使用方的打包器才敢把整个模块删掉。

顺带一个容易忽略的细节：`BUILD_INFO` 是从虚拟模块（第四节）注入的对象，产物里只剩 `{"version":"1.0.0"}`——`name` 属性因为没人访问而被删了。**tree-shaking 细到对象字面量的属性级**。

一条必须记住的区分：**`moduleSideEffects: false` ≠ 模块内副作用语句可删**。它说的是"模块没被引用时可以整块删掉"，不是"模块内部有副作用的语句可以删"。已经在依赖图里的模块，里面的副作用语句照样保留。真要精确控制，用函数给确定的模块开白名单，而不是全局 `false`——全局关掉的代价是"某个模块真靠顶层语句初始化"时，你会得到一个能构建成功、运行即崩的产物。

对比 [构建全景与选型](./构建全景与选型.md)：webpack 必须**同时**满足 `sideEffects` 声明和开启压缩（两步）才删得掉；Rollup 一步完成——它自己在构建期就删。

## 四、手写插件（一）：虚拟模块与禁用 API 门禁

### 4.1 mini-virtual：给源码一个"磁盘上不存在"的模块

`src/index.js` 里写着 `import { BUILD_INFO } from 'virtual:build-info'`，磁盘上没有这个文件。虚拟模块靠两个钩子配合：`resolveId` 认领说明符、`load` 提供内容。

> 摘自 `./code/rollup-lab/plugins/mini-virtual.mjs`（运行：`npm run build`）

```js
const VIRTUAL_ID = 'virtual:build-info'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export default function miniVirtual() {
    return {
        name: 'mini-virtual',

        resolveId(source) {
            if (source === VIRTUAL_ID) return RESOLVED_ID
            return null // 返回 null = 这个模块我不管，交给链上的下一个插件
        },

        load(id) {
            if (id !== RESOLVED_ID) return null
            // 这里返回的就是"模块源码"，它会像真实文件一样被后续插件 transform
            return `export const BUILD_INFO = ${JSON.stringify({ name: pkg.name, version: pkg.version })}\n`
        }
    }
}
```

三个关键点：

1. **虚拟 id 用 `\0` 打头**。这是 Rollup 生态的约定，表示"这不是真实路径"，避免后续插件或解析器再去磁盘找它。Vite 的 `virtual:` 前缀模块也是同一套机制。
2. **`resolveId` 返回 `null` 表示"我不处理"**，把说明符交还给插件链。返回 `undefined` 也行，显式写 `null` 更好读。
3. **`load` 返回的字符串就是模块源码**，它会像真实文件一样被后续插件 `transform`——所以虚拟模块里也能写 `import`、也会被 tree-shaking（上面 `name` 被摇掉就是证据）。

真实用途：构建期注入版本号 / git commit / 特性开关 / 环境标识，都不需要磁盘上真有那个文件。

### 4.2 ban-api：把团队约定变成构建期报错

体积之外，插件另一个高频用途是把**团队约定**卡在构建期：不许直连 `localStorage`、`console.log` 不许进生产。靠 CR 人肉盯必漏，做成带 `fail` 开关的检查就永远漏不了。

规则写成数据、判定走 AST（正则扫得到关键字，扫不到"这是调用还是字符串字面量"）：

> 摘自 `./code/rollup-lab/plugins/ban-api.mjs`（运行：`npm run build`）

```js
const RULES = [
    {
        id: 'no-direct-storage',
        test: callee => callee.object?.name === 'localStorage',
        msg: '禁止直连 localStorage：请用统一的 storage 封装（它有容量兜底与隐私模式降级）'
    },
    {
        id: 'no-console',
        test: callee => callee.object?.name === 'console' && callee.property?.name === 'log',
        msg: '生产构建不允许 console.log：请用 logger（线上可关）'
    }
]

// …（walk：极简 AST 递归遍历，把命中的 CallExpression 收集进 hits）
export default function banApi({ rules = RULES, fail = false } = {}) {
    return {
        name: 'ban-api',

        transform(code, id) {
            if (!id.endsWith('.js')) return null
            const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true })
            const hits = []
            // …遍历 AST，命中的 CallExpression 收集进 hits（含 line / column）
            for (const h of hits) {
                const at = `${id.split(/[/\\]/).pop()}:${h.line}:${h.column}`
                // this.warn 只提示、this.error 直接中断：同一个插件换个开关就是"报告"或"门禁"
                if (fail) this.error(`[${h.rule}] ${at} ${h.msg}`)
                this.warn(`[${h.rule}] ${at} ${h.msg}`)
            }
            return null
        }
    }
}
```

实测（`npm run build`，`fail: false` 只警告、构建继续）：

```
(!) [plugin ban-api] src/order.js: [no-direct-storage] order.js:3:4 禁止直连 localStorage：请用统一的 storage 封装（它有容量兜底与隐私模式降级）
(!) [plugin ban-api] src/order.js: [no-console] order.js:4:4 生产构建不允许 console.log：请用 logger（线上可关）
```

三个设计点：

1. **规则数据化**：新增一条禁用项只加一个对象，不用改遍历逻辑。
2. **判定走 AST**：正则能扫到 `localStorage` 这个词，但扫不到"它是调用还是字符串字面量"——注释里提一句 `localStorage` 就会误报。
3. **`warn` / `error` 双档**：`fail: false` 是"报告"（本地开发友好），`fail: true` 是"门禁"（CI 里非零退出码靠它）。同一个插件换一个开关就是两种身份。

一个配套的注意点：`this.error` 抛出的那一刻构建就停，所以门禁模式**只报出第一处**违规。想一次报全，正确的做法是 `transform` 里只收集、到 `buildEnd` 再统一 `this.error` 一次（和第五节 `sizeGate` 在 `generateBundle` 收尾是一个道理）。

## 五、手写插件（二）：CJS 替身与体积门禁

### 5.1 mini-commonjs：二十行替身

Rollup 只认 ESM。一个 CJS 文件在它眼里就是"给一个叫 `module` 的变量赋值"，于是入口 `import pkg from './dep.cjs'` 拿不到任何导出。这个插件在 `transform` 阶段把赋值改写成导出：

> 摘自 `./code/rollup-lab/plugins/mini-commonjs.mjs`（运行：`npm run build`）

```js
export default function miniCommonjs() {
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

它只处理两种最常见的写法。真实插件（`@rollup/plugin-commonjs`）还要处理动态 `require`、混合导出、条件导出，以及最麻烦的 interop 包装——第七节展开。

### 5.2 size-gate：产物体积门禁

> 摘自 `./code/rollup-lab/plugins/size-gate.mjs`（运行：`npm run build`）

```js
import zlib from 'node:zlib'

export default function sizeGate({ limitKb = Infinity, manifest = 'bundle-manifest.json' } = {}) {
    return {
        name: 'size-gate',

        // generateBundle 是最后一个能改产物的钩子：此时的 code 就是最终落盘的内容
        generateBundle(_options, bundle) {
            const rows = []
            for (const [fileName, item] of Object.entries(bundle)) {
                // sourcemap 不发给用户，不参与称重
                if (fileName.endsWith('.map')) continue
                const source = item.type === 'chunk' ? item.code : item.source
                rows.push({
                    fileName,
                    type: item.type,
                    raw: Buffer.byteLength(source),
                    gzip: zlib.gzipSync(Buffer.from(source)).length
                })
            }
            rows.sort((a, b) => b.gzip - a.gzip)

            // this.emitFile：额外产出一个清单文件（走 asset 通道，不占 chunk）
            this.emitFile({ type: 'asset', fileName: manifest, source: JSON.stringify(rows, null, 2) })

            // …（此处打印一行行清单，见下）
            const over = rows.filter(r => r.gzip > limitKb * 1024)
            if (over.length) {
                this.error(`产物超预算：${over.map(r => `${r.fileName} gzip ${r.gzip}B > ${limitKb}KB`).join('；')}`)
            }
            // …（末尾再打印一行合计读数）
        }
    }
}
```

实测（`npm run build`）：

```
src/index.js → dist/index.mjs, dist/index.cjs...
  ---- 产物清单 ----
    index.mjs                chunk  raw   1062B  gzip    722B
    合计 gzip 722B，预算 2KB —— 通过
created dist/index.mjs, dist/index.cjs in 77ms
```

四个设计点：

1. **量 gzip 而不是 raw**。浏览器 / 下载端拿到的都是压缩后的字节，raw 与 gzip 差 3 倍很常见，拿 raw 定阈值等于自欺欺人。
2. **产出清单而不是只打印**。构建日志会丢，`bundle-manifest.json` 会进 CI 产物；下次体积涨了，diff 两份清单就知道是哪个 chunk、涨了多少。
3. **阈值按 chunk 而不是总量**。总量会被"新增了一个文件"骗过去。
4. **只挂在一个 output 上**（`output.plugins` 而不是顶层 `plugins`）。原因见第八节：**output 钩子每个 output 各跑一次**，挂在顶层会让 esm 与 cjs 各出一份清单，互相覆盖。

体积回退是最容易混进代码库的退化，因为它不会让任何测试变红——所以它值得一个专门的插件。

## 六、external 与多格式产物

### 6.1 external：决定"打不打进来"

配置里只有一行 `external: ['react']`，产物差别是决定性的。esm 产物第一行直接透传：

```
export { useState } from 'react';
```

cjs 产物则换成 require：

```
'use strict';
var react = require('react');
// …
Object.defineProperty(exports, "useState", {
    enumerable: true,
    get: function () { return react.useState; }
});
```

`react` 一行代码都没进产物。**忘记 external 的代价是双份依赖**：体积翻倍只是最小的损失，更严重的是使用方自己的 `react` 与库里的 `react` 是两个实例——hooks 直接报错，`instanceof` 静默失效。判断标准很简单：**使用方也可能用到的东西就该 external**，只有内部工具函数才应该打进去。

### 6.2 多格式：一次构建出多份

`output` 传数组，一次构建同时产出 esm 与 cjs。格式差异只在"包裹层"，模块体是一样的：

| 格式 | 首行 / 末行 | 谁在用 | 体积 |
| --- | --- | --- | --- |
| `es` | `export { useState } from 'react';` … `export { … };` | 现代打包器、`<script type="module">` | 最小（无包裹层） |
| `cjs` | `'use strict';` … `exports.sum = sum;` | Node `require` | 略大 |
| `umd` | `(function (global, factory) {` … `}));` | 浏览器全局 + AMD + CJS 三合一 | 最大 |
| `iife` | `var MyLib = (function (exports) {` … `})({});` | 直接 `<script>` 引入 | 中等 |
| `system` | `System.register('MyLib', [], (function (exports) {` … `}));` | SystemJS 加载器 | 较大 |

两个判断：

- **只有 `es` 格式能被使用方二次 tree-shaking**，所以 `package.json` 的 `module` / `exports.import` 必须指向它。
- **UMD / IIFE 必须配 `output.globals`**：external 之后产物里没有依赖源码，运行时只能去全局变量取，"外部模块名 → 全局变量名"的映射要写在这里（`globals: { react: 'React' }`）。不配的话 Rollup 只给个警告，产物里 `React` 是未定义变量，用户一打开就是白屏。

`package.json` 的入口字段怎么指：

```
main        → cjs 产物（Node / 老打包器）
module      → esm 产物（能被 tree-shaking 的打包器）
exports     → 条件导出（推荐，能同时区分 import / require / types）
```

如果 `main` 指向 cjs 而没配 `module`，使用方即使只引一个函数，也会把整个包打进去。

`exports: 'named'` 这个选项也值得说一句：它让 cjs 产物用 `Object.defineProperty(exports, "useState", {...})` 而不是 `exports = {...}` 覆盖整个对象——这样 Node 的 `cjs-module-lexer` 能静态识别出命名导出，`import { useState } from 'pkg'` 才成立。

### 6.3 与 Vite 的关系：什么透传，什么不通用

Vite 的生产构建走的就是 Rollup 这一套（8.x 起是 Rolldown，配置兼容），所以本节的 `external` / `output` / `manualChunks` 知识在 `build.rollupOptions` 里直接通用；反过来，`config` / `configResolved` / `configureServer` / `transformIndexHtml` / `optimizeDeps` 是 Vite 独有，用了它们的插件就不能给纯 Rollup 用。跨工具复用的统一外壳是 unplugin。

一句话分工：**应用用 Vite（开发）+ Rolldown/Rollup（生产），库用 Rollup**。两者不是竞争关系。

## 七、CJS 互操作：为什么离不开 plugin-commonjs

Rollup 只认 ESM。一个 CommonJS 文件在它眼里就是"给一个叫 `module` 的变量赋值"：

> 摘自 `./code/rollup-lab/src/dep.cjs`（运行：`npm run mini:cjs`）

```js
// 一个 CommonJS 模块：Rollup 眼里这就是"给一个叫 module 的变量赋值"
function greet(name) {
    return 'hi ' + name
}

module.exports = { name: 'rollup-lab', greet }
```

跑 `npm run mini:cjs`，同一个文件走两遍：

```
---- ① 不加 commonjs 插件（Rollup 只认 ESM） ----
  构建通过；产物：
    function greet(name) {
        return 'hi ' + name
    }

    module.exports = { name: 'rollup-lab', greet };

  含 module.exports： true

---- ② 手写 mini-commonjs 替身 ----
  构建通过；产物：
    function greet(name) {
        return 'hi ' + name
    }

    var dep = { name: 'rollup-lab', greet };

    export { dep as default };

  含 module.exports： false

---- 结论 ----
  Rollup 只认 ESM：CJS 的 module.exports 在它眼里就是一行普通赋值语句
  替身插件做的事就是「把赋值改写成导出」；真实插件还要处理动态 require 与 interop 包装
```

读数很清楚：① 里产物原样保留 `module.exports = {...}`——对 ESM 使用方来说"这个文件根本没有导出"；② 里被改写成 `export { dep as default }`，使用方这才 import 得到。

> 这个实验把 `dep.cjs` 直接当入口，所以两边都"构建通过"。真实场景是入口 `import pkg from './dep.cjs'`——那时不加插件会直接报 `"default" is not exported by dep.cjs`。本 lab 的 `src/index.js` 正是这个场景，所以配置里必须挂 `miniCommonjs()`。

真实插件比这 20 行复杂得多，因为它要处理：动态 `require`、一个文件里同时有 `module.exports` 和 `exports.x`、条件分支里的导出，以及最麻烦的 **interop**——CJS 的 `module.exports` 对应到 ESM 到底是 `default` 还是命名空间，取决于使用方怎么导入，只能生成包装函数在运行时判断（产物里那些 `_interopDefault`、`__toESM` 就是这么来的）。

判断一个依赖"能不能不打插件直接用"，看它的 `package.json`：有 `module` 或 `exports.import` 字段的走 ESM 分支；只有 `main` 且是 CJS 的必须过插件。

## 八、断点调试

调试自己写的插件，不需要任何"调试插件"——断点直接打在 `plugins/*.mjs`、`rollup.config.mjs` 里就能命中，因为它们是我们自己的源码，不在 `node_modules`。

要解决的同样是**入口**：`npm run build` 的链路是 `npm.cmd → node → … → rollup`，中间隔了一层，Windows 下 `--inspect-brk` 传不到真正的 node 进程。所以用 VS Code 的 `launch.json`，让 `program` 走 npm 命令：

> 摘自 `./code/rollup-lab/.vscode/launch.json`（运行：`npm run build`）

```jsonc
{
    // 在 rollup-lab 目录打开工作区，F5 即可调试 rollup 构建。
    // 断点直接打在 plugins/*.mjs、rollup.config.mjs 里就能命中。
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "调试 rollup 构建",
            "runtimeExecutable": "npm",
            "runtimeArgs": ["run", "build"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal",
            "skipFiles": ["<node_internals>/**"]
        }
    ]
}
```

`runtimeExecutable: "npm"` + `runtimeArgs: ["run", "build"]` 就是"用 npm 命令方式调试"——改脚本不用改 `launch.json`。位置在 `rollup-lab/.vscode/launch.json`，以 `rollup-lab` 为工作区根打开时可直接 F5。

三条注意：

- 断点打在 `transform` 里，能看到 `code` 与 `id`。排查"我的插件为什么没生效"就下在这：看 `id` 是否符合预期、是不是被前面的插件拦下了。
- 断点打在 `generateBundle` 里能看到 `bundle` 的最终形态——**它会因 `output` 数组被执行两次**（esm 一次、cjs 一次）。这正是 5.2 里 `sizeGate` 只挂在一个 output 上的原因。
- 别用 `node_modules/.bin/rollup` 启动调试：Windows 下 `rollup.cmd` 多包了一层批处理，`--inspect-brk` 传不到 node。若以仓库根为工作区打开 VS Code，嵌套的 `.vscode/launch.json` 不生效，需把这段配置合并进根配置。

## 配套代码

本篇示例来自 `code/rollup-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/rollup-lab/package.json` | 两个命令：`build` / `mini:cjs` | 二 |
| `./code/rollup-lab/rollup.config.mjs` | **唯一配置**：external / treeshake / 多格式 output / 手写插件 | 二、六 |
| `./code/rollup-lab/src/index.js` | 库入口：多导出 + external + CJS 依赖 + 虚拟模块 | 二、三、六 |
| `./code/rollup-lab/src/math.js` | 含未被引用导出的模块 | 三 |
| `./code/rollup-lab/src/meta.js` | 含顶层副作用的模块 | 三 |
| `./code/rollup-lab/src/order.js` | ban-api 命中样本 | 四 |
| `./code/rollup-lab/src/dep.cjs` | CommonJS 依赖样本 | 五、七 |
| `./code/rollup-lab/plugins/mini-virtual.mjs` | 手写虚拟模块插件 | 四 |
| `./code/rollup-lab/plugins/ban-api.mjs` | 手写禁用 API 门禁（AST + warn/error 双档） | 四 |
| `./code/rollup-lab/plugins/mini-commonjs.mjs` | 手写 CJS 替身（二十行） | 五、七 |
| `./code/rollup-lab/plugins/size-gate.mjs` | 手写体积门禁 + manifest | 五 |
| `./code/rollup-lab/mini-cjs.mjs` | CJS 互操作对照（不加插件 vs 替身） | 七 |
| `./code/rollup-lab/.vscode/launch.json` | VS Code 调试配置（`program` 走 npm 命令） | 八 |

运行：`cd code/rollup-lab && npm install`，然后 `npm run build`（构建）、`npm run mini:cjs`（CJS 互操作对照）。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Vite](./Vite.md)
- [Rollup 官方文档](https://rollupjs.org/)
- [Rollup 插件钩子](https://rollupjs.org/plugin-development/)