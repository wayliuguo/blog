// lib/eval-trace.mjs —— 专门用来观察"模块什么时候被求值"（给 09-parse-time.mjs 用）
// 这一段在演示：模块的顶层代码在什么时候执行。
// 它被 09 号脚本"写在下面"地 import，却会在这条 import 之前的语句之前就跑完 —— 这就是 import 提升。
console.log('[依赖模块 eval-trace.mjs] 顶层代码被执行');

export const tag = 'eval-trace';
