# 面试题 · Rollup

> 对齐知识体系 frontend/构建体系/Rollup.md。与 Vite 面试题篇互为姊妹篇：Vite 的生产构建内核就是 Rollup，插件钩子通用。

## 一、心智模型与定位

### 1. Rollup 是什么？定位是什么？

**结论：ESM 优先的 JavaScript 打包器，面向「库」的产物形态——tree-shaking 首创者、产物零运行时胶水；Vue / React / Vite 自身的构建都用它。**

- 定位关键词：类库 / SDK / 工具包——产物干净、体积小、多格式输出
- 与应用打包器的分工：应用（要 HMR、代码分割、资源处理）用 Webpack / Vite；库（要干净 ESM 产物、极致体积）用 Rollup
- 三个立身之本：ESM 静态分析、tree-shaking、Scope Hoisting
- 追问：为什么主流框架的发布产物都用 Rollup 打？
  - 框架产物要求「无运行时、可 tree-shaking、体积极致」——这正是 Rollup 的设计目标

### 2. 为什么 Rollup 的产物小且干净？

**结论：四个原因叠加——ESM 静态结构可分析、tree-shaking 编译期剔除、Scope Hoisting 拍平模块闭包、无 webpack 式运行时加载器；产物几乎等同手写的单文件。**

- 逐条
  - ESM 静态：import / export 只能顶层声明，编译期即可精确推导引用关系
  - tree-shaking：未引用的导出直接不进产物（Webpack 是标记 + 压缩阶段删除）
  - Scope Hoisting：所有模块拍平进同一作用域，变量重命名防冲突——没有每个文件包一层函数的开销
  - 零运行时：没有模块注册表与 require 加载器，产物没有「打包器存在感」
- 追问：Webpack 的产物多出来的「运行时」是什么？
  - `webpack_require` 模块加载器 + 每模块的闭包包裹——为兼容多模块规范付出的结构成本

### 3. Rollup 和 Webpack 的定位对比？

**结论：库 vs 应用——Rollup 为库产物极致优化（ESM 纯净、无运行时），Webpack 为应用全功能（HMR、分割、资源、多模块规范兼容）。**

| 维度 | Rollup | Webpack |
| --- | --- | --- |
| 定位 | 类库 / SDK | 应用（SPA / MPA） |
| 模块机制 | 原生 ESM 为核心 | 多规范兼容（CJS/AMD/ESM） |
| 运行时开销 | 0（Scope Hoisting 拍平） | 模块注册表 + 加载器 |
| tree-shaking | 首创，编译期直接剔除 | 标记 + Terser 压缩删除 |
| 代码分割 | 动态 import 驱动，无额外加载器 | 功能更强（精细控制、运行时加载） |
| HMR / dev server | 弱（非它的领域） | 开箱即用 |

- 追问：Vite 出现后这个分工变了吗？
  - 没变，只是被封装了——Vite 生产内核就是 Rollup，应用开发者感受不到，但库作者直接面对 Rollup 的场景依然在

### 4. 什么时候直接用 Rollup，什么时候用 Vite？

**结论：打包要发布的 npm 包用 Rollup（external + 多格式 + 类型产物），业务应用用 Vite；Vite 库模式只覆盖简单场景，精细控制回到 Rollup。**

- 直接 Rollup 的信号：多入口、复杂 external 规则、需要 exports 条件导出与 dts 全流程控制、CI 体积门禁
- 用 Vite（应用）的信号：有页面、有 HMR 需求、依赖框架插件生态
- 中间态：单入口小组件库可用 Vite 库模式（本质是封装好的 Rollup）
- 追问：库和应用的打包诉求差在哪？
  - 库关心「给别人的产物形态」（格式、类型、external），应用关心「给自己的运行效果」（缓存、首屏、HMR）——诉求不同工具就不同

## 二、tree-shaking

### 5. tree-shaking 的原理？

**结论：基于 ESM 静态结构的「标记-清除」——编译期从入口出发跟踪每个导出的引用，未被引用的导出连同代码在产物中直接剔除；CJS 动态特性摇不动。**

- 为什么 ESM 能摇而 CJS 不能
  - ESM：import / export 静态声明，编译期建好引用图
  - CJS：require 是运行时函数调用、module.exports 可动态赋值——无法静态确定「谁被用到」
