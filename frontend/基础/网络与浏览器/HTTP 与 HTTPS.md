# HTTP 与 HTTPS

HTTP（HyperText Transfer Protocol，超文本传输协议）是浏览器与服务器之间互动的基础语言。无论你写的是页面、接口还是静态资源，最终都要通过 HTTP 进行传输。而 HTTPS 则是在其上叠加了一层加密保护，是现代 Web 的默认标配。

这篇文章我们从 HTTP 的基础认识讲起，梳理请求方法、状态码、缓存机制，再沿着 HTTP/1.1 → HTTP/2 → HTTP/3 的演进脉络，最后揭开 HTTPS/TLS 的加密原理与 DNS 的解析流程。

## 一、HTTP 基础认识

### 1. HTTP 是什么

**HTTP（HyperText Transfer Protocol）** 是建立在 TCP/IP 之上的**应用层**协议，定义了客户端（浏览器）与服务器之间如何"请求"和"响应"。它由 Tim Berners-Lee 在 1989 年发明，最初只用于传输超文本（HTML），如今几乎承载了全网的业务数据。

### 2. HTTP 的特点

- **无状态（Stateless）**：每个请求都是独立的，服务器不记忆客户端之前的请求。服务器无法仅凭连接判断"你是谁"。
- 无状态的缓解方案：通过 **Cookie / Session / Token** 在请求中显式携带身份信息，从而人为地模拟"有状态"。
- **基于请求-响应模型**：客户端发起请求，服务端返回响应，一次完整的交互由此完成。
- **明文传输**（HTTP 早期版本）：数据以明文传输，可被窃听、篡改，因此才有 HTTPS 的诞生。

### 3. 报文结构

一次 HTTP 交互由**请求报文**和**响应报文**组成。两者结构高度对称，都包含三个部分：

> 示意片段（无配套脚本）

```
请求报文：
   请求行     METHOD 路径(URL) 协议版本\r\n
   请求头     Header: Value\r\n
   （空行）   \r\n
   请求体     Body（请求方法如 POST/PUT 才可能携带）
```

> 示意片段（无配套脚本）

```
响应报文：
   状态行     协议版本 状态码 状态描述\r\n
   响应头     Header: Value\r\n
   （空行）   \r\n
   响应体     Body（HTML、JSON、图片流等）
```

一个真实的请求报文示例：

> 示意片段（无配套脚本）

```http
POST /api/login HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 31
User-Agent: Mozilla/5.0 ...
Cookie: session=abc123

{"username":"jack","password":"***"}
```

响应报文示例：

> 示意片段（无配套脚本）

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=3600
Content-Length: 24

