// 路由器主体：守卫流程 → 改 URL → 改 currentRoute（视图 effect 重跑）→ afterEach。
// 这就是「路由跳转」的全部主干，真实 vue-router 在此之上加了异步组件解析、
// beforeRouteUpdate/Leave、scrollBehavior 与重试队列。
const { ref } = require('./reactivity')
const { createRouterMatcher } = require('./matcher')

function createRouter({ history, routes }) {
    const matcher = createRouterMatcher(routes)
    const currentRoute = ref(matcher.resolve(history.location))

    // 浏览器前进/后退：URL 变了 → 直接同步内部状态，不经过守卫（与真实 vue-router 一致）
    history.listen((loc) => {
        currentRoute.value = matcher.resolve(loc)
    })

    const beforeEachGuards = []
    const afterEachHooks = []

    function navigate(to, method) {
        const target = matcher.resolve(to)
        const from = currentRoute.value
        if (target.fullPath === from.fullPath) return Promise.resolve(false) // 重复导航忽略

        // ① 全局 beforeEach：返回 false 取消、返回对象重定向
        for (const guard of beforeEachGuards) {
            const verdict = guard(target, from)
            if (verdict === false) return Promise.resolve(false)
            if (typeof verdict === 'object') return navigate(verdict, method)
        }
        // ② 路由记录自己的 beforeEnter（嵌套路由从外到内逐层执行）
        for (const record of target.matched) {
            if (typeof record.beforeEnter !== 'function') continue
            const verdict = record.beforeEnter(target, from)
            if (verdict === false) return Promise.resolve(false)
            if (typeof verdict === 'object') return navigate(verdict, method)
        }

        // ③ 守卫全过 → 先改 URL，再改状态：订阅 currentRoute 的视图 effect 重跑
        history[method](target.fullPath)
        currentRoute.value = target

        // ④ afterEach 只在成功导航后调用
        afterEachHooks.forEach((hook) => hook(target, from))
        return Promise.resolve(true)
    }

    // RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）
    function resolveView(depth = 0) {
        return currentRoute.value.matched[depth]?.component ?? null
    }

    return {
        currentRoute,
        resolve: (to) => matcher.resolve(to),
        push: (to) => navigate(to, 'push'),
        replace: (to) => navigate(to, 'replace'),
        back: () => history.go(-1),
        beforeEach: (fn) => beforeEachGuards.push(fn),
        afterEach: (fn) => afterEachHooks.push(fn),
        resolveView,
        // 真实 vue-router 的 install() 在这里 provide('router') 并注册 RouterView / RouterLink，
        // 见 README「与真实库的差距」
    }
}

module.exports = { createRouter }
