# Vue3 原理

> 本篇所有 `摘自` 代码块来自配套的可断点实现 `code/vue3/mini-vue/lib/`——按 Vue3 源码包结构分层拆分（`shared.js` → `reactivity.js` / `compiler-core.js` → `runtime-core.js` → `index.js`，纯 JS 零依赖，`<script>` 按序加载后经 `window.MiniVue` 统一使用，全量 JSDoc 注释）。正文每讲一个机制，就落到对应文件的函数上解析一次；5 个分链路纯渲染 demo 见 `code/vue3/mini-vue/demo/`（编译 / 响应式 / 挂载 / 更新 / 卸载各一页），与篇末「五、关键执行链路」一章逐节对齐，章节对照与断点建议见篇末「配套代码」。

## 一、Vue3 整体架构

Vue3 采用**模块化 + 分层**设计，核心包按职责可以划分为三大类地图：

> 示意片段（无配套脚本）

```
Vue3 包结构
├── 编译模块（把源码/模板编译成 render 函数）
│   ├── @vue/compiler-core  编译核心（平台无关）
│   ├── @vue/compiler-dom   浏览器编译扩展
│   └── @vue/compiler-sfc   单文件组件（.vue）编译
│
├── 运行时模块（真实执行 Vue 应用的地方）
│   ├── @vue/runtime-core  运行时核心（平台无关）
│   └── @vue/runtime-dom   浏览器运行时
│
└── 响应式模块
    └── @vue/reactivity    独立的响应式系统，可脱离 Vue 单独使用
```

### 1.1 模块之间的协作关系

> 示意片段（无配套脚本）

```
源码(.vue / render 函数)  --编译-->  render 函数（返回 VNode）
                                          │
                                  运行时(runtime)
                                   │         │
                         响应式(reactivity)  │
                              │              │
                            数据变化  --触发更新-->  更新真实 DOM
```

- **编译模块**负责将模板"翻译"为 `render` 函数。
- **运行时模块**拿到 `render` 函数，创建虚拟 DOM 并挂载/更新到真实 DOM。
- **响应式模块**为数据提供变更追踪能力——数据一变，运行时便知道要重新渲染哪些组件。

三者的关系一句话总结：**用编译换说法、用响应式驱动、用运行时落地**。

### 1.2 编译模块：compiler-core / compiler-dom / compiler-sfc

三者是"核心 + 平台扩展 + 场景包装"的关系：

| 包 | 作用 | 平台相关性 |
| --- | --- | --- |
| `@vue/compiler-core` | 编译器核心，把字符串模板解析为 AST，再经过 AST 转换（如静态标记），最终生成 `render` 函数代码 | 与平台无关 |
| `@vue/compiler-dom` | 基于 compiler-core，补充浏览器特有语法（`v-html`、`v-text`、SVG 标签处理等），生成适配浏览器运行时的 `render` | 浏览器 |
| `@vue/compiler-sfc` | 解析 `.vue` 单文件组件，提取 template / script / style 三个块，处理 `<script setup>` 语法糖与 scoped 样式 | 打包期 |

`compiler-sfc` 处理 `.vue` 文件的核心能力：

- 拆分 `template`、`script`、`style` 三个代码块。
- 将 `<script setup>` 语法糖编译为普通 `setup` 函数。
- 处理样式的 `scoped` 作用域（为选择器添加 `data-v-xxx` 属性）。
- 集成 less / sass 等样式预处理器。
- 组合 template 与 script，生成组件最终代码。

`compiler-core` 的核心工作流程，贯穿"模板 → AST → 代码生成"：

1. 模板解析：将字符串模板解析为抽象语法树（AST）。
2. AST 转换：做各种优化，例如**静态节点标记**（见下文编译原理）。
3. 代码生成：将 AST 转换成可执行的 `render` 函数代码字符串。
4. 编译选项处理：如支持通过 `delimiters` 自定义插值分隔符。

> 官方提供了可视化编译工具的在线地址，可以直观看到不同模板编译后的 `render` 输出：`https://template-explorer.vuejs.org`

### 1.3 运行时模块：runtime-core / runtime-dom

同样遵循"核心 + 平台补丁"的套路：

| 包 | 作用 | 平台相关性 |
| --- | --- | --- |
| `@vue/runtime-core` | 运行时核心，与平台无关：组件实例化、VNode 创建/挂载/更新/卸载、生命周期、props/插槽、provide/inject、响应式集成 | 与平台无关 |
| `@vue/runtime-dom` | 基于 runtime-core，补充浏览器宿主能力：真实 DOM 增删改、事件绑定、class/style 映射、`function createDomRenderer` 以及默认的 `createApp` | 浏览器 |

关键点：

- `runtime-dom` 通过 `createRenderer({...宿主操作})` 把**自定义渲染器接口函数**注入 `runtime-core`，并 `export * from "runtime-core"` 二次导出核心 API。
- `runtime-dom` 提供默认 `createApp`（内部调用 `createRenderer`），其返回包含 `createApp`、`mount` 的对象。
- **`runtime-core` 是 Vue3 最核心的模块，其他平台相关运行时都基于它扩展**——这也是 Vue 能支持客户端渲染（DOM）、服务端渲染（SSR）、小程序等多端的原因。

### 1.4 响应式模块：reactivity

`@vue/reactivity` 是完全独立的响应式模块，可以脱离 Vue 单独使用（例如用在纯状态管理 / 原生 JS 项目中）。

核心能力：

- 基于 Proxy 创建响应式对象（`reactive`、`ref`、`shallowRef` 等）。
- 依赖收集 `track` 与触发更新 `trigger`。
- 计算属性 `computed` 与侦听器 `watch`。
- 嵌套响应、只读 / 浅响应（`readonly` / `shallowReadonly` / `shallowReactive`）等特性。

## 二、编译原理

编译就是把模板字符串加工成可执行 render 函数的一条流水线。全链路总纲如下，图上每个环节都能在正文小节下钻到代码级讲解：

```
'<div><span>静态</span><p>{{ msg }}</p></div>'    模板字符串（编译输入）
        │
        ▼
    parse(template) ─────────► AST                      〔详见 2.2〕
        │                      { type: 'Element', tag: 'div',
        │                        children: [ Element, Element ] }
        ▼
    transform(ast) ──────────► 标记后的 AST              〔详见 2.3〕
        │                      静态节点标 isStatic，动态插值打 patchFlag
        ▼
    generate(ast) ───────────► render 代码字符串         〔详见 2.2〕
        │                      'h("div", null, [h("span", ...), h("p", ..., 1)])'
        ▼
    new Function(code) ──────► 可执行 render 函数
        │
        ▼
    render(ctx) ─────────────► VNode 树（交给运行时 patch）  〔详见 4.5〕
```

本章展开顺序：2.1 说 SFC 场景下模板从哪来；2.2 覆盖 parse 与 generate 两端；2.3 下钻 transform 的静态标记。

### 2.1 SFC 单文件组件解析

`compiler-sfc` 把 `.vue` 文件当作一个"容器"，按块切割：

> 示意片段（无配套脚本）

```vue
<template>
  <!-- 模板块：交给 compiler-core 编译成 render -->
  <div>{{ msg }}</div>
</template>

<script setup>
// 脚本块：`<script setup>` 会被编译成普通 setup 函数
const msg = ref("hello");
</script>

<style scoped>
/* 样式块：scoped 会为选择器追加 data-v-xxx 属性 */
</style>
```

三个块各走各的处理管线，最后打包器（如 vite）会把这几个产物合并成一个组件对象，交给运行时使用。

### 2.2 模板 → AST → render 函数

`render` 函数的本质是"用 JS 描述模板长什么样"的工具函数，它是编译与运行时之间的桥梁：

> 示意片段（无配套脚本）

```js
// 模板：<div>{{ msg }}</div>
// 编译后大致得到这样的 render 函数（Vue 内部返回 VNode）
import { toDisplayString, createElementVNode as _createElementVNode } from "vue";

function render(_ctx, _cache) {
  return _createElementVNode("div", null, toDisplayString(_ctx.msg), 1);
}
```

编译的三个阶段：

1. **解析（parse）**：把模板字符串解析成 AST。
2. **转换（transform）**：对 AST 做优化（递归遍历节点，标记静态节点、缓存动态绑定等，详见 2.3）。
3. **代码生成（generate）**：把 AST 转换为可执行的 JS 代码字符串。

**parse：正则逐段扫描 + 栈维护层级**，把字符串切成三类节点的嵌套树：

> 摘自 `./code/vue3/mini-vue/lib/compiler-core.js`

```js
// —— 1. parse：模板字符串 → AST ——
/**
 * 把模板字符串解析成 AST（Root → Element/Text/Interpolation 树）。
 *
 * 过程是"逐段扫描"：rest 始终是还没处理的剩余模板，每轮用一组正则从
 * 头部尝试匹配四种片段之一，匹配到就消费掉（slice 掉 m[0]）并继续：
 *   1. 插值 {{ expr }}    → Interpolation 节点
 *   2. 结束标签 </p>      → 当前元素出栈（配对校验）
 *   3. 开始标签 <p ...>   → 建 Element 节点，非自闭合则入栈
 *   4. 文本               → 吃到下一个 {{ 或 < 为止
 * stack 是"当前解析位置所在的祖先链"：栈顶就是 children 的挂靠点（parent）。
 *
 * @param {string} template - 模板字符串
 * @returns {Object} AST 根节点 { type: 'Root', tag: null, children: [...] }
 * @throws {Error} 结束标签与栈顶开始标签不匹配，或解析完仍有标签未闭合
 *
 * @example
 *   parse('<p>{{ n }}</p>')
 *   // → {
 *   //     type: 'Root', tag: null,
 *   //     children: [{
 *   //       type: 'Element', tag: 'p', attrs: null,
 *   //       children: [{ type: 'Interpolation', expression: 'n' }]
 *   //     }]
 *   //   }
 *   parse('a<b>c</b>')
 *   // → { type: 'Root', children: [
 *   //     { type: 'Text', content: 'a' },
 *   //     { type: 'Element', tag: 'b', attrs: null, children: [{ type: 'Text', content: 'c' }] }
 *   //   ] }
 *   parse('<p></div>') // → throw Error('标签不匹配：<p> vs </div>')
 */
function parse(template) {
    const root = { type: 'Root', tag: null, children: [] }
    const stack = [root]
    let rest = template.trim()

    while (rest) {
        const parent = stack[stack.length - 1]
        let m
        if ((m = /^{{\s*([^}]+?)\s*}}/.exec(rest))) {
            // 插值：动态内容
            // 正则：^{{ 开头，([^}]+?) 惰性捕获表达式本体（不含 }），两侧 \s* 吃掉空白
            // '{{ n }}abc' → m[0]='{{ n }}'（消费长度），m[1]='n'（表达式）
            parent.children.push({ type: 'Interpolation', expression: m[1] })
            rest = rest.slice(m[0].length)
            continue
        }
        if ((m = /^<\/([a-z0-9-]+)\s*>/.exec(rest))) {
            // 结束标签：当前元素出栈
            // 正则：^</ 标签名 \s*>；标签名捕获到 m[1]，' </p>' → m[1]='p'
            const open = stack.pop()
            if (open.tag !== m[1]) throw new Error(`标签不匹配：<${open.tag}> vs </${m[1]}>`)
            rest = rest.slice(m[0].length)
            continue
        }
        if ((m = /^<([a-z0-9-]+)([^>]*)\/?>/.exec(rest))) {
            // 开始标签（支持自闭合）
            // 正则：^< 标签名(m[1]) 属性串(m[2]，不含 >) 以 />(自闭合) 或 > 结尾
            // '<div id="a">' → m[1]='div'、m[2]=' id="a"'；'<img src="x"/>' 整体匹配且以 /> 收尾
            const selfClosing = /\/>$/.test(m[0]) // 以 /> 结尾 → 自闭合，不入栈
            const node = { type: 'Element', tag: m[1], attrs: parseAttrs(m[2]), children: [] }
            parent.children.push(node)
            if (!selfClosing) stack.push(node) // 非自闭合：后续 children 挂到它名下
            rest = rest.slice(m[0].length)
            continue
        }
        // 文本：取到下一个 {{ 或 < 为止
        // search 返回第一个命中位置；-1 说明剩下全是纯文本，一次性吃完
        const next = rest.search(/{{|</)
        const text = next === -1 ? rest : rest.slice(0, next)
        if (text) parent.children.push({ type: 'Text', content: text })
        rest = next === -1 ? '' : rest.slice(next)
    }
    // 循环结束后 stack 里只剩 root 才算配对完整；否则有开始标签没收尾
    if (stack.length > 1) throw new Error('有标签未闭合：' + stack.map(n => n.tag).join(' <'))
    return root
}
```

```
parse(template)
  输入: 模板字符串
  输出: Root AST（Element / Interpolation / Text 三种节点嵌套）
  过程: 正则逐段扫描 + 栈维护层级——开始标签入栈、结束标签出栈，文本取到下一个 {{ 或 < 为止
```

**generate：递归生成代码字符串**，每个节点对应一次 `h(...)` 调用：

> 摘自 `./code/vue3/mini-vue/lib/compiler-core.js`

```js
// —— 3. generate：AST → render 代码字符串 ——
/**
 * 把标记完的 AST 生成为 render 函数体代码（顶层是一个 VNode 数组字面量）。
 *
 * genNode 按节点类型分派：
 *   - Text         → JSON.stringify 出带引号的字符串字面量（拼进代码里就是合法 JS）
 *   - Interpolation→ `toDisplayString(ctx.表达式)`（运行时由传入的函数解析显示）
 *   - Element      → `h("tag", props, children, patchFlag)`，children 有三种形态：
 *       a) 单个文本/插值孩子 → 直接是字符串表达式（运行时 shapeFlag 落 TEXT_CHILDREN）
 *       b) 全是文本+插值混合 → 用 + 拼成一个字符串表达式（同真实 Vue 的文本拼接产物）
 *       c) 含元素孩子       → 数组字面量（运行时 shapeFlag 落 ARRAY_CHILDREN）
 * patchFlag 只在动态节点上追加（静态节点省略该参数）。
 *
 * @param {Object} ast - transform 之后的 AST
 * @returns {string} 可执行的代码字符串，形如 `[h("p", null, ..., 1)]`
 *
 * @example
 *   const ast = parse('<p>{{ n }}</p>'); transform(ast)
 *   generate(ast)
 *   // → '[h("p", null, toDisplayString(ctx.n), 1)]'
 *   const ast2 = parse('<div>共 {{ n }} 条</div>'); transform(ast2)
 *   generate(ast2)
 *   // → '[h("div", null, "共 " + toDisplayString(ctx.n) + " 条", 1)]'
 */
function generate(ast) {
    /**
     * 递归生成一个节点的代码片段。
     *
     * @param {Object} node - AST 节点
     * @returns {string} 该节点对应的 JS 表达式
     */
    function genNode(node) {
        if (node.type === 'Text') return JSON.stringify(node.content) // 字符串字面量自带引号
        if (node.type === 'Interpolation') return `toDisplayString(ctx.${node.expression})`
        const flag = node.patchFlag ? `, ${node.patchFlag}` : '' // 静态节点不传 patchFlag
        const props = node.attrs ? JSON.stringify(node.attrs) : 'null'
        const children = node.children
        // 单文本 / 单插值孩子：生成字符串 children（运行时 shapeFlag 会标 TEXT_CHILDREN）
        if (children.length === 1 && children[0].type !== 'Element') {
            return `h("${node.tag}", ${props}, ${genNode(children[0])}${flag})`
        }
        // 孩子全是文本 / 插值的混合：拼成一个字符串表达式（同真实 Vue 的文本拼接产物）
        if (children.length && children.every(c => c.type === 'Text' || c.type === 'Interpolation')) {
            const expr = children
                .map(c => (c.type === 'Text' ? JSON.stringify(c.content) : `toDisplayString(ctx.${c.expression})`))
                .join(' + ')
            return `h("${node.tag}", ${props}, ${expr}${flag})`
        }
        return `h("${node.tag}", ${props}, [${children.map(genNode).join(', ')}]${flag})`
    }
    // 顶层包成数组：与运行时 render 返回数组、normalizeVNode 归一的约定对齐
    return `[${ast.children.map(genNode).join(', ')}]`
}
```

**compile：三阶段串成管线**，`new Function` 是"代码字符串 → 真函数"的最后一步：

> 摘自 `./code/vue3/mini-vue/lib/compiler-core.js`

