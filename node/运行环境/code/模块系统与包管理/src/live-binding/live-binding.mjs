// live-binding.mjs —— ES Module 的核心特征：导出的是「活绑定」
// 这一段在演示：外部读到的 count 与模块内部是同一个绑定，
// 模块内部一改，所有导入方实时同步——和 CommonJS 的快照正好相反。
// 运行：node src/live-binding/live-binding.mjs（或 npm run live-binding）
import { count, inc } from './counter.mjs'

console.log('调用 inc() 之前，外部读到的 count =', count)
const inside = inc()
console.log('inc() 在模块内部返回 =', inside)
console.log('再从外部读 count =', count)
console.log('\n结论：外部 count 实时变成 1 —— 导出的是活绑定，不是快照。')
