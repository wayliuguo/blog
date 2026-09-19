/**
 * 场景 perf：性能与体验监控（RUM 侧采集）
 *   1. headless Chrome 打开 perf-lab.html，逐项看采集到的指标
 *   2. 口径对照：cls（剔除 hadRecentInput）与 clsRaw 的差别
 *   3. TBT 的算法：长任务只统计超出 50ms 的部分（页面里塞了 140ms 的同步循环）
 *   4. 上报体积：这一批事件序列化后多大（监控本身不能成为性能问题）
 * 运行：npm run perf
 */
import { PERF_THRESHOLDS, ratePerf } from '../sdk/perf.mjs'
import { startCollector, stopCollector, openChrome, closeChrome, waitFor, table, title, section, ms, runAsMain } from '../harness.mjs'

export default async function run() {
  const collector = await startCollector()
  const chrome = openChrome(`http://127.0.0.1:${collector.port}/perf-lab.html`)
  console.log(title('场景 · 性能与体验监控（headless Chrome 实跑）'))

  try {
    const data = await waitFor(collector.port, (d) => d.events.some((e) => e.kind === 'lab-done'), { timeout: 25000 })
    const m = data.events.find((e) => e.kind === 'perf')
    const rate = ratePerf(m)

    console.log(section('采集到的指标：值 / 阈值 / 评级（Core Web Vitals 官方口径）'))
    console.log(table(['指标', '含义', '实测值', '良好阈值', '评级'], [
      ['ttfb', '首字节时间', ms(m.ttfb), `≤ ${PERF_THRESHOLDS.ttfb} ms`, rate.ttfb],
      ['fcp', '首次内容绘制', ms(m.fcp), `≤ ${PERF_THRESHOLDS.fcp} ms`, rate.fcp],
      ['lcp', '最大内容绘制', ms(m.lcp), `≤ ${PERF_THRESHOLDS.lcp} ms`, rate.lcp],
      ['cls', '累计布局偏移（规范口径）', m.cls.toFixed(4), `≤ ${PERF_THRESHOLDS.cls}`, rate.cls],
      ['tbt', '总阻塞时间', ms(m.tbt), `≤ ${PERF_THRESHOLDS.tbt} ms`, rate.tbt],
    ]))

    console.log(section('口径对照：cls 与 clsRaw 什么时候不一样'))
    console.log(table(['字段', '算法', '本次实测', '说明'], [
      ['clsRaw', '累加全部 layout-shift', m.clsRaw.toFixed(4), '把「用户操作引起的位移」也算进来'],
      ['cls', '只累加 !hadRecentInput 的位移', m.cls.toFixed(4), 'Core Web Vitals 的规范口径'],
      ['差值', 'clsRaw - cls', (m.clsRaw - m.cls).toFixed(4), m.clsRaw > m.cls ? '本次有位移被 hadRecentInput 排除' : '本次位移没有紧跟用户输入，两者相同'],
    ]))
    console.log('  规范规定：输入事件前 500ms 内发生的位移不算 CLS。')
    console.log('  单机实验里很难稳定复现这一分支，但真实站点上「点击后弹横幅把内容顶下去」就会只出现在 clsRaw 里。')

    console.log(section('长任务与 TBT：TBT 只算超出 50ms 的部分'))
    console.log(table(['指标', '实测值', '算法说明'], [
      ['longtasks', m.longtasks, 'performance 条目数（页面里塞了 1 次 140ms 的同步循环）'],
      ['tbt', ms(m.tbt), 'Σ max(0, duration - 50)，所以 140ms 的任务贡献约 90ms'],
    ]))

    const bytes = Buffer.byteLength(JSON.stringify(data.events))
    console.log(section('上报体积：监控不能自己变成性能问题'))
    console.log(table(['项', '数值'], [
      ['事件条数', data.events.length],
      ['批量序列化后', `${bytes} B`],
      ['单条平均', `${Math.round(bytes / data.events.length)} B`],
      ['说明', '一次 flush 的体积应该远小于一个业务接口响应'],
    ]))
  } finally {
    closeChrome(chrome)
    stopCollector(collector)
  }
}

runAsMain(import.meta.url, run)
