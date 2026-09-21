# HTTP2 与 HTTP3

HTTP/1.1 用了一件事解决并发：**多开连接**。浏览器对同域名限制 6 个并发连接，于是「把资源拆到多个域名」成了十几年里的标准优化手段。HTTP/2 把这条捷径收回去了——一个连接就够用。这一篇讲清两代协议在「并发」这件事上的差别、各自的队头阻塞，以及落到工程里该怎么配。

## 一、HTTP/1.1 的并发是拿连接数堆出来的

同一台机器、同一个 handler、6 个耗时 200ms 的请求，换三种发法（本机回环，脚本见 `npm run http2`）：

```
| 发法                            | TCP 连接数 | 批次总耗时 | 相对串行 |
|---------------------------------|------------|------------|----------|
| HTTP/1.1 单连接（maxSockets=1） | 1          | 1332 ms    | 1.00×    |
| HTTP/1.1 六连接（maxSockets=6） | 6          | 231 ms     | 5.77×    |
| HTTP/2 单连接（6 个 stream）    | 1          | 245 ms     | 5.45×    |
```

两个数字要一起看：

- HTTP/1.1 想并行，只能多开 TCP 连接——**并发度直接等于连接数**，第六个之后的请求还得排队。
- HTTP/2 用一个连接拿到了同等的并发度：耗时 245ms 与 231ms 是同一量级，连接数从 6 降到 1。

代价差在哪很清楚：6 个连接就是 6 次 DNS、6 次 TCP 握手、6 次 TLS 握手（HTTP/1.1 无连接级复用）、6 份拥塞窗口各自从慢启动开始爬。HTTP/2 只有一次。

这也解释了为什么「域名分片」「CSS 雪碧图」「把小图标内联成 base64」这类手段流行了那么久——它们都是在绕开 6 连接的限制。而这些手段本身是有代价的：域名分片增加了 DNS 与握手开销，雪碧图与 base64 牺牲了缓存粒度（改一个图标，整张贴图与整份 CSS 都失效）。

## 二、队头阻塞：慢请求会不会拖累后发的快请求

先分清两个层次，很多讨论把两者混在一起：

- **应用层（HTTP 层）队头阻塞**：同一个连接上，前一个请求的响应没回来，后面的请求就不能上路。
- **传输层（TCP 层）队头阻塞**：TCP 保证字节流有序，一个报文丢了，后面的字节即使收到了也要等它重传。

HTTP/1.1 两个都有，HTTP/2 只解决了第一个。实测第一个（一个 500ms 的请求排在最前，后面跟 5 个 20ms 的请求）：

```
| 发法            | 快请求平均完成于 | 快请求最晚完成于 | 说明                                     |
|-----------------|------------------|------------------|------------------------------------------|
| HTTP/1.1 单连接 | 617 ms           | 678 ms           | 同一连接上只能一个一个来，全被慢请求挡住 |
| HTTP/2 单连接   | 33 ms            | 33 ms            | 各 stream 独立，慢的不拖累快的           |
```

HTTP/1.1 上那 5 个快请求全被压到了 600ms 之后——它们的响应各自只要 20ms，却必须等前面的慢请求走完。HTTP/2 上它们都在 33ms 内完成（20ms 服务端耗时 + 本机往返与调度开销），慢请求自己在 500ms 后返回，互不影响。

多路复用是怎么做到的：

> 摘自 `./code/net-lab/scenarios/http2.mjs`

```js
/** HTTP/2 批次：一个连接上并发开 stream */
function http2Batch(base, specs) {
    const client = http2.connect(base)
    client.on('error', () => {})
    const t0 = performance.now()
    return Promise.all(
        specs.map(
            spec =>
                new Promise(resolve => {
                    const req = client.request({ ':path': `/api/slow?ms=${spec.ms}` })
                    req.resume()
                    req.on('end', () => resolve({ label: spec.label, done: performance.now() - t0, sockets: 1 }))
                    req.on('error', () => resolve({ label: spec.label, done: NaN, sockets: 1 }))
                })
        )
    ).then(rows => {
        client.close()
        return rows
    })
}
```

关键差别是 `http2.connect` 建立一个 **session**（连接），每个请求是在这条 session 上开一个 **stream**。请求与连接解耦之后，「有多少请求要发」不再受「能开多少连接」限制。

对比之下 HTTP/1.1 的写法必须依赖连接池：

> 摘自 `./code/net-lab/scenarios/http2.mjs`

```js
/** HTTP/1.1 批次：agent 的 maxSockets 决定并发几个连接 */
function http1Batch(base, specs, maxSockets) {
    const agent = new http.Agent({ keepAlive: true, maxSockets })
    const t0 = performance.now()
    return Promise.all(
        specs.map(
            spec =>
                new Promise(resolve => {
                    const req = http.get(new URL(`/api/slow?ms=${spec.ms}`, base), { agent }, res => {
                        res.resume()
                        res.on('end', () =>
                            resolve({ label: spec.label, done: performance.now() - t0, sockets: maxSockets })
                        )
                    })
                    req.on('error', () => resolve({ label: spec.label, done: NaN, sockets: maxSockets }))
                })
        )
    )
}
```

`maxSockets` 就是浏览器里那个 6 的等价物：它决定并发上限，也决定「第 7 个请求要等多久」。

