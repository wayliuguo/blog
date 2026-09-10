# HTTP 与 HTTPS 深入

> HTTP 是应用层协议，也是绝大部分后端接口的起点。
> 理解了 HTTP 报文与连接模型，你才看得懂 NestJS 的 @Controller、@Req、@Res 到底在封装什么。
> 承上：[TCP 与 Socket 编程](./01-TCP%20与%20Socket%20编程) —— HTTP 建立在 TCP 之上，不懂字节流就看不懂 req/res 为何是流
> 启下：[WebSocket 与 SSE 实时通信](./03-WebSocket%20与%20SSE%20实时通信) —— 能用 SSE 推一个每秒更新的流，并基于"是否双向"在 SSE 与 WebSocket 间做正确选型
> 在全景图里：应用层。也就是导读全景图里"HTTP → TCP"往上那一格；本篇还会补齐 HTTPS（HTTP 之下多一层 TLS）以及 HTTP/1.1 → HTTP/2 → HTTP/3 的演进。

---

## HTTP 是什么

HTTP（HyperText Transfer Protocol）运行在 TCP 之上，定义了一套"请求-响应"的文本约定：客户端发请求，服务端回响应，一次一答。

一次 HTTP 交互包含五个要素：

| 要素 | 说明 | 例子 |
|------|------|------|
| Method | 动作语义 | GET / POST / PUT / DELETE |
| URL | 资源定位 | `/api/user/1?role=admin` |
| Header | 元数据（键值对） | `Content-Type: application/json` |
| Body | 请求/响应正文 | `{"name":"Tom"}` |
| Status Code | 响应状态码 | `200` / `404` / `500` |

### 一段原始 HTTP 请求报文

```txt
POST /api/login HTTP/1.1
Host: api.example.com
Content-Type: application/json
Content-Length: 36
Accept: application/json

{"username":"tom","password":"123"}
```

服务端回的响应：

```txt
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 25

{"token":"eyJhbGciOi...","uid":1}
```

> 心智模型：HTTP 报文就是"带格式的文本"。NestJS 的 `@Body()` 内部做的事，本质是把 Body 文本 `JSON.parse`；`@Headers()` 是把 Header 行拆成对象；`@Query()` 是解析 URL 里的 `?` 后部分。

---

## 用 node:http 手写最小 HTTP Server

NestJS → Express/Fastify → Node.js HTTP 是一层层向上封装。我们跳过框架，直接用最底层 `node:http` 看本质。

```js
// http-server.js
const http = require('node:http');

const server = http.createServer((req, res) => {
  // req: 可读流（客户端发来的请求）
  // res: 可写流（将要写回客户端）
  const url = req.url;
  const method = req.method;

  // 简单路由
  if (url === '/api/hello' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ msg: 'hello' }));
    return;
  }

  if (url === '/api/echo' && method === 'POST') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ youSent: body }));
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(3000, () => console.log('listen 3000'));
```

抽象层级一目了然：

```txt
NestJS (@Controller/@Get)      ← 你写的业务
  ↓
Express / Fastify (路由+中间件)  ← 框架
  ↓
Node.js HTTP (解析报文)         ← node:http
  ↓
TCP (字节流)                    ← node:net
  ↓
Socket (OS 抽象)                ← epoll/kqueue
  ↓
OS Kernel / 网卡
```

> 关键结论：`req` / `res` 不是凭空出现的对象，它们是 Node.js 在 TCP 字节流之上解析出的"请求流"和"响应流"。你用 NestJS 时之所以能直接拿到 `@Body()`，是因为框架已经帮你把 `req` 流读完并解析好了。

---

## req 是可读流，res 是可写流

这是和第 1 篇 Stream 知识的直接呼应。

### 读取请求体：chunks + Buffer.concat

HTTP 请求体（尤其 POST）可能很大，不会一次性到达。Node 把它当成**可读流**，分块（chunk）推送。正确读法是：

```js
const chunks = [];
req.on('data', (chunk) => {
  chunks.push(chunk); // chunk 是 Buffer
});
req.on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8'); // 拼成完整字符串
  const data = JSON.parse(raw);
});
```

- `chunk` 是 `Buffer`（字节），不是字符串——呼应第 1 篇"TCP 是字节流"。
- `Buffer.concat` 把分散的块拼成一条完整 Body，等价于第 1 篇"自定义协议分包"的思路，只是 HTTP 用 `Content-Length` 当长度前缀。
- 一定要在 `end` 事件之后才 `JSON.parse`，否则可能解析半条消息。

### 响应流：res 可写流与背压

