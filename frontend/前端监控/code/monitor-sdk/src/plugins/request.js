/** URL 只留 path：query 里可能有 token，也可能无限长 */
function shortUrl(url) {
    const query = url.indexOf('?')
    return (query === -1 ? url : url.slice(0, query)).slice(0, 300)
}
function report(ctx, options, record) {
    const url = shortUrl(record.url)
    const success = record.status >= 200 && record.status < 400
    if (!success) {
        ctx.emit({
            type: 'request',
            subtype: record.status === 0 ? 'network' : 'http',
            message: `${record.status} ${record.method} ${url}`,
            data: { ...record, url, success }
        })
        return
    }
    // 慢请求单独一个 subtype：它和"报错"是两种排查路径，混在一起会让错误率失真
    if (options.reportSlow && record.duration >= options.slowThreshold) {
        ctx.emit({
            type: 'request',
            subtype: 'slow',
            message: `慢请求 ${record.method} ${url} ${record.duration}ms`,
            data: { ...record, url, success }
        })
    }
}
// 输入：插件配置（slowThreshold / reportSlow）
// 输出：请求插件（包裹 fetch 与 XHR，只上报失败与慢请求）
// 过程：setup 里补丁 window.fetch 与 XHR 原型，记录成败与耗时交给模块顶部的 report 判定
export function createRequestPlugin(options) {
    return {
        name: 'request',
        setup(ctx) {
            const endpoint = ctx.cfg.endpoint
            // SDK 自己的上报请求必须放过：否则每发一次监控数据，就产生一条被监控的请求
            const isOwnRequest = url => !!endpoint && url.indexOf(endpoint) === 0
            const originalFetch = window.fetch
            if (typeof originalFetch === 'function') {
                window.fetch = async function (input, init) {
                    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
                    if (isOwnRequest(url)) return originalFetch.call(window, input, init)
                    const method = (
                        init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')
                    ).toUpperCase()
                    const start = performance.now()
                    try {
                        const response = await originalFetch.call(window, input, init)
                        report(ctx, options, {
                            url,
                            method,
                            status: response.status,
                            duration: Math.round(performance.now() - start),
                            kind: 'fetch'
                        })
                        return response
                    } catch (error) {
                        // 网络层失败没有 response：先记一条 status=0，再把异常原样抛回去
                        ctx.emit({
                            type: 'request',
                            subtype: 'network',
                            message: `网络错误 ${method} ${shortUrl(url)}`,
                            data: {
                                url: shortUrl(url),
                                method,
                                status: 0,
                                duration: Math.round(performance.now() - start),
                                kind: 'fetch',
                                success: false
                            }
                        })
                        throw error
                    }
                }
            }
            const XHR = window.XMLHttpRequest
            if (!XHR || !XHR.prototype) {
                // 没有 XHR 也要交出清理函数：fetch 的补丁同样需要还原
                return () => {
                    if (typeof originalFetch === 'function') window.fetch = originalFetch
                }
            }
            const originalOpen = XHR.prototype.open
            const originalSend = XHR.prototype.send
            XHR.prototype.open = function (method, url, ...rest) {
                this.__monitorMeta = { method: String(method).toUpperCase(), url: String(url) }
                return originalOpen.apply(this, [method, url, ...rest])
            }
            XHR.prototype.send = function (...args) {
                const meta = this.__monitorMeta || { method: 'GET', url: '' }
                if (!isOwnRequest(meta.url)) {
                    const start = performance.now()
                    this.addEventListener('loadend', () => {
                        try {
                            report(ctx, options, {
                                url: meta.url,
                                method: meta.method,
                                status: this.status,
                                duration: Math.round(performance.now() - start),
                                kind: 'xhr'
                            })
                        } catch {
                            /* 静默 */
                        }
                    })
                }
                return originalSend.apply(this, args)
            }
            return () => {
                if (typeof originalFetch === 'function') window.fetch = originalFetch
                XHR.prototype.open = originalOpen
                XHR.prototype.send = originalSend
            }
        }
    }
}
