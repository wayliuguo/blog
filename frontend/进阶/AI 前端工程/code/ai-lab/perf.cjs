// perf.cjs — AI 应用性能与体验探针：TTFT 分解 / flush 合帧 / 成本模型 / 降级阶梯
'use strict'
const assert = require('node:assert')

// ---------- 场景一：TTFT 分解——谁在拖慢第一个字 ----------
// 用户感知的"卡"是从点击到屏幕上出现第一个字。拆成三段才知道该优化谁。
function ttft({ queue, network, promptTokens, prefillPer1k = 1 }) {
    const prefill = (promptTokens / 1000) * prefillPer1k // prefill 与 prompt 长度成正比
    return { queue, network, prefill, total: queue + network + prefill }
}

{
    const before = ttft({ queue: 300, network: 120, promptTokens: 8000 })
    // 优化：连接复用省网络、上下文压缩省 prefill
    const after = ttft({ queue: 300, network: 40, promptTokens: 2000 })
    assert.equal(before.total, 428)
    assert.equal(after.total, 342)
    assert.ok(after.total < before.total)
    console.log(
        `[1] TTFT：${before.total}ms → ${after.total}ms（连接复用省 80ms、prompt 8k→2k 省 6ms；排队段前端改不动）`
    )
}

// ---------- 场景二：flush 合帧——把 N 次 DOM 更新压到帧数级别 ----------
// token 每秒到几十个，来一个更新一次 DOM 等于每帧多次重排。按帧合并即可。
function countFlushes(tokenCount, intervalMs = 5, frameMs = 16.7) {
    let flushes = 0
    let nextFlushAt = 0
    for (let i = 0; i < tokenCount; i++) {
        const now = i * intervalMs
        if (now >= nextFlushAt) {
            flushes++
            nextFlushAt = now + frameMs
        }
    }
    return flushes
}

{
    const tokens = 600 // 一次回答 600 个 token，约每 5ms 一个
    const naive = tokens // 无节流：来一个更新一次
    const batched = countFlushes(tokens)
    assert.ok(batched < naive / 1.5)
    console.log(
        `[2] flush 合帧：600 token 的 DOM 更新 ${naive} 次 → ${batched} 次（约 ${((batched / naive) * 100).toFixed(
            0
        )}%）`
    )
}

// ---------- 场景三：成本模型——前缀缓存与上下文压缩 ----------
// 计费 = 输入 token × 输入单价 + 输出 token × 输出单价；命中的前缀按折扣计。
function cost({ input, output, priceIn = 0.003, priceOut = 0.015, cached = 0 }) {
    // 单价单位示意：元 / 1k token
    const billableInput = Math.max(0, input - cached) + cached * 0.1
    return (billableInput / 1000) * priceIn + (output / 1000) * priceOut
}

{
    const base = cost({ input: 8000, output: 1000 })
    const withCache = cost({ input: 8000, output: 1000, cached: 6000 })
    const compressed = cost({ input: 2500, output: 1000, cached: 1500 })
    assert.ok(withCache < base)
    assert.ok(compressed < withCache)
    console.log(
        `[3] 单次成本：基线 ${base.toFixed(4)} → 前缀缓存 ${withCache.toFixed(
            4
        )} → 上下文压缩+缓存 ${compressed.toFixed(4)}`
    )
}

// ---------- 场景四：降级阶梯——失败时的体验底线 ----------
// 超时/限流/超预算时按阶梯退让，永远不出现"空白页 + 一直转圈"。
function degrade(state) {
    if (!state.reachable) return { tier: 'static', hint: '静态兜底答案 + 重试入口' }
    if (state.queueMs > 3000) return { tier: 'lite', hint: '切小模型，先出结论' }
    if (state.budgetExhausted) return { tier: 'short', hint: '压缩上下文，限制输出长度' }
    return { tier: 'full', hint: '正常链路' }
}

{
    assert.equal(degrade({ reachable: true, queueMs: 200, budgetExhausted: false }).tier, 'full')
    assert.equal(degrade({ reachable: true, queueMs: 5000, budgetExhausted: false }).tier, 'lite')
    assert.equal(degrade({ reachable: false, queueMs: 0, budgetExhausted: false }).tier, 'static')
    console.log('[4] 降级阶梯：full → lite（切小模型）→ short（限上下文）→ static（静态兜底）')
}

console.log('perf.cjs 全部通过')
