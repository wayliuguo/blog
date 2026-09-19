/**
 * 场景：把一次页面加载的资源画成瀑布图（Network 面板的文本版）
 * 起点统一到导航开始，每根横条的长度正比于该资源的耗时
 * 运行：npm run waterfall
 */
import { sweep, title, section, table, ms, bytes, timeline } from '../harness/index.mjs'

/** 把 /slow?ms=250&kb=200&name=hero.svg 压成一眼能认的名字 */
function label(url) {
    const name = url.split('name=').pop()
    const delay = url.match(/ms=(\d+)/)
    return (delay ? `slow ${delay[1]}ms · ` : '') + name
}

export default async function run() {
    const rows = await sweep('/metrics.html', [
        { name: '轻量首屏', query: { mode: 'light' }, rounds: 3 },
        { name: '未治理首屏', query: { mode: 'heavy' }, rounds: 3 }
    ])

    for (const { name, report } of rows) {
        const total = Math.max(report.metrics.load, 100)
        const items = report.resources.map((r) => ({ label: label(r.name).slice(0, 23), start: r.start, duration: r.duration }))

        console.log(title(`资源瀑布 · ${name}（横轴 0 → ${ms(total)}）`))
        console.log(items.length ? timeline(items, total) : '（没有资源）')

        console.log(section('明细（按开始时间排序）'))
        console.log(
            table(
                ['资源', '发起方', '开始', '耗时', '传输字节'],
                [...report.resources]
                    .sort((a, b) => a.start - b.start)
                    .map((r) => [label(r.name), r.type, ms(r.start), ms(r.duration), bytes(r.size)])
            )
        )
    }

    console.log(section('读法'))
    console.log('- 横条的起点是「开始请求」的时刻，长度是「下载 + 排队」的耗时，不是字节数')
    console.log('- 同类资源一起起跑说明它们被并行调度；某根条明显靠右，说明它被前面的资源挡住了（关键渲染路径）')
    console.log('- 资源条普遍很晚才起跑，通常意味着 HTML 太大或有一个阻塞解析的脚本')
    console.log(`\n共 ${rows.length} 组对照，每组取 3 轮中位数。`)
}
