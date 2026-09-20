/**
 * 优化入口：路由组件改成动态 import，切到哪个路由才下哪个 chunk
 * 真实项目里这一步是构建工具做的（Vite: () => import('./views/List.vue')），
 * 这里直接写在浏览器里，省掉构建步骤，效果一致
 */
import { mount } from './boot.js'

mount({
    split: true,
    loaders: {
        list: () => import('./routes/list.js'),
        detail: () => import('./routes/detail.js'),
        about: () => import('./routes/about.js')
    }
})
