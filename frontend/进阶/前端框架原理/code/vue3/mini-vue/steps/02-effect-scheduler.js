/**
 * 第 2 步：scheduler、computed 的惰性、以及 effect 之间的嵌套
 *
 * 运行：npm run step:effect
 */
const { reactive, computed, effect, stop } = require('../src/reactivity')

console.log('==== 1. 带 scheduler 的 effect：不立刻跑，交给调度 ====')
const state = reactive({ count: 0 })
const queue = []

effect(
    () => {
        console.log(`  [effect] count = ${state.count}`)
    },
    { scheduler: () => queue.push('job') }
)

console.log('  --- 改三次 count（effect 不会立刻跑）---')
state.count = 1
state.count = 2
state.count = 3
console.log('  队列里攒了：', JSON.stringify(queue), '（三次变化，三个标记）')
queue.length = 0
console.log('  手动 flush 一次就够（真实 Vue 用微任务 flush，见下一节）')

console.log('\n==== 2. 分支切换：旧依赖必须被清掉 ====')
const runs = []
const branch = reactive({ flag: true, a: 1, b: 2 })

effect(() => {
    // 每次执行都会重新收集依赖；上一次分支上的依赖要被清理掉
    runs.push(branch.flag ? `a=${branch.a}` : `b=${branch.b}`)
})

runs.length = 0
branch.flag = false // 切到 b 分支
console.log('  切分支后：', JSON.stringify(runs))
runs.length = 0
branch.a = 100 // a 已经不在依赖里了
console.log('  改 a（旧分支）：', JSON.stringify(runs), '（空 = 清理生效）')
branch.b = 200
console.log('  改 b（新分支）：', JSON.stringify(runs))

console.log('\n==== 3. stop：手动断开全部依赖 ====')
const stopper = reactive({ n: 0 })
const seen = []
const runner = effect(() => seen.push(stopper.n))
stopper.n = 1
stop(runner)
stopper.n = 2
console.log('  停止后改 n：', JSON.stringify(seen), '（最后一次变化没被收到）')

console.log('\n==== 4. computed：惰性求值 + 缓存 ====')
let getterCalls = 0
const cart = reactive({ price: 10, count: 2 })
const total = computed(() => {
    getterCalls++
    return cart.price * cart.count
})

console.log(`  第一次读 total = ${total.value}，getter 调用 ${getterCalls} 次`)
console.log(`  再读一次   total = ${total.value}，getter 调用 ${getterCalls} 次（命中缓存）`)
cart.count = 3
console.log(`  改了依赖但没读：getter 调用 ${getterCalls} 次（不立刻重算，只置脏）`)
console.log(`  读的时候才算   total = ${total.value}，getter 调用 ${getterCalls} 次`)

console.log('\n==== 5. computed 作为别人依赖的值 ====')
const log = []
effect(() => log.push(`total=${total.value}`))
log.length = 0
cart.price = 20
console.log('  改 price：', JSON.stringify(log), `（getter 累计 ${getterCalls} 次）`)
console.log('  → computed 的 scheduler 只负责"置脏 + 通知"，真正重算发生在被读到时')
