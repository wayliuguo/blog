'use strict'
// 小程序双线程模型模拟：逻辑层与渲染层分离，通信经 Native 消息队列（node twin.cjs）
const assert = require('node:assert')

// ── Native 消息队列：转发 + 按 tick 合并 ────────────────────────
// 渲染层收到的是 flush 出来的「一帧」消息；过桥必须序列化，
// 所以 flush 里做一次 JSON 往返——这正是双线程通信的硬约束。
class NativeBridge {
  constructor() { this.sent = [] }
  flush(pending) {
    if (pending.size === 0) return
    const data = JSON.parse(JSON.stringify(Object.fromEntries(pending)))
    this.sent.push({ from: 'logic', data })
    pending.clear()
  }
}

// ── 逻辑层：this.setData 的简化实现 ─────────────────────────────
// 真实小程序里 setData 会把 partial 合入 this.data，并把 diff 消息
// 交给 Native 在合适的时机转发；同一 tick 的多次 setData 合并成一帧。
function createPage(bridge) {
  const page = { data: {}, $pending: new Map(), $renderCount: 0 }
  page.setData = function setData(partial) {
    for (const [k, v] of Object.entries(partial)) {
      this.$pending.set(k, v) // 同 key 只留最后一次写入
      this.data[k] = v
    }
  }
  page.$applyFrame = function () { // 模拟 Native 在通讯时机 flush
    bridge.flush(this.$pending)
    this.$renderCount++
  }
  return page
}

// ── 探针一：同一 tick 的多次 setData 合并成一帧 ─────────────────
{
  const bridge = new NativeBridge()
  const page = createPage(bridge)
  page.setData({ title: 'a' })
  page.setData({ count: 1 })
  page.setData({ title: 'b' }) // 同 tick 覆盖
  page.$applyFrame()

  assert.equal(bridge.sent.length, 1, '一帧只发一条消息')
  assert.deepEqual(bridge.sent[0].data, { title: 'b', count: 1 })
  assert.equal(page.$renderCount, 1)
  console.log('探针一  : 3 次 setData → 1 帧消息 · 同 key 取最后一次 ✓')
}

// ── 探针二：只通信传入的数据，未写的 key 不上桥 ─────────────────
// setData 是增量语义——消息里只有本次传入的部分
{
  const bridge = new NativeBridge()
  const page = createPage(bridge)
  page.data = { title: 't', list: [1, 2, 3], user: { name: 'li' } }
  page.setData({ 'user.name': 'wu' }) // 路径写法：只更新一个叶子
  page.$applyFrame()

  assert.equal(bridge.sent.length, 1)
  assert.deepEqual(bridge.sent[0].data, { 'user.name': 'wu' })
  assert.ok(!('list' in bridge.sent[0].data), '未变化的 list 不通信')
  console.log('探针二  : 路径 setData 只通信变化的叶子 ✓')
}

// ── 探针三：过桥的数据必须可序列化 ─────────────────────────────
// 双线程之间隔着 Native，任何不可序列化的东西都过不去
{
  const bridge = new NativeBridge()
  const page = createPage(bridge)
  page.setData({ fn: () => 1, when: new Date(0), ok: 1 })
  page.$applyFrame()

  const frame = bridge.sent[0].data
  assert.ok(!('fn' in frame), '函数无法过桥')
  assert.equal(typeof frame.when, 'string', 'Date 过桥退化为字符串')
  assert.equal(frame.ok, 1)
  console.log('探针三  : 函数丢 · Date 退化为字符串 —— 通信层只认 JSON ✓')
  console.log('\ntwin 探针全部通过 ✓')
}
