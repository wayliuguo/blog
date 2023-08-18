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

## 入口
- 引入了路由模块，实现了路由的嵌套与代码分离
- 挂载了统一处理服务端错误中间件
```
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
```

## 路由模块
- 把`user`相关路由抽离到另一个文件了
- 使用 `validator`进行校验
- 使用`auth`进行身份验证
- 路由的进一步处理封装在`controller/user`中
```
// router/index.js
const express = require('express')
const router = express.Router()

// 用户相关模块
router.use(require('./user'))

module.exports = router
```
```
// router/user.js
const express = require('express')
const router = express.Router()
const userCtrl = require('../controller/user')
const userValidator = require('../validator/user')
const auth = require('../middleware/auth')

// 用户登录
router.post('/users/login', userValidator.login, userCtrl.login)

// 用户注册
router.post('/users', userValidator.register, userCtrl.register)

// 获取当前登录用户
router.get('/user', auth, userCtrl.getCurrentUser)

// 更新当前登录用户
router.put('/user', auth, userCtrl.updateCurrentUser)

module.exports = router
```

## validator 模块
```
const validate = require('../middleware/validate')
const { body } = require('express-validator')
const { User } = require('../model')
const md5 = require('../util/md5')

exports.register = validate([
    body('user.username')
        .notEmpty()
        .withMessage('用户名不能为空')
        .custom(async username => {
            const user = await User.findOne({ username })
            if (user) {
                return Promise.reject('用户名已存在')
            }
        }),
    body('user.password').notEmpty().withMessage('密码不能为空'),
    body('user.email')
        .notEmpty()
        .withMessage('邮箱不能为空')
        .isEmail()
        .withMessage('邮箱格式不正确')
        .bail() // 前面两者都通过
        .custom(async email => {
            const user = await User.findOne({ email })
            if (user) {
                return Promise.reject('邮箱已存在')
            }
        })
])

exports.login = [
    validate([
        body('user.email').notEmpty().withMessage('邮箱不能为空'),
        body('user.password').notEmpty().withMessage('密码不能为空')
    ]),
    validate([
        body('user.email').custom(async (email, { req }) => {
            const user = await User.findOne({ email }).select(['email', 'username', 'bio', 'image', 'password'])
            if (!user) {
                return Promise.reject('用户不存在')
            }

            // 将数据挂载到请求对象中，后续的中间件也可以使用了
            req.user = user
        })
    ]),
    validate([
        body('user.password').custom(async (password, { req }) => {
            if (md5(password) !== req.user.password) {
                return Promise.reject('密码错误')
            }
        })
    ])
]
```

## controller 模块
- 引用`model`层生成 Model构造函数，用于创建文档实例
- 引用`jwt`进行登录验证
```
// 引入 user model
const { User } = require('../model')
const jwt = require('../util/jwt')
const { jwtSecret } = require('../config/config.default')

//  用户登录
exports.login = async (req, res, next) => {
    try {
        // 1.数据验证
        // 2. 生成 token
        const user = req.user.toJSON()
        const token = await jwt.sign(
            {
                userId: user._id
            },
            jwtSecret,
            {
                expiresIn: '24h'
            }
        )
        // 3. 发送成功响应（包含 token 的用户信息）
        delete user.password
        res.status(200).json({
            ...user,
            token
        })
    } catch (error) {
        next(error)
    }
}

//  用户注册
exports.register = async (req, res, next) => {
    try {
        const user = new User(req.body.user)
        await user.save()
        // 4.发送成功响应
        res.status(201).json({
            user
        })
    } catch (error) {
        next(error)
    }
}

// 获取当前用户
exports.getCurrentUser = async (req, res, next) => {
    try {
        res.status(200).json({
            user: req.user
        })
    } catch (error) {
        next(error)
    }
}

// 更新当前用户
exports.updateCurrentUser = async (req, res, next) => {
    try {
        // 处理请求
        res.send('updateCurrentUser')
    } catch (error) {
        next(error)
    }
}

```

## model 模块
```
// model/index.js
const mongoose = require('mongoose')
const { dbUri } = require('../config/config.default')

// 连接 MongoDB 数据库
mongoose.connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const db = mongoose.connection

// 当连接失败的时候
db.on('error', err => {
    console.log('MongoDB 数据库连接失败', err)
})

// 当连接成功的时候
db.once('open', function () {
    console.log('MongoDB 数据库连接成功')
})

// 组织导出模型类
module.exports = {
    User: mongoose.model('User', require('./user'))
}
```

```
// model/user.js
const mongoose = require('mongoose')
const baseModel = require('./base-model')
const md5 = require('../util/md5')

const userSchema = new mongoose.Schema({
    ...baseModel,
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        set: value => md5(value),
        select: false
    },
    bio: {
        type: String,
        default: null
    },
    image: {
        type: String,
        default: null
    }
})

module.exports = userSchema

```

## auth 模块与 jwt

- jwt 的原理是使用数字签名来验证和保护传输的信息
- jwt的工作原理
  - **生成令牌（Token）**：在用户身份验证成功后，服务器生成一个 JWT 令牌，并将其返回给客户端
  - **令牌结构**：JWT 由三部分组成，即头部（Header）、载荷（Payload）和签名（Signature），它们通过点号分隔开。头部包含了关于令牌的元数据和签名算法信息，载荷包含了要传递的数据，签名用于验证令牌的完整性和真实性
  - **数字签名**：服务器使用密钥对头部和载荷进行数字签名生成签名部分。签名通常使用 HMAC（Hash-based Message Authentication Code）或 RSA（Rivest-Shamir-Adleman）算法完成，以确保令牌的完整性和真实性
  - **传输令牌**：服务器将生成的 JWT 令牌发送给客户端，通常通过在响应的 HTTP 头部中添加 "Authorization" 字段或放置在 Cookie 中
  - **请求验证**：客户端在后续的请求中将 JWT 令牌作为授权凭证传递给服务器。通常，客户端会在请求的 HTTP 头部中添加 "Authorization" 字段，并将令牌以 Bearer 方式传递
  - **令牌验证**：服务器接收到请求后，首先会解析 JWT 令牌，检查头部和载荷的完整性。然后，服务器使用相同的签名算法和密钥对头部和载荷进行验证，并与令牌中的签名部分进行比较。如果签名匹配，服务器可以确认令牌的真实性和完整性
  - **提取数据**：一旦 JWT 令牌通过验证，服务器可以提取载荷中的数据，例如用户标识、权限等，并根据需要执行相应的操作

```
// middleware/auth.js
const { verify } = require('../util/jwt')
const { jwtSecret } = require('../config/config.default')
const { User } = require('../model')

module.exports = async (req, res, next) => {
    // 从请求头获取 token 数据
    let token = req.headers['authorization']
    token = token ? token.split('Bearer ')[1] : null

    if (!token) {
        return res.status(401).end()
    }

    try {
        const decodedToken = await verify(token, jwtSecret)
        req.user = await User.findById(decodedToken.userId)
        next()
    } catch (err) {
        return res.status(401).end()
    }

    // 验证 token 是否有效
    // 无效 -> 响应 401 状态码
    // 有效 -> 把用户信息读取出来挂载到 req 请求对象上
    //        继续往后执行
}
```
