// 慢脚本：配合 ?delay=ms 模拟慢下载；向父页面（如有）上报执行时刻，无父页面则打印到 console
console.log('slow.js 执行于 ' + performance.now().toFixed(1) + 'ms')
if (window.parent !== window) {
    window.parent.postMessage(
        { kind: 'load-report', name: window.__LOAD_NAME || 'unknown', run: performance.now() },
        '*'
    )
}