`res` 是可写流，用 `res.write()` 可以分多次写入，最后 `res.end()` 结束。这就是流式响应的基础——第 3 篇 SSE 正是利用它持续推送。

```js
res.writeHead(200, { 'Content-Type': 'text/plain' });
res.write('第一行\n');
res.write('第二行\n'); // 可多次写
res.end('结束\n');      // 结束响应
```

| 对象 | 流类型 | 你用它做什么 |
|------|--------|-------------|
| `req` | Readable | `.on('data')` / `.on('end')` 读取请求体 |
| `res` | Writable | `.write()` / `.end()` 写回响应 |

> 心智模型：把 HTTP 请求看成"从客户端流向服务端的字节河（req），响应看成"从服务端流回客户端的字节河（res）"。NestJS 的 `@Res()` 装饰器直接把这两条河交给你，让你能手动控制流。

---

## HTTP Keep-Alive：复用 TCP 连接

没有 Keep-Alive 时，每次 HTTP 请求都要新建一条 TCP 连接（三次握手），用完就断开（四次挥手）。一个网页有几十个资源，开销巨大。

Keep-Alive 让**多个 HTTP 请求复用同一条 TCP 连接**：

```txt
无 Keep-Alive：  建连 → 请求1 → 断连 → 建连 → 请求2 → 断连 ...（昂贵）
有 Keep-Alive：  建连 → 请求1 → 请求2 → 请求3 → 空闲超时断连（省）
```

Node.js `http` 模块相关配置（NestJS/Express 底层就是它）：

| 配置项 | 作用 | 踩坑点 |
|--------|------|--------|
| `keepAliveTimeout` | 服务器保持空闲连接多久（毫秒） | 设太短，长尾请求易断 |
| `headersTimeout` | 收到连接后多久必须收到完整请求头 | 防御慢速攻击 |
| `requestTimeout` | 整个请求处理的最长时间 | 超时返回 408 |
| `server.keepAliveTimeout` | 与 `res` 配合，建议比反代（Nginx）的 `proxy_read_timeout` 略大 | 否则出现 ECONNRESET |

### 与线上 ECONNRESET / 502 / 504 的关系

这是最常见的"玄学"故障，根源常在连接生命周期不对齐：

| 现象 | 常见原因 | 排查方向 |
|------|---------|---------|
| `ECONNRESET` | 服务端先断连，客户端还在用这条连接 | `keepAliveTimeout` 比 Nginx `proxy_read_timeout` 小，调大服务端超时 |
| `502 Bad Gateway` | 网关连不上/连上了被拒 | 后端进程挂了、端口未监听、防火墙 |
| `504 Gateway Timeout` | 网关等到超时仍无响应 | 后端处理慢、`requestTimeout` 过小、数据库慢查询 |

> 关键结论：超时配置一定要"客户端（网关）的超时 ≥ 服务端超时"。否则服务端主动断了一条网关还以为活着的连接，网关再用来发请求就会 ECONNRESET。

---

## HTTPS：HTTP over TLS

HTTPS 不是新协议，而是 **HTTP 运行在 TLS 之上，TLS 运行在 TCP 之上**：

```txt
HTTP  →  TLS（加密层）  →  TCP  →  IP  →  网卡
（明文）   （握手+加密）    （可靠字节流）
```

TLS 提供三件事：

| 能力 | 说明 | 没有它会怎样 |
|------|------|-------------|
| 加密 | 通信内容只有双方能读 | 运营商/黑客能窃听明文（密码泄露） |
| 身份认证 | 证书证明"你真的是 example.com" | 中间人伪造服务器，钓鱼 |
| 数据完整性 | 防篡改 | 响应被注入广告/恶意脚本 |

### TLS 握手（简化版）

```txt
客户端                                  服务端
  │  ClientHello（支持的加密套件、随机数）  │
  │ ──────────────────────────────────▶  │
  │                                      │  返回证书（含公钥）
  │  ServerHello + 证书 + 服务端随机数     │
  │ ◀──────────────────────────────────  │
  │                                       │
  │  验证证书 → 用公钥加密"预主密钥"发送    │
  │ ──────────────────────────────────▶  │
  │                                       │  私钥解密，双方算出相同会话密钥
  │  <此后所有 HTTP 报文都用会话密钥加密>    │
```

> 心智模型：TLS 握手相当于"先寄一把锁（证书公钥）过去，你用锁把钥匙锁上寄回来，只有我有钥匙能开"。之后双方用这把钥匙（会话密钥）加密通话。

---

## HTTP/1.1、HTTP/2、HTTP/3 演进

