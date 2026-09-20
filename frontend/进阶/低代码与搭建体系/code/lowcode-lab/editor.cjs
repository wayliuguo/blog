// editor.cjs — 编辑器探针：拖拽落点 / schema 出码 / 手工区锚点保留 / 属性面板联动
'use strict'
const assert = require('node:assert')

// ---------- 场景一：拖拽落点——三段分区与「不能拖进自己的子孙」 ----------
// 编辑器里最常见的 bug 有两个：落点算错（想放里面结果放成兄弟），以及把父节点拖进自己的子节点里。
function computeDrop(rect, pointerY) {
    // 上 25% 是「插到前面」，下 25% 是「插到后面」，中间 50% 是「放进里面」
    const edge = rect.height * 0.25
    if (pointerY < rect.top + edge) return 'before'
    if (pointerY > rect.top + rect.height - edge) return 'after'
    return 'inside'
}

function isDescendant(root, ancestorId, maybeChildId) {
    const found = findNode(root, ancestorId)
    if (!found) return false
    let hit = false
    ;(function walk(node) {
        if (node.id === maybeChildId) hit = true
        ;(node.children || []).forEach(walk)
    })(found)
    return hit // 注意：ancestor 自身也算命中，所以「拖到自己身上」同样被挡掉
}

function findNode(root, id) {
    if (root.id === id) return root
    for (const c of root.children || []) {
        const r = findNode(c, id)
        if (r) return r
    }
    return null
}

const page = {
    id: 'page',
    type: 'Page',
    children: [
        { id: 'list', type: 'List', children: [{ id: 'item', type: 'Text' }] },
        { id: 'foot', type: 'Footer' }
    ]
}

{
    const rect = { top: 0, height: 200 }
    assert.equal(computeDrop(rect, 10), 'before')
    assert.equal(computeDrop(rect, 100), 'inside')
    assert.equal(computeDrop(rect, 190), 'after')
    assert.equal(isDescendant(page, 'list', 'item'), true)
    assert.equal(isDescendant(page, 'item', 'list'), false)
    console.log('[1] 拖拽落点：上/中/下三段判定正确，把 list 拖进 item（自己的子孙）被拒绝')
}

// ---------- 场景二：出码——schema 编译成可读源码 ----------
// 出码的意义是「让产物脱离平台也能活」，所以它必须是人能读、能改、能进 git 的代码，不是一堆运行时解释的中间态。
function serializeProp(v) {
    if (typeof v === 'string' && /^(state|item|index)\b/.test(v)) return `{${v}}` // 表达式
    if (typeof v === 'string') return JSON.stringify(v) // 字面量字符串
    return `{${JSON.stringify(v)}}`
}

function codegen(node, depth = 0) {
    const pad = '  '.repeat(depth)
    const props = Object.entries(node.props || {})
        .map(([k, v]) => ` ${k}=${serializeProp(v)}`)
        .join('')
    const children = node.children || []
    let inner = ''
    if (node.loop) {
        // 循环：容器本身保留，子项在 map 里展开，并补 key（否则列表更新会整段重建）
        const body = children
            .map(c => codegen({ ...c, props: { key: 'index', ...(c.props || {}) } }, depth + 2))
            .join('\n')
        inner = `\n${pad}  {${node.loop}.map((item, index) => (\n${body}\n${pad}  ))}\n${pad}`
    } else if (children.length) {
        inner = `\n${children.map(c => codegen(c, depth + 1)).join('\n')}\n${pad}`
    }
    const el = `${pad}<${node.type}${props}${inner ? '' : ' '}/>`.replace(/\s*\/>$/, inner ? '>' : ' />')
    const open = inner ? `${pad}<${node.type}${props}>${inner}</${node.type}>` : el
    if (node.when) {
        // 条件：三元包一层，false 分支显式 null（不留 undefined 的坑）
        const inner2 = codegen({ ...node, when: undefined }, depth + 1)
        return `${pad}{${node.when} ? (\n${inner2}\n${pad}) : null}`
    }
    return open
}

const schema = {
    id: 'page',
    type: 'Page',
    props: {},
    children: [
        { id: 'banner', type: 'Banner', props: { title: '大促', vip: 'state.vip' }, when: 'state.vip' },
        {
            id: 'list',
            type: 'List',
            props: {},
            loop: 'state.items',
            children: [{ id: 'item', type: 'Text', props: { text: 'item.name' } }]
        }
    ]
}

