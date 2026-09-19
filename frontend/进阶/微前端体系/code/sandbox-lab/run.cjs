// sandbox-lab：三种 JS 沙箱 + 样式隔离的自检实验台（零依赖，node run.cjs 直接跑）
const assert = require('node:assert')
const { SnapshotSandbox } = require('./legacy-snapshot.cjs')
const { ProxySandbox } = require('./proxy-single.cjs')
const { createSandbox } = require('./proxy-multi.cjs')
const { scopeStyle } = require('./style-scope.cjs')

// ── 场景一：快照沙箱 —— 两个应用轮流激活，全局互不可见 ─────────────
console.log('场景一 · 快照沙箱（Snapshot）')
const global = { api: 'origin' }
const boxA = new SnapshotSandbox(global)
const boxB = new SnapshotSandbox(global)

boxA.activate()
boxA.global.api = 'appA'
boxA.global.extra = 'A-only'
console.log('A 激活后  :', JSON.stringify(global))
boxA.deactivate()
console.log('A 失活后  :', JSON.stringify(global))
assert.equal(global.api, 'origin')
assert.ok(!('extra' in global))

boxB.activate()
boxB.global.api = 'appB'
console.log('B 激活后  :', JSON.stringify(global))
boxB.deactivate()
console.log('B 失活后  :', JSON.stringify(global))
boxA.activate()
assert.equal(boxA.global.api, 'appA')     // A 再激活，自己的修改被还原
boxA.deactivate()
console.log('  ✓ 修改被记录并在激活间还原，全局基线不受污染\n')

// ── 场景二：Proxy 单例沙箱 —— 只撤销"写过什么"，不做全量 diff ────────
console.log('场景二 · Proxy 单例沙箱')
const box1 = new ProxySandbox()
box1.activate()
box1.proxy.token = 't1'
box1.proxy.theme = 'dark'
console.log('写入后    :', JSON.stringify(box1.fakeWindow))
box1.deactivate()
console.log('失活后    :', JSON.stringify(box1.fakeWindow))
assert.equal(Object.keys(box1.fakeWindow).length, 0)
assert.equal(box1.added.get('token'), 't1')  // 记录还在，可随时恢复
box1.activate()
assert.equal(box1.fakeWindow.token, 't1')    // 激活即恢复
box1.deactivate()
console.log('  ✓ set 时顺手记账，失活零 diff、激活零快照\n')

// ── 场景三：Proxy 多例沙箱 —— 两个应用同时在线，各写各的 ─────────────
console.log('场景三 · Proxy 多例沙箱')
const appA = createSandbox('A')
const appB = createSandbox('B')
appA.count = 1
appB.count = 100
console.log('A.count =', appA.count, '· B.count =', appB.count)
assert.notEqual(appA.count, appB.count)
assert.equal(appA.setTimeout, globalThis.setTimeout)   // 读不到时回落共享全局
console.log('  ✓ 各写各的互不可见，读共享回落原生 API\n')

// ── 场景四：样式隔离 —— 选择器加前缀，防止主子样式互串 ─────────────
console.log('场景四 · 样式隔离（选择器前缀）')
const raw = '.card { color: red }\n.btn, .link { margin: 0 }\n@media (min-width: 768px) { .card { font-size: 16px } }'
const scoped = scopeStyle(raw, '[data-app=main]')
console.log(scoped)
assert.ok(scoped.includes('[data-app=main] .card'))
assert.ok(scoped.includes('[data-app=main] .btn, [data-app=main] .link'))
assert.ok(!scoped.includes('[data-app=main] @media'))    // @media 不被加前缀
console.log('  ✓ 普通选择器加前缀，@规则原样保留\n')

console.log('sandbox-lab 全部场景通过 ✓')