理解演进，重点是"解决什么痛点"，不必死记细节。

### HTTP/1.1 的队头阻塞

HTTP/1.1 虽然支持 Keep-Alive 复用连接，但**同一条连接上请求必须排队**：前一个响应没回来，后一个请求就得等。浏览器于是开 6 条连接并发缓解，但成本高。

```txt
连接1: 请求A ──等待响应A──▶ 请求B ──等待响应B──▶   （串行，队头阻塞）
```

### HTTP/2：多路复用

单条 TCP 连接上划分多个**二进制帧 Stream**，不同请求的帧可以交错发送，互不阻塞：

| 特性 | 说明 |
|------|------|
| 多路复用 | 单连接并发多个请求/响应，消除队头阻塞（应用层） |
| 二进制分帧 | 报文拆成帧，头部与数据分离，更高效 |
| Header 压缩 | HPACK 压缩重复头（如 Cookie），省带宽 |
| 服务端推送 | 服务器可主动推资源（已较少用） |

### HTTP/3：QUIC over UDP

HTTP/2 仍跑在 TCP 上。一条 TCP 连接一旦丢包，整个连接要等重传（TCP 层队头阻塞）。HTTP/3 改用 **QUIC（基于 UDP）**，把可靠、有序、加密搬到用户态，一条连接里的多个 Stream 互不影响，丢包只影响对应 Stream。

```txt
HTTP/1.1  →  TCP（队头阻塞：连接级）
HTTP/2    →  TCP（多路复用，但 TCP 丢包仍阻塞整条连接）
HTTP/3    →  QUIC / UDP（单连接多 Stream，丢包只阻塞该 Stream）
```

| 版本 | 传输层 | 队头阻塞 | 连接数 |
|------|--------|---------|--------|
| HTTP/1.1 | TCP | 连接内串行 | 多连接并发（~6） |
| HTTP/2 | TCP | 应用层解决，TCP 层仍在 | 单连接多路复用 |
| HTTP/3 | UDP(QUIC) | 彻底解决 | 单连接多路复用 |

> 需要掌握到什么程度：面试与实际工作中，**理解"为什么会有 HTTP/2/3、各自解决了什么"即可**，不必背帧结构细节。NestJS 默认仍跑 HTTP/1.1，多路复用由底层（Node 版本 / 反向代理 Nginx）决定，业务代码无感。

---

## 面试题

### Q1: req 和 res 分别是什么流？读取请求体为什么要用 chunks + Buffer.concat？

`req` 是可读流，`res` 是可写流。请求体可能分块到达，`data` 事件每次给一个 Buffer 分块，须用数组收集，在 `end` 事件后用 `Buffer.concat(chunks)` 拼成完整字节再解析，否则会解析半条消息。

### Q2: HTTP Keep-Alive 解决了什么？

避免每个 HTTP 请求都新建/断开 TCP 连接的三次握手与挥手开销。多个请求复用同一条 TCP，显著降低延迟和服务器连接数。

### Q3: 线上出现 ECONNRESET，可能和什么配置有关？

通常是服务端 `keepAliveTimeout` 小于反向代理（如 Nginx `proxy_read_timeout`），服务端先断开了一条代理还认为存活的连接，代理再用它发请求即报 ECONNRESET。应保持代理超时 ≥ 服务端超时。

### Q4: HTTPS 在协议栈的哪一层？TLS 提供哪三种能力？

HTTPS = HTTP over TLS over TCP。TLS 提供加密（防窃听）、身份认证（证书防冒充）、数据完整性（防篡改）。

### Q5: HTTP/2 和 HTTP/3 分别解决了什么？

HTTP/2 在 TCP 上做多路复用，单连接并发多请求，解决应用层队头阻塞；HTTP/3 改用 QUIC over UDP，把可靠/有序/加密移入用户态，解决 TCP 层丢包导致的整连接阻塞。

---

> **回扣全景图**：读完本篇，全景图里"HTTP → TCP"这一跳就通了。但 HTTP 只解决"一问一答"——服务端没法主动推。要补上这一块，看下一篇。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/net-lab`。

| 文件 | 演示什么 |
| --- | --- |
| `05-http-server.js` | node:http 手写最小 Server |
| `06-keepalive.js` | Keep-Alive 连接复用观测 |

运行方式见 `net-lab/README.md`。

---

## 参考

- 上一篇：[TCP 与 Socket 编程](./01-TCP%20与%20Socket%20编程)
- 下一篇：[WebSocket 与 SSE 实时通信](./03-WebSocket%20与%20SSE%20实时通信)
