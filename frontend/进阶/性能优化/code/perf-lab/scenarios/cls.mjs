/**
 * 场景：CLS 的两个常见来源（图片不留尺寸、晚到的横幅插到顶部）
 * 运行：npm run cls
 */
import { sweep, title, section, table, num, ms } from '../harness/index.mjs'

/** Core Web Vitals 的 CLS 评级区间 */
function grade(cls) {
    if (cls <= 0.1) return '良好'
    if (cls <= 0.25) return '待改进'
    return '差'
}

export default async function run() {
    const rows = await sweep('/cls.html', [
        { name: '无预留', query: { mode: 'bad' }, rounds: 3 },
        { name: '有预留', query: { mode: 'good' }, rounds: 3 }
    ])

    console.log(title('CLS：同一段内容，两种写法（3 轮中位数）'))
    console.log(
        table(
            ['版本', '位移合计', '位移次数', '评级', 'FCP', 'LCP'],
            rows.map(({ name, report }) => {
                const m = report.metrics
                return [name, num(m.clsRaw, 3), m.shifts, grade(m.clsRaw), ms(m.fcp), ms(m.lcp)]
            })
        )
    )

    console.log(section('两次位移分别是什么'))
    for (const { name, report } of rows) {
        console.log(`[${name}] ` + (report.extra.shifts.length ? report.extra.shifts.map((s) => `+${s.value} @${s.at}ms`).join('  ') : '没有位移'))
    }

    console.log(section('两个版本差在哪'))
    console.log('- 无预留：<img> 不给 width/height（按 0 高排，图回来后下移 240px）；240px 高的横幅 500ms 后直接插到 body 最前面，整页内容再被顶下去一次')
    console.log('- 有预留：<img> 写死 width="640" height="240"；横幅插进 min-height:240px 的占位容器里，插入不产生位移')
    console.log('\n注：规范口径的 CLS 会剔掉 hadRecentInput 为 true 的位移，无头环境里没有真实输入却是 true，')
    console.log('    所以这里读「位移合计」（所有位移之和）。真实用户环境两者一致。')
}