- 工作过程：建模块图 → 从入口标记实际使用的导出 → 未标记的连同语句剔除（类标记-清除算法）
- 与死代码删除（DCE）的区别：DCE 删的是函数内的不可达分支；tree-shaking 删的是「模块级没人 import 的导出」——粒度不同、机制不同
- 追问：摇掉的代码在压缩阶段才消失吗？
  - Rollup 直接不生成（产物级剔除）；Webpack 是标记 unused 后由 Terser 在压缩阶段删——这是两者实现的核心差异之一

### 6. package.json 的 sideEffects 字段是干什么的？

**结论：向打包器声明「本包模块有没有副作用」——防止有副作用的 import 被误删；`false` 表示全无副作用可放心摇，数组列白名单。**

```json
{
  "sideEffects": ["*.css", "./src/polyfill.js"]
}
```

- 经典坑：CSS 的 import（`import './a.css'`）没有导出值——不声明 sideEffects 会被当死代码摇掉
- 声明收益：库作者声明后，消费方打包时摇得更准更狠
- 与 tree-shaking 的关系：tree-shaking 靠静态分析，sideEffects 是「分析不出来时的人工兜底声明」
- 追问：`sideEffects: false` 什么情况是危险的？
  - 包里有 polyfill 或样式注册这类「import 即生效、无导出」的模块——声明 false 后它们会被静默删掉

### 7. tree-shaking 什么时候会失效？

**结论：只要破坏了「静态可分析」前提就失效——CJS 混入、动态属性访问、有副作用代码、全量引入、Babel 转 CJS；排查思路是「产物里为什么会有它」。**

- 失效清单
  - CJS 依赖混入（require 动态性，摇不动）
  - 动态属性访问：`import * as utils` 后 `utils[name]`——静态分析定不了用哪个
  - 有副作用的代码：顶层 IIFE、对全局的修改——不敢删
  - 全量引入组件库：`import { Button } from 'lib'` 走全量入口而非 ES 子路径
  - 构建链把 ESM 转成 CJS（Babel 配置过老）——先转换后打包等于自废武功
- 验证方法：同一模块换 ESM / CJS 写法对比产物体积；用 bundle 分析工具看大块来源
- 追问：为什么「有副作用」就不敢删？
  - 编译期无法证明该代码没有可观察影响——保守保留是正确性优先

### 8. Rollup 和 Webpack 的 tree-shaking 有什么区别？

**结论：实现位置与精准度不同——Rollup 编译期直接剔除（产物干净、副作用判断准）；Webpack 标记 unused 交给 Terser 压缩时删（需 sideEffects + usedExports 辅助）。**

| 维度 | Rollup | Webpack |
| --- | --- | --- |
| 实现阶段 | 产物生成直接不含死代码 | 标记后压缩阶段删除 |
| 副作用判断 | 更精准（纯 ESM 假设） | 靠 sideEffects 字段辅助 |
| 模块兼容 | ESM 为主，CJS 靠插件转 | 全规范兼容拖累分析纯度 |
| 适用 | 库（体积极致） | 应用（生态优先） |

- 追问：既然 Webpack 也能摇，为什么库不用 Webpack 打？
  - 能摇但产物结构不同——Webpack 产物带运行时与模块包裹，库发布物多一层「打包器痕迹」；Rollup 产物接近手写源码

## 三、插件机制

### 9. 插件三部曲 resolveId → load → transform 各自干什么？

**结论：resolveId 把 import 路径解析成模块 id（别名、虚拟模块、找 node_modules 都在这），load 按 id 返回内容（读盘或生成），transform 对内容做转译——每次模块解析都会依次过插件数组。**

| 钩子 | 职责 | 典型用途 |
| --- | --- | --- |
| resolveId | 路径 → 模块 id | alias、虚拟模块、拦截解析 |
| load | id → 内容 | 读文件、生成虚拟模块代码 |
| transform | 内容 → 新内容 | TS/SFC 转译、代码替换、门禁检查 |

- 调用约定：每个模块 id 都会遍历插件数组——插件要尽快 return null 放行（性能纪律）
- 内核不管「怎么找到 node_modules 里的包」——那是 @rollup/plugin-node-resolve（插件）的活
- 追问：为什么 node_modules 解析不是内核功能？
  - Rollup 把自己定位成「原生模块加载的 polyfill」——浏览器的 import 就不带 Node 解析逻辑，内核保持精简、解耦在插件（官方 FAQ 口径）

### 10. 插件的生命周期全貌？构建期和输出期怎么分？

**结论：两大阶段——build 期建模块图（resolveId / load / transform / moduleParsed），output 期加工产物（renderChunk / generateBundle / writeBundle）；两类钩子拿到的上下文完全不同。**

