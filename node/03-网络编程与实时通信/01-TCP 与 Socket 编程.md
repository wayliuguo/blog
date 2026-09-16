# TCP 与 Socket 编程

## TCP/IP 分层模型：数据是怎么一层层往下走的？

```
┌──────────────────────────────────────────┐
│ 应用层   HTTP / HTTPS / WebSocket / 你的业务协议  │
├──────────────────────────────────────────┤
│ 传输层   TCP（可靠、有序）   /   UDP（快、不可靠）  │
├──────────────────────────────────────────┤
│ 网络层   IP（主机寻址 + 路由）                    │
├──────────────────────────────────────────┤
│ 网络接口层  Ethernet / Wi-Fi（网卡把 0/1 变电信号） │
└──────────────────────────────────────────┘
```

你写的那句 `GET /users` 属于**应用层**（HTTP 的约定格式）。但 HTTP 自己并不负责把数据可靠地从服务器 A 送到服务器 B——经典情况下它依赖 TCP 把字节流可靠送达，TCP 又依赖 IP 找路，IP 最终通过 Ethernet/Wi-Fi 在网线上跑。所以链路是：

```
GET /users （应用层：HTTP 定义"要什么"）
      │
      ▼
   HTTP  ──定义好报文格式，但不管送达
      ▼
    TCP   ──负责把字节流可靠、有序送达
      ▼
    IP    ──负责寻址 + 路由到目标主机
      ▼
 Network  ──网卡把比特流变成电信号
```

## TCP 到底解决了什么问题？

TCP（Transmission Control Protocol，传输控制协议）在不可靠的 IP 网络之上，主要提供了三种保证：

| 特性 | 含义 | 没有它会怎样 |
|------|------|-------------|
| 面向连接 | 通信前先建立连接（三次握手） | 直接发数据，对方可能根本没准备好 |
| 可靠 | 丢包重传、校验和、确认应答 | 数据丢了你不知道，文件下载残缺 |
| 有序 | 序号保证到达顺序 | 后发的包先到，消息会乱序 |

### 三次握手：为什么不能只有两次？

建立连接需要三次交互：

```
客户端                                  服务端
  │  SYN（我想连你，seq=x）               │
  │ ─────────────────────────────────▶ │
  │                                      │  收到 SYN，分配资源
  │  SYN + ACK（好的，我也行，seq=y）     │
  │ ◀───────────────────────────────── │
  │                                      │
  │  ACK（收到，开始传数据）              │
  │ ─────────────────────────────────▶ │
  │                                      │  连接建立
```

核心原因只有一个：建立连接时，**双方都必须确认"我发得出去、也收得到"这两个方向都通**。

- 两次握手时，服务端收到 SYN 就认为连接已建立并分配资源（缓冲区、端口）。
- 如果客户端的 SYN 是网络上滞留的**旧/重复报文**（比如之前某次连接残留、或网络延迟很久才到），服务端会一直空等直到超时，造成资源浪费——SYN Flood 攻击正是利用这一点。
- 第三次握手让服务端确认"客户端确实收到了我的回应"，才真正放心投入资源。相当于双方都验证了彼此的收发能力。

## TCP 提供的是可靠字节流

你调用 `socket.write('Hello Node.js')`，最终在网络里被处理的不是字符串，而是一个个**字节**：

```
Hello Node.js
      │
      ▼
   Network ── 线缆里流动的是字节：H e l l o (空格) N o d e . j s
      │
      ▼
    Bytes ── 一串没有"消息边界"的 0/1
      │
      ▼
   Buffer ── Node.js 把字节收进 Buffer
      │
      ▼
JavaScript ── 你需要手动 .toString() 才能得到字符串
```

Node.js 网络编程里 `socket.on('data', cb)` 拿到的 `data` 是 **Buffer**，而不是天然的字符串：

```js
socket.on('data', (buffer) => {
  console.log(buffer);                 // <Buffer 48 65 6c 6c 6f ...>
  console.log(buffer.toString('utf8')); // Hello Node.js
});
```

结论：Buffer 是 Node.js 的 JavaScript 世界与底层二进制字节流之间最重要的桥梁。忘掉它，后面所有粘包、编码问题都会踩坑。

## 粘包与拆包：TCP 为什么不保证"你发几次、我收几次"？

客户端连续调用两次发送：

```js
socket.write('hello');
socket.write('world');
```

很多人的第一反应是：服务端会收到两次，第一次 `hello`，第二次 `world`。**但 TCP 不保证这一点。**

