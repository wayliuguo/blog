/**
 * 场景：灰度分批放量，什么时候该喊停
 * 运行：npm run release
 *
 * ⚠️ 同样是**模型**不是实测：真线上不可能反复发布同一个坏版本去统计「平均第几批发现」。
 * 用蒙特卡洛把「抽样误差」这件事量化出来——它正是灰度决策里最容易拍脑袋的地方
 */
import { title, section, table, pct, num } from '../harness/table.mjs'

const RUNS = 20000
const BASE_ERR = 0.004 // 正常版本的错误率
const BAD_ERR = 0.016 // 坏版本：4 倍
const METRICS = 3 // 同时盯 3 个指标（错误率 / LCP p75 / 转化率）
/** 四批放量：ratio 是受影响用户比例，samples 是这一批观测窗口内能拿到的样本量 */
const BATCHES = [
    { name: '5%', ratio: 0.05, samples: 2500 },
    { name: '20%', ratio: 0.2, samples: 10000 },
    { name: '50%', ratio: 0.5, samples: 25000 },
    { name: '100%', ratio: 1, samples: 50000 }
]

function rng(seed) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Box-Muller：标准正态 */
function gauss(rand) {
    const u = Math.max(rand(), 1e-12)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

/**
 * 一次发布：按 minSample 决定「样本够不够下判断」，够了就对每个指标判一次
 * 返回 { stopBatch, exposedRatio, caught }
 */
function release(rand, isBad, { minSample, lastOnly }) {
    const p = isBad ? BAD_ERR : BASE_ERR
    for (let i = 0; i < BATCHES.length; i++) {
        const b = BATCHES[i]
        // lastOnly：只在最后一批判一次（"跑满再看"的做法）
        if (lastOnly ? i !== BATCHES.length - 1 : b.samples < minSample) continue
        // 三个指标各抽一次：任一超过基线的 2 倍就回滚
        let triggered = false
        for (let m = 0; m < METRICS; m++) {
            const se = Math.sqrt((p * (1 - p)) / b.samples)
            const observed = p + gauss(rand) * se
            if (observed > BASE_ERR * 2) triggered = true
        }
        if (triggered) return { stopBatch: i + 1, exposedRatio: b.ratio, caught: true }
    }
    return { stopBatch: BATCHES.length, exposedRatio: 1, caught: false }
}

function simulate(opts) {
    const rand = rng(20260920)
    const bad = { exposed: 0, missed: 0, batch: 0 }
    const good = { exposed: 0, rolledBack: 0, batch: 0 }
    let badRuns = 0
    let goodRuns = 0
    for (let i = 0; i < RUNS; i++) {
        const isBad = i % 2 === 0
        const r = release(rand, isBad, opts)
        if (isBad) {
            badRuns++
            bad.exposed += r.exposedRatio
            if (!r.caught) bad.missed++
            else bad.batch += r.stopBatch
        } else {
            goodRuns++
            good.exposed += r.exposedRatio
            if (r.caught) {
                good.rolledBack++
                good.batch += r.stopBatch
            }
        }
    }
    const caughtCount = badRuns - bad.missed
    return {
        badExposed: bad.exposed / badRuns,
        missedRate: bad.missed / badRuns,
        avgBatch: caughtCount ? bad.batch / caughtCount : 0,
        goodExposed: good.exposed / goodRuns,
        rollbackRate: good.rolledBack / goodRuns
    }
}

export default async function run() {
    console.log(title(`灰度分批：${RUNS} 次发布模拟（坏版本错误率 ${pct(BAD_ERR, 1)} vs 基线 ${pct(BASE_ERR, 1)}）`))

    const arms = [
        { name: 'A 跑满 100% 再判', minSample: Infinity, lastOnly: true },
        { name: 'B 每批都判（样本 ≥500）', minSample: 500, lastOnly: false },
        { name: 'C 样本 ≥3000 才判', minSample: 3000, lastOnly: false }
    ]
    const results = arms.map((a) => ({ ...a, ...simulate(a) }))

    console.log(
        table(
            ['策略', '坏版本：平均受影响用户', '坏版本：漏放率', '坏版本：第几批发现', '正常版本：误回滚率'],
            results.map((r) => [
                r.name,
                pct(r.badExposed),
                pct(r.missedRate),
                r.avgBatch ? num(r.avgBatch, 2) : '—',
                pct(r.rollbackRate)
            ])
        )
    )

    console.log(section('三行数字分别在说什么'))
    console.log('- A（跑满再判）：坏版本一个都跑不掉（漏放率 0%），但要等到第 4 批才发现——')
    console.log('  **100% 的用户都吃到了这个坏版本**。分批的意义本来就是把最坏情况限制在第一批，')
    console.log('  跑满再判等于把这个意义取消了。')
    console.log('- B（每批都判）：5% 那一批的 2500 个样本已经足够把 1.6% 和 0.4% 分开，')
    console.log('  绝大多数坏版本在第一批就被拦下，代价是正常版本有少量误回滚。')
    console.log('- C（样本 ≥3000 才判）：第一批 2500 个样本"不够"，只能等到第二批——')
    console.log('  **最小样本量定得太大，等于放弃早停**。它把受影响用户从 5% 抬到了 20%。')

    console.log(section('误回滚为什么必然存在'))
    console.log(`- 正常版本的错误率本身就是 ${pct(BASE_ERR, 1)}，抽样有波动：样本越少，波动越大。`)
    console.log(`- 这里同时盯 ${METRICS} 个指标，任一超线就回滚——每多盯一个指标，误回滚概率就多一次机会。`)
    console.log('  这是多重比较问题：盯 10 个指标，就算版本完全正常，也总有某个指标"看起来变差了"。')
    console.log('- 应对不是「少盯几个」，而是：① 只对核心指标设自动回滚，其余只告警')
    console.log('  ② 用置信区间而不是点估计判断 ③ 自动回滚要能一键改回，别让人不敢用。')

    console.log(section('结论：分批的三个参数'))
    console.log('- 批次梯度：5% → 20% → 50% → 100%（第一批必须足够小，小到「出事也扛得住」）')
    console.log('- 最小样本量：要小于第一批能拿到的样本，否则早停形同虚设')
    console.log('- 判据阈值：用「超过基线 N 倍」而不是「超过某个绝对值」，绝对值会随业务自然波动')
}
