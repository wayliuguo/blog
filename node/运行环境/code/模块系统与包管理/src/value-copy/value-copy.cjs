// value-copy.cjs —— CommonJS 的核心特征：导出的是「值的拷贝」
// 这一段在演示：require 拿到的 count 是导出那一刻的快照，
// 模块内部后续再怎么改，外部读到的永远是当时的值。
// 运行：node src/value-copy/value-copy.cjs（或 npm run value-copy）
const counter = require('./counter.cjs')

console.log('调用 inc() 之前，外部读到的 count =', counter.count)
const inside = counter.inc()
console.log('inc() 在模块内部返回 =', inside)
console.log('再从外部读 count =', counter.count)
console.log('counter.peek()（模块内部实时值）= ', counter.peek())
console.log('\n结论：外部 count 停在 0，内部 peek() 是 1 —— 外部看到的是导出那一刻的快照。')
