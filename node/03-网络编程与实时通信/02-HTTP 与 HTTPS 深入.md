# HTTP 与 HTTPS 深入

## HTTP 又是什么：为什么 TCP 之上还要有一层应用协议？

TCP 只负责把字节从一端可靠地送到另一端，它只懂"字节流"，不懂"我要取哪个资源"。

但浏览器或客户端真正想表达的是：

```
我要 GET /users
我要 POST /login
```

所以必须在 TCP 之上再定义一层**应用层协议**，约定"字节流该怎么被翻译成一次请求和一次响应"。HTTP 就是其中最重要的一个——它定义了 `Method / URL / Header / Body / Status Code` 这些规则。

一段最朴素的 HTTP 请求报文长这样：

```http
GET /users HTTP/1.1
Host: example.com
Accept: application/json
```

服务端回的响应报文则是：

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"users":[]}
```

注意中间那个空行：空行之前是"头"，空行之后是"体（Body）"。这就是 HTTP 在 TCP 字节流之上约定的边界规则。协议栈上，HTTP 就挂在 TCP 之上：

```
HTTP    （应用层：请求/响应语义）
  ↓
TCP     （传输层：可靠字节流）
  ↓
IP      （网络层：寻址与路由）
```

> 心智模型：TCP 把数据送达，HTTP 决定"送达的字节里，哪部分是方法、哪部分是路径、哪部分是正文"。你用框架时之所以能直接拿到 `@Body()`，是因为框架已经按 HTTP 规则把字节流解析好了。

## 用 node:http 手写 Server：几行代码之后会撞上哪些工程问题？

Node.js 内置 `node:http` 就能直接起一个 HTTP Server：

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  // req：客户端请求（可读流）
  // res：服务端响应（可写流）
  if (req.method === 'GET' && req.url === '/users') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ users: [] }));
    return;
  }

  // 其它路径返回 404
  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(3000, () => {
  console.log('server on http://localhost:3000');
});
```

`createServer` 的回调每来一个请求触发一次：`req.method` / `req.url` 用来判断路由，`res.writeHead` 写响应头，`res.end` 写响应体并结束响应。

如果所有业务都这么手写，很快就会撞上一连串工程问题：

```
路由怎么管理？    一个 if 不够用，需要路由表
参数怎么解析？    /users?id=1 的查询参数要自己拆
Body 怎么解析？    POST 的 JSON / 表单要自己读流再 parse
异常怎么处理？    回调里抛错会崩进程，需要统一兜底
权限怎么处理？    登录态、鉴权要横切在路由之前
代码怎么组织？    路由、中间件、控制器要分层
```

于是更高层的抽象出现了：`Express` / `Fastify` 在 `node:http` 之上封装了路由与中间件，`NestJS` 又在它们之上做了装饰器与依赖注入。整套抽象层级是：

```
NestJS            （装饰器 / 依赖注入 / 模块化）
  ↓
Express / Fastify （路由 / 中间件 / 生命周期）
  ↓
node:http         （解析 HTTP 报文）
  ↓
TCP               （可靠字节流）
  ↓
Socket            （OS 提供的连接抽象）
  ↓
Operating System  （内核 / 网卡）
```

记住这个层级：你日常写的业务在最上层，但所有请求最终都落到最底下的 TCP 字节流。下一节会解释，为什么 `req` / `res` 这两个对象其实也是流。

## HTTP 的 req / res 本质上也是流

这是 Node.js 里非常漂亮的一处设计：HTTP 请求和响应并非一个"已经拼好的完整字符串"，而是**流**。

`req` 是**可读流（Readable）**。客户端发来的请求体可能很大、分多次到达，Node 用 `data` 事件逐块推给你：

```js
const chunks = [];

req.on('data', (chunk) => {
  // chunk 是 Buffer，不是字符串
  chunks.push(chunk);
});

req.on('end', () => {
  // 所有分块到齐，再拼成一个完整字节序列
  const body = Buffer.concat(chunks).toString('utf8');
  console.log(body);
});
```

`res` 是**可写流（Writable）**。你可以分多次写入，最后用 `end()` 收尾：

```js
res.writeHead(200, { 'Content-Type': 'text/plain' });
res.write('hello ');
res.write('world');
res.end(); // 结束响应
```

把整条数据链路串起来，会看到从网卡到 JavaScript 变量的每一跳：

```
Network（网卡收到比特流）
   ↓
TCP（按序号重组为可靠字节流）
   ↓
HTTP（按 Method/Header/Body 规则切分报文）
   ↓
Stream（以 chunk 为单位流式产出）
   ↓
Buffer Chunk（一块块字节）
   ↓
JavaScript（你的 data / end 回调拿到 Buffer）
```

