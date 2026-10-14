// src/server-entry.ts —— 服务端入口：把路由表与渲染能力打包给 server.mjs
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { routes } from './generated/routes.gen'
import { matchRoute } from './match'
import { renderHtml } from './html'

export { routes, matchRoute, renderHtml }

export async function renderPage(pathname: string) {
    const matched = matchRoute(routes, pathname)
    if (!matched) return null
    // 数据先于渲染就位：load 在服务端跑完，props 才交给组件
    const props = matched.page.load ? await matched.page.load(matched.params) : {}
    const html = renderToString(createElement(matched.page.default, props))
    return { html, props }
}
