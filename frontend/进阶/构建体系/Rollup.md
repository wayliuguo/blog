# Rollup

Rollup 是"库打包"的默认答案：组件库、SDK、工具包发布到 npm，基本都是它（或基于它的 tsup / tsdown / Vite lib 模式）。它的设计从第一天就是 **ESM 优先**——这个选择带来了最干净的 tree-shaking 和最小的产物，也决定了它不适合直接打包应用。

本篇用三种实测回答三个问题：它凭什么摇得比别人干净、同一份源码的五种输出格式差多少、插件该怎么写。

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

对比 webpack：webpack 为了兼容 CJS 与动态依赖，产物里必须带一套模块运行时（实测见[Webpack 深入](./Webpack%20深入.md)：业务 981 bytes、运行时 6.37 KiB）。Rollup 打同样的代码，产物就是"模块体拼在一起"。

代价也很直接：**Rollup 对 CJS 的支持依赖插件**（`@rollup/plugin-commonjs`），遇到动态 `require` 就无能为力。

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

## 四、插件：四个钩子足够

Rollup 插件就是一个返回钩子对象的函数。最常用的四个钩子对应模块生命周期的四个阶段：

```
resolveId  "这个 import 说明符指向哪个模块 id？"
   ↓
load       "这个 id 的内容是什么？"
   ↓
transform  "内容要不要改一改？"
   ↓
generateBundle  "产物出来了，要不要加点什么？"
```

实测一个"虚拟模块"插件——它凭空造出一个磁盘上不存在的模块：

> 摘自 `./code/build-lab/rollup-lab/custom-plugin.cjs`（运行：`npm run rollup:plugin`）

```js
function buildInfoPlugin(options = {}) {
    return {
        name: 'build-info',

        // resolveId：决定一个 import 说明符指向哪个模块
        resolveId(source) {
            if (source === VIRTUAL_ID) {
                return RESOLVED_ID // \0 前缀是"虚拟模块"的约定，告诉其他插件别去磁盘找
            }
            return null // 返回 null 表示"我不处理，交给后面的插件"
        },

        // load：提供模块内容
        load(id) {
            if (id === RESOLVED_ID) {
                const info = {
                    builtAt: new Date().toISOString(),
                    env: options.env || 'unknown'
                }
                return `export const BUILD_INFO = ${JSON.stringify(info)};`
            }
            return null
        },

        // transform：改写已有模块的代码（这里给每个模块加一行来源标记）
        transform(code, id) {
            if (id.startsWith('\0')) return null
            if (!id.endsWith('.js')) return null
            return {
                code: `// from ${path.basename(id)}\n${code}`,
                map: null // 返回 null 表示不产出 sourcemap（真实插件应返回 map）
            }
        },

        // generateBundle：产物生成后、写盘前
        generateBundle(outputOptions, bundle) {
            console.log('---- generateBundle：产物清单 ----')
            for (const [name, item] of Object.entries(bundle)) {
                const size = item.type === 'chunk' ? item.code.length : item.source.length
                console.log(`  ${name.padEnd(16)} ${item.type.padEnd(6)} ${(size / 1024).toFixed(2)} KB`)
            }
        }
    }
}
```

产物里虚拟模块被内联了：

```
---- generateBundle：产物清单 ----
  main.js          chunk  0.28 KB

---- 产物里虚拟模块被内联了 ----
const BUILD_INFO = {"builtAt":"2026-09-19T03:14:16.660Z"};
    return { result: add(a, b) * mul(a, b), builtAt: BUILD_INFO.builtAt }
```

三个约定必须记住：

1. **虚拟模块 id 用 `\0` 开头**。这是社区约定，其他插件看到 `\0` 就知道别去磁盘找这个文件。
2. **钩子返回 `null` 表示"我不处理"**，Rollup 会继续问下一个插件。返回 `undefined` 也行，但显式写 `null` 更好读。
3. **改代码要返回 `{ code, map }`**。只返回字符串会被当成"没有 sourcemap"，调试时定位会错位。演示里返回 `map: null` 是刻意的简化。

`transform` 钩子的写法：

> 摘自 `./code/build-lab/rollup-lab/custom-plugin.cjs`（运行：`npm run rollup:plugin`）

```js
        // transform：改写已有模块的代码（这里给每个模块加一行来源标记）
        transform(code, id) {
            if (id.startsWith('\0')) return null
            if (!id.endsWith('.js')) return null
            return {
                code: `// from ${path.basename(id)}\n${code}`,
                map: null // 返回 null 表示不产出 sourcemap（真实插件应返回 map）
            }
        },
