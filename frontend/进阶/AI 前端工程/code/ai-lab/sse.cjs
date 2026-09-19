// sse.cjs — LLM 流式链路探针：SSE 分帧 / 流式 Markdown 状态机 / 中断 / 重试
'use strict';
const assert = require('node:assert');

// ---------- 场景一：SSE 分帧与跨 chunk 断行重组 ----------
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

// ---------- 场景二：流式 Markdown——半开代码块状态机 ----------
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

// ---------- 场景三：中断——abort 后保留已收内容、丢弃后续 ----------
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

// ---------- 场景四：重试——指数退避 + 幂等键 ----------
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

console.log('sse.cjs 全部通过');
