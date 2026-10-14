// src/match.ts —— 路由匹配：/order/:id 形式的 pattern 与实际路径逐段比对
export interface PageModule {
    default: (props: any) => any
    load?: (params: Record<string, string>) => Promise<unknown> | unknown
}

export interface Route {
    pattern: string
    page: PageModule
}

export function matchRoute(routes: Route[], pathname: string) {
    const segs = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
    for (const r of routes) {
        const parts = r.pattern.split('/').filter(Boolean)
        if (parts.length !== segs.length) continue
        const params: Record<string, string> = {}
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
