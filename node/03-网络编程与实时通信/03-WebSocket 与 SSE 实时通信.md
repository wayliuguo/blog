# WebSocket 与 SSE 实时通信

## 实时双向通信为什么需要 WebSocket？

普通 HTTP 是典型的"请求-响应"模式：客户端主动发请求，服务端返回响应，一次交互就结束。但聊天室、在线游戏、股票行情、实时通知、多人协作、实时日志这类业务，需要服务端在任意时刻主动把数据推给客户端，HTTP 的"一问一答"天生不匹配。

```
HTTP（请求-响应）：                 WebSocket（双向长连接）：
                                  
Client ──Request──▶ Server         Client ⇄ Server
Client ◀─Response─ Server         Client ⇄ Server
（一问一答，立刻结束）              （连接常开，双方都可主动收发）
```

于是需要一条 `Client ⇄ Server` 的长连接，让服务端也能随时说话。WebSocket 就是为这类实时双向通信设计的应用层协议。

## WebSocket 是怎么建立连接的？

一个常见误解是"WebSocket 一上来就建了一条专用的 TCP 连接"。实际上它**先复用一次 HTTP 完成协议升级**，并没有凭空发明一条新连接。

客户端在普通 HTTP 请求里带上升级头：

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

服务端同意升级时返回：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

这一步叫 **HTTP Upgrade**。整个过程可以用下面这张图串起来：

```
HTTP 普通请求
     │
     ▼
服务端返回 101 Switching Protocols
     │
     ▼
WebSocket 协议接管同一条 TCP 连接
     │
     ▼
Client ⇄ Server 双方保持长连接
```

注意 `Sec-WebSocket-Accept` 不是用来"加密"的，而是服务端把客户端发来的 `Sec-WebSocket-Key` 拼上固定字符串、做一次 SHA-1 + Base64 后回传，用来**向客户端证明"对方确实懂 WebSocket 握手"**，从而防止缓存代理或意外服务器把升级请求误判成普通 HTTP 而返回脏数据。握手结束后，这条 TCP 连接就脱离 HTTP 语义，改用 WebSocket 帧来通信。

## WebSocket 和 TCP 到底是什么关系？

这是最容易混淆的一点。先看分层：

```
WebSocket（应用层协议）
     │
     ▼
   TCP（传输层协议）
     │
     ▼
    IP（网络层协议）
```

TCP 是**传输层**协议，WebSocket 是**应用层**协议，经典关系是 `WebSocket → TCP → IP`。如果你绕过 WebSocket，直接用 `net.createServer()` 基于 TCP 写一套通信：

```js
// 直接用 TCP：消息格式、心跳、断线处理全要自己设计
const net = require('node:net');
net.createServer((socket) => {
  socket.on('data', (buf) => {
    // 字节流怎么切分成"消息"？粘包怎么办？
    // 怎么区分文本/二进制？心跳帧怎么定义？
  });
});
```

你就要自己定义消息格式、分包、心跳、断线重连等一整套规则。而 WebSocket 已经把这些定好了：

```
Handshake   握手（HTTP Upgrade）
Frame       帧（数据切分单位）
Message     消息（由若干帧拼成）
Ping        心跳探测帧
Pong        心跳响应帧
Close       关闭帧
Text        文本消息
Binary      二进制消息
```

所以结论很明确：**WebSocket 不是 TCP 的替代品，而是建立在 TCP 之上的应用层协议**。它把"怎么可靠地双向传消息"这件事标准化了，你只需关注业务，不用自己造轮子。

## 为什么长连接需要心跳？

长连接有一个绕不开的现实问题：当客户端断网、手机切换网络、进程被杀、NAT 映射超时失效、设备突然关机时，**服务端往往不能立刻知道连接已经失效**。TCP 连接对象还在，但再也收不到任何数据，这种状态叫"假死"。服务端若一直背着这些死连接，会悄悄吃光内存和文件描述符。

于是需要 `Ping / Pong` 心跳机制定期探测：

```
Server
   │
   │ Ping（你还活着吗？）
   ▼
Client
   │
   │ Pong（活着）
   ▼
Server（收到，连接健康）

连续多次无 Pong → 判定连接失效 → 释放 Socket
```

一个真正能上生产的 WebSocket 服务，绝不只是"建立连接 + 收发消息"两步。你至少要同时考虑：