```js
// —— compile：串起三阶段，new Function 得到真正可执行的 render ——
/**
 * 编译入口：parse → transform → generate → new Function。
 * generate 只产出代码字符串，new Function 把它变成真正的函数体——
 * 每次调用 render(h, toDisplayString, ctx) 都会执行这套代码产出 VNode。
 * 之所以延迟到调用时，是因为 h / ctx 都属于运行时，编译期拿不到。
 *
 * @param {string} template - 模板字符串
 * @returns {{ast: Object, code: string, render: Function}}
 *   ast：带静态标记的 AST；code：生成的代码；render(h, toDisplayString, ctx) → VNode 数组
 *
 * @example
 *   const { ast, code, render } = compile('<p>{{ n }}</p>')
 *   code    // → '[h("p", null, toDisplayString(ctx.n), 1)]'
 *   render(h, toDisplayString, { n: 123 })
 *   // → [ { type: 'p', props: null, children: '123', patchFlag: 1, ... } ]
 */
function compile(template) {
    const ast = parse(template)
    transform(ast)
    const code = generate(ast)
    const render = new Function('h', 'toDisplayString', 'ctx', `return ${code}`)
    return { ast, code, render }
}
```

```
compile(template)
  输入: 模板字符串
  输出: { ast, code, render }——render 可直接执行
  过程: parse → transform → generate 串成管线，new Function 把代码字符串变成真函数（h / toDisplayString / ctx 作闭包入参）
```

> 配套 `./code/vue3/mini-vue/lib/compiler-core.js` 就是这三个阶段的最小实现（全量 JSDoc，可直接逐函数断点）；`mini-vue/demo/demo-compiler.html` 提供模板输入框（含预置示例），可实时看到 AST / 标记 / render 代码三份产物（纯产物展示，挂载走 demo-mount）。

### 2.3 静态节点标记优化

Vue 在编译期会给节点打上 `PatchFlags`（补丁标记），运行时据此决定是否需要精细的 diff。标记的关键思想：

- **判断节点是否"动态"**：只有动态节点（含插值、指令、绑定等）才需要更新时对比。
- **标记为静态节点 / 提升静态内容**：此类节点不参与更新、甚至只创建一次。

> 示意片段（无配套脚本）

```
节点类型划分：
<div>            <!-- 静态：无需更新 -->
<p>{{ count }}</p> <!-- 动态：含插值，标记需要 patch -->
```

在 mini-vue / 源码实现里，这个"判断 + 标记"由 `transform` 的递归 `walk` 完成。完整实现：

> 摘自 `./code/vue3/mini-vue/lib/compiler-core.js`

```js
// —— 2. transform：标记静态 / 动态节点 ——
//    ★ 断点：walk（子树里含插值的节点是动态节点，其余提升为静态）
/**
 * 遍历 AST 做静态标记：为每个 Element 节点写上 isStatic 与 patchFlag。
 * 这是 patch 时"跳过静态子树"的依据——含插值的节点是动态的（patchFlag=1，TEXT），
 * 纯文本/纯元素的子树是静态的（patchFlag=0），更新时可以整体跳过比对。
 *
 * @param {Object} ast - parse 产出的 AST 根节点
 * @returns {Object} 原 AST（每个 Element 节点新增 isStatic / patchFlag 字段）
 *
 * @example
 *   const ast = parse('<div><span>纯文本</span><b>{{ x }}</b></div>')
 *   transform(ast)
 *   ast.children[0].children[0] // → { tag:'span', isStatic: true,  patchFlag: 0, ... }
 *   ast.children[0].children[1] // → { tag:'b',    isStatic: false, patchFlag: 1, ... }
 *   ast.children[0]             // → { tag:'div',   isStatic: false, patchFlag: 1 }（有动态孩子）
 */
function transform(ast) {
    // 子树里含插值的节点是动态节点；patchFlag 位 1 = TEXT（同 template-explorer 的 PatchFlags.TEXT）
    /**
     * 递归标记一个节点：返回"它是否含插值"，供父节点汇总。
     * Interpolation 是动态的源头（true）；非元素的 Text 恒静态（false）；
     * Element 由所有孩子的结果汇总——只要有一个孩子动态，它就是动态。
     *
     * @param {Object} node - AST 节点
     * @returns {boolean} 该子树是否含插值（动态）
     */
    function walk(node) {
        if (node.type === 'Interpolation') return true
        if (node.type !== 'Element') return false
        // 不能用 some 短路：每个孩子都要走到，静态兄弟节点才有机会被标上 isStatic
        let hasDynamic = false
        for (const child of node.children) {
            if (walk(child)) hasDynamic = true
        }
        node.isStatic = !hasDynamic
        node.patchFlag = hasDynamic ? 1 : 0
        return hasDynamic
    }
    ast.children.forEach(walk) // Root 本身不参与标记，模板顶层节点才是起点
    return ast
}
```

```
transform(ast)
  输入: parse 产出的 AST
  输出: 原 AST（每个 Element 挂上 isStatic / patchFlag）
  过程: 自底向上递归 walk——孩子里有一个 Interpolation，整棵子树就是动态（patchFlag = 1）；一个都没有，节点提升为静态（isStatic = true）
```

三个值得下钻的细节：

- **动态性会向上传染**：`walk` 返回"这棵子树是否含动态内容"，`<p>{{ count }}</p>` 里的插值让它自己变动态；再往上，只要任意孩子动态，父节点也跟着动态（patchFlag 表示"我的子树里有动态内容需要对比"）。
- **`some` 的短路陷阱**：判断孩子时若写成 `children.some(walk)`，遇到第一个动态孩子就停，后面的静态兄弟再也得不到标记——所以这里用 `for` 全遍历。
- **标记落到 VNode 上**：generate 把 `patchFlag` 写进 render 代码的第 4 个参数，`h("p", null, toDisplayString(count), 1)`；运行时 `createVNode` 把它存到 `vnode.patchFlag`，diff 时据此决定对比策略（见 4.2 的 `h` 实现）。

**静态节点标记带来的收益**：更新时只对比真正可能变化的动态节点，大量静态 DOM 直接跳过，显著提升更新性能。这也是 Vue3 相比 Vue2 在编译层做出的重要性能优化。

> 学习提示：可以用官方 `template-explorer` 在线工具，输入不同模板（插值、`v-if`、`v-for`、静态节点）查看生成的 `render` 代码和 patch flag，直观理解优化点。

## 三、响应式系统

`@vue/reactivity` 是整个框架的灵魂。它的核心是三个 API：`reactive` / `ref`（创建响应式）、`track`（收集依赖）、`trigger`（触发更新）。

一条完整链路是"创建响应式数据 → effect 里读 → 建依赖 → 改数据 → 唤醒 effect"。全链路总纲如下，图上每个环节都能在正文小节下钻到代码级讲解：

```
reactive(target) / ref(value) ──► Proxy / RefImpl                〔详见 3.1 · 3.5〕
        │
        ▼
    effect(fn) 首跑：fn 里读 state.count ──► track(target, key)   〔详见 3.2 · 3.4〕
        │                        建表：targetMap → depsMap → dep
        ▼
    state.count = 新值 ──────────────────► trigger(target, key)   〔详见 3.3〕
        │                        取出 dep 里所有 effect，依次唤醒
        ▼
    唤醒方式由 effect 的 scheduler 决定：
        ├─ 渲染 effect ──► run() 重跑 ──► patch 更新 DOM          〔详见 4.5〕
        ├─ computed ────► 只置脏 _dirty，等有人读才算             〔详见 3.7〕
        └─ watch ───────► 取新值交给用户回调                      〔详见 3.8〕
```

依赖收集的整体数据结构（`targetMap`）如下：

> 示意片段（无配套脚本）

```
targetMap (WeakMap)
│
├── 响应式对象1 (target)
│   └── depsMap (Map)
│       ├── key: "count"
│       │   └── dep (Set: [effect1, effect2])
│       └── key: "user"
│           └── depsMap (Map)
│               └── key: "name"
│                   └── dep (Set: [effect3])
│
└── 响应式对象2 (另一个 target)
    └── depsMap (Map)
        └── ...
```

即：**WeakMap(对象) → Map(属性) → Set(effect 集合)**。

### 3.1 reactive：对象代理

`reactive` 把普通对象包装成 Proxy，返回的**不是原对象**。

基本特性：

- **深度响应式**：嵌套对象在访问时自动变为响应式。
- **数组支持完善**：数组操作完全响应式。
- **集合类型支持**：Map、Set 等也支持响应式。
- **属性检测全面**：可检测属性添加 / 删除。

核心实现分两层。

一是代理创建与**缓存**（`reactive.ts`）。缓存那三行是必须的：同一对象每次访问都新建 Proxy，依赖就会收集到不同的 dep 上，触发时自然对不上号。

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
/**
 * 深度响应式代理：读属性时自动收集依赖、嵌套对象访问到才继续代理。
 *
 * @param {Object} target - 要代理的目标对象（非对象原样返回）
 * @returns {Object} 代理对象；同一原始对象重复调用返回同一代理
 *
 * @example
 *   const state = reactive({ count: 0, nested: { n: 1 } })
 *   effect(() => console.log(state.count))
 *   state.count++        // → effect 重跑打印 1
 *   state.nested.n = 2   // → 访问 state.nested 时才代理它，同样具备响应式
 *   isReactive(state)    // → true
 */
function reactive(target) {
    if (!isObject(target)) return target
    if (target[ReactiveFlags.IS_READONLY]) return target
    if (target[ReactiveFlags.IS_REACTIVE]) return target

    const existing = reactiveMap.get(target)
    if (existing) return existing

    const proxy = new Proxy(target, mutableHandlers)
    reactiveMap.set(target, proxy)
    return proxy
}
```

**为什么用 WeakMap 存依赖？**

- WeakMap 的键**必须是对象**：正好符合"响应式对象 → 依赖"的映射场景。
- **弱引用**：当原对象不再被外部引用时，WeakMap 中的键值对可以被垃圾回收自动清理，**避免内存泄漏**，不需要手动删除。

> 示意片段（无配套脚本）

```js
const weakMap = new WeakMap();
const obj = {};
weakMap.set(obj, "依赖集合"); // ✅ 键可以是对象

let target = { data: "test" };
weakMap.set(target, { deps: new Set() });
target = null; // 解除引用后，键值对会被 GC 自动清理
```

二是 `baseHandlers.ts`，定义 get / set 拦截逻辑（`mutableHandlers`）。getter 里做了两件事：收集依赖、把"值是对象"的属性继续代理——后一件事是**惰性**的，不是一开始就递归遍历整棵树：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
/**
 * 生成 Proxy 的 get 处理器。职责依次是：
 *   1. 哨兵键直接返回元信息（isReactive 就是这样实现的）；
 *   2. Reflect.get 拿到真实值后 track 收集依赖（readonly 不收集——永远不会写）；
 *   3. 浅层模式直接返回原始值；否则遇到对象就递归 reactive/readonly ——
 *      这就是「惰性深度代理」：只有被访问到的嵌套对象才付出代理的成本。
 *
 * @param {boolean} isReadonly - 是否生成只读版 get（不 track、嵌套走 readonly）
 * @param {boolean} isShallow - 是否只代理第一层（shallowReadonly 的 props 场景用）
 * @returns {Function} 可放进 Proxy handlers 的 get(target, key, receiver)
 */
function createGetter(isReadonly = false, isShallow = false) {
    return function get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
        if (key === ReactiveFlags.IS_READONLY) return isReadonly

        const result = Reflect.get(target, key, receiver)

        // readonly 的对象永远不会被 set，收集依赖没有意义
        if (!isReadonly) track(target, key)

        if (isShallow) return result
        // 深度响应式：遇到对象才继续代理（惰性）
        if (isObject(result)) return isReadonly ? readonly(result) : reactive(result)
        return result
    }
}

/**
 * 生成 Proxy 的 set 处理器：先 Reflect.set 真正写入，值确实变了才 trigger。
 * 「值变了才触发」靠 Object.is 比较——赋同样的值不会白跑一轮更新。
 * 数组特例：push / 纯插入 splice 的条目写入走 DefineProperty（数组会静默把 raw length
 * 先行扩容），等真正写 length 时 Object.is(oldValue, value) 已相等，按旧逻辑会漏发
 * 更新——因此数组的 length 写入一律唤醒依赖（真实 Vue 用数组方法拦截解决此问题）。
 *
 * @returns {Function} 可放进 Proxy handlers 的 set(target, key, value, receiver)
 */
function createSetter() {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]
        const result = Reflect.set(target, key, value, receiver)
        if (!Object.is(oldValue, value) || (Array.isArray(target) && key === 'length')) trigger(target, key)
        return result
    }
}
```

```
reactive(target)
  输入: 原始对象
  输出: Proxy（同一 target 只代理一次，命中缓存直接返回）
  过程: reactiveMap 查缓存 → new Proxy(target, mutableHandlers) → 写缓存

createGetter 的 get(target, key)
  输入: 代理对象上的一次属性读取
  输出: 属性值（是对象则再包一层 reactive——惰性深度代理）
  过程: 先应答 ReactiveFlags 特征属性 → Reflect.get → track(target, key) → isShallow 短路 → 深层对象递归代理

createSetter 的 set(target, key, value)
  输入: 代理对象上的一次属性写入
  输出: Reflect.set 的结果（boolean）
  过程: 记下旧值 → Reflect.set → Object.is 比较值真变了才 trigger
```

同样可以用拦截器扩展出 `deleteProperty`（删除拦截）、`has`（`in` 操作符）、`ownKeys`（`Object.keys()`）等拦截逻辑，让响应式覆盖**属性的增删、枚举、存在性检测**各种操作：

> 示意片段（无配套脚本）

```js
const handlers = {
  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const result = Reflect.deleteProperty(target, key);
    if (hadKey && result) {
      trigger(target, key, "delete");
    }
    return result;
  },
  // 拦截 in 操作符
  has(target, key) {
    track(target, key);
    return Reflect.has(target, key);
  },
  // 拦截 Object.keys() 等操作
  ownKeys(target) {
    track(target, "iterable");
    return Reflect.ownKeys(target);
  },
};
```

### 3.2 依赖收集 track

`track` 做的事情就是"建表"——`targetMap`（对象）→ `depsMap`（属性）→ `dep`（effect 集合），三层逐级补空：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
/**
 * 依赖收集：把 activeEffect 记进「target → key → dep」表的对应格子里。
 * 由 Proxy 的 get 处理器调用；effect 之外读属性时 activeEffect 为 null，直接跳过。
 *
 * 三级不存在就逐级建：对象级 Map → 属性级 Set → 塞入 effect。
 *
 * @param {Object} target - 被读取的原始对象（表的键，WeakMap 弱引用它）
 * @param {string|symbol} key - 被读取的属性名
 */
function track(target, key) {
    if (!activeEffect) return // 不在任何 effect 里读属性，不需要收集

    if (!debugRegistry.includes(target)) debugRegistry.push(target)

    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))

    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))

    if (!dep.has(activeEffect)) {
        dep.add(activeEffect) // 正向：这个属性知道哪些 effect 关心它
        activeEffect.deps.push(dep) // 反向：这个 effect 也知道自己依赖了它（cleanup 用）
    }
}
```

```
track(target, key)
  输入: 目标对象、属性名
  输出: void（副作用：activeEffect 进入该 key 的 dep）
  过程: targetMap → depsMap → dep 逐级补空建表，dep.add(activeEffect)，并反向记录到 effect.deps（供 cleanup / stop）
```

两个容易忽略的设计：**`deps` 是反向索引**——每个 effect 记下自己进过哪些 dep，`stop()` 时才知道要退订哪些；**依赖收集只认"读过"**——一个属性被改了两次都没人理，只要那一刻它还没被任何 effect 读到（配合惰性代理，等 `state.nested` 被读一次才建立联系）。

### 3.3 触发更新 trigger

`trigger` 把之前收集到的 effect 全部取出来依次执行。只有几行，但有两个细节值钱：**遍历前先复制一份**，因为 effect 执行过程中可能增删集合；**跳过自己**，避免"在 effect 里改自己依赖的数据"导致死循环：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
/**
 * 派发更新：属性被写入时，找到依赖它的所有 effect 并唤醒。
 * 唤醒方式二选一：有 scheduler 走 scheduler（组件渲染 → 排队批处理、computed → 置脏），
 * 没有就直接 run（重新执行副作用函数）。
 *
 * @param {Object} target - 被写入的原始对象
 * @param {string|symbol} key - 被写入的属性名
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const dep = depsMap.get(key)
    if (!dep) return

    // 复制一份再遍历：effect 执行过程中可能修改集合
    for (const _effect of [...dep]) {
        if (_effect === activeEffect) continue // 别把自己叫醒（真实 Vue 是 allowRecurse 控制）
        if (_effect.scheduler) _effect.scheduler()
        else _effect.run()
    }
}
```

