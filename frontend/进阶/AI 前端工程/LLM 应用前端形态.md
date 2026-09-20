# LLM 应用前端形态

大模型把前端最熟悉的「表单 → 提交 → 响应」范式撕开了一道口子：请求的返回不再是确定长度的 JSON，而是一段**以 token 为单位、持续几秒到几十秒的不确定文本流**。这一篇把 LLM 应用前端的四件核心工事——对话式 UI、传输选型、流式解析、中断与重试——逐一拆开，并用 `ai-lab` 的零依赖探针把「SSE 为什么要按行分帧、半开代码块为什么不许渲染」变成可验证的结论。

## 一、对话式 UI：一种新的交互范式

传统表单的三个前提在对话式 UI 里全部失效：

| 维度 | 表单 UI | 对话式 UI |
| --- | --- | --- |
| 响应长度 | 确定（一个对象） | 不确定（token 流，可能中途停止） |
| 响应时间 | 一次往返 | 首 token 延迟 + 持续生成 |
| 结果正确性 | 由后端保证 | 模型可能胡编，前端要做兜底与澄清 |
| 用户操作 | 提交后等待 | 随时打断、随时追加、随时重新生成 |

由此派生出前端必须处理的三件事：**流式渲染**（token 到一个画一个）、**可中断**（用户点停止，链路立刻停）、**可重试**（网络断了或限流了，退避后重发）。这三件事恰好对应探针的三个场景。

## 二、SSE vs WebSocket：LLM 场景的传输选型

打字机效果只需要「服务端 → 客户端」的单向文本推送，SSE（Server-Sent Events）就是为这个场景设计的：

| 能力 | SSE | WebSocket |
| --- | --- | --- |
| 方向 | 单向（服务端→客户端） | 双向 |
| 协议 | 普通 HTTP，可过一切代理/网关 | 升级协议，部分网关不支持 |
| 数据 | 文本（每条消息一组 `data:` 行） | 文本 + 二进制 |
| 断线重连 | 浏览器自动重连 + `Last-Event-ID` 续传 | 全靠手写 |
| 适用场景 | LLM 文本流、通知推送 | 实时协作、语音流、双向状态同步 |

结论：**纯文本生成用 SSE，需要双向或二进制（语音、多端协同）才上 WebSocket**。SSE 的「自动重连 + 事件 ID 续传」在弱网移动端尤其值钱——这两件事用 WebSocket 都得自己写。

请求侧用 `fetch` + `ReadableStream` 手工消费即可（比 `EventSource` 多拿到 POST 能力与中断能力）：

> 示意片段（无配套脚本）

```
const controller = new AbortController();
const res = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
  signal: controller.signal,   // 用户点停止时 abort()
});
const reader = res.body.getReader();   // 之后按行解析，见下一节
```

## 三、SSE 解析器：换行才是唯一的事件边界

一个常见的错误假设是「一个 chunk 就是一个事件」。实际上网络分包是按 TCP 报文切分的：一行 `data:` 可能被劈成两半，两个事件可能挤在同一个 chunk 里。解析器唯一可靠的分帧依据是换行符——攒 buffer，见到 `\n` 才吐出一行：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// 网络不会按"事件"分包：一个 data: 行可能被切成两半，两个事件可能挤进同一个 chunk。
// 唯一可靠的分帧依据是换行符：攒 buffer，见到 \n 才吐出一行。
function createSseParser() {
  let buf = '';
  const events = [];
  return {
    feed(chunk) {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.startsWith('data:')) events.push(line.slice(5).trim());
      }
    },
    events,
    pending: () => buf, // 不完整的行留在缓冲区，等下一个 chunk
  };
}
```

拿两种最恶劣的分包方式验证：逐字节到达、以及把一行从中间劈开——事件都必须完整还原：

> 摘自 `./code/ai-lab/sse.cjs`

```js
{
  const wire = 'data: {"t":"你"}\n\ndata: {"t":"好"}\n\ndata: {"t":"！"}\n\ndata: [DONE]\n\n';
  const parser = createSseParser();
  // 恶劣分包一：每个字节一片
  for (const ch of wire) parser.feed(ch);
  assert.deepEqual(parser.events, ['{"t":"你"}', '{"t":"好"}', '{"t":"！"}', '[DONE]']);
  assert.equal(parser.pending(), '');
  // 恶劣分包二：两个事件挤一片，且 data 行被从中间劈开
  const p2 = createSseParser();
  p2.feed('data: {"t":"你"}\n\ndata: {"t"');
  p2.feed(':"好"}\n\ndata: {"t":"！"}\n\ndata: [DONE]\n\n');
  assert.equal(p2.events.length, 4);
  assert.equal(p2.pending(), '');
  console.log('[1] SSE 分帧：逐字节与撕裂分包都能完整还原 4 个事件，无粘连无截断');
}
```

两个工程细节值得写死在团队规范里：其一，`pending()` 里没吐完的残行**不能丢**，网络流随时可能停在某半行；其二，收到 `data: [DONE]` 是协议层的结束信号，与 `reader.read()` 返回 `done` 是两个独立的终止条件，都要处理。

## 四、流式渲染：半开代码块状态机

token 流式到达时，Markdown 渲染有一个隐蔽的坑：``` 代码围栏可能迟迟不闭合，此刻围栏内的代码语法一旦被当作正文渲染出去，页面会出现半秒的「语法乱码闪烁」，下一个 token 到达后又跳回正常。正确做法是检测 fence 奇偶性：**奇数个围栏意味着存在半开代码块，增量先按住不发**：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// token 一个个到达时，``` 围栏可能迟迟不闭合。
// 半开期间必须把代码内容"按住"，否则代码语法会被当作正文渲染出去。
function createFenceGuard() {
  let text = ''; // 已收到的全部内容
  let released = ''; // 已确认渲染出去的内容
  let held = 0; // 因半开代码块被按住的 push 次数
  return {
    push(delta) {
      text += delta;
      const fences = text.split('```').length - 1;
      if (fences % 2 === 1) { held++; return; } // 奇数个 fence => 存在半开块
      released = text; // 全部闭合才整体放行
    },
    stats: () => ({ held, released }),
  };
}