{"code":0,"data":"logged"}
```

### 4. 常见的请求头与响应头

| 方向 | 头部 | 含义 |
| --- | --- | --- |
| 请求 | `Host` | 目标主机名与端口 |
| 请求 | `User-Agent` | 客户端浏览器/环境标识 |
| 请求 | `Cookie` | 携带的身份凭证 |
| 请求 | `Content-Type` | 请求体的媒体类型（`application/json` 等） |
| 请求 | `Accept` | 期望返回的内容类型 |
| 响应 | `Content-Type` | 响应体的媒体类型 |
| 响应 | `Content-Length` | 响应体的字节长度 |
| 响应 | `Cache-Control` | 缓存策略 |
| 响应 | `Set-Cookie` | 让浏览器写入一个 Cookie |
| 响应 | `Location` | 配合 3xx 重定向使用 |

## 二、请求方法（Request Method）

HTTP 定义了若干"动词"来表明请求的意图。最常用的是 `GET` 和 `POST`，此外还有 `PUT`、`DELETE`、`PATCH`、`HEAD`、`OPTIONS` 等。

### 1. 常用方法一览

| 方法 | 用途 | 是否有请求体 | 幂等性 |
| --- | --- | --- | --- |
| `GET` | 获取资源 | 无 | 幂等 |
| `POST` | 提交/创建资源 | 有 | 非幂等 |
| `PUT` | 整体替换资源 | 有 | 幂等 |
| `PATCH` | 局部更新资源 | 有 | 非幂等 |
| `DELETE` | 删除资源 | 通常无 | 幂等 |
| `HEAD` | 只获取响应头，不返回响应体 | 无 | 幂等 |
| `OPTIONS` | 询问服务器支持的请求方法（常用于跨域预检） | 无 | 幂等 |

### 2. 幂等性（Idempotency）

**幂等**指无论执行一次还是执行多次，产生的结果都是相同的，且不会产生副作用叠加。

- `GET` 多次请求返回相同的资源，是幂等的。
- `PUT` 把资源整体覆盖为同一个新值，重复执行结果一致，是幂等的。
- `DELETE` 删除一个已不存在的资源，重复删除结果一样，是幂等的。
- `POST` 每次提交都会新增一条数据，重复提交会产生多份记录，因此**非幂等**。
- `PATCH` 语义上按补丁更新，重复应用不一定等价，通常视为非幂等。

**为什么关注幂等性？** 因为网络可能超时重试、用户可能重复点击。诚实地区分方法语义，能帮助网关重试、缓存系统与接口设计做出正确决策。

### 3. GET 与 POST 的区别

| 对比项 | GET | POST |
| --- | --- | --- |
| 语义 | 取数据，无副作用 | 提交数据，有副作用 |
| 参数位置 | URL 查询串 | 请求体 |
| 数据可见性 | 可见于地址栏、日志 | 不在 URL 中 |
| 缓存 | 默认可缓存 | 默认不可缓存 |
| 长度限制 | 受 URL 长度限制 | 理论上只受服务器配置限制 |
| 安全 | 参数易被浏览器历史/代理记录 | 相对不易泄露（但都是明文，除非走 HTTPS） |

> 注意：GET 和 POST 都不"安全"（机密性由 HTTPS 提供）。它们唯一的本质差异是**语义**，其余都是浏览器/框架的默认行为约定。

## 三、状态码分类与常见状态码

服务器通过**状态码**告诉客户端请求的结果。状态码为三位数字，按首位数字分为五类：

| 分类 | 首位 | 含义 |
| --- | --- | --- |
| 信息响应 | 1xx | 请求已收到，继续处理（例如 `101` 切换协议） |
| 成功 | 2xx | 请求成功处理 |
| 重定向 | 3xx | 需要进一步操作才能完成请求 |
| 客户端错误 | 4xx | 请求有误，责任在客户端 |
| 服务端错误 | 5xx | 服务器处理出错，责任在服务端 |

### 常见状态码速查

| 状态码 | 说明 |
| --- | --- |
| `200 OK` | 请求成功，正常返回 |
| `201 Created` | 已创建新资源（常用于 POST） |
| `204 No Content` | 成功但无内容返回（如 DELETE 成功） |
| `301 Moved Permanently` | 永久重定向，搜索引擎会更新链接 |
| `302 Found` | 临时重定向 |
| `304 Not Modified` | 协商缓存命中，服务端告知"资源未变，用缓存" |
| `400 Bad Request` | 请求语法或参数错误 |
| `401 Unauthorized` | 未认证，需要登录 |
| `403 Forbidden` | 已认证但无权限，拒绝访问 |
| `404 Not Found` | 资源不存在 |
| `405 Method Not Allowed` | 方法不被允许 |
| `429 Too Many Requests` | 请求过于频繁，触发限流 |
| `500 Internal Server Error` | 服务器内部错误 |
| `502 Bad Gateway` | 网关/代理收到上游无效响应 |
| `503 Service Unavailable` | 服务暂时不可用（如过载、维护） |
| `504 Gateway Timeout` | 网关/代理请求上游超时 |

要点：`301` 与 `302` 的区别在于**是否永久**；`401` 与 `403` 的区别在于**有没有登录（认证）** 与 **有没有权限（授权）**。

## 四、HTTP 缓存

缓存是提升性能、减少带宽最有效的手段之一。浏览器缓存按属性分为**强缓存**与**协商缓存**：强缓存命中直接用本地副本、不发请求；协商缓存需带条件到服务器确认，服务器返回 `304` 时再使用副本。

### 1. 强缓存（Cache-Control / Expires）

命中强缓存时，浏览器**不发任何网络请求**，直接使用本地缓存，状态码通常显示为 `200 (from disk cache)` 或 `200 (from memory cache)`。

- **Expires**（HTTP/1.0）：使用**绝对时间**，如 `Expires: Wed, 21 Oct 2026 07:28:00 GMT`。缺点是依赖客户端时钟，客户端调时间就会失准。
- **Cache-Control**（HTTP/1.1，推荐）：使用**相对时间**或其他指令，如 `Cache-Control: max-age=3600`。

常用指令：

> 示意片段（无配套脚本）

```http
Cache-Control: no-cache    # 协商缓存：每次使用前都去服务器确认
Cache-Control: no-store    # 完全禁止缓存（敏感数据）
Cache-Control: max-age=3600  # 强缓存 3600 秒
Cache-Control: public      # 可被任何缓存（含代理）缓存
Cache-Control: private     # 只能被浏览器私有缓存
```

优先级：`Cache-Control` 优先于 `Expires`，两者同时存在时以 `Cache-Control` 为准。

### 2. 协商缓存（Last-Modified / ETag）

命中协商缓存时，浏览器会**携带上次的验证信息**发起一个带条件请求，服务器返回 `304 Not Modified`，浏览器再使用缓存副本；若资源已变化，服务器返回 `200` 和完整的新资源。

有两对字段：

- **Last-Modified / If-Modified-Since**（基于时间）：
  - 首次响应带 `Last-Modified: 2026-06-01T10:00:00Z`（资源最后修改时间）。
  - 后续请求带 `If-Modified-Since: 上次的时间`，服务器比较时间决定 304 或新资源。
  - 局限：时间精度只有秒级；内容修改但时间未变时会误判。

> 示意片段（无配套脚本）

```http
# 首次响应
HTTP/1.1 200 OK
Last-Modified: 2026-06-01T10:00:00Z

