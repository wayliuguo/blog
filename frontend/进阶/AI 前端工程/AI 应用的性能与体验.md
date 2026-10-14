# AI 应用的性能与体验

> 统一业务场景：智能客服助手（见[全景](./全景.md)）。本篇是全链路的体验层收口：TTFT 拆解、流式合帧、成本与降级；实战落点就是 `chat-ui` 工程已落地的流式渲染链路。探针 `code/ai-lab/perf.cjs`。

## 一、入门：用户感知的「卡」是点击到第一个字

「模型慢」往往是个错觉——用户感知的卡是从点击到屏幕上出现第一个字（TTFT），它由三段构成，其中只有两段前端能影响：

> 摘自 `./code/ai-lab/perf.cjs`

```js
// 用户感知的"卡"是从点击到屏幕上出现第一个字。拆成三段才知道该优化谁。
function ttft({ queue, network, promptTokens, prefillPer1k = 1 }) {
  const prefill = (promptTokens / 1000) * prefillPer1k // prefill 与 prompt 长度成正比
  return { queue, network, prefill, total: queue + network + prefill }
}
```

实测 428ms → 342ms（连接复用省网络 80ms、prompt 8k→2k 省 prefill 6ms）。三段的优化空间并不对等：

| 段 | 谁决定 | 前端能做的 |
| --- | --- | --- |
| 排队 | 服务端负载 | 几乎没有（可换时段/换模型档位） |
| 网络 | 链路 | 连接复用、边缘节点、避免多余握手 |
| prefill | prompt 长度 | 上下文压缩、system 精简（见《AI 与前端工程结合》装配策略） |

前端真正能左右的是**感知**：把「无反馈的等待」用骨架屏、思考动画、上游进度（检索中/生成中）填掉。人等的是「有没有动静」，不是毫秒数。

## 二、核心机制：流式体验与成本

### 2.1 flush 合帧

token 每秒到几十个，来一个就改一次 DOM 等于每帧多次重排。按帧合并即可，成本极低、收益极高——实测 600 次 DOM 更新压到 150 次（约 25%）。`chat-ui` 工程里的真实实现：

> 摘自 `./code/chat-ui/public/index.html`

```js
    // ── rAF 合帧：一帧最多渲染一次，逐 token 改 DOM 是重排灾难 ──
    let pendingRender = false
    function scheduleRender(el, getText) {
      if (pendingRender) return
      pendingRender = true
      requestAnimationFrame(() => {
        pendingRender = false
        el.textContent = getText()
      })
    }
```

配合第一篇的半开代码块守卫，流式渲染的完整策略是三条：**按帧合批 flush、半开代码块按住不发、只对新增节点做增量更新**（已渲染的段落不再重新 parse Markdown）。

### 2.2 成本：前缀缓存与上下文压缩

AI 功能的成本是「每次调用都在烧钱」，且随上下文长度线性上涨。计费 = 输入 token × 输入单价 + 输出 token × 输出单价，命中的前缀按折扣计。实测单次成本 0.0390 → 0.0228（前缀缓存 6000 token）→ 0.0185（再叠加上下文压缩），合计省掉一半以上。注意前缀缓存生效的前提是**前缀字节级稳定**：把时间戳、随机 ID、乱序的检索片段放在 system 前面，缓存就全废了。

### 2.3 降级阶梯：失败时页面长什么样

超时、限流、超预算都会发生。最差的设计是「空白页 + 一直转圈」——用户不知道是慢、是错、还是要重来。四档阶梯（探针实测）：

> 摘自 `./code/ai-lab/perf.cjs`

```js
// 超时/限流/超预算时按阶梯退让，永远不出现"空白页 + 一直转圈"。
function degrade(state) {
  if (!state.reachable) return { tier: 'static', hint: '静态兜底答案 + 重试入口' }
  if (state.queueMs > 3000) return { tier: 'lite', hint: '切小模型，先出结论' }
  if (state.budgetExhausted) return { tier: 'short', hint: '压缩上下文，限制输出长度' }
  return { tier: 'full', hint: '正常链路' }
}
```

full（正常）→ lite（排队久，切小模型先出结论）→ short（预算紧，压缩上下文+限输出长度）→ static（不可达，静态兜底 + 重试入口）。降级必须**可见**：界面上明确告知「当前用的是快速模式」，否则用户会把它当质量问题。

## 三、实战：把指标盯进监控

传统 Web 指标（LCP/INP）在 AI 应用里不够用，需要补一组流式专属指标：

| 指标 | 定义 | 为什么重要 |
| --- | --- | --- |
| TTFT | 点击 → 首字出现 | 决定"卡不卡"的第一印象 |
| TPOT | 每个输出 token 的平均间隔 | 决定打字机是否顺滑（>50ms 会明显一顿一顿） |
| 完成率 | 请求跑到结束的比例 | 中断/超时/报错都算未完成 |
| abort 率 | 用户主动停止的比例 | 高 abort 通常说明首字太慢或内容不对路 |
| 单位成本 | 每会话 token / 金额 | 决定功能能不能规模化 |

落进 `chat-ui` 这类工程的方式：在 `fetch` 前后与 `reader.read()` 循环里打点（`performance.now()`），TTFT 看 **P90** 而不是均值，abort 率按 prompt 版本分组——它是 prompt 质量最敏感的晴雨表；成本侧在服务端聚合（token 用量在响应的 `usage` 字段里）。埋点链路复用 `监控与稳定性` 模块的采集设施。

## 四、对比与适用边界

- **优化优先级**：感知优化（骨架屏/进度）> prompt 压缩 > 连接复用 > 排队（改不动）——按性价比排，先做不要钱的；
- **合帧的位置**：合帧在前端渲染层（rAF），不在传输层——SSE 该到就到，攒 buffer 是解析器的事（残行留 buffer），显示才是合帧的对象；
- **降级的顺序**：full → lite → short → static 按代价递增，跳级会让用户感知突兀；static 兜底答案必须预生成并随版本更新，否则「兜底」本身是过期信息；
- **成本的杠杆**：前缀缓存 > 上下文压缩 > 换便宜模型档位；前两者都在 prompt 工程侧，代码改动量最小。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/perf.cjs` | TTFT 分解 / flush 合帧 / 成本模型 / 降级阶梯 | 一、二 |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试 | 二 |
| `./code/ai-lab/gen.cjs` | 结构化输出 / 上下文装配 / token 估算 | 一、二 |
| `./code/ai-lab/wasm.cjs` | 端侧推理相关探针（上一篇引用） | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |
| `./code/chat-ui/public/index.html` | rAF 合帧真实实现 | 2.1 |

## 参考

- 本模块地图：[全景](./全景.md)
- 本模块总结：[总结](./总结.md) · 面试题：[面试题](./面试题.md)
- 上一篇：[端侧推理与 WASM](./端侧推理与%20WASM.md)
- 参考：[MDN: Performance API](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance_API) · [OpenAI Prompt caching](https://platform.openai.com/docs/guides/prompt-caching) · [监控与稳定性（本站模块）](../监控与稳定性/总结.md)
