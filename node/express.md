## 快速入门

- [应用](https://nodejs.cn/express/5x/api/app/)
  - 通过调用 Express 模块导出的顶级express()函数来创建
- [路由](https://nodejs.cn/express/5x/api/router/)
  - app.method(path, handler)
- [请求](https://nodejs.cn/express/5x/api/req/#path)
  - handler参数，继承于 http.InComingMessage  类
  - 常用属性
    - req.body
    - req.ip
    - req.baseUrl
    - req.query
    - ...
- [响应](https://nodejs.cn/express/5x/api/res/)
  - handler 参数，继承于 http.ServerResponse 类
  - 常用属性
    - res.json([body])
    - res.send([body])
    - res.status(code)
    - res.set('field'[, value])
    - ...

```
const express = require('express')
const app = express()

// 配置解析表单请求体：application/json
// 配置后可以通过 req.body 获取请求数据
app.use(express.json())
// 配置表单请求体：application/x-www-form-urlencoded
app.use(express.urlencoded())

app.get('/', (req, res) => {
    res.send('get')
})

app.post('/todos/:id', async (req, res) => {
    const ret = await Promise.resolve({name: 'well'})
    const { id } = req.params
    const { age } = req.body
    const { name } = ret
    res.send(`name：${name}，id：${id}，age：${age}`)
})

app.listen(3000, () => {
    console.log('server is running at 3000')
})
```

## 中间件
- 中间件函数
  - 可以访问应用程序请求对象、响应对象和下一中间件函数的函数
  - 下一中间件函数通常由一个名为`next`的变量表示
  - 中间件函数可以执行的任务
    - 执行任何代码
    - 更改请求和响应对象
    - 结束请求-响应周期
    - 调用堆栈中下一个中间件函数
- 中间件分类
  - 应用级中间件
  - 路由级中间件
  - 错误处理中间件
  - 内置中间件
  - 第三方中间件
- 应用级中间件
  ```
  const logTime = (req, res, next) => {
    console.log(`time：${Date.now()}`)
    next()
  }
  app.use(logTime, (req, res, next) => {
    console.log('middleware next')
    next()
  })
  ```
- 路由级中间件