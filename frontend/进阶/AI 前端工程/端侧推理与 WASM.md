# 端侧推理与 WASM

> 统一业务场景：智能客服助手（见[全景](./全景.md)）。本篇实战层绑定真实工程 `code/wasm-infer/`（wat 手写内核实测）；探针 `code/ai-lab/wasm.cjs` 负责分片加载、内存预算与 WASM vs JS 的机制验证。

## 一、入门：端侧不是替代云端，而是分层

| 维度 | 端侧 | 云端 |
| --- | --- | --- |
| 隐私 | 数据不出设备 | 数据过网 |
| 离线 | 可用 | 不可用 |
| 首 token 延迟 | 无网络往返，但加载模型要时间 | 网络 + 排队 |
| 算力 | 受设备限制（手机 GPU/CPU） | 几乎无限 |
| 成本 | 一次下载，之后边际成本为零 | 按 token 计费 |
| 更新 | 模型换版要重新下载 | 服务端随时换 |

落地上最常见的形态是**分层**：小任务（分类、Embedding、关键词提取、语音端点检测）放端侧，重任务（长文生成、多轮复杂推理）走云端。在智能客服场景里的落法：用户会话的**转化倾向打分**这类敏感特征计算放端侧（特征不出设备），话术生成交给云端大模型。判断标准只有一条：**任务是否能在端侧模型的能力圈内闭环，且用户愿意为它付一次下载成本**。

## 二、核心机制

