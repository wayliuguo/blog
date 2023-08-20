const http = require('http')
const url = require('url')

function createApplication() {
    // app 是 createServer 的回调函数
    let app = (req, res) => {
        // 获取请求的方法
        let methodName = req.method.toLowerCase()
        // 获取请求的路径
        let { pathname } = url.parse(req.url, true)

        // 通过next方法进行中间件调用
        let index = 0
        function next(err) {
            if (index === app.routes.length) {
                return res.end(`Cannot find ${methodName} ${pathname}`)
            }
            let { method, path, handler } = app.routes[index++]
            if (err) {
                // 如果有错误，去找错误中间件
                // 错误中间件有四个参数
                if (handler.length === 4) {
                    handler(err, req, res, next)
                } else {
                    next(err)
                }
            } else {
                // next 就应该取下一个layer
                if (method === 'middle') {
                    // 处理中间件
                    if (path === '/' || path === pathname || pathname.startsWith(path + '/')) {
                        handler(req, res, next)
                    }
                } else {
                    if ((method === methodName || method === 'all') && (path === pathname || path === '*')) {
                        return handler(req, res)
                    } else {
                        next()
                    }
                }
            }
        }
        next()
    }

    // 用于存放路由
    app.routes = []
    app.use = function (path, handler) {
        if (typeof handler !== 'function') {
            handler = path
            path = '/'
        }
        let layer = {
            method: 'middle',
            path,
            handler
        }
        // 将中间件放到容器内
        app.routes.push(layer)
    }
    // express 内置中间件
    app.use((req, res, next) => {
        let { pathname, query } = url.parse(req.url, true)
        let hostname = req.headers['host'].split(':')[0]
        req.path = pathname
        req.hostname = hostname
        req.query = query
        next()
    })
    // 实现 all 路由方法
    app.all = function (path, handler) {
        let layer = {
            method: 'all',
            path,
            handler
        }
        app.routes.push(layer)
    }
    // 实现路由方法
    http.METHODS.forEach(method => {
        method = method.toLocaleLowerCase()
        app[method] = function (path, handler) {
            // layer 记录 method+path => handler
            let layer = {
                method,
                path,
                handler
            }
            app.routes.push(layer)
        }
    })

    // 生成一个服务端
    app.listen = function () {
        const server = http.createServer(app)
        server.listen(...arguments)
    }
    return app
}

module.exports = createApplication
