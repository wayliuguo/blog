# LLM 应用前端形态

> 统一业务场景：智能客服助手（见[全景](./全景.md)）。本篇实战层绑定真实工程 `code/chat-ui/`（真实 DeepSeek 流式实测）；探针 `code/ai-lab/sse.cjs` 负责机制级的恶劣分包验证。

## 一、入门：对话式 UI——一种新的交互范式

传统表单的三个前提在对话式 UI 里全部失效：

| 维度 | 表单 UI | 对话式 UI |
| --- | --- | --- |
| 响应长度 | 确定（一个对象） | 不确定（token 流，可能中途停止） |
| 响应时间 | 一次往返 | 首 token 延迟 + 持续生成 |
| 结果正确性 | 由后端保证 | 模型可能胡编，前端要做兜底与澄清 |
| 用户操作 | 提交后等待 | 随时打断、随时追加、随时重新生成 |

由此派生出前端必须处理的三件事：**流式渲染**（token 到一个画一个）、**可中断**（用户点停止，链路立刻停）、**可重试**（网络断了或限流了，退避后重发）。这三件事恰好对应探针的三个场景。

## 二、核心机制

### 2.1 SSE vs WebSocket：LLM 场景的传输选型

打字机效果只需要「服务端 → 客户端」的单向文本推送，SSE（Server-Sent Events）就是为这个场景设计的：

| 能力 | SSE | WebSocket |
| --- | --- | --- |
| 方向 | 单向（服务端→客户端） | 双向 |
| 协议 | 普通 HTTP，可过一切代理/网关 | 升级协议，部分网关不支持 |
| 数据 | 文本（每条消息一组 `data:` 行） | 文本 + 二进制 |
| 断线重连 | 浏览器自动重连 + `Last-Event-ID` 续传 | 全靠手写 |
| 适用场景 | LLM 文本流、通知推送 | 实时协作、语音流、双向状态同步 |

结论：**纯文本生成用 SSE，需要双向或二进制（语音、多端协同）才上 WebSocket**。请求侧用 `fetch` + `ReadableStream` 手工消费（比 `EventSource` 多拿到 POST 能力与中断能力）。

### 2.2 SSE 解析器：换行才是唯一的事件边界

一个常见的错误假设是「一个 chunk 就是一个事件」。实际上网络分包是按 TCP 报文切分的：一行 `data:` 可能被劈成两半，两个事件可能挤在同一个 chunk 里。解析器唯一可靠的分帧依据是换行符——攒 buffer，见到 `\n` 才吐出一行：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// 网络不会按"事件"分包：一个 data: 行可能被切成两半，两个事件可能挤进同一个 chunk。
// 唯一可靠的分帧依据是换行符：攒 buffer，见到 \n 才吐出一行。
function createSseParser() {
  let buf = ''
  const events = []
  return {
    feed(chunk) {
      buf += chunk
      let idx
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx)
        buf = buf.slice(idx + 1)
        if (line.startsWith('data:')) events.push(line.slice(5).trim())
      }
    },
    events,
    pending: () => buf // 不完整的行留在缓冲区，等下一个 chunk
  }
}
```

拿两种最恶劣的分包方式验证：逐字节到达、以及把一行从中间劈开——事件都必须完整还原：

> 摘自 `./code/ai-lab/sse.cjs`

```js
{
  const wire = 'data: {"t":"你"}\n\ndata: {"t":"好"}\n\ndata: {"t":"！"}\n\ndata: [DONE]\n\n'
  const parser = createSseParser()
  // 恶劣分包一：每个字节一片
  for (const ch of wire) parser.feed(ch)
  assert.deepEqual(parser.events, ['{"t":"你"}', '{"t":"好"}', '{"t":"！"}', '[DONE]'])
  assert.equal(parser.pending(), '')
  // 恶劣分包二：两个事件挤一片，且 data 行被从中间劈开
  const p2 = createSseParser()
  p2.feed('data: {"t":"你"}\n\ndata: {"t"')
  p2.feed(':"好"}\n\ndata: {"t":"！"}\n\ndata: [DONE]\n\n')
  assert.equal(p2.events.length, 4)
  assert.equal(p2.pending(), '')
  console.log('[1] SSE 分帧：逐字节与撕裂分包都能完整还原 4 个事件，无粘连无截断')
}
```

两个工程细节值得写死在团队规范里：其一，`pending()` 里没吐完的残行**不能丢**，网络流随时可能停在某半行；其二，收到 `data: [DONE]` 是协议层的结束信号，与 `reader.read()` 返回 `done` 是两个独立的终止条件，都要处理。

### 2.3 流式渲染：半开代码块状态机

token 流式到达时，Markdown 渲染有一个隐蔽的坑：``` 代码围栏可能迟迟不闭合，此刻围栏内的代码语法一旦被当作正文渲染出去，页面会出现半秒的「语法乱码闪烁」，下一个 token 到达后又跳回正常。正确做法是检测 fence 奇偶性：**奇数个围栏意味着存在半开代码块，增量先按住不发**：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// token 一个个到达时，``` 围栏可能迟迟不闭合。
// 半开期间必须把代码内容"按住"，否则代码语法会被当作正文渲染出去。
function createFenceGuard() {
  let text = '' // 已收到的全部内容
  let released = '' // 已确认渲染出去的内容
  let held = 0 // 因半开代码块被按住的 push 次数
  return {
    push(delta) {
      text += delta
      const fences = text.split('```').length - 1
      if (fences % 2 === 1) { held++ return } // 奇数个 fence => 存在半开块
      released = text // 全部闭合才整体放行
    },
    stats: () => ({ held, released })
  }
}
```

实测：半开期间按住了 2 次增量，闭合后才整体放行——代码内容从未以「正文」形态漏出去。生产实现还会在这之上叠一层：按 rAF 合帧（见《AI 应用的性能与体验》）。

### 2.4 中断与重试

中断的前端语义只有一句话：**立刻停止渲染、保留已收内容**。服务端是否停止生成、是否计费，是服务端的事，前端控制不了：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// AbortController 的前端语义：立刻停止渲染、保留已收内容。
// 服务端是否停止生成（是否计费）是服务端的事，前端控制不了。
function simulateStream(tokens, abortAt) {
  const received = []
  let aborted = false
  tokens.forEach((t, i) => {
    if (i === abortAt) aborted = true // 用户在第 abortAt 个 token 前点了停止
    if (!aborted) received.push(t)
  })
  return { received, aborted }
}
```

