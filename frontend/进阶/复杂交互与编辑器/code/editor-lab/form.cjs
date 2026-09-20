// form.cjs — 复杂表单引擎探针：依赖求值 / 联动清值 / 异步校验竞态 / 订阅粒度
'use strict'
const assert = require('node:assert')

// ---------- 场景一：依赖求值——派生字段谁先算，成环必须提前挡住 ----------
// 表单里总有派生字段（金额 = 单价 × 数量）。手写渲染顺序一旦配错，就会读到还没算出来的值。
function topo(fields) {
    const mark = {} // 0 未访问 / 1 访问中 / 2 已完成
    const order = []
    const visit = (id, stack) => {
        if (mark[id] === 1) throw new Error(`字段依赖成环：${[...stack, id].join(' -> ')}`)
        if (mark[id] === 2) return
        mark[id] = 1
        for (const dep of fields[id].deps || []) visit(dep, [...stack, id])
        mark[id] = 2
        order.push(id)
    }
    for (const id of Object.keys(fields)) visit(id, [])
    return order
}

const fields = {
    qty: { value: 3 },
    price: { value: 20 },
    amount: { deps: ['qty', 'price'], calc: v => v.qty * v.price },
    discount: { deps: ['amount'], calc: v => (v.amount > 100 ? 10 : 0) },
    payable: { deps: ['amount', 'discount'], calc: v => v.amount - v.discount }
}

function evaluate(fields) {
    const values = {}
    for (const id of topo(fields)) {
        const f = fields[id]
        values[id] = f.calc ? f.calc(values) : f.value
    }
    return values
}

{
    const order = topo(fields)
    assert.ok(order.indexOf('qty') < order.indexOf('amount'), 'qty 必须在 amount 之前')
    assert.ok(order.indexOf('price') < order.indexOf('amount'))
    assert.ok(order.indexOf('amount') < order.indexOf('payable'), 'amount 必须在 payable 之前')

    const v = evaluate(fields)
    assert.equal(v.amount, 60)
    assert.equal(v.discount, 0, '60 未满 100，无折扣')
    assert.equal(v.payable, 60)

    fields.qty.value = 10
    const v2 = evaluate(fields)
    assert.equal(v2.amount, 200)
    assert.equal(v2.discount, 10)
    assert.equal(v2.payable, 190)
    fields.qty.value = 3

    // 配错成环：payable 反过来依赖自己
    const bad = { ...fields, payable: { deps: ['amount', 'payable'], calc: v => v.amount } }
    assert.throws(() => evaluate(bad), /成环/, '成环必须在求值前抛错，而不是算出 undefined')

    console.log(
        '[1] 依赖求值：拓扑序保证 amount 在 qty/price 之后、payable 在 discount 之后；qty 3→10 时 amount 60→200、discount 0→10、payable 60→190；payable 自依赖成环在求值前抛错'
    )
}

// ---------- 场景二：联动清值——值真变了才往下传，且必须有深度上限 ----------
// 改省份要清空城市、改城市要清空区县。如果两边都配了互清，就会无限打转——必须能停下来。
const cascade = {
    province: { onChange: ['city'] },
    city: { onChange: ['district'] },
    district: {}
}

function applyChange(cascade, values, field, newValue, maxDepth = 5) {
    const next = { ...values }
    next[field] = newValue
    let queue = [field]
    let depth = 0
    let propagations = 0
    while (queue.length) {
        if (++depth > maxDepth) throw new Error(`联动传播超过 ${maxDepth} 层，疑似成环：${queue.join(',')}`)
        const batch = queue
        queue = []
        for (const f of batch) {
            for (const target of cascade[f].onChange || []) {
                const before = next[target]
                next[target] = ''
                if (before === '') continue // 本来就是空的：没真变化，不再往下传播
                propagations++
                queue.push(target)
            }
        }
    }
    return { values: next, propagations }
}

