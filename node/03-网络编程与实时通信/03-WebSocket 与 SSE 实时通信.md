# WebSocket 与 SSE 实时通信

> 普通 HTTP 是"客户端问、服务端答"，而行情、通知、流式输出（聊天消息 / 日志回放 / 进度推送）需要"服务端主动、持续地推"。
> 这一篇打通实时通信，并回答一个核心问题：为什么"服务端持续推送"（如聊天消息、日志回放、进度推送）经常用 SSE 而不是 WebSocket。
> 承上：[HTTP 与 HTTPS 深入](./02-HTTP%20与%20HTTPS%20深入) —— WebSocket 由 HTTP 升级而来、SSE 复用 HTTP 流，须先懂 HTTP 才能分清两者差异
> 启下：[一次请求完整经历了什么](./04-一次请求完整经历了什么) —— 把一次请求逐层拆开讲清楚，说出一层出问题时该往哪看，并解释清 NestJS 替你封装了什么
> 在全景图里：仍是应用层，但换了一种连接形态——全景图画的是"一次短连接请求"，本篇讲的是"连接不再断开的两种形态"。它们和 TCP 的关系（谁建立在谁之上）是本篇的主线之一。

---

## 为什么需要实时通信

标准 HTTP 是单向请求-响应模型：浏览器发请求，服务器才回。但很多场景需要"服务器主动、持续地"把数据推给客户端：

| 场景 | 特点 | HTTP 轮询的代价 |
|------|------|----------------|
| 在线聊天 | 双向、低延迟 | 轮询浪费带宽，延迟高 |
| 股票行情 | 服务端高频推送 | 每秒几十次请求，扛不住 |
| 文档协作 | 多人实时同步 | 冲突多、体验差 |
| 流式输出（聊天 / 日志 / 进度） | 服务端逐条/逐片段生成 | 等全部生成完才返回，用户等得久 |

> 心智模型：HTTP 像"你每次发短信问一次"，实时通信像"对方开了个电台，随时播报"。选哪种，取决于"是谁、在什么时候、想说话"。

---

## WebSocket：从 HTTP 升级出来的全双工长连接

WebSocket 不是替代 TCP，而是**建立在 TCP 之上的应用层协议**，通过一次 HTTP 握手"升级"而来。

### 建立连接：HTTP Upgrade → 101

```txt
客户端（HTTP 请求，带 Upgrade 头）
  GET /chat HTTP/1.1
  Host: example.com
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
  Sec-WebSocket-Version: 13
        │
        ▼
服务端（同意升级）
  HTTP/1.1 101 Switching Protocols
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
        │
        ▼
此后：TCP 连接保持打开，双方用 WebSocket 帧自由收发（不再是 HTTP 报文）
```

握手成功后，这条 TCP 连接就脱离 HTTP 语义，进入 WebSocket 协议：双方可以任意时刻互发消息，直到任一方关闭。

### 帧结构、Ping/Pong 心跳

WebSocket 把数据切成**帧（Frame）**传输，帧里有操作码（文本/二进制/关闭/ping/pong 等）。其中：

- `Ping` / `Pong` 是心跳帧：一端发 Ping，另一端回 Pong，证明"我还活着"。
- 应用层消息可能被拆成多个帧，需要按帧头里的长度/掩码重新组装（类似第 1 篇 TCP 的分包，但 WebSocket 已内置在协议里）。

### 用 ws 库最小示例

```js
// ws-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log('客户端连入');

  ws.on('message', (data) => {
    console.log('收到：', data.toString());
    ws.send('echo: ' + data.toString()); // 双向收发
  });

  // 服务端主动推
  const timer = setInterval(() => {
    ws.send('时间：' + new Date().toLocaleTimeString());
  }, 3000);

  ws.on('close', () => clearInterval(timer));
});

// 客户端（浏览器原生）
// const ws = new WebSocket('ws://localhost:8080');
// ws.onmessage = (e) => console.log(e.data);
// ws.send('hello');
```

### 用 NestJS Gateway 最小示例