结论很清楚：**Buffer 与 Stream 不是孤立知识**——它们本来就是 Node.js I/O 模型的基础。也正是因为这个设计，大文件下载才能直接 `readableStream.pipe(res)`，让磁盘上的字节"边读边发"地流向客户端，而不必先全部读进内存。

## 为什么流式响应不能先算 Content-Length？

当响应体是一次性算出来的（比如 `JSON.stringify(...)`），服务端可以在 `writeHead` 里带上 `Content-Length`，告诉客户端"我总共发这么多字节，收齐就结束"：

```js
const data = JSON.stringify({ users: [] });
res.writeHead(200, {
  'Content-Type': 'application/json',
  'Content-Length': Buffer.byteLength(data), // 必须是字节长度
});
res.end(data);
```

但一旦响应是**流式产生**的——比如一边读数据库一边推、一边读大文件一边发——你就无法在开头先算出总长度。两个原因：

1. 总长度要等所有数据产生完才知道，而流式响应的意义恰恰是不等完就先发。
2. `Content-Length` 取的是**字节长度**，不是字符长度。一个 `'你好'` 字符串 `length` 是 2，但 `Buffer.from('你好').length` 是 6（UTF-8 下每个汉字 3 字节）。字符长度 ≠ 字节长度，错算会直接让客户端截断或报错——这一点在第 06 篇有详细展开，见第 06 篇。

所以 HTTP 提供了另一种机制：**分块传输编码**。

```http
HTTP/1.1 200 OK
Transfer-Encoding: chunked
```

`Transfer-Encoding: chunked` 让响应体被切成若干块，每块自带长度前缀，最后以一个长度为 0 的块表示结束。这样服务端就能做到"边产生、边发送、边结束"，无需预先知道总字节数。流式推送、大文件下载、实时进度，背后都是这套分块传输在支撑。

## HTTP Keep-Alive 为什么重要：三个超时怎么互相影响？

如果不开启 Keep-Alive，每个 HTTP 请求都要走一遍"建立 TCP → 发请求 → 收响应 → 关闭 TCP"，频繁建连/断连有实打实的握手与挥手成本：

```
无 Keep-Alive：
  建立 TCP → 请求1 → 响应1 → 关闭 TCP
  建立 TCP → 请求2 → 响应2 → 关闭 TCP
  建立 TCP → 请求3 → 响应3 → 关闭 TCP   （每个请求都付一次连接成本）

有 Keep-Alive：
  ── 同一条 TCP 连接 ──────────────
  请求1 ──────────────▶
        ◀───────────── 响应1
  请求2 ──────────────▶
        ◀───────────── 响应2
  请求3 ──────────────▶
        ◀───────────── 响应3
  （空闲一段时间后超时，才关闭这条连接）
```

Keep-Alive 的核心思想就是：**多个 HTTP 请求复用同一条 TCP 连接**。所以你在真实 Node 服务里一定会碰到这三个超时配置：

```
keepAliveTimeout   连接保持空闲多久后关闭
headersTimeout     建连后多久内必须收到完整请求头
requestTimeout     整个请求（含处理）的最长允许时间
```

三者含义与相互关系：

- `keepAliveTimeout`：keep-alive 连接空闲多久后被服务器主动关闭。设太短，长尾请求容易被提前掐断。
- `headersTimeout`：从连接建立到收齐请求头的时限，主要防慢速攻击。
- `requestTimeout`：单个请求从开始到结束的总时限，超时通常返回 `408` 或直接断连。

**关键的坑在于 `headersTimeout` 与 `keepAliveTimeout` 的相对大小**：`headersTimeout` 必须**大于** `keepAliveTimeout`。否则会出现竞态——服务器按 `keepAliveTimeout` 关闭了一条正处于 keep-alive 空闲的连接，但"已关闭"这个状态还没来得及和请求头超时逻辑对齐，于是连接上后续进来的请求被直接丢弃，客户端侧就表现为 `ECONNRESET` / `socket hang up`。

设置建议（毫秒）：

```js
const server = http.createServer(app);
server.keepAliveTimeout = 5000;    // 5s 空闲后关连接
server.headersTimeout = 60000;     // 必须 > keepAliveTimeout
server.requestTimeout = 30000;     // 单请求最多 30s
```

一句话原则：**反向代理（如 Nginx）的超时 ≥ 服务端超时**，否则代理还以为连接活着、拿去发请求时，服务端已经把它关了。

## HTTPS 比 HTTP 多了什么：TLS 解决了哪三件事？

HTTPS 不是新协议，而是 **HTTP over TLS**——在 HTTP 与 TCP 之间多垫了一层 TLS：

```
HTTP    （明文请求/响应）
  ↓
TLS     （握手 + 加密 + 完整性校验）
  ↓
TCP     （可靠字节流）
  ↓
IP
```

TLS 主要解决三件事：