# 后续请求
GET /app.js HTTP/1.1
If-Modified-Since: 2026-06-01T10:00:00Z
```

- **ETag / If-None-Match**（基于内容指纹，更精确）：
  - 首次响应带 `ETag: "abc123"`（内容的哈希/版本指纹）。
  - 后续请求带 `If-None-Match: "abc123"`，服务器比较指纹决定 304 或新资源。

> 示意片段（无配套脚本）

```http
# 首次响应
HTTP/1.1 200 OK
ETag: "5f8c2a-19d4"

# 后续请求
GET /app.js HTTP/1.1
If-None-Match: "5f8c2a-19d4"
```

优先级：**ETag 优先于 Last-Modified**，因为指纹比时间更精确。

### 3. 缓存决策流程总结

> 示意片段（无配套脚本）

```
① 发起请求
   │
   ▼
② 检查强缓存（Cache-Control/Expires）
   ├── 命中 ──► 直接使用本地副本，不发请求 ✓
   └── 未命中
         ▼
③ 携带条件（If-None-Match / If-Modified-Since）发起协商请求
   ├── 服务器返回 304 ──► 使用本地副本，只是重新确认 ✓
   └── 服务器返回 200 + 新资源 ──► 更新本地缓存
```

### 4. 开发中的缓存实践

- 发布静态资源时使用**内容指纹**做文件名（如 `app-5f8c2a.js`），配合 `Cache-Control: max-age=31536000, immutable`，改动只影响改过的文件。
- HTML 页面通常设置 `Cache-Control: no-cache`，保证每次拿到最新页面、资源版本。
- `favicon`、logo 等不常变的资源可设置较长的强缓存。

## 五、HTTP 版本的演进

### 1. HTTP/1.1（1997，广泛沿用至今）

相比 1.0 的改进：

- 引入**持久连接（Keep-Alive）**：一次 TCP 连接可传输多个请求，避免每次都要握手。
- 支持**管线化（Pipelining）**：可连续发送多个请求而不等待响应，但受"队头阻塞"影响，实际很少使用。
- 引入 `Host` 头，支持一台服务器上多个域名（虚拟主机）。
- 新增 `OPTIONS`、`PUT`、`DELETE` 等方法和分块传输编码。

**核心痛点——队头阻塞（Head-of-Line Blocking）**：HTTP/1.1 一个连接同一时刻只能处理一个请求，前面的请求响应慢了，后面的只能排队等。浏览器用"并发多个 TCP 连接"（通常 6 个）来缓解，但治标不治本。

### 2. HTTP/2（2015）

- **多路复用（Multiplexing）**：在**一个** TCP 连接上同时传输多个请求/响应流，彻底解决了 HTTP 层的队头阻塞。以二进制**帧（Frame）**为其分割，不同流交错传输。
- **二进制分帧**：数据以二进制格式传输，更紧凑、解析更快（取代文本协议）。
- **头部压缩（HPACK）**：用静态索引表 + 动态表压缩请求头，显著减少冗余头体积。
- **服务器推送（Server Push）**：服务器可主动推送相关资源（该特性后来因收益有限被建议弃用）。
- 仍然要求 **HTTPS**（主流实现都在 TLS 之上）。

**残余痛点**：HTTP/2 的多路复用是基于单个 TCP 连接的，如果丢包，TCP 的**拥塞控制仍会对整个连接重传、减速**，于是"TCP 层队的队头阻塞"又成了新瓶颈。

### 3. HTTP/3（2022，基于 QUIC）

- 传输层从 **TCP** 换为 **QUIC**（基于 UDP）。
- 内置 **TLS 1.3**，连接建立速度更快（0-RTT 握手）。
- **无队头阻塞**：QUIC 在 UDP 之上自带可靠性、乱序重排、多路复用，一个流丢包不影响其他流。
- **连接迁移**：网络切换（Wi-Fi ↔ 移动网络）时连接 ID 保持不变，无需重连。
- 显著降低弱网下的延迟。目前各大 CDN 与浏览器已普遍支持。

**演进小结**：

> 示意片段（无配套脚本）

```
HTTP/1.1  文本、一个连接一个请求 → 队头阻塞
HTTP/2    二进制帧 + 多路复用（一个TCP连接）→ TCP层队头阻塞仍在
HTTP/3    QUIC（UDP）→ 真正无队头阻塞 + 更快握手
```

## 六、HTTPS 原理

HTTPS = HTTP + TLS/SSL 加密层。它在 TCP 之上、HTTP 之下插入了一层 **TLS（传输层安全协议，前身 SSL）**，提供**机密性、完整性、身份认证**三大保障。

> 示意片段（无配套脚本）

```
应用层：  HTTP
传输层：  TLS（握手 + 记录协议）  ← 加密在此层完成
传输层：  TCP
网络层：  IP
```

### 1. 为什么需要 HTTPS

明文 HTTP 有三个致命问题：

1. **窃听**：数据被中间人截获可读。
2. **篡改**：数据可被伪造或修改而不被发现。
3. **冒充**：无法确认你连接的真是目标服务器。

### 2. 对称加密与非对称加密

- **对称加密**：加密和解密用**同一个密钥**。速度快、适合大流量，但密钥如何安全地传给对方是个难题。
- **非对称加密**：一对密钥（公钥 + 私钥）。公钥可公开，私钥保密；用公钥加密只能用私钥解，反之亦然。安全地解决了密钥分发问题，但计算慢、不适合加密大块数据。

HTTPS 采用**混合加密**（Hybrid）——取两者之长：

- 用**非对称加密**安全地协商出一个会话密钥（Session Key）。
- 之后的大流量数据用**对称加密**（如 AES）加解密，兼顾安全与性能。

### 3. 数字证书与 CA

如何防止非对称加密环节被"中间人"用假公钥欺骗？答案是**数字证书**：

1. 服务器向 **CA（证书颁发机构）** 申请证书，证书包含：公钥、域名、有效期、CA 数字签名等。
2. CA 用**自己的私钥**对证书内容做签名。
3. 客户端内置各大 CA 的**根证书（公钥）**，据此验证服务器证书签名的真实性。
4. 只要证书由可信 CA 签名、域名匹配、且在有效期内，客户端就认为该公钥可信。

### 4. TLS 握手过程（大致流程）

> 示意片段（无配套脚本）

```
客户端                       服务器
  │ ① ClientHello(支持的TLS版本/算法套件/随机数A)   │
  ├──────────────────────────────────────────────-►│
  │ ② ServerHello(选定算法/随机数B) + 数字证书      │
  │ ◄──────────────────────────────────────────────┤
  │ ③ 验证证书 → 生成"预主密钥"，用服务器公钥加密     │
  ├──────────────────────────────────────────────-►│
  │ ④ 服务器用私钥解密 → 双方用预主密钥+随机数 A/B   │
  │    各自算出相同的"会话密钥"                      │
  │ ◄──────────────────────────────────────────────┤
  │ ⑤ 双方发送"握手完成"消息（用会话密钥加密验证）    │
  ├──────────────────────────────────────────────-►│
  │ ⑥ 握手完成，开始用会话密钥进行对称加密通信        │
  │ ◄══ 后续所有 HTTP 数据都加密传输 ═══►            │
