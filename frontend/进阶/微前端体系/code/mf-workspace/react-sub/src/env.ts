// env.ts：接收端的环境探测——每种方案"下行数据"的到达方式不同，这里集中适配
declare global {
    interface Window {
        microApp?: {
            dispatch: (data: unknown) => void
            addDataListener: (fn: (data: Record<string, unknown>) => void, autoTrigger?: boolean) => void
            removeDataListener: (fn: (data: Record<string, unknown>) => void) => void
        }
        $wujie?: { bus: { $emit: (e: string, ...args: unknown[]) => void; $on: (e: string, fn: (...args: unknown[]) => void) => void } }
        __POWERED_BY_QIANKUN__?: boolean
    }
}

export type Env = 'standalone' | 'iframe' | 'qiankun' | 'micro-app' | 'wujie' | 'web-components'

export function detectEnv(): Env {
    if (window.__POWERED_BY_QIANKUN__) return 'qiankun'
    if (window.$wujie) return 'wujie'
    if (window.microApp) return 'micro-app'
    if (new URLSearchParams(location.search).get('mode') === 'iframe') return 'iframe'
    if (customElements.get('order-detail-element')) return 'web-components'
    return 'standalone'
}
