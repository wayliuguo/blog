// wasm.cjs — 端侧推理探针：模型分片加载 / WASM 计算内核 / 内存预算与主线程阻塞
'use strict';
const assert = require('node:assert');

// ---------- 场景一：模型分片加载——峰值内存只占一份缓冲区 ----------
// 端侧模型动辄几十上百 MB：整包下载既占内存又无法续传。分片把峰值压到 1 个分片。
function createShardLoader(totalBytes, shardBytes) {
  let downloaded = 0;
  let peak = 0;
  let count = 0;
  return {
    get downloaded() { return downloaded; },
    get peak() { return peak; },
    get count() { return count; },
    pull() {
      const size = Math.min(shardBytes, totalBytes - downloaded);
      if (size <= 0) return 0;
      peak = Math.max(peak, size);
      downloaded += size;
      count++;
      return size;
    },
  };
}

{
  const total = 80 * 1024 * 1024;
  const shard = 4 * 1024 * 1024;
  const loader = createShardLoader(total, shard);
  while (loader.pull() > 0) { /* 逐片拉取 */ }
  assert.equal(loader.downloaded, total);
  assert.equal(loader.peak, shard);
  assert.equal(loader.count, 20);
  console.log(`[1] 分片加载：80MB 模型分 ${loader.count} 片，峰值缓冲区 ${loader.peak / 1024 / 1024}MB（整包加载需 ${total / 1024 / 1024}MB）`);
}

// ---------- 场景二：WASM 计算内核——手工组装一个循环求和模块 ----------
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
];

{
  const mod = new WebAssembly.Module(new Uint8Array(bytes));
  const { sum } = new WebAssembly.Instance(mod).exports;

  function sumJs(n) {
    let acc = 0;
    for (let i = 0; i < n; i++) acc = (acc + i) | 0; // |0 对齐 i32 的回绕语义
    return acc | 0;
  }

  assert.equal(sum(10), 45);
  assert.equal(sum(100000), sumJs(100000)); // i32 回绕后两边必须一致
  console.log('[2] WASM 内核：手工字节码模块可用，sum(10)=45，10 万次循环与 JS 结果完全一致（含 i32 回绕）');

  // 密集计算对比：同样的循环，WASM vs JS
  const N = 2e7;
  const t0 = process.hrtime.bigint();
  sum(N);
  const wasmMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  sumJs(N);
  const jsMs = Number(process.hrtime.bigint() - t1) / 1e6;
  // 结论常常反直觉：这种紧循环上 V8 的 JIT 反而更快——WASM 的价值不在这里
  console.log(`[2] 密集计算：N=2e7 循环，WASM ${wasmMs.toFixed(1)}ms vs JS ${jsMs.toFixed(1)}ms（WASM/JS = ${(wasmMs / jsMs).toFixed(2)}×）`);
}

// ---------- 场景三：内存预算——参数量 × 每参数字节 + KV cache ----------
// fp16 = 2B/参数，int8 = 1B，int4 = 0.5B；KV cache 随上下文长度线性增长。
function modelMemory(params, bytesPerParam) {
  return params * bytesPerParam;
}

function kvCache(layers, heads, headDim, ctx, bytesPerParam) {
  return 2 * layers * heads * headDim * ctx * bytesPerParam; // K 与 V 各一份
}

{
  const params = 1e9; // 1B 参数
  const fp16 = modelMemory(params, 2);
  const int4 = modelMemory(params, 0.5);
  assert.equal(int4 / fp16, 0.25);
  const kv = kvCache(24, 16, 64, 4096, 2);
  console.log(`[3] 内存预算：1B 参数 fp16 = ${(fp16 / 1e9).toFixed(1)}GB，int4 量化降到 ${(int4 / 1e9).toFixed(2)}GB（1/4）；4k 上下文 KV cache ${(kv / 1024 / 1024).toFixed(0)}MB`);
}

// ---------- 场景四：推理阻塞主线程——一帧 20ms 就没有交互可言 ----------
// 推理是同步长任务：放在主线程跑，每帧都会超过 16.7ms 的预算。
function block(budgetMs) {
  const t0 = process.hrtime.bigint();
  while (Number(process.hrtime.bigint() - t0) / 1e6 < budgetMs) { /* 模拟同步推理占用 */ }
  return Number(process.hrtime.bigint() - t0) / 1e6;
}

{
  const frames = [0, 1, 2].map(() => block(20));
  assert.ok(frames.every(f => f >= 20));
  const total = frames.reduce((a, b) => a + b, 0);
  console.log(`[4] 主线程阻塞：单帧 20ms 的推理 ×3 = ${total.toFixed(0)}ms，期间页面无法响应任何输入（应放进 Worker）`);
}

console.log('wasm.cjs 全部通过');
