// 三种加载方式共用的单文件脚本：通过 ?name= 区分自己被哪种方式加载；执行时在控制台打点
;(() => {
    const NAMES = { sync: '默认（同步）', defer: 'defer', async: 'async' }
    const name = new URLSearchParams(document.currentScript.src.split('?')[1]).get('name')
    console.log(`[${NAMES[name]}] 脚本执行 @ ${performance.now().toFixed(1)}ms`)
})()
