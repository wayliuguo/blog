import './index.css'
import './index.less'
import img from '@/index.jpg'
import small from '@/small.png'
new Image().src = img
new Image().src = small
import axios from 'axios'
axios.get('/api/getNum').then(res => console.log(res))

// eslint-disable-next-line no-undef
console.log(baseURL)

// 批量引入 (路径,是否引入子文件,匹配规则)
let _all = 0
const r = require.context('@/total', false, /.js/)
r.keys().forEach(item => {
    console.log(r(item).default)
    _all += r(item).default
})
console.log(_all)

// import(/*webpackChunkName: "a"*/ './a')
import { abc } from './a'
console.log(abc())
// setTimeout(async () => {
//     // 魔法注释指定导出名称
//     const res = await import(/*webpackChunkName: "a"*/ './a.js')
//     console.log(res)
// }, 3000)
;(() => {
    let a = 23
    console.log(a)
})()