```
心跳       定期 Ping/Pong，剔除假死连接
断线       客户端不可达时及时感知
重连       网络抖动后客户端自动恢复
超时       空闲连接、读写超时主动关闭
连接状态   维护每个连接的健康度
消息确认   关键消息是否送达、避免丢失
扩容分布   多实例下连接散落在不同进程
```

最后一点最容易被忽略：单机改成多实例部署后，连接会散落在不同进程里。若要做"全房间广播"，A 实例上的连接和 B 实例上的连接并不互通，你需要共享订阅关系（如 Redis 发布订阅、消息总线）或集中式连接管理，否则广播根本发不到另一个实例上的连接。这也是为什么成熟项目通常直接选用带房间/集群能力的库，而不是从 `net` 起步自己造协议。

## SSE 是什么？

SSE（Server-Sent Events）用一条普通的 HTTP 长连接，让服务端持续向客户端推送事件。它是**单向**的，方向固定为 `Client ← Server`。

```
WebSocket（双向）：   Client ⇄ Server
SSE（单向）：         Client ← Server
（服务端持续向客户端推送）
```

它的两条工程要点必须先讲清：

**① 报文格式是纯文本，按行组织、空行分隔事件。** 每行是 `字段: 值` 形式，常见字段有：

```
event: 事件名        —— 可选，客户端可针对性监听
data:  负载内容      —— 真正的消息体
id:    事件编号      —— 用于断线续传
retry: 重连间隔(ms)  —— 建议浏览器多久重连一次

（以上组成一个事件，事件之间用空行分隔）
```

**② 客户端断开后浏览器会自动重连。** 浏览器原生的 `EventSource` 在建连失败或连接断开时会**自动重连**，并在重连请求里带上 `Last-Event-ID` 头。服务端据此从断点之后继续推，避免重复推送。

在 Node 里实现 SSE 没有想象中复杂，本质上是：

```
1. 把响应的 Content-Type 设为 text/event-stream
2. 关掉默认缓冲（设 Cache-Control: no-cache、Connection: keep-alive）
3. 往 res 上持续 write 事件文本
```

因为 `res` 本身就是可写流（呼应第 02 篇）——你只需要把一段段事件 `write` 进这条流，浏览器侧的 `EventSource` 就会逐条触发 `onmessage`。

```js
// sse-server.js：极简 SSE 服务端
const http = require('node:http');

const server = http.createServer((req, res) => {
  if (req.url !== '/stream') {
    res.writeHead(404);
    res.end();
    return;
  }
  // 1) 声明 SSE 长连接
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  // 2) 持续推送（res 是可写流，write 即推送）
  let n = 0;
  const timer = setInterval(() => {
    n++;
    res.write(`id: ${n}\ndata: 消息 #${n} 时间=${new Date().toLocaleTimeString()}\n\n`);
  }, 1000);
  // 3) 客户端断开时清理，避免内存泄漏
  req.on('close', () => clearInterval(timer));
});

server.listen(3001, () => console.log('SSE on http://localhost:3001/stream'));
```

## 为什么流式输出场景适合 SSE？

假设一次请求要等服务端准备 20 秒才算完。最笨的做法是"等 20 秒 → 一次性返回完整结果"，用户对着空白页干等，体验很差：

```
Client ──POST /task──▶ Server
                          │ 准备 20 秒（完全算完）
                          ▼
Client ◀──完整结果──── Server
（用户前 20 秒什么都看不到，以为卡死）
```

更好的方式是"边产生边推"：服务端每准备好一小段就推一段，客户端立刻显示。典型场景包括**日志回放、批量任务进度、大文件生成、实时监控数据**——它们共同点是"数据一段一段来，且不需要客户端高频回传"。

```
数据源（日志 / 任务进度 / 大文件）
        │
        │ 分片（每产生一小段）
        ▼
      SSE（text/event-stream 长连接）
        │
        ▼
     Browser（逐段渲染，立即显示）