```
trigger(target, key)
  输入: 目标对象、被写的属性名
  输出: void（副作用：唤醒该 key 的全部依赖 effect）
  过程: targetMap → depsMap → dep 取集合 → 复制快照后遍历——有 scheduler 走 scheduler（computed 置脏 / watch 回调 / 渲染入队），否则直接 run()
```

注意 `scheduler` 的意义：**它让用户（框架）可以自己决定副作用何时执行**。Vue 内部正是借助 `scheduler` 把多次更新合并到下一个微任务中执行，实现异步批量渲染（见四.5 的 `queueJob`）。

### 3.4 effect：副作用函数

`effect` 是响应式系统的"发动机"，理解它是理解 `computed` / `watch` 的前置条件。

基本特性：

1. **包装副作用函数**：`effect(fn)` 包装一个会读取响应式数据的函数。
2. **自动依赖追踪**：首次执行 `fn` 时，访问到的每个响应式属性都会被"记住"。
3. **响应式触发**：被追踪属性变化时，自动重新执行依赖它的所有 `effect`。
4. **调度控制**：可通过 `options.scheduler` 自定义执行时机。
5. **惰性执行**：`options.lazy` 为 `true` 时禁用初始执行，返回运行器手动触发（`computed` 内部使用）。
6. **返回运行器函数**：可手动强制触发一次。
7. **停止侦听**：运行器上的 `.stop()` 可清除依赖关系，防止内存泄漏（组件卸载时 Vue 会自动停止相关 effect）。

核心实现（`effect.ts`）。`effect` 负责"把函数包成可被追踪的东西"，做三件事：入栈、**先清掉旧依赖再执行**、出栈：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
// ============================================================
// 依赖收集与触发：effect / track / trigger（源码 src/reactivity/effect.js）
//    ★ 断点：track（建表）、trigger（唤醒）、ReactiveEffect.run（栈与 cleanup）
// 核心数据结构是一张两层表：
//   targetMap: WeakMap<原始对象, Map<属性名, Set<ReactiveEffect>>>
//   读属性时 track 顺着表把当前 effect 记进去；写属性时 trigger 顺着表把 effect 全部唤醒。
//   WeakMap 的键是弱引用：对象没有其他引用时整条依赖链随垃圾回收一起消失，无需手动清理。
// ============================================================
const targetMap = new WeakMap()
/**
 * effect 执行栈。effect 里嵌套读另一个响应式数据时，收集到的是"栈顶"那个 effect，
 * 所以进入副作用函数前 push、退出后 pop，保证任意时刻 activeEffect 都是最内层的。
 */
const effectStack = []
/**
 * 当前正在执行的 effect（栈顶的快捷引用）。track 只为它收集依赖；
 * 为 null 说明不在任何 effect 里读属性（比如普通事件回调），此时不需要收集。
 */
let activeEffect = null

// 教学用：WeakMap 无法遍历，另存一份强引用只为了把依赖关系打印出来（生产实现不需要）
const debugRegistry = []

/**
 * 副作用：响应式系统的最小执行单元。fn 里读了哪些响应式属性，
 * 执行期间就会被 track 记录下来；之后这些属性一变，fn 就会被重新唤醒执行。
 *
 * 两个关键字段：
 *   - scheduler：可选的"替代 run 的唤醒方式"。组件渲染 effect 靠它实现
 *     「数据变化 → 不立刻渲染 → 排进微任务队列批量渲染」。
 *   - deps：反向记录"我依赖了哪些 dep 集合"。正向表（targetMap）能查到
 *     effect，反向表才能在 cleanup 时把 effect 从各集合里摘除。
 *
 * 对应文档 3.4；真实 Vue 中还包含 runner、onStop、allowRecurse 等字段，教学版只留核心。
 */
class ReactiveEffect {
    /**
     * @param {Function} fn - 副作用函数：读取响应式数据并产生效果（渲染 / 打日志 / 计算）
     * @param {Function} [scheduler] - 调度器：trigger 唤醒时不直接跑 fn，而是调用它
     */
    constructor(fn, scheduler) {
        this.fn = fn
        this.scheduler = scheduler
        this.deps = [] // 反向记录：我依赖了哪些 dep（stop 时要清理）
        this.active = true
    }

    /**
     * 执行副作用：入栈 → 清旧依赖 → 跑 fn（期间完成依赖收集）→ 出栈。
     *
     * @returns {*} fn 的返回值（computed 复用它拿 getter 的计算结果）
     */
    run() {
        if (!this.active) return this.fn() // 已 stop：依赖被摘干净了，只跑函数不再收集
        try {
            effectStack.push(this) // 入栈：接下来 track 收集的是"我"
            activeEffect = this
            cleanupEffect(this) // 先清掉旧依赖：分支切换时才不会漏掉旧分支
            return this.fn()
        } finally {
            effectStack.pop() // 出栈：恢复外层 effect，嵌套场景才能正确收集
            activeEffect = effectStack[effectStack.length - 1] || null
        }
    }

    /**
     * 停止响应：清空全部依赖后置 active = false。之后数据再变不会唤醒它，
     * 再调用 run 也只执行 fn、不再收集依赖（对应 watch 返回的停止函数）。
     */
    stop() {
        if (!this.active) return
        cleanupEffect(this)
        this.active = false
    }
}

/**
 * 把 effect 从它依赖的所有 dep 集合中摘除，并清空它的反向记录。
 *
 * 为什么每次 run 前都要 cleanup？
 *   依赖在 fn 执行时"读什么收什么"——条件分支变了，依赖也应跟着变：
 *   `if (obj.a) obj.b`：a 真时依赖 {a,b}；a 变假后重跑只读 a，不该再依赖 b。
 *   先清旧再收新，执行完留下的就是"本轮真实读到的"依赖。
 *
 * @param {ReactiveEffect} effect - 待清理的副作用
 */
function cleanupEffect(effect) {
    for (const dep of effect.deps) dep.delete(effect)
    effect.deps.length = 0
}
```

```
effect(fn, { scheduler })
  输入: 副作用函数、可选调度器
  输出: runner（可手动触发，runner.effect.stop() 可解除依赖）
  过程: new ReactiveEffect(fn, scheduler) → 立即 run() 首跑建依赖

ReactiveEffect.run()
  输入: void
  输出: fn() 的返回值
  过程: 入 effectStack（嵌套 effect 靠栈恢复外层）→ cleanupEffect 清旧依赖 → 执行 fn（期间 track 建新依赖）→ finally 出栈
```

两个容易忽略的设计：**用栈而不是单个变量**——effect 里可能再跑 effect（computed 的 getter、子组件渲染），栈才能恢复外层；**`cleanupEffect` 决定的是正确性而非优化**——effect 里写 `flag ? a : b`，切到 `b` 分支后如果 `a` 的依赖还在，改 `a` 会触发一次结果完全没变的渲染。清理后重新收集，依赖表才始终等于"这次真正读了什么"。

**stop 的实现思路**：`track` 时 `effect.deps.push(dep)` 保存了它关联的所有依赖集合，`stop` 时遍历这些集合把 `effect` 删除，于是属性变化不再触发它。这就是 `onMounted` 中创建的 effect 在组件卸载后被释放的原理。

### 3.5 ref：基本类型响应式

`reactive` 无法直接代理基本类型，`ref` 通过"把值包进一个对象再代理"解决这个问题。

基本特性：

- **任何类型**：可包裹基本类型和引用类型。
- **深层响应式**：值为对象时自动转成 `reactive`。
- **保持引用**：`.value` 始终指向同一个引用。

`RefImpl` 类是其核心：定义了 `get value` / `set value`，**直接复用 `track` / `trigger`**——把 ref 实例自身当作 target、字符串 `'value'` 当作 key，依赖表结构完全一致：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
// ============================================================
// ref / proxyRefs（源码 src/reactivity/ref.js）
// ============================================================
/**
 * ref 的实现。为什么需要 ref？Proxy 只能代理对象，拦不住
 * `let n = 1` 这样的原始值——ref 用「一个带 value 存取器的实例对象」把值包起来，
 * 对 .value 的读写就能走 track / trigger 了。
 *
 * 存值时做了两层包装：
 *   - _value：内部保存值。对象先转 reactive——读 .value 得到的是响应式代理；
 *   - __v_isRef：isRef 的识别标记。
 */
class RefImpl {
    /**
     * @param {*} value - 初始值；对象会被转成 reactive 代理后保存
     */
    constructor(value) {
        this._value = isObject(value) ? reactive(value) : value
        this.__v_isRef = true
    }

    /**
     * 读 ref：把 ref 实例自身当作 target、'value' 当作 key 走 track。
     *
     * @returns {*} 解包后的值（对象为响应式代理）
     */
    get value() {
        track(this, 'value') // 把 ref 实例自身当作 target，'value' 当作 key
        return this._value
    }

    /**
     * 写 ref：值有变化才更新内部 _value（对象同样转 reactive）并 trigger。
     *
     * @param {*} newValue - 新值
     */
    set value(newValue) {
        if (!hasChanged(newValue, this._value)) return
        this._value = isObject(newValue) ? reactive(newValue) : newValue
        trigger(this, 'value')
    }
}

/**
 * 创建一个 ref。若传入的已经是 ref 则原样返回（幂等）。
 *
 * @param {*} value - 初始值（原始值或对象）
 * @returns {RefImpl} ref 实例，通过 .value 读写
 *
 * @example
 *   const n = ref(1)
 *   n.value      // → 1
 *   n.value = 2  // → 触发依赖 n.value 的 effect
 *   ref(n) === n // → true
 */
function ref(value) {
    if (isRef(value)) return value
    return new RefImpl(value)
}

/**
 * 是否为 ref（读 __v_isRef 标记）。
 *
 * @param {*} value - 任意值
 * @returns {boolean}
 *
 * @example
 *   isRef(ref(1))       // → true
 *   isRef(computed(() => 1)) // → true（computed 也是 ref）
 *   isRef({ value: 1 }) // → false（没有标记）
 */
const isRef = value => !!(value && value.__v_isRef)
```

```
ref(value)
  输入: 任意值（基本类型 / 对象）
  输出: RefImpl 实例（值为对象时内部已被 reactive 包裹——深层响应式）
  过程: 构造时存 _value（对象则 reactive）；读 .value 走 track(this, 'value')，写 .value 先 hasChanged 再 trigger(this, 'value')
```

`__v_isRef = true` 标记被 `isRef` 使用；`ref` 收到 ref 时直接原样返回，靠的也是这个标记。

### 3.6 unref 与 proxyRefs：自动解包

`unref` 是一个语法糖：是 ref 就返回 `.value`，否则返回本身。

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
/**
 * 解包：是 ref 就取 .value，否则原样返回。
 *
 * @param {*} value - 任意值
 * @returns {*} 解包后的值
 *
 * @example
 *   unref(ref(1))  // → 1
 *   unref(1)       // → 1（非 ref 原样返回）
 */
function unref(value) {
    return isRef(value) ? value.value : value
}
```

`proxyRefs` 用 Proxy 包装对象，实现**读取 / 设置时自动解包 ref**——这正是模板里写 `count` 而非 `count.value` 的原因：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
// 只解包第一层：obj.count 等价于 typeof obj.count === 'ref' ? obj.count.value : obj.count
/**
 * 把「值可能是 ref」的对象包一层代理：读时自动 .value 解包，
 * 写时若目标原本是 ref 而新值不是 ref，则写进 ref.value（保持 ref 引用不变）。
 * setup 返回值经它处理后，模板里才不用写 .value。
 *
 * @param {Object} objectWithRefs - 属性值可能是 ref 的对象（如 setup 的返回值）
 * @returns {Proxy} 自动解包的代理对象
 *
 * @example
 *   const state = proxyRefs({ count: ref(0) })
 *   state.count       // → 0（等价 state.count.value）
 *   state.count = 5   // → 实际写的是 ref.value = 5
 *   state.count       // → 5
 */
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key, receiver) {
            return unref(Reflect.get(target, key, receiver))
        },
        set(target, key, value, receiver) {
            const oldValue = target[key]
            // 原来是 ref、新值不是 ref -> 写进 ref.value（保持引用不变）
            if (isRef(oldValue) && !isRef(value)) {
                oldValue.value = value
                return true
            }
            return Reflect.set(target, key, value, receiver)
        }
    })
}
```

```
proxyRefs(objectWithRefs)
  输入: 可能含 ref 的对象（setup 返回值会被它包成 setupState）
  输出: Proxy——读属性自动 unref，写属性写回 ref.value
  过程: get 统一走 unref；set 遇到"旧值是 ref、新值不是 ref"时改写旧 ref 的 .value（保持引用、响应不断），其余走 Reflect.set
```

`proxyRefs` 只解包**第一层** ref（浅层），对象中嵌套的 ref 不会递归解包。

### 3.7 computed：惰性计算与缓存

`computed` 基于 `lazy` 的 `ReactiveEffect` 实现，核心是"一个布尔值 + 一处调度"——**依赖变化时不重算，只置脏 + 通知；真正算什么时候算，由"有人来读"决定**：

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
    /**
     * @param {Function} getter - 计算函数：读响应式数据，返回计算结果
     */
    constructor(getter) {
        this._dirty = true
        this._value = undefined
        this.__v_isRef = true
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty) return // 已经是脏的，不用再通知一遍
            this._dirty = true
            trigger(this, 'value') // 叫醒依赖方，它们会在读 value 时触发重算
        })
    }
```

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
    /**
     * 读计算值：脏了才重算（执行 getter），干净则直接返回缓存；
     * 无论重不重算都要 track——下游（别的 computed / 渲染 effect）要依赖本值。
     *
     * @returns {*} 计算结果（缓存值或新算的值）
     */
    get value() {
        if (this._dirty) {
            this._value = this.effect.run() // 重算时才真正执行 getter
            this._dirty = false
        }
        track(this, 'value')
        return this._value
    }
```

```
computed(getter)
  输入: getter 函数
  输出: ComputedRefImpl（带 .value 的缓存 ref）
  过程: 内部建 ReactiveEffect(getter, scheduler)——依赖变化时 scheduler 只置脏 _dirty + trigger 依赖方；读 .value 时脏了才 effect.run() 重算，否则直接返回缓存，读的同时 track 自己（computed 也能被别人依赖）
```

工作流程：

1. **首次访问**：`_dirty` 为 true，执行 getter 计算并缓存；随后 `_dirty` 置 false。
2. **依赖未变**：`_dirty` 仍为 false，直接返回缓存值，getter 不重复执行。
3. **依赖变化**：getter 内部的响应式数据触发 computed 的 scheduler，`_dirty` 置 true 并叫醒依赖 computed 的 effect。
4. **再次访问**：`_dirty` 为 true 则重新计算，否则继续用缓存。

`mini-vue/demo/demo-reactivity.html` 的 `getterCalls` 计数器把"惰性"看得最清楚（先点「count + 1」让依赖变化但不读，再点「重读 double」才看到计数 +1）：

```
==== 4. computed：惰性求值 + 缓存 ====
  第一次读 total = 20，getter 调用 1 次
  再读一次   total = 20，getter 调用 1 次（命中缓存）
  改了依赖但没读：getter 调用 1 次（不立刻重算，只置脏）
  读的时候才算   total = 30，getter 调用 2 次
```

这就是 computed 的**依赖追踪 + 缓存 + 惰性**三大特性的来源。

### 3.8 watch

`watch`（侦听器）本质上是 `effect` 的封装：它对一个"源"（getter 或 ref）建立副作用，当源发生变化时执行回调。实现思路：

- 对响应式源执行一次读取（触发 `track`），从而把 effect 与源建立关联。
- 源变化触发 `trigger` 时，经 `scheduler` 回调去执行用户传入的 `cb`。
- 支持 `immediate`、`deep`、`flush` 等选项，分别对应立刻执行、深度监听、控制执行时机。

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
// 深度遍历：读一遍每个属性，让响应式对象的全部层级都建立依赖
/**
 * 递归读取对象每一层每个属性——纯为了触发 track。
 * seen 集合防环：对象互相引用时不会死循环。
 *
 * @param {*} value - 任意值（非对象原样返回）
 * @param {Set} [seen] - 已访问对象集合（递归内部用，防循环引用）
 * @returns {*} 原值（watch 拿它当"新值"参与比较）
 */