{
    const values = { province: 'zj', city: 'hz', district: 'xh' }
    const r = applyChange(cascade, values, 'province', 'js')
    assert.equal(r.values.city, '', '省份变了，城市必须清空')
    assert.equal(r.values.district, '', '城市变了，区县跟着清空')
    assert.equal(r.propagations, 2)

    const r2 = applyChange(cascade, r.values, 'province', 'bj')
    assert.equal(r2.propagations, 0, '目标本来就是空值 → 不算变化，不触发渲染')

    // 互清（province↔city）会不会死循环？不会——"值真变了才往下传"这条规则让它自然收敛：
    // province 改 → 清 city → city 变了才回头清 province → 此时 province 是新值不是空 → 再清 city → city 已空，停。
    const loop = { province: { onChange: ['city'] }, city: { onChange: ['province'] } }
    const r3 = applyChange(loop, { province: 'zj', city: 'hz' }, 'province', 'js')
    assert.equal(r3.propagations, 2, '互清成环不会死循环：值不再变化就自然收敛')
    assert.equal(r3.values.province, '', '但代价是用户刚选的 province 被反向联动抹掉了——这是配置错误，不是性能问题')

    // 但"赋值型"联动（每次写入的都是新值）会真的打转，这时只能靠深度上限兜底
    function applyCompute(edges, values, field, maxDepth = 5) {
        const next = { ...values }
        let queue = [field]
        let depth = 0
        let writes = 0
        while (queue.length) {
            if (++depth > maxDepth) throw new Error(`联动传播超过 ${maxDepth} 层，疑似成环：${queue.join(',')}`)
            const batch = queue
            queue = []
            for (const f of batch) {
                for (const target of edges[f] || []) {
                    next[target] = (next[target] || '') + '*' // 每次都写入一个新值
                    writes++
                    queue.push(target)
                }
            }
        }
        return { values: next, writes }
    }
    const ring = { a: ['b'], b: ['a'] }
    assert.throws(() => applyCompute(ring, { a: '', b: '' }, 'a'), /成环/, '赋值型互推必须被上限拦住，而不是栈溢出')
    const chain = applyCompute({ a: ['b'], b: ['c'] }, { a: '', b: '', c: '' }, 'a')
    assert.equal(chain.writes, 2, '无环的链正常跑完：a→b→c')

    console.log(
        '[2] 联动清值：改 province 级联清空 city/district（2 次传播）；目标已为空时不传播（0 次）；互清成环不会死循环（值不再变化即收敛），代价是用户刚选的 province 被反向抹掉——配置错误而非性能问题；赋值型互推（每次写入新值）才靠深度上限拦下'
    )
}

// ---------- 场景三：异步校验——谁最后发的不一定最后回，过期响应必须丢弃 ----------
// 用户连打三个字符，三个校验请求谁先回来是不确定的。谁后回就用谁的，输入框会显示"旧答案"。
function createAsyncValidator() {
    let seq = 0
    return {
        send(value) {
            return { seq: ++seq, value }
        },
        // 响应回来时判断：我还是不是最新一次请求
        accept(resp) {
            return resp.seq === seq
        },
        latest: () => seq
    }
}

{
    const v = createAsyncValidator()
    const r1 = v.send('a')
    const r2 = v.send('ab')
    const r3 = v.send('abc')

    // 真实时序：'ab' 的请求先回（网络抖动），'a' 再回，'abc' 最后回
    const arrival = [r2, r1, r3]
    const accepted = arrival.filter(v.accept)
    assert.equal(accepted.length, 1, '三次请求只有最后一次的结果被采纳')
    assert.equal(accepted[0].value, 'abc', '采纳的是最后一次输入的值，而不是最后回来的值')
    assert.equal(v.accept(r1), false, 'r1 过期')
    assert.equal(v.accept(r2), false, 'r2 过期')
    assert.equal(v.accept(r3), true, 'r3 是最新一次')

    console.log(
        '[3] 异步校验竞态：连发 a/ab/abc，返回顺序 ab→a→abc，只有 abc 的结果被采纳（前两次过期丢弃），不会用旧答案覆盖新输入'
    )
}

// ---------- 场景四：订阅粒度——100 个字段改 1 个，该唤醒几个订阅者 ----------
// 大表单卡顿最常见的根因：任何一个字段变化都把整个表单重渲染一遍。
function createStore(values) {
    const all = []
    const byField = {}
    return {
        values,
        subscribeAll(fn) {
            all.push(fn)
        },
        subscribe(k, fn) {
            ;(byField[k] || (byField[k] = [])).push(fn)
        },
        set(k, v) {
            if (values[k] === v) return { all: 0, field: 0 } // 值没变：谁都别叫醒
            values[k] = v
            all.forEach(fn => fn(k))
            ;(byField[k] || []).forEach(fn => fn(v))
            return { all: all.length, field: (byField[k] || []).length }
        }
    }
}

{
    const values = {}
    for (let i = 0; i < 100; i++) values['f' + i] = ''
    const store = createStore(values)

    let allNotified = 0
    for (let i = 0; i < 100; i++) store.subscribeAll(() => allNotified++)
    let fieldNotified = 0
    for (let i = 0; i < 100; i++) store.subscribe('f' + i, () => fieldNotified++)

    const r = store.set('f7', 'x')
    assert.equal(r.all, 100, '全量订阅：改 1 个字段，100 个订阅者全被唤醒')
    assert.equal(fieldNotified, 1, '按字段订阅：只有 f7 的订阅者被唤醒')
    assert.equal(allNotified, 100)

    const r2 = store.set('f7', 'x')
    assert.equal(r2.all, 0, '值没变化 → 一次通知都不发')

    console.log(
        `[4] 订阅粒度：100 字段表单改 1 个，全量订阅唤醒 ${allNotified} 个订阅者 vs 按字段订阅只唤醒 ${fieldNotified} 个（相差 100×）；写入相同值不触发任何通知`
    )
}
