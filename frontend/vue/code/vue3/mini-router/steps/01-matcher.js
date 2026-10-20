// 匹配器实测：静态/动态/嵌套路由怎么从「路径字符串」变成「组件链 + 参数」
const { createRouterMatcher } = require('../src/matcher')

const Home = { name: 'Home' }
const About = { name: 'About' }
const User = { name: 'User' }
const Settings = { name: 'Settings' }
const Profile = { name: 'Profile' }
const Notifications = { name: 'Notifications' }

const matcher = createRouterMatcher([
    { path: '/', component: Home, name: 'home' },
    { path: '/about', component: About, name: 'about' },
    { path: '/user/:id', component: User, name: 'user' },
    {
        path: '/settings',
        component: Settings,
        children: [
            { path: 'profile', component: Profile },
            { path: 'notifications', component: Notifications, meta: { badge: true } },
        ],
    },
])

console.log('---- 静态路径 ----')
const about = matcher.resolve('/about')
console.log('path =', about.path, '| matched =', about.matched.map((r) => r.component.name))

console.log('')
console.log('---- 动态段 + query ----')
const user = matcher.resolve('/user/42?tab=posts')
console.log('params =', user.params, '| query =', user.query, '| name =', user.name)
console.log('fullPath =', user.fullPath)

console.log('')
console.log('---- 嵌套路由：matched 是一条链 ----')
const notif = matcher.resolve('/settings/notifications')
console.log('matched 链 =', notif.matched.map((r) => r.component.name).join(' → '))
console.log('depth 0 组件（父 RouterView）=', notif.matched[0].component.name)
console.log('depth 1 组件（子 RouterView）=', notif.matched[1].component.name)
console.log('meta =', notif.meta)

console.log('')
console.log('---- 未匹配 ----')
const none = matcher.resolve('/nope')
console.log('matched =', none.matched, ' <- RouterView 渲染为空')

console.log('')
console.log('---- 动态追加路由（权限路由的底层机制） ----')
matcher.addRoute({ path: '/docs/:slug', component: { name: 'Docs' }, name: 'docs' })
console.log('addRoute 后 resolve("/docs/mini-router") =', matcher.resolve('/docs/mini-router').params)
