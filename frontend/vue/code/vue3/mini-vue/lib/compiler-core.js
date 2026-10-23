// ============================================================
// mini-vue/compiler-core —— 编译模块：模板 → AST → transform → render 代码
// 对应 Vue3 源码包：@vue/compiler-core（平台无关的编译核心）
// 依赖：shared.js；被 index.js（compile 入口）与 demo 使用
// 覆盖机制（对应《Vue3 原理》第二章）：parse 模板 → AST（2.2）、
// transform 静态标记（2.3）、generate → new Function render（2.2）
// ★ 建议断点：parse（逐段扫描）、transform（静态标记）、generate（代码生成）
// 三阶段流水线与真实 Vue 一致：
//   parse：    字符串 → 抽象语法树（描述"模板长什么样"）
//   transform：遍历 AST 打标（描述"哪些部分会变"）
//   generate： AST → JS 代码字符串，再 new Function 成可执行的 render 函数
// ============================================================

// toDisplayString 真实源码在 @vue/runtime-core，但 generate 的产物会内嵌调用它，
// 所以这里一并给出（compile 返回的 render 执行时需要传入）
/**
 * 把任意值转成可显示的字符串（插值内容的最终形态）。
 * null/undefined → 空串；对象 → 两空格缩进的 JSON（控制台里展开看更直观）；
 * 其余走 String()。
 *
 * @param {*} value - 任意值
 * @returns {string} 展示用字符串
 *
 * @example
 *   toDisplayString(42)          // → '42'
 *   toDisplayString(null)        // → ''
 *   toDisplayString(undefined)   // → ''
 *   toDisplayString('hi')        // → 'hi'
 *   toDisplayString({ a: 1 })    // → '{\n  "a": 1\n}'
 */
const toDisplayString = value => (value == null ? '' : isObject(value) ? JSON.stringify(value, null, 2) : String(value))

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

/**
 * 解析开始标签里的属性串，产出 attrs 对象。
 * 值形式二选一：key="value" → 字符串；只有 key → true（布尔属性，如 disabled）。
 * 一个属性都没有时返回 null（generate 会生成 props 参数 null）。
 *
 * @param {string} str - 开始标签内、标签名之后的属性串（可为空串）
 * @returns {Object|null} { 属性名: 值 } 或 null
 *
 * @example
 *   parseAttrs(' id="app" disabled')
 *   // → { id: 'app', disabled: true }
 *   parseAttrs('')        // → null
 *   parseAttrs(' class="x"') // → { class: 'x' }
 */
function parseAttrs(str) {
    const attrs = {}
    // 正则：([a-zA-Z-]+) 属性名（必须），(?:="([^"]*)")? 可选的 ="值"（值不含双引号）
    // matchAll 全局扫，没带值的属性 m[2] 为 undefined → 记成 true
    for (const m of str.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) {
        if (m[1]) attrs[m[1]] = m[2] !== undefined ? m[2] : true
    }
    return Object.keys(attrs).length ? attrs : null
}

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