| 阶段 | 代表钩子 | 拿到什么 |
| --- | --- | --- |
| build | resolveId / load / transform | 模块 id 与源码内容 |
| output | renderChunk / generateBundle / writeBundle | chunk 代码与产物清单 |

- build 期产出「模块图 + 转译后的模块」；output 期做「chunk 级」的加工——压缩、banner、统计
- 常见错误：在 transform 里想拿 chunk 信息（拿不到，那时还没有 chunk）；产物统计和门禁放 output 期
- 追问：一个模块的内容会被 transform 几次？
  - 每个模块一次（转译结果有缓存）；但 resolveId 可能被多个插件依次处理——「内容一次、解析多手」

### 11. 手写一个虚拟模块插件？

**结论：resolveId 返回约定的假 id + load 判断 id 返回生成的代码——两钩子配对完成「磁盘上不存在的模块」。**

```js
function virtualVersion() {
  const id = '\0virtual:version'
  return {
    name: 'virtual-version',
    resolveId(i) { if (i === 'virtual:version') return id },
    load(i) { if (i === id) return `export const version = ${JSON.stringify(VERSION)}` }
  }
}
// 源码里：import { version } from 'virtual:version'
```

- `\0` 前缀：空字节不会出现在真实文件路径——防冲突的惯例
- 与 define 的分工：define 是常量文本替换；虚拟模块是完整模块（可导出函数、可 import 别的模块）
- 追问：虚拟模块怎么参与 tree-shaking？
  - 它就是普通模块——没被 import 的导出同样被摇掉；这正是产物干净的好处

### 12. 怎么把「团队约定」变成构建期报错？

**结论：transform 钩子里检测禁用模式（禁用 API、禁止的写法），命中就 this.error 定位报错——约定从 code review 的人治变成构建的法治。**

```js
{
  name: 'ban-api',
  transform(code, id) {
    if (!id.includes('src/')) return null
    if (/alert\(/.test(code)) {
      this.error('禁用 alert，请使用组件库提示', code.indexOf('alert('))
    }
    return null
  }
}
```

- 适合左移的约定：禁用 API、禁止同步请求、目录边界（跨层 import）
- 与 ESLint 的分工：风格与纯静态规则归 ESLint；与构建目标强相关（如产物里绝对不能出现）的归构建期——双保险但别重复
- 追问：为什么不用 ESLint 全包了？
  - ESLint 可被绕过（注释豁免、本地不跑）；构建期报错阻断产物生成，绕不过

## 四、库打包

### 13. 打包一个 npm 库的标准配置是什么？

**结论：四件套——external 排除宿主依赖、多格式产物（esm + cjs）、类型声明（dts）、package.json 的 exports 条件导出；外加 sideEffects 声明让消费方摇得动你。**

- 清单

```
input（入口） + external（vue 等宿主依赖）
output：[{ format: 'es' }, { format: 'cjs', exports: 'named' }]
plugins：node-resolve + commonjs + esbuild/babel + dts
package.json：exports（import/require/types 条件）+ sideEffects
```

- 每一项对应一个用户侧故障：没 external → 包里打进两份 Vue；没 cjs → require 用户挂；没 dts → 无类型提示；没 exports → 子路径引不进来
- 追问：这套配置哪些是「一次配好不再动」的？
  - external 与多格式基本固定；exports 与 sideEffects 随 API 演进维护——发布后改动要按 semver 破坏性升级处理

### 14. external 是怎么决定「打不打进来」的？

**结论：命中 external 规则（数组 / 正则 / 函数返回 true）的 import 保留为外部 import 语句，不打进产物——运行时依赖一律 external，由使用方提供。**

```js
external: [/^vue/, /^@vue/]
// 或函数：({ id }) => !id.startsWith('.') && !path.isAbsolute(id)
```

- 函数形态的常用判据：非相对、非绝对路径的裸模块名 → external（node_modules 的都不打）
- 不 external 的后果：库里打进一份 Vue → 消费方出现两份实例、上下文断裂、体积翻倍
- 追问：为什么正则 `/^vue/` 而不是 `'vue'`？
  - 精确匹配 'vue' 拦不住 'vue/router'、'vue-jsx-runtime' 等子路径——按包名前缀匹配才完整

### 15. external 和 peerDependencies 怎么配合？

**结论：分工明确——external 是构建期的「不打进去」，peerDependencies 是包元数据的「宿主自备声明」；两者指向同一批依赖，缺一不可。**

