/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express')
const app = express()

// userRouter
const userRouter = require('./userRouter')

// 配置解析表单请求体：application/json
// 配置后可以通过 req.body 获取请求数据
app.use(express.json())
// 配置表单请求体：application/x-www-form-urlencoded
app.use(express.urlencoded())

// 应用级别中间件
const logTime = (req, res, next) => {
    console.log(`time：${Date.now()}`)
    next()
}
app.use(logTime, (req, res, next) => {
    console.log('middleware next')
    next()
})

// userRouter middleware
app.use('/user', userRouter)

app.get('/', (req, res, next) => {
    // res.send('get')
    try {
        throw new Error('测试错误')
    } catch (error) {
        next(error)
    }
})

// error middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
    res.status(500).json({
        error: err.message
    })
})

app.post('/todos/:id', async (req, res) => {
    const ret = await Promise.resolve({ name: 'well' })
    const { id } = req.params
    const { age } = req.body
    const { name } = ret
    res.send(`name：${name}，id：${id}，age：${age}`)
})

app.listen(3000, () => {
    console.log('server is running at 3000')
})
