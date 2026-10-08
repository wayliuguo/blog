// dev 期接口 mock。
//
// 演示 Vite 专有钩子 configureServer：往 dev server 的中间件链里插一段。
// 它是 dev 专属（`apply: 'serve'`）——build 里没有 server，这个钩子无处可挂。
export function miniMock(routes) {
    return {
        name: 'mini-mock',
        apply: 'serve',
        configureServer(server) {
            console.log('  [mini-mock] configureServer：注册 /api/* 中间件')
            server.middlewares.use((req, res, next) => {
                const route = routes[req.url.split('?')[0]]
                if (!route) return next() // 不处理，交给下一个中间件
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(route))
            })
        }
    }
}
