// 三种改状态的方式对照：Pinia（setup store + $patch）/ 直接 reactive / Vuex 式 mutation
const { reactive, effect } = require('../src/reactivity')
const { createPinia, setActivePinia, defineStore, ref } = require('../src/pinia')

setActivePinia(createPinia())

// 方式一：Pinia（defineStore + action / $patch）
const useCountStore = defineStore('count', () => {
    const count = ref(0)
    function increment() {
        count.value += 1
    }
    return { count, increment }
})
const piniaStore = useCountStore()
let piniaRuns = 0
effect(() => {
    piniaRuns++
    return piniaStore.count
})

// 方式二：直接 reactive（同构于 setup store 里裸用响应式对象）
const raw = reactive({ count: 0 })
let rawRuns = 0
effect(() => {
    rawRuns++
    return raw.count
})

// 方式三：Vuex 式 mutation（改走一个统一的同步入口）
let committed = 0
function commit() {
    committed++
}
let vuexRuns = 0
const vuexState = reactive({ count: 0 })
effect(() => {
    vuexRuns++
    return vuexState.count
})

const run = label => {
    console.log('')
    console.log('----', label, '----')
    piniaStore.increment()
    raw.count += 1
    committed++
    vuexState.count = committed
    console.log('Pinia count =', piniaStore.count, '| effect 执行 =', piniaRuns)
    console.log('reactive count =', raw.count, '| effect 执行 =', rawRuns)
    console.log('Vuex count =', vuexState.count, '| effect 执行 =', vuexRuns)
}

run('计数 +1 × 3（每条路线自己的入口）')
run('计数 +1 × 3')
run('计数 +1 × 3')

console.log('')
console.log('---- 三条路线对"改完通知谁"的回答 ----')
console.log('Pinia：字段级依赖追踪，只有读过 count 的 effect 被唤醒（同 reactive 机制）')
console.log('Vuex：mutation 只是规定"谁能改"，通知机制与 reactive 完全一致')
console.log('差别不在机制，而在约定：谁有资格改、怎么改（action / 直接赋值 / mutation）')
