/**
 * 场景：长列表的两笔账——排序这次交互多久出下一帧、滚动时主线程被占多少
 * 运行：npm run spa:list
 */
import { sweep, title, section, table, ms } from '../harness/index.mjs'

export default async function run() {
    console.log(title('2000 条订单，点「按分数排序」这一下（3 轮中位数）'))
    const sortRows = await sweep('/spa/index.html', [
        { name: '全量渲染 + 同步计算', query: { act: 'sort', n: 2000 }, rounds: 3 },
        { name: '虚拟滚动 + 同步计算', query: { act: 'sort', n: 2000, virtual: '1' }, rounds: 3 },
        {
            name: '虚拟滚动 + 分片计算',
            page: '/spa/optimized.html',
            query: { act: 'sort', n: 2000, opt: '1' },
            rounds: 3
        }
    ])

    console.log(
        table(
            ['组合', '交互到下一帧', '实际渲染行数', '这段新增长任务', '最长的一个', 'DOM 节点'],
            sortRows.map(({ name, report }) => [
                name,
                ms(report.extra.sortMs),
                report.extra.sortRows,
                report.extra.newTasks,
                ms(report.extra.longestTask),
                report.extra.domNodes
            ])
        )
    )

    console.log(section('两个开关各自解决什么'))
    console.log('- 虚拟滚动省的是「渲染」：不管数据多少，DOM 里始终只有视窗内那十几行，')
    console.log('  重排/重绘的代价从 O(全量) 变成 O(视窗)。')
    console.log('- 分片计算省的是「算」：排序和聚合不再一口气占住主线程，')
    console.log('  代价是总耗时会变长（片间要让出去），换来的是没有长任务、输入还能响应。')
    console.log('- 两个一起开，DOM 节点从一万掉到一百，长任务也归零。')

    console.log(title('滚动 30 屏：2000 行全量渲染，两种滚动回调（3 轮中位数）'))
    const scrollRows = await sweep('/spa/index.html', [
        { name: '每个 scroll 都逐行读写', query: { act: 'scroll', n: 2000, throttle: '0' }, rounds: 3 },
        { name: 'rAF 里只读一次、只写一次', query: { act: 'scroll', n: 2000, throttle: '1' }, rounds: 3 }
    ])
    console.log(
        table(
            ['滚动回调写法', '30 屏总耗时', '这段新增长任务', '最长的一个'],
            scrollRows.map(({ name, report }) => [
                name,
                ms(report.extra.scrollMs),
                report.extra.newTasks,
                ms(report.extra.longestTask)
            ])
        )
    )
    console.log(section('结论'))
    console.log('- scroll 事件的触发频率远高于屏幕刷新率。回调里「写完就读」会强制同步布局，')
    console.log('  逐行做就是每行一次强制布局，2000 行能直接把主线程焊死。')
    console.log('- 改法不是「少滚几次」，而是把读和写分开：读只在一帧开头的 rAF 里做一次，')
    console.log('  写集中到最后，中间不再读。')
}
