/**
 * 场景：内存泄漏——同样的分配次数，留引用 vs 可回收
 * 需要 --enable-precise-memory-info，否则 performance.memory 的粒度是 100KB 级、看不出趋势
 * 运行：npm run memory
 */
import { sweep, title, section, table } from '../harness/index.mjs'

const FLAGS = ['--enable-precise-memory-info']
const mb = (kb) => (kb == null ? '—' : `${(kb / 1024).toFixed(1)} MB`)

export default async function run() {
    const rows = await sweep(
        '/memory.html',
        [
            { name: '留引用（泄漏）', query: { mode: 'leak' }, rounds: 3, flags: FLAGS },
            { name: '可回收（正常）', query: { mode: 'clean' }, rounds: 3, flags: FLAGS }
        ]
    )

    const precise = rows.every(({ report }) => report.extra.precise)
    console.log(title('内存增长：60 轮 × 2000 个对象 × 512B（3 轮中位数）'))
    console.log(
        table(
            ['模式', '第 10% 处堆', '末轮堆', '峰值堆', '净增长', '留下的引用'],
            rows.map(({ name, report }) => [
                name,
                mb(report.extra.first),
                mb(report.extra.last),
                mb(report.extra.peak),
                mb(report.extra.growth),
                report.extra.kept
            ])
        )
    )

    console.log(section('为什么两个值会分叉'))
    console.log('- 留引用版：每轮的数组都塞进 window.__leakedBags，只要页面不关，V8 就认为它们还有用 → 堆只涨不落')
    console.log('- 可回收版：数组出了函数作用域就没人引用，分配压力上来时 V8 触发 GC 把它们收走 → 堆在一条水平线附近波动')
    console.log('\n同样的分配次数，同样的数据，差别只在「还有没有引用指向它」。')

    if (!precise) {
        console.log('\n注意：拿不到 performance.memory（需要 Chromium 且带 --enable-precise-memory-info），上面的值是粗略的。')
    }

    console.log(section('真实项目里怎么查'))
    console.log('- DevTools Memory 面板：先打一次堆快照 → 反复操作要排查的动作 → 再打一次 → 选 Comparison 看哪些对象只增不减')
    console.log('- Detached DOM：筛 "Detached" 关键字，能看到「已经不在页面里、但被 JS 引用着」的节点')
    console.log('- Allocation instrumentation on timeline：录一段操作，蓝色条是新增分配，灰色条是已被回收，全是蓝的说明泄漏')
}
