/**
 * 场景 track：埋点与行为分析
 *   headless Chrome 打开 track-lab.html：PV → 曝光（首屏 + 滚动到才出现）→ 点击 → 自定义事件 → 停留
 *   然后用 aggregateSession 把事件流汇成一张小看板
 * 运行：npm run track
 */
import { aggregateSession } from '../sdk/track.mjs'
import {
    startCollector,
    stopCollector,
    openChrome,
    closeChrome,
    waitFor,
    table,
    title,
    section,
    ms,
    runAsMain
} from '../harness.mjs'

export default async function run() {
    const collector = await startCollector()
    const chrome = openChrome(`http://127.0.0.1:${collector.port}/monitor-lab.html?scenario=track`, [
        '--window-size=1280,800'
    ])
    console.log(title('场景 · 埋点与行为分析（headless Chrome 实跑）'))

    try {
        const data = await waitFor(collector.port, d => d.events.some(e => e.kind === 'lab-done'), { timeout: 25000 })
        const done = data.events.find(e => e.kind === 'lab-done')
        const events = data.events.filter(e => e.type === 'track')
        const start = Math.min(...events.map(e => e.ts))

        console.log(section(`事件流：共 ${events.length} 条（页面注册了 ${done ? done.watched : '?'} 个曝光元素）`))
        console.log(
            table(
                ['T+Nms', '事件名', '标识', '附加字段'],
                events.map(e => [
                    `+${e.ts - start}`,
                    e.name,
                    e.id || e.url || '—',
                    e.stay != null
                        ? `stay=${e.stay}ms`
                        : e.keyword
                        ? `keyword=${e.keyword}`
                        : e.ref
                        ? `ref=${e.ref}`
                        : e.at != null
                        ? `at=${e.at}ms`
                        : '—'
                ])
            )
        )

        const board = aggregateSession(events, { id: events[0].sessionId })
        console.log(section('小看板：把事件流汇成可决策的数字'))
        console.log(
            table(
                ['口径', '数值', '说明'],
                [
                    ['PV', board.pv, '页面浏览量'],
                    ['UV', board.uv, '按匿名 ID 去重，单机演示恒为 1'],
                    ['曝光元素', board.expose, board.exposeIds.join(' / ')],
                    ['点击', board.click, board.clickIds.join(' / ')],
                    ['平均停留', ms(board.avgStay), '离开页面时结算'],
                    ['事件总数', board.total, '含自定义事件']
                ]
            )
        )

        // 漏斗：曝光过 CTA 的人里有多少真的点了
        const exposedHero = board.exposeIds.includes('hero-cta')
        const clickedHero = board.clickIds.includes('cta-hero')
        console.log(section('漏斗：从曝光到点击'))
        console.log(
            table(
                ['环节', '人数', '转化率'],
                [
                    ['曝光 hero-cta', exposedHero ? 1 : 0, '—'],
                    ['点击 cta-hero', clickedHero ? 1 : 0, exposedHero ? (clickedHero ? '100.0%' : '0.0%') : '—']
                ]
            )
        )
    } finally {
        closeChrome(chrome)
        stopCollector(collector)
    }
}

runAsMain(import.meta.url, run)
