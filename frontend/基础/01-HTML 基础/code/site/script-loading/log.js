// 三种加载方式共用的单文件脚本：通过 ?name= 区分自己被哪种方式加载
// 用 IIFE 包裹：同一页面会加载 3 次本脚本，避免顶层 const 重复声明报错
;(() => {
    const NAMES = { sync: '默认（同步）', defer: 'defer', async: 'async' }
    const qs = new URLSearchParams(document.currentScript.src.split('?')[1])
    window.__log(NAMES[qs.get('name')] + ' 执行')
})()
