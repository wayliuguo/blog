// review.cjs — 代码评审探针：CR 检查器 / 技术债打分 / 重构安全网
'use strict'
const assert = require('node:assert')

// ---------- 场景一：CR 检查器——把「记得看」变成「必须过」 ----------
// 人的注意力靠不住，尤其是第 300 行 diff 的时候。能自动判的先自动判，人只讨论判断不了的部分。
const RULES = [
    {
        id: '改了公共接口',
        test: d => d.publicApiChanged,
        require: d => d.compatHandled,
        msg: '需要兼容处理（旧调用方还在）'
    },
    {
        id: '新增依赖',
        test: d => (d.newDeps || []).length > 0,
        require: d => d.depJustified,
        msg: '需要说明为什么不能自己写'
    },
    {
        id: '改动构建配置',
        test: d => d.buildConfigChanged,
        require: d => d.localVerified,
        msg: '需要本地验证过（构建配置错了会阻塞所有人）'
    },
    { id: '新增代码块', test: d => (d.addedLines || 0) > 50, require: d => d.hasTest, msg: '>50 行改动要有测试' }
]

function review(diff) {
    const blockers = []
    for (const r of RULES) {
        if (r.test(diff) && !r.require(diff)) blockers.push(`${r.id}：${r.msg}`)
    }
    return { blockers, pass: blockers.length === 0 }
}

{
    const risky = {
        publicApiChanged: true,
        compatHandled: false,
        newDeps: ['lodash.debounce'],
        depJustified: false,
        buildConfigChanged: true,
        localVerified: false,
        addedLines: 300,
        hasTest: false
    }
    const r1 = review(risky)
    assert.equal(r1.pass, false)
    assert.equal(r1.blockers.length, 4, '四条规则全命中')

    const clean = {
        publicApiChanged: true,
        compatHandled: true,
        newDeps: [],
        depJustified: true,
        buildConfigChanged: false,
        localVerified: true,
        addedLines: 300,
        hasTest: true
    }
    assert.equal(review(clean).pass, true, '都处理过就放行')
    console.log(
        `[1] CR 检查器：改公共接口 / 加依赖 / 动构建配置 / 大改动 四条规则自动判，实测命中 ${r1.blockers.length} 条 blocker；能自动判的别浪费评审人力`
    )
}

// ---------- 场景二：技术债打分——先还哪一笔 ----------
// 「欠了很多债」没有信息量；要排优先级就得量化：影响面 × 恶化速度 ÷ 修复成本。
function debtScore(d) {
    // 影响面 1-5、恶化速度 1-5（5 = 正在快速变糟）、修复成本 1-5（5 = 很贵）
    return { id: d.id, score: (d.impact * d.trend) / d.cost, ...d }
}

{
    const debts = [
        { id: '重复的工具函数散落 8 处', impact: 2, trend: 3, cost: 1 }, // 6.0
        { id: '核心模块没有测试', impact: 5, trend: 4, cost: 4 }, // 5.0
        { id: '构建脚本硬编码路径', impact: 3, trend: 2, cost: 2 }, // 3.0
        { id: '遗留 jQuery 插件', impact: 4, trend: 1, cost: 5 } // 0.8
    ]
    const ranked = debts.map(debtScore).sort((a, b) => b.score - a.score)
    assert.equal(ranked[0].id, '重复的工具函数散落 8 处', '影响不大但极便宜且在扩散 → 先还')
    assert.equal(ranked[ranked.length - 1].id, '遗留 jQuery 插件', '影响大但很贵且不恶化 → 最后')
    assert.ok(ranked[0].score > ranked[1].score)
    console.log(
        `[2] 技术债打分：影响面 × 恶化速度 ÷ 修复成本 —— 「散落的工具函数」6.0 分排第一（便宜且在扩散），「遗留 jQuery」0.8 分垫底（贵但不恶化）`
    )
}

// ---------- 场景三：重构安全网——没有网就别跳 ----------
// 重构的前提是「改错了能被发现」，按安全网强度决定一次能改多大。
function safeToRefactor(ctx) {
    const missing = []
    if (!ctx.hasTest) missing.push('测试')
    if (!ctx.hasCi) missing.push('CI')
    if (!ctx.hasRollback) missing.push('回滚手段')
    if (!ctx.hasMonitoring) missing.push('监控')
    // 四缺一：只能做重命名级改动；四缺二以上：先补网
    const level = missing.length === 0 ? 'large' : missing.length === 1 ? 'small' : 'blocked'
    return { missing, level }
}

{
    assert.equal(safeToRefactor({ hasTest: true, hasCi: true, hasRollback: true, hasMonitoring: true }).level, 'large')
    const r = safeToRefactor({ hasTest: true, hasCi: true, hasRollback: false, hasMonitoring: true })
    assert.deepEqual(r.missing, ['回滚手段'])
    assert.equal(r.level, 'small', '四缺一：只做小步改动')
    const r2 = safeToRefactor({ hasTest: false, hasCi: true, hasRollback: false, hasMonitoring: false })
    assert.equal(r2.level, 'blocked', '四缺三：先补安全网，别动')
    console.log(
        '[3] 重构安全网：测试 / CI / 回滚 / 监控 四件套；缺 0 项可做大规模重构、缺 1 项只做小步改动、缺 ≥2 项先补网——没有网的重构就是赌博'
    )
}