function traverse(value, seen = new Set()) {
    if (!isObject(value)) return value
    if (seen.has(value)) return value
    seen.add(value)
    for (const key of Object.keys(value)) traverse(value[key], seen)
    return value
}

/**
 * 侦听响应式数据变化，执行用户回调；返回停止函数。
 *
 * 源的三种形态（getter / ref / reactive 对象）最终都归一成一个 getter：
 *   - 函数源：直接用；
 *   - ref：读 .value；
 *   - reactive 对象：traverse 全量读一遍（深度监听——每一层都建立了依赖）。
 *
 * 实现核心是 effect + scheduler：源变化时 trigger 不直接重跑副作用，
 * 而是进 scheduler——在 scheduler 里重跑 runner 拿新值，与旧值比较后交给用户回调。
 *
 * @param {Function|Object} source - 侦听源：getter 函数 / ref / reactive 对象
 * @param {Function} cb - 回调 (newValue, oldValue) => void
 * @param {{immediate?: boolean}} [options] - immediate: 首次立即以 (值, undefined) 回调
 * @returns {Function} 停止侦听函数（内部即 stop(runner)）
 *
 * @example
 *   const n = ref(1)
 *   const stopW = watch(n, (nv, ov) => console.log(nv, ov))
 *   n.value = 2          // → 打印 2 1
 *   stopW()
 *   n.value = 3          // → 无输出（已停止）
 *
 *   watch(() => obj.a.b, v => console.log(v), { immediate: true })
 *   // → 立即打印当前值；之后 obj.a.b 每次变化打印新值
 */
function watch(source, cb, options = {}) {
    let getter
    if (isFunction(source)) {
        getter = source // getter 函数：返回什么就侦听什么
    } else if (isRef(source)) {
        getter = () => source.value
    } else if (isReactive(source)) {
        // reactive 源默认深度监听（与 Vue 行为一致）：全量读一遍建依赖
        getter = () => traverse(source)
    } else {
        return () => {}
    }

    let oldValue
    const runner = effect(getter, {
        // 源变化时 trigger 不直接重跑 run，而是走 scheduler：取新值后交给用户回调
        scheduler: () => {
            const newValue = runner()
            if (hasChanged(newValue, oldValue)) {
                cb(newValue, oldValue)
                oldValue = newValue
            }
        }
    })
    oldValue = runner() // 首次执行：建立依赖，记下旧值
    if (options.immediate) cb(oldValue, undefined) // 立刻执行：首次就以"新值"身份回调
    return () => stop(runner) // 返回停止侦听函数
}
```

```
watch(source, cb, { immediate })
  输入: 源（getter 函数 / ref / reactive 对象）、回调、选项
  输出: 停止侦听函数（内部 stop(runner)）
  过程: 源归一成 getter（reactive 源用 traverse 全量读一遍 = deep）→ effect(getter, { scheduler }) 首跑建依赖、记下旧值 → 源变化时 trigger 走 scheduler：重跑取新值，hasChanged 才交给 cb；immediate 则建立后立即以"新值"身份回调一次
```

mini-vue 支持 `immediate` 与 `deep`（reactive 源默认深度）；`flush`（pre / post / sync 时机控制）是源码的进阶能力，教学版略去。`watch` / `computed` / 组件渲染 effect 共享同一套收集 / 触发机制，区别只在 scheduler 里做什么。

### 3.9 readonly / shallowReadonly：只读与浅响应

`readonly`：**深度只读**，所有层级的修改都失败（控制台警告）。

> 示意片段（无配套脚本）

```js
const state = reactive({ count: 0, user: { name: "Alice", profile: { age: 25 } } });
const readOnlyState = readonly(state);
readOnlyState.count = 1;            // ❌ 失败（警告）
readOnlyState.user.name = "Bob";     // ❌ 失败
```

`shallowReadonly`：**浅层只读**，只有第一层不可改，嵌套对象可修改。

> 示意片段（无配套脚本）

```js
const shallowReadOnlyState = shallowReadonly(state);
shallowReadOnlyState.count = 1;             // ❌ 失败
shallowReadOnlyState.user.name = "Bob";       // ✅ 成功
```

实现要点：

1. `readonly` / `shallowReadonly` 各自使用独立的 WeakMap 缓存（`readonlyMap` / `shallowReadonlyMap`）。
2. 复用同一个 `createGetter`，通过**闭包参数**区分：`shallow` 时直接返回原值；`isReadonly` 时对对象调用 `readonly` 而非 `reactive`。
3. set 拦截直接 `console.warn` 并返回 `true`，阻止赋值。

> 摘自 `./code/vue3/mini-vue/lib/reactivity.js`

```js
/**
 * 深度可响应代理的 handlers（reactive() 使用）。
 */
const mutableHandlers = { get: createGetter(), set: createSetter() }
/**
 * 只读代理的 handlers（readonly() 使用）：get 不收集依赖，
 * set 直接拦截并告警——对象从头到尾不会变，自然也不会有更新要派发。
 */
const readonlyHandlers = {
    get: createGetter(true),
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
        return true
    }
}
```

```
readonly(target) / shallowReadonly(target)
  输入: 原始对象
  输出: Proxy（readonly 走 readonlyMap 缓存；shallowReadonly 直接建代理）
  过程: 同一个 createGetter 靠闭包参数 (isReadonly, isShallow) 分身——set 拦截统一 warn 后返回 true，阻止赋值
```

### 3.10 类型判断 API 与特征属性

`isReactive` / `isReadonly` / `isProxy` / `toRaw` 都依赖为 Proxy 注入的**特征属性**：

> 示意片段（无配套脚本）

```js
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}
```

这些特征属性在 `createGetter` 里根据闭包信息提前"写死"：

> 示意片段（无配套脚本）

```js
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    const isExistInReactiveMap = () =>
      key === ReactiveFlags.RAW && receiver === reactiveMap.get(target);
    // ... readonlyMap / shallowReadonlyMap 同理

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (isExistInReactiveMap() /* || isExistInReadonlyMap() || isExistInShallowReadonlyMap() */) {
      // 命中 RAW，返回原对象（toRaw）
      return target;
    }
    // ... 其余逻辑
  };
}
```

对应公开 API：

> 示意片段（无配套脚本）

```js
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}
export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}
// toRaw：先校验是否代理对象，是则取 RAW 返回原对象
export function toRaw(value) {
  if (!value[ReactiveFlags.RAW]) {
    return value;
  }
  return value[ReactiveFlags.RAW];
}
```

**为何直接用 `value[ReactiveFlags.XXX]` 就能判断类型？** 因为访问这些特殊 key 会触发 Proxy 的 `get`，而 `createGetter` 已经通过闭包把对应标志返回了。对于普通对象，访问这些 key 得到 `undefined`，`!!undefined` 为 `false`，因此能正确区分普通对象与各种代理对象。

## 四、运行时原理

运行时负责把 VNode 真正"落地"到宿主环境（浏览器即真实 DOM）。全链路总纲如下，图上每个环节都能在正文小节下钻到代码级讲解：

```
h(type, props, children) ─────► VNode（type / props / children / shapeFlag）  〔详见 4.2 · 4.3〕
        │
        ▼
    createApp(root).mount(container) ──► render(vnode, container)            〔详见 4.1〕
        │                                   = patch(null, vnode, container)
        ▼
    patch(n1, n2) 按 type / shapeFlag 分发                                   〔详见 4.3〕
        ├─ ELEMENT：mountElement / patchElement                              〔详见 4.5〕
        │     └─ 数组孩子 → patchKeyedChildren（头尾同步 + key 配对）          〔详见 4.6〕
        ├─ STATEFUL_COMPONENT：mountComponent / updateComponent              〔详见 4.4〕
        │     ├─ setupComponent：props / slots / setup / proxyRefs           〔详见 4.4 · 4.8〕
        │     └─ setupRenderEffect：render 包成 effect（挂载 / 更新双分支）    〔详见 4.5〕
        └─ Text / Comment / Fragment：文本与锚点处理                          〔详见 4.3〕

    unmount：递归卸载子树 → onUnmounted → 渲染 effect.stop()                 〔详见 4.7〕
```

下面按"入口 → VNode → patch → 组件"的链路展开。

### 4.1 runtime-dom / runtime-core 的分工

运行时核心**不认识 DOM**。所有平台相关的动作都由调用方注入，核心只负责"什么时候该调用哪个"：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
// ============================================================
// renderer：patch 分发 / 挂载更新卸载 / 列表 diff（源码 src/runtime-core/renderer.ts）
//    ★ 断点：patch（shapeFlag 分发）、patchKeyedChildren（头尾同步 + key 配对）、
//            mountComponent / unmount（生命周期）
// createRenderer 是"平台无关"的关键：所有碰 DOM 的动作都经 options 里的
// 宿主操作函数（hostXxx），换成自定义宿主（如假宿主 / canvas）即可跑在别的环境。
// ============================================================
/**
 * 由一组宿主操作装配出完整的渲染器：render / createApp / patch / unmount。
 * 内部闭包持有全部核心逻辑（patch 及其分发的 processXxx / mountXxx / unmount），
 * 对外只暴露这四个入口。
 *
 * @param {Object} options - 宿主操作：
 *   createElement / createText / createComment / setText / setElementText /
 *   insert / remove / nextSibling / patchProp
 * @returns {{render: Function, createApp: Function, patch: Function, unmount: Function}}
 *
 * @example
 *   const { render, createApp } = createRenderer(browserNodeOps)
 *   render(h('div', null, 'hi'), document.querySelector('#app'))
 *   createApp(RootComponent).mount('#app')
 */
function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        setText: hostSetText,
        setElementText: hostSetElementText,
        insert: hostInsert,
        remove: hostRemove,
        nextSibling: hostNextSibling,
        patchProp: hostPatchProp
    } = options
```

```
createRenderer(options)
  输入: 9 个宿主操作（createElement / createText / createComment / setText / setElementText / insert / remove / nextSibling / patchProp）
  输出: { render, createApp, patch, unmount }
  过程: 把注入函数重命名为 host* 存进闭包——内部 patch 全家桶只调这些函数，平台差异全部挡在闭包外
```

浏览器那份实现就是标准的 DOM API，只有 `insert` 的一个细节值得留意——**anchor 为 null 时 `insertBefore` 就是 append**，所以九个操作里不需要单独来一个 `appendChild`：

> 摘自 `./code/vue3/mini-vue/lib/index.js`

```js
// ============================================================
// 浏览器宿主操作（源码 src/runtime-dom/nodeOps.ts + patchProp.ts）
// ============================================================
/**
 * 浏览器宿主的节点操作集合：createRenderer 所需的全部"碰 DOM"动作。
 * 每个方法都只做最薄的一层封装——具体何时调用、以什么顺序调用，
 * 全部由 runtime-core 的 renderer 决定。
 */
const nodeOps = {
    /** 创建元素节点（传入标签名，返回 HTMLElement）。 */
    createElement: tag => document.createElement(tag),
    /** 创建文本节点（独立于元素存在，如 Fragment 的锚点）。 */
    createText: text => document.createTextNode(text),
    /** 创建注释节点（null / false 的渲染占位）。 */
    createComment: text => document.createComment(text),
    /** 改文本节点内容（processText 复用旧节点时用）。 */
    setText: (node, text) => {
        node.nodeValue = text
    },
    /** 一次性改元素的全部文本孩子（TEXT_CHILDREN 更新路径）。 */
    setElementText: (el, text) => {
        el.textContent = text
    },
    /** 把 child 插到 parent 里 anchor 之前；anchor 为 null/nullish 追加到末尾。 */
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    /** 从 DOM 摘除节点（有父节点才摘，无则忽略）。 */
    remove: child => {
        const parent = child.parentNode
        if (parent) parent.removeChild(child)
    },
    /** 取节点的下一个兄弟节点——patch 换类型时用它确定"原位置"锚点。 */
    nextSibling: node => node.nextSibling
}
```

`runtime-dom` 这一层的全部职责就是"把两样东西装到一起"：

> 摘自 `./code/vue3/mini-vue/lib/index.js`

```js
// ============================================================
// 装配：runtime-core（createRenderer）× 浏览器宿主 = 可用的 createApp / render
// ============================================================
// 解构出的 render / patch / unmount 已内置浏览器 nodeOps，可直接对真实 DOM 使用
const { render, createApp, patch, unmount } = createRenderer({ ...nodeOps, patchProp })

// ============================================================
// 聚合：三层 API 挂到 window.MiniVue（demo 与控制台统一入口）
// 三个文件层各导出一部分，加上本文件装配出的浏览器渲染器，构成完整闭环。
// ============================================================
window.MiniVue = {
    // 响应式层（reactivity.js）
    reactive,
    readonly,
    shallowReadonly,
    ref,
    computed,
    watch,
    effect,
    stop,
    isReactive,
    isReadonly,
    isRef,
    proxyRefs,
    describeDeps,
    // 编译层（compiler-core.js）
    compile,
    parse,
    transform,
    generate,
    toDisplayString,
    // 运行时层（runtime-core.js）
    h,
    createVNode,
    createRenderer,
    nextTick,
    onMounted,
    onUnmounted,
    provide,
    inject,
    // 装配完成的浏览器渲染器（本文件）
    render,
    patch,
    unmount,
    createApp,
    nodeOps,
    patchProp
}
```

```
index.js（装配入口）
  输入: nodeOps + patchProp（浏览器宿主实现）+ 前三个文件的全局 API
  输出: window.MiniVue——编译 / 响应式 / 运行时三层 API 的统一命名空间
  过程: createRenderer({ ...nodeOps, patchProp }) 装出面向浏览器的 render / createApp，再与响应式、编译层 API 一起聚合
```

**"平台无关"可以直接实测**：`mini-vue/lib/index.js` 的 nodeOps 对象就是宿主接口（createElement / setElementText / insert / patchProp / remove 等约定）——把它换成字符串拼接（createElement 返回标签字符串），就得到服务端渲染的雏形。两套宿主跑的是同一个组件定义、同一份 runtime-core，组件代码零改动：

```
==== 换宿主前后：操作次数对比（示意） ====
  操作               假 DOM   字符串
  createElement        3        3
  setElementText       2        2
  insert               3        3
  patchProp            1        1

---- 结论 ----
renderer 全程只调用注入进来的那 9 个函数，所以：
  · 换成假 DOM 就是单测环境（不用 jsdom）
  · 换成字符串拼接就是服务端渲染的雏形
  · 官方把 runtime-core 与 runtime-dom 拆成两个包，原因就在这里
```

`createRenderer` 返回的 `createApp` 由 `createAppAPI` 生成，其 `mount` 方法先创建 VNode 再调用 `render`：

> 示意片段（无配套脚本）

```js
export function createAppAPI(render) {
  return function createApp(rootComponent) {
    const app = {
      _component: rootComponent,
      mount(rootContainer) {
        const vnode = createVNode(rootComponent); // 基于根组件创建 vnode
        render(vnode, rootContainer);             // 调用 render 展开(挂载)
      },
    };
    return app;
  };
}
```

常见宿主操作对照：

| 操作 | 浏览器实现 |
| --- | --- |
| `createElement` | `document.createElement(type)` |
| `createText` | `document.createTextNode(text)` |
| `insert` | `parent.insertBefore(child, anchor)`（anchor 为 null 则插到末尾） |
| `remove` | `parent.removeChild(child)` |
| `setElementText` | `el.textContent = text` |
| `patchProp` | 处理 class / style / 事件 / 属性的 DOM 绑定 |

### 4.2 h 函数与 createVNode

`h` 底层就是 `createVNode`：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
// 属性写法：h('div', { id: 'a' }, [ ... ]) 或 h(Component, { msg: 'hi' }, { default: () => ... })
// 第 4 参 patchFlag 只有编译产物会传（2.3 静态标记）：手动 h 用不到，编译产物靠它落到 VNode 上
/**
 * 创建 VNode 的用户级入口（模板里手写、编译产物都用它）。
 * 与 createVNode 的唯一差别：可接收第 4 参 patchFlag 并落到 VNode 上，
 * 供 patchElement 时跳过静态部分的比对。
 *
 * @param {string|Object|Symbol} type - 标签名 / 组件对象 / 特殊符号
 * @param {Object|null} [props] - 属性
 * @param {string|Array|Object|null} [children] - 孩子
 * @param {number} [patchFlag] - 编译器静态标记（1=TEXT），手动调用不传
 * @returns {Object} VNode
 *
 * @example
 *   h('div', { id: 'a' }, [h('span', null, 'hi')])
 *   // → 元素 + 数组孩子，shapeFlag: 1|8 = 9
 *   h('div', null, 'hi', 1)
 *   // → 编译产物形态：多带一个 patchFlag=1
 */
