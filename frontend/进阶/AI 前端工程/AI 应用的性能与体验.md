# AI 应用的性能与体验

前两篇解决了「怎么把流接进来、怎么把输出变可靠」，这一篇解决最后一公里：**用户在等待的几秒里发生了什么、这一次调用花了多少钱、以及失败时页面长什么样**。全部结论同样来自 `ai-lab` 探针的可实测模型。

## 一、首 token 延迟（TTFT）：拆开才知道该优化谁

「模型慢」往往是个错觉——TTFT 由三段构成，其中只有两段前端能影响：

> 摘自 `./code/ai-lab/perf.cjs`

```js
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
  console.log(`[1] TTFT：${before.total}ms → ${after.total}ms（连接复用省 80ms、prompt 8k→2k 省 6ms；排队段前端改不动）`)
}
```

实测 428ms → 342ms。三段的优化空间并不对等：

| 段 | 谁决定 | 前端能做的 |
| --- | --- | --- |
| 排队 | 服务端负载 | 几乎没有（可换时段/换模型档位） |
| 网络 | 链路 | 连接复用、边缘节点、避免多余握手 |
| prefill | prompt 长度 | 上下文压缩、system 精简（见上一篇装配策略） |

前端真正能左右的是**感知**：把「无反馈的等待」用骨架屏、思考动画、上游进度（检索中/生成中）填掉。人等的是「有没有动静」，不是毫秒数。

## 二、流式体验：flush 合帧

token 每秒到几十个，来一个就改一次 DOM 等于每帧多次重排。按帧合并即可，成本极低、收益极高：

> 摘自 `./code/ai-lab/perf.cjs`

```js
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
  console.log(`[2] flush 合帧：600 token 的 DOM 更新 ${naive} 次 → ${batched} 次（约 ${((batched / naive) * 100).toFixed(0)}%）`);
}
```

实测：600 次 DOM 更新压到 150 次（约 25%）。配合第一篇的半开代码块状态机，流式渲染的完整策略是三条：**按帧合批 flush、半开代码块按住不发、只对新增节点做增量更新**（已渲染的段落不再重新 parse Markdown）。

## 三、成本：前缀缓存与上下文压缩

AI 功能的成本是「每次调用都在烧钱」，且随上下文长度线性上涨。两招最有效：**前缀缓存**（system + 固定文档前缀命中缓存，按折扣计）和**上下文压缩**（少喂无用 token）：

> 摘自 `./code/ai-lab/perf.cjs`

```js
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
  console.log(`[3] 单次成本：基线 ${base.toFixed(4)} → 前缀缓存 ${withCache.toFixed(4)} → 上下文压缩+缓存 ${compressed.toFixed(4)}`);
}
```

实测单次成本 0.0390 → 0.0228（前缀缓存）→ 0.0185（再叠加上下文压缩），合计省掉一半以上。注意前缀缓存生效的前提是**前缀字节级稳定**：把时间戳、随机 ID、乱序的检索片段放在 system 前面，缓存就全废了。

## 四、降级阶梯：失败时页面长什么样

超时、限流、超预算都会发生。最差的设计是「空白页 + 一直转圈」——用户不知道是慢、是错、还是要重来：

> 摘自 `./code/ai-lab/perf.cjs`

```js
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
```

四档阶梯：full（正常）→ lite（排队久，切小模型先出结论）→ short（预算紧，压缩上下文+限输出长度）→ static（不可达，静态兜底 + 重试入口）。降级必须**可见**：界面上明确告知「当前用的是快速模式」，否则用户会把它当质量问题。

## 五、该盯哪些指标

传统 Web 指标（LCP/INP）在 AI 应用里不够用，需要补一组流式专属指标：

| 指标 | 定义 | 为什么重要 |
| --- | --- | --- |
| TTFT | 点击 → 首字出现 | 决定"卡不卡"的第一印象 |
| TPOT | 每个输出 token 的平均间隔 | 决定打字机是否顺滑（>50ms 会明显一顿一顿） |
| 完成率 | 请求跑到结束的比例 | 中断/超时/报错都算未完成 |
| abort 率 | 用户主动停止的比例 | 高 abort 通常说明首字太慢或内容不对路 |
| 单位成本 | 每会话 token / 金额 | 决定功能能不能规模化 |

这些都进监控（见 `监控与稳定性` 模块）：TTFT 看 P90 而不是均值，abort 率按 prompt 版本分组——它是 prompt 质量最敏感的晴雨表。

## 工程含义清单

- TTFT 拆三段：队列（改不动）、网络（连接复用/边缘）、prefill（压缩上下文）；感知优化靠骨架屏与进度反馈。
- 流式渲染三件套：按帧合批 flush（600→150 次）、半开代码块按住、只增量更新新增节点。
- 成本两招：前缀缓存（前提是前缀字节级稳定）+ 上下文压缩；实测合计省一半以上。
- 降级四档 full/lite/short/static，降级必须对用户可见。
- 监控补 TTFT(P90)、TPOT、完成率、abort 率、单位成本。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/perf.cjs` | TTFT 分解 / flush 合帧 / 成本模型 / 降级阶梯 | 一、二、三、四 |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试 | 二 |
| `./code/ai-lab/gen.cjs` | 结构化输出 / 上下文装配 / token 估算 | 一、三 |
| `./code/ai-lab/wasm.cjs` | 端侧推理相关探针（上一篇引用） | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[端侧推理与 WASM](./端侧推理与%20WASM.md)
- 参考：[MDN: Performance API](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance_API) · [OpenAI Prompt caching](https://platform.openai.com/docs/guides/prompt-caching) · [监控与稳定性（本站模块）](../监控与稳定性/总结.md)
