// 异常：window error（捕获阶段分流资源错误）/ unhandledrejection / fetch+XHR 请求拦截 / Vue errorHandler
// 每一路都包 try/catch —— SDK 自己不能抛错，更不能因 SDK 报错触发再上报的死循环
export function installExceptions(win, { send, onRequestTime }) {

    // 1. error 事件：资源错误（img/script/link）不冒泡，必须捕获阶段才能截住
    win.addEventListener(
        'error',
        (event) => {
            try {
                // 判据：事件对象上有 target.tagName 就是资源错误，没有才是脚本错误
                if (event.target && event.target.tagName) {
                    const el = event.target
                    const src = el.src || el.href || ''
                    send({
                        type: 'resource',
                        message: '资源加载失败: ' + el.tagName.toLowerCase() + ' ' + src,
                        data: { url: src } // 资源错误没有 stack，url 是归并键的一部分
                    })
                    return
                }
                const err = event.error
                send({
                    type: 'runtime',
                    message: event.message,
                    stack: err && err.stack,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                })
            } catch (e) {
                /* 静默：SDK 内部错误不上报，避免循环 */
            }
        },
        true
    )

    // 2. Promise 拒绝不走 error 事件，必须单独监听
    win.addEventListener('unhandledrejection', (event) => {
        try {
            const reason = event.reason
            send({
                type: 'promise',
                message: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : '' // 没有 filename/lineno，stack 是唯一位置线索
            })
        } catch (e) {
            /* 静默 */
        }
    })

    // 3. 请求拦截：接口错误（status>=400）与网络错误（status=0），耗时同时交给性能模块
    hookRequests(win, { send, onRequestTime })

    // 4. Vue errorHandler：框架内错误（渲染函数、生命周期）走不到 window，在这里归一
    function attachVue(app) {
        const prevHandler = app.config.errorHandler
        app.config.errorHandler = (err, vueInstance, info) => {
            send({
                type: 'runtime',
                handled: true, // 归一入口 = 业务侧已接住，区别于全局兜底
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : '',
                tags: { vue: true },
                extra: {
                    lifecycleHook: info, // 出错的钩子名，如 setup / mounted / render
                    componentName: (vueInstance && vueInstance.$options && vueInstance.$options.name) || 'anonymous'
                }
            })
            // 保留原 handler：接入方可能自己也挂了错误处理
            if (typeof prevHandler === 'function') prevHandler.call(app, err, vueInstance, info)
        }
    }

    return { attachVue }
}

// fetch 包裹 + XHR 包裹。catch 分支只交耗时、必须 rethrow，不能再上报——
// 没被业务接住的 fetch 拒绝会走 unhandledrejection 兜底，这里再抓就是同一条错误报两次
function hookRequests(win, { send, onRequestTime }) {
    const origFetch = win.fetch
    if (typeof origFetch === 'function') {
        win.fetch = async function (...args) {
            const input = args[0]
            const url = typeof input === 'string' ? input : (input && input.url) || ''
            const method = ((args[1] && args[1].method) || (input && input.method) || 'GET').toUpperCase()
            const start = Date.now()
            try {
                const res = await origFetch.apply(this, args)
                const duration = Date.now() - start
                if (onRequestTime) onRequestTime({ description: method + ' ' + url, duration, status: res.status })
                // 接口错误判据是 status>=400，不能用 !res.ok——
                // res.ok 的口径是 200~299，304 缓存命中也会 !ok，但那不是错误
                if (res.status >= 400) {
                    send({
                        type: 'http',
                        message: '接口错误 ' + method + ' ' + url + ' status=' + res.status,
                        data: { url, method, status: res.status }
                    })
                }
                return res
            } catch (err) {
                const duration = Date.now() - start
                if (onRequestTime) onRequestTime({ description: method + ' ' + url, duration, status: 0 })
                throw err // 上报耗时后必须 rethrow，否则吞掉业务异常
            }
        }
    }

    // XHR 没有事件模型之外的 Promise 拒绝：网络层失败（DNS 失败、连接被拒，status=0）只能在 loadend 里判
    const XHR = win.XMLHttpRequest
    if (XHR && XHR.prototype && typeof XHR.prototype.open === 'function') {
        const origOpen = XHR.prototype.open
        const origSend = XHR.prototype.send
        XHR.prototype.open = function (method, url) {
            this.__monitorMeta = { method: String(method || 'GET').toUpperCase(), url: String(url) }
            return origOpen.apply(this, arguments)
        }
        XHR.prototype.send = function () {
            const meta = this.__monitorMeta || { method: 'GET', url: '' }
            const start = Date.now()
            this.addEventListener('loadend', () => {
                try {
                    const status = this.status
                    const duration = Date.now() - start
                    if (onRequestTime) onRequestTime({ description: meta.method + ' ' + meta.url, duration, status })
                    if (status === 0) {
                        send({
                            type: 'network',
                            message: '网络错误 ' + meta.method + ' ' + meta.url,
                            data: { url: meta.url, method: meta.method }
                        })
                    } else if (status >= 400) {
                        send({
                            type: 'http',
                            message: '接口错误 ' + meta.method + ' ' + meta.url + ' status=' + status,
                            data: { url: meta.url, method: meta.method, status }
                        })
                    }
                } catch (e) {
                    /* 静默 */
                }
            })
            return origSend.apply(this, arguments)
        }
    }
}
