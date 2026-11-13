import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import ProductView from './views/ProductView.vue'
import CartView from './views/CartView.vue'
import LabView from './views/LabView.vue'
import { sdk } from './sdk.js'
import { trackPageView } from './useReport.js'

// SDK 在 sdk.js 里 init：路由插件已完成 history 补丁，异常/性能/资源/请求/行为/白屏都在监听。
// PV 是业务事件，SDK 不自动上报，由下面路由钩子调用二次封装的 trackPageView()
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView },
        { path: '/product/:id', component: ProductView },
        { path: '/cart', component: CartView },
        { path: '/lab', component: LabView }
    ]
})

// 每次路由切换（含首次进入）报一条 PV，事件名 = monishop.页面.PV
router.afterEach(() => trackPageView())

const app = createApp(App)
sdk.attachVue(app) // Vue 组件内错误不会冒泡到 window，只能挂 errorHandler
app.use(router)
app.mount('#app')
