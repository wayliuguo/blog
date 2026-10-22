// 声明上报：data-track 点击（事件委托）/ data-expose 曝光（IntersectionObserver）
// 声明式事件名 = eventPrefix.名称（eventPrefix 在 init 时静态传入，如 monishop.product_expose:1）
export function initDeclarative(cfg, win, send) {
    function track(name, params = {}) {
        send({
            type: 'track',
            event: (cfg.eventPrefix ? cfg.eventPrefix + '.' : '') + name,
            params
        })
    }

    const doc = win.document
    if (!doc || !doc.addEventListener) return

    // 点击委托挂捕获阶段：业务方 stopPropagation 也拦不住埋点；一个监听覆盖全页，动态元素天然生效
    doc.addEventListener(
        'click',
        (e) => {
            try {
                const el = e.target.closest('[data-track]')
                if (el) track(el.dataset.track, { text: (el.textContent || '').trim().slice(0, 20) })
            } catch (err) {
                /* 静默 */
            }
        },
        true
    )

    if (typeof win.IntersectionObserver !== 'function') return
    const io = new win.IntersectionObserver(
        (entries) => {
            for (const en of entries) {
                if (en.isIntersecting) {
                    track(en.target.dataset.expose)
                    io.unobserve(en.target) // 观察后即注销：同一元素只报一次
                }
            }
        },
        { threshold: 0.5 }
    )
    // init 时 Vue 还没 mount，首屏扫描 [data-expose] 必然扑空——SPA 的曝光元素是动态渲染的。
    // MutationObserver 补挂：新节点进文档即注册曝光观察，列表异步加载同样覆盖
    const observeAll = (root) => root.querySelectorAll('[data-expose]').forEach((el) => io.observe(el))
    observeAll(doc)
    const mo = new win.MutationObserver((muts) => {
        for (const m of muts) {
            m.addedNodes.forEach((n) => {
                if (n.nodeType !== 1) return
                if (n.matches && n.matches('[data-expose]')) io.observe(n)
                else if (n.querySelectorAll) observeAll(n)
            })
        }
    })
    mo.observe(doc.body || doc, { childList: true, subtree: true })
}
