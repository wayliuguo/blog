# Vue3 原理

> 本篇所有 `摘自` 代码块来自配套的可断点实现 `code/vue3/mini-vue/lib/`——按 Vue3 源码包结构分层拆分（`shared.js` → `reactivity.js` / `compiler-core.js` → `runtime-core.js` → `index.js`，纯 JS 零依赖，`<script>` 按序加载后经 `window.MiniVue` 统一使用，全量 JSDoc 注释）。正文每讲一个机制，就落到对应文件的函数上解析一次；3 个模块 demo 见 `code/vue3/mini-vue/demo/`（编译 / 响应式 / 整体运行各一页，整体运行的 demo-app 按 Vue 官网 CDN 的方式在 `<div id="app">` 里直接写模板），与篇末「五、关键执行链路」一章逐节对齐，章节对照与断点建议见篇末「配套代码」。

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
    render(ctx) ─────────────► VNode 树（交给运行时 patch）  〔详见 4.2〕
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
            // 指令提取：v-for="item in list" 不是 DOM 属性，从 attrs 摘出来挂到节点上
            // （generate 阶段据此把该节点展开成 ctx.列表.map(item => h(...))）
            if (node.attrs && node.attrs['v-for']) {
                const vm = /^\s*([a-zA-Z_$][\w$]*)\s+(?:in|of)\s+([a-zA-Z_$][\w$]*)\s*$/.exec(node.attrs['v-for'])
                if (!vm) throw new Error('v-for 暂只支持「item in list」形式：' + node.attrs['v-for'])
                node.vFor = { item: vm[1], list: vm[2] }
                delete node.attrs['v-for']
                if (!Object.keys(node.attrs).length) node.attrs = null // 摘完就空 → 归 null（同"没有属性"）
            }
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

**generate：递归生成代码字符串**，每个节点对应一次 `h(...)` 调用；`@click`、`:key`、`v-for` 这些指令也在这一步落地——事件改写成 `onClick`、动态绑定改写成 `key: 表达式`、v-for 节点展开成 `列表.map(item => h(...))`：

> 摘自 `./code/vue3/mini-vue/lib/compiler-core.js`

```js
// —— 3. generate：AST → render 代码字符串 ——
/**
 * 把模板表达式改写成带 ctx 前缀的可执行表达式（generate 的公共步骤）。
 * 改写规则（自上而下）：
 *   1. 循环变量（scope 集合里的名字）→ 保持裸引用（v-for 的 item 属于本次 map 的局部变量）；
 *   2. 字面量 / 保留字 → 原样保留；
 *   3. 前一个非空白字符是 "." → 保持裸引用（属性访问的尾部，如 t.id 的 id）；
 *   4. 其余裸标识符 → 加 ctx. 前缀（组件状态经实例代理访问，ref 自动解包）。
 * 对「单个标识符」这类简单表达式，改写结果与旧版 `ctx.表达式` 拼接完全一致，
 * 因此不改变既有模板的编译产物。
 *
 * @param {string} expr - 模板里的表达式原文（如 'count'、't.id'、'count++'）
 * @param {Set<string>} scope - 当前可见的循环变量集合（无 v-for 时为空集）
 * @returns {string} 可执行表达式（裸标识符已挂到 ctx 上）
 *
 * @example
 *   rewriteExpr('count', new Set())        // → 'ctx.count'
 *   rewriteExpr('t.id', new Set(['t']))    // → 't.id'（t 在作用域、id 是成员）
 *   rewriteExpr('count++', new Set())      // → 'ctx.count++'
 */
function rewriteExpr(expr, scope) {
    return expr.replace(/[a-zA-Z_$][\w$]*/g, (name, offset, full) => {
        if (scope.has(name)) return name
        if (name === 'true' || name === 'false' || name === 'null' || name === 'undefined') return name
        let i = offset - 1
        while (i >= 0 && full[i] === ' ') i-- // 回看前一个非空白字符
        if (full[i] === '.') return name // 成员访问尾部：t.id 的 id
        return `ctx.${name}`
    })
}

/**
 * 把 attrs 对象生成 props 参数代码。
 * 三类属性分流：普通属性 → JSON 字面量片段；@事件 → `onClick: () => 表达式`；
 * :绑定 → `key: 表达式`。全是普通属性时直接 JSON.stringify（与旧产物格式一致），
 * 混有指令时手动拼对象字面量。
 *
 * @param {Object|null} attrs - parse 产出的属性表（指令值仍是表达式原文）
 * @param {Set<string>} scope - 循环变量作用域（改写表达式用）
 * @returns {string} props 代码，形如 `{"class":"x"}` 或 `{":key 已改写": ..., onClick: ...}`
 *
 * @example
 *   genProps({ class: 'x' }, new Set()) // → '{"class":"x"}'
 *   genProps({ '@click': 'inc' }, new Set()) // → '{onClick: () => ctx.inc()}'
 *   genProps({ ':key': 't.id' }, new Set(['t'])) // → '{key: t.id}'
 */
function genProps(attrs, scope) {
    if (!attrs) return 'null'
    const statics = {}
    const dynamics = []
    for (const [key, value] of Object.entries(attrs)) {
        if (/^@|^v-on:/.test(key)) {
            // 事件：@click / v-on:click → onClick。裸方法名补调用括号（@click="inc"），
            // 其余表达式（如 count++）包一层括号直接作为函数体
            const raw = key.replace(/^@|^v-on:/, '')
            const name = 'on' + raw[0].toUpperCase() + raw.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
            const rewritten = rewriteExpr(String(value), scope)
            const handler = /^[a-zA-Z_$][\w$]*$/.test(String(value).trim()) ? `() => ${rewritten}()` : `() => (${rewritten})`
            dynamics.push(`${name}: ${handler}`)
        } else if (/^:|^v-bind:/.test(key)) {
            // 动态绑定：:key / v-bind:key → 属性名: 改写后的表达式
            const raw = key.replace(/^:|^v-bind:/, '')
            dynamics.push(`${raw}: ${rewriteExpr(String(value), scope)}`)
        } else {
            statics[key] = value
        }
    }
    if (!dynamics.length) return JSON.stringify(statics)
    const head = Object.keys(statics).length ? `${JSON.stringify(statics).slice(1, -1)}, ` : ''
    return `{${head}${dynamics.join(', ')}}`
}

/**
 * 把标记完的 AST 生成为 render 函数体代码（顶层是一个 VNode 数组字面量）。
 *
 * genNode 按节点类型分派：
 *   - Text          → JSON.stringify 出带引号的字符串字面量（拼进代码里就是合法 JS）
 *   - Interpolation → `toDisplayString(改写后的表达式)`（运行时由传入的函数解析显示）
 *   - Element       → `h("tag", props, children, patchFlag)`，children 有三种形态：
 *       a) 单个文本/插值孩子 → 直接是字符串表达式（运行时 shapeFlag 落 TEXT_CHILDREN）
 *       b) 全是文本+插值混合 → 用 + 拼成一个字符串表达式（同真实 Vue 的文本拼接产物）
 *       c) 含元素孩子       → 数组字面量（运行时 shapeFlag 落 ARRAY_CHILDREN）
 *   - v-for 元素    → `...ctx.列表.map(item => h(...))`，item 进子表达式作用域
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
 *   const ast3 = parse('<ul><li v-for="t in ts" :key="t.id">{{ t.text }}</li></ul>'); transform(ast3)
 *   generate(ast3)
 *   // → '[h("ul", null, [...ctx.ts.map(t => h("li", {key: t.id}, toDisplayString(t.text), 1))])]'
 */
function generate(ast) {
    /**
     * 递归生成一个节点的代码片段。
     *
     * @param {Object} node - AST 节点
     * @param {Set<string>} scope - 当前可见的循环变量集合（顶层为空集）
     * @returns {string} 该节点对应的 JS 表达式
     */
    function genNode(node, scope = new Set()) {
        if (node.type === 'Text') return JSON.stringify(node.content) // 字符串字面量自带引号
        if (node.type === 'Interpolation') return `toDisplayString(${rewriteExpr(node.expression, scope)})`
        // v-for：当前节点展开成 map 回调，循环变量加入子表达式作用域
        // （回调内部再生成的表达式里，item 走裸引用、组件状态走 ctx.）
        if (node.vFor) {
            const inner = { ...node, vFor: null }
            const body = genNode(inner, new Set([...scope, node.vFor.item]))
            return `...ctx.${node.vFor.list}.map(${node.vFor.item} => ${body})`
        }
        const flag = node.patchFlag ? `, ${node.patchFlag}` : '' // 静态节点不传 patchFlag
        const props = genProps(node.attrs, scope)
        const children = node.children
        // 单文本 / 单插值孩子：生成字符串 children（运行时 shapeFlag 会标 TEXT_CHILDREN）
        if (children.length === 1 && children[0].type !== 'Element') {
            return `h("${node.tag}", ${props}, ${genNode(children[0], scope)}${flag})`
        }
        // 孩子全是文本 / 插值的混合：拼成一个字符串表达式（同真实 Vue 的文本拼接产物）
        if (children.length && children.every(c => c.type === 'Text' || c.type === 'Interpolation')) {
            const expr = children
                .map(c => (c.type === 'Text' ? JSON.stringify(c.content) : `toDisplayString(${rewriteExpr(c.expression, scope)})`))
                .join(' + ')
            return `h("${node.tag}", ${props}, ${expr}${flag})`
        }
        return `h("${node.tag}", ${props}, [${children.map(c => genNode(c, scope)).join(', ')}]${flag})`
    }
    // 顶层包成数组：与运行时 render 返回数组、normalizeVNode 归一的约定对齐
    return `[${ast.children.map(c => genNode(c)).join(', ')}]`
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

> 配套 `./code/vue3/mini-vue/lib/compiler-core.js` 就是这三个阶段的最小实现（全量 JSDoc，可直接逐函数断点）；`mini-vue/demo/demo-compiler.html` 提供模板输入框（含预置示例），可实时看到 AST / 标记 / render 代码三份产物（纯产物展示，实际挂载与整体运行见 demo-app）。

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
        // v-for 列表每次渲染都产出新数组，永远是动态节点（哪怕子树全是静态内容）
        if (node.vFor) hasDynamic = true
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
- **标记落到 VNode 上**：generate 把 `patchFlag` 写进 render 代码的第 4 个参数，`h("p", null, toDisplayString(count), 1)`；运行时 `createVNode` 把它存到 `vnode.patchFlag`，diff 时据此决定对比策略（见 4.1 的 `h` 实现）。

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

> 示意片段（无配套脚本）

```
        root.count++（数据变更）
             │ 4.5 响应式 + effect 调度：trigger → scheduler → 重跑 render
             ▼
        render() ◄──── 4.3 组件挂载：组件负责产出 VNode（render 包进 effect）
             ▼
         VNode 树 ◄──── 4.1 VNode：中间描述层（type/children/shapeFlag…）
             ▼
           patch ◄───── 4.2 patch：调度中枢，挂载 / 更新统一从这里分发
             ▼
         真实 DOM ◄──── 4.4 元素挂载：只有元素 / 文本 VNode 落成 DOM