```

经过这些步骤，客户端与服务器在不安全的网络上安全地协商出了相同的**会话密钥**，之后所有 HTTP 数据都被这个会话密钥对称加密，即使被截获也无法解读。

> 补充：TLS 1.3 通过简化的握手（1-RTT）以及 PSK/0-RTT 机制大幅缩短了建立时间；同时移除了对较弱算法（如部分 CBC、静态 RSA 密钥交换）的支持，更加安全高效。

### 5. HTTPS 的性能开销与优化

- 额外成本：一次 TLS 握手（现代的 TLS 1.3 已在 1 个往返内完成）+ 加解密 CPU 开销。
- 优化手段：会话复用（Session Resumption / Session Tickets）、HTTP/2 多路复用减少连接数、CDN 边缘做 TLS 终止、硬件加速等。

## 七、DNS 解析流程

**DNS（Domain Name System，域名系统）** 负责把人类友好的**域名**（`example.com`）解析成机器可读的 **IP 地址**（`93.184.215.14`）。

### 1. 解析流程（递归 + 迭代）

当浏览器请求 `https://www.example.com` 时，大致步骤：

> 示意片段（无配套脚本）

```
① 浏览器本地缓存 + Hosts 文件 —— 有则直接用
      │ 未命中
② 系统/操作系统 DNS 缓存 —— 有则返回
      │ 未命中
③ 向"本地 DNS 服务器"(通常是运营商/LAN提供的, 如 8.8.8.8 或 114.114.114.114)发起递归查询
      │
      ▼
④ 本地 DNS 若没有，则开始"迭代查询":
   a. 查询根域名服务器(. 根) → 得到 .com 顶级域服务器地址
   b. 查询 .com 顶级域服务器 → 得到 example.com 权威服务器地址
   c. 查询 example.com 权威服务器 → 得到 www.example.com 的 IP
      │
      ▼
⑤ 本地 DNS 拿到 IP → 逐级缓存 → 返回给浏览器
```

### 2. 关键概念

- **递归查询**：客户端→本地 DNS，由本地 DNS 负责"跑完整流程"并回结果。
- **迭代查询**：本地 DNS→根/顶级/权威服务器，逐层"指路"，每次只给出下一级地址。
- **权威服务器（Authoritative）**：对特定域名拥有最终答案的服务器。
- **缓存**：浏览器、OS、本地 DNS 都有缓存，`TTL` 决定缓存时长；合理设置 TTL 可以平衡变更速度与解析性能。
- **DNS 预解析**：前端可用 `<link rel="dns-prefetch" href="//example.com">` 提前解析，减少首次资源请求的等待。

### 3. 常见的优化手段

> 示意片段（无配套脚本）

```html
<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="//api.example.com" />

<!-- 预连接（预解析 + TCP/TLS 握手预热） -->
<link rel="preconnect" href="https://cdn.example.com" />
```

## 八、TCP 与 UDP 的区别

