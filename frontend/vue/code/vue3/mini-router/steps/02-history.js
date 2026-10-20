// history 实测：内存栈上的前进/后退，以及「currentRoute 一变、视图 effect 恰好重跑一次」
const { createMemoryHistory } = require('../src/history')
const { createRouter } = require('../src/router')
const { effect } = require('../src/reactivity')

const Home = { name: 'Home' }
const About = { name: 'About' }
const User = { name: 'User' }

const history = createMemoryHistory()
const router = createRouter({
    history,
    routes: [
        { path: '/', component: Home },
        { path: '/about', component: About },
        { path: '/user/:id', component: User },
    ],
})

console.log('---- 模拟 RouterView：订阅 currentRoute 的 effect，数它重跑几次 ----')
let renders = 0
let view = null
effect(() => {
    renders++
    view = router.resolveView(0)
})
console.log('初始渲染 =', view.name, '| effect 执行次数 =', renders)

console.log('')
console.log('---- push 三次 ----')
router.push('/about')
router.push('/user/7?tab=info')
router.push('/about') // 与当前 fullPath 相同 → 忽略，不产生额外渲染
console.log('location =', history.location, '| 视图重跑次数 =', renders - 1, '/ 3 次 push（重复导航被忽略）')

console.log('')
console.log('---- 后退 / 前进：URL 变化经 listen 同步状态，不走守卫 ----')
router.back()
console.log('back 后 location =', history.location, '| 视图重跑次数 =', renders - 1)
router.back()
console.log('再 back 后 location =', history.location)
router.push('/about') // 后退过再 push：前进分支被截断
router.push('/user/9')
console.log('push 两次后 location =', history.location, '（/user/7 已被截断出栈）')

console.log('')
console.log('---- replace：替换当前项，栈深度不变 ----')
const before = history.location
router.replace('/about')
console.log('replace 后 location =', history.location, '（从', before, '替换而来）')