```

心智模型一句话：**VNode 是中间描述层，patch 统一分发挂载与更新；组件负责产出 VNode，元素 VNode 映射真实 DOM，响应式副作用驱动 render 重执行——数据驱动视图。** 4.1~4.5 按这张图各讲一环；实测运行数据集中在 5.3。

### 4.1 VNode：数据的基石

#### 4.1.1 定义、结构与类型

**定义**：VNode（虚拟节点）就是一个普通的 JS 对象，描述"真实节点长什么样"。

**意义**：它是中间描述层——组件产出它、patch 消费它、DOM 由它映射。有了这一层，"改数据"和"动 DOM"彻底解耦，diff 与复用也有了操作单位。

**结构**——五种类型的产出示例（示意，无配套脚本）：

```js
// ① 元素 VNode（type 是字符串）——字段最全的一种
h('p', null, 'hi')
{
    type: 'p',          // 节点类型：字符串 = 元素标签名
    props: null,        // 属性（class / style / onClick / key 等）
    children: 'hi',     // 孩子：字符串（文本）或 VNode 数组
    shapeFlag: 5,       // 形状位标记：1(元素) | 4(文本孩子)——4.1.2 详解
    key: null,          // diff 配对用的标识
    el: null,           // 对应的真实 DOM（挂载后回填）
    component: null     // 组件 VNode 才有：指向组件实例
}

// ② 组件 VNode（type 是对象）——createApp(App) 的根 VNode 就是这一种
h(App)
{ type: App, props: null, children: null, shapeFlag: 2, el: null, component: null }
//                                         ↑ STATEFUL_COMPONENT    ↑ 挂载后指向组件实例（4.3）

// ③ 文本 VNode（type 是特殊符号 Text）——文本孩子由 createTextVNode 包装
{ type: Text, props: null, children: 'hi', shapeFlag: 4, el: null }

// ④ 注释 VNode（type 是特殊符号 Comment）——渲染 null / false 时的占位（createCommentVNode）
{ type: Comment, props: null, children: '', shapeFlag: 4, el: null }

// ⑤ Fragment VNode（type 是特殊符号 Fragment）——多个根节点的包装
{ type: Fragment, props: null, children: [vnode1, vnode2, vnode3, vnode4], shapeFlag: 8, el: null }
//                               demo-app 模板的 4 个顶层节点            ↑ 只做首尾锚点，自身不落 DOM
```

**类型**五种，靠 type 的"长相"区分：

| 类型 | type 是什么 | 典型来源 |
| --- | --- | --- |
| 元素 | 字符串标签名（'p' / 'div'） | 模板里的标签、`h('p', …)` |
| 组件 | 对象（含 setup / render） | `createApp(App)` 的根 VNode（4.3） |
| 文本 | 特殊符号 `Text` | 文本孩子由 `createTextVNode` 包装 |
| 注释 | 特殊符号 `Comment` | `createCommentVNode`（占位节点） |
| Fragment | 特殊符号 `Fragment` | 多个根节点的包装（demo-app 的 4 个顶层节点） |

元素与组件靠 shapeFlag 位标记分发（4.2）；文本 / 注释的 shapeFlag 虽也登记（③④ 都是 4），但 patch 分发先按 type 特殊符号命中，轮不到位判断；Fragment 自身不落 DOM，只提供首尾锚点。

#### 4.1.2 shapeFlag：一个数字带多个特征

**为什么**：一个 VNode 可能同时是"元素 + 数组孩子"，普通枚举一个数字只能表达一种特征；位标记把每种特征放进独立的二进制位，一个数字就能同时携带多个特征。

**常量定义**——五个特征各占一个二进制位：

> 摘自 `./code/vue3/mini-vue/lib/shared.js`

```js
const ShapeFlags = {
    ELEMENT: 1, // 0001 —— 普通 DOM 元素（type 是字符串标签名）
    STATEFUL_COMPONENT: 1 << 1, // 0010 —— 有状态组件（type 是对象，含 setup/render）
    TEXT_CHILDREN: 1 << 2, // 0100 —— 孩子是一个字符串（纯文本）
    ARRAY_CHILDREN: 1 << 3, // 1000 —— 孩子是 VNode 数组
    SLOTS_CHILDREN: 1 << 4 // 0001 0000 —— 孩子是插槽对象 { default: () => [...] }
}
```

先用 0001 / 1000 这类四位二进制把两个运算符的语法讲清（示意，无配套脚本）：

> 示意片段（无配套脚本）

```
| 按位或：两数对齐，任一位是 1，结果位就是 1 —— 用来「叠加」
  0001 | 1000 = 1001

& 按位与：两数对齐，两位都是 1，结果位才是 1 —— 用来「查询」
  1001 & 1000 = 1000  → 非 0：这一位在
  1001 & 0100 = 0000  → 为 0：这一位不在
```

放到 shapeFlag 上就是两个动作：**写入用 `|=`（叠加登记特征），读取用 `&`（判断该进哪条逻辑）**。全库位置固定——

**写入（`|=`，只在 `createBaseVNode` 里，见 4.1.3）**，两轮共 5 处：

- 第一轮看 type：字符串 → `|= ELEMENT`；对象 → `|= STATEFUL_COMPONENT`
- 第二轮看 children：字符串 → `|= TEXT_CHILDREN`；数组 → `|= ARRAY_CHILDREN`；对象 → `|= SLOTS_CHILDREN`

（文本 VNode 在 `createTextVNode` 里直接把 shapeFlag 赋成 TEXT_CHILDREN，同属写入。）

**读取（`&`，散在各分发点）**，`shapeFlag & XXX` 就是问"**XXX 这一位是 1 吗**"——非 0 为真进入该逻辑，为 0 跳过：

| 读取点 | 判断 | 命中后进入 |
| --- | --- | --- |
| patch 分发（4.2） | `& ELEMENT` / `& STATEFUL_COMPONENT` | processElement / processComponent |
| mountElement 分孩子（4.4） | `& TEXT_CHILDREN` / `& ARRAY_CHILDREN` | 一次性写文本 / 逐个 mountChildren |
| patchElement 分孩子（更新，lib） | `& TEXT_CHILDREN` / `& ARRAY_CHILDREN` | 改文本 / patchChildren |
| unmount（4.2） | `& STATEFUL_COMPONENT` / `& ARRAY_CHILDREN` | 递归卸载组件子树 / 逐个卸载孩子 |

一个数字带多个特征的价值就在这：建好一次，沿途每个分发点各取所需——挂载看"自己是什么"，孩子处理看"孩子是什么"，更新、卸载再看一遍，互不干扰。

#### 4.1.3 h 函数：VNode 的产出

`h` 转发给 `createVNode`，公共底座 `createBaseVNode` 组装对象，把 4.1.2 的「写入」规则落到代码——两轮判断（自己是什么 / 孩子是什么）：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
const h = (type, props, children, patchFlag) => {
    const vnode = createVNode(type, props, children)
    if (patchFlag) vnode.patchFlag = patchFlag
    return vnode
}
```

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
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
    } else if (isObject(children)) vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN

    return vnode
}
```

```
h → createVNode → createBaseVNode(type, props, children)
  输入: 节点类型（字符串=元素 / 对象=组件）、属性、孩子
  输出: VNode 普通对象（type/props/children/shapeFlag/key/el/component）
  过程: 两轮位标记——type 定"自己是什么"，children 定"孩子是什么"，落在同一个 shapeFlag 上