```
情况 A（粘包）：  一次 data 事件收到 "helloworld"
情况 B（拆包）：  第一次收到 "hel"  第二次收到 "loworld"
情况 C（混合）：  第一次 "hello" 第二次 "wor" 第三次 "ld"
```

原因只有一句话：TCP 保证的是"可靠、有序"，但它**不知道** `hello` 和 `world` 是两个业务消息；对它来说，那只是同一串字节流里连续的字节。所以：

```
TCP ≠ 消息协议
TCP 只提供"可靠字节流"
消息边界，要你自己定义
```

### 自己定义消息边界：长度前缀方案

最经典的做法是给每条消息加一个固定长度的"头"，先告诉接收方后面有多长：

```
┌──────────────┬───────────────────────┐
│  Length      │        Body            │
│  4 Bytes     │        N Bytes         │
└──────────────┴───────────────────────┘
│← 前 4 字节 →│← 真正的消息内容，长度由头决定 →│
```

接收方先读 4 字节得到 `N`，再精确读取后续 `N` 字节；凑齐一条完整消息才交给业务处理，多余的字节留在缓冲区等下一条。

其它常见边界方案还有：定长（每条消息固定长度、不足补位，极简单但低效）、分隔符（用 `\r\n` 或 `\n` 标记结尾，常见于文本日志、Redis 协议）。为什么长度前缀最通用？因为它不依赖内容里是否"恰好出现分隔符"，也不浪费补齐字节，对二进制数据（图片、压缩包、序列化结构）同样适用。HTTP 之所以"看起来"没有粘包，正是因为它用 `Content-Length` 头（或 chunked 分块）自己定义了边界——你写的 TCP 协议也要自己定义，否则永远不可靠。

## Socket 是什么？

Socket（套接字）可以简单理解为：**应用程序使用操作系统网络能力的接口抽象**，通过它你的 JS 代码就能收发网络字节。

一条 TCP 连接由**四元组**唯一区分：

```
( 源 IP    : 源 Port )   →   ( 目标 IP    : 目标 Port )
  192.168.1.20 : 53241   →   192.168.1.10 : 3000
```

- 服务端通常是固定端口（如 3000），`server.listen(3000)` 背后就是操作系统建立并监听一个 Socket。
- 客户端的端口由操作系统随机分配（上面的 53241），用完后回收复用。
- 同一台机器上，即使目标都是 `:3000`，只要源 IP:源 Port 不同，就是不同的连接——这正是单机支撑"成千上万连接"的原因。

## 用 node:net 写 TCP Server 与 Client

`node:net` 是 Node.js 最底层的网络模块，NestJS/Express/HTTP 最终都建立在它之上。下面给出最小可运行的服务端和客户端。

```js
import net from 'node:net';

const server = net.createServer((socket) => {
  console.log('客户端连接');

  socket.on('data', (buffer) => {
    // 注意：这里的 buffer 是 Buffer，不是字符串
    console.log('收到数据：', buffer.toString('utf8'));
    socket.write('Hello Client');
  });

  socket.on('end', () => {
    console.log('客户端断开');
  });

  socket.on('error', (error) => {
    console.error('连接出错：', error);
  });
});

server.listen(3000, () => {
  console.log('TCP Server running at 3000');
});
```

```js
import net from 'node:net';

const client = net.createConnection(
  { host: '127.0.0.1', port: 3000 },
  () => {
    client.write('Hello Server'); // 发送的是字节流
  },
);

client.on('data', (buffer) => {
  console.log(buffer.toString('utf8'));
});

client.on('error', (error) => {
  console.error('出错：', error);
});
```

下面这条关系链是理解整篇的钥匙：

```
TCP  →  Socket  →  Buffer  →  Stream
（可靠字节流）（OS 接口）（二进制）（数据运输方式）
```

## Socket 为什么又和 Stream 联系起来了？

Node.js 里的 `net.Socket` 本质上是一个 **Duplex Stream（双工流）**——它同时是 Readable 和 Writable。

```
             net.Socket
            ╱            ╲
           ╱              ╲
     Readable          Writable
        │                 │
    socket.on('data')   socket.write()
        │                 │
     接收数据           发送数据
```

- 可读 → `socket.on('data', (chunk) => ...)` 拿到来自对端的字节。
- 可写 → `socket.write(chunk)` 把字节发往对端。

这正是 TCP "全双工"特性的体现：收发可以同时进行、互不阻塞。这也回答了"Stream 为什么不仅用于文件"——你用 `fs.createReadStream()` 读文件是流，网络 Socket 同样是流。理解了 Stream，才算摸到 Node.js 网络 I/O 的门把手。

## 内核与 epoll：谁在替你盯着上万个 Socket？