TCP 与 UDP 是传输层的两大协议，HTTP/HTTPS、WebSocket 都跑在 TCP 上，QUIC 跑在 UDP 上。区别一句话概括：**TCP 面向连接、可靠，UDP 无连接、不可靠但快**。

### 1. 核心区别

| 对比项 | TCP | UDP |
| --- | --- | --- |
| 连接 | 面向连接，三次握手建立、四次挥手断开 | 无连接，直接发数据报 |
| 可靠性 | 可靠：确认应答、超时重传、乱序重排 | 不可靠：发出去不管，丢包不重传 |
| 有序性 | 保证字节流按序到达 | 不保证顺序 |
| 传输方式 | 面向字节流 | 面向报文（有消息边界，天然不会粘包） |
| 流量控制 | 有（滑动窗口，避免发送方淹没接收方） | 无 |
| 拥塞控制 | 有（慢启动、拥塞避免、快重传、快恢复） | 无 |
| 速度 | 慢（握手 + 确认开销大） | 快（无握手、无确认） |
| 应用场景 | HTTP/HTTPS、WebSocket、文件传输、邮件 | 视频会议、直播、语音、DNS 查询、游戏实时对战 |

### 2. 为什么 UDP 不粘包

TCP 是**面向字节流**的协议，应用层多次 send 的数据在接收方看来是一条连续的字节流，接收方无法天然区分"这条消息到哪结束"，于是出现**粘包**（多条消息黏在一次读取里）。常用解法：封包/拆包（包头加长度字段）、关闭 Nagle 算法、消息间加分隔符。UDP 是**面向报文**的，每个数据报自带消息边界，接收端一次只能收到一个完整的报文，天然不会粘包。

### 3. 选择依据

- 要**可靠**（数据不能丢、顺序不能乱）→ TCP。
- 要**实时低延迟**（丢几帧可以接受）→ UDP。
- 前端日常：HTTP 系全部走 TCP；需要极低延迟的实时音视频才考虑 UDP/WebRTC；HTTP/3 的 QUIC 是在 UDP 上自己实现了可靠性——"既要快又要可靠"的折中方案。

## 九、WebSocket

WebSocket 是 HTML5 提供的**全双工**通信协议：基于 TCP，**复用 HTTP 的握手通道**，握手完成后建立持久连接，服务器与客户端**双向主动推送**。协议标识符是 `ws://`（加密 `wss://`）。

### 1. 为什么需要它

HTTP 是"请求-响应"模型，**服务器无法主动推送**。实时场景（聊天、行情、协作编辑）只能靠轮询模拟：

| 方案 | 原理 | 实时性 | 资源消耗 |
| --- | --- | --- | --- |
| 短轮询 | 客户端定时发 HTTP 请求 | 取决于间隔 | 大量无效请求，最浪费 |
| 长轮询 | 请求挂起，服务器有数据才响应，客户端再发起 | 较好 | 连接挂起也占资源 |
| SSE | 服务器声明返回流信息，单向持续推送（基于 HTTP） | 好 | 单向，客户端不能推 |
| WebSocket | 全双工持久连接 | 最好 | 连接开销在握手，之后极省 |

**兼容性顺序与性能顺序正好相反**：性能上 WebSocket > SSE > 长轮询 > 短轮询；兼容性（支持广度）上则相反。所以老项目用轮询兜底，新项目实时通信首选 WebSocket。

### 2. 与 HTTP 的区别

- **连接方式**：HTTP 短连接（一次请求一次响应，靠 Keep-Alive 复用）；WebSocket 一次握手、长驻连接。
- **通信方向**：HTTP 半双工（客户端发起）；WebSocket 全双工（双方随时互发）。
- **数据格式**：HTTP 头部冗长；WebSocket 数据帧轻量（二进制/文本）。
- **同源限制**：HTTP 有同源策略与 CORS；WebSocket **没有同源限制**，但服务端要校验 `Origin` 防跨站连接攻击。

### 3. 基本用法

> 示意片段（无配套脚本）

```js
const ws = new WebSocket("wss://example.com/ws");
ws.onopen = () => ws.send("hello");   // 连接建立后发送
ws.onmessage = (e) => console.log(e.data); // 收消息（MessageEvent.data）
ws.onclose = () => console.log("closed");
```

工程要点：断线自动重连（`close` 后按退避策略重连）、心跳保活（定时发 ping 防代理掐断空闲连接）、`wss://` 加密传输、`Origin` 白名单校验。

## 十、同源策略与 CORS

前面九节讲的是协议本身。这一节讲的是**浏览器额外加的一道门**：同源策略（Same-Origin Policy）决定了一个页面的脚本能读哪些响应、能操作哪个 iframe 的 DOM，而 CORS（Cross-Origin Resource Sharing）是这道门上唯一的官方"放行条"。

### 1. 同源：三要素

**源（Origin）= 协议 + 域名 + 端口**，三者完全一致才同源。假设页面来自 `http://localhost:5177/page.html`：