```

以"逐字揭示一段说明文字"为例，客户端会看到内容像这样逐步累积：

```
Node
Node.js
Node.js 是
Node.js 是一个
Node.js 是一个基于 Chrome V8 的运行时
```

这正是 SSE 的拿手好戏：需求本质是"服务端单向、低频交互、高频推送"，而 SSE 恰好是最轻的解——无需握手升级、浏览器原生支持、断线自动重连、与现有 HTTP 网关无缝兼容。WebSocket 的双向能力在这里是用不上的重量。

## SSE 与 WebSocket 应该怎么选？

破除"实时通信 = WebSocket"这个固定思维。先按维度对照：

| 维度 | SSE | WebSocket |
| --- | --- | --- |
| 通信方向 | 单向（Server → Client） | 双向全双工（Client ⇄ Server） |
| 是否基于纯 HTTP | 是，普通 HTTP 长连接 | 握手后升级为独立协议 |
| 服务端持续推送 | 非常适合 | 适合 |
| 双向实时通信 | 不适合 | 非常适合 |
| 聊天 | 一般 | 非常适合 |
| 实时通知 / 站内信 | 适合 | 适合 |
| 股票行情推送 | 适合 | 适合 |
| 多人实时协作 / 双人实时游戏 | 不适合 | 非常适合 |
| 自动重连 | 浏览器内置（`EventSource`） | 需自己实现 |
| 二进制传输 | 仅文本（需自行编码） | 原生支持 Text / Binary |
| 跨域与鉴权复杂度 | 走标准 HTTP，网关易配 | 需配 `Upgrade` 头，稍复杂 |

两条判断准则：

```
业务本质是 Server → Client 持续推送？
  └─ 是 → SSE 往往已经足够（通知、行情、日志、进度）

业务需要 Client ⇄ Server 高频双向通信？
  └─ 是 → 更适合 WebSocket（聊天、协作、游戏）
```

一句话总结：**如果只是服务端广播，没必要上双向电台；SSE 是单向广播里最轻、最稳、最好运维的选择。**

把前面所有层串起来看，你已经掌握了 HTTP 短连接、TCP 长连接、以及这两条"连接不再断开"的形态。下一篇把这几层纵向穿起来，看一次真实请求从浏览器到服务端到底完整经历了什么。

## 小结

- **HTTP 的一问一答不匹配服务端主动推送**：聊天、行情、通知、协作需要一条 `Client ⇄ Server` 的常开连接，WebSocket 就是为此设计的应用层协议。
- **WebSocket 先复用一次 HTTP 完成协议升级**：客户端发 `Upgrade: websocket` + `Sec-WebSocket-Key`，服务端同意就回 `101 Switching Protocols` + `Sec-WebSocket-Accept`。
- **`Sec-WebSocket-Accept` 不是加密**：把 Key 拼上固定字符串做一次 SHA-1 + Base64 回传，只用来证明"对方确实懂握手"，防缓存代理误当普通 HTTP 返回脏数据。
- **WebSocket 不替代 TCP**：分层是 `WebSocket → TCP → IP`；它把 Frame、Message、Ping / Pong、Close、Text / Binary 标准化，省掉自己造协议。
- **长连接为什么需要心跳**：客户端断网、切网、进程被杀、NAT 映射超时后连接会"假死"——Socket 还在却收不到数据，白白占内存与 fd。
- **能上生产的长连接还要考虑**：断线感知、客户端自动重连、读写与空闲超时、连接健康度、关键消息确认，以及多实例下的连接分布。
- **SSE 是纯 HTTP 长连接的单向推送**：方向固定 `Client ← Server`；响应头设 `Content-Type: text/event-stream` + `Cache-Control: no-cache`，然后往 `res` 这条可写流持续 `write`。
- **SSE 的报文格式、断线续传与清理**：事件按 `event:` / `data:` / `id:` / `retry:` 分行、空行分隔；重连带 `Last-Event-ID` 从断点续推；必须监听 `req.on('close')` 清掉定时器，否则泄漏。
- **流式输出场景为什么适合 SSE**：需求本质是"服务端单向、低频回传、高频推送"（日志、进度、大文件生成、监控），SSE 无需握手升级、浏览器原生支持、网关无缝兼容。
- **SSE 与 WebSocket 的选型准则**：只需服务端单向推送（通知、行情、日志、进度）用 SSE 最轻；需要高频双向（聊天、协作、游戏）才上 WebSocket。

## 配套代码

| 文件 | 演示什么 |
| --- | --- |
| `./code/net-lab/src/07-sse.js` | SSE：`text/event-stream` + 持续 `write` + 客户端自动重连 |
| `./code/net-lab/src/08-websocket.js` | WebSocket：HTTP Upgrade → 101 之后的双向收发与心跳 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[HTTP 与 HTTPS 深入](./02-HTTP%20与%20HTTPS%20深入.md)
- 下一篇：[一次请求完整经历了什么](./04-一次请求完整经历了什么.md)
