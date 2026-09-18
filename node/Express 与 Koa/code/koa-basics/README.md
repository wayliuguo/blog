# koa-basics —— Koa 快速入门的最小可运行示例集

用**真实 `koa`**（不是重实现）把 [Koa 快速入门](../../Koa%20快速入门.md) 一节的每个知识点写成一个能独立跑起来的脚本。每个脚本跑完会自己打几个请求、打印真实的响应状态码 / 响应头 / 响应体，然后退出——博客里贴的「实测输出」就是这些脚本的原样输出。

## 对应博客章节

| 脚本 | 对应文档 | 说明 |
| --- | --- | --- |
| `src/01-hello.js` | [Koa 快速入门](../../Koa%20快速入门.md) | Hello World：给 `ctx.body` 赋值即完成响应 |
| `src/02-async.js` | [Koa 快速入门](../../Koa%20快速入门.md) | 中间件就是 async 函数，`await` 完直接赋 `ctx.body` |
| `src/03-onion.js` | [Koa 快速入门](../../Koa%20快速入门.md) | 洋葱模型：进入按顺序、返回按逆序 |
| `src/04-stack.js` | [Koa 快速入门](../../Koa%20快速入门.md) | 外置中间件三件套：`@koa/router` / `koa-body` / `koa-static` |

延伸阅读：[Koa 源码分析](../../Koa%20源码分析.md)（手写 compose 与 Context）、[Koa 项目模板](../../Koa%20项目模板.md)（可落地的工程骨架）。

## 怎么跑起来

```bash
npm install
npm run onion       # node src/03-onion.js
```

可用的 npm script（全部来自 `package.json` 的 `scripts`）：

| 命令 | 脚本 |
| --- | --- |
| `npm run hello` | `src/01-hello.js` |
| `npm run async` | `src/02-async.js` |
| `npm run onion` | `src/03-onion.js` |
| `npm run stack` | `src/04-stack.js` |

依赖是 `koa`、`@koa/router`、`koa-body`、`koa-static`。每个脚本都监听 3000 端口，跑完会自己退出，所以一次跑一个即可。

> `04-stack` 的静态目录写的是相对路径 `public/`，请在项目根目录下执行（`npm run` 默认就在根目录）。
>
> `koa-body` 从 v7 起改成具名导出，CommonJS 里要写 `const { koaBody } = require('koa-body')`；老版本写作 `const koaBody = require('koa-body')`。

## 目录结构

```
koa-basics/
├── public/
│   └── hello.txt              # koa-static('public') 托管的静态文件
├── src/
│   ├── 01-hello.js            # Hello World
│   ├── 02-async.js            # async/await 中间件 + 假数据库
│   ├── 03-onion.js            # 洋葱模型执行顺序
│   └── 04-stack.js            # @koa/router + koa-body + koa-static
├── lab.js                     # 自测小工具：起服务 → fetch 打请求 → 打印 → 退出
├── package.json
└── README.md
```

## 实测输出（节选）

`npm run onion`：

```
koa-basics · 03-onion 运行在 http://localhost:3000

=== koa-basics · 03-onion ===
中间件 1 - 进入
中间件 2 - 进入
处理请求
中间件 2 - 返回
中间件 1 - 返回
  GET  /
       状态码 200
       content-type: text/plain; charset=utf-8
       body: Hello
```

前五行就是洋葱模型：进入顺序是 1 → 2 → 处理请求，返回顺序是 2 → 1。

`npm run stack`：

```
=== koa-basics · 04-stack ===
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"users":[]}
  POST /users
       状态码 201
       content-type: application/json; charset=utf-8
       body: {"created":{"name":"well"}}
  GET  /hello.txt
       状态码 200
       content-type: text/plain; charset=utf-8
       body: 这是 koa-static('public') 提供的静态文件。
```

`koa-body` 让 `ctx.request.body` 变成了解析好的对象，`koa-static` 让 `public/hello.txt` 直接可访问。

## 和项目模板的区别

| | `koa-basics` | [`koa-template`](../koa-template) |
| --- | --- | --- |
| 用途 | 逐个知识点最小复现，一个脚本一个概念 | 可直接落地的工程骨架 |
| 依赖 | `koa` + 三个官方/社区中间件 | 含 TypeORM、Redis、JWT 等 |
| 代码规模 | 每个脚本 20~40 行 | 分层目录（routes / controllers / services） |

要理解 API 先看这里，要抄工程结构看模板。
