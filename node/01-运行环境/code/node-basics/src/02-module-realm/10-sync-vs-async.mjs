// 10 同步 vs 异步加载：require 会挡住主线程，import() 不会挡住"当前这一行"
//
// 这个脚本在演示：同样是"把另一个模块加载进来"，
//   require() —— 同步：加载与求值都必须在返回前做完，这期间主线程被彻底占住；
//   import()  —— 异步：发起后立刻返回一个 Promise，当前代码继续往下走。
//
// 两个用来观测的模块：lib/slow.cjs 与 lib/slow.mjs，它们的顶层都故意忙等 300ms。
//
// 运行：node src/02-module-realm/10-sync-vs-async.mjs

import { createRequire } from 'node:module'

// .mjs 文件里没有内置的 require，想用同步加载得自己造一个（这也说明它本来就不是 ESM 的东西）
const require = createRequire(import.meta.url)

console.log('=== 1) require 是同步的 ===')
const t1 = Date.now()
console.log('    require 之前，t = 0 ms')
const slow = require('./lib/slow.cjs') // 对方顶层忙等 300ms，require 必须等到它跑完才返回
console.log('    require 返回，t =', Date.now() - t1, 'ms  <- 这 300ms 里主线程什么都做不了')
console.log('    拿到的 tag =', slow.tag)

console.log('\n=== 2) import() 是异步的 ===')
const t2 = Date.now()
const pending = import('./lib/slow.mjs')
console.log('    import() 刚发起，t =', Date.now() - t2, 'ms  <- 这一行没有等它，立刻继续往下走')
console.log('    import() 的返回值是 Promise 吗 =', pending instanceof Promise)
const mod = await pending
console.log('    await 之后拿到模块，t =', Date.now() - t2, 'ms')
console.log('    拿到的 tag =', mod.tag)

console.log('\n=== 3) 一个容易被说错的点 ===')
console.log('上面 await 依然等了 300ms，说明 import() 的"异步"指的是加载与求值的调度时机，')
console.log('而不是"加载过程不占 CPU" —— 模块顶层代码一旦开始执行，同样是同步占用主线程的。')
console.log('两者的真实差别是：require 让调用方"停在原地等"，import() 让调用方"先往下走，回头再取结果"。')

console.log('\n小结：')
console.log('  require() -> 同步加载：读文件、执行对方顶层代码、拿到导出，全在一行之内完成')
console.log('  import()  -> 异步加载：返回 Promise，可以被 await、可以并发发起、可以按需触发')
console.log('  真正只有 import() 能加载的，是带顶层 await 的模块（反例见 05-cjs-require-esm.cjs）')
