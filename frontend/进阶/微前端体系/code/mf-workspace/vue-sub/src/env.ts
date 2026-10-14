// env.ts：运行环境探测——真实微前端子应用的第一件事就是搞清楚"我被谁加载了"
declare global {
    interface Window {
        microApp?: { dispatch: (data: unknown) => void }
        $wujie?: { bus: { $emit: (e: string, ...args: unknown[]) => void; $on: (e: string, fn: (...args: unknown[]) => void) => void } }
    }
}

export type Env = 'standalone' | 'iframe' | 'qiankun' | 'micro-app' | 'wujie'

export function detectEnv(): Env {
    if ((window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) return 'qiankun'
    if (window.$wujie) return 'wujie'
    if (window.microApp) return 'micro-app'
    if (new URLSearchParams(location.search).get('mode') === 'iframe') return 'iframe'
    return 'standalone'
}

export function reportSelect(orderId: string) {
    // 一个动作按当前环境选择唯一通道，避免双重上报；事件名统一为 order-select
    const env = detectEnv()
    switch (env) {
        case 'qiankun':
            qiankunStateSetter?.({ selectedId: orderId })
            break
        case 'micro-app':
            window.microApp!.dispatch({ type: 'order-select', orderId })
            break
        case 'wujie':
            window.$wujie!.bus.$emit('order-select', orderId)
            break
        case 'iframe':
            window.parent.postMessage({ type: 'order-select', orderId }, '*')
            break
        default:
            // bubbles + composed：作为自定义元素运行时穿透 shadow DOM 边界冒泡到宿主
            window.dispatchEvent(new CustomEvent('order-select', { detail: { orderId }, bubbles: true, composed: true }))
    }
}

// qiankun 通道的上行走注入的 setter（dev 与 UMD 产物两种入口各自注入，
// 避免 App.vue 直接依赖 vite-plugin-qiankun——UMD 产物里不该有 dev 插件的痕迹）
let qiankunStateSetter: ((s: object) => void) | null = null
export function setQiankunStateSetter(fn: (s: object) => void) { qiankunStateSetter = fn }
