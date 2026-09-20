// proposal.cjs — 技术方案探针：必备项检查 / 取舍论证打分 / 风险矩阵排序
'use strict'
const assert = require('node:assert')

// ---------- 场景一：方案必备项——缺一块，评审就会绕圈子 ----------
// 评审会上最常见的浪费，是花半小时才发现"背景没写清楚"或"根本没说不做哪些事"。
const REQUIRED = ['背景', '目标', '非目标', '方案', '取舍', '风险', '回滚', '验证']

function checkProposal(p) {
    const missing = REQUIRED.filter(k => !p[k] || String(p[k]).trim() === '')
    // 「取舍」不能只写结论，必须写被否决的方案和为什么
    const weakTradeoff = Boolean(p['取舍']) && !/淘汰|否决|不选|替代/.test(String(p['取舍']))
    return { missing, weakTradeoff, score: (REQUIRED.length - missing.length) / REQUIRED.length }
}

{
    const bad = { 背景: '订单页首屏 4.2s', 目标: '降到 2s 内', 方案: 'SSR + 流式', 取舍: '选 SSR' }
    const r1 = checkProposal(bad)
    assert.deepEqual(r1.missing, ['非目标', '风险', '回滚', '验证'], '缺四项')
    assert.equal(r1.weakTradeoff, true, '取舍只写了结论，没写被否决的方案与原因')
    assert.ok(r1.score < 0.6, `完整度 ${r1.score}`)

    const good = {
        背景: '订单页首屏 4.2s，跳出率 38%',
        目标: '首屏 P90 ≤ 2s',
        非目标: '不改造下单链路、不动支付',
        方案: 'SSR + 流式渲染',
        取舍: 'CSR+预渲染也能降到 2.5s，但不达标，淘汰；SSR 成本是服务端扩容',
        风险: 'SSR 错误率上升，已有降级开关',
        回滚: '切回 CSR，开关控制，无需发版',
        验证: '灰度 5% 观察 48h，看首屏与错误率'
    }
    const r2 = checkProposal(good)
    assert.deepEqual(r2.missing, [])
    assert.equal(r2.weakTradeoff, false)
    assert.equal(r2.score, 1)
    console.log('[1] 方案必备项：8 项齐全才给满分；取舍只写结论（如「选 SSR」）会被判弱——必须写被否决的方案与原因')
}

// ---------- 场景二：取舍论证——没有备选方案的方案等于没论证 ----------
// 「我们选 A」不是论证。「为什么不是 B、不是 C」才是。
function scoreOptions(options) {
    // 每个备选要能给得出：结论 + 至少一条否决理由（或选择理由）
    let ok = 0
    for (const o of options) {
        if (o.name && o.verdict && (o.verdict === 'selected' ? o.reason : o.rejectReason)) ok++
    }
    return { total: options.length, argued: ok, ratio: ok / options.length }
}

{
    const weak = [{ name: 'SSR', verdict: 'selected', reason: '性能好' }]
    assert.equal(scoreOptions(weak).ratio, 1, '单个备选也能满分——因为根本没得比较')
    // 所以还要看备选数量：只有一个候选的方案，本质是"通知"不是"论证"
    const strong = [
        { name: 'SSR', verdict: 'selected', reason: '首屏可到 1.8s，团队已有 Node 基建' },
        { name: 'CSR + 预渲染', verdict: 'rejected', rejectReason: '只能到 2.5s，不达标' },
        { name: '边缘渲染', verdict: 'rejected', rejectReason: '依赖境外节点，合规过不了' }
    ]
    const r = scoreOptions(strong)
    assert.equal(r.ratio, 1)
    assert.ok(strong.length >= 2, '备选不少于 2 个才算论证过')
    console.log('[2] 取舍论证：只有 1 个候选的方案本质是"通知"不是"论证"；完整写法要给 ≥2 个备选，每个都有结论 + 理由')
}

// ---------- 场景三：风险矩阵——评审时间有限，先讨论哪几条 ----------
// 概率 × 影响排出优先级，且每条风险必须带「信号」（怎么知道它要发生了）与「兜底」。
function rankRisks(risks) {
    return risks
        .map(r => ({ ...r, level: r.probability * r.impact, ready: Boolean(r.signal && r.mitigation) }))
        .sort((a, b) => b.level - a.level)
}

{
    const risks = [
        { id: 'SSR 内存上涨', probability: 0.6, impact: 3, signal: '容器内存 > 70%', mitigation: '限流 + 扩容预案' },
        { id: '缓存击穿', probability: 0.3, impact: 5, signal: 'DB QPS 突增', mitigation: '空值缓存 + 单飞' },
        { id: '第三方 SDK 超时', probability: 0.2, impact: 2, signal: '', mitigation: '' }
    ]
    const ranked = rankRisks(risks)
    assert.equal(ranked[0].id, 'SSR 内存上涨', '0.6×3 = 1.8 最高')
    assert.equal(ranked[1].id, '缓存击穿', '0.3×5 = 1.5 次之')
    assert.equal(ranked[2].ready, false, '缺信号与兜底的风险被标为未就绪——评审时要求补齐')
    const notReady = ranked.filter(r => !r.ready).map(r => r.id)
    assert.deepEqual(notReady, ['第三方 SDK 超时'])
    console.log(
        '[3] 风险矩阵：按 概率×影响 排序（SSR 内存 1.8 > 缓存击穿 1.5 > SDK 超时 0.4）；每条风险都要带「信号」与「兜底」，缺一条即判未就绪'
    )
}
