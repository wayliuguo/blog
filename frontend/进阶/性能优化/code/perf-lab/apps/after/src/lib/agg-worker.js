/**
 * 聚合搬进 Worker：主线程只负责发一条消息、收一条结果
 * `new Worker(new URL(...), { type: 'module' })` 是 vite 认得的写法，
 * 构建时会把这个文件单独打成一个 chunk，不会被塞进主包
 */
import { heavyAggregate } from './store.js'

self.onmessage = e => {
    const t0 = performance.now()
    const result = heavyAggregate(e.data.items)
    self.postMessage({ result, ms: Math.round(performance.now() - t0) })
}
