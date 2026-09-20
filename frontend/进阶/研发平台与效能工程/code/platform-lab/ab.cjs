// ab.cjs — 实验平台探针：分桶稳定性与均匀性 / 正交分层 / SRM 检测 / 显著性
'use strict'
const assert = require('node:assert')

function hash(s) {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
}

// ---------- 场景一：分桶——同一个用户每次都要落进同一个桶 ----------
// 用户今天看到 A、明天看到 B，实验就废了；所以分桶必须由「用户 ID + 实验盐」决定，且可重算。
function bucket(userId, salt, buckets = 100) {
    return hash(userId + ':' + salt) % buckets
}

{
    const uid = 'u-10086'
    const first = bucket(uid, 'exp-checkout-v2')
    for (let i = 0; i < 100; i++) assert.equal(bucket(uid, 'exp-checkout-v2'), first, '同一用户必须稳定落在同一桶')
    assert.notEqual(bucket(uid, 'exp-checkout-v2'), bucket(uid, 'exp-feed-v3'), '不同实验不同盐 → 独立分桶')

    // 均匀性：1 万个用户，实验组占 50%（桶号 < 50）
    let inExp = 0
    const N = 10000
    for (let i = 0; i < N; i++) if (bucket('u-' + i, 'exp-checkout-v2') < 50) inExp++
    const ratio = inExp / N
    assert.ok(Math.abs(ratio - 0.5) < 0.02, `分桶必须均匀，实测 ${ratio}`)
    console.log(
        `[1] 分桶：同一用户 100 次稳定同桶；不同实验不同盐互不干扰；${N} 用户落在实验组 ${(ratio * 100).toFixed(
            2
        )}%（偏差 < 2%）`
    )
}

// ---------- 场景二：正交分层——两个实验叠在一个人身上，不能互相污染 ----------
// 同一层内互斥（一个人只进一个实验），层与层之间用不同盐 → 正交，命中组合均匀分布。
{
    const N = 10000
    const quad = [0, 0, 0, 0] // [都不中, 只中A, 只中B, 都中]
    for (let i = 0; i < N; i++) {
        const a = bucket('u-' + i, 'layer-UI') < 50
        const b = bucket('u-' + i, 'layer-rank') < 50
        quad[(a ? 1 : 0) + (b ? 2 : 0)]++
    }
    for (const c of quad) {
        assert.ok(Math.abs(c / N - 0.25) < 0.02, `四格应各占 25%，实测 ${((c / N) * 100).toFixed(2)}%`)
    }
    console.log(
        `[2] 正交分层：UI 层与排序层各自分桶，命中组合均匀分布在四格（各约 25%，最大偏差 ${(
            Math.max(...quad.map(c => Math.abs(c / N - 0.25))) * 100
        ).toFixed(2)}%）——同层互斥、跨层正交`
    )
}

// ---------- 场景三：SRM——样本比例失衡时，结论一律作废 ----------
// 配置成 50/50 却跑出 5200/4800，说明分流或埋点有问题，此时看什么指标都没有意义。
function srmChiSquare(observed, expectedRatio) {
    const total = observed.reduce((a, b) => a + b, 0)
    let chi = 0
    for (let i = 0; i < observed.length; i++) {
        const e = total * expectedRatio[i]
        chi += (observed[i] - e) ** 2 / e
    }
    return chi // df = 组数 - 1；两组时 3.84 是 p=0.05 的临界值
}

{
    const okSample = [4980, 5020]
    const badSample = [5200, 4800]
    const chiOk = srmChiSquare(okSample, [0.5, 0.5])
    const chiBad = srmChiSquare(badSample, [0.5, 0.5])
    assert.ok(chiOk < 3.84, `正常样本不该触发 SRM，实测卡方 ${chiOk.toFixed(2)}`)
    assert.ok(chiBad > 3.84, `失衡样本必须被检出，实测卡方 ${chiBad.toFixed(2)}`)
    console.log(
        `[3] SRM 检测：4980/5020 卡方 ${chiOk.toFixed(2)}（< 3.84 通过）；5200/4800 卡方 ${chiBad.toFixed(
            2
        )}（> 3.84 判定失衡，结论作废）`
    )
}

// ---------- 场景四：显著性——"提升 8%" 到底能不能信 ----------
// 两比例 z 检验：转化率的差值要跟标准误比，而不是跟 0 比。
function zTest(convA, nA, convB, nB) {
    const p1 = convA / nA
    const p2 = convB / nB
    const pooled = (convA + convB) / (nA + nB)
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB))
    const z = (p2 - p1) / se
    return { p1, p2, z, lift: (p2 - p1) / p1, significant: Math.abs(z) > 1.96 }
}

{
    // 看起来提升 8%（5.0% → 5.4%），样本各 2 万
    const r = zTest(1000, 20000, 1080, 20000)
    assert.ok(Math.abs(r.lift - 0.08) < 0.001, '相对提升约 8%')
    assert.ok(Math.abs(r.z - 1.8) < 0.1, `z 约 1.8，实测 ${r.z.toFixed(2)}`)
    assert.equal(r.significant, false, 'z < 1.96 → 不显著，不能上线')

    // 样本翻到 5 万：同样的提升幅度就显著了
    const r2 = zTest(2500, 50000, 2700, 50000)
    assert.equal(r2.significant, true, '样本够了，同样的 8% 提升才站得住')

    console.log(
        `[4] 显著性：5.0%→5.4%（提升 8%），n=2万 时 z=${r.z.toFixed(2)} < 1.96 不显著；n=5万 时 z=${r2.z.toFixed(
            2
        )} > 1.96 才显著——样本量决定结论，不是提升幅度`
    )
}
