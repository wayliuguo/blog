// 01 模块缓存：同一个路径只「执行一次」，之后的 require 全部命中缓存
// 这一段在演示：require 不是每次都重新读文件、重新执行模块体，
// 第二次及以后拿到的是 require.cache 里存着的同一个 module.exports。
console.log('=== 1) 连续三次 require 同一个自建模块 ===')
const a = require('./lib/counter.cjs')
const b = require('./lib/counter.cjs')
const c = require('./lib/counter.cjs')

console.log('a === b ?', a === b) // true：拿到的是同一个对象
console.log('b === c ?', b === c) // true
console.log('a === c ?', a === c) // true
console.log('以上说明：三次 require 共享同一个 module.exports 对象引用')

// 模块体里那句 "[counter.cjs] 模块体被执行" 只应该出现一次，
// 它出现几次，就说明模块体真正执行了几次。
const key = require.resolve('./lib/counter.cjs')
console.log('\n=== 2) 缓存表（require.cache）里长什么样 ===')
console.log('缓存键（绝对路径）:', key)
console.log('该路径在 require.cache 中:', Object.prototype.hasOwnProperty.call(require.cache, key))
console.log('缓存记录里的 loaded 标记:', require.cache[key].loaded)
console.log('是第几层缓存命中的：缓存对象的 id 与上面 a 一致 ->', require.cache[key].exports === a)

// 全进程缓存里跟 counter.cjs 有关的记录只会有一条 —— 这就是「只执行一次」的直接证据
const counterCacheKeys = Object.keys(require.cache).filter(k => k.endsWith('counter.cjs'))
console.log('整个 require.cache 中 counter.cjs 的记录条数:', counterCacheKeys.length)

console.log('\n=== 3) 手动删掉缓存，模块体就会再执行一次 ===')
delete require.cache[key]
const d = require('./lib/counter.cjs')
console.log('删缓存后再 require，取到的是新对象吗（与 a 不同）:', d !== a) // true
console.log('注意上面又打印了一次「模块体被执行」，说明缓存被删后真的重新跑了一遍')
console.log('\n结论：同一路径在本进程内只求值一次；要拿到「干净」的模块状态，必须先清 require.cache。')
