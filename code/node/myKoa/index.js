const Koa = require('./koa')
const app = new Koa()

/* app.use(ctx => {
    console.log(ctx.req.url)
    console.log(ctx.request.req.url)
    console.log(ctx.request.path)
    console.log(ctx.path)
    console.log(ctx.query)
    // ctx.body = 'well'
    // ctx.body = '123456'
    // console.log(ctx.body)
    // console.log(ctx.response.body)
}) */

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
