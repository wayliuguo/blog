/**
 * 场景：覆盖率阈值到底拦住了什么
 * 运行：npm run coverage
 *
 * ⚠️ 这是一个**模型**，不是实测。真实项目里「这次改动有没有缺陷」没有现成标签，
 * 不可能拿真数据跑出召回率。所以这里用蒙特卡洛模拟：给每次改动打上「确实有缺陷」
 * 这个上帝视角的标签，再看不同阈值能拦住多少。
 * 它的价值不在于数字准，而在于把「阈值提高会同时抬高召回和误杀」这个权衡量化出来
 */
import { title, section, table, pct, num } from '../harness/table.mjs'

/** 固定种子的伪随机：同一个种子每次跑出同一张表，方便复现与对比 */
function rng(seed) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const N = 20000
const BASE = 0.72 // 项目当前覆盖率
const TOTAL_LINES = 200000 // 项目总代码行

/** 造一批「变更」样本，每条都带上帝视角的标签 */
function sampleChanges(seed) {
    const rand = rng(seed)
    const out = []
    for (let i = 0; i < N; i++) {
        const bad = rand() < 0.15 // 15% 的改动真的带缺陷
        const lines = 10 + Math.floor(rand() * 190) // 改动涉及 10~200 行
        // 有缺陷的改动，新代码里被测试覆盖到的比例偏低（新逻辑没补测试）
        const covFile = bad ? 0.15 + rand() * 0.4 : 0.5 + rand() * 0.45
        // 全项目覆盖率：改动那点代码被 20 万行的存量稀释掉了
        const weight = lines / TOTAL_LINES
        const covProject = BASE * (1 - weight) + covFile * weight
        // 测试会不会挂：有缺陷时大部分会挂，没缺陷时只有 flaky 会挂
        const testFails = bad ? rand() < 0.65 : rand() < 0.02
        out.push({ bad, lines, covFile, covProject, testFails })
    }
    return out
}

/** 算一组指标：拦截率 / 召回（抓到多少真缺陷）/ 误杀（拦了多少好改动）/ 精确率 */
function evaluate(changes, blocked) {
    let hit = 0
    let goodHit = 0
    const badTotal = changes.filter(c => c.bad).length
    const goodTotal = N - badTotal
    let caught = 0
    for (const c of changes) {
        if (!blocked(c)) continue
        hit++
        if (c.bad) caught++
        else goodHit++
    }
    const recall = caught / badTotal
    const fpr = goodHit / goodTotal
    return {
        blockedRate: hit / N,
        recall,
        fpr,
        precision: hit ? caught / hit : 0
    }
}

const changes = sampleChanges(20260920)

const rows = blocked =>
    [60, 70, 80, 90].map(t => {
        const r = evaluate(changes, c => blocked(c, t / 100))
        return [`${t}%`, pct(r.blockedRate), pct(r.recall), pct(r.fpr), pct(r.precision)]
    })

const HEAD = ['阈值', '拦截率', '召回（抓到真缺陷）', '误杀（拦掉好改动）', '精确率']

export default async function run() {
    console.log(title(`覆盖率阈值：${N} 次改动的模拟（项目基线 ${pct(BASE, 0)}，20 万行存量）`))

    console.log(section('A：卡「全项目覆盖率」'))
    console.log(
        table(
            HEAD,
            rows((c, t) => c.covProject < t)
        )
    )
    console.log('- 行为是**二值的**：70% 时几乎不拦，80% 时几乎全拦。')
    console.log('  因为一次改动只有几十行，被 20 万行存量稀释后，全项目覆盖率的变化在小数点后第三位。')
    console.log('  它要么永远不响、要么永远在响，中间没有可用的分辨力。')

    console.log(section('B：卡「改动文件的覆盖率」'))
    console.log(
        table(
            HEAD,
            rows((c, t) => c.covFile < t)
        )
    )
    console.log('- 这次阈值才有分辨力：召回随阈值升高，误杀也随阈值升高。')
    console.log('- 阈值从 60% 提到 90%，召回涨了多少、误杀涨了多少，就是这次决策的全部信息。')
    console.log('  没有「正确的阈值」，只有「你愿意用多少误杀换多少召回」。')

    console.log(section('C：对照——靠测试失败来拦'))
    const t = evaluate(changes, c => c.testFails)
    console.log(
        table(
            ['信号', '拦截率', '召回', '误杀', '精确率'],
            [['测试失败', pct(t.blockedRate), pct(t.recall), pct(t.fpr), pct(t.precision)]]
        )
    )
    console.log(
        `- 测试失败这一条：召回 ${pct(t.recall)}、误杀 ${pct(t.fpr)}（flaky 造成的），精确率 ${pct(t.precision)}`
    )
    console.log('- 它比任何覆盖率阈值都准，因为它是**行为信号**（代码跑起来不对），')
    console.log('  覆盖率只是**存在性信号**（有没有测试碰过这行）。')
    console.log('- 覆盖率拦不住最危险的一类：测试跑过这行、断言写得太弱（只测了不抛错），')
    console.log('  覆盖率是绿的，缺陷照样上线。这类只能靠评审和变异测试。')

    console.log(section('四、结论'))
    console.log('- 覆盖率阈值要卡在**改动文件 / 新增代码**上，卡全项目等于没卡')
    console.log('- 覆盖率当 KPI 会催生「为覆盖而覆盖」的测试：断言 `toBeDefined()` 也能刷绿')
    console.log('- 门禁的主力永远是测试本身；覆盖率是「测试有没有漏掉新代码」的补充信号')
    console.log(`- 模型假设（改代码里的常数即可复现）：缺陷率 15%、有缺陷时测试挂 ${pct(0.65, 0)}、`)
    console.log(`  flaky 率 ${pct(0.02, 0)}、改动 10~200 行、存量 20 万行`)
}
