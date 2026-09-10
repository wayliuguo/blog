# TCP 与 Socket 编程

> 承上：[导读与全景图：网络层为什么在这里](./00-导读与全景图) —— 先在导读里拿到那张全景图，本篇把其中的"HTTP → TCP"这一跳拆开
> 启下：[HTTP 与 HTTPS 深入](./02-HTTP%20与%20HTTPS%20深入) —— 能用手写 node:http 读出请求体（chunks + Buffer.concat），并解释 ECONNRESET 与 Keep-Alive 的关系
> 在全景图里：传输层。全景图从浏览器往下数，"HTTP → TCP" 这一跳就是本篇的内容；再往下是 Socket 与内核（epoll 等机制已移至模块一《事件循环》）。

---

## TCP/IP 分层模型

网络协议按职责分层，每一层只解决一类问题：

| 层 | 协议代表 | 解决什么问题 |
|----|---------|-------------|
| 应用层 | HTTP、WebSocket、DNS、FTP | 数据"是什么、怎么用"（资源、消息格式） |
| 传输层 | TCP、UDP | 端到端可靠/不可靠传输（端口寻址、流量控制） |
| 网络层 | IP | 主机到主机的寻址与路由（IP 地址、跨网段） |
| 网络接口层 | Ethernet、Wi-Fi | 相邻设备间比特流传输（MAC 地址、网卡驱动） |

回到导读里的全景图：HTTP 跑在应用层，它依赖传输层的 TCP，TCP 依赖网络层的 IP，IP 最终通过 Ethernet/Wi-Fi 在网线上跑。

```txt
应用层    HTTP / WebSocket / 你的业务协议
─────────────────────────────────────────
传输层    TCP（可靠、有序）  /  UDP（快、不可靠）
─────────────────────────────────────────
网络层    IP（寻址 + 路由）
─────────────────────────────────────────
网络接口层  Ethernet / Wi-Fi（网卡把 0/1 变成电信号）
```

> 关键结论：HTTP 不是一个"独立在网络上跑"的协议，它只是 TCP 之上的一段"约定好的文本格式"。WebSocket 同理——它建立在 TCP 之上，而不是替代 TCP。

---

## TCP 解决了什么问题

TCP（Transmission Control Protocol）在不可靠的 IP 网络之上，提供了三种保证：

| 特性 | 含义 | 没有它会怎样 |
|------|------|-------------|
| 面向连接 | 通信前先建立连接（三次握手） | 直接发数据，对方可能根本没准备好 |
| 可靠 | 丢包重传、校验和、确认应答 | 数据丢了你不知道，文件下载残缺 |
| 有序 | 序号保证到达顺序 | 后发的包先到，消息乱序 |

### 三次握手：为什么不是两次

建立连接需要三次交互：

```txt
客户端                              服务端
  │  SYN（我想连你，seq=x）            │
  │ ───────────────────────────────▶ │
  │                                   │  收到 SYN，分配资源
  │  SYN + ACK（好的，我也行，seq=y）  │
  │ ◀─────────────────────────────── │
  │                                   │
  │  ACK（收到，开始传数据）           │
  │ ───────────────────────────────▶ │
  │                                   │  连接建立
```

为什么不能两次握手？

- 两次握手时，服务端收到 SYN 就认为连接已建立并分配资源（缓冲区、端口）。
- 如果客户端的 SYN 是**迟到/重复的旧报文**（网络里滞留过），服务端会一直空等，直到超时，造成资源浪费（SYN Flood 攻击正是利用这一点）。
- 第三次握手让服务端确认"客户端确实收到了我的回应"，才真正分配资源。相当于双方都确认了彼此的收发能力。

> 心智模型：三次握手 = "你听得到吗？/ 听得到，你呢？/ 我也听得到，开聊"。缺了第三次，服务端不确定客户端是否在线，不敢轻易投入资源。

---

## TCP 是"字节流"，不是"消息协议"

这是初学者最容易踩的坑：**TCP 不保证你 `send` 一次，对方 `recv` 一次**。

### Buffer 与粘包/拆包

Node.js 里，`socket.on('data', chunk)` 收到的 `chunk` 是一个 `Buffer`，而不是你发送的"完整字符串"。TCP 只负责把字节流可靠、有序地送达，它不认识你的"消息边界"。

```txt
发送方连续发送：  "hello"          "world"
                    ↓                ↓
TCP 字节流：      h e l l o w o r l d   （连在一起）
                    ↓
接收方可能收到：
  情况 A（粘包）： 一次收到 "helloworld"
  情况 B（拆包）： 第一次 "hel"  第二次 "loworld"
  情况 C（混合）： 第一次 "hello" 第二次 "wor" 第三次 "ld"
```

这就是**粘包 / 拆包**问题。它会让 `JSON.parse(chunk.toString())` 直接报错——因为半条消息根本不是合法 JSON。

