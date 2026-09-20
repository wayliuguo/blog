/** 未优化入口：三个路由静态引入，首屏一次性下完 */
import { mount } from './boot.js'
import all from './routes-all.js'

mount({
    split: false,
    loaders: {
        list: async () => all.list,
        detail: async () => all.detail,
        about: async () => all.about
    }
})
