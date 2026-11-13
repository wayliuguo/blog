// 输入：插件配置（clickSelectors / exposeAttribute / breadcrumbSize / scrollDepth）
// 输出：行为插件（点击委托 + 曝光观察 + 滚动深度，同时维护面包屑环形队列）
// 过程：点击捕获委托 → 曝光 IntersectionObserver（MutationObserver 补挂首屏）→ 滚动到底只报一次
export function createBehaviorPlugin(options) {
    return {
        name: 'behavior',
        setup(ctx) {
            const push = (type, message) => {
                const list = ctx.context.breadcrumbs
                list.push({ time: Date.now(), type, message: message.slice(0, 120) })
                if (list.length > options.breadcrumbSize) list.splice(0, list.length - options.breadcrumbSize)
            }
            const selectorOf = el => {
                if (el.id) return `#${el.id}`
                const track = el.getAttribute('data-track')
                if (track) return `[data-track="${track}"]`
                const parent = el.parentElement
                const tag = el.tagName.toLowerCase()
                return parent && parent !== document.body ? `${parent.tagName.toLowerCase()} > ${tag}` : tag
            }
            // 输入：一次点击
            // 输出：behavior 事件 + 一条面包屑
            // 过程：从事件目标向上找最近的可交互元素（捕获阶段委托，动态节点不用重新绑定）
            const onClick = event => {
                try {
                    const target = event.target
                    if (!target || typeof target.closest !== 'function') return
                    const el = target.closest(options.clickSelectors)
                    if (!el) return
                    const track = el.getAttribute('data-track') || ''
                    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
                    const label = track || text || el.tagName.toLowerCase()
                    ctx.emit({
                        type: 'behavior',
                        subtype: 'click',
                        message: label,
                        data: {
                            action: 'click',
                            target: el.tagName.toLowerCase(),
                            text,
                            selector: selectorOf(el),
                            x: event.clientX,
                            y: event.clientY
                        }
                    })
                    push('click', label)
                } catch {
                    /* 静默 */
                }
            }
            document.addEventListener('click', onClick, true)
            // 曝光：进入视口一半即算，观察到就注销——注销本身就是去重
            let observer = null
            try {
                observer = new IntersectionObserver(
                    entries => {
                        for (const entry of entries) {
                            if (!entry.isIntersecting) continue
                            observer?.unobserve(entry.target)
                            const name = entry.target.getAttribute(options.exposeAttribute) || ''
                            ctx.emit({
                                type: 'behavior',
                                subtype: 'expose',
                                message: name,
                                data: { action: 'expose', selector: name }
                            })
                        }
                    },
                    { threshold: 0.5 }
                )
            } catch {
                /* 不支持 IntersectionObserver 就放弃曝光能力，不影响其他采集 */
            }
            const seen = new WeakSet()
            let scanTimer = null
            /** 全量扫一遍带曝光标记的元素挂上 observer：WeakSet 记录已挂的，防重复 observe */
            const scan = () => {
                if (!observer) return
                for (const el of Array.from(document.querySelectorAll(`[${options.exposeAttribute}]`))) {
                    if (seen.has(el)) continue
                    seen.add(el)
                    observer.observe(el)
                }
            }
            // init 时框架通常还没 mount，首扫必然扑空：靠 MutationObserver 补挂，200ms 合并一次
            const scheduleScan = () => {
                if (scanTimer !== null) return
                scanTimer = window.setTimeout(() => {
                    scanTimer = null
                    scan()
                }, 200)
            }
            scan()
            const mutations = new MutationObserver(scheduleScan)
            mutations.observe(document.documentElement, { childList: true, subtree: true })
            // 滚动深度：只报一次到底，路由切换后重置
            let reported = false
            let scrollTimer = null
            const onScroll = () => {
                if (reported || scrollTimer !== null) return
                scrollTimer = window.setTimeout(() => {
                    scrollTimer = null
                    try {
                        const doc = document.documentElement
                        const max = doc.scrollHeight - window.innerHeight
                        const depth = max <= 0 ? 1 : Math.min(1, window.scrollY / max)
                        if (depth < options.scrollDepth) return
                        reported = true
                        ctx.emit({
                            type: 'behavior',
                            subtype: 'scroll-depth',
                            message: `滚动深度 ${Math.round(depth * 100)}%`,
                            data: { action: 'scroll-depth', depth: Math.round(depth * 100) }
                        })
                        push('scroll', `${Math.round(depth * 100)}%`)
                    } catch {
                        /* 静默 */
                    }
                }, 300)
            }
            window.addEventListener('scroll', onScroll, { passive: true })
            /** 路由切换重置滚动上报，并把新页面写进面包屑 */
            const offRoute = ctx.onRouteChange(page => {
                reported = false
                push('route', page.path)
            })
            return () => {
                document.removeEventListener('click', onClick, true)
                window.removeEventListener('scroll', onScroll)
                observer?.disconnect()
                mutations.disconnect()
                if (scanTimer !== null) clearTimeout(scanTimer)
                if (scrollTimer !== null) clearTimeout(scrollTimer)
                offRoute()
            }
        }
    }
}