{
    const code = codegen(schema)
    assert.ok(code.includes('<Page>'))
    assert.ok(code.includes('{state.vip ? (')) // 条件变三元
    assert.ok(code.includes('.map((item, index) => (')) // 循环变 map
    assert.ok(code.includes('title="大促"')) // 字面量
    assert.ok(code.includes('vip={state.vip}')) // 表达式
    assert.ok(code.includes('key={index}')) // 列表必须带 key
    // 括号配平：出码必须是语法完整的源码而不是拼坏的模板
    const count = ch => code.split(ch).length - 1
    assert.equal(count('('), count(')'))
    assert.equal(count('{'), count('}'))
    console.log('[2] 出码：条件→三元、循环→map、字面量与表达式分别处理，括号配平（可直接进 git）')
    console.log(code)
}

// ---------- 场景三：手工区锚点——第二次出码不许吃掉人写的代码 ----------
// 出码最大的信任危机是「我手改过，平台一导出又没了」。解法是锚点：出码时把手写区原样搬回。
function extractRegions(source) {
    const re = /\/\* @region:start (\w+) \*\/([\s\S]*?)\/\* @region:end \*\//g
    const out = new Map()
    let m
    while ((m = re.exec(source))) out.set(m[1], m[2])
    return out
}

function mergeRegions(freshCode, oldSource) {
    const regions = extractRegions(oldSource)
    if (!regions.size) return freshCode
    const lines = freshCode.split('\n')
    // 新代码里锚点还在的话就替换内容；锚点被整块删掉则把该 region 追加到末尾，不静默丢弃
    const kept = []
    const missing = []
    for (const [id, body] of regions) {
        const s = lines.findIndex(l => l.includes(`@region:start ${id}`))
        const e = lines.findIndex(l => l.includes('@region:end'))
        if (s >= 0 && e > s) {
            lines.splice(s + 1, e - s - 1, ...body.split('\n').filter(l => l.length))
            kept.push(id)
        } else {
            missing.push(id)
        }
    }
    if (missing.length) lines.push('', ...missing.map(id => `// 已失效的手写区 ${id}：${regions.get(id).trim()}`))
    return lines.join('\n')
}

{
    const old = `function Page() {\n  /* @region:start biz */\n  const x = doSomething();\n  /* @region:end */\n  return null;\n}`
    const fresh = `function Page() {\n  /* @region:start biz */\n  /* @region:end */\n  return <Page2 />;\n}`
    const merged = mergeRegions(fresh, old)
    assert.ok(merged.includes('const x = doSomething();'), '手写代码必须被搬回')
    assert.ok(merged.includes('<Page2 />'))

    const fresh2 = `function Page() {\n  return <Page2 />;\n}` // 锚点整块没了
    const merged2 = mergeRegions(fresh2, old)
    assert.ok(merged2.includes('已失效的手写区 biz'))
    console.log('[3] 手写区：二次出码原样搬回手写代码；锚点被删时降级为注释保留而非静默丢弃')
}

// ---------- 场景四：属性面板联动——字段依赖要连带清空 ----------
// 「隐藏字段」不等于「清掉值」：只隐藏不清值，用户会提交一个看不见的旧值，这是线上事故的经典来源。
const fieldSchema = {
    srcType: { type: 'enum', options: ['url', 'upload'] },
    url: { type: 'string', visibleWhen: 'srcType === "url"' },
    fileId: { type: 'string', visibleWhen: 'srcType === "upload"' }
}

{
    // 这里用「显式解构 + 求值」而不是 with：本文件开了 'use strict'，且属性条件只依赖 values 一个来源
    const evalCond = (cond, values) =>
        new Function('values', `const { ${Object.keys(values).join(', ')} } = values; return (${cond}); `)(values)
    const normalize2 = values => {
        const out = {}
        for (const [k, v] of Object.entries(values)) {
            const f = fieldSchema[k]
            if (!f) continue
            if (f.visibleWhen && !evalCond(f.visibleWhen, values)) continue
            out[k] = v
        }
        return out
    }
    assert.deepEqual(normalize2({ srcType: 'url', url: 'https://a', fileId: 'f1' }), {
        srcType: 'url',
        url: 'https://a'
    })
    assert.deepEqual(normalize2({ srcType: 'upload', url: 'https://a', fileId: 'f1' }), {
        srcType: 'upload',
        fileId: 'f1'
    })
    console.log('[4] 属性联动：切换 srcType 后不可见字段被连带清空（url / fileId 互斥，不留幽灵值）')
}

console.log('editor.cjs 全部通过')
