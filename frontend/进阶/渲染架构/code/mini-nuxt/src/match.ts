// src/match.ts —— 与 mini-next 同一套逐段匹配：/order/:id 对实际路径
export function matchRoute(routes, pathname) {
    const segs = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
    for (const r of routes) {
        const parts = r.pattern.split('/').filter(Boolean)
        if (parts.length !== segs.length) continue
        const params = {}
        const ok = parts.every((p, i) => {
            if (p.startsWith(':')) {
                params[p.slice(1)] = segs[i]
                return true
            }
            return p === segs[i]
        })
        if (ok) return { page: r.page, params }
    }
    return null
}
