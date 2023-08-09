import express from 'express'
const app = new express()

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080') // 设置允许访问的源
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE') // 设置允许的请求方法
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization') // 设置允许的请求头部字段
    next()
})

app.get('/api/getNum', (req, res) => {
    res.status(200).end('hello world')
})
app.post('/todos', (req, res) => {
    setTimeout(() => {
        res.status(200).end('todos')
    }, 10000)
})

app.listen(3000)