```ts
// chat.gateway.ts
import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';

@WebSocketGateway({ port: 8080 })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any) {
    // 收到客户端 'message' 事件，广播给所有人
    this.server.clients.forEach((c) => c.send(`广播：${payload}`));
  }
}
```

> 关键结论：NestJS 的 `@WebSocketGateway` / `@SubscribeMessage` 本质是对 `ws`（或 Socket.IO）的封装，帮你把"连接管理、事件分发、依赖注入"接进了 Nest 体系。底层依旧是那条升级后的 TCP 长连接。

---

## 心跳为什么必要：长连接的"假死"

TCP 连接即使一端已经断网、关机、或卡在 NAT 设备后面，另一端可能**长期不知道**——连接对象还在，但再也收不到数据，这就是"假死"。

典型场景：

```txt
手机切到后台 / 进入地铁隧道 → TCP 连接无声断开
但服务端以为还连着 → 持续向它推送行情 → 全丢，且占用内存
NAT/运营商路由器有"空闲超时"（如 5 分钟），静默回收映射 → 连接假死
```

解决：**心跳保活**。客户端与服务端定期互发 Ping/Pong，一段时间没收到 Pong 就判定连接已死，主动释放资源。

| 角色 | 做法 |
|------|------|
| 客户端 | 定时发 Ping，或监听 `onclose` / 重连 |
| 服务端 | 维护"最后活跃时间"，超时（如 60s 无 Pong）则 `ws.terminate()` |
| 网络层 | TCP `SO_KEEPALIVE` 可作为兜底，但默认周期长（小时级），不够快 |

```js
// 服务端心跳检测
const HEARTBEAT = 30000;
ws.isAlive = true;
ws.on('pong', () => { ws.isAlive = true; });

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate(); // 上轮没回 pong，杀掉
    ws.isAlive = false;
    ws.ping(); // 发 Ping，等 Pong
  });
}, HEARTBEAT);
```

> 心智模型：心跳像"到点喊一声到，没回应的就当你掉线了"。没有心跳，服务器会背着一堆死连接，内存和文件描述符悄悄被吃光。

---

## SSE：服务端单向持续推送

SSE（Server-Sent Events）用一条普通的 HTTP 长连接，让服务端持续向客户端推送事件。它是**单向（Server → Client）**的。

### 协议要点

- `Content-Type: text/event-stream`
- 数据格式：`data: 内容\n\n`（两个换行分隔一条事件）
- 支持 `event:` 指定事件名、`id:` 断线重连续传、`retry:` 重连间隔

```txt
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: 第一条消息

data: 第二条消息

event: notice
data: 这是带名字的事件

```

### Node 原生实现

```js
// sse-server.js
const http = require('node:http');

const server = http.createServer((req, res) => {
  if (req.url !== '/stream') {
    res.writeHead(404); res.end(); return;
  }
  // 1) 声明 SSE 长连接
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // 2) 持续推送
  let n = 0;
  const timer = setInterval(() => {
    n++;
    // 注意每条消息以 data: 开头、两个 \n 结尾
    res.write(`data: 消息 #${n} 时间=${new Date().toLocaleTimeString()}\n\n`);
  }, 1000);

  // 3) 客户端断开时清理
  req.on('close', () => clearInterval(timer));
});

server.listen(3001, () => console.log('SSE on 3001'));

