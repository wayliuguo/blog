import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import Errors from './views/Errors.vue'
import Perf from './views/Perf.vue'
import Track from './views/Track.vue'

// hash 路由：适配静态下发（生产形态）时刷新不 404，也无需后端 history 回退配置
export default createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', name: 'home', component: Home },
        { path: '/errors', name: 'errors', component: Errors },
        { path: '/perf', name: 'perf', component: Perf },
        { path: '/track', name: 'track', component: Track }
    ]
})