```

断点建议：断在 `createBaseVNode`——看根组件 VNode 的 shapeFlag 落位（STATEFUL_COMPONENT=2）。

### 4.2 patch：运行时的调度中枢

#### 4.2.1 定位：挂载与更新复用同一个函数

**定位**：patch 是运行时的调度中枢——挂载和更新都从它走，区分手段只有一个——**n1（旧 VNode）是否为空**。

**首次挂载**：`createApp().mount('#app')` 走到 `render(vnode, container)`，容器上一帧为空 → `patch(null, vnode, container)`。

**更新**：数据变化后组件重新 render → `patch(prevVNode, nextVNode, container)`（4.5 闭环的终点）。

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    function render(vnode, container) {
        if (vnode == null) {
            if (container._vnode) unmount(container._vnode, true)
        } else {
            // 顶层也允许直接给数组 / 字符串：统一成 VNode 再进 patch
            vnode = normalizeVNode(vnode)
            patch(container._vnode || null, vnode, container, null)
        }
        container._vnode = vnode
    }
```

```
render(vnode, container)
  输入: 本帧 VNode（null 表示卸载上一帧整棵树）+ 容器
  输出: void（副作用：DOM 落进容器，container._vnode 记住本帧）
  过程: 上一帧为空 → patch(null, vnode) 挂载；有上一帧 → patch(prev, next) 更新；vnode=null → unmount 卸载
```

#### 4.2.2 patch 分发器：组件、元素、文本、Fragment

四个参数贯穿整个调度——后面每个 `processXxx` / `mountXxx` 的签名都是它们：

| 参数 | 作用 |
| --- | --- |
| `n1` | 旧 VNode——`null` 表示这一层首次挂载；有值表示更新 |
| `n2` | 新 VNode——本次要落到 DOM 的目标，type / shapeFlag 都从它身上取 |
| `container` | 宿主容器——挂载时新节点插进它，更新时在它里面原地改 |
| `anchor` | 插入锚点——新节点插到它**之前**（null = 追加到末尾）；Fragment 定界、节点替换重建都靠它定位 |

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
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

**首次执行命中路径**：`patch(null, rootVNode, '#app', null)`——n1 为 null 直通 switch，type 是组件对象，落 default 分支的 STATEFUL_COMPONENT → processComponent。

| 分支 | 挂载（n1 = null） | 更新（n1 有值） |
| --- | --- | --- |
| `processText` / `processComment` | 建文本 / 注释节点插入容器 | 复用旧节点改内容 |
| `processFragment` | 建首尾锚点 + 逐孩子挂载 | 递归孩子 + 锚点更新 |
| `processElement` | mountElement（4.4） | patchElement（lib） |
| `processComponent` | mountComponent（4.3） | updateComponent（lib） |

```
patch(n1, n2, container, anchor)
  输入: 旧 VNode（null=挂载）+ 新 VNode + 容器 + 锚点
  输出: 分发到对应 processXxx（Text/Comment/Fragment/Element/Component 五条）
  过程: n1 存在但 type/key 对不上 → 记锚点、unmount 旧的、n1 置 null 走全新挂载（完整函数见 lib）
```

#### 4.2.3 递归与卸载

**递归——树是怎么走完的**：patch 本身只做一件事——看一眼 n2 是什么类型，转发给对应处理器，它不处理孩子。孩子由各处理器再交回 patch，如此往复。拿 demo-app 首挂的真实递归链走一遍（示意，无配套脚本）：

```
patch(null, AppVNode, '#app', null)
  └ processComponent → mountComponent → setupRenderEffect 执行 render()
      └ patch(null, subTree(Fragment), '#app')          ← 又回到 patch！
          └ processFragment → 建首尾锚点 → 逐个孩子
              ├ patch(null, pVNode) ──── processElement → mountElement
              │                             └ 文本孩子：hostSetElementText('hi')
              ├ patch(null, buttonVNode) ─ processElement → mountElement …
              └ patch(null, ulVNode) ──── processElement → mountElement
                    └ mountChildren：每个 li 再 patch(null, liVNode) ── processElement …
```

一句话：**patch 负责"分发"，processXxx 负责"处理本层 + 把孩子交回 patch"**——一进一出，整棵树走完。每次深入孩子层，container 也随之变化（孩子的容器是父元素的 el）。

**卸载——挂载递归的逆过程**：三个入口最终都调 unmount——① `app.unmount()`；② `render(null, container)`；③ 4.2.2 里 type/key 对不上时的"拆掉重建"。它做的事与挂载相反：组件先跑 unmounted 钩子、停渲染 effect（不停的话依赖还在，数据一变还会触发已卸载组件的更新——内存泄漏），元素先递归卸载孩子再摘自己，Fragment 逐个摘孩子最后摘首尾锚点：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
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
unmount(vnode, doRemove)
  输入: 要卸载的 VNode + 是否从 DOM 摘除
  输出: void（副作用：DOM 节点摘除、组件 effect 停止、unmounted 钩子执行）
  过程: 按 type/shapeFlag 三分支——Fragment 摘孩子+锚点 / 组件停 effect+递归 subTree / 元素递归孩子+摘自己
```

断点建议：断在 `unmount` 点「卸载」按钮——看 App 组件分支进来后递归 subTree 的三分支次序。

### 4.3 组件挂载：从组件到子 VNode

#### 4.3.1 挂载链条：processComponent → mountComponent

接 4.2 的命中：`processComponent`（n1 为 null）→ `mountComponent`。完整链条六步：

> 示意片段（无配套脚本）

```
processComponent（n1 = null）
  ▼
① 创建组件实例 createComponentInstance
  ▼
② 执行 setup（setupComponent）→ 返回值经 proxyRefs 落定 setupState
  ▼
③ 获取 render 函数（组件自带 / finishComponentSetup 兜底）
  ▼
④ 把 render 包进 effect（setupRenderEffect → instance.update）
  ▼
⑤ 执行 render() 产出子 VNode（subTree = renderComponentRoot(instance)）
  ▼
⑥ 对子 VNode 执行 patch(null, subTree) → 进入元素挂载流程（4.4）
```

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    function processComponent(n1, n2, container, anchor) {
        if (!n1) mountComponent(n2, container, anchor)
        else updateComponent(n1, n2)
    }
```

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    function mountComponent(initialVNode, container, anchor) {
        // parent 从 currentScopeInstance 取：组件更新 patch 子树时，它就是当前组件实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode, currentScopeInstance))
        setupComponent(instance)
        setupRenderEffect(instance, initialVNode, container, anchor, patch)
        // 生命周期：首次渲染 effect 是同步执行的，走到这里子树已挂载完，统一调用挂载钩子
        if (instance.isMounted) instance.mounted.forEach(hook => hook())
    }
```

```
processComponent → mountComponent → setupComponent → setupRenderEffect
  输入: 组件 VNode + 容器 + 锚点
  输出: 组件实例（回填 vnode.component）+ instance.update（渲染 effect）+ 子树挂进容器
  过程: 建实例 → 跑 setup → render 包进 effect → effect 首跑同步产出 subTree → patch(null, subTree)
```

#### 4.3.2 组件实例：instance 的诞生与填充

**Component instance（组件实例）**——组件的上下文容器：组件的所有状态、方法、props、slots、渲染 effect 全挂在它身上，VNode 的 `component` 字段指向它（4.1.1 示意②里那个字段）。看它怎么诞生：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        type: vnode.type,
        parent, // 父组件实例：mountComponent 时从 currentScopeInstance 取（provide/inject 向上查找用）
        provides: parent ? parent.provides : {}, // 初始共享父的 provides，首次 provide 才建副本
        props: {},
        propsRaw: {},
        attrs: {},
        slots: {},
        setupState: {},
        ctx: {},
        isMounted: false,
        subTree: null,
        update: null,
        proxy: null,
        mounted: [], // 生命周期：onMounted 注册的回调，挂载完成后统一执行
        unmounted: [] // 生命周期：onUnmounted 注册的回调，卸载时统一执行
    }
    instance.ctx = { _: instance }
    // emit：把子组件的 this.$emit('change', 1) 转成父组件传下来的 onChange
    instance.emit = (event, ...args) => {
        const handler = (instance.vnode.props || {})[`on${event[0].toUpperCase()}${event.slice(1)}`]
        if (handler) handler(...args)
    }
    return instance
}
```

诞生时是个"空壳"（props/slots/setupState 全是空对象，update/subTree 还是 null），随后每一步往里填——这就是 instance 随函数流程的演变：

| 时刻 | 函数 | 填充的字段 |
| --- | --- | --- |
| 诞生 | createComponentInstance | 建空壳：vnode、parent、provides、ctx、emit、mounted/unmounted 数组 |
| 初始化 | setupComponent → initProps / initSlots | props、propsRaw、attrs、slots |
| 执行 setup | setupStatefulComponent | proxy（实例代理）、setupState（或直接 render） |
| 包 effect | setupRenderEffect | update（渲染 effect）、subTree、isMounted=true |

