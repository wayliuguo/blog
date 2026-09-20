/**
 * 场景：强制同步布局（布局抖动）—— 交错读写 vs 集中读写
 * 运行：npm run thrash
 */
import { sweep, title, section, table, ms, num } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/thrash.html', [
        { name: '交错读写', query: { mode: 'interleaved' }, rounds: 5 },
        { name: '集中读写', query: { mode: 'batched' }, rounds: 5 }
    ])

    console.log(title('布局抖动：2000 个盒子改宽度，交错读写 vs 集中读写（5 轮中位数）'))
    console.log(
        table(
            ['写法', '循环耗时', '触发布局次数', '相对倍数'],
            rows.map(({ name, report }, i) => [
                name,
                ms(report.extra.loopMs),
                report.extra.layouts,
                i === 0 ? '1.00×' : num(rows[0].report.extra.loopMs / report.extra.loopMs || 1, 2) + '×'
            ])
        )
    )

    console.log(section('两个版本在做什么'))
    console.log('- 交错读写：每次「写宽度」之后立刻「读 offsetWidth」，读操作逼迫浏览器马上把刚才的改动算进布局')
    console.log('  → 2000 次写、2000 次强制同步布局，等于把一次布局成本放大了 2000 倍')
    console.log('- 集中读写：先把 2000 个 offsetWidth 一次读完（只布局一次），再统一写样式（攒到下一帧一次布局）')
    console.log('  → 1 次布局 + 一次批量写，浏览器可以把读写重排到最优顺序')

    const [a, b] = rows
    if (a && b && b.report.extra.loopMs > 0) {
        console.log(
            `\n结论：同样 2000 次改动，交错版慢 ${num(a.report.extra.loopMs / b.report.extra.loopMs, 1)} 倍，多出 ${
                a.report.extra.layouts - b.report.extra.layouts
            } 次强制布局。`
        )
    }
}