// 浏览器端
// const es = new EventSource('/stream');
// es.onmessage = (e) => console.log(e.data);
// es.addEventListener('notice', (e) => console.log('通知', e.data));
```

### NestJS @Sse() 实现

```ts
import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return new Observable((observer) => {
      let n = 0;
      const timer = setInterval(() => {
        n++;
        observer.next({ data: `消息 #${n}` } as MessageEvent);
      }, 1000);
      return () => clearInterval(timer); // 客户端断开自动清理
    });
  }
}
```

> 关键结论：SSE 复用你早已熟悉的 HTTP + 流（`res` 是 Writable Stream，`write` 就是推送）。相比 WebSocket，它不需要"握手升级"，不需要额外协议库，浏览器原生 `EventSource` 即可，断线重连还是浏览器内置的。

---

## 核心决策表：SSE vs WebSocket

破除"实时 = WebSocket"的定势。先回答"谁是主要说话方、是否要双向"：

| 维度 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 单向 Server → Client | 全双工双向 |
| 协议 | 普通 HTTP（text/event-stream） | HTTP 升级后的独立协议 |
| 客户端 API | 浏览器原生 `EventSource` | 原生 `WebSocket` / 库 |
| 断线重连 | 浏览器自动重连（内置） | 需自己实现 |
| 跨域/网关兼容 | 走标准 HTTP，Nginx 易配 | 需配 `Upgrade` 头支持 |
| 复杂度 | 低，复用 HTTP 栈 | 高，需连接/心跳/房间管理 |

### "遇到 X → 选择 Y" 决策模型

```txt
需要双向（聊天、游戏、协同编辑）？
  ├─ 是 → WebSocket
  └─ 否（只有服务端推） → 是否要兼容老网关/简单实现？
        ├─ 是 → SSE（普通 HTTP 即可）
        └─ 否，且要极致双向 → WebSocket
```

具体场景映射：

| 场景 | 选 | 原因 |
|------|----|------|
| 流式输出（聊天 / 日志 / 进度） | **SSE** | 只有服务端推，单向足够，且 HTTP 友好 |
| 实时通知 / 站内信 / 监控大屏 | **SSE** | 服务端单向广播，简单可靠 |
| 股票/行情推送 | **SSE** | 服务端单向持续推，客户端很少回 |
| 在线聊天 / 客服 | **WebSocket** | 双向频繁收发 |
| 双人实时游戏 / 协同白板 | **WebSocket** | 低延迟双向同步 |
| IoT 设备指令双向控制 | **WebSocket** | 既收状态又发指令 |

> 心智模型：把 WebSocket 当成"开了个电台还能听观众打电话"，SSE 只是"电台单向广播"。如果只是广播，没必要上双向电台——SSE 更轻、更稳、更好运维。

---

## 为什么"服务端持续推送"经常用 SSE

这是本篇的落脚点，也是理解实时通信选型的关键认知。

服务端持续生成内容的特点：**慢且流式**。它不是一个"问完立刻给完整答案"的接口，而是边生成边推送（字/词/片段），一个回答可能要几秒到几十秒才生成完。

```txt
不用流式（糟糕体验）：
  用户点击 → 服务端生成内容 → 等 10 秒全部生成完 → 一次性返回
  用户面对空白页等了 10 秒，以为卡死了。

用 SSE（好体验）：
  用户点击 → 服务端生成内容 → 每生成一个片段
           → 通过 SSE 立刻推给浏览器 → 页面逐字显示
  用户立刻看到"正在输出"，等待感大幅降低。
```

完整链路：

```txt
服务端生成器  ──片段──▶  Node.js（拿到一个片段就 res.write 一次）
                              │
                              ▼
                          SSE（text/event-stream 长连接）
                              │
                              ▼
                          Browser（EventSource.onmessage 逐字渲染）
