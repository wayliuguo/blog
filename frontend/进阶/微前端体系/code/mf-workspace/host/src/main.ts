import { createApp } from 'vue'
import WujieVue from 'wujie-vue3'
import App from './App.vue'
import { router } from './router'
import './register-micro-apps'

// qiankun 官方 FAQ 的宿主垫片：子应用产物里残留的 process.env 引用
// 在浏览器与 qiankun 沙箱里都没有定义，宿主必须兜底（真实工程高频坑）
const w = window as unknown as { process?: { env: Record<string, string> } }
if (!w.process) w.process = { env: { NODE_ENV: 'production' } }

createApp(App).use(router).use(WujieVue).mount('#app')
