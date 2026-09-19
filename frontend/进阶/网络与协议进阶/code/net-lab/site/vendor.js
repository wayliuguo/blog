/**
 * 示例「第三方脚本」：模拟 CDN 上的一个 vendor 包，由 security.html 用 integrity 保护
 * 改这里任何一个字节，页面上的 SRI 校验就会失败（见 npm run security）
 */
;(function (global) {
    function formatBytes(n) {
        if (n < 1024) return n + ' B'
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
        return (n / 1024 / 1024).toFixed(2) + ' MB'
    }

    global.vendor = { version: '1.0.0', formatBytes: formatBytes, loadedAt: Date.now() }
})(typeof window === 'undefined' ? globalThis : window)