| 能力 | 作用 | 没有它会怎样 |
|------|------|--------------|
| 加密 | 通信内容只有通信双方能读 | 运营商 / 中间人可窃听明文，密码泄露 |
| 身份认证 | 证书证明"你真的是 example.com" | 中间人伪造服务器，钓鱼劫持 |
| 数据完整性 | 防篡改 | 响应被注入广告或恶意脚本 |

建立 HTTPS 连接要先做一次 TLS 握手，简化后的流程是：

```
Client
  ↓
TLS Handshake（协商加密套件、交换随机数）
  ↓
验证服务器证书（确认对方身份，非伪造）
  ↓
密钥协商（双方算出同一把会话密钥）
  ↓
建立加密连接
  ↓
HTTP 数据开始加密传输
```

在 Node 里起一个 HTTPS 服务，只是把 `http` 换成 `https` 并带上证书：

```js
import https from 'node:https';
import fs from 'node:fs';

const server = https.createServer(
  {
    key: fs.readFileSync('./server.key'),  // 私钥
    cert: fs.readFileSync('./server.cert'), // 证书（含公钥）
  },
  (req, res) => {
    res.end('hello over TLS');
  },
);

server.listen(443);
```

生产环境里，TLS 通常**不在 Node 进程里终止**，而是在网关（Nginx / 负载均衡 / 云服务）上统一卸载：网关做 TLS 终结与证书管理，后端 Node 服务跑在内部明文 HTTP 上。这样证书续期、多实例统一入口都更省心，Node 只管业务。

## HTTP/1.1 的队头阻塞与 HTTP/2 多路复用

作为后端开发，不必钻研 HTTP/2 的帧格式源码，但必须理解 HTTP/1.1 为什么有性能瓶颈、HTTP/2 又解决了什么。

### HTTP/1.1 的核心问题

前面说 HTTP/1.1 用 Keep-Alive 复用了 TCP 连接，这已经比每次重连高效很多：

```
TCP Connection
      │
      ├── Request 1
      ├── Response 1
      ├── Request 2
      └── Response 2
```

但 HTTP/1.1 **同一条连接上的请求/响应是串行的**：前一个响应没回来，后一个请求就只能排队。这就是应用层的**队头阻塞（Head-of-Line Blocking）**。浏览器为了提并发，只能靠"开多条 TCP 连接"（通常 6 条左右）来绕过，而这又额外增加了 TCP 握手与 TLS 握手的连接成本。

### HTTP/2 的核心：多路复用

HTTP/2 的关键能力是 **Multiplexing（多路复用）**：在**单条 TCP 连接**上同时跑多个 Stream，不同请求的帧可以交错传输，互不排队：

```
TCP Connection（单条）
        │
   ┌────┼─────────┐
   ↓    ↓         ↓
Stream 1  Stream 3  Stream 5
   ↓    ↓         ↓
Request A Request B  Request C
```

数据不再是简单的"请求 A → 响应 A → 请求 B → 响应 B"，而是被拆成 **Frame（帧）** 在同一条连接里交错发送。一个连接就能承载多个并发请求。

除此之外，HTTP/2 还引入了：

| 特性 | 说明 |
|------|------|
| 二进制分帧 | 报文拆成二进制帧，头部与数据分离，解析更高效 |
| Header 压缩（HPACK） | 压缩重复出现的请求头（如 Cookie），省带宽 |
| 单连接多路复用 | 消除应用层队头阻塞，无需开多条连接 |

收束成一句话：

```
HTTP/1.1  →  Keep-Alive      →  复用 TCP 连接
HTTP/2    →  一条 TCP 连接    →  多个 Stream  →  并发传输
```

## HTTP/3 又是什么：为什么还要换掉 TCP？

HTTP/1.1 与 HTTP/2 经典情况下都跑在 TCP 之上：

```
HTTP  →  TCP  →  IP
```

HTTP/3 则发生了一个根本变化——把传输层从 TCP 换成了 **QUIC（基于 UDP）**：

```
HTTP/3  →  QUIC  →  UDP  →  IP
```

QUIC 在 UDP 之上重新实现了：

```
可靠传输     （保证数据不丢）
多路复用     （一条连接多个 Stream）
拥塞控制     （根据网络状况调节发送速率）
TLS 安全能力 （加密与身份认证内建）
更高效的连接建立（减少握手往返）
```

**为什么 HTTP/2 已经有了多路复用，还需要 HTTP/3？** 关键在于：HTTP/2 的多个 Stream 最终仍共享**同一条 TCP 连接**，而 TCP 必须保证字节流"可靠且有序"。一旦底层某个 TCP 数据包丢失，后续数据即便已经到达，也可能要等缺失的那段重传补齐才能往上交——这就是 **TCP 层队头阻塞**。QUIC 让不同 Stream 更独立：某个 Stream 丢包只影响它自己，其它 Stream 照常前进。

