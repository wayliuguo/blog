/**
 * 第 1 步：依赖收集与触发
 *
 * 只看 reactivity 这一层，不涉及任何界面。重点是把 track / trigger 的三层结构
 * （targetMap → depsMap → dep）和"惰性深度代理"看清楚。
 *
 * 运行：npm run step:reactivity
 */
const { reactive, isReactive, effect, describeDeps } = require('../src/reactivity')

const log = []
const state = reactive({ count: 0, nested: { deep: 1 }, list: ['a'] })

console.log('==== 1. effect 里读了 count，之后改 count 就会重跑 ====')
effect(() => {
    log.push(`run  count=${state.count}`)
})
console.log('首次执行后：', JSON.stringify(log))

log.length = 0
state.count++
state.count = 10
console.log('两次修改后：', JSON.stringify(log), '（这一层是同步的，每次 set 都立刻唤醒）')

log.length = 0
state.nested.deep = 999 // 没读过 nested.deep，不该触发
console.log('改一个没人依赖的属性：', JSON.stringify(log), '（空 = 没触发）')

console.log('\n==== 2. 依赖表（谁依赖了哪个对象的哪个属性）====')
console.log(describeDeps())

console.log('\n==== 3. 深度响应式与惰性收集 ====')
log.length = 0
state.nested.deep = 5000
console.log('还没人读过 nested.deep：', JSON.stringify(log), '（空）')
console.log('读一下 state.nested，此刻才把它代理起来：isReactive =', isReactive(state.nested))
const deep = state.nested
effect(() => {
    log.push(`deep=${deep.deep}`)
})
log.length = 0
state.nested.deep = 1000
console.log('有人读过了：', JSON.stringify(log))

console.log('\n==== 4. Proxy 支持增删属性（Vue2 需要 Vue.set）====')
log.length = 0
effect(() => {
    log.push(`added=${state.added}`)
})
console.log('读一个不存在的属性：', JSON.stringify(log))
state.added = 'new'
console.log('新增属性后：', JSON.stringify(log))

console.log('\n==== 5. 数组下标也一样 ====')
log.length = 0
effect(() => {
    log.push(`list[0]=${state.list[0]}`)
})
state.list[0] = 'b'
console.log('改 list[0]：', JSON.stringify(log))

console.log('\n==== 6. 一个属性可以有多个人依赖 ====')
log.length = 0
effect(() => log.push(`A 看到 ${state.count}`))
effect(() => log.push(`B 看到 ${state.count}`))
log.length = 0
state.count = 42
console.log('改一次 count：', JSON.stringify(log))
console.log('注意第 1 节那个 effect 还活着，所以也一起被唤醒了 —— dep 是一个集合，不是单个回调')