| 目标地址 | 同源？ | 原因 |
| --- | --- | --- |
| `http://localhost:5177/other.html` | ✅ | 三要素全同 |
| `https://localhost:5177/` | ❌ | 协议不同（`http` → `https`） |
| `http://api.localhost:5177/` | ❌ | 域名不同 |
| `http://localhost:5178/` | ❌ | **端口不同**（本篇的 demo 就靠这一条造出跨源） |
| `http://127.0.0.1:5177/` | ❌ | 域名不同（`localhost` 与 `127.0.0.1` 是两个 host） |

同源策略管的是**"读"**，不是**"发"**：

- 跨源的 `<script>` / `<img>` / `<link>` 标签**可以加载并执行/展示**——这正是 XSS 与 CSRF 能成立的前提。
- 跨源的 `fetch` / `XHR` **请求会正常发出去**，服务端也会正常处理；被拦的只是"把响应交给 JS 读取"这一步（本篇 demo 用服务端计数证明了这点）。
- 同源策略还保护 DOM 与存储：跨源 iframe 的 DOM 读不到、`localStorage` 按源隔离、Cookie 另有自己的域规则。

### 2. 两种跨源请求：简单请求与预检

浏览器把跨源请求分成两类，走完全不同的流程：

| | 简单请求 | 非简单请求 |
| --- | --- | --- |
| 方法 | 仅 `GET` / `HEAD` / `POST` | 其它方法（`PUT` / `DELETE` / `PATCH`…） |
| 请求头 | 仅 CORS 安全列表（`Accept` / `Accept-Language` / `Content-Language` / `Range` 等），`Content-Type` 的值只能是 `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain` | 带任何自定义头，或 `Content-Type` 用其它值 |
| 流程 | 直接发真实请求，浏览器检查响应里的 `Access-Control-Allow-Origin` 决定 JS 能否读 | **先自动发一个 `OPTIONS` 预检**，通过后才发真实请求 |
| 页面代码感知 | 只看到一次请求 | 只写了一次 `fetch`，实际产生两次请求 |

最容易踩的一条：**`Content-Type: application/json` 不在安全值列表里**，所以"用 JSON 提交一个 POST"几乎必然触发预检。这不是 bug，而是规范故意留的"先问一句"。

### 3. 服务端要回的响应头

| 响应头 | 作用 | 出现时机 |
| --- | --- | --- |
| `Access-Control-Allow-Origin` | 允许哪个源读取响应：`*` 或一个具体源 | 每次跨源响应 |
| `Access-Control-Allow-Methods` | 预检时告知允许的方法 | 仅预检 |
| `Access-Control-Allow-Headers` | 预检时告知允许的请求头 | 仅预检 |
| `Access-Control-Allow-Credentials` | 是否允许带凭据（Cookie / 客户端证书） | 需要凭据时 |
| `Access-Control-Max-Age` | 预检结果缓存多久（少一次往返） | 仅预检 |
| `Access-Control-Expose-Headers` | 额外放行哪些响应头给 JS 读 | 需要读自定义响应头时 |

两条硬规则：**`Allow-Credentials: true` 与 `Allow-Origin: *` 不能同时出现**（回显具体源才行）；**自定义响应头默认对 JS 不可见**，必须在 `Expose-Headers` 里列出来。

### 4. 实测：八组对照

demo 由两个源组成：页面在 `5177`，接口在 `5178`。服务端按查询参数决定回哪些 CORS 头：

> 摘自 `./code/api-server.js`（运行：`npm run api`）

```js
function corsHeaders(mode, req, expose) {
    const origin = req.headers.origin || ''
    const h = {}
    if (mode === 'star') h['Access-Control-Allow-Origin'] = '*'
    if (mode === 'reflect' || mode === 'credentials' || mode === 'full') {
        h['Access-Control-Allow-Origin'] = origin
        h['Vary'] = 'Origin'
    }
    // * 与 Allow-Credentials 互斥：带上凭据时只能回显具体 Origin
    if (mode === 'credentials' || mode === 'full') h['Access-Control-Allow-Credentials'] = 'true'
    // 自定义响应头默认对 JS 不可见，必须用 Expose-Headers 放行
    if (expose) h['Access-Control-Expose-Headers'] = 'X-Api-Server'
    return h
}
```

预检请求也被服务端记了数——它是浏览器自动发的，页面里看不到：

> 摘自 `./code/api-server.js`（运行：`npm run api`）

```js
    // 预检：浏览器在"非简单请求"之前**自动**发出的 OPTIONS，页面里的 fetch 只发了一次
    if (req.method === 'OPTIONS') {
        stats.preflight++
        stats.lastPreflight = {
            method: req.headers['access-control-request-method'] || '',
            headers: req.headers['access-control-request-headers'] || ''
        }
        if (mode === 'full') {
            headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'content-type, x-demo-token'
            headers['Access-Control-Max-Age'] = '600'
        }
        res.writeHead(204, headers)
        return res.end()
    }
```

页面侧只写了一次 `fetch`，把"成功"和"被拦"都收敛成一行输出：

> 摘自 `./code/site/cors-demo.js`（运行：`npm start` + `npm run api`）

