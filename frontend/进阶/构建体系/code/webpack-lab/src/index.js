import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './style.css'

// 单入口：建 Vue 应用 → 装路由 → 挂到 MiniHtmlPlugin 生成的 #app 上
createApp(App).use(router).mount('#app')