/**
 * 场景：把实测指标套上 Core Web Vitals 的评级区间，给每个页面出一张体检表
 * 运行：npm run score
 */
import { sweep, title, section, table, ms, num } from '../harness/index.mjs'

/** 各指标的 [良好上限, 待改进上限]，超过第二个值即为「差」 */
const THRESHOLDS = {
    ttfb: [800, 1800],
    fcp: [1800, 3000],
    lcp: [2500, 4000]
}

function rate(name, value) {
    const [good, ok] = THRESHOLDS[name] || [Infinity, Infinity]
    if (value == null) return '—'
    if (value <= good) return '良好'
    if (value <= ok) return '待改进'
    return '差'
}

function rateCls(value) {
    if (value == null) return '—'
    if (value <= 0.1) return '良好'
    if (value <= 0.25) return '待改进'
    return '差'
}

const mark = (r) => (r === '良好' ? '✓ 良好' : r === '待改进' ? '! 待改进' : r === '—' ? '—' : '✗ 差')

export default async function run() {
    const rows = await sweep('/metrics.html', [
        { name: '轻量首屏', query: { mode: 'light' }, rounds: 3 },
        { name: '未治理首屏', query: { mode: 'heavy' }, rounds: 3 },
        { name: 'CLS 无预留', page: '/cls.html', query: { mode: 'bad' }, rounds: 3 },
        { name: 'CLS 有预留', page: '/cls.html', query: { mode: 'good' }, rounds: 3 }
    ])

    console.log(title('体检表：把实测值套上 Core Web Vitals 区间（3 轮中位数）'))
    console.log(
        table(
            ['页面', 'TTFB', 'FCP', 'LCP', 'CLS（全量位移）', '整体'],
            rows.map(({ name, report }) => {
                const m = report.metrics
                const rs = [rate('ttfb', m.ttfb), rate('fcp', m.fcp), rate('lcp', m.lcp), rateCls(m.clsRaw)]
                const bad = rs.filter((r) => r === '差').length
                const warn = rs.filter((r) => r === '待改进').length
                const overall = bad ? '差' : warn ? '待改进' : '良好'
                return [
                    name,
                    `${ms(m.ttfb)} ${mark(rs[0])}`,
                    `${ms(m.fcp)} ${mark(rs[1])}`,
                    `${ms(m.lcp)} ${mark(rs[2])}`,
                    `${num(m.clsRaw, 3)} ${mark(rs[3])}`,
                    overall
                ]
            })
        )
    )

    console.log(section('区间来自哪里'))
    console.log('| 指标  | 良好     | 待改进     | 差      |')
    console.log('|-------|----------|------------|---------|')
    console.log('| TTFB  | ≤800ms   | ≤1800ms    | >1800ms |')
    console.log('| FCP   | ≤1800ms  | ≤3000ms    | >3000ms |')
    console.log('| LCP   | ≤2500ms  | ≤4000ms    | >4000ms |')
    console.log('| CLS   | ≤0.1     | ≤0.25      | >0.25   |')
    console.log('| INP   | ≤200ms   | ≤500ms     | >500ms  |')

    console.log(section('这张表怎么用'))
    console.log('- 评级是「门槛」不是「排名」：LCP 从 8000ms 优化到 3000ms 都还是「待改进」，但体验已经天差地别')
    console.log('- 一次只盯一个指标：先把「差」的拉到「待改进」，再统一进「良好」，比四个一起抠更快见效')
    console.log('- 现场数据（真实用户）永远优先于实验室数据：实验室能复现问题，但真实分布才决定影响面')
}