```
createComponentInstance(vnode, parent)
  输入: 组件 VNode + 父实例（从 currentScopeInstance 取）
  输出: 组件实例（空壳，回填到 vnode.component）
  过程: 建 15 个字段的对象字面量 + ctx（回指自身）+ emit（转发到父的 onXxx props）
```

#### 4.3.3 setupComponent：执行 setup

链条②③的落点。三步走：props → slots → 有状态组件的 setup：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function setupComponent(instance) {
    initProps(instance, instance.vnode.props)
    initSlots(instance, instance.vnode.children)
    setupStatefulComponent(instance)
}
```

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function setupStatefulComponent(instance) {
    // 先建代理：render 里的 this.xxx 就是从这里取的
    instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers(instance))

    const { setup } = instance.type
    if (setup) {
        currentInstance = instance
        try {
            const setupResult = setup(shallowReadonly(instance.props), {
                emit: instance.emit,
                slots: instance.slots
            })
            handleSetupResult(instance, setupResult)
        } finally {
            currentInstance = null
        }
    }
    finishComponentSetup(instance)
}
```

两个关键点：

- **currentInstance 窗口期**——调 setup 前指向本实例、finally 里清空，`onMounted` / `provide` 这些 API 就是在这个窗口里知道"该注册到谁身上"。
- **返回值二选一**——`handleSetupResult` 落定产物：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult // setup 直接返回 render 函数
    } else if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult) // 解包 ref，模板里不用写 .value
    }
}
```

render 里的 `this.count` 从哪取？就是刚才建的实例代理——取值顺序：setupState 最优先（ref 已解包）→ `$slots` / `$el` 特判 → props → ctx 兜底：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
const publicInstanceProxyHandlers = instance => ({
    get(target, key) {
        const { setupState, props } = instance
        if (key in setupState) return setupState[key] // setup 返回的（ref 已被解包）
        if (key === '$slots') return instance.slots
        if (key === '$el') return instance.vnode.el
        if (key in props) return props[key] // props 其次
        return target[key]
    },
```

setup 没给 render 的话，兜底从组件 options 里取：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function finishComponentSetup(instance) {
    if (!instance.render) instance.render = instance.type.render
}
```

```
setupComponent → initProps / initSlots / setupStatefulComponent
  输入: 组件实例（空壳）
  输出: 填好 props/slots/proxy/setupState（或 render）的实例
  过程: 初始化 props/slots → 建 proxy → currentInstance 窗口期里跑 setup() → 返回值落定为 render 或 setupState → 兜底 render
```

#### 4.3.4 setupRenderEffect：把 render 包进 effect

**effect（副作用）**——render 是一个副作用函数：执行时访问响应式数据就收集依赖（track），数据变更后重新执行 render 生成新 VNode，再走 patch 更新（闭环见 4.5）。链条④⑤的落点——render 被包进副作用函数，effect 首次执行是**同步**的，当场产出 subTree 并交回 patch（呼应 4.2.3 递归链的第二层）。`isMounted` 的 else 分支是更新路径：数据变化后重跑到这里，走 `patch(prevSubTree, nextSubTree)`（怎么触发的见 4.5）：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
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
```

生命周期钩子一句带过：`onMounted` / `onUnmounted` 把回调注册进实例数组，挂载钩子在 mountComponent 末尾统一执行，卸载钩子在 unmount 里先于 effect.stop 执行（4.2.3 已见）。

断点建议：断在 `setupStatefulComponent` 的 `setup(...)` 调用——看状态落定；断在 `componentUpdateFn` 挂载分支——单步进 `patch(null, subTree)`。

### 4.4 元素挂载：VNode → 真实 DOM

#### 4.4.1 定位与五步流程

**定位**：五种 VNode 里只有元素 / 文本会生成真实 DOM（组件 VNode 走 4.3，Fragment / 注释只是锚点辅助）。mountElement 五步：

> 示意片段（无配套脚本）

```
processElement（n1 = null）
  ▼ mountElement
① hostCreateElement(type) —— 浏览器宿主即 document.createElement
② vnode.el = 刚建的 DOM —— VNode 与真实节点互指
③ patchProp 逐个挂属性 / 事件（onClick → addEventListener）
④ 递归 patch 子节点 —— 文本一次性 setElementText；数组孩子逐个 patch(null, child)（在内存构建子 DOM 树）
⑤ hostInsert(el, container, anchor) —— 插入父容器（append / 指定位置）
```

#### 4.4.2 mountElement 落地

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    function processElement(n1, n2, container, anchor) {
        if (!n1) mountElement(n2, container, anchor)
        else patchElement(n1, n2, container, anchor)
    }

    function mountElement(vnode, container, anchor) {
        vnode.el = hostCreateElement(vnode.type)

        for (const [key, value] of Object.entries(vnode.props || {})) {
            if (key === 'key') continue // key 是 diff 配对用的，不是 DOM 属性
            hostPatchProp(vnode.el, key, null, value)
        }

        // 位运算分发孩子：文本 / 数组
        const { shapeFlag, children } = vnode
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) hostSetElementText(vnode.el, children)
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) mountChildren(children, vnode.el, null)

        hostInsert(vnode.el, container, anchor)
    }

    function mountChildren(children, container, anchor) {
        // 数组孩子逐个归一：允许混入字符串（真实 Vue 的 normalizeChildren 也做这一步）
        for (const child of children) patch(null, normalizeVNode(child), container, anchor)
    }
```

```
processElement → mountElement → mountChildren
  输入: 新元素 VNode（n1=null）+ 容器 + 锚点
  输出: void（副作用：真实 DOM 节点插入容器）
  过程: createElement 建节点 → 挂属性/事件 → 孩子在内存里构建完（递归 patch）→ 最后一步才 insert 进父容器
```

这些 `host*` 函数是谁、从哪来，见 4.4.3。注意 mountChildren 又调回了 patch——4.2 的调度中枢在这里递归接住每个孩子。

断点建议：断在 `mountElement`——看五步顺序；断在 `mountChildren`——确认孩子又回到 patch。

#### 4.4.3 宿主操作：runtime-core 与 DOM 的边界

mountElement 里的 `hostCreateElement` / `hostSetElementText` / `hostInsert` 不是 DOM API，而是 `createRenderer` 从 options 里解构重命名出来的**宿主操作**——runtime-core 只认这 9 个接口，不认识 `document`；"浏览器"这个平台由 index.js 注入实现，换一份实现（如字符串拼接）就是 SSR 雏形：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
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
    // ……内部闭包持有 patch 及其分发的全部逻辑，对外只暴露 render / createApp / patch / unmount
```

每个宿主函数"什么时候被调"由运行时流程决定——以元素 VNode 的处理为主线（对应 4.4.2 五步）：

> 示意片段（无配套脚本）

```
宿主函数的调用时机（runtime-core 调 → index.js 落地）

挂载（mountElement）   createElement 建元素节点 → patchProp 挂属性/事件
                       → setElementText 填元素文本 → insert 插入父容器（anchor 前或末尾）
更新（patchElement）   setText 改文本节点内容 → setElementText 换元素全部文本
                       → patchProp 增删改属性（新值 null 即移除）
卸载 / 换位            remove 摘节点 → nextSibling 找"原位置"锚点
锚点辅助               createText / createComment —— 文本与注释节点独立于元素存在
```

index.js 侧的实现（nodeOps）每个都是最薄的一层封装：

> 摘自 `./code/vue3/mini-vue/lib/index.js`

```js
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

第 9 个是 `patchProp`（属性/事件分派，见 4.4.2 的 ③）——与 nodeOps 一起经 `createRenderer({ ...nodeOps, patchProp })` 装配进渲染器。具体何时调用、以什么顺序调用，全部由 runtime-core 的 renderer 决定（4.4.2 五步、5.3 各操作的宿主留痕就是调用现场）。

### 4.5 响应式 + effect 调度：数据驱动视图的闭环

#### 4.5.1 关联点：渲染 effect 与 scheduler

三章讲过响应式本身（track / trigger），这里只讲它**和渲染的关联**——关联点就是 4.3 包住 render 的那个 effect。完整闭环：

> 示意片段（无配套脚本）

```
组件 render 读响应式数据（ctx.count）
  ▼ track：把渲染 effect 记为该数据的订阅者
数据变更（root.count++）
  ▼ trigger：找到订阅者 = 渲染 effect，但不直接执行——走 scheduler
queueJob：去重（同一组件多次触发只排一次）→ 微任务 flushJobs
  ▼
重跑 render() 产出新 VNode → patch(prev, next)（回到 4.2，闭环）
```

关联的落点只有一行——effect 的第二个参数 scheduler：数据变化触发更新时**不走 effect 的默认立即执行，而是走 scheduler 把 update 排队**：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
    // scheduler 是关键：数据变化不会立刻渲染，只把 update 排进微任务队列
    instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })
```

#### 4.5.2 调度器：queueJob / queueFlush / flushJobs

排队的三个函数——去重、排微任务、统一执行：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function queueJob(job) {
    if (!queue.includes(job)) queue.push(job) // 同一个 job 只排一次
    queueFlush()
}

function queueFlush() {
    if (isFlushPending) return
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
}

