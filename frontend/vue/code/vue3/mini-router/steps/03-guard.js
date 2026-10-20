// 守卫流程实测：beforeEach → beforeEnter → 改 URL → 改状态 → afterEach
// 验证三件事：顺序、取消（URL 与状态都不动）、重定向
const { createMemoryHistory } = require('../src/history')
const { createRouter } = require('../src/router')

const Home = { name: 'Home' }
const Admin = { name: 'Admin' }
const Login = { name: 'Login' }
const Profile = { name: 'Profile' }

const history = createMemoryHistory()
const router = createRouter({
    history,
    routes: [
        { path: '/', component: Home },
        { path: '/login', component: Login },
        {
            path: '/admin',
            component: Admin,
            beforeEnter: () => console.log('  [3] beforeEnter（记录级守卫）'),
            children: [{ path: 'profile', component: Profile }],
        },
    ],
})

router.beforeEach((to, from) => {
    console.log(`  [1] beforeEach ${from.fullPath} → ${to.fullPath}`)
    if (to.path.startsWith('/admin') && !LOGGED_IN) {
        console.log('      ↳ 未登录，重定向到 /login')
        return { path: '/login' } // 返回对象 = 重定向，重新走一遍守卫流程
    }
})
router.afterEach((to, from) => {
    console.log(`  [4] afterEach ${from.fullPath} → ${to.fullPath}`)
})

let LOGGED_IN = false

console.log('---- 场景1：未登录访问 /admin/profile → beforeEach 重定向 ----')
router.push('/admin/profile')
console.log('最终 location =', history.location, '| currentRoute.path =', router.currentRoute.value.path)

console.log('')
console.log('---- 场景2：beforeEach 返回 false → 导航取消 ----')
const before = history.location
router.beforeEach((to) => (to.path === '/forbidden' ? false : undefined))
router.push('/forbidden')
console.log('location 是否未变 =', history.location === before, '| currentRoute 是否未变 =', router.currentRoute.value.path === before)

console.log('')
console.log('---- 场景3：登录后 → 守卫顺序 beforeEach → beforeEnter → afterEach ----')
LOGGED_IN = true
router.push('/admin/profile')
console.log('最终 location =', history.location, '| matched =', router.currentRoute.value.matched.map((r) => r.component.name).join(' → '))
