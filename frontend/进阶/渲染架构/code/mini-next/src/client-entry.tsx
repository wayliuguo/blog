// src/client-entry.tsx —— 客户端入口：hydrateRoot「认领」服务端已有的 DOM，而不是重建
import { hydrateRoot } from 'react-dom/client'
import { createElement } from 'react'
import { routes } from './generated/routes.gen'
import { matchRoute } from './match'

declare global {
    interface Window {
        __PROPS__: unknown
    }
}

const matched = matchRoute(routes, location.pathname)
if (matched) {
    hydrateRoot(document.getElementById('root')!, createElement(matched.page.default, window.__PROPS__))
}
