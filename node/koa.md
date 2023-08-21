# koa 实现

## 简单使用
- 1 -> 3 -> sleep -> 5 -> 6 -> 4 ->2
```
const Koa = require('./koa')
const app = new Koa()

function sleep() {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log('sleep')
            resolve()
        }, 2000)
    })
}

app.use(async (ctx, next) => {
    console.log('1')
    ctx.body = '1'
    await next()
    console.log('2')
    ctx.body = '2'
})
app.use(async (ctx, next) => {
    console.log('3')
    ctx.body = '3'
    await sleep()
    next()
    console.log('4')
    ctx.body = '4'
})
app.use((ctx, next) => {
    console.log('5')
    ctx.body = '5'
    next()
    console.log('6')
    ctx.body = '6'
})

app.on('error', err => {
    console.log(err)
})

app.listen(8080, () => {
    console.log('server start')
})

```

## application
- 导出的`Application`即是我们的`Koa`
- 构造函数通过`Object.create`往实例上添加了`request`、`response`、`context`属性
- 其提供了`use`方法收集`middlewares`
- 其提供了`listen`方法内部进行创建服务器，服务器处理回调处理函数为`handleRequest`
  - `handleRequest` 中调用`createContext` 方法生成了对象，实现ctx、request、response的扩展
  - 通过 `compose` 方法实现洋葱模型，其原理是：
    - 默认执行下标为0即第一个中间件，并返回`Promise.resolve(middleware(ctx, () => dispatch(i + 1)))`，这里`() => dispatch(i + 1)`作为`next`返回给了当前中间件，当调用`next`时就是调用了下一个中间件，实现控制流转
    - 当调用下一个中间件的时候，就进入了下一个中间件函数，此时上一个中间件的`next`后面的就实现了等待
```
const http = require('http')
const context = require('./context')
const request = require('./request')
const response = require('./response')
const EventEmitter = require('events')
class Application extends EventEmitter {
    constructor() {
        super()
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
        let index = -1
        const dispatch = i => {
            if (i <= index) {
                return Promise.reject('next() call mutiples')
            }
            index = i
            if (this.middlewares.length === i) {
                return Promise.resolve()
            } else {
                let middleware = this.middlewares[i]
                try {
                    return Promise.resolve(middleware(ctx, () => dispatch(i + 1)))
                } catch (error) {
                    return Promise.reject(error)
                }
            }
        }
        return dispatch(0)
    }
    handleRequest = (req, res) => {
        let ctx = this.createContext(req, res)
        res.statusCode = 404
        this.compose(ctx)
            .then(() => {
                if (ctx.body) {
                    res.end(ctx.body)
                } else {
                    res.end('not found')
                }
            })
            .catch(e => {
                this.emit('error', e)
            })
    }
    listen() {
        // 默认采用箭头函数回调中的this指向我们http创建的服务
        let server = http.createServer(this.handleRequest)
        server.listen(...arguments)
    }
}

module.exports = Application

```

## context
- 利用代理实现 context 的扩展
```
const contxt = {}

function defineGetter(target, key) {
    contxt.__defineGetter__(key, function () {
        return this[target][key]
    })
}

function defineSetter(target, key) {
    contxt.__defineSetter__(key, function (value) {
        this[target][key] = value
    })
}

defineGetter('request', 'path')
defineGetter('request', 'url')
defineGetter('request', 'query')

defineGetter('response', 'body')
defineSetter('response', 'body')

module.exports = contxt

```

## request
- 利用 getter 实现对 ctx.request 的代理
```
const url = require('url')
const request = {
    get url() {
        return this.req.url
    },
    get path() {
        let { pathname } = url.parse(this.req.url)
        return pathname
    },
    get query() {
        let { pathname, query } = url.parse(this.req.url, true)
        return query
    }
}

module.exports = request
```

## response
```
const response = {
    _body: undefined,
    get body() {
        return this._body
    },
    set body(content) {
        this._body = content
    }
}

module.exports = response

```