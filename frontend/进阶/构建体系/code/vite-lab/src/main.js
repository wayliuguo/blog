import { createApp } from 'vue'
import MagicString from 'magic-string'
import App from './App.vue'
import router from './router.js'
import './style.css'
import './mock.js' // 不该上线，会被 mini-drop 清空
import './main.spec.js' // 不该上线，会被 mini-drop 清空
import { BUILD_INFO } from 'virtual:build-info' // 磁盘上不存在，由 mini-virtual 提供

// import.meta.env 会被 Vite 在构建期静态替换成字面量
const appName = import.meta.env.VITE_APP_NAME
const inProd = import.meta.env.PROD

// 引一个真实 npm 依赖：它会被 manualChunks 单独切成 vendor chunk
const ms = new MagicString('const a = 1')
ms.append('; const b = 2')

const app = createApp(App)
app.use(router)
// 虚拟模块 + 环境变量的值注入应用，App.vue / About.vue 取出来渲染
app.provide('appInfo', { appName, inProd, build: BUILD_INFO })
app.mount('#app')

console.log('调试日志：构建期会被 mini-drop 清掉')
console.log(ms.toString())
