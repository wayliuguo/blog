// boundary.cjs — 边界探针：适用性打分 / 出码后的所有权冲突 / 成本盈亏平衡
'use strict'
const assert = require('node:assert')
const crypto = require('node:crypto')

// ---------- 场景一：适用性打分——哪些需求不该进低代码 ----------
// 低代码不是「都能做」，而是「做起来划算」。四个维度打分，过线就建议走专业开发。
const DIMENSIONS = [
    { key: 'interaction', label: '交互复杂度（多步向导 / 手势 / 拖拽画布）' },
    { key: 'state', label: '状态机复杂度（分支 / 回退 / 并发）' },
    { key: 'integration', label: '外部集成（私有协议 / 非常规 SDK）' },
    { key: 'performance', label: '性能要求（大数据量 / 实时 / 动效）' }
]

function assess(scores) {
    // 每维 0-3 分；任一维度满分即判「不建议」——短板决定上限，不是总分决定
    const total = DIMENSIONS.reduce((s, d) => s + (scores[d.key] || 0), 0)
    const maxDim = Math.max(...DIMENSIONS.map(d => scores[d.key] || 0))
    const verdict = maxDim >= 3 ? '专业开发' : total >= 6 ? '低代码+扩展点' : '低代码'
    return { total, maxDim, verdict }
}

{
    const form = assess({ interaction: 0, state: 1, integration: 1, performance: 0 })
    assert.equal(form.verdict, '低代码')

    const dashboard = assess({ interaction: 1, state: 2, integration: 2, performance: 1 })
    assert.equal(dashboard.verdict, '低代码+扩展点')

    const editor = assess({ interaction: 3, state: 2, integration: 1, performance: 2 })
    assert.equal(editor.verdict, '专业开发', '短板维度满分即出局，不看总分')
    console.log(
        `[1] 适用性：表单=低代码（总分 ${form.total}）、看板=低代码+扩展点（${dashboard.total}）、画布编辑器=专业开发（单维 ${editor.maxDim} 满分出局）`
    )
}

// ---------- 场景二：所有权冲突——出码之后这份代码归谁 ----------
// 出码那一刻就产生了两份真相：schema 与源码。谁改了源码必须可检测，否则下一次出码会静默覆盖。
function emit(code) {
    return `/* hash:${crypto.createHash('sha256').update(code).digest('hex').slice(0, 12)} */\n${code}`
}

function detectDrift(emitted) {
    const declared = emitted.match(/hash:(\w{12})/)
    const body = emitted.replace(/^\/\* hash:\w+ \*\/\n/, '')
    const actual = crypto.createHash('sha256').update(body).digest('hex').slice(0, 12)
    return declared && declared[1] === actual ? 'clean' : 'drifted'
}

{
    const src = 'export default function Page() {\n  return <Page />;\n}'
    const out = emit(src)
    assert.equal(detectDrift(out), 'clean')
    // 有人手改了一行但没改 hash
    const handEdited = out.replace('<Page />', '<Page><Extra /></Page>')
    assert.equal(detectDrift(handEdited), 'drifted', '手改必须被检出，否则再出码会覆盖')
    console.log('[2] 出码漂移：原样=clean，手改一行=drifted（据此决定再出码前必须先 diff 或锁定源码）')
}

// ---------- 场景三：成本盈亏——搭建便宜，但变更次数一多就反转 ----------
// 低代码的收益集中在「首次搭建快」，代价是「每次变更都要绕平台的抽象」。变更越多，越该算这笔账。
function cost({ buildHours, changeHours, changes, proBuildHours, proChangeHours }) {
    return {
        lowcode: buildHours + changeHours * changes,
        pro: proBuildHours + proChangeHours * changes
    }
}

{
    const params = { buildHours: 8, changeHours: 2.5, proBuildHours: 24, proChangeHours: 0.8 }
    const at = n => cost({ ...params, changes: n })
    const c1 = at(1)
    const c20 = at(20)
    assert.ok(c1.lowcode < c1.pro, '第 1 次变更时低代码占优')
    assert.ok(c20.lowcode > c20.pro, '变更累积到 20 次时专业开发反超')
    // 盈亏平衡点：8 + 2.5n = 24 + 0.8n  →  n = 16/1.7 ≈ 9.41
    const breakEven = (params.proBuildHours - params.buildHours) / (params.changeHours - params.proChangeHours)
    console.log(
        `[3] 成本盈亏：搭建 8h vs 24h、单次变更 2.5h vs 0.8h → 平衡点第 ${breakEven.toFixed(1)} 次变更；1 次时 ${
            c1.lowcode
        }h/${c1.pro}h，20 次时 ${c20.lowcode}h/${c20.pro}h`
    )
}

// ---------- 场景四：逃逸机制——低代码里必须留一个「去写代码的口子」 ----------
// 平台一旦没有逃生舱，用户就会用最别扭的方式绕过它（在表达式里塞 200 行逻辑），那才真的失控。
const REGISTRY = new Set(['Text', 'List', 'Banner'])

function resolveComponent(type) {
    if (REGISTRY.has(type)) return { source: 'builtin', type }
    // 未注册的类型不静默降级成 div，而是明确要求注册——静默降级会把错误推迟到线上
    throw new Error(`未注册的物料：${type}`)
}

{
    assert.deepEqual(resolveComponent('Text'), { source: 'builtin', type: 'Text' })
    assert.throws(() => resolveComponent('Charts'), /未注册的物料/)
    console.log('[4] 逃逸机制：未注册物料明确报错而非静默降级——逃生舱是「注册自定义物料」，不是在表达式里写业务')
}

console.log('boundary.cjs 全部通过')
