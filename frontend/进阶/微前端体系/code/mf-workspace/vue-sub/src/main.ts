import { createApp, type App as VueApp } from 'vue'
import App from './App.vue'
import { setQiankunStateSetter } from './env'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

let app: VueApp | null = null

function mount(container: string | HTMLElement) {
    app = createApp(App)
    app.mount(typeof container === 'string' ? container : container)
}

// 独立运行（直接开 http://127.0.0.1:3031/）：不走 qiankun 生命周期
if (!(qiankunWindow as unknown as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) {
    mount('#app')
} else {
    // 被 qiankun 加载：导出生命周期协议。renderWithQiankun 是 vite-plugin-qiankun
    // 提供的包装，把 props（container/setGlobalState 等）注入 qiankunWindow
    renderWithQiankun({
        bootstrap() {},
        mount(props) {
            // qiankun 通信通道从注入点走（App.vue 不感知插件细节）
            setQiankunStateSetter((s) => props.setGlobalState(s))
            mount(props.container)
        },
        unmount() {
            app?.unmount()
            app = null
        },
    })
}
