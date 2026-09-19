/**
 * 场景：同一段计算放主线程 vs 放 Web Worker，页面卡顿差多少
 * 运行：npm run worker
 */
import { sweep, title, section, table, ms, num } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/worker.html', [
        { name: '主线程计算', query: { mode: 'main' }, rounds: 3 },
        { name: 'Worker 计算', query: { mode: 'worker' }, rounds: 3 }
    ])

    console.log(title('1200 万次循环：放主线程 vs 放 Worker（3 轮中位数）'))
    console.log(
        table(
            ['做法', '页面感知耗时', '计算本身耗时', '最长帧间隔', '期间帧数'],
            rows.map(({ name, report }) => [
                name,
                ms(report.extra.workMs),
                report.extra.workerMs == null ? ms(report.extra.workMs) : ms(report.extra.workerMs),
                ms(report.extra.maxGap),
                report.extra.beats
            ])
        )
    )

    console.log(section('关键差异'))
    const [main, worker] = rows
    if (main && worker) {
        console.log(`- 主线程版：计算期间浏览器 ${ms(main.report.extra.maxGap)} 没能刷出一帧，页面直接冻住 ${
            ms(main.report.extra.maxGap)
        }`)
        console.log(`- Worker 版：计算挪到另一个线程，主线程最长只被挡住 ${ms(worker.report.extra.maxGap)}，期间照常出帧 ${worker.report.extra.beats} 次`)
        console.log(`- 计算本身并没有变快（都可能被机器负载影响），变的是「谁在被占用」`)
    }

    console.log(section('Worker 的两个边界'))
    console.log('- 通信要序列化：postMessage 传的是结构克隆，传大对象本身有成本，适合传「输入参数 / 结果」，不适合高频传大块数据')
    console.log('- Worker 里没有 DOM：只能做纯计算、数据处理、加解密、图片像素运算这类活')
}