function flushJobs() {
    isFlushPending = false
    const jobs = queue.splice(0, queue.length) // 先取出快照，flush 过程中新加的留到下一轮
    for (const job of jobs) job()
    if (queue.length) flushJobs() // 组件有父子依赖时，执行中可能又推入新 job
}
```

```
trigger → scheduler → queueJob → queueFlush → flushJobs → componentUpdateFn 更新分支
  输入: 数据变更事件（可能同一 tick 内多次）
  输出: 微任务里统一重跑 render → patch(prev, next)
  过程: queue.includes 去重（5 次触发只留 1 个 job，实测见 5.3）→ resolvedPromise.then 排微任务 → 逐个执行 job
```

**nextTick：等下一轮渲染落定的官方姿势**。`queueFlush` 排微任务时把 flush 存进了 `currentFlushPromise`，`nextTick` 就是把回调挂它后面——它 resolve 时 flushJobs 必然已跑完，回调里读 DOM 拿到的必是新值；没有排队的更新就退化为 `resolvedPromise`（下个微任务立刻执行）：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
function nextTick(fn) {
    const promise = currentFlushPromise || resolvedPromise
    return fn ? promise.then(fn) : promise
}
```

```
nextTick(fn)
  输入: 回调 fn（可省，省略则返回 Promise 供 await）
  输出: 与本轮 flush 对齐的 Promise
  过程: 挂 currentFlushPromise 后面 → resolve 时 DOM 已更新；无排队更新则退化为 resolvedPromise
```

这就是"同步读 DOM 永远是旧值、`await nextTick()` 后才是新值"的出处——实测对照见 5.3.3。

#### 4.5.3 闭环：更新分支回到 patch

flushJobs 执行的 job 就是 4.3.3 `componentUpdateFn` 的更新分支——重跑 render 产出新子树，`patch(prev, next)` 回到 4.2：

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`

```js
        } else {
            const prevSubTree = instance.subTree
            const nextSubTree = (instance.subTree = renderComponentRoot(instance))
            patch(prevSubTree, nextSubTree, container, anchor)
        }
```

至此闭环：数据变更不手写任何 DOM 操作——trigger 找到渲染 effect、调度器排队、render 产出新 VNode、patch 做最小化更新，这就是"数据驱动视图"的全部。patch(prev, next) 之后的元素级 diff 细节（patchElement 属性比对、patchKeyedChildren 双端 + LIS）见 lib 完整函数，实测手推见 5.3.4。

断点建议：断在 `queueJob`——点「一次改三项」确认多次调用只排 1 个 job；断在 `flushJobs`——确认执行时机在微任务。

## 五、关键执行链路

前四章按「模块」讲函数，本章按「一次操作的调用顺序」把函数串成链路。每节一张 ASCII 链路图 + 分步实例走读（真实输入 / 输出数据块，产物为 lib 实际运行结果）+ 断点建议，与 `./code/vue3/mini-vue/demo/` 下的 3 个模块 demo 一一对应（demo 加载即渲染，交互按钮 + 渲染区，`F12 → Sources` 按函数名搜即可断点）。函数的完整 JSDoc 与逐字代码摘录都在前文对应小节，本章不重复贴码，只给「见 X.X 节」引用。
三条链路按数据形态衔接（模板串 → render 函数 → VNode 树 → 真实 DOM → 状态变更 → 新 VNode 树 → 最小 DOM 操作 → 销毁），其中③整体运行一条链串完挂载 → 更新 → 卸载：

```
① 编译              ② 响应式            ③ 整体运行（挂载 → 更新 → 卸载一条链）
demo-compiler       demo-reactivity     demo-app
─────────────       ─────────────       ─────────────────────────────────────────────
模板字符串            状态写入             mount('#app')
   │ parse             │ track(读)          │ 选择器 → 读 innerHTML 当模板 → compile（接①）
   ▼ AST               │ trigger(写)        │ setup 建状态 → setupRenderEffect 首跑
   │ transform         ▼                    ▼ patch(null, subTree) → mountElement
   ▼ 带标记的 AST        computed / watch       真实 DOM（组件内按钮走编译产物绑定的 onClick）
   │ generate                               │ 状态变更 → trigger → queueJob（去重）→ 微任务 flushJobs
   ▼ render 代码                             ▼ patch(prev, next)
   │ new Function                              patchElement（patchFlag=1 文本更新）
   ▼ render 函数 ─────▶ 交给运行时挂载           patchKeyedChildren（keyed diff + LIS 移动 / 新增 / 卸载）
                                            │ app.unmount()：unmounted 钩子 → effect.stop → 摘 DOM
                                            ▼ 死写不再触发渲染；重新加载页面即恢复
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
      │   依赖关系图建成                        ├─ 渲染 effect：有 scheduler → queueJob（见 4.5）
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

### 5.3 整体运行链路：mount('#app') → 挂载 → 更新 → 卸载

#### 5.3.1 挂载：createApp().mount('#app') 到 DOM 出现

```
主流程                                       mountComponent 内部（runtime-core.js，见 4.3）
──────────────────────────────────────────────────────────────────────
createApp(根组件对象)          index.js
  │ 输入 App = { setup() {...} }（组件对象 = 函数集合：setup / render；demo 的 App 只有 setup，render 由 mount 编译补上）
  │ 返回 app：{ mount, unmount }                ← unmount 是 5.3.6 的入口
  ▼
app.mount('#app')              index.js
  │ ① document.querySelector 解析选择器
  │ ② 取 innerHTML 当模板 → compile 产出编译 render（compiledRender，过程见 5.1）
  │    包成组件 render 挂到 App 上：rootComponent.render = ctx => ...
  │ ③ 清空容器 → 调工厂函数的 mount（runtime-core 闭包里那个）
  ▼
createVNode(rootComponent)     runtime-core.js
  │ 返回根 VNode：{ type: App 组件对象（内含 setup / 组件 render）, props: null,
  │                children: null, shapeFlag: 2, el: null, component: null }
  ▼
渲染器 render(rootVNode, container)   runtime-core.js
  │ 渲染入口：首帧无旧树 → patch(null, rootVNode)
  │ shapeFlag 分发（见 4.2）→ processComponent
  ▼
processComponent ──────────→  ① createComponentInstance   建实例空壳
                              │    instance = { vnode, type, parent, provides,
                              │      props:{}, propsRaw:{}, attrs:{}, slots:{}, setupState:{},
                              │      ctx:{ _:instance }, isMounted:false, subTree:null,
                              │      update:null, proxy:null, mounted:[], unmounted:[] }（+ emit）
                              ② setupComponent            初始化三步走（见 4.3.3）
                              │    ├ initProps            声明过的进 props，没声明的进 attrs
                              │    ├ initSlots            插槽对象归一
                              │    └ setupStatefulComponent ★ 重点
                              │        ① 建 instance.proxy（render 里 this 的取值：setupState 最优先）
                              │        ② currentInstance = instance 窗口期
                              │           → setupResult = setup(props, { emit, slots })
                              │        ③ handleSetupResult：返回对象 → setupState = proxyRefs(结果)
                              │           （ref 已解包）；返回函数 → 它就是 render
                              │        ④ finishComponentSetup：兜底从组件对象取 render
                              │           （demo 的编译 render 就在这一步落定）
                              ③ setupRenderEffect         组件 render 包进渲染 effect，首跑
                              │    └ subTree = renderComponentRoot(instance)
                              │       = normalizeVNode(render.call(proxy, proxy))
                              │       执行组件 render（编译 render 的包装，ctx = 实例代理）得到：
                              │       Fragment[ p"Hello vue!", p"count = 0", button"count + 1",
                              │                ul[ li#1 "#1 a", li#2 "#2 b", li#3 "#3 c" ] ]（完整结构见下方块）
                              ④ patch(null, subTree)      子树交回 patch（回到上行）
  ▼
processFragment → mountChildren   runtime-core.js
  ▼
mountElement ×4               runtime-core.js（见 4.4）
  │ createElement → patchProp → setElementText / addEventListener → insert
  ▼
真实 DOM 出现在 #app；onMounted 钩子统一入队执行
```

**createApp（index.js）**：

```
目的: 装配层工厂——接收根组件对象，返回 app { mount, unmount }
输入: App = { setup() {...} }（组件对象 = 函数集合：setup / render；demo 只有 setup，render 由 mount 编译补上）
输出: app（mount = 下面那个包装层；unmount = 卸载入口，见 5.3.6）
```

**app.mount（index.js 包装层）**：

```
目的: 浏览器平台专属的三件事——选择器解析 + in-DOM 模板编译（编译 render 包成组件 render）+ 清空容器
输入: '#app'（容器 innerHTML 即模板，4.1~4.5 讲解用的同一份）
输出: 转调工厂 mount 的返回值——root（组件实例代理，页面层 root.message 读写都经它）
```

**工厂 mount（runtime-core 闭包，createAppAPI 产物）**：

```
目的: 平台无关的真正渲染入口
输入: 根容器 el
过程: createVNode(rootComponent) → 渲染器 render(rootVNode, el) → patch(null, rootVNode)
输出: root（组件实例代理 = vnode.component.proxy）
```

**compile（compiler-core.js，过程详见 5.1）**：

