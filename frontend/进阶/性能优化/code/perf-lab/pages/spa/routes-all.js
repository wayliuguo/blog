/**
 * 未优化版入口：三个路由在编译期就打进同一个依赖图
 * 浏览器要等 app.js → routes-all.js → list.js / detail.js / about.js 全部到位才能渲染第一屏
 */
import list from './routes/list.js'
import detail from './routes/detail.js'
import about from './routes/about.js'

export default { list, detail, about }
