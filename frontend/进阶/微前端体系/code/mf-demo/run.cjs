// mf-demo：资源加载与依赖共享的自检实验台（零依赖，node run.cjs 直接跑）
const assert = require('node:assert')
const { satisfies, negotiate } = require('./negotiate.cjs')
const { createLoader } = require('./loader.cjs')

// ── 场景一：协商成功 —— 最高公共版本一份搞定 ─────────────────────
console.log('场景一 · shared 版本协商（成功）')
const scope = { react: ['17.0.2', '18.2.0'] }
const consumers = [
  { app: 'appA', deps: { react: '^18.0.0' } },
  { app: 'appB', deps: { react: '^18.2.0' } },
]
const r1 = negotiate(scope, null, consumers)
console.log('react     :', JSON.stringify(r1.react))
assert.equal(r1.react.picked, '18.2.0')
assert.equal(r1.react.copies, 1)
console.log('  ✓ 两个消费方共用 18.2.0 一份\n')

// ── 场景二：协商失败 —— 大版本 incompatible，退回各带各的 ─────────
console.log('场景二 · shared 版本协商（失败 fallback）')
const consumers2 = [
  { app: 'legacy', deps: { react: '^17.0.0' } },
  { app: 'modern', deps: { react: '^18.0.0' } },
]
const r2 = negotiate(scope, null, consumers2)
console.log('react     :', JSON.stringify(r2.react))
assert.equal(r2.react.picked, null)
assert.equal(r2.react.copies, 2)
console.log('  ✓ 没有公共版本，17/18 各加载一份，互不串用\n')

// ── 场景三：远程加载与缓存 —— manifest 先行、二次加载走缓存 ──────
console.log('场景三 · 远程模块加载流程')
const loader = createLoader()
const m1 = loader.loadManifest('appA')
console.log('manifest  :', JSON.stringify(m1))
const btn = loader.loadModule(m1.exposes['./Button'])
console.log('首次加载  :', JSON.stringify(btn))
assert.equal(btn.fromCache, false)
const btn2 = loader.loadModule(m1.exposes['./Button'])
assert.equal(btn2.fromCache, true)
const appB = loader.loadManifest('appB')
loader.loadModule(appB.exposes['./Card'])
const s = loader.stats()
console.log('统计      :', JSON.stringify(s))
assert.equal(s.cached, 2)     // appA-button + appB-card 各缓存一份
assert.equal(s.fetchCount, 4) // 2 次 manifest + 2 次模块首次加载
console.log('  ✓ 同 url 只拉一次，缓存命中后 0 网络开销\n')

console.log('mf-demo 全部场景通过 ✓')