### 自定义协议来分包

解决思路：在字节流里自己定义"消息边界"。最常见的是 `长度 + 正文` 方案：

```txt
┌────────────┬───────────────────────┐
│ Length(4B) │        Body           │
│  整数 N    │      N 字节的内容      │
└────────────┴───────────────────────┘
```

接收方先读 4 字节得到 Body 长度 N，再精确读取后续 N 字节，凑齐一条完整消息才交给业务处理，多余的留在缓冲区等下一条。

| 分包方案 | 做法 | 适用场景 |
|---------|------|---------|
| 长度前缀 | 先发 N（定长），再发 N 字节 Body | 二进制协议、RPC（最主流） |
| 分隔符 | 用 `\n` 或 `\r\n` 作为消息结尾 | 文本日志、Redis 协议 |
| 定长 | 每条消息固定长度，不足补位 | 极简单、低效 |

> 关键结论：HTTP 之所以"看起来"没有粘包问题，是因为它自己定义了边界（Content-Length 头 或 chunked 分块）。你写的 TCP 协议也要自己定义边界，否则永远不可靠。

---

## Socket 是什么

Socket（套接字）是**应用程序使用操作系统网络能力的抽象接口**。你可以把它理解成"操作系统开给你的一扇门"——通过这扇门，你的 JS 代码能收发网络字节。

一条 TCP 连接由"四元组"唯一确定：

```txt
(源 IP : 源 Port)  →  (目标 IP : 目标 Port)
  客户端 192.168.1.2:51234  →  服务端 10.0.0.1:8080
```

- 服务端通常是固定端口（如 8080），等待连接。
- 客户端的端口由操作系统随机分配（51234），用完后回收复用。
- 同一台机器上，即使目标端口都是 8080，只要源 IP:源 Port 不同，就是不同的连接——这正是单机支撑"成千上万连接"的原因。

> 心智模型：Port 像大楼的房间号，IP 像大楼地址。Socket 就是"你与大楼某个房间之间那条已经接通的电话线"。

---

## 用 node:net 写 TCP Server / Client

`node:net` 是 Node.js 最底层的网络模块，NestJS/Express/HTTP 最终都建立在其之上。下面实现一个支持"长度前缀分包"的回显服务。

### TCP Server

```js
// server.js
const net = require('node:net');
const { EventEmitter } = require('node:events');

// 简单的协议：4 字节大端整数表示 Body 长度 + Body
const HEADER_LEN = 4;

class Connection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buffer = Buffer.alloc(0); // 累积尚未处理完的字节

    socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.parse();
    });

    socket.on('close', () => this.emit('close'));
    socket.on('error', (err) => this.emit('error', err));
  }

  // 不断从 buffer 中拆出完整消息
  parse() {
    while (this.buffer.length >= HEADER_LEN) {
      const bodyLen = this.buffer.readUInt32BE(0);
      const need = HEADER_LEN + bodyLen;
      if (this.buffer.length < need) return; // 还没收齐，等下一批
      const body = this.buffer.subarray(HEADER_LEN, need);
      this.buffer = this.buffer.subarray(need); // 去掉已消费部分
      this.emit('message', body); // 抛出一条完整消息
    }
  }

  send(data) {
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const header = Buffer.alloc(HEADER_LEN);
    header.writeUInt32BE(body.length, 0);
    this.socket.write(Buffer.concat([header, body]));
  }
}

const server = net.createServer((socket) => {
  const conn = new Connection(socket);

  console.log('客户端连入：', socket.remoteAddress, socket.remotePort);

  conn.on('message', (body) => {
    console.log('收到：', body.toString());
    conn.send('echo: ' + body.toString()); // 回显
  });

  conn.on('close', () => console.log('客户端断开'));
  conn.on('error', (err) => console.error('连接出错', err));
});

server.listen(8080, () => console.log('TCP Server 监听 8080'));
```

> 生产代码建议用 TypeScript 并配合单测覆盖分包边界（半包、粘包、跨包消息）。

### TCP Client

```js
// client.js
const net = require('node:net');

const socket = net.createConnection({ host: '127.0.0.1', port: 8080 }, () => {
  console.log('已连接');
  // 连续发送两条消息，演示粘包场景
  socket.write(encode('hello'));
  socket.write(encode('world'));
});

function encode(str) {
  const body = Buffer.from(str);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

// 客户端也要做分包，否则可能一次收到 "helloworld"
let buf = Buffer.alloc(0);
socket.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const len = buf.readUInt32BE(0);
    if (buf.length < 4 + len) return;
    const body = buf.subarray(4, 4 + len).toString();
    buf = buf.subarray(4 + len);
    console.log('服务端回：', body);
  }
});

socket.on('close', () => console.log('断开'));
```

运行：