```js
/** 把「成功」与「被浏览器拦下」都写成一行输出：被拦时 fetch 只给一个 TypeError */
async function attempt(label, run) {
    try {
        log(label + ' -> 通过：' + (await run()))
    } catch (e) {
        log(label + ' -> 被拦下：抛 ' + e.name + ' / ' + e.message)
    }
}
```

通过 `http://localhost:5177/cors-demo.html` 打开（**不能用 `file://`**，那样页面 Origin 是 `null`，结论会变）：

> 实测（CDP 在真实时间下等 4 秒后读页面探针；服务端 `5177` + `5178` 同时运行）

```
① 同源请求（5177 -> 5177） -> 通过：status = 200，res.ok = true
② 跨源 + Access-Control-Allow-Origin: * -> 通过：status = 200，服务端看到的 origin = http://localhost:5177，自定义响应头 X-Api-Server = null
③ ②之上再加 Access-Control-Expose-Headers -> 通过：X-Api-Server = "api-server@5178"
④ 跨源 + 服务端不返回任何 Access-Control-* 头 -> 被拦下：抛 TypeError / Failed to fetch
⑤ credentials: include + Access-Control-Allow-Origin: * -> 被拦下：抛 TypeError / Failed to fetch
⑥ credentials: include + 回显 Origin + Allow-Credentials -> 通过：status = 200，服务端看到的 origin = http://localhost:5177
⑦ POST + application/json，但预检里没有 Allow-Headers -> 被拦下：抛 TypeError / Failed to fetch
⑧ 同上，预检补齐 Allow-Methods / Allow-Headers -> 通过：status = 200，服务端收到的 content-type = application/json

服务端统计：一共收到 6 个 /api 请求，其中预检（OPTIONS）2 次
最后一次预检的内容：Access-Control-Request-Method = POST，Access-Control-Request-Headers = content-type
被 CORS 拦下的那几次，服务端其实都正常收到并返回了——拦的是"把响应交给 JS"这一步
```

逐条读：

- **①** 同源请求根本不走 CORS 判定，永远通过——这也是"把接口收敛到同一个源"最省事的原因。
- **②** `*` 足以让请求通过（能读 `status`），但自定义响应头 `X-Api-Server` 读出来是 `null`。
- **③** 加上 `Expose-Headers` 后同一个头就能读到了。差异只在这一个响应头。
- **④** 服务端一个 `Access-Control-*` 都不返回 → 浏览器拦下，`fetch` 抛 `TypeError`。
- **⑤** `credentials: 'include'` 配上通配的 `*` → 一样被拦：带凭据时必须回显具体源。
- **⑥** 回显 Origin + `Allow-Credentials: true` → 通过。
- **⑦⑧** 同一个 `POST`，只是预检里少了 `Allow-Headers` 就失败；补齐后成功。
- 最后三行是最值得记住的：**页面只写了 6 次 `fetch`，服务端却收到 6 个真实请求 + 2 次预检**；而且**被拦下的 3 次请求服务端全都正常收到并返回了**——CORS 拦的不是"发请求"，是"读响应"。

### 5. 跨源失败时为什么查不到原因

被 CORS 拦下时，JS 侧拿到的只有 `TypeError: Failed to fetch`——**没有状态码、没有响应头、也没有失败原因**。这是浏览器故意的：如果给出细节，就等于让脚本能探测别的源。所以定位跨源问题必须靠两个地方：

- **Network 面板**：请求是红色的（(blocked: cors) 之类），但 `/api/data` 的响应体其实是服务端真返回的内容——因为请求确实到了服务端。
- **Console**：浏览器会在这里给出具体原因，例如"缺少 `Access-Control-Allow-Origin`"、"credentials mode 为 include 时 `Allow-Origin` 不能用通配符"。

推论有两条：**排查时不要以为"请求没发出去"**；反过来，**CORS 不能当鉴权**——它只在浏览器里生效，绕过浏览器（curl / 服务端转发）就完全没有约束，服务端该做的鉴权一个都不能省。

还有一个常见误解：`fetch(url, { mode: 'no-cors' })` 不是"绕过 CORS"，它只是允许发出一个**不透明响应**（`type: 'opaque'`，`status` 恒为 0、内容读不到）——适合给 CDN 预热、上报这类不关心结果的请求。

### 6. 工程实践

- **首选不跨源**：接口与页面收敛到同一个域（网关 / BFF 统一前缀），开发期用 dev server 代理（Vite 的 `server.proxy`、webpack 的 `devServer.proxy`）把 `/api` 转出去。跨域问题在架构上消灭掉，比在响应头上调参可靠得多。
- **必须跨源时**：
  - 不涉及凭据 → `Allow-Origin: *` 最省事，但**不能再加 `Allow-Credentials`**。
  - 涉及 Cookie / 双向 TLS → 白名单校验 `Origin` 后**回显具体源** + `Allow-Credentials: true`，前端同时要写 `credentials: 'include'`。
  - 自定义响应头要在 `Expose-Headers` 里列出，否则前端读不到（实测 ②→③ 的区别）。
  - 减少预检：能落在简单请求里就落（方法、`Content-Type`、请求头三项都受约束）；否则给 `Max-Age` 把预检结果缓存起来——但改了允许的方法或头之后，要确认客户端没在用旧缓存。
