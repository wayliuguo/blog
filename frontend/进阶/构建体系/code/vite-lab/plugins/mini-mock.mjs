// 手写 mock 插件：dev 期给前端一个假接口
// 页面里 fetch('/api/user') 时，请求由这里的中间件直接应答，背后没有真实后端
//
// apply: 'serve' —— 只在 dev 加载，build 完全不加载（对应真实插件 vite-plugin-mock）
//
// configureServer 的两种挂载位置：
//   server.middlewares.use()   → 立刻挂，抢在 Vite 内置中间件前面
//   return () => { ... }       → Vite 等内置中间件装完再调用，排在其后
//
// 实测结论：/api/* 的 200 与 404 都必须在"靠前"那个中间件里处理完。
// 把 404 留到返回的函数里是不行的——浏览器发来的 /api/xxx 带 Accept: text/html，
// 会被排在更前面的 Vite HTML 回退先吞成 index.html（状态码 200）。
export default function miniMock(options = {}) {
    const data = options.data || {
        '/api/user': { id: 1, name: 'vite-lab', role: 'admin' },
        '/api/pages': [
            { path: '/', title: '首页' },
            { path: '/about', title: '关于' }
        ]
    }

    return {
        name: 'mini-mock',
        apply: 'serve',

        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0]
                if (!url?.startsWith('/api/')) return next()

                const hit = data[url]
                res.statusCode = hit ? 200 : 404
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(hit || { error: 'mock 未定义该接口' }))
                console.log(`  [mini-mock] ${req.method} ${url} → ${res.statusCode}`)
            })

            // 返回的函数排在 Vite 内置中间件之后，适合做收尾动作（这里打印注册表）
            return () => {
                const routes = Object.keys(data)
                console.log(`  [mini-mock] 已注册 ${routes.length} 条 mock 路由：${routes.join(', ')}`)
            }
        }
    }
}