对本阶段而言，理解到这里就够了：HTTP/3 的本质是用 UDP + 用户态的 QUIC，把"可靠、有序、加密"从内核态的 TCP 挪到应用可控的一层，从而绕开 TCP 层的队头阻塞。业务代码层面通常无感，由底层运行时或网关决定。

## 这些错误码和超时到底在说什么？

前面讲的连接模型与超时配置，最终都会体现在你线上遇到的报错里。一张表对上"现象 → 成因"：

| 现象 | 常见成因 | 排查方向 |
|------|----------|----------|
| `ECONNRESET` | 对端突然重置连接（服务端先关了 keep-alive 连接，客户端还在用；或读写时对方已断开） | 核对 `keepAliveTimeout` / `headersTimeout` 是否小于代理超时；确认不是中途崩进程 |
| `socket hang up` | 常见于客户端视角，连接被对方提前关闭（上游 / 服务端意外断开） | 看上游是否崩、是否超时主动断连 |
| `ECONNREFUSED` | 目标地址/端口无进程监听（服务没起、地址端口写错、容器没拉起） | 确认进程在跑、`listen` 端口正确、网络可达 |
| `431 Request Header Fields Too Large` | 请求头过大（典型是 Cookie / 鉴权头累积过多） | 精简请求头；必要时调大服务端 `maxHeaderSize` |
| `502 Bad Gateway` | 网关连不上 / 连上被拒上游 | 后端进程是否挂了、端口是否监听、防火墙 / 鉴权是否拦截 |
| `504 Gateway Timeout` | 网关等到超时，上游仍未响应 | 后端处理慢、`requestTimeout` 过小、慢查询或下游阻塞 |

两个最容易混的：`502` 通常是**网关根本没连上上游**（上游挂了、端口没监听）；`504` 通常是**网关连上了，但上游迟迟不回**（处理超时、数据库慢查询、下游卡住）。这一节与模块二第 04 篇的排障链呼应——遇到网络类报错，先定位"断在哪一跳"，再去看对应的超时与配置。

## 小结

- **HTTP 是 TCP 之上的应用层协议**：约定 Method / URL / Header / Body / Status Code；头部与体靠一个空行分界，体的结束靠 `Content-Length` 或 `Transfer-Encoding: chunked`。
- **用 `node:http` 手写 Server 会撞上的工程问题**：路由表、查询参数、Body 解析、异常兜底、鉴权横切、代码分层——Express / Fastify 就是来收这些的。
- **`req` 是可读流、`res` 是可写流**：请求体要 `chunks[] + Buffer.concat` 累积，响应可多次 `write()` 后用 `end()` 收尾；这个设计的根源在 `net.Socket` 是 Duplex Stream。
- **流式响应与 `Content-Length` 的取舍**：流式响应算不出总长度，改用 `Transfer-Encoding: chunked`；`Content-Length` 取的是字节长度（`'你好'` 是 6 不是 2），算错会截断。
- **Keep-Alive 复用同一条 TCP 连接**：省掉每个请求都建连断连的握手与挥手成本，空闲超过阈值才关闭。
- **三个超时的分工与硬约束**：`keepAliveTimeout` 管空闲关闭、`headersTimeout` 管收齐请求头、`requestTimeout` 管单请求总时限；`headersTimeout` 必须大于 `keepAliveTimeout`，否则竞态丢请求。
- **HTTPS = HTTP over TLS**：TLS 解决加密、身份认证、数据完整性三件事；生产上 TLS 通常在网关终结，Node 服务跑在内网明文 HTTP 上。
- **HTTP/1.1 队头阻塞与 HTTP/2 多路复用**：H1.1 同连接上请求响应串行，浏览器只能多开约 6 条连接绕过；H2 用二进制分帧 + HPACK + 单连接多 Stream 消除应用层队头阻塞。
- **HTTP/3 换成 QUIC（基于 UDP）**：H2 的多个 Stream 仍共享一条 TCP，丢包会带来 TCP 层队头阻塞；QUIC 让各 Stream 相互独立，业务代码通常无感。
- **错误码对上成因**：`502` 是网关没连上上游或拿到非法响应，`504` 是连上了但上游迟迟不回；`431` 是请求头过大，`ECONNRESET` 常来自 Keep-Alive 超时不匹配。

---

## 配套代码

| 文件 | 演示什么 |
| --- | --- |
| `./code/net-lab/src/05-http-server.js` | 原生 `node:http`：路由判断、`req` 收集 Body、`res` 流式写入 |
| `./code/net-lab/src/06-keepalive.js` | Keep-Alive 观测：连接复用与三个超时的实际效果 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[TCP 与 Socket 编程](./01-TCP%20与%20Socket%20编程.md)
- 下一篇：[WebSocket 与 SSE 实时通信](./03-WebSocket%20与%20SSE%20实时通信.md)