- **别配成"回显任意 Origin + `Allow-Credentials: true`"**：那等于让任何站点都能带着用户 Cookie 读你的接口，同源策略被彻底关掉。这是配置层面的常见事故，与[「前端安全」](./前端安全.md)里的 CSRF 直接相关。
- 顺带区分一个容易混的概念：**"跨源"与"跨站"不是一回事**。Cookie 的 `SameSite` 判的是**站点**（协议 + 可注册域，不看端口），所以 `5177` → `5178` 这种"跨源但同站"的请求，`SameSite` 限制并不生效；真正决定它能不能被读的是 CORS。

## 小结

- HTTP 与 HTTPS
  - HTTP 基础
    - 应用层协议、无状态、请求-响应、明文
    - 报文结构：请求行 / 头部 / 空行 / 体
    - 常用请求头与响应头
  - 请求方法
    - `GET` / `POST` / `PUT` / `PATCH` / `DELETE` / `HEAD` / `OPTIONS`
    - 幂等性
  - 状态码
    - 1xx / 2xx / 3xx / 4xx / 5xx
    - 常见状态码速查（`301` / `302`、`401` / `403`、`304` 等）
  - HTTP 缓存
    - 强缓存：`Cache-Control` / `Expires`
    - 协商缓存：`Last-Modified` / `If-Modified-Since`、`ETag` / `If-None-Match`
    - 缓存决策流程、开发实践
  - HTTP 版本演进
    - HTTP/1.1：Keep-Alive、队头阻塞
    - HTTP/2：多路复用、二进制分帧、HPACK
    - HTTP/3：QUIC、无队头阻塞、0-RTT
  - HTTPS 原理
    - 对称加密 vs 非对称加密、混合加密
    - 数字证书与 CA
    - TLS 握手流程、TLS 1.3
    - 性能开销与优化
  - DNS 解析
    - 递归查询 + 迭代查询
    - 权威服务器、缓存与 TTL
    - `dns-prefetch` / `preconnect`
  - TCP 与 UDP
    - 连接性 / 可靠性 / 流量与拥塞控制 / 粘包对比
    - 应用场景选型、QUIC 折中
  - WebSocket
    - 全双工、复用 HTTP 握手、无同源限制
    - 短轮询 / 长轮询 / SSE / WebSocket 对比
    - 重连、心跳、`wss://` 与 Origin 校验
  - 同源策略与 CORS
    - 同源 = 协议 + 域名 + 端口三者全同；`localhost` 与 `127.0.0.1` 也不同源
    - 拦的是"读响应"不是"发请求"——被拦下的请求服务端照样收到并返回
    - 简单请求 vs 预检：非简单请求先自动发 `OPTIONS`；`application/json` 不在安全值列表里，所以它必然触发预检
    - 六个响应头：`Allow-Origin` / `Allow-Methods` / `Allow-Headers` / `Allow-Credentials` / `Max-Age` / `Expose-Headers`
    - `Allow-Credentials: true` 与 `Allow-Origin: *` 互斥；自定义响应头默认读不到，要 `Expose-Headers` 放行
    - 失败时 JS 只有 `TypeError: Failed to fetch`，定位靠 Network 面板与 Console；CORS 不能当鉴权
    - 工程首选"不跨源"（同域 + dev server 代理）

## 配套代码

本篇的可运行示例在仓库 `frontend/基础/网络与浏览器/code/site/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/fetch-status.html` | 通过真实 Fetch 请求回显 HTTP 状态码，并用 Promise 状态机（pending→resolved/rejected）演示请求的异步时序 | 三、状态码分类与常见状态码 |
| `./code/api-server.js` | CORS 实验用的"另一个源"（5178）：按查询参数返回不同的 `Access-Control-*` 头，并记录收到的预检请求 | 十、同源策略与 CORS |
| `./code/site/cors-demo.js` | 从 5177 打向 5178，依次跑 8 组对照：同源基线、`*`、`Expose-Headers`、不返回 CORS 头、`credentials` 与 `*` 互斥、预检缺 `Allow-Headers`、预检补齐（页面 `cors-demo.html`） | 十、同源策略与 CORS |

启动方式：在 `code` 目录执行 `node server.js`（即 `npm start`），打开 `http://localhost:5177/`。`cors-demo.html` 需要**同时**启动第二个源：另开一个终端执行 `npm run api`（即 `node api-server.js`），它监听 `5178`。注意必须通过 `http://localhost:5177/cors-demo.html` 打开，用 `file://` 直接打开时页面 Origin 是 `null`，同源判定与 CORS 行为都会变。

两个服务的端口被占用时都会**自动 +1 重试**（实际端口以启动日志为准）：`api-server` 漂移后，`cors-demo` 页面加载时会自动探测到它的实际端口（也可以用 `?api=端口` 手动指定）。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[手写实现与源码](../JavaScript%20核心/手写实现与源码.md)
- 下一篇：[浏览器渲染原理](./浏览器渲染原理.md)
