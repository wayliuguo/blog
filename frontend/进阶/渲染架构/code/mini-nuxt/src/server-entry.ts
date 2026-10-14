// src/server-entry.ts —— 服务端入口：每请求新建 SSR 应用实例（跨请求共享实例会串状态）
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { routes } from './generated/routes.gen'
import { matchRoute } from './match'
import { renderHtml } from './html'

export { routes, matchRoute, renderHtml }

export async function renderPage(pathname: string) {
    const matched = matchRoute(routes, pathname)
    if (!matched) return null
    // asyncData 挂在组件对象上（default 导出），不在模块命名空间上
    const comp = matched.page.default
    // 数据先于渲染就位：asyncData 跑完才渲染组件
    const props = comp.asyncData ? await comp.asyncData({ params: matched.params }) : {}
    const app = createSSRApp({ render: () => h(comp, props) })
    const html = await renderToString(app)
    return { html, props }
}
