// 探针二：GC 回收与内存泄漏（需 --expose-gc 运行）
const assert = require('node:assert')
const v8 = require('node:v8')
const mb = () => Math.round(v8.getHeapStatistics().used_heap_size / 1048576)

// ── 场景一：作用域内的垃圾 → GC 能收干净 ────────────────────────
function makeGarbage() {
  const arr = []
  for (let i = 0; i < 2e6; i++) arr.push({ i }) // 200 万个小对象
  return arr.length
}
global.gc()
const base = mb()
makeGarbage() // 返回后 arr 不再被引用
global.gc()
global.gc()
const after = mb()
console.log(`作用域垃圾: 基线 ${base}MB → 制造后 ${Math.max(mb(), after)}MB → GC 后 ${after}MB`)
assert.ok(after <= base + 5, '无引用的垃圾应被回收回基线')

// ── 场景二：全局缓存只进不出 → GC 也救不回来（泄漏的定义）───────
const cache = []
for (let i = 0; i < 2e6; i++) cache.push({ i })
global.gc()
global.gc()
const held = mb()
console.log(`全局持有  : GC 后仍占 ${held}MB（引用还在，GC 无能为力）`)
assert.ok(held > base + 50, '被全局引用的对象不会被回收')

cache.length = 0 // 放开引用
global.gc()
global.gc()
const freed = mb()
console.log(`放开引用  : ${held}MB → ${freed}MB`)
assert.ok(freed <= base + 5, '引用放开后可回收')
console.log('\n探针二通过 ✓')
