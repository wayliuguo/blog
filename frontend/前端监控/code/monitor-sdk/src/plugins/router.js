// 输入：无配置
// 输出：路由插件（pushState/replaceState 补丁 + popstate/hashchange 监听）
// 过程：三路路由变化汇进同一个 commit，首屏补一条 enter；清理函数还原补丁与监听
export function createRouterPlugin() {
    return {
        name: 'router',
        setup(ctx) {
            let lastPath = location.pathname + location.search
            let lastAt = Date.now()
            // 输入：路由动作类型
            // 输出：一条路由事件 + 更新后的 page 快照
            // 过程：读新地址 → 与上次地址算停留时长 → setPage 广播 → emit
            const commit = action => {
                const next = location.pathname + location.search
                const from = lastPath
                const now = Date.now()
                const duration = now - lastAt
                lastPath = next
                lastAt = now
                ctx.setPage({
                    url: location.href,
                    path: location.pathname,
                    route: location.pathname,
                    title: document.title || ''
                })
                // 框架通常在 afterEach 才写 document.title，延后一拍把标题补正
                window.setTimeout(() => {
                    ctx.context.page.title = document.title || ctx.context.page.title
                }, 0)
                ctx.emit({
                    type: 'router',
                    subtype: action,
                    message: `${from} → ${next}`,
                    data: { from, to: next, route: location.pathname, duration, action }
                })
            }
            const originalPush = history.pushState
            const originalReplace = history.replaceState
            history.pushState = function (...args) {
                const result = originalPush.apply(this, args)
                commit('push')
                return result
            }
            history.replaceState = function (...args) {
                const result = originalReplace.apply(this, args)
                commit('replace')
                return result
            }
            const onPopState = () => commit('popstate')
            const onHashChange = () => commit('hashchange')
            window.addEventListener('popstate', onPopState)
            window.addEventListener('hashchange', onHashChange)
            // 首屏也发一条：没有它，第一条路由事件就缺少 from，停留时长也无从计算
            ctx.emit({
                type: 'router',
                subtype: 'enter',
                message: `enter ${lastPath}`,
                data: { from: '', to: lastPath, route: location.pathname, duration: 0, action: 'enter' }
            })
            return () => {
                history.pushState = originalPush
                history.replaceState = originalReplace
                window.removeEventListener('popstate', onPopState)
                window.removeEventListener('hashchange', onHashChange)
            }
        }
    }
}
