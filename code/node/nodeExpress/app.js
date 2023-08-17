const express = require('express')

// 引入路由模块
const router = require('./router')

// cors 中间件
const cors = require('cors')
// 自定义错误处理中间件
const errorHandler = require('./middleware/error-handler')

const app = new express()

// 解析请求体
app.use(express.json())
app.use(express.urlencoded())

// 为客户端提供跨域
app.use(cors())

const PORT = process.env.PORT

// 挂载路由
app.use('/api', router)

// 挂载统一处理服务端错误中间件
app.use(errorHandler())

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})