const h = (type, props, children, patchFlag) => {
    const vnode = createVNode(type, props, children)
    if (patchFlag) vnode.patchFlag = patchFlag
    return vnode
}
```

```
h(type, props, children, patchFlag?)
  输入: 节点类型 / 属性 / 孩子 / 可选补丁标记
  输出: VNode
  过程: 直接转发 createVNode；patchFlag 非零才写入 vnode.patchFlag——编译产物（2.3）与运行时（4.3）在这里握手
```

`createVNode` 负责创建各种类型的 VNode（节点信息载体）：

- `type`：节点类型。
  - **组件**：type 是一个对象 `{ name, setup(props, ctx) {}, render() {} }`。
  - **元素**：type 是字符串，如 `createVNode("div", props, children)`。
- `props`：属性对象。
- `children`：数组（子节点列表）或字符串（文本）。

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
/**
 * 所有 createXxxVNode 的公共底座：组装 VNode 对象并推导 shapeFlag。
 *
 * shapeFlag 分两步按位叠加（位运算 |= 把两个标记合并进一个数字）：
 *   1. type 是字符串 → ELEMENT（普通元素）；type 是对象 → STATEFUL_COMPONENT；
 *   2. children 是字符串 → TEXT_CHILDREN；数组 → ARRAY_CHILDREN（并把混入的原始
 *      字符串就地包成 Text VNode，对齐真实 Vue 的 normalizeChildren）；对象 → SLOTS_CHILDREN
 *      （插槽对象的形态：{ default: () => [...] }）。
 * key 从 props 里提出来单独放（diff 的配对依据），props 里的 key 原样保留、
 * 挂载时会被跳过不写到 DOM 上。
 *
 * @param {string|Object|Symbol} type - 标签名 / 组件对象 / Text·Fragment·Comment 符号
 * @param {Object|null} props - 属性对象（含 key / 事件 onXxx 等）
 * @param {string|Array|Object|null} children - 文本 / VNode 数组 / 插槽对象 / 无
 * @returns {Object} VNode：{ type, props, key, children, shapeFlag, el, component }
 *
 * @example
 *   createBaseVNode('div', { id: 'a' }, 'hi')
 *   // → { type:'div', props:{id:'a'}, key:null, children:'hi',
 *   //     shapeFlag: 1|4 = 5 (ELEMENT|TEXT_CHILDREN), el:null, component:null }
 *   createBaseVNode(Child, { key: 1, msg: 'hi' }, { default: () => [...] })
 *   // → shapeFlag: 2|16 (STATEFUL_COMPONENT|SLOTS_CHILDREN)、key: 1
 */
function createBaseVNode(type, props, children) {
    const vnode = {
        type,
        props,
        key: props && props.key != null ? props.key : null,
        children,
        shapeFlag: 0,
        el: null, // 对应的真实节点
        component: null // 组件 VNode 上挂的实例
    }
    // 1. 是元素还是组件
    if (isString(type)) vnode.shapeFlag |= ShapeFlags.ELEMENT
    else if (isObject(type)) vnode.shapeFlag |= ShapeFlags.STATEFUL_COMPONENT

    // 2. 孩子是文本还是数组
    if (isString(children)) vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    else if (isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
        // 真实 Vue 的 normalizeChildren：数组里混入的原始字符串（编译产物会在
        // 标签之间生成空白文本节点）统一包成 Text VNode——否则它们没有 type/el，
        // patch 会静默跳过、unmount 会拿 undefined.el 直接崩
        vnode.children = children.map(child => (isString(child) ? createTextVNode(child) : child))
    }
    else if (isObject(children)) vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN

    return vnode
}
```

```
createBaseVNode(type, props, children)
  输入: 节点类型（字符串=元素 / 对象=组件）、属性、孩子
  输出: VNode（type/props/key/children/shapeFlag/el/component）
  过程: 两轮位标记——type 定"自己是什么"，children 定"孩子长什么样"，落在同一个 shapeFlag 上；数组孩子里混入的原始字符串就地包成 Text VNode（compile 的产物在标签之间带空白文本）；key 归一成 null（undefined 会让 diff 误判类型变了）
```

注意 `key` 那一行的写法：`props.key != null ? props.key : null`——**有 props 却没有 key 的节点，`props.key` 是 `undefined` 而不是 `null`**，而 `null !== undefined`，diff 的同类型判断会把它判成"类型变了"，每次更新都整棵重建。归一成 `null` 就是修这个坑。

### 4.3 shapeFlag：VNode 形状标记

`shapeFlag` 是一个位运算枚举，用来表示 VNode 的"长什么样"，渲染器据此选择对应的处理分支：

> 摘自 `./code/vue3/mini-vue/lib/shared.js`

```js
// ============================================================
// ShapeFlags：VNode 形状位标记（源码 src/shared/shapeFlags.ts）
// ============================================================
/**
 * VNode 的"形状"用二进制位来描述：每一位代表一种独立特征，可以按位组合。
 *
 * 为什么用位标记而不是普通字段？
 *   一个 VNode 可能同时是「组件 + slots 孩子」，普通枚举只能表达一种，
 *   位标记用一个数字就能同时携带多个布尔特征，判断时一次按位与（&）即可。
 *
 * @example
 *   // 元素 + 数组孩子：两个位叠加
 *   vnode.shapeFlag = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN // 1 | 8 = 9
 *   // 判断是否是数组孩子：非 0 即为真
 *   if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) { ... }
 *   // 1<<n 就是第 n 位为 1：1<<0=1(0001)、1<<1=2(0010)、1<<2=4(0100)、1<<3=8(1000)
 */
const ShapeFlags = {
    ELEMENT: 1, // 0001 —— 普通 DOM 元素（type 是字符串标签名）
    STATEFUL_COMPONENT: 1 << 1, // 0010 —— 有状态组件（type 是对象，含 setup/render）
    TEXT_CHILDREN: 1 << 2, // 0100 —— 孩子是一个字符串（纯文本）
    ARRAY_CHILDREN: 1 << 3, // 1000 —— 孩子是 VNode 数组
    SLOTS_CHILDREN: 1 << 4 // 0001 0000 —— 孩子是插槽对象 { default: () => [...] }
}
```

**位运算的好处是"一个值同时表达多种组合特征"**：

> 示意片段（无配套脚本）

```js
// 组合：有状态组件 + 数组子节点
const shapeFlag = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.ARRAY_CHILDREN;

// 检查是否包含某标志（按位与）
if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { /* 是 */ }
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { /* 是 */ }
```

渲染器 `patch` 根据 `shapeFlag` 分发到不同处理函数，位运算把两层判断压成了一次：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    /**
     * patch 的总分发：n1 为 null 表示挂载，n1、n2 都有表示更新。
     * 分发顺序：先三个特殊符号（Text/Comment/Fragment），再按 shapeFlag 位判
     * ELEMENT 还是 STATEFUL_COMPONENT。
     * n1 存在但类型/key 对不上 → 没有复用余地：记下它的下个兄弟做锚点，
     * 拆掉旧的、把 n1 置 null 走全新挂载。
     *
     * @param {Object|null} n1 - 旧 VNode（null 表示挂载）
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点（插在它前面；null 追加到末尾）
     */
    function patch(n1, n2, container, anchor) {
        if (n1 === n2) return

        // 类型或 key 变了：没有复用的余地，拆掉重建
        if (n1 && !isSameVNodeType(n1, n2)) {
            anchor = hostNextSibling(n1.el) // 新节点要插在旧节点的原位置（它的下一个兄弟之前）
            unmount(n1, true)
            n1 = null
        }

        const { type, shapeFlag } = n2
        switch (type) {
        case Text:
            processText(n1, n2, container, anchor)
            break
        case Comment:
            processComment(n1, n2, container, anchor)
            break
        case Fragment:
            processFragment(n1, n2, container, anchor)
            break
        default:
            if (shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor)
            else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                processComponent(n1, n2, container, anchor)
            }
        }
    }
```

`Fragment` 没有自己的节点，所以它用**两个空文本节点夹住自己这一段**当锚点——这也是为什么"顶层直接渲染一个数组"不会多出包裹节点。

### 4.4 组件实例化与 setup

组件的"身份"用一个 `instance`（组件实例）管理，它保存组件的 props、setupState、render、el、提供了依赖注入用的 provides 等。

setup 阶段的流程大致为：

1. 从 `vnode.type` 上取得组件对象（options）。
2. 创建组件实例 `instance`，初始化 props / slots。
3. 调用 `setup(instance.props, { emit, slots, attrs, expose })`，拿到 setup 返回的 `setupState`。
4. 若没有 `render`，则把 `setup` 返回的对象或 `data` 合并，最终调用组件的 `render`（或编译生成的 `render`）得到子树 VNode。

`<script setup>` 编译后等价于普通 `setup` 返回 setupState 的形式，这就是 1. 中提到的 SFC 编译与运行时在此"握手"。

props 那层解决的是"子组件改父组件传下来的值必须被拦住，但 props 还得跟着父组件更新"：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
// ============================================================
// 组件的 props 与 slots（源码 src/runtime-core/componentProps.ts）
//    ★ 断点：initProps（声明过的进 props、没声明的进 attrs）
// ============================================================
/**
 * 初始化组件的 props / attrs。
 * 分拣规则：组件 options.props 里声明过的 key 进 props（并包 shallowReadonly），
 * 没声明的进 attrs（透传属性，$attrs 可见）。没声明任何 props 的组件
 * 直接把原始对象当 attrs 用，连分拣都省了。
 * propsRaw 保留一份可写的原始引用：父组件更新时改它，readonly 代理自动读到新值。
 *
 * @param {Object} instance - 组件实例（写入 props / propsRaw / attrs 三个字段）
 * @param {Object|null} rawProps - VNode 上带的原始 props
 *
 * @example
 *   // 组件声明 props: { msg: ... }，父组件传 { msg: 'hi', extra: 1 }
 *   // → instance.props = { msg: 'hi' }（readonly）
 *   //   instance.attrs = { extra: 1 }
 */
function initProps(instance, rawProps) {
    const props = {}
    const attrs = {}
    const options = instance.type.props
    const raw = rawProps || {}

    // 声明过的进 props，没声明的进 attrs——这决定了它会不会出现在 $attrs 里
    for (const key of Object.keys(raw)) {
        if (options && key in options) props[key] = raw[key]
        else attrs[key] = raw[key]
    }

    instance.props = options ? shallowReadonly(props) : attrs
    // 留一份原始对象的引用：更新 props 时直接改它，代理会自动读到新值
    instance.propsRaw = options ? props : attrs
    instance.attrs = options ? attrs : {}
}
```

```
initProps(instance, rawProps)
  输入: 组件实例、vnode.props（父组件传的全部属性）
  输出: 填好 instance.props（浅只读代理）/ propsRaw（原始引用）/ attrs
  过程: 按组件声明分流——声明过的进 props（shallowReadonly 包一层），没声明的进 attrs；propsRaw 留给 updateProps 直改
```

`shallowReadonly` 是关键选型：**浅**只读，能拦住"子组件替换整个 prop"，又不妨碍 prop 内部的对象继续响应式。至于 `propsRaw`，是因为只读代理挡不住框架自己更新 props——框架拿着一份原始引用直接改，代理自动读到新值。

### 4.5 虚拟 DOM：挂载 / 更新 / 卸载

| 阶段 | 说明 |
| --- | --- |
| **挂载（mount）** | 首次渲染：创建真实 DOM、绑定 props/事件、挂载子节点、插入容器、触发 `onMounted` |
| **更新（update）** | `patch` 对比新旧 VNode：文本不同则更新文本，元素走 `diff`，组件重新执行 render |
| **卸载（unmount）** | 移除真实 DOM、清理组件 effect 与事件、触发 `onUnmounted`，防止内存泄漏 |

前三层在这一节合上：**组件的 render 被包成一个 effect**，它读到的响应式数据就是它的依赖。`isMounted` 那一个布尔值区分了"挂载"和"更新"两种 patch 签名——`patch(null, subTree)` 与 `patch(prevSubTree, nextSubTree)`，正是新旧对比的入口：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
/**
 * 给组件装上"渲染 effect"——组件响应式的发动机。
 *
 * componentUpdateFn 内部用 isMounted 区分首次（挂载子树）与后续（patch 新旧子树），
 * 并在 patch 子树前后保存/恢复 currentScopeInstance：
 * 这段时间内被挂载的子组件实例的 parent 都指向本组件（provide/inject 链的来源）。
 *
 * scheduler 是关键：数据变化不直接重渲染，而是把 instance.update 排进
 * 微任务队列——同一 tick 改 10 次数据也只渲染 1 次（queueJob 去重）。
 *
 * @param {Object} instance - 组件实例（写入 update / subTree / isMounted）
 * @param {Object} initialVNode - 组件 VNode（挂载后把 el 回填到它上面）
 * @param {Object} container - 挂载容器
 * @param {Object|null} anchor - 插入锚点
 * @param {Function} patch - renderer 的 patch（闭包传入，避免全局引用）
 */
function setupRenderEffect(instance, initialVNode, container, anchor, patch) {
    const componentUpdateFn = () => {
        // patch 子树期间本组件是"当前父实例"：沿途挂载的子组件 parent 指向它（provide/inject 依据）
        const prev = currentScopeInstance
        currentScopeInstance = instance
        if (!instance.isMounted) {
            const subTree = (instance.subTree = renderComponentRoot(instance))
            patch(null, subTree, container, anchor)
            initialVNode.el = subTree.el
            instance.isMounted = true
        } else {
            const prevSubTree = instance.subTree
            const nextSubTree = (instance.subTree = renderComponentRoot(instance))
            patch(prevSubTree, nextSubTree, container, anchor)
        }
        currentScopeInstance = prev
    }

    // scheduler 是关键：数据变化不会立刻渲染，只把 update 排进微任务队列
    instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })
}
```

```
setupRenderEffect(instance, ...)
  输入: 组件实例、挂载容器与锚点、patch 函数
  输出: instance.update（渲染 effect 的 runner）
  过程: componentUpdateFn 包成 effect——首跑走挂载分支 patch(null, subTree)，之后依赖变化走更新分支 patch(prev, next)；scheduler 把每次触发变成 queueJob 入队（微任务批处理）
```

"改三次只渲染一次"就发生在 scheduler 里。它用的是**微任务**，所以整块同步代码跑完、DOM 还是旧的，`nextTick()` 之后才能读到新值：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
/**
 * 把一个渲染 job 排进微任务队列（去重）。
 * 同步改 3 次数据 → 渲染 effect 被 trigger 3 次 → scheduler 调 3 次 queueJob，
 * 但 includes 保证同一个 job 只进队一次——这就是"批处理"的来源。
 *
 * @param {Function} job - 待执行函数（通常是组件的 instance.update）
 *
 * @example
 *   const job = () => console.log('flush')
 *   queueJob(job); queueJob(job) // → 队列里只有 1 个，微任务里只执行 1 次
 */
function queueJob(job) {
    if (!queue.includes(job)) queue.push(job) // 同一个 job 只排一次
    queueFlush()
}

/**
 * 保证"排队 → 微任务 flush"只发起一次：isFlushPending 是闸门，
 * 已开闸就不再新建 Promise，直到 flushJobs 把它复位。
 */
function queueFlush() {
    if (isFlushPending) return
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
}

/**
 * 在微任务里统一执行队列中的所有 job。
 * 先 splice 出快照再清空原队列：flush 过程中新触发的 job 留在队列里，
 * 结尾检查还有剩就递归再来一轮（组件父子链上的级联更新）。
 */
function flushJobs() {
    isFlushPending = false
    const jobs = queue.splice(0, queue.length) // 先取出快照，flush 过程中新加的留到下一轮
    for (const job of jobs) job()
    if (queue.length) flushJobs() // 组件有父子依赖时，执行中可能又推入新 job
}
```

```
queueJob(job) → queueFlush() → flushJobs()
  输入: job（组件的 update runner）
  输出: void（副作用：微任务里统一执行全部 job）
  过程: queue.includes 去重（同一组件多次触发只排一次）→ resolvedPromise.then 排进微任务 → flush 时 splice 取快照逐个执行，执行中新增的 job 留到下一轮
```

`queue.includes(job)` 这一句就是批处理的全部——**同一个组件的 update 在队列里只会出现一次**。在 `mini-vue/demo/demo-diff.html` 实测：点「同一 tick 连删 3 次」，页面直接呈现删完后的最终列表，中间两次状态从未渲染：

