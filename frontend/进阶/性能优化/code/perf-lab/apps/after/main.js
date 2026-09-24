/**
 * 优化后入口：路由组件改成动态 import，切到哪个路由才下哪个 chunk
 * 真实项目里这一步就是构建工具做的（vite：() => import('@lab/views/ListView.vue')），
 * 与 apps/before 的差别会被 rollup 如实翻译成「多出四个 chunk」
 */
import { createApp } from 'vue'
import App from '@lab/App.vue'

createApp(App, {
    split: true,
    loaders: {
        list: () => import('@lab/views/ListView.vue'),
        detail: () => import('@lab/views/DetailView.vue'),
        report: () => import('@lab/views/ReportView.vue'),
        about: () => import('@lab/views/AboutView.vue')
    }
}).mount('#app')
