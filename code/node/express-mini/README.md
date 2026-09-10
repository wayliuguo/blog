# express-mini —— 200 行还原 Express 核心

教学用最小实现，用纯 Node.js 的 `http` 模块重写 Express 的核心机制（中间件链、路由注册、响应封装）。它不是生产可用的 Web 框架，仅用于理解 Express 内部是如何工作的。

## 对应博客章节

| 项目 | 对应文档 | 说明 |
| --- | --- | --- |
| express-mini | [Express 源码分析](../../../node/04-Express%20与%20Koa/04-Express%20源码分析.md) | 配合源码逐行理解中间件与路由实现 |

延伸阅读：[Express 快速入门](../../../node/04-Express%20与%20Koa/01-Express%20快速入门.md)、[Express 项目模板](../../../node/04-Express%20与%20Koa/03-Express%20项目模板.md)

## 它实现了什么

- `app.use(path?, handler)` 注册中间件：支持可选路径前缀（不传则默认 `/`），统一存入 `middlewares` 数组。
- `app.get/post/put/delete/patch(path, handler)` 注册路由：把方法、路径、处理函数存入 `routes` 数组。
- `enhanceRes(res)` 响应封装：`res.status(code)` 支持链式调用；`res.json(data)` 设置 JSON 头并输出；`res.send(body)` 按类型自动选择（对象走 json，其余走 text/html）。
- `matchRoute(method, url)` 路由匹配：将 `:param` 形式路径转成正则，把动态段提取到 `req.params`。
- `executeMiddlewareChain` 递归 `next()` 驱动中间件链：中间件按注册顺序执行，调用 `next()` 进入下一个。
- `next(err)` 错误跳转：携带错误时跳过剩余中间件，进入错误处理；若未注册错误处理则直接返回 500。
- `app.useError(handler)` 注册全局错误处理函数。
- `notFound(req, res)`：无路由匹配时返回 404。
- `app.listen(port, cb)`：基于 `http.createServer` 启动服务。

## 怎么跑起来

安装与运行（脚本来自 `package.json` 的 `scripts`）：

```bash
npm start        # node index.js
# 或开发模式（文件变更自动重启）
npm run dev      # node --watch index.js
```

项目无任何第三方依赖，无需 `npm install` 也可直接 `node index.js` 运行。

启动后默认监听 3000 端口。用 curl 验证：

```bash
# 获取用户列表
curl http://localhost:3000/users
```

预期输出：

```json
[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]
```

也可以访问带参数的路由：

```bash
curl http://localhost:3000/users/42
# 预期：{"id":42,"name":"用户42"}
```

## 目录结构

```
express-mini/
├── index.js        # 全部实现 + 使用示例（createApp 工厂、中间件链、路由匹配、响应封装、app.listen）
└── package.json    # 仅含 start / dev 两个脚本，无第三方依赖
```

## 和真实框架的差异

| 能力 | 真实 Express | 本最小实现 |
| --- | --- | --- |
| 模板引擎 | 支持 view / render | 无 |
| 路由系统 | `Router` 子路由、路由级中间件、`app.route()` 链式 | 单层 `routes` 数组，无 Router |
| `app.param` | 支持参数预处理 | 无 |
| 请求体解析 | `express.json` / `express.urlencoded` / `express.static` | 无，仅原始 `req` |
| `res` API | `sendFile` / `redirect` / `cookie` / `download` 等 | 仅 `status` / `json` / `send` |
| 中间件路径匹配 | 精准路径 + 正则 + 通配 | 仅前缀 `startsWith` 判断 |
| HTTP 方法 | `all` / `head` 等 | 仅 get/post/put/delete/patch |
| 错误处理 | 多错误处理中间件栈 | 单个 `errorHandler` |
| 子应用挂载 | `app.use(subApp)` | 无 |

## 预期输出

- `npm start` 启动后监听 3000 端口（无第三方依赖，直接 `node index.js` 也可）。
- `curl http://localhost:3000/users` 返回用户列表：`[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]`。
- `curl http://localhost:3000/users/42` 返回 `{"id":42,"name":"用户42"}`（动态路由 `:id` 被提取到 `req.params`）。
- 未匹配路由返回 `{"message":"Not Found"}` 且状态码 404；中间件链与错误处理均按预期生效。

## 阅读建议

1. 先读博客 [Express 源码分析](../../../node/04-Express%20与%20Koa/04-Express%20源码分析.md) 建立整体认知。
2. 再按 `createApp` → `app.use` / `app[method]` 注册 → `executeMiddlewareChain` 递归 `next` → `matchRoute` → `enhanceRes` 的顺序读 `index.js`。
3. 重点理解 `next` 既是「进入下一个中间件」也是「错误传递通道」这一设计。