```

```js
// 流式输出（伪代码）
app.get('/chat/stream', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  // 生成器通常是异步迭代器，每 yield 一个片段
  for await (const chunk of generator.stream(prompt)) {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`); // 来一个推一个
  }
  res.write('data: [DONE]\n\n');
  res.end();
});
```

### 与 Stream / 背压的关系

- "每来一个 token 就 `res.write`"正是流的语义：数据是**边产生边流动**的，而不是攒完再发。
- 若浏览器消费慢（如用户切走标签页），`res` 可写流会产生**背压（backpressure）**：`res.write()` 返回 `false` 表示缓冲区满。此时应暂停向生成器拉取，避免服务端内存堆积。Node 流与 `async/await` 配合可天然处理：`if (!res.write(...)) await once(res, 'drain')`。
- 这正是第 1、2 篇知识的闭环：TCP 字节流 → HTTP 的 req/res 流 → SSE 在 res 流上持续写。NestJS 的 `@Sse()` 把 `Observable` 的每个 `next` 自动转成一次 `res.write`。

> 关键结论：流式输出（聊天 / 日志 / 进度）选 SSE，是因为它的需求本质是"服务端单向、低频交互、高频推送"，而 SSE 恰好是这个需求的最简解——无需握手升级、浏览器原生支持、断线自动重连、与现有 HTTP 网关无缝兼容。WebSocket 的双向能力在这里是"用不上的重量"。

---

## 断线重连、超时与连接管理

无论 SSE 还是 WebSocket，长连接都必须考虑"断"与"管"。

### SSE 重连（浏览器内置）

`EventSource` 在连接断开后**自动重连**，并可通过服务端发的 `id:` 字段实现断点续传：

```txt
服务端：  id: 42\ndata: 消息42\n\n   （带 id）
客户端断开重连时，浏览器自动带  Last-Event-ID: 42 头
服务端据此从 43 继续推，不重复
```

### WebSocket 重连（需手写）

浏览器 `WebSocket` 不自动重连，需自行实现指数退避：

```js
function connect() {
  const ws = new WebSocket('ws://localhost:8080');
  ws.onclose = () => {
    setTimeout(connect, 2000); // 2s 后重试（生产用指数退避）
  };
  ws.onerror = () => ws.close();
}
connect();
```

### 连接管理通用要点

| 关注点 | 建议 |
|--------|------|
| 超时 | 设置连接/读写超时，避免无限挂起 |
| 限流 | 单用户连接数上限，防刷 |
| 鉴权 | 长连接建立时校验 token（SSE 用查询参数/Header，WS 用握手阶段） |
| 优雅关闭 | 服务重启前通知客户端重连，再释放连接 |
| 资源回收 | `close` / `on('close')` 必须清理定时器、订阅、监听器，否则内存泄漏 |

> 关键结论：长连接的真正成本不在"连上"，而在"连上之后怎么管"。90% 的线上长连接故障（内存涨、FD 耗尽）都来自"断开时没清理资源"。每个 `on('data')` / `setInterval` 都要有对应的清理。

---

## 面试题

### Q1: WebSocket 和 HTTP 是什么关系？它替代 TCP 吗？

WebSocket 通过一次 HTTP Upgrade 握手（服务端回 101）建立，之后脱离 HTTP 语义复用那条 TCP 长连接。它不替代 TCP，而是建立在 TCP 之上的应用层协议，提供帧封装与双向全双工。

### Q2: 为什么长连接需要心跳（Ping/Pong）？

因为 TCP 连接在一端断网/关机/NAT 超时后，另一端可能长久不知情而"假死"，持续占用资源。Ping/Pong 定期探测，超时未回应即判定死亡并释放，避免内存与文件描述符泄漏。

### Q3: SSE 和 WebSocket 怎么选？

只有服务端单向推送（通知、行情、流式输出）选 SSE，简单、HTTP 原生、断线自动重连；需要双向高频（聊天、协作、游戏）选 WebSocket。

### Q4: 为什么"服务端持续推送"常用 SSE？

服务端逐片段生成很慢，SSE 可每生成一个片段就通过 HTTP 长连接推给浏览器，实现逐字渲染，显著降低用户等待感。其需求本质是单向持续推送，SSE 是最简解，无需握手升级且网关兼容好。

### Q5: SSE 断线重连如何避免重复推送？

服务端为每条事件发 `id:`，浏览器 `EventSource` 重连时自动带 `Last-Event-ID` 头，服务端据此从断点之后继续推，跳过已发部分。

---

> **回扣全景图**：到这里，全景图从浏览器到 Controller 的每一段都讲过了——但它们是"分层"讲的。下一篇把这几层纵向穿起来：一次请求到底走了哪些步、每步出问题去哪查。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/net-lab`。

| 文件 | 演示什么 |
| --- | --- |
| `07-sse.js` | SSE 服务端推送与流式读取 |
| `08-websocket.js` | WebSocket 与 Ping/Pong 心跳 |

运行方式见 `net-lab/README.md`。

---

## 参考

- 上一篇：[HTTP 与 HTTPS 深入](./02-HTTP%20与%20HTTPS%20深入)
- 下一篇：[一次请求完整经历了什么](./04-一次请求完整经历了什么)