```bash
node server.js   # 终端 1
node client.js   # 终端 2
```

### net.Socket 本质是 Duplex Stream

`net.Socket` 同时实现了 Readable 和 Writable 接口，是一个**双工流（Duplex Stream）**——既可以 `write()` 写入（发往对方），也可以 `on('data')` 读取（来自对方）。这正是 TCP"全双工"特性的体现：收发可以同时进行，互不阻塞。

```js
// net.Socket 既是可读流也是可写流
socket.write('hi');          // Writable：向对端发送
socket.on('data', (b) => {}); // Readable：接收对端数据
socket.pipe(anotherSocket); // 因为是流，可以直接管道转发
```

> 关键结论：你在第 2 篇会看到 `req` / `res`，它们也都是流。理解 Stream 是理解 Node 网络 I/O 的钥匙，而 net.Socket 是这一切的起点。

---

## 内核与 libuv：只留结论

网络 I/O 真正"扛并发"的底层，是操作系统提供的 I/O 多路复用机制：

- epoll（Linux）/ kqueue（macOS、BSD）/ IOCP（Windows）解决的是同一件事：**1 万个 socket 不要靠忙轮询去挨个问"有数据吗"**，而是让内核在 socket 就绪时主动通知，进程只处理真正就绪的那几个。
- libuv 的存在，是把上述三套各不相同的 OS 机制，统一封装成一套一致的异步接口。于是 Node.js 一份代码，在 Linux 走 epoll、macOS 走 kqueue、Windows 走 IOCP，开发者完全无感。

> 这一段为什么排在这里、epoll 具体怎么通知就绪 fd，已在模块一《[事件循环：单线程为什么能扛并发](../01-运行环境/03-事件循环)》里讲透；模块二只负责用它们解释网络连接。

---

## 网络 I/O 通常不走 libuv 线程池

网络 I/O（TCP/UDP/HTTP 连接与收发）走的是 OS 异步机制，内核通过 epoll/kqueue 通知就绪后由事件循环在主线程回调，全程无线程切换。需要进 libuv 线程池的是**文件 I/O、DNS 解析、crypto 计算**这类阻塞或 CPU 密集操作。

> 哪些 I/O 会进 libuv 线程池、线程池默认几个线程，已在模块一《[事件循环：单线程为什么能扛并发](../01-运行环境/03-事件循环)》的 `## 哪些 I/O 会进 libuv 线程池` 一节讲透；调大 `UV_THREADPOOL_SIZE` 不会提升 HTTP 吞吐。

---

## 面试题

### Q1: TCP 为什么是三次握手而不是两次？

两次握手时服务端收到 SYN 就分配资源，若 SYN 是网络上滞留的旧报文，服务端会空等造成资源浪费（SYN Flood）。第三次握手让服务端确认客户端确实在线后才分配资源，双方都验证了彼此收发能力。

### Q2: 什么是粘包/拆包？怎么解决？

TCP 是字节流，不保证 send 与 recv 次数对应，"hello"+"world"可能被合并或拆开。解决方法是自定义消息边界，如长度前缀（4 字节 N + N 字节 Body）、分隔符（\n）或定长，接收方按规则拼出完整消息。

### Q3: net.Socket 是什么？为什么说是 Duplex Stream？

它是应用层使用 OS 网络能力的抽象，代表一条 TCP 连接。它同时实现 Readable 与 Writable，既可读（on('data') 收）也可写（write 发），对应 TCP 全双工，因此是双工流。

### Q4: epoll 解决了什么？libuv 又解决了什么？

epoll 让内核在 socket 就绪时主动通知，避免遍历上万 socket 的忙轮询，使单进程支撑海量连接。libuv 在 epoll/kqueue/IOCP 之上做跨平台统一抽象，让 Node.js 一套代码各 OS 通用。

### Q5: 网络 I/O 走 libuv 线程池吗？为什么？

不走。网络 I/O 是异步事件驱动，内核通过 epoll 通知就绪后由事件循环在主线程回调，无线程切换。libuv 线程池只兜底文件 I/O、DNS 解析、crypto 等阻塞/CPU 密集操作。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/net-lab`。

| 文件 | 演示什么 |
| --- | --- |
| `01-tcp-server.js` | net.createServer 与连接、数据事件 |
| `02-tcp-client.js` | 客户端写入与字节流视角 |
| `03-sticky-packet.js` | 粘包复现实验 |
| `04-protocol-server.js` | Length(4B) + Body 分包协议服务端 |
| `04-protocol-client.js` | 自定义协议客户端 |

运行方式见 `net-lab/README.md`。

---

## 参考

- 上一篇：[导读与全景图：网络层为什么在这里](./00-导读与全景图)
- 下一篇：[HTTP 与 HTTPS 深入](./02-HTTP%20与%20HTTPS%20深入)