## 三、HTTP/2 还顺手改了这些

多路复用是招牌，但协议层面还有几处必须知道的变化：

| 变化 | 内容 | 为什么重要 |
| --- | --- | --- |
| 二进制分帧 | 请求/响应被切成 HEADERS 帧与 DATA 帧，按 stream 编号交错发送 | 文本协议没法做优先级与交错，二进制帧才能 |
| 头部压缩 HPACK | 静态表 + 动态表 + 哈夫曼编码，同一连接上的重复头部用索引引用 | 省掉大量重复 Cookie / UA；但压缩上下文是**连接级**的，这也带来了 CRIME/BREACH 类的攻击面 |
| 流优先级 | 声明依赖树与权重（`priority` 帧） | 实践里服务器实现不一致，HTTP/2 的优先级机制后来被 RFC 9218 的 `Priority` 头取代思路 |
| 连接级流控 | `SETTINGS_INITIAL_WINDOW_SIZE` 与 WINDOW_UPDATE 按 stream 与连接两个维度 | 一个慢客户端不会拖垮整个连接 |
| 服务端推送 | 服务端主动推资源，浏览器后来废弃了 | 推送的资源无法确定客户端是否已缓存，容易推重复；`103 Early Hints` 是更可控的替代 |

两个容易踩的坑：

1. **`priority` 帧的实际效果依实现而定**，别指望它精确控制资源顺序；真正要控制首屏关键资源顺序，还是靠 `<link rel="preload">` 与 `fetchpriority`（见性能模块的加载篇）。
2. **服务端推送已从 Chrome 移除**，见到旧文章讲 push 就直接跳过；想要「响应还没生成就先告诉浏览器去准备资源」，用 `103 Early Hints`。

## 四、HTTP/2 没解决的，交给 HTTP/3

HTTP/2 的多路复用把请求都放进**一条 TCP 连接**，于是 TCP 层队头阻塞从「可能发生」变成了「一定会波及全部」：以前多连接时，丢包只影响其中一条连接上的请求，现在一条连接承载所有请求，丢一个包所有 stream 一起等。

这就是 HTTP/3 的出发点——它把传输层从 TCP 换成 **QUIC（基于 UDP）**：

- **stream 级重传**：QUIC 在用户态实现了流的概念，某个 stream 的报文丢了只重传那一段，其它 stream 不受影响。
- **握手更快**：TLS 1.3 内建在 QUIC 里，首次连接 1-RTT（HTTP/2 也是 1-RTT，差别在恢复连接）。
- **0-RTT 恢复**：客户端用上次会话的票据，第一个报文就能带上请求数据。代价是 0-RTT 数据**可被重放**，所以只允许用在幂等的 GET 上（见第 3 篇）。
- **连接迁移**：QUIC 用 Connection ID 而不是四元组标识连接，手机从 Wi-Fi 切到 4G 不需要重新握手。

需要说明的是，**本机没有 QUIC 服务端，上面这一节的数字与机制不来自本仓库实测**，属于协议规范与公开资料；仓库里能实测的只有 HTTP/1.1 与 HTTP/2 的对照。

## 五、落到工程上怎么用

**部署条件**：HTTP/2 实际使用必须走 TLS + ALPN 协商（`h2`）；明文 h2c 只用于内部调试（本仓库的场景就是 h2c）。判断线上到底是哪个协议，看 DevTools Network 面板的 Protocol 列（`h2` / `h3` / `http/1.1`），或 `curl -I --http2 https://example.com` 看响应首行。

**打包策略要跟着改**：

- **请求数量不再是最重要的指标**，但也不是越多越好：每个请求仍有头部、调度与内存成本，小文件过多会拖慢首次渲染的服务端处理。分包的判断依据回到「缓存命中率」与「首屏必需」。
- **雪碧图与 base64 内联的收益下降了**：它们原本是为了省请求，现在省下的那点请求不值当牺牲缓存粒度。
- **别再为了绕过 6 连接去分域名**：分域名在 HTTP/2 下是净损失。
- **gzip/brotli 仍然必开**：头部压缩（HPACK）只管头部，正文压缩还得靠传输层的内容编码。

**要不要上 HTTP/3**：CDN 厂商基本都支持，开启通常只是控制台一个开关。收益集中在弱网与移动端（连接迁移、抗丢包）。风险点是中间设备对 UDP 的拦截，所以服务端都要同时保留 HTTP/2 作为回退——这也是为什么 HTTP/3 用 Alt-Svc 头来「告知」而不是强制。

## 配套代码

本篇数字与代码来自 `code/net-lab`（零依赖，只要 Node 22，不需要 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/net-lab/scenarios/http2.mjs` | 三种发法的耗时对照、慢请求压快请求的对照 | 一、二 |
| `./code/net-lab/harness/servers.mjs` | 同一套路由分别起 HTTP/1.1 与 HTTP/2（h2c）临时服务器 | 一、二 |
| `./code/net-lab/lib/endpoints.cjs` | `/api/slow` 等端点，两个服务器共用 | 一、二 |
| `./code/net-lab/README.md` | 全部场景与已知边界（含「HTTP/3 测不了」的说明） | 全篇 |

运行方式：在 `code/net-lab` 目录执行 `npm run http2`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 下一篇：[CDN 与缓存体系](./CDN%20与缓存体系.md)
