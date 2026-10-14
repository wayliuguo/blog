// src/client-entry.ts —— 客户端入口：createSSRApp + mount 在已有内容上自动走 hydration
import { createSSRApp, h } from 'vue'
import { routes } from './generated/routes.gen'
import { matchRoute } from './match'

declare global {
    interface Window {
        __PROPS__: unknown
    }
}

const matched = matchRoute(routes as any, location.pathname)
if (matched) {
    const props = (window.__PROPS__ ?? {}) as any
    const app = createSSRApp({ render: () => h((matched.page as any).default, props) })
    // 用 createApp 的话 mount 会整棵重建；createSSRApp 的 mount 会先尝试复用已有 DOM
    app.mount('#root')
}
