import { createRouter, createWebHashHistory } from 'vue-router'
import IframePlan from './views/IframePlan.vue'
import QiankunPlan from './views/QiankunPlan.vue'
import MicroAppPlan from './views/MicroAppPlan.vue'
import WujiePlan from './views/WujiePlan.vue'
import WcPlan from './views/WcPlan.vue'

// hash 路由：避免与子应用 history 路由互相干扰（宿主 URL 变化不触发子应用路由守卫）
export const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: '/iframe' },
        { path: '/iframe', component: IframePlan },
        { path: '/qiankun', component: QiankunPlan },
        { path: '/micro-app', component: MicroAppPlan },
        { path: '/wujie', component: WujiePlan },
        { path: '/web-components', component: WcPlan },
    ],
})
