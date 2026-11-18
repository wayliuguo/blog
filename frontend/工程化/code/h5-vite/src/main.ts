import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 函数式组件（Toast / Dialog）不走模板解析，样式要手动引
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import './styles/index.css'
import App from './App.vue'
import router from './router'

createApp(App).use(createPinia()).use(router).mount('#app')