{
  const g = createFenceGuard();
  for (const delta of ['开场白。', '\n```js\n', 'const x = 1;', '\n```', '\n结尾。']) g.push(delta);
  const { held, released } = g.stats();
  assert.ok(held >= 2, '代码块未闭合期间应处于按住状态');
  assert.ok(released.includes('const x = 1;'));
  assert.ok(released.endsWith('结尾。'));
  console.log(`[2] 流式 Markdown：半开代码块期间按住 ${held} 次增量，闭合后整体放行，语法不外泄`);
}
```

实测：半开期间按住了 2 次增量，闭合后才整体放行——代码内容从未以「正文」形态漏出去。生产实现还会在这之上叠两层：按 rAF 合帧（每帧最多 flush 一次 DOM，避免逐 token 重排），以及对代码块内容做增量高亮（闭合后只对块内重新 tokenize）。

## 五、中断与重试

中断的前端语义只有一句话：**立刻停止渲染、保留已收内容**。服务端是否停止生成、是否计费，是服务端的事，前端控制不了：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// AbortController 的前端语义：立刻停止渲染、保留已收内容。
// 服务端是否停止生成（是否计费）是服务端的事，前端控制不了。
function simulateStream(tokens, abortAt) {
  const received = [];
  let aborted = false;
  tokens.forEach((t, i) => {
    if (i === abortAt) aborted = true; // 用户在第 abortAt 个 token 前点了停止
    if (!aborted) received.push(t);
  });
  return { received, aborted };
}

{
  const r = simulateStream(['你', '好', '，', '世', '界'], 3);
  assert.equal(r.aborted, true);
  assert.deepEqual(r.received, ['你', '好', '，']);
  console.log('[3] 中断：abort 后已收 3 个 token 全部保留，后续 2 个全部丢弃');
}
```

重试则要同时防两个坑——**无退避的重试风暴**（限流时所有客户端同时打回去，雪上加霜）和**无幂等键的重复计费**（同一次提问被计两次 token）：

> 摘自 `./code/ai-lab/sse.cjs`

```js
// 网络层重试最怕两件事：无退避的重试风暴，和无幂等键导致的重复计费。
function backoffDelay(attempt, base = 300, cap = 8000) {
  return Math.min(base * 2 ** attempt, cap);
}

{
  // 注意：不能直接 .map(backoffDelay)——map 会把索引灌进 base 参数
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((_, i) => backoffDelay(i)), [300, 600, 1200, 2400, 4800, 8000]);
  const reqId = 'req_20260919_001';
  // 同一次逻辑请求的所有重试必须携带同一个幂等键，由服务端去重
  const attempts = [1, 2, 3].map(n => ({ id: reqId, attempt: n }));
  assert.equal(new Set(attempts.map(a => a.id)).size, 1);
  console.log('[4] 重试：退避 300→600→…→8000 封顶；三次重试共用同一幂等键');
}
```

退避序列 300ms 起步、翻倍、8 秒封顶；真实实现还要加随机抖动（jitter），把同一时刻失败的一批请求打散。幂等键在前端生成、贯穿一次逻辑请求的所有重试，由服务端按键去重。

## 工程含义清单

- SSE 是 LLM 文本流的默认选型：单向、过网关、自动重连续传；双向/二进制需求才用 WebSocket。
- SSE 解析只认换行符：残行留在缓冲区，`[DONE]` 与流关闭是两个独立的终止条件。
- 流式 Markdown 必须做半开代码块状态机：fence 奇偶性判断，奇数按住、偶数放行。
- 渲染层按 rAF 合帧 flush，逐 token 直接改 DOM 是重排灾难。
- 中断 = abort + 保留已收内容；重试 = 指数退避 + 抖动 + 全程同一个幂等键。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试退避 | 二、三、四、五 |
| `./code/ai-lab/gen.cjs` | 结构化输出 / 上下文装配 / token 估算（下一篇引用） | — |
| `./code/ai-lab/wasm.cjs` | 端侧推理探针（端侧篇引用） | — |
| `./code/ai-lab/perf.cjs` | 性能与成本探针（性能篇引用） | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 下一篇：[AI 与前端工程结合](./AI%20与前端工程结合.md)
- 参考：[MDN: Server-sent events](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events) · [MDN: AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController) · [OpenAI Streaming 指南](https://platform.openai.com/docs/guides/streaming)
