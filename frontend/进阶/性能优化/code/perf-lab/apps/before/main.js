/**
 * 优化前入口：四个视图在编译期就打进同一个依赖图
 * 浏览器要等 main.js → ListView/DetailView/ReportView/AboutView 全部到位才能渲染第一屏
 * 跑 `npm run build` 后对比 dist-before/assets：这一版的四个视图没有独立 chunk
 */
import { createApp } from 'vue'
import App from '@lab/App.vue'
import ListView from '@lab/views/ListView.vue'
import DetailView from '@lab/views/DetailView.vue'
import ReportView from '@lab/views/ReportView.vue'
import AboutView from '@lab/views/AboutView.vue'

createApp(App, {
    split: false,
    loaders: {
        list: async () => ListView,
        detail: async () => DetailView,
        report: async () => ReportView,
        about: async () => AboutView
    }
}).mount('#app')