```
输出: 编译 render（compiledRender）：4 个根 → mount 适配层多根包 Fragment（本例 4 个根 → Fragment）
      [h("p", null, toDisplayString(ctx.message), 1), h("p", null, "count = " + toDisplayString(ctx.count), 1), h("button", {onClick: () => ctx.increment()}, "count + 1"), h("ul", null, [...ctx.todos.map(t => h("li", {key: t.id}, "#" + toDisplayString(t.id) + " " + toDisplayString(t.text), 1))], 1)]
```

**createVNode（runtime-core.js）**：

```
目的: 由组件对象创建根 VNode（4.1）
输入: App（{ setup, render }；demo 的 render 由 mount 编译补上）
输出: { type: App 组件对象（内含 setup / 组件 render）, props: null, children: null, shapeFlag: 2, el: null, component: null }
```

**createComponentInstance（runtime-core.js）**：

```
目的: 建实例空壳（4.3.2）
输入: rootVNode, parent（根组件的 parent = null；provide/inject 向上查找用）
输出: instance（15 字段空壳 + emit）——此刻除 vnode / type 外全是空值，随流程逐步填充（见 4.3.2 填充时刻表）：
      { vnode: rootVNode, type: App, parent: null, provides: {},
        props: {}, propsRaw: {}, attrs: {}, slots: {}, setupState: {},
        ctx: { _: instance }, isMounted: false, subTree: null,
        update: null, proxy: null, mounted: [], unmounted: [] }
```

**initProps / initSlots（runtime-core.js）**：

```
目的: 填 instance.props / attrs / slots（4.3.3）
输入: instance（空壳）+ rootVNode.props / rootVNode.children
输出: demo 根组件没传 props、没写插槽 → instance.props / attrs / slots 均为空对象
      （props 的完整分拣规则见 4.3.3：声明过的进 props，没声明的进 attrs）
```

**setupComponent（runtime-core.js）**：

```
目的: 初始化三步走：initProps / initSlots → setupStatefulComponent（4.3.3）
输入: instance（createComponentInstance 建的空壳）
输出: instance.setupState —— 经 proxyRefs 解包后的真实读取（模板里读 ctx.count 拿到的就是数字）
      { "message": "Hello vue!", "count": 0, "todos": "abc" }
```

**setupStatefulComponent（runtime-core.js）**：

```
目的: 建代理 + 执行 setup + 落定 setupState / render（4.3.3）
输入: instance（空壳，props/slots 已由前两步填好）
输出: instance.proxy（读值顺序 setupState 最优先，ref 已解包）
      instance.setupState = proxyRefs(setup 返回的对象)
      instance.render（demo：finishComponentSetup 兜底取 mount 编译补上的组件 render）
```

**setupRenderEffect（runtime-core.js）**：

```
目的: 把组件 render 包进渲染 effect 并首跑（4.3.4）
输入: instance
输出: subTree = renderComponentRoot(instance) 首跑产物（normalizeVNode(render.call(proxy, proxy))，
      ctx = 实例代理；元素节点已带 el，li 自带 key——diff 的配对依据）
      Fragment({tag=p, flag=1, el=<p>, children="Hello vue!"},
               {tag=p, flag=1, el=<p>, children="count = 0"},
               {tag=button, el=<button>, children="count + 1"},
               {tag=ul, flag=1, el=<ul>,
                children=[{tag=li, key=1, flag=1, el=<li>, children="#1 a"},
                          {tag=li, key=2, flag=1, el=<li>, children="#2 b"},
                          {tag=li, key=3, flag=1, el=<li>, children="#3 c"}]})
```

**mountElement（runtime-core.js）**：

```
目的: 元素 VNode 落成真实 DOM（4.4）
输入: 元素 VNode + 容器 + 锚点
输出（副作用）——宿主留痕节选（对照规律：一个 h(...) = 一次 createElement；文本孩子走
               setElementText；事件走 addEventListener；开头两个 insert <#text> 是 Fragment 锚点）:
createElement p
setElementText <p> ← "Hello vue!"
insert <p> → <div#app>（anchor 前）
createElement p
setElementText <p> ← "count = 0"
insert <p> → <div#app>（anchor 前）
createElement button
addEventListener <button> click      ← @click 的编译产物落在这里
setElementText <button> ← "count + 1"
insert <button> → <div#app>（anchor 前）
createElement ul
createElement li
setElementText <li> ← "#1 a"
insert <li> → <ul>（末尾）
  …（li #2、#3 同构）
insert <ul> → <div#app>（anchor 前）
```

断点：断在 index.js 的 `createApp` 返回处与 `app.mount` 内，看 innerHTML → compile → 定义根组件 render → 清空容器 → 工厂 mount 的顺序；断在 `mountComponent`，看 setup 落定 4 个 ref → effect 首跑同步完成子树挂载。

#### 5.3.2 更新 · 改 message（diff 全链）

一次文本更新也要从调度器一路走完 patch 的分发链——这是后面所有更新操作的共同骨架：

```
主流程                                        patch 分发与比对（runtime-core.js）
──────────────────────────────────────────────────────────────────────
root.message = 'Hello MiniVue!'  reactivity.js
  │ trigger（机制见 3.3）
  ▼
queueJob → 微任务 flushJobs      runtime-core.js（见 4.5.2）
  ▼
componentUpdateFn 更新分支       runtime-core.js（见 4.5.3）
  │ 重跑 render() → patch(prevSubTree, nextSubTree)
  ▼
patch（两个 Fragment）────────→  processFragment（n1 有值）→ patchChildren
                                 │ 两边都是数组 → patchKeyedChildren 头同步
                                 │ 4 个孩子 type+key 全同 → 逐个递归 patch：
                                 ├ p1     → processElement → patchElement → patchChildren
                                 │          文本不等 → setElementText ×1   ← 唯一内容改动
                                 ├ p2     → patchElement → patchChildren
                                 │          "count = 0" === "count = 0" → 0 操作
                                 ├ button → patchElement
                                 │          onClick 闭包变 → 解绑旧绑新 addEventListener ×1
                                 └ ul     → patchElement → patchChildren
                                            patchKeyedChildren：li 全同 → 0 操作
```

**queueJob（runtime-core.js）**：

```
目的: job 入队去重，排一次微任务（4.5.2）
输入: 渲染 effect 的 scheduler（本次 1 次数据变更触发 1 次）
输出: 队列 1 个 job；currentFlushPromise 排进微任务
```

**patch（runtime-core.js）**：

```
目的: 新旧 VNode 比对的统一入口（4.2）
输入: n1 = prevSubTree、n2 = nextSubTree（两个都是 Fragment）
输出: n1 有值 → 分发进 processFragment 走更新
```

**patchKeyedChildren（runtime-core.js，完整函数见 lib）**：

```
目的: 有 key 列表的最小化 diff（头同步 → 尾同步 → 判定 → 配对）
输入: c1 / c2 = Fragment 的 4 个孩子（p / p / button / ul，type+key 全同）
输出（副作用）——逐个递归 patch 后落到宿主的全部副作用:
      setElementText <p> ← "Hello MiniVue!"    ← p1：文本不等，唯一的内容改动
      addEventListener <button> click          ← button：新 render 的 onClick 闭包变，解绑旧绑新
      （p2、ul/li：文本全部相同，0 次 DOM 操作）
```

**demo 实测 —— nextTick 前后读 DOM**（demo-app.html「改 message」按钮内置对照，状态行显示）：

```
同步读=「Hello vue!」（DOM 未动） → await nextTick() 后读=「Hello MiniVue!」（已落定）
```

印证 4.5.2：写入只改了 ref，渲染 effect 排进微任务——同步读永远拿旧值。

断点：断在 `patch`（n1 / n2 两个 Fragment）、`processElement`（p 的旧 / 新 VNode）、`patchElement`（props 与孩子的比对）——可自行验证比对发生在 patchElement → patchChildren。

#### 5.3.3 更新 · 一次改三项（批处理）

```
主流程                                        调度器内部（runtime-core.js，见 4.5.2）
──────────────────────────────────────────────────────────────────────
同一 tick 内 3 次同步写入
（message 写入 + count 自增
 + splice 删首项）────────────→  trigger ×7（机制见 3.3；5 次来自 splice 内部属性写入）
                                 queueJob 被调 7 次（splice 内部 5 次属性写入：4 次搬移 + 1 次 length）
                                 │ queue.includes 去重
                                 ▼ 队列始终只有 1 个 job
微任务 flushJobs 执行 1 次 ───→  一轮 patch 全部落定（中间状态从未渲染）
```

**queueJob（runtime-core.js）**：

```
目的: job 入队去重（4.5.2）
输入: 同一 tick 的 7 次调用（message + count 2 次写入 + splice 内部 5 次属性写入）
输出: 队列始终 1 个 job；微任务只排一次
```

**flushJobs（runtime-core.js）**：

```
目的: 微任务里统一执行队列（4.5.2）
输入: queue（1 个渲染 job）
输出: 执行 1 次 → setElementText ×2 + remove ×1，一轮 patch 全部落定
```

**实测**（demo-app.html「一次改三项」）：

