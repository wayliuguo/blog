// main-qk.tsx：qiankun/micro-app/wujie 三方案共用的 UMD 产物入口（React 侧）。
// qiankun 走生命周期协议；micro-app/wujie 期待自挂载（见 main-qk.ts 顶部说明）。
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import './app.css'

let root: Root | null = null

export async function bootstrap() {}

export async function mount(props: {
    container: HTMLElement | string
    onGlobalStateChange?: (fn: (state: { selectedId?: string }) => void) => void
}) {
    const container = typeof props.container === 'string' ? document.querySelector(props.container)! : props.container
    root = createRoot(container)
    root.render(
        <StrictMode>
            <App onGlobalStateChange={props.onGlobalStateChange} />
        </StrictMode>,
    )
}

export async function unmount() {
    // createRoot 必须显式卸载，否则 React 18 的并发调度残留会撑爆内存
    root?.unmount()
    root = null
}

if (!(window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) {
    mount({ container: '#root' })
}