重试则要同时防两个坑——**无退避的重试风暴**（限流时所有客户端同时打回去，雪上加霜）和**无幂等键的重复计费**（同一次提问被计两次 token）：退避序列 300ms 起步、翻倍、8 秒封顶（`backoffDelay`，实测 `[300, 600, 1200, 2400, 4800, 8000]`），真实实现再加随机抖动；幂等键在前端生成、贯穿一次逻辑请求的所有重试，由服务端按键去重。

## 三、实战：chat-ui 真实工程

`code/chat-ui/`（零依赖 Node + 原生浏览器页）是上面所有机制的落地：服务端转发真实 DeepSeek 流式接口（`.env` 配 `DEEPSEEK_API_KEY`，无 key 回退本地 mock），前端页面一次性接齐 fetch 流消费、换行分帧、fence 守卫、rAF 合帧、停止按钮五件事。核心消费循环：

> 摘自 `./code/chat-ui/public/index.html`

```js
        // 网络不会按「事件」分包：一行 data: 可能被切成两半。
        // 唯一可靠的分帧依据是换行符——攒 buffer，见到 \n 才吐出一行。
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let idx
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx)
            buf = buf.slice(idx + 1)
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (payload === '[DONE]') continue // 协议结束信号（与流关闭是两个独立终止条件）
            try {
              const delta = JSON.parse(payload).choices[0].delta.content
              if (delta) {
                guard.push(delta)
                scheduleRender(bubble, () => guard.released) // 半开期间显示的是上一次放行的内容
              }
            } catch { /* 心跳或非 JSON 行跳过 */ }
          }
        }
```

**实测读数（2026-10-14，真实 DeepSeek 端点）**：

- `curl POST /api/chat` 逐 token 收到真实 chunk 流（`delta.content` 每 1~2 字符一片，token 级流式）；
- headless Chrome 打开页面点击发送，约 25 秒收全回答：2 条消息气泡、助手气泡渲染出完整中文答复（SSE 概念解释）、停止按钮回到可用态、无异常；
- 渲染走的是「fence 守卫 + rAF 合帧」链路——`scheduleRender` 保证一帧最多一次 DOM 更新。

跑工程（需先配 key）：

```
cd code/chat-ui
copy .env.example .env   :: 粘 DEEPSEEK_API_KEY（留空则 mock）
npm start                :: http://127.0.0.1:3121
```

## 四、对比与适用边界

- **SSE 是 LLM 文本流的默认选型**：单向、过网关、自动重连续传；双向/二进制需求才用 WebSocket；
- **EventSource vs fetch 流**：EventSource 只能 GET、不能带 body、不能主动 abort；`fetch + ReadableStream` 是 LLM 场景的标配写法；
- **守卫的代价**：fence 按住意味着半开期间用户看到的内容「落后」于实际接收——这是正确性与即时性的交换，永远选正确性；
- **中断的边界**：abort 只保证前端停止渲染；计费与否看服务端实现，「停止按钮能省钱」是常见误解。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试退避 | 二 |
| `./code/ai-lab/gen.cjs` | 结构化输出 / 上下文装配 / token 估算（下一篇引用） | — |
| `./code/ai-lab/wasm.cjs` | 端侧推理探针（端侧篇引用） | — |
| `./code/ai-lab/perf.cjs` | 性能与成本探针（性能篇引用） | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |
| `./code/chat-ui/public/index.html` | 流式消费循环（真实工程） | 三 |
| `./code/chat-ui/server.cjs` | SSE 转发服务（真实/mock 双模式） | 三 |

## 参考

- 本模块地图：[全景](./全景.md)
- 本模块总结：[总结](./总结.md)
- 下一篇：[AI 与前端工程结合](./AI%20与前端工程结合.md)
- 参考：[MDN: Server-sent events](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events) · [MDN: AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController) · [OpenAI Streaming 指南](https://platform.openai.com/docs/guides/streaming)