```
==== 一次改三项：message 写入 + count 自增 + 删首项 ====
  三次写入后立刻看：渲染次数 +0，DOM 仍是旧值
  await nextTick() 之后：queueJob 被调 7 次（splice 内部 5 次属性写入），队列里始终只有 1 个 job
  flushJobs 只执行 1 次：setElementText ×2 + remove ×1，一轮 patch 全部落定
```

断点：断在 `queueJob`（看 includes 去重）、`flushJobs`（确认执行时机在微任务）。

#### 5.3.4 更新 · keyed diff：patchKeyedChildren 算法

前提：`isSameVNodeType` 判断是否是同一个节点——**type + key 都相同才算同一个 vnode，可以复用**。进到这一步的路径：ul 的 `patchElement` → `patchChildren`（4.2.3）→ 两边都是数组 children → `patchKeyedChildren(c1, c2, container, parentAnchor)`。

```
c1：旧 children；c2：新 children
i：头同步指针（往右推）；e1 / e2：旧 / 新列表末尾（尾同步往左推）
```

demo 操作：todos `[a, b, c, d, e]`（key 1~5）→ `[a, d, f, b, e]`（key 1、4、6、2、5）。ul 的 children 前后各夹一个空白文本节点（模板换行缩进，下文图中画成 `·`，key 为 null 记作 `-`），c1 / c2 实际各 7 项，图中「列表」行是下标，每行下方的数字行就是该行各格的 key 值。

diff 全程做完，DOM 只动 3 次：

```
  ✂ remove  c   （新列表查无 key 3）
  ★ mount   f   （新增）
  ↔ insert  d   （挪到 f 前面）
a、b、e 一根手指都不动——这就是"最小化更新"。下面五幕看它怎么推出来的。
```

**第 1 幕 · 头同步（前缀匹配）**——从队首点名：type + key 一样 → patch 复用，不一样 → 停

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`（patchKeyedChildren）

```js
// —— 第 1 步 从头同步（前缀匹配）：type + key 相同 → 就地 patch 复用。
//    一旦不匹配立即停——"跳过不匹配的继续往后找同类"是第 4 步按 key 建索引的活，这里不做
while (i <= e1 && i <= e2) {
    const n1 = c1[i]
    const n2 = c2[i]
    if (!isSameVNodeType(n1, n2)) break
    patch(n1, n2, container, parentAnchor)
    i++
}
```

```
列表  0     1     2     3     4     5     6
c1 |  ·  |  a  |  b  |  c  |  d  |  e  |  ·  |
      -     1     2     3     4     5     -
c2 |  ·  |  a  |  d  |  f  |  b  |  e  |  ·  |
      -     1     4     6     2     5     -
      ✓     ✓     ✗ break（b ≠ d）
→ 头部 · 和 a 复用（0 宿主操作），i 停在 2
```

**第 2 幕 · 尾同步（后缀匹配）**——从队尾点名：e1 / e2 往左推，同理

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`（patchKeyedChildren）

```js
// —— 第 2 步 从尾同步（后缀匹配）：e1/e2 往左推，同理。
//    "末尾追加 / 末尾不变"这类最常见场景，到这里就全部消化完了
while (i <= e1 && i <= e2) {
    const n1 = c1[e1]
    const n2 = c2[e2]
    if (!isSameVNodeType(n1, n2)) break
    patch(n1, n2, container, parentAnchor)
    e1--
    e2--
}
```

```
列表  0     1     2     3     4     5     6
c1 |  ·  |  a  |  b  |  c  |  d  |  e  |  ·  |
      -     1     2     3     4     5     -
c2 |  ·  |  a  |  d  |  f  |  b  |  e  |  ·  |
      -     1     4     6     2     5     -
                        ✗     ✓           ✓
→ 从右往左点名：尾部 · 复用 → e 复用 → d ≠ b 停；e1 = e2 = 4
```

**第 3 幕 · 边界：一边先点完名 = 纯增 / 纯删**

`i > e1` → 新列表中间段全是新增，逐个挂载；`i > e2` → 旧列表中间段全是删除，逐个卸载——不用建索引、不用算 LIS，两个 if 各自 return（快速通道，演示见 5.3.5）。本例两边都有剩，不触发，进入第 4 幕。

**第 4 幕 · 中间乱序区（核心）**——头尾同步后，中间夹住的三格 `[b, c, d] → [d, f, b]` 就是乱序区（s1 = s2 = i = 2）

**4.1 发座位表：按 key 建索引 keyToNewIndex**

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`（patchKeyedChildren）

```js
// ① 按 key 建索引 keyToNewIndex：key → 它在新列表的下标（绝对下标）。
//    目的：之后每个旧节点 O(1) 查一次就知道"我还在不在、在第几位"，
//    免掉旧×新两两对比的 O(n²)；key 是 diff 的配对依据
const keyToNewIndex = new Map()
for (let j = s2; j <= e2; j++) {
    if (c2[j].key !== null) keyToNewIndex.set(c2[j].key, j)
}
```

```
新乱序区 c2[2..4] = [d, f, b]，逐个登记座位号（key → 新列表下标）：
    d(key4) → 2      f(key6) → 3      b(key2) → 4
→ keyToNewIndex = {4→2, 6→3, 2→4}（与调试器一致）
```

**4.2 对号入座：遍历旧乱序区，查表填 map；查无 → 卸载**

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`（patchKeyedChildren）

```js
// ② 遍历旧乱序区，产出 newIndexToOldIndexMap（下文简称 map）——
//    一张"新列表乱序区每一格来自旧列表哪里"的登记表：
//      下标 = 新列表乱序区的相对位置（0,1,2...）
//      值   = 旧列表下标 + 1（+1 是为了把 0 让出来表示"这格是新增"），0 = 新增待挂载
const toBePatched = e2 - s2 + 1 // 新乱序区要落的格子总数：闭区间 [s2..e2] 的元素个数 = 差 + 1。
//                                map 必须一格不缺——LIS 和第 5 步都按它遍历
const newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 先全填 0 = "全是新增"，配对到再覆盖
let moved = false // 只要出现一次"逆序配对"，就说明有节点要挪动——才值得算 LIS
let maxNewIndexSoFar = 0 // 到目前为止配对到的最大新下标；拿它和当前比较，逆序立刻现形

for (let j = s1; j <= e1; j++) {
    const prevChild = c1[j]
    // 没 key 的节点查不了表，退化成按下标硬对齐（s2 + 相对偏移）——
    // 这正是"用 index 当 key"时节点内容串位等怪现象的根源
    const newIndex = prevChild.key !== null ? keyToNewIndex.get(prevChild.key) : s2 + (j - s1)

    if (newIndex === undefined || newIndex > e2) {
        unmount(prevChild, true) // 查无（或越界）→ 新列表已经没有它 → 卸载
    } else {
        // 登记进 map：newIndex - s2 把绝对下标换算成乱序区相对位置；j + 1 = 来自旧列表第 j 位
        newIndexToOldIndexMap[newIndex - s2] = j + 1
        // 新下标一路递增 = 旧序与新序一致，这段节点谁都不用挪；
        // 一旦比 maxNewIndexSoFar 小（逆序）→ 有节点要挪，标记 moved
        if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex
        else moved = true
        patch(prevChild, c2[newIndex], container, parentAnchor) // 还在 → 就地更新（内容同则 0 宿主操作）
    }
}
```

```
map 是一张"登记表"，先分清它的两个角色：
    下标 → 新列表乱序区的相对位置（0,1,2...），一格对一个格子：0=d槽 1=f槽 2=b槽
    值   → 这一格的来源：旧列表下标 + 1（+1 把 0 让出来表示"新增"），没有来源 = 0

初始 [0, 0, 0]：全按"新增"预留，配对到谁再覆盖谁
旧乱序区 [b, c, d] 逐个查座位表：
    b(key2) → 新下标 4 → map[4-2]（绝对换算相对）= 2+1 = 3   ✓ 还在，patch
    c(key3) → 查无此 key                                    ✂ 卸载（"谁被删了"在这一步落定）
    d(key4) → 新下标 2 → map[2-2] = 4+1 = 5                 ✓ 还在；2 < 已出现的 4 → 逆序 → moved = true

→ map = [ 5,  0,  3 ]，moved = true
          d槽  f槽  b槽      ← 下标（0/1/2）= 新乱序区的位置
    读法：d槽 值 5 → 来自旧列表下标 5-1 = 4（li#4）
          f槽 值 0 → 旧列表没有它 = 新增
          b槽 值 3 → 来自旧列表下标 3-1 = 2（li#2）
```

**4.3 求 LIS：找"来源顺序没变"的格子 = 不用挪的**

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`（patchKeyedChildren）

```js
// ③ 求 LIS（最长递增子序列，贪心 + 二分，O(n log n)）：
//    map 里"值递增"的段 = 旧序与新序一致的节点——它们本来就在正确位置，不用挪。
//    LIS 把"必须挪"的节点数压到最少；顺序完全没变时 moved = false，这里直接跳过
const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
let seqIdx = increasingNewIndexSequence.length - 1 // 从 LIS 末尾往前配对
```

```
map = [ 5,  0,  3 ]
        ↓   ↓   ↓
       d槽  f槽  b槽
