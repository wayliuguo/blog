import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import ProductView from './views/ProductView.vue'
import CartView from './views/CartView.vue'
import LabView from './views/LabView.vue'
import { init, report } from '../monitor-sdk/src/index.js'
import { trackPageView } from './useReport.js'

// SDK 保留核心能力：异常 / 性能 / 声明上报 / 批量与节流上报。
// PV 是业务事件：SDK 不自动上报，由下方路由钩子调用二次封装的 trackPageView()
const sdk = init({
    endpoint: 'http://localhost:5189/api/report', // 上报地址：collector 接收端
    eventPrefix: 'monishop', // 声明式事件名前缀：monishop.product_expose:1
    commonParams: { uid: 'u_123', channel: 'h5', ab_group: 'B' }, // 公参：静态传入，每条事件自动附带
    release: '1.0.0',
    environment: 'development',
    debug: true,
    // beforeSend：治理唯一收口。这里演示两件事：
    // ① 脱敏——URL 只留 path，丢掉可能带 token 的 query
    // ② 计数——实验室采样演示用（beforeSend 只收到通过采样的事件）
    beforeSend(event) {
        window.__monitorPassed = (window.__monitorPassed || 0) + 1
        if (event.data && event.data.url) {
            event.data.url = event.data.url.split('?')[0]
        }
        return event
    }
})

// 演示/调试：控制台可直接 __sdk.stats 看送达、__report({...}) 试用手动上报
window.__sdk = sdk
window.__report = report

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView },
        { path: '/product/:id', component: ProductView },
        { path: '/cart', component: CartView },
        { path: '/lab', component: LabView }
    ]
})

// PV 手动上报：每次路由切换（含首次进入）一条，事件名 = monishop.HOME.PV
router.afterEach(() => trackPageView())

const app = createApp(App)
sdk.attachVue(app) // errorHandler 接管：框架内错误归一到异常上报
app.use(router)
app.mount('#app')
