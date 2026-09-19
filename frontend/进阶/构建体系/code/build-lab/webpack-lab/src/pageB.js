// 第二个入口：与 index 共享 shared / heavy —— 这才是 common chunk 的典型场景
import { heavy } from './heavy.js'
import { shared } from './shared.js'

console.log('pageB:', shared(), heavy())