递增的值：0 → 3（f槽 → b槽）→ LIS = [1, 2]（map 的下标）
b 在 LIS 里：相对顺序没变 → 原地不动；d（来源 5）不在 → 要挪；
f 槽 map = 0 是新增，不参与"挪不挪"，第 5 幕走挂载
```

**第 5 幕 · 倒序落 DOM**——从右往左扫新乱序区：右邻居先就位，才能当左邻的插入锚点

> 摘自 `./code/vue3/mini-vue/lib/runtime-core.js`（patchKeyedChildren）

```js
// —— 第 5 步 从后往前遍历新乱序区，落 DOM：mount 新增 / insert 挪位 / LIS 命中跳过 ——
//    为什么从后往前：后一个节点的 el 要先就位，才能当前一个节点的插入锚点
for (let j = toBePatched - 1; j >= 0; j--) {
    const nextIndex = s2 + j // 乱序区相对位置 → 新列表绝对下标
    const nextChild = c2[nextIndex]
    // 插入锚点 = 右邻居的 el（头尾同步 + 前序节点就位后天然正确）；乱序区右边界外 → 兜底 parentAnchor
    const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor
    if (newIndexToOldIndexMap[j] === 0) {
        patch(null, nextChild, container, anchor) // map = 0 → 旧列表没有 → 新增挂载
    } else if (moved) {
        // seqIdx < 0：LIS 已全部配对完；j !== LIS[seqIdx]：当前格不在 LIS 里 → 挪到正确位置
        if (seqIdx < 0 || j !== increasingNewIndexSequence[seqIdx]) {
            hostInsert(nextChild.el, container, anchor)
        } else {
            seqIdx-- // LIS 命中：本来就在正确位置 → 原地不动（这就是 LIS 的意义）
        }
    }
}
```

```
从右往左扫新乱序区 [d, f, b]：
    b → 在 LIS → 跳过（0 操作）
    f → map = 0 → mount f，插在右邻居 b 前面
    d → 不在 LIS → insert d 到 f 前面
宿主留痕：remove c + mount f + insert d = 3 次（呼应开场）
最终 li 顺序：[a, d, f, b, e] ✓
```

断点：断在 `patchKeyedChildren`（看 i / e1 / e2 游标与 keyToNewIndex 的构建）、`getSequence`（看 map 输入与 LIS 返回下标）。
#### 5.3.5 更新 · 新列表更长 / 旧列表更长（纯头尾，快速通道）

「新列表更长（追加一项）」/「旧列表更长（移除末项）」两个按钮各自触发边界判断的两个分支——头同步把一边全部摘中，中间区只剩另一边的纯增或纯删，不进乱序区：

```
新列表更长：todos.push({ id: 7, text: '新7' })      旧列表更长：todos.splice(length-1, 1)
  ▼                                                 ▼
① 头同步全中：li 逐个复用，i 越过 e1                ① 头同步全中：li 逐个复用，i 越过 e2
  ② 尾同步：已无可比的公共尾巴                       ② 尾同步：已无可比的公共尾巴
  ▼                                                 ▼
③ i > e1 且 i ≤ e2：中间段全是新增                 ④ i > e2 且 i ≤ e1：中间段全是删除
  → mount 新 li（插在末尾锚点前）                    → unmount 末项 li
```

（c1 / c2 同样各含前后空白 Text 节点，图里略去。）

**patchKeyedChildren（runtime-core.js）**：

```
目的: 有 key 列表的最小化 diff——③ / ④ 快速通道
输入: 新列表更长 → c2 = c1 + [新项]；旧列表更长 → c2 = c1 去掉末项
输出（副作用）: 新更长 → mountElement + insert <li> 新项 ×1；旧更长 → unmount 末项 + remove ×1
```

点题：③④ 不建 Map、不算 LIS——只有"两边都有剩"的乱序区才值得做 O(n log n) 优化。

断点：断在 `patchKeyedChildren` 的 `if (i > e1)`（新更长）与 `else if (i > e2)`（旧更长）两个分支。

#### 5.3.6 卸载

```
主流程                                        unmount 组件分支（runtime-core.js，见 4.2.3）
──────────────────────────────────────────────────────────────────────
appObj.unmount()              index.js
  │ 对 container._vnode 调内部 unmount
  ▼
unmount 组件分支 ───────────→  ① unmounted 钩子（先跑——反了会内存泄漏：依赖还挂着、更新还会来）
                               ② update.effect.stop()    ← 渲染 effect 停止订阅
                               ③ 递归 unmount(subTree) → unmountChildren → hostRemove
  ▼
孩子先摘，根与锚点最后摘；#app 清空
```

**unmount（runtime-core.js）**：

```
目的: 组件 / 元素 / Fragment 的递归卸载（4.2.3）
输入: appObj.unmount()（内部对 container._vnode 调 unmount）
输出（副作用）: 见下方三组实测
```

**describeDeps 前后对照**（message 的 dep）：

```
卸载前：  {"_value":"Hello vue!","__v_isRef":true}  value → 1 个 effect
卸载后：  （空）
```

**unmount 副作用 —— 宿主留痕**：

```
remove <p> "Hello vue!"
remove <p> "count = 0"
remove <button> "count + 1"
remove <li> "#1 a" / "#2 b" / "#3 c" / "#4 d" / "#5 e"
remove <ul>
remove <#text> ×2                    ← Fragment 锚点
```

**钩子计数与死写证据**：

```
钩子计数：{"mounted": 1, "unmounted": 1}
卸载后 root.count = 99 → 宿主操作记录为空，渲染区无任何变化（渲染 effect 已 stop，trigger 找不到订阅者）
```

断点：断在 `unmount` 组件分支，看 unmounted 钩子先执行、渲染 effect 后 stop；卸载后改 count，在 `trigger` 里确认 depsMap 已空。

demo 入口：`./code/vue3/mini-vue/demo/demo-app.html`

## 配套代码

本篇配套在 `./code/vue3/mini-vue/` 下分成两层：`lib/` 是按 Vue3 源码包结构拆分的纯 JS 实现（零依赖、`<script>` 按序加载，全局暴露 `window.MiniVue`，全量 JSDoc 注释，文件头标了覆盖机制与建议断点），`demo/` 是 3 个模块页面（编译 / 响应式 / 整体运行各一页；浏览器直接打开或起静态服务器访问，`F12 → Sources` 可随时断点）。
**实现文件**（加载顺序即依赖顺序：shared → reactivity / compiler-core → runtime-core → index）：
| 文件 | 内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-vue/lib/shared.js` | 类型判断工具与 `ShapeFlags` 位标记（对应 @vue/shared） | 4.1 shapeFlag |
| `./code/vue3/mini-vue/lib/reactivity.js` | `ReactiveEffect`（effect 栈 / cleanup）/ `track` / `trigger` / `reactive` / `readonly` / `ref` / `proxyRefs` / `computed` / `watch`（对应 @vue/reactivity） | 3.1~3.10 |
| `./code/vue3/mini-vue/lib/compiler-core.js` | `parse` → `transform` → `generate` → `compile`（对应 @vue/compiler-core） | 二、编译原理 |
| `./code/vue3/mini-vue/lib/runtime-core.js` | VNode / patch 分发 / render 入口与元素、组件分流（processElement / mountElement / processComponent / updateComponent）/ 挂载与更新路径（mountElement / mountChildren / patchElement / patchChildren）/ keyed diff / 组件实例 / 渲染 effect / 调度器与 nextTick / 生命周期 / props / provide-inject（对应 @vue/runtime-core） | 4.1~4.5 |
| `./code/vue3/mini-vue/lib/index.js` | 浏览器宿主 `nodeOps` / `patchProp` + `createRenderer` 装配 + 浏览器装配层 `createApp`（选择器 / in-DOM 模板 / `app.unmount()`）+ `window.MiniVue` 聚合（对应 @vue/runtime-dom） | 4.4.3 · 四章引言 · 5.3 · 全篇入口 |
**交互 demo**（编译 / 响应式各一页、整体运行一页，纯渲染演示：加载即渲染，只保留必要的交互按钮与渲染区，无日志无探针；时序与复用等教学点由「五、关键执行链路」的文字与代码摘录承担）：
| demo | 交互内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-vue/demo/demo-compiler.html` | 编辑模板实时产出 AST / 静态标记 / render 代码三份产物 | 2.2 · 2.3 · 5.1 |
| `./code/vue3/mini-vue/demo/demo-reactivity.html` | ref / reactive 深层属性 / computed 缓存读数 / watch 建立与 stop，四行 effect 驱动数值 | 3.1~3.9 · 5.2 |
| `./code/vue3/mini-vue/demo/demo-app.html` | 官网 CDN 用法整体运行：in-DOM 模板 + `@click` / `v-for` / `:key` 编译挂载，页面层按钮触发改 message（含 nextTick 前后读 DOM 对照）/ 一次改三项（批处理）/ 乱序 + 插删（keyed diff 全算法：双端同步 + key 索引 + LIS）/ 新列表更长 / 旧列表更长（③④ 快速通道）/ 卸载 | 4.1~4.5 · 5.3 |

## 参考

- 本模块总结：[总结](./总结.md)
- 下一篇：[React 原理](../react/React%20原理.md)
