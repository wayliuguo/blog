const http = require('http')
const context = require('./context')
const request = require('./request')
const response = require('./response')
class Application {
    constructor() {
        this.context = Object.create(context)
        this.request = Object.create(request)
        this.response = Object.create(response)
        this.middlewares = []
    }
    use(middleware) {
        this.middlewares.push(middleware)
    }
    createContext(req, res) {
        let ctx = Object.create(this.context)
        let request = Object.create(this.request)
        let response = Object.create(this.response)
        ctx.request = request
        ctx.request.req = ctx.req = req
        ctx.response = response
        ctx.response.res = ctx.res = res
        return ctx
    }
    compose(ctx) {
        const dispatch = i => {
            if (this.middlewares.length === i) {
                return Promise.resolve()
            } else {
                let middleware = this.middlewares[i]
                return Promise.resolve(middleware(ctx, () => dispatch(i + 1)))
            }
        }
        return dispatch(0)
    }
    handleRequest = (req, res) => {
        let ctx = this.createContext(req, res)
        res.statusCode = 404
        this.compose(ctx).then(() => {
            if (ctx.body) {
                res.end(ctx.body)
            } else {
                res.end('not found')
            }
        })
    }
    listen() {
        // 默认不采用箭头函数回调中的this指向我们http创建的服务
        let server = http.createServer(this.handleRequest)
        server.listen(...arguments)
    }
}

module.exports = Application