```
==== 3. 同一个 tick 改三次，只渲染一次（批处理）====
  三次赋值后立刻看：渲染次数 +0，DOM 仍是旧文案
  await nextTick() 之后：渲染次数 +1
  DOM 变成「count=3，double=6」
```

由此得出四个能直接下判断的结论：**`this.count` 里没有 `.value`**（setup 返回的 ref 被 `proxyRefs` 包过）；**批处理不是额外实现**（渲染交给调度器的自然结果）；**props 是浅只读**（子组件改被告警，父组件传新值照常生效）；**卸载必须 stop 渲染 effect**（否则组件不在了更新还一直来，就是内存泄漏）。

### 4.6 列表 diff：头尾同步 + 按 key 配对

列表 diff 是**先对齐头尾、再处理中间乱序**（双端比较）。头尾两步便宜且常见——能对上的直接复用，一个属性都不多改：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    // ---------- 列表 diff：先对齐头尾，再处理中间的乱序部分 ----------
    /**
     * 带 key 列表的 diff（真实 Vue 最长递增子序列算法的简化版）：
     *   1. 从头同步：i 左移，类型+key 相同的就地 patch；
     *   2. 从尾同步：e1/e2 左移，同理；
     *   3. 旧遍历完（i > e1）新还有剩 → 剩下的全是新增，逐个插入；
     *   4. 新遍历完（i > e2）旧还有剩 → 剩下的全是删除，逐个卸载；
     *   5. 中间乱序：按新列表的 key 建索引 → 旧节点查表决定 patch 还是卸载
     *      （没 key 的按下标硬对齐——这正是"用 index 当 key"引发错乱的原因）→
     *      最后从后往前把新列表中间段的节点挪/插到正确位置。
     * 从后往前是因为前一个节点的锚点（后一个节点的 el）必须先就位。
     *
     * @param {Array} c1 - 旧孩子数组
     * @param {Array} c2 - 新孩子数组
     * @param {Object} container - 宿主容器
     * @param {Object|null} parentAnchor - 父级插入锚点（新列表末尾越界时的兜底锚点）
     *
     * @example
     *   // 旧 [a,b,c] → 新 [c,a,b]：
     *   // 头同步 a≠c 断、尾同步 c≠a 断 → 全乱序走第 5 步：
     *   // key 索引 {a:0,b:1,c:2}；旧 a/b/c 全部查到 → 全 patch 复用，不重建；
     *   // 从后往前 insert 把顺序摆正，宿主上最终顺序 [c,a,b]
     */
    function patchKeyedChildren(c1, c2, container, parentAnchor) {
        let i = 0
        const l2 = c2.length
        let e1 = c1.length - 1
        let e2 = l2 - 1

        // 1. 从头同步：能对上的直接复用，一个属性都不多改
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            i++
        }

        // 2. 从尾同步
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            e1--
            e2--
        }

        // 3. 新列表更长：中间这一段全部是新增
        if (i > e1 && i <= e2) {
            // 新增段插在"新列表里它后面的那个节点"之前；后面没有了就插到父级锚点（末尾）
            const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
            while (i <= e2) {
                patch(null, c2[i], container, anchor)
                i++
            }
            return
        }

        // 4. 旧列表更长：中间这一段全部要删除
        if (i > e2 && i <= e1) {
            while (i <= e1) {
                unmount(c1[i], true)
                i++
            }
            return
        }

        // 5. 中间乱序：按 key 建索引，找出"哪些还在、哪些新增"
        const s1 = i
        const s2 = i
        const keyToNewIndex = new Map()
        for (let j = s2; j <= e2; j++) {
            if (c2[j].key !== null) keyToNewIndex.set(c2[j].key, j)
        }

        for (let j = s1; j <= e1; j++) {
            const prevChild = c1[j]
            // 没 key 的退化成按下标对应 —— 这正是"用 index 当 key"会出现的行为
            const newIndex = prevChild.key !== null ? keyToNewIndex.get(prevChild.key) : s2 + (j - s1)

            if (newIndex === undefined || newIndex > e2) {
                unmount(prevChild, true) // 查不到（或越界）→ 这个节点被删掉了
            } else {
                patch(prevChild, c2[newIndex], container, parentAnchor) // 还在 → 就地更新
            }
        }

        // 从后往前把节点挪到正确位置
        // （真实 Vue 会先算最长递增子序列，跳过本来就在正确位置的那些，这里简化为逐个插）
        for (let j = e2; j >= s2; j--) {
            const nextChild = c2[j]
            const anchor = j + 1 < l2 ? c2[j + 1].el : parentAnchor
            if (nextChild.el === null) patch(null, nextChild, container, anchor) // 没挂过 → 新增
            else hostInsert(nextChild.el, container, anchor) // 已存在 → 挪到正确位置
        }
    }
```

```
patchKeyedChildren 第 1、2 步
  输入: 旧孩子数组 c1、新孩子数组 c2
  输出: i / e1 / e2 三个游标——圈出两端已同步、中间待处理的范围
  过程: 双指针从头 / 从尾同步，isSameVNodeType（type + key）相同就地 patch 复用，遇不同立即停
```

头尾都没对上时才走"中间乱序"：按 key 建索引，找出哪些还能复用、哪些是新增，再统一搬移。**没 key 的退化成按下标对应——这正是"用 index 当 key"会出现的行为**：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
        // 5. 中间乱序：按 key 建索引，找出"哪些还在、哪些新增"
        const s1 = i
        const s2 = i
        const keyToNewIndex = new Map()
        for (let j = s2; j <= e2; j++) {
            if (c2[j].key !== null) keyToNewIndex.set(c2[j].key, j)
        }

        for (let j = s1; j <= e1; j++) {
            const prevChild = c1[j]
            // 没 key 的退化成按下标对应 —— 这正是"用 index 当 key"会出现的行为
            const newIndex = prevChild.key !== null ? keyToNewIndex.get(prevChild.key) : s2 + (j - s1)
```

断言 diff 最直接的办法是对照两种列表的渲染过程（无 key 的内容错位来自一组就地宿主操作）。`mini-vue/demo/demo-diff.html` 提供了有 key 列表的实测入口（删首项 / 删中间 / 追加 / 重置，宿主操作的真实数据见 5.4 节实例走读）；无 key 的对照行为如下：

```
==== 场景一：删掉列表第一项 ====
---- 无 key ----  宿主操作 5 次（改 data-id、改文本 ×2 + remove）
---- 有 key ----  宿主操作 1 次（remove）

==== 场景二：把最后一项移到最前（纯重排）====
---- 无 key ----  宿主操作 6 次，全是"就地改写内容"，一个节点都没搬
---- 有 key ----  宿主操作 3 次，全是搬移（insert），一次内容都没改
```

两种写法的 DOM 结果看起来完全一样，差别只在过程——而"就地改写"意味着节点被复用、内容被换掉，节点上的输入框内容、焦点、组件内部状态都会串位。同时要清楚：**有 key 的重排不是零成本**，真实 Vue 会先算最长递增子序列，跳过本来就在正确位置的节点。

### 4.7 生命周期钩子

生命周期钩子本质是"**在特定时机调用的用户函数集合**"。以 `onMounted` 为例：

- 内部把回调注册到当前组件实例的对应数组（如 `instance.mounted`）。
- 组件挂载完成时，渲染器统一遍历并调用这些回调。

注册依赖 `currentInstance`——它只在 setup 执行期间非空，所以钩子必须同步写在 setup 里：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
// ============================================================
// 组件实例与渲染 effect（源码 src/runtime-core/component.ts）
//    ★ 断点：componentUpdateFn（isMounted 区分挂载 / 更新）、setupComponent（setup 执行）
// ============================================================
/** 生命周期注册的依据：setup 执行期间的当前实例 */
let currentInstance = null // 生命周期注册的依据：setup 执行期间的当前实例
/** patch 子树期间的"当前父实例"：沿途挂载的子组件以它为 parent（provide/inject 查找链的依据） */
let currentScopeInstance = null

/**
 * 注册 mounted 钩子（只能在 setup 执行期间调用：靠 currentInstance 定位实例）。
 * 挂载完成后在 mountComponent 里统一执行。
 *
 * @param {Function} fn - 回调
 *
 * @example
 *   setup() { onMounted(() => console.log('mounted')) }
 */
const onMounted = fn => currentInstance && currentInstance.mounted.push(fn)
/**
 * 注册 unmounted 钩子（只能在 setup 执行期间调用）。
 * 卸载时在 unmount 的组件分支里统一执行。
 *
 * @param {Function} fn - 回调
 *
 * @example
 *   setup() { onUnmounted(() => console.log('unmounted')) }
 */
const onUnmounted = fn => currentInstance && currentInstance.unmounted.push(fn)
```

调用时机在渲染器里：挂载钩子在 `mountComponent` 末尾统一触发（首次渲染 effect 是同步执行的，走到这里子树已挂载完）；卸载钩子在 `unmount` 里**先于 effect.stop 执行**：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    /**
     * 挂载组件：建实例（parent 取自 currentScopeInstance）→ setupComponent 初始化
     * （执行 setup）→ setupRenderEffect 建渲染 effect（同步首跑即完成子树挂载）→
     * 统一执行 onMounted 钩子（此时子树一定挂载完，子组件的钩子先于父组件）。
     *
     * @param {Object} initialVNode - 组件 VNode（component 字段回填实例）
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     */
    function mountComponent(initialVNode, container, anchor) {
        // parent 从 currentScopeInstance 取：组件更新 patch 子树时，它就是当前组件实例
        const instance = (initialVNode.component = createComponentInstance(
            initialVNode,
            currentScopeInstance
        ))
        setupComponent(instance)
        setupRenderEffect(instance, initialVNode, container, anchor, patch)
        // 生命周期：首次渲染 effect 是同步执行的，走到这里子树已挂载完，统一调用挂载钩子
        if (instance.isMounted) instance.mounted.forEach(hook => hook())
    }
```

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    // ---------- 卸载 ----------
    /**
     * 卸载一个 VNode（递归）：按类型分流——
     *   Fragment：先递归卸载孩子，再移除首尾两个锚点节点；
     *   组件：先执行 unmounted 钩子、再停掉渲染 effect（顺序反了会内存泄漏：
     *   effect 还活着就会继续响应数据变化），最后递归卸载它的子树；
     *   元素：先递归卸载数组孩子（子组件的钩子与 effect.stop 都靠这一步触发），
     *   再移除自己的宿主节点。
     *
     * @param {Object} vnode - 要卸载的 VNode
     * @param {boolean} doRemove - 是否真的从 DOM 摘除（false 只递归触发钩子，用于"换个容器"场景）
     */
    function unmount(vnode, doRemove) {
        const { type, shapeFlag } = vnode

        if (type === Fragment) {
            unmountChildren(vnode.children, doRemove)
            if (doRemove) {
                hostRemove(vnode.el)
                hostRemove(vnode.anchor)
            }
            return
        }

        if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            if (vnode.component && vnode.component.update) {
                // 生命周期：先执行卸载钩子，再停掉渲染 effect（否则依赖还在、更新还会来——内存泄漏）
                vnode.component.unmounted.forEach(hook => hook())
                vnode.component.update.effect.stop()
            }
            unmount(vnode.component.subTree, doRemove)
            return
        }

        // 元素：先递归卸载孩子（子组件的 unmounted 钩子、渲染 effect 的 stop 都靠这一步），再移除自己
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) unmountChildren(vnode.children, doRemove)
        if (doRemove) hostRemove(vnode.el)
    }
```

```
onMounted(fn) / onUnmounted(fn)
  输入: 用户回调
  输出: void（副作用：回调进当前实例的 mounted / unmounted 数组）
  过程: 注册靠 setup 执行期间的 currentInstance；mounted 在 mountComponent 末尾统一调用；unmounted 在 unmount 时先调用、再 effect.stop（顺序反了会漏触发）
```

`watch` / `computed` 的清理（stop）也会在生命周期卸载阶段统一触发，确保数据变化不再影响已销毁的组件（防止内存泄漏）。

### 4.8 props 与插槽

**props**

- 组件 `props` 由 `setup(props)` 接收，由 `vnode.props` 提取、按组件声明的 `props` 配置校验与收集。
- props 是**响应式且只读**的一部分（其实例上的 `props` 是通过 `shallowReadonly` 代理的，避免子组件随意改父组件的值）。
- props 变化会触发子组件更新。

**插槽（slots）**

- 父组件把模板片段编译为"返回 VNode 树的函数"作为插槽内容。
- 子组件通过 `slots` 拿到这些函数并渲染（`useSlots` / `this.$slots`）。
- 对应 `shapeFlag` 的 `SLOTS_CHILDREN`。作用域插槽与普通插槽的区别在于：插槽函数接收 props 参数，从而实现"子传父"的数据渲染。

### 4.9 provide / inject：依赖注入

`provide/inject` 用于跨层级传递数据，跳过中间组件。

- 每个组件实例都有 `provides` 对象，初始指向父实例的 `provides`。
- `provide(key, value)`：在**当前实例自己的 provides 副本**上设置值（浅复制父 provides 后再赋值，形成原型链式查找）。
- `inject(key)`：从当前实例开始**沿 provides 链向上查找**，找到即返回。

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
// ============================================================
// provide / inject：依赖注入（源码 src/runtime-core/apiInject.ts）
//    ★ 断点：provide（原型链副本的创建时机）、inject（沿 parent 链向上查找）
// 对应文档 4.9：初始与父实例共享同一个 provides；首次 provide 时才
// 用 Object.create(parentProvides) 建原型链副本——此后"就近覆盖、向上穿透"。
// ============================================================
/**
 * 向后代提供数据。实例创建时 provides 直接指向父级的 provides（共享同一个对象），
 * 第一次调用 provide 才用 Object.create(parentProvides) 造一个"原型链副本"：
 * 写进副本的是自己的值，原型上还能读到祖先的值——查值时"就近覆盖、向上穿透"。
 *
 * @param {string|symbol} key - 提供的键
 * @param {*} value - 提供的值
 *
 * @example
 *   // 祖先组件 setup：provide('theme', 'dark')
 *   // 中间组件没 provide → 与父共享，读到 'dark'
 *   // 某后代 setup：provide('theme', 'light') → 它自己的子树读到 'light'（就近覆盖）
 */
const provide = (key, value) => {
    if (currentInstance) {
        let { provides } = currentInstance
        const parentProvides = currentInstance.parent && currentInstance.parent.provides
        // 还在共享父的 provides，先建自己的原型链副本
        if (parentProvides && provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}

/**
 * 注入祖先提供的数据：沿 parent 链的 provides 原型链向上查找（key in 判断会穿透原型）。
 * 找不到返回 undefined。注意取的是"父级的 provides"——自己 provide 的值自己 inject 不到。
 *
 * @param {string|symbol} key - 要注入的键
 * @returns {*} 祖先提供的值；无任何祖先提供时为 undefined
 *
 * @example
 *   // 子组件 setup（父级 provide('theme', 'dark') 后）：
 *   inject('theme') // → 'dark'
 *   inject('nothing') // → undefined
 */
const inject = key => {
    if (currentInstance) {
        const parentProvides = currentInstance.parent && currentInstance.parent.provides
        if (parentProvides && key in parentProvides) return parentProvides[key]
    }
}
```

```
provide(key, value) / inject(key)
  输入: 注入键与值 / 注入键
  输出: void / 找到的值（找不到返回 undefined）
  过程: instance.provides 初始与 parent.provides 是同一个对象；首次 provide 才 Object.create(parentProvides) 建原型链副本再赋值；inject 沿原型链向上查——parent 链由 4.5 摘录里的 currentScopeInstance 在挂载时逐层建立
```

借用 JS 原型链（`Object.create`），实现了 `inject` 沿祖先链查找且支持同名覆盖的效果，这也是 Vue 依赖注入"就近覆盖、向上穿透"的原理。

## 五、关键执行链路

前四章按「模块」讲函数，本章按「一次操作的调用顺序」把函数串成链路。每节一张 ASCII 链路图 + 分步实例走读（真实输入 / 输出数据块，产物为 lib 实际运行结果）+ 断点建议，与 `./code/vue3/mini-vue/demo/` 下的 5 个纯渲染 demo 一一对应（demo 加载即渲染，交互按钮 + 渲染区，`F12 → Sources` 按函数名搜即可断点）。函数的完整 JSDoc 与逐字代码摘录都在前文对应小节，本章不重复贴码，只给「见 X.X 节」引用。

五条链路按数据形态衔接（模板串 → render 函数 → VNode 树 → 真实 DOM → 状态变更 → 新 VNode 树 → 最小 DOM 操作 → 销毁）：

