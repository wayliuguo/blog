import './index.css'
import './index.less'
import img from './index.jpg'
import small from './small.png'
new Image().src = img
new Image().src = small

// import(/*webpackChunkName: "a"*/ './a.js')

setTimeout(async () => {
    // 魔法注释指定导出名称
    const res = await import(/*webpackChunkName: "a"*/ './a.js')
    console.log(res)
}, 3000)
;(() => {
    let a = 23
    console.log(a)
})()
