import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import introHtml from './intro.md'
import './style.css'

// 单入口：建 Vue 应用 → 装路由 → 挂到 MiniHtmlPlugin 生成的 #app 上
createApp(App).use(router).mount('#app')

// markdown-loader 的输出：intro.md 被编译成「导出 HTML 字符串」的 JS 模块；
// window.__APP_VERSION__ 由 mini-define-plugin 在构建期插进每个 JS 产物头部
const demo = document.createElement('section')
demo.id = 'md-demo'
demo.innerHTML = introHtml + `<p>当前构建版本：${window.__APP_VERSION__ || '(未注入)'}</p>`
demo.style.cssText = 'max-width:640px;margin:16px auto;padding:16px;border-top:1px solid #eee;font-size:14px'
document.body.appendChild(demo)
