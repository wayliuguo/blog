/**
 * 一次跑完全部场景（npm run all）
 * 顺序：传输层 → 错误 → 性能 → 埋点 → 管道与告警
 * 每个场景自己起采集端、自己收尾，互不依赖
 */
import transport from './transport.mjs'
import errors from './errors.mjs'
import perf from './perf.mjs'
import track from './track.mjs'
import pipeline from './pipeline.mjs'
import { runAsMain } from '../harness.mjs'

export default async function run() {
  for (const [name, scene] of [['transport', transport], ['errors', errors], ['perf', perf], ['track', track], ['pipeline', pipeline]]) {
    console.log(`\n>>> 开始场景 ${name}`)
    await scene()
  }
}

runAsMain(import.meta.url, run)
