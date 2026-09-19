'use strict'
// JSI vs JSON Bridge：跨端 JS↔Native 通信的两种模型（零依赖，node jsi.cjs）
const assert = require('node:assert')

// ── 模型一：老架构 Bridge —— 异步消息 + JSON 序列化 ─────────────
// JS 侧拿不到 Native 对象，只能发一条可序列化的消息：
// stringify（JS 出口）→ parse（Native 入口）→ 执行 → 结果再走一遍反方向。
function createLegacyBridge(native) {
  let nextId = 1
  return {
    invoke(module, method, params) {
      const payload = JSON.stringify({ id: nextId++, module, method, params })
      const decoded = JSON.parse(payload) // 模拟 Native 侧反序列化
      const result = native[module][method](decoded.params)
      return Promise.resolve(JSON.parse(JSON.stringify(result))) // 结果回程再编解码
    },
  }
}

// ── 模型二：新架构 JSI —— 同步绑定 + host object ───────────────
// JS 侧直接持有 Native 对象的代理（JSI::HostObject），
// 方法调用是同步的 C++ 直通调用，参数按原样传递，零序列化。
function createJsiBinding(native) {
  return new Proxy(native, {
    get(target, module) {
      return target[module] // 直接是 Native 侧函数引用
    },
  })
}

// Native 侧：一个典型的「设备信息模块」
const native = {
  device: {
    getInfo: () => ({ brand: 'demo', os: 'android', sdk: 34, memGB: 8 }),
    add: (a, b) => a + b,
  },
}

// ── 探针一：序列化有损 —— Bridge 只能传 JSON 可表示的东西 ───────
{
  const src = { when: new Date(0), fn: () => 1, ok: 1 }
  const viaBridge = JSON.parse(JSON.stringify(src))
  assert.equal(typeof viaBridge.when, 'string', 'Date 经 JSON 退化为字符串')
  assert.ok(!('fn' in viaBridge), '函数被 JSON 静默丢弃')
  assert.equal(viaBridge.ok, 1)

  const jsi = createJsiBinding(native)
  const ret = jsi.device.getInfo() // 同步直通，无序列化
  assert.deepEqual(ret, { brand: 'demo', os: 'android', sdk: 34, memGB: 8 })
  assert.equal(jsi.device.add(2, 3), 5)
  console.log('探针一  : Date 退化为字符串 · 函数被丢弃 · JSI 直通调用保真 ✓')
}

// ── 探针二：开销基准 —— 两次编解码 vs 零序列化 ──────────────────
{
  const bridge = createLegacyBridge(native)
  const jsi = createJsiBinding(native)
  const N = 20000

  ;(async () => {
    let t0 = process.hrtime.bigint()
    for (let i = 0; i < N; i++) await bridge.invoke('device', 'getInfo', { id: i })
    const bridgeMs = Number(process.hrtime.bigint() - t0) / 1e6

    t0 = process.hrtime.bigint()
    for (let i = 0; i < N; i++) jsi.device.getInfo()
    const jsiMs = Number(process.hrtime.bigint() - t0) / 1e6

    console.log(`探针二  : ${N} 次调用 —— bridge ${bridgeMs.toFixed(1)}ms vs jsi ${jsiMs.toFixed(1)}ms（${(bridgeMs / jsiMs).toFixed(0)}×）`)
    assert.ok(bridgeMs > jsiMs * 2, '桥接应显著慢于直通绑定')
    console.log('\njsi 探针全部通过 ✓')
  })()
}
