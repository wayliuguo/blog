/**
 * 场景：长任务与切片——60000 行一次渲染 vs 分片让出主线程
 * 运行：npm run longtask
 */
import { sweep, title, section, table, ms, num } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/longtask.html', [
        { name: '一次做完', query: { mode: 'sync' }, rounds: 3 },
        { name: '分片切片', query: { mode: 'chunked' }, rounds: 3 }
    ])

    console.log(title('长任务：60000 行列表，一次插入 vs 每 6000 行让出一次（3 轮中位数）'))
    console.log(
        table(
            ['做法', '总耗时', '分片数', '最长同步块', '首屏可见耗时', '超过 50ms 的块'],
            rows.map(({ name, report }) => [
                name,
                ms(report.extra.totalMs),
                report.extra.chunks,
                ms(report.extra.longestBlock),
                ms(report.extra.firstContentMs),
                report.extra.blocks
                    ? report.extra.blocks.filter(b => b > 50).length
                    : report.extra.longestBlock > 50
                    ? 1
                    : 0
            ])
        )
    )

    console.log(section('三个数字分别在说什么'))
    for (const { name, report } of rows) {
        console.log(
            `[${name}] 总耗时 ${ms(report.extra.totalMs)} · 最长同步块 ${ms(report.extra.longestBlock)} · 首屏可见 ${ms(
                report.extra.firstContentMs
            )}`
        )
    }

    const [sync, chunked] = rows
    if (sync && chunked) {
        console.log(
            `\n结论：切片版总耗时更长（多 ${ms(
                chunked.report.extra.totalMs - sync.report.extra.totalMs
            )}，因为每次结算布局都有固定开销），`
        )
        console.log(
            `但最长同步块从 ${ms(sync.report.extra.longestBlock)} 降到 ${ms(chunked.report.extra.longestBlock)}，`
        )
        console.log(
            `首屏可见耗时从 ${ms(sync.report.extra.firstContentMs)} 降到 ${ms(
                chunked.report.extra.firstContentMs
            )}——用户不用等全部渲染完。`
        )
    }

    console.log(section('「最长同步块」为什么是最该看的数'))
    console.log('- 浏览器只有在同步块结束后才有机会做样式计算和绘制，块有多长，用户就冻多久')
    console.log('- 超过 50ms 的块会被记为长任务（long task），是 INP 恶化的直接原因')
    console.log(
        '- 总耗时变长一点没关系，只要没有长块，交互就能一直跟手；反过来，总耗时再短，一个 300ms 的块也会让点击「没反应」'
    )

    console.log(section('为什么切片用 MessageChannel 而不是 Promise'))
    console.log('- 微任务（Promise.then）在当前宏任务结束前会全部跑完，让不出渲染机会')
    console.log('- MessageChannel 的回调是宏任务，浏览器能在两个宏任务之间插入样式计算与绘制')
    console.log('- requestIdleCallback 也能切，但它可能长时间不被调用，不适合「尽快出首屏」')
}
