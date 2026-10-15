// defineStore / useStore / storeToRefs / $patch 实测
const { reactive, effect, computed } = require('../src/reactivity')
const { createPinia, setActivePinia, defineStore, storeToRefs, ref } = require('../src/pinia')

setActivePinia(createPinia())

// 一个购物车 store：state 是 ref，getter 是 computed，action 是普通函数
const useCartStore = defineStore('cart', () => {
    const items = ref(0)
    const user = ref({ name: 'Ada' })
    const double = computed(() => items.value * 2)

    function add(step = 1) {
        items.value += step
    }

    return { items, user, double, add }
})

console.log('---- 首次 useStore：实例化，id 即命名空间 ----')
const cart = useCartStore()
const cartAgain = useCartStore()
console.log('两次 useStore 是同一个实例 =', cart === cartAgain)
console.log('store.$id =', cart.$id)

console.log('')
console.log('---- setup store：ref 字段自动解包第一层 ----')
console.log('cart.items =', cart.items, '| cart.double =', cart.double, '| cart.user =', JSON.stringify(cart.user))

console.log('')
console.log('---- action 直接改字段，谁在依赖里谁被唤醒 ----')
let effectRuns = 0
effect(() => {
    effectRuns++
    return cart.double
})
cart.add(3)
console.log('add(3) 后 cart.items =', cart.items, '| cart.double =', cart.double)
console.log('订阅 cart.double 的 effect 执行次数 =', effectRuns)

console.log('')
console.log('---- storeToRefs：只解包第一层，action 不解包 ----')
const { items, user, add } = storeToRefs(cart)
console.log(
    'items 是 ref =',
    items.__v_isRef === true,
    '| user 是 ref =',
    user.__v_isRef === true,
    '| add 被保留为函数 =',
    typeof add === 'function'
)
console.log('items.value =', items.value)

console.log('')
console.log('---- $patch：批量更新 + 逐键 Object.is ----')
let patchRuns = 0
effect(() => {
    patchRuns++
    return cart.items
})
cart.$patch({ items: 6 })
console.log('$patch({ items: 6 }) 后 items =', cart.items, '| 订阅 effect 执行次数 =', patchRuns)
cart.$patch({ items: 6 })
console.log(
    '$patch({ items: 6 }) 赋同值后 items =',
    cart.items,
    '| 订阅 effect 执行次数 =',
    patchRuns,
    ' <- 逐键 Object.is 跳过，不触发依赖'
)
