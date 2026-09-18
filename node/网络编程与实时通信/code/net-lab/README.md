# net-lab

Node.js 后端知识体系 —— 模块二「网络底层」配套实验代码。
对应博客：`node/03-网络编程与实时通信/00-导读` ～ `03-WebSocket 与 SSE 实时通信`。

## 环境要求

- Node.js 18+（用到 `fetch` 流式读取等特性）
- 除 `ws`（WebSocket 实现）外全部用 Node 内置 `node:` 模块
- 安装依赖：`npm install`（只需装 `ws` 一个包，仅 `08` 用到）

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 终端数 | 预期输出 |
| --- | --- | --- | --- | --- |
| `01-tcp-server.js` | TCP 服务端，hex/utf8 双视角看字节流 | `npm run 01` | 1（常驻） | 打印连接、每次 data 的 hex 与 utf8、回执 |
| `02-tcp-client.js` | TCP 客户端连发 3 条 | `npm run 02` | +1 | 连上后发 3 条，收到服务端回执后退出 |
| `03-sticky-packet.js` | 粘包/拆包复现（单文件） | `npm run 03` | 1 | 很可能看到 3 次 write 合并成 1 次 data 事件 |
| `04-protocol-server.js` | 自定义分包协议服务端 | `npm run 04s` | 1（常驻） | 正确拆出 3 条完整消息（处理半包/粘包） |
| `04-protocol-client.js` | 自定义分包协议客户端 | `npm run 04c` | +1 | 按 `长度(4字节)+Body` 编码发送 |
| `05-http-server.js` | 最小 HTTP Server | `npm run 05` | 1（常驻） | 处理 GET/、/api/users、POST /api/echo、404 |
| `06-keepalive.js` | Keep-Alive 复用 socket 对比 | `npm run 06` | 1 | keepAlive 开时本地端口不变（复用），关时变化 |
| `07-sse.js` | SSE 流式推送（单文件） | `npm run 07` | 1 | 每 500ms 推 1 条，共 6 条后 client 打印结束 |
| `08-websocket.js` | WebSocket + Ping/Pong 心跳 | `npm run 08` | 1 | client 发 3 条收到回显，5 秒后退出 |

> 标注“常驻”的脚本需手动 Ctrl+C 退出；其余都会自动结束。

## 每类实验要开几个终端

- **一 server 一 client**（01+02、04s+04c）：终端 A 起服务，终端 B 跑客户端。
- **单文件自包含**（03、07、08）：直接一个终端 `npm run xxx` 就能看到完整现象。
- **06、05**：一个终端起服务/跑完即可。

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于对照自检（以下为真实运行要点）。标注“常驻”的脚本需手动 Ctrl+C 退出。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `01-tcp-server.js` | `npm run 01` | 打印新连接、每次 `data` 事件的 hex 与 utf8 双视角、服务端的回执 |
| `02-tcp-client.js` | `npm run 02` | 连上后连发 3 条，收到服务端回执后退出 |
| `03-sticky-packet.js` | `npm run 03` | 很可能看到 3 次 `write` 合并成 1 次 `data`（粘包），需自行解析边界 |
| `04-protocol-server.js` | `npm run 04s` | 按 `长度(4字节)+Body` 正确拆出 3 条完整消息（处理半包/粘包） |
| `04-protocol-client.js` | `npm run 04c` | 按协议编码发送，服务端能完整收到 3 条 |
| `05-http-server.js` | `npm run 05` | GET `/` 返回首页文案、`/api/users` 返回用户数组、POST `/api/echo` 原样回显、其余路径 404 |
| `06-keepalive.js` | `npm run 06` | 开启 Keep-Alive 时多次请求复用同一本地端口（端口号不变），关闭时端口变化 |
| `07-sse.js` | `npm run 07` | 每 500ms 服务端推 1 条，客户端共收到 6 条后打印结束 |
| `08-websocket.js` | `npm run 08` | 客户端发 3 条收到服务端回显，期间有 Ping/Pong 心跳，5 秒后退出 |

## 为什么值得跑一遍

- `01`/`02` 让你明白“TCP 是字节流不是消息协议”——这是后面所有粘包问题的根。
- `03` 复现粘包，`04` 给出标准解法（长度前缀 + 累积缓冲 + while 拆包），两者对照一看就懂。
- `05` 把“req 是可读流、res 是可写流”落到代码：
  请求体要靠 `chunks[] + Buffer.concat` 累积，而不是“函数参数直接拿到”。
- `06`/`07`/`08` 是实时通信的三件套：长连接复用、服务端单向推流、双向全双工 + 心跳保活。

## 注意事项

- `08-websocket.js` 依赖 `ws`，运行前请先 `npm install`。
- 服务类脚本（01、04s、05）占用端口 4000/4002/3000，结束后记得 Ctrl+C 释放。
