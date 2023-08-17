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
  - 使用`app.use()`和`app.method()`函数将应用级中间件绑定到`app对象实例`
  - `app.use(handler)`
  - `app.use('/user/:id', handler)`
  - `app.post('/user/:id', handler)`
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
  - 工作方式与应用级中间件相同，只是绑定到`express.Router()`的实例上
  - `const router = express.Router()`
```
// userRouter
const userRouter = require('./userRouter')
// userRouter middleware
app.use('/user', userRouter)

// userRouter.js
const express = require('express')
const userRouter = express.Router()

userRouter.get('/:id', (req, res) => {
  const { id } = req.params
  res.send(id)
})

module.exports = userRouter

// 访问 http://localhost:3000/user/110  >>> 110
```
- 错误处理中间件
  - 总是需要四个参数，必须提供四个参数
```
app.get('/', (req, res, next) => {
    try {
        throw new Error('测试错误')
    } catch (error) {
        next(error)
    }
})

// error middleware
app.use((err, req, res, next) => {
    res.status(500).json({
        error: err.message
    })
})
```
- 内置中间件
  - express.json()
    - 解析 Content-Type 为application/json 格式的请求体
  - express.urlencoded()
    - 解析 Content-Type 为 www-form-urlencoded 格式的请求体
  - express.raw()
    - 解析 Content-Type 为 application/octet-stream 格式的请求体
  - express.text()
    - 解析 Content-Type 为 text/plain 格式的请求体
  - express.static()
    - 托管静态资源文件

## RESTful 接口规范

- HTTP动词

  - GET(读取)：从服务器取出资源（一项或多项）
  - POST(创建)：在服务器新建一个资源
  - PUT(完成更新)：在服务器更新资源（客户端提供改变后的完整资源）
  - PATCH(部分更新)：在服务器更新资源（客户端提供改变的属性）
  - DELETE(删除)：从服务器删除资源
  - HEAD: 获取资源的元数据
  - OPTIONS: 预检

- 过滤信息

  - ?limit = 10 指定返回记录的数量
  - ?offset= 10 指定返回的开始记录

- 状态码

  - 1**: 相关信息
  - 2**:操作成功
  - 3**:重定向
  - 4**:客户端错误
  - 5**:服务器错误

- 身份认证

  基于 JWT 的接口权限认证：

  - 字段名：Authorization
  - 字段值：Bearer token 数据

- 跨域处理

  - 可以在服务端设置 CORS 设置客户端跨域资源请求

## RESTful 案例

## 目录结构

- config 配置文件
  - config.default.js
- controller 用于解析用户的输入，处理后返回相应的结果
- model 数据持久层
- middleware 用于编写中间件
- router 用于配置 url 路由
- util 工具模块
- app.js  用于自定义启动

## 中间件与依赖资源

- 解析请求体

  - express.json()
  - express.urlencoded()

- 日志输出

  - morgan()

  ```
  npm i morgan
  ```

- 为客户端提供跨域资源请求

  - cors()

  ```
  npm i cors
  ```

- 加密

  - crypto

  ```
  npm i crypto
  ```

- 身份验证

  - jsonwebtoken

  ```
  npm install jsonwebtoken
  ```

- 校验

  - express-validator

  ```
  npm i express-validator
  ```

- 数据库

  - mongoose

  ```
  npm i mongoose
  ```

