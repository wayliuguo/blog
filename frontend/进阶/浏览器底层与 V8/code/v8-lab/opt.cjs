// 探针一：V8 分层编译、反优化与隐藏类（需 --allow-natives-syntax 运行）
// 状态位（V8 12.x）：1=isFunction · 16=optimized · 32=maglev · 64=turbofan · 128=interpreted
const assert = require('node:assert')

// ── 1. 分层编译：冷 → 预热 → 优化 ───────────────────────────────
function add(a, b) { return a + b }
const cold = %GetOptimizationStatus(add)
assert.equal(cold & 16, 0) // 冷启动：未优化
for (let i = 0; i < 1e5; i++) add(i, i)
const warm = %GetOptimizationStatus(add)
assert.ok(warm & 16, '预热足够多次后应进入优化状态')
assert.ok(warm & 64, 'add 足够简单，应被 TurboFan 编译')
console.log(`分层编译: cold=${cold}(未优化) → warm=${warm}(optimized+TurboFan)`)

// ── 2. 反优化：类型反馈被打脸 → 退出优化代码 ────────────────────
function concat(a, b) { return a + b }
for (let i = 0; i < 1e5; i++) concat(i, i)
assert.ok(%GetOptimizationStatus(concat) & 16)
concat('a', 'b') // 喂进字符串：与优化代码假设的类型不符
concat(1, 2)
assert.equal(%GetOptimizationStatus(concat) & 16, 0, '类型变化应触发反优化')
console.log(`反优化  : 喂入字符串后 optimized 位清零(status=${%GetOptimizationStatus(concat)})`)

// ── 3. 隐藏类：同构与异构 ──────────────────────────────────────
function Point(x, y) { this.x = x; this.y = y }
const p1 = new Point(1, 2)
const p2 = new Point(3, 4)
assert.ok(%HaveSameMap(p1, p2), '同构造函数产出应共享隐藏类')
const diffOrder = { y: 2, x: 1 } // 同字段、不同添加顺序
assert.ok(!%HaveSameMap(p1, diffOrder), '属性顺序不同 → 隐藏类不同')
const g = new Point(1, 2)
g.z = 3 // 事后加属性 → 派生出新的隐藏类
assert.ok(!%HaveSameMap(p1, g))
// delete 把对象推入「慢属性（字典）模式」，与同形状字面量也不再同构
function makeXYZ() { const o = { x: 1, y: 2, z: 3 }; delete o.y; return o }
const f1 = makeXYZ()
const f2 = makeXYZ()
const same = { x: 1, z: 3 }
assert.ok(%HaveSameMap(f1, f2), '同样的 delete 序列产出同构对象')
assert.ok(!%HaveSameMap(f1, same), 'delete 后与同形状字面量隐藏类不同')
console.log('隐藏类  : 同构 true · 乱序 false · 加属性 false · delete 后进入字典模式')
console.log('\n探针一通过 ✓')