```
① 编译           ② 挂载              ③ 响应式           ④ 更新（批处理 + diff）   ⑤ 卸载
demo-compiler    demo-mount          demo-reactivity    demo-diff               demo-unmount
────────────     ────────────        ────────────       ────────────────        ────────────
模板字符串         VNode 树            状态写入            状态写入                 render(null, 容器)
   │ parse           │ mount             │ track(读)        │ set → trigger          │ unmount
   ▼ AST             │ mountComponent    │                 │                        │   unmounted 钩子
   │ transform       │ setupComponent    │                 │ queueJob（去重入队）     │   effect.stop（退订）
   ▼ 带标记的 AST     │ setupRenderEffect │                 ▼ 微任务 flushJobs        │   递归 unmount(subTree)
   │ generate        │   挂载分支          │                 │ patch(n1, n2)          │   hostRemove 摘 DOM
   ▼ render 代码      │ patch(null,subTree)│                 │ patchElement           ▼
   │ new Function    ▼ mountElement     │                 │ patchChildren
   ▼ render 函数 ──▶ 真实 DOM ◀─────────┴── effect 重跑 ──▶ patchKeyedChildren
                                     （触发③即回到这里）    （移动 / 新增 / 卸载）
```

### 5.1 编译链路：模板字符串 → render 函数

对应 demo：`demo-compiler.html`——编辑文本框里的模板即实时重新编译，并排展示三份产物（AST / 静态标记 / render 代码），加载即产出预置模板的结果。

```
模板字符串
   │
   ▼ parse(template)                 compiler-core.js
   │   正则逐段扫描 + 开闭标签栈
   ▼ AST（嵌套 JSON 对象）
   │
   ▼ transform(ast) → walk(node)     compiler-core.js
   │   递归遍历：isStatic 判定 → patchFlag 落位 / 静态节点标记
   ▼ 带标记的 AST
   │
   ▼ generate(ast) → genNode(node)   compiler-core.js
   │   递归拼接代码字符串
   ▼ render 代码（字符串）
   │
   ▼ compile(template)               compiler-core.js
   │   new Function('h', 'toDisplayString', 'ctx', code)
   ▼ 可执行 render 函数
```

分步实例走读——每步给真实输入与真实输出（数据为 lib 实际运行产物，示例用 demo 预置模板）：

**步骤① parse：模板串 → AST**

输入（demo 预置模板，进页面自动编译的就是它）：

> 示意片段（无配套脚本）

```html
<section class="app-head">
  <h3>任务列表（静态标题：编译时提升）</h3>
  <p data-role="count">count = {{ count }}，double = {{ double }}，title = {{ title }}</p>
  <button data-act="inc">count + 1</button>
</section>
```

输出（AST 根节点 JSON；`…` 是真实存在的空白文本节点，这里略去）：

> 示意片段（无配套脚本）

```json
{
  "type": "Root",
  "tag": null,
  "children": [
    {
      "type": "Element",
      "tag": "section",
      "attrs": { "class": "app-head" },
      "children": [
        { "type": "Text", "content": "…" },
        { "type": "Element", "tag": "h3", "attrs": null,
          "children": [ { "type": "Text", "content": "任务列表（静态标题：编译时提升）" } ] },
        { "type": "Text", "content": "…" },
        { "type": "Element", "tag": "p", "attrs": { "data-role": "count" },
          "children": [
            { "type": "Text", "content": "count = " },
            { "type": "Interpolation", "expression": "count" },
            { "type": "Text", "content": "，double = " },
            { "type": "Interpolation", "expression": "double" },
            { "type": "Text", "content": "，title = " },
            { "type": "Interpolation", "expression": "title" }
          ] },
        { "type": "Text", "content": "…" },
        { "type": "Element", "tag": "button", "attrs": { "data-act": "inc" },
          "children": [ { "type": "Text", "content": "count + 1" } ] }
      ]
    }
  ]
}
```

处理：正则逐段匹配开标签 / 文本 / 闭合标签，开闭标签栈配对出层级，开标签属性串再经 `parseAttrs` 切成 `{ key, value }`——三层嵌套 + 三类节点（Element / Text / Interpolation）就是 parse 的全部产出。

**步骤② transform：AST → 带静态标记的 AST**

输入：步骤① 的 AST。输出（transform 只补字段不动结构——同一节点的真实前后对比）：

> 示意片段（无配套脚本）

```json
{
  "transform 前": { "type": "Element", "tag": "h3", "attrs": null, "children": "…" },
  "transform 后": { "type": "Element", "tag": "h3", "isStatic": true, "patchFlag": 0, "attrs": null, "children": "…" }
}
```

全树标记一览（真实产物，`…` 为空白文本行）：

```
<section> isStatic=false patchFlag=1      ← 含插值孩子：自身要参与更新
  <h3> isStatic=true patchFlag=0          ← 纯静态：更新时整段跳过
    "任务列表（静态标题：编译时提升）" → 静态文本
  <p> isStatic=false patchFlag=1          ← TEXT：只重算插值文本
    "count = " → 静态文本
    {{ count }} → 动态
    "，double = " → 静态文本
    {{ double }} → 动态
    "，title = " → 静态文本
    {{ title }} → 动态
  <button> isStatic=true patchFlag=0      ← 纯静态
```

规则即 `walk` 的判定：无插值 → `isStatic=true` + `patchFlag=0`；有插值 → `patchFlag=1`（TEXT）。见 2.3 节。

**步骤③ generate：带标记 AST → render 代码**

输入：步骤② 的 AST。输出（真实产物全文，单行字符串）：

> 示意片段（无配套脚本）

```js
[h("section", {"class":"app-head"}, ["\n  ", h("h3", null, "任务列表（静态标题：编译时提升）"), "\n  ", h("p", {"data-role":"count"}, "count = " + toDisplayString(ctx.count) + "，double = " + toDisplayString(ctx.double) + "，title = " + toDisplayString(ctx.title), 1), "\n  ", h("button", {"data-act":"inc"}, "count + 1"), "\n"], 1)]
```

要点全在串里：嵌套 `h(...)` 对应 AST 层级；插值变成 `toDisplayString(ctx.count)` 拼接；`patchFlag`（末尾的 `1`）作为 h 的参数直接写死进代码——运行时不再判断静态与否；顶层包成数组。

**步骤④ compile：字符串 → 函数**

输入：步骤③ 的代码字符串。处理：`new Function('h', 'toDisplayString', 'ctx', code)`。输出（真实产物：传入 h / toDisplayString / 初始状态执行一次得到 VNode 数组；`el` 全为 null——此刻尚未挂载）：

> 示意片段（无配套脚本）

```json
[
  {
    "tag": "section",
    "patchFlag": 1,
    "children": [
      { "type": "Text", "children": "\n  " },
      { "tag": "h3", "patchFlag": 0, "children": "任务列表（静态标题：编译时提升）", "el": "null" },
      { "type": "Text", "children": "\n  " },
      { "tag": "p", "patchFlag": 1, "children": "count = 0，double = 0，title = 标题 A", "el": "null" },
      { "type": "Text", "children": "\n  " },
      { "tag": "button", "patchFlag": 0, "children": "count + 1", "el": "null" },
      { "type": "Text", "children": "\n" }
    ],
    "el": "null"
  }
]
```

执行时插值已求值（`ctx.count` → 0）——**编译期只生成取值代码，求值发生在执行 render 的那一刻**；这份数组就是 5.3 挂载链路的输入。

关键函数摘录（与 lib 逐字一致，完整 JSDoc 见对应小节）：`parse` / `generate` / `compile` 见 2.2 节；`transform.walk`（静态标记与 patchFlag）见 2.3 节。

断点建议：

- 断在 `parse` 主循环：看 `rest` 逐段变短、`stack` 如何配对出节点层级
- 断在 `transform.walk`：静态 `<h3>` 落 `isStatic=true`（patchFlag=0），含插值的 `<p>` 落 `patchFlag=1`
- 断在 `compile` 的 `new Function`：放行后，第三栏的代码字符串变成可执行 render
- 编辑模板：三份产物即时更新，但**已挂载的页面不会变**——重新挂载才生效

demo 入口：`./code/vue3/mini-vue/demo/demo-compiler.html`

### 5.2 响应式链路：状态读写 → effect 重跑 → computed / watch

对应 demo：`demo-reactivity.html`——四行渲染区由四个独立 effect 各自驱动（ref 计数 / reactive 深层 / computed 读数 / watch 新旧值），点按钮后看对应行变化。

```
读状态（effect 首跑）                    写状态（任意时机）
      │                                       │
      ▼ createGetter（Proxy get 陷阱）         ▼ createSetter（Proxy set 陷阱）
      │   Reflect.get 后 track(target, key)   │   Reflect.set 后 trigger(target, key)
      ▼ track                                 ▼ trigger
      │   targetMap: WeakMap                  │   depsMap.get(key) 复制一份逐个唤醒
      ▼ target → Map<key, Set<effect>>        │
      │   依赖关系图建成                        ├─ 渲染 effect：有 scheduler → queueJob（见 5.4）
      │                                       ├─ 普通 effect：无 scheduler → 直接 run() 重跑
      │                                       ├─ computed 依赖：只置脏（_dirty = true）
      │                                       └─ watch 依赖：scheduler 跑回调（新值 ← 旧值）
```

分步实例走读（场景与 demo-reactivity 的四行渲染区一致；输入是真实代码，输出是 lib 实际运行产物）：

**步骤① track：读时建依赖**

输入（demo 渲染区的建法——4 个 effect 各管一行，computed 与 watch 内部再各建 1 个 effect）：

> 示意片段（无配套脚本）

```js
const count = M.ref(0)
const obj = M.reactive({ nested: { msg: 'hello' }, title: '标题 A' })
const double = M.computed(() => count.value * 2)               // getter effect
M.effect(() => { vCount.textContent = String(count.value) })   // 渲染行 1
M.effect(() => { vMsg.textContent = obj.nested.msg })          // 渲染行 2（深层）
M.effect(() => { vTitle.textContent = obj.title })             // 渲染行 3
M.watch(count, (nv, ov) => { vWatch.textContent = String(nv); vWatchOld.textContent = String(ov) })
```

输出（`describeDeps()` 把 targetMap 打印出来——真实产物，一行 = target → key → dep）：

```
  {"_value":0,"__v_isRef":true}  value → 3 个 effect
  {"nested":{"msg":"hello"},"title":"标题 A"}  nested → 1 个 effect，title → 1 个 effect
  {"msg":"hello"}  msg → 1 个 effect
```

读三遍：count 这格 dep 里有 3 个 effect（渲染行 1 + computed getter + watch）；`obj` 的 `nested` 键与**嵌套对象自身的** `msg` 键各有一格——写深层能精确触发，是 3.1「惰性深度代理」在依赖图上的直接体现。

**步骤② trigger：写时唤醒**

输入：`count.value++`。输出（唤醒顺序 = dep 的插入序，真实留痕）：

```
trigger {"_value":0,"__v_isRef":true} . value   ← set 陷阱：值变了才 trigger
effect#1 重跑                                    ← 渲染行 1：无 scheduler → 同步重跑（vCount：0 → 1）
trigger computed . value                         ← computed 的 scheduler：只置脏（_dirty = true），getter 没跑
effect#4 重跑                                    ← watch 的 scheduler → 重跑取新值 → 回调（新值 1，旧值 0）
```

同一时刻 demo 上能直接读到的证据：`vCalls`（getter 调用次数）**停在 1 没涨**、`vDouble` 仍是 0——置脏不等于重算。

**步骤③ effect 重跑：渲染区跟着变**

输出（渲染行 1 的前后对照，真实产物）：文本 `0` → `1`。重跑内部：`cleanupEffect` 先退订全部旧依赖 → 函数体重跑 → 再读 `count.value` 时 track 重建——「先清后收」保证条件分支变化后不留死依赖（见 3.4 节）。

**步骤④ computed / watch：两条支线的真实数据**

接着做三件事（对应 demo 的按钮）：

> 示意片段（无配套脚本）

```js
showDouble()                // 读 double.value：_dirty 为 true → getter 重算（vCalls 1 → 2，vDouble 0 → 2）
obj.nested.msg = 'world1'   // 深层写入 → 连续两级 trigger → 只有渲染行 2 重跑
stopWatch()                 // watch 退订；之后再 count.value = 99 → vWatch 停在 1 不再变
```

深层写入的真实留痕（先外层 `nested` 后内层 `msg`，两级各唤醒自己的 dep）：

```
trigger {"nested":{"msg":"world1"},"title":"标题 A"} . nested
trigger {"msg":"world1"} . msg
effect#2 重跑
```

watch 退订后再看依赖图（真实产物）：count 的 dep 从 3 个 effect 缩到 2 个——`cleanupEffect` 退订的直接证据：

```
  {"_value":99,"__v_isRef":true}  value → 2 个 effect
  {"nested":{"msg":"world1"},"title":"标题 A"}  nested → 1 个 effect，title → 1 个 effect
  {"msg":"world1"}  msg → 1 个 effect
```

关键函数摘录：`reactive` / `createGetter` / `createSetter` 见 3.1 节；`track` 见 3.2 节；`trigger` 见 3.3 节；`effect` / `cleanupEffect` / `stop` 见 3.4 节；`ref` 见 3.5 节；`computed` 见 3.7 节；`watch` 见 3.8 节。

断点建议：

- 断在 `track`：进页面首跑时看 depsMap 怎么一级级长出来
- 断在 `trigger`：点 count+1，看唤醒了哪几个 effect（渲染 effect 走 scheduler，computed 只置脏）
- 断在 `watch` 的回调：看新值 / 旧值来源；点 stop 后再改 count，确认 dep 已空、回调不再来
- 不打断点也能验证 computed 缓存：读数区的「getter 调用次数」不随依赖变化增长，只在重读 `.value` 时 +1

demo 入口：`./code/vue3/mini-vue/demo/demo-reactivity.html`

### 5.3 挂载链路：createApp().mount → 真实 DOM

对应 demo：`demo-mount.html`——左栏是 subTree 的可读版本（VNode 树），右栏是挂载容器里的真实 DOM，两者一一对应；主题条演示 provide / inject。

```
M.createApp(App).mount(容器)
   │ createAppAPI().mount                  runtime-core.js
   ▼ createVNode(App)                      runtime-core.js
   │   根组件包成 vnode
   ▼ render(vnode, container)              runtime-core.js（createRenderer 内）
   │   container._vnode 为空 → 首挂
   ▼ patch(n1 = null, n2 = 组件 vnode)
   │   shapeFlag 分派
   ▼ processComponent → mountComponent     runtime-core.js
   │   createComponentInstance 建实例
   │   setupComponent：initProps → setup() → handleSetupResult / finishComponentSetup
   ▼ setupRenderEffect                     runtime-core.js
   │   effect(componentUpdateFn, { scheduler: queueJob })
   │   首跑进挂载分支
   ▼ renderComponentRoot → subTree
   │   编译产物展开后的 VNode 树
   ▼ patch(null, subTree) → mountElement   runtime-core.js
   │   createElement → patchProp → mountChildren（递归）→ insert
   ▼ 真实 DOM 挂进容器，onMounted 钩子入队
```

分步实例走读（对象是 demo-mount 的 App；输入是真实调用，输出为 lib 实际运行产物）：

**步骤① createVNode + render 入口**

输入（demo 真实调用，加载即执行）：

> 示意片段（无配套脚本）

```js
M.createApp(App).mount(box)   // box = <div id="app">
```

输出：`box._vnode` 挂上根组件 vnode（`type` 为 App、`shapeFlag` 含 STATEFUL_COMPONENT）；render 检查 `container._vnode` 为空 → 走首挂 `patch(null, 组件 vnode)`。

**步骤② mountComponent：实例化**

输入：App 的 setup 返回 `{ count, double: computed(() => …), title }`（全是 ref / computed）。输出（`instance.setupState` 经 proxyRefs 解包后的真实读取结果——模板里读 `ctx.count` 拿到的就是数字）：

> 示意片段（无配套脚本）

```json
{ "count": 0, "double": 0, "title": "标题 A" }
```

**步骤③ setupRenderEffect：产出 subTree**

输出（`instance.subTree` 真实产物；JSON 略去空白文本节点，NokeyList 的子树与 KeyedList 同构但 li 无 key 字段，以 `…` 代）：

> 示意片段（无配套脚本）

