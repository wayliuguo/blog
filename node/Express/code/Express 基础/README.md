# Express 基础 —— Express 基础的最小可运行示例集

用**真实 `express`**（不是重实现）把 [Express 基础](../../Express%20基础.md) 一节的每个知识点写成一个能独立跑起来的脚本。每个脚本跑完会自己打几个请求、打印真实的响应状态码 / 响应头 / 响应体，然后退出——博客里贴的「实测输出」就是这些脚本的原样输出。

## 对应博客章节

| 脚本 | 对应文档 | 说明 |
| --- | --- | --- |
| `src/http-baseline.js` | [Express 基础](../../Express%20基础.md) | 模块二的纯 `node:http` 写法，作为对照基线 |
| `src/hello.js` | [Express 基础](../../Express%20基础.md) | Hello World：`express()` → `app.get` → `res.send` |
| `src/routing.js` | [Express 基础](../../Express%20基础.md) | `app.get/post/put/delete` 四类路由 |
| `src/params.js` | [Express 基础](../../Express%20基础.md) | `req.params` 与 `req.query` |
| `src/middleware.js` | [Express 基础](../../Express%20基础.md) | 应用级 / 路由级中间件与 `next()` |
| `src/builtin.js` | [Express 基础](../../Express%20基础.md) | `express.json` / `urlencoded` / `static` |
| `src/cors.js` | [Express 基础](../../Express%20基础.md) | 第三方中间件 `cors()` 与跨域响应头 |
| `src/error.js` | [Express 基础](../../Express%20基础.md) | 4 参数错误处理中间件 |

延伸阅读：[Express 原理](../../Express%20基础.md)（手写最小实现）、[Express 模板](../../Express%20基础.md)（可落地的工程骨架）。

## 怎么跑起来

```bash
npm install
npm run hello       # node src/hello.js
```

可用的 npm script（全部来自 `package.json` 的 `scripts`）：

| 命令 | 脚本 |
| --- | --- |
| `npm run http` | `src/http-baseline.js` |
| `npm run hello` | `src/hello.js` |
| `npm run routing` | `src/routing.js` |
| `npm run params` | `src/params.js` |
| `npm run middleware` | `src/middleware.js` |
| `npm run builtin` | `src/builtin.js` |
| `npm run cors` | `src/cors.js` |
| `npm run error` | `src/error.js` |

依赖只有 `express` 与 `cors`。每个脚本都监听 3000 端口，跑完会自己退出，所以一次跑一个即可。

> `builtin` 的静态目录写的是相对路径 `public/`，请在项目根目录下执行（`npm run` 默认就在根目录）。

## 目录结构

```
Express 基础/
├── public/
│   └── hello.txt              # express.static('public') 托管的静态文件
├── src/
│   ├── http-baseline.js    # 纯 node:http 的对照基线
│   ├── hello.js            # Hello World
│   ├── routing.js          # 四类路由
│   ├── params.js           # req.params / req.query
│   ├── middleware.js       # 应用级 / 路由级中间件
│   ├── builtin.js          # 内置中间件三件套
│   ├── cors.js             # cors()
│   └── error.js            # 错误处理中间件
├── lab.js                     # 自测小工具：起服务 → fetch 打请求 → 打印 → 退出
├── package.json
└── README.md
```

## 实测输出（节选）

`npm run params`：

```
Express 基础 · params 运行在 http://localhost:3000

=== Express 基础 · params ===
123
1
  GET  /users/123?page=1
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"id":"123"}
```

`req.params.id` 打出来是 `"123"`（恒为字符串），所以响应体里的 `id` 也是字符串 `"123"`。

`npm run middleware`：

```
GET /api/users
API 请求
  GET  /api/users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"scope":"/api"}
GET /users
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"scope":"root"}
```

`/users` 那次只打了一条 `GET /users`——路由级中间件 `app.use('/api', fn)` 没被触发。

## 和 Express 模板的区别

| | `Express 基础` | [`Express 模板`](../Express 模板) |
| --- | --- | --- |
| 用途 | 逐个知识点最小复现，一个脚本一个概念 | 可直接落地的工程骨架 |
| 依赖 | `express` + `cors` | 含 TypeORM、Redis、JWT 等 |
| 代码规模 | 每个脚本 20~40 行 | 分层目录（routes / controllers / services） |

要理解 API 先看这里，要抄工程结构看模板。