```

## 五、库打包的实践清单

| 事项 | 做法 | 原因 |
| ---- | ---- | ---- |
| 依赖不打包 | `external: ['react', 'vue']` 或用 `@rollup/plugin-node-resolve` 只解析不打包 | 避免把 react 打两份、体积翻倍 |
| 双格式 | `output` 传数组：`[{ format: 'es', file: 'x.mjs' }, { format: 'cjs', file: 'x.cjs' }]` | esm 给打包器、cjs 给 Node |
| 类型声明 | 用 `tsc --emitDeclarationOnly` 或 `rollup-plugin-dts` | 转译器不产出 `.d.ts` |
| 声明副作用 | `package.json` 里 `"sideEffects": false` | 让使用方能整块摇掉 |
| 保留 sourcemap | `output.sourcemap: true` | 使用方报错能定位到源码 |
| 产物体积检查 | `generateBundle` 里打印或接入 size-limit | 体积回退要能及时发现 |

一个常见错误：把 lodash 这类依赖打进产物。判断标准很简单——**使用方也可能用到的东西就该 external**；只有内部工具函数才应该打进去。

## 六、Rollup 不适合什么

| 场景 | 为什么不用 Rollup |
| ---- | ---- |
| 应用开发 | 没有 dev server、没有 HMR、对 CJS 依赖要靠插件——这正是 Vite 存在的原因 |
| 需要 Module Federation | 运行时共享依赖的能力在 webpack 生态 |
| 复杂非 JS 资源 | 图片、字体、CSS 的处理链 webpack 更成熟 |

一句话总结分工：**应用用 Vite（开发）+ Rolldown/Rollup（生产），库用 Rollup**。两者不是竞争关系，Vite 的生产构建本身就是用同一套打包能力。

## 小结

- Rollup
  - ESM 优先
    - 静态 `import` 让构建期就拿到完整依赖图
    - 收益：精确 tree-shaking、作用域提升、无运行时注入
    - 代价：CJS 要靠插件，动态 require 不支持
  - tree-shaking 的边界
    - 实测：未被引用的导出被删（false），顶层副作用保留（true）
    - 库要声明 `sideEffects:false`，或不在模块顶层写副作用
    - 对比 webpack：Rollup 一步完成，webpack 要"标记 + 压缩器"两步
  - 五种输出格式
    - esm 0.45 KB（最小）→ cjs 0.50 → iife 0.64 → system 0.86 → umd 0.91 KB
    - 差异只在包裹层；只有 es 能被二次 tree-shaking
    - `main`→cjs、`module`→esm、`exports` 条件导出
  - 插件四个钩子
    - resolveId → load → transform → generateBundle
    - 虚拟模块 id 用 `\0` 前缀；不处理就返回 `null`
    - transform 返回 `{ code, map }`
  - 库打包清单
    - 依赖 external、双格式、类型声明、sideEffects、sourcemap、体积检查
  - 不适合
    - 应用开发（无 dev server / HMR）、MF、复杂非 JS 资源

## 配套代码

本篇示例来自 `code/build-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/build-lab/rollup-lab/shake.cjs` | tree-shaking 边界：未用导出 vs 顶层副作用 | 二、tree-shaking |
| `./code/build-lab/rollup-lab/src/math.js` | 含未被引用导出的模块 | 二、tree-shaking |
| `./code/build-lab/rollup-lab/src/meta.js` | 含顶层副作用的模块 | 二、tree-shaking |
| `./code/build-lab/rollup-lab/formats.cjs` | 五种输出格式体积与首末行对比 | 三、五种输出格式 |
| `./code/build-lab/rollup-lab/custom-plugin.cjs` | 虚拟模块插件：resolveId / load / transform / generateBundle | 四、插件 |

运行：`cd code/build-lab && npm install`，然后 `npm run rollup:shake`、`npm run rollup:formats`、`npm run rollup:plugin`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Vite](./Vite.md)
- 下一篇：[esbuild 与 Rust 工具链](./esbuild%20与%20Rust%20工具链.md)
- [Rollup 官方文档](https://rollupjs.org/)
- [Rollup 插件钩子](https://rollupjs.org/plugin-development/)