### 2.1 模型加载：分片与缓存

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
    }
  }
}
```

实测：80MB 模型分 20 片，峰值缓冲区只有 4MB——移动端低内存机型上这是能不能跑起来的分界线。配套两件事：分片写进 Cache Storage / IndexedDB 做二次启动秒开；每片校验（hash）防 CDN 换包。

### 2.2 内存预算：量化与 KV cache

端侧能不能跑，最终卡在内存上。两条公式足够做预算：参数量 × 每参数字节（fp16=2B、int8=1B、int4=0.5B），以及随上下文线性增长的 KV cache（`2 × layers × heads × headDim × ctx × bytesPerParam`）。实测：1B 参数 fp16 要 2.0GB，**int4 量化降到 0.50GB（1/4）**——这就是端侧几乎必做量化的原因；4k 上下文的 KV cache 另需 384MB，是长对话 OOM 的常见真凶（也解释了为什么端侧要限制上下文窗口）。

### 2.3 线程模型：Worker 卸载

推理是同步长任务。放在主线程跑，等价于每帧都超出 16.7ms 的预算——实测模拟三帧各 20ms 的推理占用，共 60ms 内页面无法响应任何输入。正确做法：

- 推理放进 **Web Worker**（或 `OffscreenCanvas` 场景下的 worker 渲染），主线程只收消息、只渲染；
- 能开 **SIMD / threads** 就开，但要做好特性探测与降级（iOS Safari 历史上长期不支持 threads）；
- 大模型优先尝试 **WebGPU** 后端，失败回退 WASM，再失败回退云端——这条降级链要在初始化时就探测好，而不是跑到一半才报错。

## 三、核心机制 + 最小实现：WASM 是内核，不是银弹

端侧推理框架（ONNX Runtime Web、transformers.js）的内核都是 WASM：可移植、无 GC 停顿、性能可预测。探针里手工拼了一个 `(i32) -> i32` 的循环求和模块（129 字节级的手写字节码），确认「字节码模块可用、i32 回绕语义与 JS `|0` 一致」后，把同一个循环分别用 WASM 和 JS 跑 2000 万次：

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

- 紧循环上 V8 的 TurboFan 打得很凶（循环展开 + 寄存器分配），手写字节码拼不过成熟 JIT；
- WASM 真正的价值是**可移植与可预测**：同一份内核在所有设备表现一致，没有 JIT 预热、没有 deopt 悬崖、没有 GC 停顿；
- 真正的加速来自 WASM 的 SIMD / 线程扩展与厂商优化过的内核（如 XNNPACK），而不是"用 WASM 重写一遍"。

所以选型时的判断顺序是：**先找现成的优化内核 → 再谈自研**。

### 3.1 实战：wasm-infer 手写推理内核

`code/wasm-infer/` 把「内核」做成可读版本——用 wat（WASM 文本格式）写一个 4 维特征线性打分器 `y = w·x + b`，wabt.js 编译成 129 字节的 wasm 模块。这就是端侧推理的最小完整骨架：

> 摘自 `./code/wasm-infer/wat/score.wat`

```
(module
  (memory (export "mem") 1)
  (func (export "score") (result f32)
    (local $i i32)
    (local $acc f32)
    (local.set $i (i32.const 0))
    (local.set $acc (f32.const 0))
    (block
      (loop
        ;; i >= 4 跳出
        (br_if 1 (i32.ge_s (local.get $i) (i32.const 4)))
        ;; acc += w[i] * x[i]
        (local.set $acc
          (f32.add (local.get $acc)
            (f32.mul
              (f32.load (i32.mul (local.get $i) (i32.const 4)))
              (f32.load (i32.add (i32.const 32) (i32.mul (local.get $i) (i32.const 4)))))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br 0)))
    ;; acc + b → 写回 offset 64（演示共享内存往返）→ 返回
    (local.set $acc (f32.add (local.get $acc) (f32.load (i32.const 16))))
    (f32.store (i32.const 64) (local.get $acc))
    (local.get $acc)))
```

JS 侧的三段骨架：**权重装载进共享内存 → 写特征调内核 → 读结果做 softmax 后处理**：

> 摘自 `./code/wasm-infer/infer.mjs`

```js
const wasmBytes = fs.readFileSync(new URL('./score.wasm', import.meta.url))
const { instance } = await WebAssembly.instantiate(wasmBytes)
const { mem, score } = instance.exports
const f32 = new Float32Array(mem.buffer)

// 权重装载：一个「推荐分」模型——活跃度、复购、客单价、投诉数（负权重）
const W = [0.6, 1.2, 0.8, -1.5]
const B = -0.4
f32.set(W, 0) // offset 0
f32.set([B], 4) // offset 16（第 4 个 f32 槽位）

// 特征装载并调用内核
function predict(features) {
  f32.set(features, 8) // offset 32（第 8 个 f32 槽位）
  const y = score()
  // softmax 二分类：sigmoid 与它等价，这里显式写 softmax 形态展示「模型输出 → 概率」的后处理
  const p = 1 / (1 + Math.exp(-y))
  return { y, p }
}
```

**实测读数（2026-10-14）**：wabt 编译产出 129 字节 `score.wasm`；三组样本（高价值/普通/高风险用户）wasm 读数与 JS 复算**逐位一致**（y = 1.5100 / 0.2300 / -1.3500），P(转化) 81.9% / 55.7% / 20.6%——「敏感特征不出设备」的打分链路就是这么小的一个内核。

真实的端侧模型（ONNX 等）只是把这段内核换成厂商优化过的版本（XNNPACK 内核 + SIMD），**装载权重 → 前向 → 后处理的骨架不变**。

## 四、对比与适用边界

| 信号 | 判断 |
| --- | --- |
| 任务是分类/打分/检测，模型 < 50MB | 端侧合适（int4 量化后更小） |
| 特征涉及隐私（行为、生物特征） | 必须端侧，或接受合规成本 |
| 需要长文生成、多轮推理 | 云端，端侧只做前置处理 |
| 紧循环性能焦虑 | 先测：V8 JIT 常比手写 WASM 快（本机实测 16.0ms vs 46.6ms） |

- 端侧不是替代云端的方案，而是分层：小任务端侧、重任务云端；
- 模型必须分片加载 + 缓存 + 分片校验，峰值内存压到一个分片；
- WASM 的价值是可移植与可预测，不是"自动更快"；
- 推理必须在 Worker 里跑，并对 SIMD / threads / WebGPU 做特性探测与降级链。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/wasm-infer/wat/score.wat` | wat 手写推理内核（最小实现） | 三 |
| `./code/wasm-infer/infer.mjs` | 装载 → 前向 → softmax 后处理 + JS 复算对照 | 三 |
| `./code/wasm-infer/build.mjs` | wabt 编译 wat → wasm | 三 |
| `./code/ai-lab/wasm.cjs` | 分片加载 / 手工字节码 / 内存预算 / 主线程阻塞 | 二、三 |
| `./code/ai-lab/perf.cjs` | TTFT 分解 / flush 合帧 / 成本与降级（下一篇引用） | — |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试 | — |
| `./code/ai-lab/gen.cjs` | 结构化输出 / 上下文装配 / token 估算 | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |

## 参考

- 本模块地图：[全景](./全景.md)
- 本模块总结：[总结](./总结.md) · 面试题：[面试题](./面试题.md)
- 上一篇：[AI 与前端工程结合](./AI%20与前端工程结合.md)
- 下一篇：[AI 应用的性能与体验](./AI%20应用的性能与体验.md)
- 参考：[ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) · [transformers.js](https://huggingface.co/docs/transformers.js) · [WebAssembly 核心规范](https://webassembly.github.io/spec/core/)