```json
{
  "tag": "div",
  "patchFlag": 0,
  "children": [
    {
      "tag": "section", "patchFlag": 1,
      "children": [
        { "tag": "h3", "patchFlag": 0, "children": "任务列表（静态标题：编译时提升）", "el": "<h3> …" },
        { "tag": "p", "patchFlag": 1, "children": "count = 0，double = 0，title = 标题 A", "el": "<p data-role=\"count\"> …" }
      ],
      "el": "<section class=\"app-head\">"
    },
    {
      "component": "KeyedList",
      "subTree": {
        "tag": "section", "patchFlag": 0,
        "children": [
          { "tag": "h4", "patchFlag": 0, "children": "有 key 列表（key = id，按 key 配对）", "el": "<h4> …" },
          { "tag": "ul", "patchFlag": 0, "children": [
            { "tag": "li", "key": 1, "patchFlag": 0, "children": "#1 a", "el": "<li> …" },
            { "tag": "li", "key": 2, "patchFlag": 0, "children": "#2 b", "el": "<li> …" },
            { "tag": "li", "key": 3, "patchFlag": 0, "children": "#3 c", "el": "<li> …" }
          ], "el": "<ul>" }
        ],
        "el": "<section class=\"list-block\">"
      }
    },
    { "component": "NokeyList", "subTree": "…（同构，li 无 key 字段）" },
    {
      "component": "Mid",
      "subTree": {
        "component": "Leaf",
        "subTree": {
          "tag": "div", "patchFlag": 0,
          "children": [
            { "tag": "span", "patchFlag": 0, "children": "theme = 亮色（Leaf 读 .value 建立依赖）", "el": "<span> …" },
            { "tag": "button", "patchFlag": 0, "children": "切换主题", "el": "<button> …" }
          ],
          "el": "<div class=\"theme-bar\">"
        }
      }
    }
  ],
  "el": "<div class=\"app\">"
}
```

每个元素节点已带上 `el`（挂完后指向真实 DOM）；组件 vnode 没有 el，`subTree` 字段才是它的渲染结果——demo 左栏就是这棵树的可读版本，Mid → Leaf 也演示了子组件递归挂载与 provide / inject 原型链。

**步骤④ mountElement：VNode → DOM**

输出（宿主操作序列真实留痕，节选——`…` 处为 KeyedList / NokeyList 各自的同构段落）：

```
createElement div                          ← subTree 根（div.app）
patchProp <div> class: null → "app"
createElement section                      ← 编译产物第一段
patchProp <section> class: null → "app-head"
createElement h3
setElementText <h3> ← "任务列表（静态标题：编译时提升）"
createElement p
patchProp <p> data-role: null → "count"
setElementText <p data-role="count"> ← "count = 0，double = 0，title = 标题 A"
insert <section class="app-head"> → <div class="app">（末尾）
  …（KeyedList：section → h4 → ul → li ×3，自底向上逐层 insert）
  …（NokeyList：同构一段）
createElement div                          ← Leaf 的主题条
setElementText <span> ← "theme = 亮色（Leaf 读 .value 建立依赖）"
patchProp <button> onClick: null → undefined
insert <div class="theme-bar"> → <div class="app">（末尾）
insert <div class="app"> → <div>（末尾）   ← 根元素最后才进容器
```

对照规律：一个 `h(...)` = 一次 `createElement`；文本孩子走 `setElementText`；属性走 `patchProp`；子树建完才整棵 `insert` 进容器。挂载完成后 onMounted 钩子统一入队执行（demo 的「挂载状态」栏显示 Leaf onMounted）。

关键函数摘录：`h` / `createVNode` 见 4.2 节；shapeFlag 落位与 `patch` 分派见 4.3 节；`setupComponent` / `setupStatefulComponent`（实例化与 setup）见 4.4 节；`setupRenderEffect`（渲染 effect 的挂载 / 更新双分支）与 nodeOps / `patchProp` 见 4.5 / 4.1 节；`mountComponent` 与钩子触发时机见 4.7 节；`provide` / `inject`（主题条原型链）见 4.9 节。

断点建议：

- 断在 `mount`（createAppAPI 内）：看 container._vnode 为空，走 patch(null, …)
- 断在 `setupComponent`：看 setupState 建好、proxyRefs 解包前后的差异
- 断在 `componentUpdateFn` 挂载分支：单步进 `patch(null, subTree)`，看 mountElement 逐层递归
- 对照页面左栏 VNode 树：每个 `h(...)` 节点对应一次 createElement / insert

demo 入口：`./code/vue3/mini-vue/demo/demo-mount.html`

### 5.4 更新链路：set → trigger → 批处理调度 → diff

对应 demo：`demo-diff.html`——有 key 列表（删首项 / 删中间 / 追加 / 重置），「同一 tick 连删 3 项」按钮演示批处理（渲染次数只 +1，最终值一致）。

```
组件内按钮 / 页面操作（同一 tick 可多次）
   │
   ▼ createSetter（set 陷阱）              reactivity.js
   │   Reflect.set → 值变化 → trigger
   ▼ trigger
   │   渲染 effect 带 scheduler
   ▼ queueJob(job)                        runtime-core.js
   │   queue.includes 去重 → Promise.resolve().then(queueFlush)
   ▼ flushJobs（微任务）                    runtime-core.js
   │   统一执行 → 渲染 effect 重跑
   ▼ componentUpdateFn 更新分支
   │   renderComponentRoot 拿新 subTree
   ▼ patch(n1 = 旧 subTree, n2 = 新 subTree)
   │   isSameVNodeType 同类型 → processElement
   ▼ patchElement → patchChildren          runtime-core.js
   │   静态节点（patchFlag=0）直接跳过
   ▼ patchKeyedChildren                    runtime-core.js
       头头同步 → 尾尾同步 → 有 key 中间段：
       旧 key→index 映射配对 → 复用不动 / 移动 / 新增 → 卸载多余旧节点
```

分步实例走读（对象是 demo-diff 的有 key 列表 `[a, b, c]`；输入是真实操作，输出为 lib 实际运行产物）：

**步骤① set → trigger：一次 shift 写了三格**

输入（demo「删首项」按钮的真实代码）：

> 示意片段（无配套脚本）

```js
todos.shift()   // reactive 数组 [a, b, c] → [b, c]
```

输出（真实留痕）：原生 shift 内部是「index 0 ← b、index 1 ← c、length 3 → 2」三次属性写入，每次都走 set 陷阱 → 值变了 → trigger，渲染 effect 的 scheduler 被叫 3 次。列表渲染 effect 的依赖正落在 index 0/1/2 与 length 这些键上（render 里 `.map` 逐项读时 track）。

**步骤② queueJob：3 次调用，1 个 job**

输出（真实计数）：`queueJob` 被调用 **3 次**，队列里始终只有 **1 个 job**（`queue.includes` 去重），微任务里 `flushJobs` 执行 **1 次**。批处理按钮「同一 tick 连删 3 项」更夸张：`queueJob` 被叫 **6 次**，去重后仍只 flush **1** 个 job——这就是渲染次数不随写入次数增长的全部机制。

**步骤③ 更新分支：新旧 children 对比**

输入（flush 时只发生一次 diff——旧 children 是上一轮 subTree 的 ul 孩子引用，新 children 是重跑 render 的产物；真实产物）：

> 示意片段（无配套脚本）

```json
{
  "旧 ul.children": [
    { "tag": "li", "key": 1, "children": "#1 a" },
    { "tag": "li", "key": 2, "children": "#2 b" },
    { "tag": "li", "key": 3, "children": "#3 c" }
  ],
  "新 ul.children": [
    { "tag": "li", "key": 2, "children": "#2 b" },
    { "tag": "li", "key": 3, "children": "#3 c" }
  ]
}
```

**步骤④ patchKeyedChildren：本例全程零移动**

对着实现手推这组输入（`i` 从头、`e1/e2` 从尾）：

```
① 头同步：c1[0](li, key=1) vs c2[0](li, key=2)   → 同类型但 key 不同 → break（i=0）
② 尾同步：c1[2](key=3) vs c2[1](key=3)           → 同 key → patch（文本没变，0 次 DOM 操作）
           c1[1](key=2) vs c2[0](key=2)          → 同 key → patch → 新列表耗尽（e2 越过头）
③ 判定：新列表已耗尽（i > e2）而旧列表还剩 li#1  → 走「旧多出来的全卸载」分支
④ unmount(li#1)
```

输出（宿主操作序列真实留痕——本次更新的全部 DOM 操作就这一条）：

```
remove <li> "#1 a"
```

最终 DOM（真实产物）：

```
<ul>
  <li>#2 b</li>
  <li>#3 c</li>
</ul>
```

有 key 的意义就在这：#2 / #3 的 DOM 节点被**原样复用**（文本对比相同，连 setText 都省了），消失的 #1 被**精确卸载**——不存在按下标错位、把 b/c 的内容写进别人节点这种事。

**批处理实测**（demo「同一 tick 连删 3 项」按钮，真实数据）：同步阶段 `todos.length` 已是 0，但列表 DOM 仍是 3 个 li（渲染 effect 还在队列里）；微任务 flush 后 `flushJobs` 执行 1 次，宿主操作一次性 `remove` 3 次，列表直接从 3 项变 0 项——中间状态从未出现在页面上。

关键函数摘录：`queueJob` / `queueFlush` / `flushJobs` / `nextTick` 见 4.5 节；`patchElement` / `patchChildren` / `patchKeyedChildren` 见 4.6 节；`trigger` 见 3.3 节。

断点建议：

- 断在 `queueJob`：同一 tick 连点 3 次「删首项」，看队列始终只有 1 个 job
- 断在 `flushJobs`：确认执行时机在微任务——nextTick 回调排在其后（页面按钮里用 `M.nextTick(refreshTree)` 刷新 VNode 树即此原理）
- 断在 `patchKeyedChildren` 头尾同步段：删首项时按 key 配对——5.4 步骤④的手推与 demo 实测一致：#2/#3 原地复用，全程零移动，只有 li#1 被精确卸载（宿主操作仅 1 次 remove）
- 无 key 列表的对照行为（按下标就地改写、内容错位）见 4.6 节末的两种列表对照——demo 只保留有 key 列表，专注看精确 diff

demo 入口：`./code/vue3/mini-vue/demo/demo-diff.html`

### 5.5 卸载链路：render(null) → unmount → effect.stop

对应 demo：`demo-unmount.html`——进页面自动挂载，「卸载应用」后点「卸载后改 count」：数据确实变了，但渲染区无任何变化（无变化即演示结果）；「重新挂载」是全新 setup、全新渲染 effect。

```
M.render(null, 容器)                     runtime-core.js（createRenderer 内）
   │   container._vnode 存在 → 卸载
   ▼ unmount(vnode, doRemove)            runtime-core.js
   │   shapeFlag 分派
   ▼ 组件分支（STATEFUL_COMPONENT）
   │   unmounted 钩子逐个同步执行
   │   update.effect.stop()              reactivity.js
   │   cleanupEffect 退订全部依赖
   ▼ unmount(subTree) 递归整棵树
   │   Fragment / 元素 → unmountChildren
   ▼ hostRemove(el)                      index.js nodeOps
       DOM 从容器摘除；container._vnode = null
       此后再写状态 → trigger 找不到订阅 → 渲染区无变化
```

分步实例走读（App 含一个 Child 子组件；输入是真实调用，输出为 lib 实际运行产物）：

**步骤① render(null)：卸载入口**

输入（demo「卸载应用」按钮的真实代码）：

> 示意片段（无配套脚本）

```js
M.render(null, box)   // box._vnode 存在 → unmount(box._vnode)，随后 box._vnode = null
```

**步骤② unmount 组件分支：钩子先于退订**

输出（真实钩子顺序——App 的钩子先执行，递归到 Child 才轮到它）：

```
App unmounted 钩子
Child unmounted 钩子
```

顺序是刻意安排的：先跑钩子再 `update.effect.stop()`——反了会内存泄漏（依赖还挂着、更新还会来）。

**步骤③ effect.stop：退订依赖**

输出（`describeDeps()` 卸载前后的真实对照）：

```
卸载前：  {"_value":0,"__v_isRef":true}  value → 1 个 effect
卸载后：  （空）
```

死写证据（真实产物）：卸载后把 `count.value = 99`——游离的 `<p>` 文本仍是 `"count = 0"`，渲染 effect 已 stop、不再重跑。demo 点「卸载后改 count」渲染区无任何变化，就是这一步的结果。

**步骤④ hostRemove：DOM 摘除**

输出（宿主操作序列真实留痕——孩子先摘，根最后摘）：

```
remove <p> "count = 0"
remove <p> "child 区域"
remove <div class="app">
```

容器子节点数 1 → 0（真实计数）；「重新挂载」= 全新 `createApp(App).mount`——全新 setup、全新渲染 effect，旧 effect 不会复活。

关键函数摘录：`unmount` / `mountComponent`（钩子触发时机）见 4.7 节；`cleanupEffect` / `stop` 见 3.4 节；`createRenderer` / `render` 与 nodeOps（`hostRemove`）见 4.1 节。

断点建议：

- 断在 `unmount` 组件分支：看 unmounted 钩子先执行、渲染 effect 后 stop 的顺序
- 断在 `cleanupEffect`：确认 effect 从 dep 里被移除
- 卸载后点「卸载后改 count」，在 `trigger` 里确认 depsMap 已空——这就是「无变化」的根源
- 点「重新挂载」再断 `setupComponent`：全新实例、全新 effect，与上一次挂载无任何共享

demo 入口：`./code/vue3/mini-vue/demo/demo-unmount.html`

## 配套代码

本篇配套在 `./code/vue3/mini-vue/` 下分成两层：`lib/` 是按 Vue3 源码包结构拆分的纯 JS 实现（零依赖、`<script>` 按序加载，全局暴露 `window.MiniVue`，全量 JSDoc 注释，文件头标了覆盖机制与建议断点），`demo/` 是 5 个分链路纯渲染页面（浏览器直接打开或起静态服务器访问，`F12 → Sources` 可随时断点）。

**实现文件**（加载顺序即依赖顺序：shared → reactivity / compiler-core → runtime-core → index）：

| 文件 | 内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-vue/lib/shared.js` | 类型判断工具与 `ShapeFlags` 位标记（对应 @vue/shared） | 4.3 shapeFlag |
| `./code/vue3/mini-vue/lib/reactivity.js` | `ReactiveEffect`（effect 栈 / cleanup）/ `track` / `trigger` / `reactive` / `readonly` / `ref` / `proxyRefs` / `computed` / `watch`（对应 @vue/reactivity） | 3.1~3.10 |
| `./code/vue3/mini-vue/lib/compiler-core.js` | `parse` → `transform` → `generate` → `compile`（对应 @vue/compiler-core） | 二、编译原理 |
| `./code/vue3/mini-vue/lib/runtime-core.js` | VNode / patch 分发 / keyed diff / 组件实例 / 渲染 effect / 调度器 / 生命周期 / props / provide-inject（对应 @vue/runtime-core） | 4.2~4.9 |
| `./code/vue3/mini-vue/lib/index.js` | 浏览器宿主 `nodeOps` / `patchProp` + `createRenderer` 装配 + `window.MiniVue` 聚合（对应 @vue/runtime-dom） | 4.1 · 全篇入口 |

**交互 demo**（每条链路一页，纯渲染演示：加载即渲染，只保留必要的交互按钮与渲染区，无日志无探针；时序与复用等教学点由「五、关键执行链路」的文字与代码摘录承担）：

| demo | 交互内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-vue/demo/demo-compiler.html` | 编辑模板实时产出 AST / 静态标记 / render 代码三份产物 | 2.2 · 2.3 · 5.1 |
| `./code/vue3/mini-vue/demo/demo-reactivity.html` | ref / reactive 深层属性 / computed 缓存读数 / watch 建立与 stop，四行 effect 驱动数值 | 3.1~3.9 · 5.2 |
| `./code/vue3/mini-vue/demo/demo-mount.html` | 编译产物装配成组件挂进 `<div id="app">`，VNode 树与真实 DOM 左右对照 + provide/inject 主题条 | 4.2~4.5 · 4.9 · 5.3 |
| `./code/vue3/mini-vue/demo/demo-diff.html` | 有 key 列表 diff（删首项 / 删中间 / 追加 / 重置）+ 同一 tick 连删 3 项批处理读数 | 4.5~4.6 · 5.4 |
| `./code/vue3/mini-vue/demo/demo-unmount.html` | 卸载 → onUnmounted → effect.stop，卸载后改 count 渲染区无任何变化，支持重挂 | 4.7 · 5.5 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[React 高级与原理](../react/React%20高级与原理.md)
- 下一篇：[Vue3 状态管理原理与实现](./Vue3%20状态管理原理与实现.md)
