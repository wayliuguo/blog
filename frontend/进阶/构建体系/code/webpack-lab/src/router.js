import { createRouter, createWebHistory } from 'vue-router'

// 路由级懒加载：() => import() 是动态 import，webpack 会为每个视图切出独立 chunk，首屏不下载
const routes = [
    { path: '/', name: 'home', component: () => import('./views/Home.vue') },
    { path: '/about', name: 'about', component: () => import('./views/About.vue') }
]

export default createRouter({
    history: createWebHistory(),
    routes
})