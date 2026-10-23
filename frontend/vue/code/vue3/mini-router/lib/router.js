// ============================================================
// mini-router/router —— 路由器主体：守卫流程 → 改 URL → 改 currentRoute
// 对应真实包：vue-router（源码 packages/vue-router/src/router.ts 的 createRouter）
// 依赖：shared.js 的工具随 matcher.js 间接可用；reactivity.js 的 ref / effect；
//       matcher.js 的 createRouterMatcher；history.js 的三模式接口
// 覆盖机制（对应《Vue Router 原理》四、路由器主体）：
//   currentRoute 是唯一状态源（一个 ref，存 resolve 后的完整路由对象）、
//   navigate 守卫主干（全局 beforeEach → 记录级 beforeEnter → 改 URL → 改状态 → afterEach，
//   守卫三种表态：通过 / false 取消 / 对象重定向）、
//   history.listen 同步前进 / 后退（不经过守卫）、
//   resolveView 按渲染深度取 matched 链组件（RouterView 的选择逻辑）
// ★ 建议断点：navigate（守卫主干：看 verdict 的三种取值、先改 URL 再改状态两行）、
//   resolveView（按深度取 matched 链）、history.listen 回调（前进 / 后退的静默同步）
// ============================================================

/**
 * 创建路由器：组合 matcher 与 history，暴露导航、守卫注册与 currentRoute。
 * 过程：建 matcher；把 resolve(history.location) 的结果作为 currentRoute 初始值；
 * 向 history 注册 listen —— 浏览器前进 / 后退（非程序化跳转）时直接同步
 * currentRoute，不经过守卫；push / replace 则走完整守卫流程 navigate。
 * @param {{ history: { location: string, push: Function, replace: Function, go: Function, listen: Function }, routes: Array }} options
 *   history 是三种模式 history 之一；routes 是嵌套路由配置表
 * @returns {{ currentRoute: { value: object }, resolve: Function, push: Function, replace: Function, back: Function, beforeEach: Function, afterEach: Function, resolveView: Function }}
 *   路由器接口；真实 vue-router 的 install() 还会 provide('router') 并注册
 *   RouterView / RouterLink 组件，本实现以 resolveView 纯函数代替
 * @example const router = createRouter({ history: createMemoryHistory(), routes }) → router.currentRoute.value 即初始路由
 * @example router.push('/about') → 守卫通过后 currentRoute.value.name 变为 'about'，Promise resolve true
 */
function createRouter({ history, routes }) {
    const matcher = createRouterMatcher(routes)
    const currentRoute = ref(matcher.resolve(history.location))

    // 浏览器前进/后退：URL 变了 → 直接同步内部状态，不经过守卫（与真实 vue-router 一致）
    history.listen(loc => {
        currentRoute.value = matcher.resolve(loc)
    })

    const beforeEachGuards = []
    const afterEachHooks = []

    /**
     * 导航主干：守卫流程 → 改 URL → 改 currentRoute。
     * 过程：resolve 目标 → 与当前路由 fullPath 相同则忽略（重复导航）→ 依次跑
     * 全局 beforeEach、matched 链上每个 record 的 beforeEnter（嵌套路由从外到内）
     * → 全过则先 history[method] 改 URL、再给 currentRoute 赋值（订阅它的视图
     * effect 重跑）→ 最后跑 afterEach（只在成功落地后）。
     * 守卫三种表态：undefined / 无返回值 = 通过；false = 取消（URL 与状态都不动）；
     * 对象 = 重定向（递归 navigate 重新走一遍流程，中间目标不记 afterEach）。
     * @param {string|{ path: string, query?: object }} to 目标地址
     * @param {'push'|'replace'} method 落地时调用的 history 方法名
     * @returns {Promise<boolean>} 成功落地 true；重复导航或被取消 false
     * @example push('/user/7') → Promise resolve true，currentRoute.value.params = { id: '7' }
     * @example push 与当前路由相同的地址 → Promise resolve false，视图 effect 不重跑
     * @example beforeEach 返回 { path: '/login' } → 递归导航到 /login，最终只记一次 afterEach
     */
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
        afterEachHooks.forEach(hook => hook(target, from))
        return Promise.resolve(true)
    }

    /**
     * RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）。
     * @param {number} [depth=0] RouterView 的嵌套深度：0 = 最外层，1 = 它内部的子 RouterView
     * @returns {*|null} 该深度的组件定义；matched 链没有这一层（未匹配或超出深度）时为 null
     * @example matched = [Settings, Notifications] 时 resolveView(0) → Settings 组件、resolveView(1) → Notifications 组件
     * @example matched = []（未匹配）时 resolveView(0) → null（视图渲染为空）
     */
    // RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）
    function resolveView(depth = 0) {
        return currentRoute.value.matched[depth]?.component ?? null
    }

    return {
        currentRoute,
        resolve: to => matcher.resolve(to),
        push: to => navigate(to, 'push'),
        replace: to => navigate(to, 'replace'),
        back: () => history.go(-1),
        beforeEach: fn => beforeEachGuards.push(fn),
        afterEach: fn => afterEachHooks.push(fn),
        resolveView
        // 真实 vue-router 的 install() 在这里 provide('router') 并注册 RouterView / RouterLink，
        // 见 README「与真实库的差距」
    }
}
