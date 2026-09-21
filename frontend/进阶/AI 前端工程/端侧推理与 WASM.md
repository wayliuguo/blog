# 端侧推理与 WASM

把模型搬到浏览器里跑，动机很直接：数据不出端、离线可用、没有网络往返、边际成本为零。代价同样直接：几十 MB 到几 GB 的体积、被设备算力卡住的推理速度、以及一堆兼容性雷区。这一篇把端侧推理的四件工程事——模型加载、WASM 内核、内存预算、线程模型——用 `ai-lab` 探针逐条给出可量化结论，其中一条结论（WASM 不一定比 JS 快）与常见宣传相反，正文里会用实测数据说清楚。

## 一、端侧推理：动机与代价

| 维度 | 端侧 | 云端 |
| --- | --- | --- |
| 隐私 | 数据不出设备 | 数据过网 |
| 离线 | 可用 | 不可用 |
| 首 token 延迟 | 无网络往返，但加载模型要时间 | 网络 + 排队 |
| 算力 | 受设备限制（手机 GPU/CPU） | 几乎无限 |
| 成本 | 一次下载，之后边际成本为零 | 按 token 计费 |
| 更新 | 模型换版要重新下载 | 服务端随时换 |

落地上最常见的形态是**分层**：小任务（分类、Embedding、关键词提取、语音端点检测）放端侧，重任务（长文生成、多轮复杂推理）走云端。判断标准只有一条：**任务是否能在端侧模型的能力圈内闭环，且用户愿意为它付一次下载成本**。

## 二、模型加载：分片与缓存

端侧模型动辄几十上百 MB，整包下载意味着峰值内存等于整个模型、断网即前功尽弃。分片加载把峰值压到一个分片的大小：

> 摘自 `./code/ai-lab/wasm.cjs`

```js
// 端侧模型动辄几十上百 MB：整包下载既占内存又无法续传。分片把峰值压到 1 个分片。
function createShardLoader(totalBytes, shardBytes) {
  let downloaded = 0
  let peak = 0
  let count = 0
  return {
    get downloaded() { return downloaded},
    get peak() { return peak},
    get count() { return count},
    pull() {
      const size = Math.min(shardBytes, totalBytes - downloaded)
      if (size <= 0) return 0
      peak = Math.max(peak, size)
      downloaded += size
      count++
      return size
    },
  }
}

{
  const total = 80 * 1024 * 1024
  const shard = 4 * 1024 * 1024
  const loader = createShardLoader(total, shard)
  while (loader.pull() > 0) { /* 逐片拉取 */ }
  assert.equal(loader.downloaded, total)
  assert.equal(loader.peak, shard)
  assert.equal(loader.count, 20)
  console.log(`[1] 分片加载：80MB 模型分 ${loader.count} 片，峰值缓冲区 ${loader.peak / 1024 / 1024}MB（整包加载需 ${total / 1024 / 1024}MB）`);
}
```

实测：80MB 模型分 20 片，峰值缓冲区只有 4MB——移动端低内存机型上这是能不能跑起来的分界线。配套的另外两件事：分片写进 Cache Storage / IndexedDB 做二次启动秒开；每片校验（hash）防 CDN 换包。

## 三、WASM 是内核，不是银弹

端侧推理框架（ONNX Runtime Web、transformers.js）的内核都是 WASM：可移植、无 GC 停顿、性能可预测。为了把这件事讲成可验证的结论，探针里手工拼了一个 `(i32) -> i32` 的循环求和模块：

> 摘自 `./code/ai-lab/wasm.cjs`

```js
// 端侧推理框架（ONNX Runtime Web / transformers.js）的内核是 WASM：
// 可移植、无 GC 停顿、性能可预测。下面手工拼一个 (i32) -> i32 的循环求和模块。
const bytes = [
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // magic + version
  0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f, // type: (i32) -> i32（payload 6 字节）
  0x03, 0x02, 0x01, 0x00, // func: 1 个函数，类型 0
  0x07, 0x07, 0x01, 0x03, 0x73, 0x75, 0x6d, 0x00, 0x00, // export "sum" -> func 0
  0x0a, 0x25, 0x01, 0x23, // code: 1 个函数体，长 35 字节
  0x01, 0x02, 0x7f, // 2 个 local：i、acc
  0x02, 0x40, // block
  0x03, 0x40, // loop
  0x20, 0x01, 0x20, 0x00, 0x4e, 0x0d, 0x01, // if (i >= n) br_if 1（跳出 block）
  0x20, 0x02, 0x20, 0x01, 0x6a, 0x21, 0x02, // acc = acc + i
  0x20, 0x01, 0x41, 0x01, 0x6a, 0x21, 0x01, // i = i + 1
  0x0c, 0x00, // br 0（回到 loop 开头）
  0x0b, 0x0b, // end loop; end block
  0x20, 0x02, // local.get acc
  0x0b, // end
]
```

模块可用、结果正确之后，把同一个循环分别用 WASM 和 JS 跑 2000 万次：

> 摘自 `./code/ai-lab/wasm.cjs`

```js
  const mod = new WebAssembly.Module(new Uint8Array(bytes))
  const { sum } = new WebAssembly.Instance(mod).exports

  function sumJs(n) {
    let acc = 0
    for (let i = 0; i < n; i++) acc = (acc + i) | 0 // |0 对齐 i32 的回绕语义
    return acc | 0
  }

  assert.equal(sum(10), 45)
  assert.equal(sum(100000), sumJs(100000)) // i32 回绕后两边必须一致
  console.log('[2] WASM 内核：手工字节码模块可用，sum(10)=45，10 万次循环与 JS 结果完全一致（含 i32 回绕）')
```