继续往底层走一层。Node.js 本身**不能直接操作网卡**，中间隔着操作系统内核（Kernel）。真正盯着成千上万个 Socket 的，是内核。

假设你的 Node.js 服务端同时维护 10,000 个 TCP Socket。一个绕不开的问题是：**此刻哪些 Socket 有数据可读？**

最笨的办法是逐个轮询：

```
检查 socket1
检查 socket2
检查 socket3
...
检查 socket10000
（然后无限循环）
```

连接一多，这种忙轮询的效率极低。Linux 提供了 `epoll`：你可以把大量文件描述符交给内核"关注"，有数据时由**内核主动通知**，而不是程序挨个问。

```
 10000 个 Socket
        │  全部交给内核关注
        ▼
      epoll
        │  有数据时
        ▼
  Linux Kernel ──→ 通知你："Socket 583 有数据了"
```

## libuv 为什么存在？

不同操作系统提供的网络 I/O 机制并不一样：

```
   Node.js
      │
      ▼
    libuv
      │
  ┌───┼──────────┐
  ▼       ▼        ▼
Linux   macOS    Windows
  ▼       ▼        ▼
epoll   kqueue     IOCP
```

而 Node.js 需要跨平台，不可能让你写三套代码。libuv 把这层差异抽象掉，统一成一套异步接口。所以我们写 `socket.on('data', callback)` 时，完全不需要关心当前系统用的是 epoll、kqueue 还是 IOCP——libuv 在底下替你切换。

## 单线程为什么能扛万连接？

现在可以正面回答那个经典问题：Node.js 单线程，为什么能处理大量并发连接？

关键在于：所谓"单线程"，指的是 JavaScript 默认主要跑在一个**主线程**，**并不是**所有网络工作都由它自己完成。

```
 10000 Clients
      │
      ▼
 Operating System  （内核盯着所有 Socket）
      │
      ▼
 epoll / kqueue / IOCP  （就绪了才通知）
      │
      ▼
    libuv  （跨平台抽象 + 事件派发）
      │
      ▼
  Event Loop  （主线程的事件循环）
      │
      ▼
 JavaScript Callback  （只处理"已经就绪"的事件）
```

大量 Socket 的等待和事件通知交给操作系统与 libuv，JavaScript 主线程只负责处理**已经就绪**的事件。等待不占用主线程，所以单线程也能扛住海量连接。

## 误区：网络 I/O 与 libuv 线程池不要混淆

这是学习 libuv 后最容易产生的误解：很多人以为"异步任务 → libuv 线程池"。**并不是所有异步操作都进线程池。**

典型网络 Socket I/O 依赖操作系统提供的事件通知机制，并不占用线程：

```
        Async
         │
   ┌─────┴─────────┐
   ▼               ▼
Network I/O      某些其他任务
   │               │
   ▼               ▼
  OS            Thread Pool
(epoll等)     (libuv 线程池)
```

- **网络 I/O**（`net` / `http` / `https` 连接与收发）走操作系统事件通知，由事件循环在主线程回调，全程无线程切换。
- 只有**无法用同类异步机制完成**的工作，libuv 才可能丢进线程池，例如：部分文件系统操作、部分 DNS 解析、`crypto`、`zlib`。

所以不要记成"异步 = 线程池"。关于哪些 I/O 会进线程池、线程池默认几个线程，见第 03 篇《事件循环：单线程为什么能扛并发》。

## 网络侧的背压：为什么管道另一端很慢会撑爆内存？

回到 Stream。假设把一个大文件读出来通过网络发出去：

```js
fs.createReadStream('./big-file.zip').pipe(socket);
```

如果磁盘读取速度是 `500 MB/s`，而客户端网络只能收 `10 MB/s`，不做任何控制会怎样？

```
Disk（生产 500 MB/s）
   │
   ▼
 Memory（数据越堆越多，一路上涨）
   │
   ▼
 Network（消费只有 10 MB/s）
   │
   ▼
  OOM（内存耗尽，进程崩溃）
```

生产速度远快于消费速度，数据会不断积压在内存里，最终内存涨爆。

`Writable` 提供了背压机制来化解：`socket.write(buffer)` 返回一个 **boolean**。

```js
const canContinue = socket.write(buffer);
// canContinue === false 表示内部缓冲已达压力阈值
```

返回 `false` 意味着 Writable 内部缓冲已经积压到阈值，**此时不应继续疯写**，而应等待 `'drain'` 事件——它表示缓冲已排空，可以继续写：

```js
socket.write(buffer);
socket.on('drain', () => {
  // 缓冲排空，可以继续生产
});
```

整个模型的闭环是这样的：

