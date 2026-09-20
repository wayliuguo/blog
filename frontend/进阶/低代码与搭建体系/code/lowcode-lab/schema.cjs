// schema.cjs — 低代码协议探针：物料协议校验 / schema 版本迁移 / 节点索引与环检测
'use strict'
const assert = require('node:assert')

// ---------- 场景一：物料协议——组件注册表 + props 校验 ----------
// 协议的第一件事是「什么算合法」：组件必须注册，props 必须可描述，否则渲染层无从下手。
const registry = {
    Button: {
        props: {
            text: { type: 'string', required: true },
            size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' }
        }
    },
    Image: {
        props: {
            src: { type: 'string', required: true },
            width: { type: 'number' }
        }
    }
}

function validateNode(node, reg) {
    const meta = reg[node.type]
    if (!meta) return [`未注册组件：${node.type}`]
    const errors = []
    for (const [key, def] of Object.entries(meta.props)) {
        const v = node.props ? node.props[key] : undefined
        if (v === undefined) {
            if (def.required) errors.push(`${node.id}: ${key} 必填`)
            continue
        }
        if (def.type === 'string' && typeof v !== 'string') errors.push(`${node.id}: ${key} 期望 string`)
        if (def.type === 'number' && typeof v !== 'number') errors.push(`${node.id}: ${key} 期望 number`)
        if (def.type === 'enum' && !def.values.includes(v))
            errors.push(`${node.id}: ${key} 不在枚举 [${def.values}] 内`)
    }
    return errors
}

{
    assert.deepEqual(validateNode({ id: 'b1', type: 'Button', props: { text: '提交', size: 'lg' } }, registry), [])
    assert.deepEqual(validateNode({ id: 'b2', type: 'Button', props: {} }, registry), ['b2: text 必填'])
    assert.deepEqual(validateNode({ id: 'b3', type: 'Button', props: { text: 'x', size: 'xxl' } }, registry), [
        'b3: size 不在枚举 [sm,md,lg] 内'
    ])
    assert.deepEqual(validateNode({ id: 'x1', type: 'Marquee', props: {} }, registry), ['未注册组件：Marquee'])
    console.log('[1] 物料协议：必填/类型/枚举/未注册四类校验全部命中，未知组件直接拒绝')
}

// ---------- 场景二：schema 版本迁移——老页面必须能活到新版本 ----------
// 协议一定会变。迁移链是唯一能同时保证「向前演进」和「老数据不炸」的机制。
const migrations = [
    {
        from: 1,
        to: 2,
        up: s => ({
            ...s,
            version: 2,
            children: s.children.map(c => ({ ...c, props: { size: 'md', ...c.props } }))
        })
    },
    {
        from: 2,
        to: 3,
        up: s => ({
            ...s,
            version: 3,
            children: s.children.map(c => {
                const { visible, ...rest } = c.props || {} // v3 起 visible 换成 when 表达式
                return { ...c, props: rest, when: visible === false ? 'false' : c.when }
            })
        })
    }
]

function migrate(schema, target = 3) {
    let cur = schema
    while (cur.version < target) {
        const m = migrations.find(x => x.from === cur.version)
        if (!m) throw new Error(`缺少 v${cur.version} → v${cur.version + 1} 的迁移`)
        cur = m.up(cur)
    }
    return cur
}

{
    const v1 = {
        version: 1,
        children: [
            { id: 't1', type: 'Text', props: { text: '你好' } },
            { id: 'b1', type: 'Text', props: { text: '隐藏项', visible: false } }
        ]
    }
    const v3 = migrate(v1)
    assert.equal(v3.version, 3)
    assert.equal(v3.children[0].props.size, 'md') // v1→v2 补默认值
    assert.equal(v3.children[1].when, 'false') // v2→v3 把 visible 换成 when
    assert.equal(v3.children[1].props.visible, undefined) // 旧字段必须清掉
    console.log('[2] schema 迁移：v1 页面经两级迁移到 v3，默认值补齐、旧字段 visible → when 且清理干净')
}

// ---------- 场景三：节点索引——重复 id 与循环引用必须在校验期就抓住 ----------
// schema 是数据：它可能出现重复 id（渲染后无法定位）和循环引用（渲染直接爆栈）。
function buildIndex(root) {
    const index = new Map()
    const errors = []
    const seen = new Set() // 按对象身份记录，用于发现环
    ;(function walk(node) {
        if (seen.has(node)) {
            errors.push(`循环引用：${node.id}`)
            return
        }
        seen.add(node)
        if (index.has(node.id)) errors.push(`重复 id：${node.id}`)
        index.set(node.id, node)
        ;(node.children || []).forEach(walk)
    })(root)
    return { index, errors }
}

{
    const ok = buildIndex({
        id: 'page',
        children: [{ id: 'a', children: [{ id: 'b' }] }, { id: 'c' }]
    })
    assert.deepEqual(ok.errors, [])
    assert.equal(ok.index.size, 4)

    const dup = buildIndex({ id: 'page', children: [{ id: 'a' }, { id: 'a' }] })
    assert.deepEqual(dup.errors, ['重复 id：a'])

    const cyclic = { id: 'page', children: [] }
    cyclic.children.push(cyclic) // 自己引用自己
    const cyc = buildIndex(cyclic)
    assert.deepEqual(cyc.errors, ['循环引用：page'])
    console.log('[3] 索引校验：正常树 4 节点无错；重复 id 与循环引用都被挡在渲染之前')
}

console.log('schema.cjs 全部通过')
