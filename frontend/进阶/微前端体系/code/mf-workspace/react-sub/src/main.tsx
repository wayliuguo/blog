import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

let root: Root | null = null

function mount(container: HTMLElement | string, initialOrderId?: string, onGlobalStateChange?: unknown) {
    root = createRoot(typeof container === 'string' ? document.querySelector(container)! : container)
    root.render(
        <StrictMode>
            <App
                initialOrderId={initialOrderId}
                onGlobalStateChange={onGlobalStateChange as React.ComponentProps<typeof App>['onGlobalStateChange']}
            />
        </StrictMode>,
    )
}

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
    mount('#root', new URLSearchParams(location.search).get('orderId') ?? '1001')
} else {
    renderWithQiankun({
        bootstrap() {},
        mount(props) {
            mount(props.container, props.initialOrderId, props.onGlobalStateChange)
        },
        unmount() {
            // createRoot 必须显式卸载，否则 React 18 的并发调度残留会撑爆内存
            root?.unmount()
            root = null
        },
    })
}
