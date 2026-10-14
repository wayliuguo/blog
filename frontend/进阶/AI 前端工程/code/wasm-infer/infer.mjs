// infer.mjs — 加载 wasm 内核跑端侧打分：特征 → score(y=w·x+b) → softmax 二分类概率
// 这个「模型」小到只有 5 个参数，但它完整演示了端侧推理的三段骨架：
//   装载权重到共享内存 → 调 wasm 前向 → 读结果做后处理。
// 真实端侧模型（ONNX 等）只是把这三段中的内核换成厂商优化过的版本，骨架不变。
import fs from 'node:fs'

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

// 三组样本对照（JS 复算核对，防 wat 写错）
function jsScore(features) {
  return features.reduce((s, x, i) => s + W[i] * x, 0) + B
}

const samples = [
  { name: '高价值用户', x: [0.9, 0.8, 0.7, 0.1] },
  { name: '普通用户', x: [0.4, 0.5, 0.3, 0.3] },
  { name: '高风险用户', x: [0.2, 0.1, 0.2, 0.9] },
]

let allOk = true
for (const s of samples) {
  const { y, p } = predict(s.x)
  const expect = jsScore(s.x)
  const ok = Math.abs(y - expect) < 1e-5
  allOk = allOk && ok
  console.log(
    `${s.name.padEnd(6)} x=[${s.x.join(', ')}] → y=${y.toFixed(4)} (JS 复算 ${expect.toFixed(4)} ${ok ? '✓' : '✗'}) → P(转化)=${(p * 100).toFixed(1)}%`
  )
}

if (!allOk) {
  console.error('FAILED: wasm 内核与 JS 复算不一致')
  process.exit(1)
}
console.log('wasm-infer 全部样本通过 ✓')
