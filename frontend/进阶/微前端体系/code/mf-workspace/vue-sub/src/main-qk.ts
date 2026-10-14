// main-qk.ts：qiankun/micro-app/wujie 三方案共用的 UMD 产物入口。
// 这就是 qiankun 生态的标准形态：构建成 UMD，导出 bootstrap/mount/unmount 生命周期。
// （vite-plugin-qiankun 的 dev 模式与 @vitejs/plugin-react 的 HMR preamble 冲突，
//  生产实践与教学演示统一走产物——dev server 只服务 iframe 接线与本地调试。）
//
// 生命周期协议只属于 qiankun：micro-app/wujie 不调 lifecycle，它们期待应用
// 像普通页面一样自挂载（DOM 归属由两方案各自的容器机制接管）。
import { createApp, type App as VueApp } from 'vue'
import App from './App.vue'
import { setQiankunStateSetter } from './env'
import './app.css'

let app: VueApp | null = null

export async function bootstrap() {}

export async function mount(props: { container: HTMLElement | string; setGlobalState?: (s: object) => void }) {
    if (props.setGlobalState) setQiankunStateSetter(props.setGlobalState)
    app = createApp(App)
    app.mount(typeof props.container === 'string' ? document.querySelector(props.container)! : props.container)
}

export async function unmount() {
    app?.unmount()
    app = null
}

// 非 qiankun 环境（micro-app / wujie / 直接打开产物页）自挂载
if (!(window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) {
    mount({ container: '#root' })
}
