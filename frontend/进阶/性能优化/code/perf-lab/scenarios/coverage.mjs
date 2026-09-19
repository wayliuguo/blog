/**
 * 场景：构建产物的取用范围——整包引入 vs 只 import 用到的
 * 运行：npm run coverage
 */
import { sweep, title, section, table, ms, bytes } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/coverage.html', [
        { name: '整包引入', query: { mode: 'full' }, rounds: 3 },
        { name: '按需引入', query: { mode: 'split' }, rounds: 3 }
    ])

    console.log(title('10 个特性、每个 5KB，页面只用到 3 个（3 轮中位数）'))
    console.log(
        table(
            ['引入方式', '请求的 chunk 数', '实际拿到的特性', 'JS 传输字节', '加载耗时'],
            rows.map(({ name, report }) => [
                name,
                report.extra.chunks,
                `${report.extra.usedLoaded} / ${report.extra.used}`,
                bytes(report.extra.jsBytes),
                ms(report.extra.loadMs)
            ])
        )
    )

    console.log(section('浪费掉的那部分就是「代码覆盖率」在说的东西'))
    const [full, split] = rows
    if (full && split) {
        const wasted = full.report.extra.jsBytes - split.report.extra.jsBytes
        console.log(`- 整包版一次把 10 个特性都下下来，页面只用 3 个，另外 7 个 = ${bytes(wasted)} 的无效下载`)
        console.log(`- 按需版只下用到的 3 个，覆盖率 100%`)
    }

    console.log(section('三个层级的「按需」'))
    console.log('1. 入口级：路由懒加载（见 lazy 场景），把首屏不需要的页面整块切走')
    console.log('2. 模块级：import 写到函数里，配合 tree-shaking，把没被引用的导出摇掉')
    console.log('3. 依赖级：第三方库用按需引入（如组件库只引 Button），或换成体积更小的替代（moment → dayjs）')
    console.log('\n怎么确认：DevTools Coverage 面板会标出每个文件「已用 / 总字节」，红色部分就是可以砍掉的。')
}