```
Producer ──▶ Writable Buffer ──▶ Consumer
   │              │
   │        消费慢 → 缓冲到阈值
   │              │
   │         Producer 暂停（write 返回 false）
   │              │
   │         Consumer 慢慢消费
   │              │
   │         drain 事件触发
   ▼              │
Producer 继续生产 ◀─┘
```

这就是背压（Backpressure）：上下游速度不匹配时，下游反向"压"住上游，避免内存被冲垮。

## 为什么推荐 pipe / pipeline？

上面的背压逻辑如果自己写，很容易写错：

```js
// 反例：丢掉了背压
readStream.on('data', (chunk) => {
  socket.write(chunk); // write 返回 false 也不管，照样写
});
```

而 `pipe()` 会**内部协调**生产者与消费者的速度：下游（Socket）消费跟不上，就自动暂停上游读取；等 `drain` 后再继续。

```js
readStream.pipe(socket); // 自带背压协调
```

更进一步，**生产代码更推荐 `pipeline()`**：它在出错时能统一销毁整条链路（某个环节出错，上下游一起清理），避免资源泄漏。`pipe` 出错时链路不会自动销毁，需要你手动处理。关于 `pipeline` 的用法与边界处理，详见第 06 篇《Buffer 与 Stream》。

TCP 只给你一条可靠字节流，那"我要 `GET /users`"这层语义该由谁来定义？答案就是下一篇的 HTTP——它在 TCP 之上约定好了请求行、头、体的格式，让字节流变成可读的请求与响应。

## 小结

- **TCP/IP 分层模型与"按层排障"的思路**
  - **四层结构**：应用层（HTTP / HTTPS / WebSocket / 你的业务协议）→ 传输层（TCP 可靠有序 / UDP 快但不可靠）→ 网络层（IP 主机寻址 + 路由）→ 网络接口层（Ethernet / Wi-Fi，网卡把 0/1 变电信号）
  - **一次请求的下降链路**：`GET /users` 属于应用层，HTTP 定义好报文格式但不管送达 → TCP 负责把字节流可靠、有序送达 → IP 负责寻址与路由到目标主机 → 网卡把比特流变成电信号
  - **价值在定位问题**：每层只解决一件事——HTTP 定义报文却不管送达、TCP 保证可靠有序却不管语义；排查时先确定故障落在哪一层，再往下钻
- **TCP 的三重保证与三次握手**
  1. **面向连接**：通信前先建立连接（三次握手）；没有它就直接发数据，对方可能根本没准备好
  2. **可靠**：丢包重传、校验和、确认应答；没有它数据丢了你不知道，文件下载会残缺
  3. **有序**：序号保证到达顺序；没有它后发的包先到，消息会乱序
  - **为什么不能省成两次握手**：两次时服务端收到 `SYN` 就认为连接已建立并分配资源（缓冲区、端口），一旦这个 `SYN` 是网络上滞留的旧 / 重复报文，服务端会一直空等直到超时、造成资源浪费——SYN Flood 攻击正是利用这一点；第三次握手让服务端确认"客户端确实收到了我的回应"，双方才算都验证了收发能力
- **TCP 提供的是可靠字节流，不是消息流**
  - **拿到的是 `Buffer`**：`socket.write('Hello Node.js')` 在网络里流动的是字节，`socket.on('data', cb)` 的 `data` 是 `Buffer`（形如 `<Buffer 48 65 6c 6c 6f ...>`），要手动 `buffer.toString('utf8')` 才是字符串——`Buffer` 是 JS 世界与底层二进制字节流之间最重要的桥梁
  - **粘包 / 拆包**：`write('hello')` + `write('world')` 可能粘成一次 `data` 收到 `helloworld`，也可能拆成 `hel` + `loworld`，还可能混合分成三次；因为 TCP 只保证"可靠、有序"，它**不知道**这两段是两个业务消息——消息边界要你自己定义
  - **边界方案**：最经典也最通用的是**长度前缀**（`Length(4 Bytes) + Body(N Bytes)`），接收方先读 4 字节得到 `N`、再精确读 `N` 字节，凑齐一条才交给业务、多余字节留在缓冲区等下一条；它不依赖内容里是否"恰好出现分隔符"，也不浪费补齐字节，对二进制数据同样适用。其它方案还有定长（极简单但低效）与分隔符（`\n` / `\r\n`，常见于文本日志、Redis 协议）；HTTP 之所以"看起来"没有粘包，正是因为用 `Content-Length`（或 chunked 分块）自己定义了边界
