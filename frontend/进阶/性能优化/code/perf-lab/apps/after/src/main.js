/**
 * 优化后入口：两处优化写法 ——
 *   1. 路由表里 component 写 () => import(...)（vue-router 的路由懒加载）：
 *      切到哪个路由才下哪个 chunk，rollup 把每个路由的模块图切成独立 chunk
 *   2. 全量样式从依赖图进（构建时抽出 <link>，由 htmlAsyncCss 插件改写成异步）
 * 对照 before/src/main.js 的静态路由，产物里会多出五个视图 chunk（见实战篇构建层一节）
 */
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import './assets/main.css'
import App from './App.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: '/dashboard' },
        { path: '/dashboard', component: () => import('./views/DashboardView.vue') },
        { path: '/list', component: () => import('./views/ListView.vue') },
        { path: '/detail/:id', component: () => import('./views/DetailView.vue') },
        { path: '/report', component: () => import('./views/ReportView.vue') },
        { path: '/about', component: () => import('./views/AboutView.vue') }
    ]
})

createApp(App).use(router).mount('#app')
