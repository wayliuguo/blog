/**
 * 优化前入口：一个标准 vite 项目的写法 —— 样式与五个视图全部在编译期打进同一个依赖图。
 * 路由用 vue-router 的静态路由表：component 直接写 import 进来的组件，
 * 路由库与五个视图都在编译期进入主 bundle，跑 `npm run build` 后看 dist-before/assets：
 * 五个视图没有独立 chunk，全在主 bundle 里。
 */
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import './assets/main.css'
import App from './App.vue'
import DashboardView from './views/DashboardView.vue'
import ListView from './views/ListView.vue'
import DetailView from './views/DetailView.vue'
import ReportView from './views/ReportView.vue'
import AboutView from './views/AboutView.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', component: DashboardView },
        { path: '/list', component: ListView },
        { path: '/detail/:id', component: DetailView },
        { path: '/report', component: ReportView },
        { path: '/about', component: AboutView }
    ]
})

createApp(App).use(router).mount('#app')