- **Socket：操作系统网络能力的接口抽象**
  - **四元组唯一区分连接**：`(源 IP : 源 Port) → (目标 IP : 目标 Port)`；服务端通常固定端口（`server.listen(3000)` 背后就是内核建立并监听一个 Socket），客户端端口由内核随机分配（如 53241）、用完回收复用——所以同一台机器上目标都是 `:3000`，只要源端口不同就是不同连接，这正是单机支撑"成千上万连接"的原因
  - **`node:net` 是最底层入口**：`net.createServer` / `net.createConnection` 之上才轮到 NestJS / Express / HTTP；服务端要处理 `data`（Buffer）、`end`（客户端断开）、`error` 三类事件
  - **`net.Socket` 是 Duplex Stream（双工流）**：同时是 Readable（`socket.on('data')` 接收）与 Writable（`socket.write()` 发送），收发可同时进行、互不阻塞——这是 TCP 全双工的体现，也是"Stream 不只用于文件"的由来
  - **关系链**：`TCP → Socket → Buffer → Stream`，即"可靠字节流 → 操作系统接口 → 二进制 → 数据运输方式"，这条链是理解网络编程的钥匙
- **内核、`epoll` 与 libuv 的分工**
  - **盯着 Socket 的是内核**：Node.js 不能直接操作网卡，中间隔着操作系统内核；同时维护 10,000 个 Socket 时逐个忙轮询效率极低，Linux 的 `epoll` 让你把大量文件描述符交给内核"关注"，有数据时由**内核主动通知**（"Socket 583 有数据了"）
  - **libuv 抹平平台差异**：Linux 用 `epoll`、macOS 用 `kqueue`、Windows 用 `IOCP`，libuv 把它们抽象成统一的一套异步接口，所以写 `socket.on('data', callback)` 完全不需要关心当前系统用哪套机制
  - **单线程扛万连接的关键是"等待不占线程"**：10000 Clients → 内核盯着所有 Socket → `epoll` / `kqueue` / `IOCP` 就绪才通知 → libuv 做跨平台抽象与事件派发 → Event Loop → JavaScript Callback 只处理**已经就绪**的事件
  - **网络 I/O 不走 libuv 线程池**：`net` / `http` / `https` 的连接与收发依赖操作系统事件通知机制，由事件循环在主线程回调，全程无线程切换；只有**无法用同类异步机制完成**的工作才可能被丢进线程池，如部分文件系统操作、部分 DNS 解析、`crypto`、`zlib`——不要记成"异步 = 线程池"
- **网络侧的背压：`write()` 返回值与 `'drain'`**
  - **速度不匹配会撑爆内存**：磁盘读取 `500 MB/s` 而客户端网络只能收 `10 MB/s` 时，生产远快于消费，数据不断积压在内存里一路上涨，最终 OOM
  - **背压机制**：`socket.write(buffer)` 返回一个 **boolean**，返回 `false` 表示 Writable 内部缓冲已达压力阈值，此时**不应继续疯写**，而应等 `'drain'` 事件（缓冲已排空）再继续写；闭环是"消费慢 → 缓冲到阈值 → Producer 暂停（`write` 返回 `false`）→ Consumer 慢慢消费 → `drain` 触发 → Producer 继续生产"
- **`pipe` 与 `pipeline`：别自己接背压**
  - **反例**：`readStream.on('data', (chunk) => socket.write(chunk))` 丢掉了背压——`write` 返回 `false` 也不管，照样写
  - **`pipe()`**：内部协调生产者与消费者的速度，下游 Socket 消费跟不上就自动暂停上游读取，等 `drain` 后再继续
  - **`pipeline()`**：生产代码更推荐——它在出错时能**统一销毁整条链路**（某个环节出错、上下游一起清理），避免资源泄漏；`pipe` 出错时链路不会自动销毁，需要你手动处理

## 配套代码

| 文件 | 演示什么 |
| --- | --- |
| `./code/net-lab/src/01-tcp-server.js` | 用 `node:net` 写最小 TCP Server，`data` 事件收到的是 Buffer |
| `./code/net-lab/src/02-tcp-client.js` | TCP 客户端：`createConnection` + `write` + 接收响应 |
| `./code/net-lab/src/03-sticky-packet.js` | 复现粘包：两次 `write` 被合并成一次 `data` |
| `./code/net-lab/src/04-protocol-server.js` | 自定义分包协议服务端：`Length(4B) + Body(NB)` |
| `./code/net-lab/src/04-protocol-client.js` | 自定义分包协议客户端：按长度边界正确切分消息 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[导读与全景图：网络层为什么在这里](./00-导读与全景图.md)
- 下一篇：[HTTP 与 HTTPS 深入](./02-HTTP%20与%20HTTPS%20深入.md)
