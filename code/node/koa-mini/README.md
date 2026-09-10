# koa-mini —— 180 行还原 Koa 核心

教学用最小实现，用纯 Node.js 重写 Koa 的核心机制（洋葱模型、compose、Context 封装）。它不是生产可用的 Web 框架，仅用于理解 Koa 中间件与 Context 的本质。

## 对应博客章节

| 项目 | 对应文档 | 说明 |
| --- | --- | --- |
| koa-mini | [Koa 源码分析](../../../node/04-Express%20与%20Koa/06-Koa%20源码分析.md) | 配合源码理解 compose 与洋葱模型 |

延伸阅读：[Koa 快速入门](../../../node/04-Express%20与%20Koa/02-Koa%20快速入门.md)

## 它实现了什么

- `app.use(fn)` 注册中间件：存入 `middlewares` 数组，并返回 `app` 以支持链式调用。
- `compose(middlewareList)` 洋葱模型核心：将中间件数组组合成嵌套 Promise 链，内部 `dispatch(i)` 递归，每次把 `dispatch(i+1)` 作为 `next` 传入；对同一中间件多次调用 `next()` 会抛错。
- `await next()` 形成洋葱模型：后续中间件执行完才回到当前中间件 `next()` 之后的逻辑。
- `createContext(req, res)` 创建 `ctx`：挂载 `method` / `url` / `path`（`?` 前的部分）/ `query` / `headers` / `status` / `body`，并提供 `ctx.set(key, value)` 设置响应头。
- `ctx.body` 的 setter 在赋值时标记 `_respond`，供 `respond` 阶段判断是否输出。
- `parseQuery(url)`：解析查询字符串为对象（按 `&` 拆分、`decodeURIComponent` 解码）。
- `respond(ctx)`：根据 `ctx.body` 类型自动决定行为与序列化——`string` 走 text/html、`Buffer` 原样输出、其余 JSON 序列化、`null` / `undefined` 返回 204。
- `app.handle`：创建 `ctx`、执行 compose 链，结束后调用 `respond`；链中抛错则捕获并返回 500。
- `app.listen(port, cb)`：基于 `http.createServer` 启动。

## 怎么跑起来

```bash
npm start        # node index.js
npm run dev      # node --watch index.js
```

无第三方依赖，无需 `npm install`。

默认监听 3000 端口，用 curl 验证：

```bash
curl http://localhost:3000/users
```

预期输出：

```json
[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]
```

健康检查：

```bash
curl http://localhost:3000/health
# 预期：{"status":"ok"}
```

其他路径返回 404：

```bash
curl http://localhost:3000/unknown
# 预期：{"message":"Not Found"}，状态码 404
```

## 目录结构

```
koa-mini/
├── index.js        # 全部实现 + 使用示例（createKoa、compose、createContext、respond、app.listen）
└── package.json    # 仅含 start / dev 两个脚本，无第三方依赖
```

## 和真实框架的差异

| 能力 | 真实 Koa | 本最小实现 |
| --- | --- | --- |
| 路由 | `@koa/router` 等独立路由库 | 在中间件里手动比对 `ctx.url`，无路由表 |
| 请求体解析 | `koa-bodyparser` | 无，未解析 `req` 的 body |
| 静态文件 | `koa-static` | 无 |
| `ctx.cookies` | 完整的 cookie 读写 API | 无 |
| 错误处理 | `ctx.throw` / `httpError` / `app.onerror` 默认错误页 | 仅 `.catch` 返回 500 JSON |
| Context 结构 | `ctx.request` / `ctx.response` 双层委托 | 仅 `ctx.req` / `ctx.res` 及少量直接属性 |
| 扩展能力 | 大量官方 / 社区中间件 | 无 |

## 预期输出

- `npm start` 启动后监听 3000 端口（无第三方依赖）。
- `curl http://localhost:3000/users` 返回用户列表（结构与 Express 示例一致）。
- `curl http://localhost:3000/health` 返回 `{"status":"ok"}`。
- `curl http://localhost:3000/unknown` 返回 `{"message":"Not Found"}` 且状态码 404；洋葱模型中间件按 `cors → errorHandler → ... → 路由` 顺序执行。

## 阅读建议

1. 先读博客 [Koa 源码分析](../../../node/04-Express%20与%20Koa/06-Koa%20源码分析.md) 理解洋葱模型。
2. 重点读 `compose` 与 `dispatch`：体会 `await next()` 如何让代码「先走出去、再走回来」。
3. 再读 `createContext` 与 `respond`，理解 Koa 把 `req` / `res` 包装成 `ctx` 并统一响应输出的思路。
