const express = require('./index')

const app = express()

// 中间件
app.use('/', (req, res, next) => {
    res.setHeader('Content-Type', 'text//html;charset=utf-8;')
    console.log(req.path)
    console.log(req.hostname)
    console.log(req.query)
    next('名字不合法')
})

app.get('/name', (req, res) => {
    res.end('刘国威')
})
app.get('/age', (req, res) => {
    res.end('18')
})

app.post('/name', (req, res) => {
    res.end('post name')
})

// all: 匹配所有的方法
// * 所有的路径
app.all('*', (req, res) => {
    res.end(req.method + '*')
})

app.use((err, req, res, next) => {
    console.log(err)
    next()
})

app.listen(3000, () => {
    console.log('server in running')
})