本机某次实测：`WASM 46.6ms vs JS 16.0ms`——**WASM 比 JS 慢了近 3 倍**。这不是 bug，而是这条结论：

- 紧循环上 V8 的 TurboFan 打得很凶（循环展开 + 寄存器分配），手写字节码拼不过成熟 JIT。
- WASM 真正的价值是**可移植与可预测**：同一份内核在所有设备表现一致，没有 JIT 预热、没有 deopt 悬崖、没有 GC 停顿。
- 真正的加速来自 WASM 的 SIMD / 线程扩展与厂商优化过的内核（如 XNNPACK），而不是"用 WASM 重写一遍"。

所以选型时的判断顺序是：**先找现成的优化内核 → 再谈自研**；用 JS 手写热路径一般是下策，但在"循环很轻、调用很频繁"的场景里，JS 未必输。

## 四、内存预算：量化与 KV cache

端侧能不能跑，最终卡在内存上。两条公式足够做预算：

> 摘自 `./code/ai-lab/wasm.cjs`

```js
// fp16 = 2B/参数，int8 = 1B，int4 = 0.5B；KV cache 随上下文长度线性增长。
function modelMemory(params, bytesPerParam) {
  return params * bytesPerParam
}

function kvCache(layers, heads, headDim, ctx, bytesPerParam) {
  return 2 * layers * heads * headDim * ctx * bytesPerParam // K 与 V 各一份
}

{
  const params = 1e9 // 1B 参数
  const fp16 = modelMemory(params, 2)
  const int4 = modelMemory(params, 0.5)
  assert.equal(int4 / fp16, 0.25)
  const kv = kvCache(24, 16, 64, 4096, 2)
  console.log(`[3] 内存预算：1B 参数 fp16 = ${(fp16 / 1e9).toFixed(1)}GB，int4 量化降到 ${(int4 / 1e9).toFixed(2)}GB（1/4）；4k 上下文 KV cache ${(kv / 1024 / 1024).toFixed(0)}MB`);
}
```

实测：1B 参数 fp16 要 2.0GB，**int4 量化降到 0.50GB（1/4）**——这就是端侧几乎必做量化的原因；而 4k 上下文的 KV cache 另需 384MB，它会随上下文**线性增长**，是长对话 OOM 的常见真凶（也解释了为什么端侧要限制上下文窗口）。

## 五、线程模型：Worker 卸载

推理是同步长任务。放在主线程跑，等价于每帧都超出 16.7ms 的预算：

> 摘自 `./code/ai-lab/wasm.cjs`

```js
// 推理是同步长任务：放在主线程跑，每帧都会超过 16.7ms 的预算。
function block(budgetMs) {
  const t0 = process.hrtime.bigint()
  while (Number(process.hrtime.bigint() - t0) / 1e6 < budgetMs) { /* 模拟同步推理占用 */ }
  return Number(process.hrtime.bigint() - t0) / 1e6
}

{
  const frames = [0, 1, 2].map(() => block(20))
  assert.ok(frames.every(f => f >= 20))
  const total = frames.reduce((a, b) => a + b, 0)
  console.log(`[4] 主线程阻塞：单帧 20ms 的推理 ×3 = ${total.toFixed(0)}ms，期间页面无法响应任何输入（应放进 Worker）`)
}
```

实测三帧共 60ms 主线程被完全占住，期间点击、滚动、输入全部无响应。正确做法：

- 推理放进 **Web Worker**（或 `OffscreenCanvas` 场景下的 worker 渲染），主线程只收消息、只渲染。
- 能开 **SIMD / threads** 就开，但要做好特性探测与降级（iOS Safari 历史上长期不支持 threads）。
- 大模型优先尝试 **WebGPU** 后端，失败回退 WASM，再失败回退云端——这条降级链要在初始化时就探测好，而不是跑到一半才报错。

## 工程含义清单

- 端侧不是替代云端的方案，而是分层：小任务端侧、重任务云端。
- 模型必须分片加载 + 缓存 + 分片校验，峰值内存压到一个分片。
- WASM 的价值是可移植与可预测，不是"自动更快"：紧循环上 V8 JIT 常常更快（本机实测 WASM 46.6ms vs JS 16.0ms）。
- 内存预算两条公式：参数量 × 每参数字节（int4 量化降到 1/4）、KV cache 随上下文线性增长。
- 推理必须在 Worker 里跑，并对 SIMD / threads / WebGPU 做特性探测与降级链。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/wasm.cjs` | 分片加载 / 手工 WASM 内核 / 内存预算 / 主线程阻塞 | 二、三、四、五 |
| `./code/ai-lab/perf.cjs` | TTFT 分解 / flush 合帧 / 成本与降级（下一篇引用） | — |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试 | — |
| `./code/ai-lab/gen.cjs` | 结构化输出 / 上下文装配 / token 估算 | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[AI 与前端工程结合](./AI%20与前端工程结合.md)
- 下一篇：[AI 应用的性能与体验](./AI%20应用的性能与体验.md)
- 参考：[ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) · [transformers.js](https://huggingface.co/docs/transformers.js) · [WebAssembly 核心规范](https://webassembly.github.io/spec/core/)