- 三者关系
  - external：产物里保留 import 'vue'——不解决「用户哪来的 vue」
  - peerDependencies：声明「我需要宿主提供 vue 且兼容这些版本」——npm 安装时提示 / 校验
  - devDependencies：自己开发联调装一份——不进产物也不强加给用户
- 经典翻车：只 external 不声明 peerDeps → 用户安装后运行报「找不到 vue」
- 追问：peerDependencies 装了但版本不满足会怎样？
  - npm 7+ 会尝试自动安装并告警；版本不匹配的运行时行为（多实例、API 缺失）要靠库自己的兼容层兜

### 16. 多格式产物与 exports 字段怎么配？

**结论：一次构建输出 esm + cjs（必要时 umd），package.json 的 exports 按 import / require / types 条件把用户引到正确格式——「发什么格式」和「用户拿到哪个」是两件事。**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  }
}
```

- 格式选择：esm 给打包器消费（可 tree-shaking）；cjs 给 require 场景与老工具；umd 给浏览器 script 标签（有需要才加）
- exports 同时是「封装墙」：exports 里没列的子路径用户引不到——精确控制公共 API
- 追问：types 条件为什么放最前？
  - 条件按声明顺序匹配，TS 要优先拿到类型入口——放后面会被 import/require 先截胡

### 17. 为什么离不开 @rollup/plugin-commonjs？

**结论：Rollup 内核只认真 ESM，CJS 的 require 是运行时调用无法静态分析——commonjs 插件负责把 CJS 转成可分析的 ESM；互操作里 default 导出是最常见的坑。**

- 转换做什么：module.exports 改写为导出声明、require 调用改写为 import、处理循环依赖的互操作
- default 坑：CJS 的 `module.exports = {}` 整体导出，ESM 侧 `import x from` 拿到的是「包一层 default 还是直接展开」——interop 配置决定，配错就是 undefined
- 动态 require：`require(变量)` 无法静态分析——`ignoreDynamicRequires` 等选项选择报错或保留运行时行为
- 追问：既然 Vite 预构建也转 CJS，和这个插件什么关系？
  - 同一件事的两层：Vite dev 用 esbuild 做预构建互操作；Rollup build（含 Vite 生产构建）走 commonjs 插件——产物链路上两处都要能处理 CJS

## 五、产物与优化

### 18. Scope Hoisting 是什么？为什么省体积？

**结论：把所有模块拍平到同一作用域、靠重命名解决冲突——消除「每模块一层函数闭包 + 运行时模块注册」的开销；产物接近手写源码，执行也少一层函数调用。**

- 对比：Webpack 每模块包一层 `function(module, exports, require)` 并注册进模块表；Rollup 直接按依赖顺序拼接模块顶层代码
- 收益：体积（无包裹与注册表）、运行速度（少函数调用与查表）、可读性（接近源码）
- 代价与限制：作用域变大（极端情况影响某些引擎优化）；依赖 ESM 静态性——这正是 CJS 必须先转 ESM 的原因之一
- 追问：拍平后循环依赖怎么办？
  - Rollup 保持声明顺序并给出警告——静态拼接天然要求依赖顺序可确定，这是 ESM 优于 CJS 的又一体现

### 19. Rollup 的代码分割怎么做？和 Webpack 差异在哪？

**结论：动态 import 与多入口自动触发 chunk 分割，无自定义加载器（用输出格式原生 import 机制）；差异是 Rollup 分割克制（ES 格式下才完整支持），Webpack 分割能力强且可精细控制。**

- 触发方式：动态 `import()` 自动成独立 chunk；多入口的共享模块自动提取
- 格式约束：代码分割需要输出格式的原生 import 支持——es 格式完整支持，cjs//umd 受限
- Webpack 侧优势：splitChunks 精细策略（按复用次数、大小、缓存组）——应用场景比库场景更需要
- 追问：库打包需要代码分割吗？
  - 通常不需要——库追求「按需摇」而不是「按需拉」：tree-shaking + 子路径入口（exports 多条件）已覆盖按需诉求

### 20. 怎么保证产物体积与质量？

**结论：构建期插件做门禁（renderChunk 阶段比对预算超限报错）+ 产物分析定位大头 + 发布前真实环境验证——体积治理从「事后发现」变「构建期拦截」。**

- 体积门禁：renderChunk / generateBundle 里比对 chunk 代码与预算——超限 throw 阻断发布
- 分析：rollup-plugin-visualizer 看 treemap 定位大块来源再动手
- 产物验证：发布前用 npm pack 出的包在空项目真实安装 import——「包没问题」的唯一证明方式
- 追问：门禁阈值怎么定？
  - 按当前基线 + 余量定、只升不降——和性能预算同思路，防劣化趋势而不是拍一个行业数字

## 六、场景与手写

### 21. 场景题：让你发布一个 Vue3 组件库，打包方案怎么设计？

**结论：Rollup 主刀 + 四件套（external / 多格式 / dts / exports）+ CI 体积门禁；一句话主线——「产物干净、宿主依赖不打进去、用户引得进且摇得动」。**

- 参考方案骨架

```
选型：Rollup（库产物极致 + 生态成熟）
external：/^vue/、/^@vue/（宿主自备）→ peerDependencies 声明
产物：esm（打包器消费、可摇）+ cjs（require 场景）+ dts
package.json：exports 条件导出（import/require/types）+ sideEffects: false（纯组件无副作用）
门禁：size-gate 插件卡产物体积；CI 预览：npm pack 后空项目实装验证
```

- 加分点：sideEffects 声明让消费方的 tree-shaking 生效（组件库体积痛点的一半在这）；子路径 exports 支持 `lib/button` 按需引
- 追问：为什么不用 Vite 库模式？
  - 单入口双格式它能胜任；多入口、子路径 exports、精细 external 与门禁流水线，直接配 Rollup 更可控——按复杂度选封装层级

### 22. 手写：二十行实现一个 mini-commonjs 替身，思路是什么？

**结论：核心是「把 CJS 的运行时三件套（module/exports/require）改写成 ESM 静态声明」——简化版只处理无动态 require 的常规包：exports 赋值转 export default、require 调用转 import 语句。**

```js
// 思路示意（真实插件要处理互操作与循环依赖）
function transformCjs(code, moduleId) {
  const deps = collectRequires(code)          // 1. 静态收集 require('x')
  let out = deps.map((d, i) =>
    `import __dep${i} from ${JSON.stringify(d)};`).join('\n')
  out += `\nconst exports = {}; const module = { exports };`
  out += deps.map((d, i) => `const ${varName(d)} = __dep${i};`).join('\n')
  out += code.replace(/require\([^)]*\)/g, '') // 2. 摘掉 require 调用
  out += `\nexport default module.exports;`    // 3. 整体转为 default 导出
  return out
}
```

- 要点：静态收集 require（动态 require 直接放弃）、module.exports 整体转 default（互操作核心）、依赖顺序保持执行语义
- 追问：真实插件比这多解决什么？
  - default/named 互操作判定、循环依赖的半成品导出、__esModule 标记识别——这些细节正是「离不开官方插件」的原因

### 23. 场景题：库发布后用户说「引不进来」，怎么排查？

**结论：按「用户怎么引的 → 产物发没发 → 元数据指没指对」三段排查——高频根因是 exports 封装墙、格式缺失、peerDependencies 未声明。**

- 排查链
  - 用户的引入方式：子路径还是主入口？——exports 里没列的子路径直接封死
  - 产物在不在：npm pack 检查 files 是否漏发 dist 目录
  - 元数据指向：exports 的 import/require/types 条件是否覆盖用户的模块系统；types 路径是否有效
  - 运行时报「找不到 vue」：external 了但没声明 peerDependencies
  - require 场景拿 undefined：CJS 互操作 default 处理错误（上一题的坑）
- 工具化：发布前脚本自动跑「空项目实装 + 双格式 import/require + 类型检查」冒烟
- 追问：为什么 exports 会「封死」子路径？
  - 有 exports 字段后它就是白名单——没列的路径对用户不存在；新增公共入口必须同步维护 exports

### 24. 手写：实现一个产物体积门禁插件（size-gate）

**结论：output 期钩子（renderChunk）拿到 chunk 代码，与预算比对超限 throw——「一条命令的非 0 退出码」阻断 CI 发布。**

```js
function sizeGate(budgets) { // { 'index.esm.js': 100 * 1024 }
  return {
    name: 'size-gate',
    renderChunk(code, chunk) {
      const budget = budgets[chunk.fileName]
      if (budget && code.length > budget) {
        throw new Error(`${chunk.fileName} 超预算：${code.length} > ${budget}`)
      }
      return null
    }
  }
}
```

- 要点：放 output 期（那时才有 chunk）；预算按文件粒度；超限抛错让构建非 0 退出
- 进阶：预算对比上一次发布产物做「增量门禁」——只卡涨幅不卡绝对值（存量项目可落地）
- 追问：为什么卡产物体积而不是源码体积？
  - 用户拿到的是产物——源码瘦了产物没瘦（依赖、未摇干净）才是真问题；门禁盯最终交付物
