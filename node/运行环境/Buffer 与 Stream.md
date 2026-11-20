# Buffer 与 Stream：字节、背压与流式数据

## Buffer 到底是什么：固定长度的字节序列

Node.js 做服务端，面对的数据很多时候并不是字符串——而是图片、音频、视频、TCP 数据包、文件、压缩数据、加密数据。计算机底层真正处理的永远是 `byte`，Node.js 用 `Buffer` 来表示这些二进制字节数据。

官方定义里，Buffer 是一个**固定长度的字节序列**：创建时容量就定死了，不能无限往里加东西。现在（Node 4+）的 `Buffer` 已经是 JavaScript `Uint8Array` 的子类，所以它能和整个 TypedArray 体系互操作——`Buffer` 可以直接传给操作 `Uint8Array` 的 API，也能用 `ArrayBuffer` 的视图方法。

> 摘自 `./code/Buffer 与 Stream/src/buffer.js`（运行：`npm run buffer`）

```javascript
const buf1 = Buffer.from('hello')
// …
console.log('  buf1.length =', buf1.length, '（创建时容量就定死，不能往后追加）')
console.log('  buf1 instanceof Uint8Array =', buf1 instanceof Uint8Array, '（能与 TypedArray 体系互操作）')
```

一句话：字符串是"给人读的字符"，Buffer 是"给机器搬的字节"。服务端天生就在和字节打交道，所以 `Buffer` 是绕不开的基础类型。

## 十六进制与字符串互转：从 hello 看字节

`Buffer.from('hello')` 把字符串按 UTF-8 编码成字节。打印出来看到的是十六进制（`68 65 6c 6c 6f`），它其实就是 ASCII 里的 `h e l l o`——每个字母正好占一个字节，对应关系一目了然：

| 字符 | 十六进制 | 十进制 |
|------|----------|--------|
| h | 68 | 104 |
| e | 65 | 101 |
| l | 6c | 108 |
| l | 6c | 108 |
| o | 6f | 111 |

> 摘自 `./code/Buffer 与 Stream/src/buffer.js`（运行：`npm run buffer`）

```javascript
console.log('\n=== 2) 十六进制与字符串互转 ===')
console.log('  console.log(buf1)            →', buf1, '（默认打印十六进制：68 65 6c 6c 6f 正好是 ASCII 的 h e l l o）')
// …
console.log("  buf1.toString('hex')         →", buf1.toString('hex'))
console.log("  buf1.toString('utf8')        →", buf1.toString('utf8'))
console.log("  buf1.toString('base64')      →", buf1.toString('base64'), '（把二进制安全地塞进只认文本的协议）')
```

关键点：**字节本身没有编码，编码只是解读视角**。同一段字节，用 `'utf8'` 解读就是字符串，用 `'hex'` 解读就是十六进制串，用 `'base64'` 解读就是 Base64 串。这正是 `Buffer.from(str)` 与 `buf.toString()` 成对出现的原因。

### Buffer.alloc 与 Buffer.from 的区别

两者都能造出 Buffer，但语义不同：

- `Buffer.alloc(n)`：分配 **n 个字节并清零**，拿到的是一段干净的、全 0 的内存，适合作为"待填充的缓冲区"。
- `Buffer.from(x)`：从**已有的数据**构造——可以是字符串、数组、`ArrayBuffer` 等，不会清零，而是把现有内容编码进去。

> 摘自 `./code/Buffer 与 Stream/src/buffer.js`（运行：`npm run buffer`）

```javascript
const zeroed = Buffer.alloc(5)
console.log('  Buffer.alloc(5)     →', zeroed, '（已清零，适合当待填充的缓冲区）')
console.log("  Buffer.from('hello') →", Buffer.from('hello'), '（从已有数据编码而来，不清零）')
```

安全提示：不要用 `Buffer(size)` 这种未清零的构造函数（旧写法），它残留的是堆上随机旧数据，可能泄漏敏感信息。需要空白缓冲就用 `Buffer.alloc`。

## 字符长度 ≠ 字节长度：Content-Length 的坑

这是 Buffer 与 String 最容易踩、也最该记住的区别：

> 摘自 `./code/Buffer 与 Stream/src/buffer.js`（运行：`npm run buffer`）

```javascript
const buf2 = Buffer.from('你好')
console.log('  "你好".length        =', '你好'.length, '（JS 认为只有 2 个字符）')
console.log('  Buffer.from("你好").length =', buf2.length, '（UTF-8 下每个汉字 3 字节）')
```

`'你好'` 作为字符串只有 2 个字符，但按 UTF-8 编码成字节后占 6 个字节。**字符长度 ≠ 字节长度**。

结论很直接：当你要算 HTTP 响应头里的 `Content-Length`、要切分二进制协议帧、要限制上传体积时，必须用 `Buffer.length`（字节数），而不能用 `string.length`（字符数）。如果用字符长度去算内容长度——尤其是混入了中文、emoji 等占多字节的字符——`Content-Length` 会被算小，下游按错误长度截断，数据就乱了。

| 写法 | 含义 | 中英文混合时 |
|------|------|--------------|
| `'中文abc'.length` | 字符数 | 5（中2+英3） |
| `Buffer.from('中文abc').length` | 字节数 | 9（中3×2+英1×3） |

## Buffer 的五个应用场景

1. **文件读取**：`fs.readFile` 不指定 encoding 时，回调拿到的 `data` 就是 `Buffer`。
   > 示意片段（无配套脚本）

   ```javascript
   const fs = require('node:fs')

   fs.readFile('./avatar.png', (err, data) => {
       console.log(Buffer.isBuffer(data)) // true（未指定编码即返回 Buffer）
   })
   ```
2. **TCP Socket 的 `data` 事件**：网络收到的原始字节，回调里的 `chunk` 通常就是 `Buffer`。
   > 示意片段（无配套脚本）

   ```javascript
   socket.on('data', (chunk) => {
     console.log(Buffer.isBuffer(chunk)); // true
   });
   ```
3. **图片 / 音频 / 视频**：JPEG、PNG、MP3、MP4 等文件本质都是二进制字节流。
4. **加密**：明文先变成 `Buffer`，再交给 `AES` / `RSA` 处理，产出的密文也是 `Buffer`。
   ```
   plaintext
      ↓
   Buffer
      ↓
   AES / RSA
      ↓
   Buffer（密文）
   ```
5. **Base64 编解码**：把任意二进制安全地塞进只认文本的协议（如邮件、JSON、Data URL）。
   > 摘自 `./code/Buffer 与 Stream/src/buffer.js`（运行：`npm run buffer`）

   ```javascript
   console.log("  buf1.toString('base64')      →", buf1.toString('base64'), '（把二进制安全地塞进只认文本的协议）')
   ```

## Stream 是什么：一块一块地流动

假设服务端要发送一个 10GB 的视频，最省事的写法是 `fs.readFile` 读进来再 `res.end` 出去。但 `readFile` 意味着**把整个文件读进内存**：

```
10GB File
   │
   ▼
10GB Memory  ← 进程直接被撑爆
```

这就是 Stream 要解决的问题。Stream 是"处理流式数据的抽象接口"，核心是**一块一块地搬**，而不是一次拿完整数据。HTTP 的 Request、Response、`process.stdout` 本身都是 Stream。

```
10GB Movie
   │
   ▼
 64KB ──▶ 网络 ──▶ 64KB ──▶ 网络 ──▶ 64KB ──▶ ...（循环）
```

一次只搬一小块（通常 64KB），内存占用始终维持在几十 KB 到几 MB，而不是 10GB。Stream 把"无限大的数据源"变成了"不断流动的小块"。

## Stream 与 Buffer 的关系：水桶与水管

这里最容易搞混，记住一句话：**`Buffer` 是一块数据，`Stream` 是数据的运输方式**。

- `Buffer` = 水桶里装的那一桶水（一块字节）。
- `Stream` = 水管，不断把一桶一桶的水运送过去。

Stream 不断输送一个又一个 Buffer chunk，所以你看到的数据流是这样的：

```
Readable Stream
      │
      ▼
 Buffer Chunk
      │
      ▼
 Buffer Chunk
      │
      ▼
 Buffer Chunk
```

没有 Buffer，Stream 就没东西可运；没有 Stream，Buffer 就只能整块整块地堆在内存里。两者是"货物"和"物流"的关系。

## 四种 Stream：一张表看明白

| 能力\类别 | 不转换 | 转换 |
|-----------|--------|------|
| 单向 | `Readable` / `Writable` | （无对应） |
| 双向 | `Duplex` | `Transform` |

四种流各记一个核心点：

- **Readable（只读）**：只生产数据。数据源在 `read()` 里用 `this.push(chunk)` 把一块块数据推出来，`push(null)` 表示数据源结束；典型例子是 `fs.createReadStream('./a.txt')`、HTTP 请求体。
- **Writable（只写）**：只消费数据。实现 `write(chunk, encoding, callback)` 钩子处理每一条数据（处理完必须 `callback()` 通知流），`end()` 表示不再写入，全部消费完触发 `finish`；典型例子是 `fs.createWriteStream('./b.txt')`、HTTP 响应。
- **Duplex（双向）**：同一个对象上，读侧和写侧各有一套 API、互不干扰；典型例子是 TCP Socket——同一个 socket 既能 `on('data')` 收，也能 `write()` 发。
- **Transform（双向 + 转换）**：在 Duplex 之上加了转换——数据流过 `transform(chunk, encoding, callback)` 时改一改、用 `this.push()` 送出去，`flush(callback)` 补发收尾数据；典型例子是 `gzip` 压缩、加解密、数据格式转换。

### 四个理解 demo

> 摘自 `./code/Buffer 与 Stream/src/stream-types.js`（运行：`npm run types`）

```javascript
const { Readable, Writable, Duplex, Transform } = require('node:stream')
// …

// 1) Readable：只管生产数据，消费者用 data 事件接
const source = new Readable({
    // 消费者来要货时被调用：push 一块出去；push(null) 表示数据源结束
    read() {
        if (n < 3) { this.push(Buffer.from(`块${n} `)); n += 1 } else { this.push(null) }
    }
})
source.on('data', chunk => console.log(`收到：${chunk.toString().trim()}`))
source.on('end', () => console.log('[end] 数据源结束'))

// 2) Writable：只管消费数据，write() 进、finish 出
const sink = new Writable({
    // 每条数据被拿去"落盘/发网"的地方，处理完必须 callback() 通知流可以继续
    write(chunk, encoding, callback) {
        console.log(`消费：${chunk.toString().trim()}`)
        setTimeout(callback, 10) // 模拟异步落盘
    }
})
sink.write('第一块')
sink.write('第二块')
sink.end() // end() 表示不会再写了；之后再 write 会报错
sink.on('finish', () => console.log(`[finish] 全部消费完（writableFinished=${sink.writableFinished}）`))

// 3) Duplex：同一个对象上读写两侧各有一套（写侧收到的转手放进读侧）
const echo = new Duplex({
    read() {}, // 读侧的数据全靠写侧处理时 push 过来
    write(chunk, encoding, callback) {
        this.push(`echo:${chunk.toString().trim()}`)
        callback()
    }
})
echo.on('data', chunk => console.log(`读侧收到：${chunk.toString()}`))
echo.write('ping') // 从写侧写入，读侧的 data 事件会收到处理结果

// 4) Transform：数据过一遍手，改完再送出去
const upper = new Transform({
    // 每收到一块输入调一次：this.push() 送出改好的数据，callback() 说明这块处理完了
    transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase())
        callback()
    },
    // 所有输入处理完后调一次，用来补发收尾数据（可选实现）
    flush(callback) {
        this.push('|END')
        callback()
    }
})
upper.write('hello')
upper.write('world')
upper.end()
```

实测输出（`npm run types`）：

```
=== 1) Readable（只读）：只管生产数据，消费者用 data 事件接 ===
  收到：块0
  收到：块1
  收到：块2
  [end] 数据源结束

=== 2) Writable（只写）：只管消费数据，write() 进、finish 出 ===
  消费：第一块
  消费：第二块
  [finish] 全部消费完（writableFinished=true）

=== 3) Duplex（双向）：同一个对象上，读侧和写侧各有一套 API、互不干扰 ===
  读侧收到：echo:ping

=== 4) Transform（双向 + 转换）：数据过一遍手，改完再送出去 ===
  输入 hello + world → 输出 "HELLOWORLD|END"（transform 逐块转大写，flush 补收尾）
```

## 实战：复制大文件（背压版）

把 Stream 用到真实场景：复制一个大文件。分块只是 Stream 的表象，真正高级的是**背压（Backpressure）**——它解决的是"生产快于消费"的问题。

设想一个速度不匹配的场景：

```
磁盘读取速度：500MB/s
消费（写盘/发网）速度： 10MB/s
```

如果生产者不管不顾地疯狂读取，而消费者每秒只能消化 10MB，多出来的数据只能堆进内存：

```
Memory
Memory
Memory
...
OOM  ← 内存一路涨，最终被打爆
```

Stream 必须能告诉上游："你慢一点，我处理不过来了。"机制就藏在 `writable.write(chunk)` 的返回值里：

- 返回 `true`：内部缓冲还没到阈值，可以继续写。
- 返回 `false`：**内部缓冲已达上限，应当暂停上游读取**，否则内存照样暴涨。

等可写端消化完、缓冲降下来，它会触发 `'drain'` 事件，此时再恢复写入。闭环如下：

```
Producer ── chunk ──▶ [Writable 内部缓冲] ──▶ Consumer
                          │
        write() 返回 false │ 消费太慢，缓冲堆积到 highWaterMark
                          ▼
                   Producer.pause()
                          │
                          │  Consumer 持续消化缓冲
                          ▼
                   缓冲水位下降
                          │
                          │  触发 'drain' 事件
                          ▼
                   Producer.resume() ──▶ 回到开头继续搬
```

下面用三个版本复制同一个现成的源文件 `src/source.txt`——内容由你来写，足够大（1MB 量级）即可稳定触发背压，复制产物保留在各版本目录里、已 gitignore：

### 版本一：完全手动，亲手实现背压闭环

读侧每次产出 64KB，写侧缓冲上限只有 16KB，几乎每一块都会触发背压：

> 摘自 `./code/Buffer 与 Stream/src/copy-manual/copy-manual.js`（运行：`npm run copy-manual`）

```javascript
const SRC = path.join(__dirname, '..', 'source.txt') // 源文件：内容你来写，足够大即可触发背压
const DST = path.join(__dirname, 'copy-manual.txt') // 复制产物：保留，不入库

const rs = fs.createReadStream(SRC) // 每块 64KB（readableHighWaterMark 默认值）
const ws = fs.createWriteStream(DST) // 写侧缓冲上限 16KB（writableHighWaterMark 默认值）
let count = 0

rs.on('data', chunk => {
    if (!ws.write(chunk)) {
        count += 1
        // write() 返回 false 的瞬间就是背压发生的瞬间，只打印这个
        console.log(`第 ${count} 次背压：write() 返回 false → pause() 暂停读侧`)
        rs.pause() // 上游刹车，数据不再推过来
        ws.once('drain', () => rs.resume()) // 缓冲排空，恢复搬运
    }
})
rs.on('end', () => ws.end()) // 读侧数据全部交付后，关闭写侧（否则 finish 永远不会触发）
await once(ws, 'finish')
```

### 版本二：pipe，背压自动协调

`rs.pipe(ws)` 一行接上：`ws.write()` 返回 `false` 时 pipe 会自动 `pause()` 上游、`drain` 后自动 `resume()`——手写闭环里那两步它都替你做了。我们无法在返回 `false` 的瞬间插手，改为监听写流的 `drain`：每次 `drain` 都代表 pipe 自动消化了一次背压：

> 摘自 `./code/Buffer 与 Stream/src/copy-pipe/copy-pipe.js`（运行：`npm run copy-pipe`）

```javascript
const rs = fs.createReadStream(SRC)
const ws = fs.createWriteStream(DST)
let count = 0

ws.on('drain', () => {
    count += 1
    console.log(`第 ${count} 次背压（pipe 自动 pause/resume，无需手写）`)
})

rs.pipe(ws) // 接上即自动协调背压
await once(ws, 'finish')
```

### 版本三：pipeline，await 一次收尾

`node:stream/promises` 的 `pipeline()` 是更推荐的写法：`await` 结束即整条链路完成，背压与错误兜底全自动。同样监听 `drain` 观察背压：

> 摘自 `./code/Buffer 与 Stream/src/copy-pipeline/copy-pipeline.js`（运行：`npm run copy-pipeline`）

```javascript
const { pipeline } = require('node:stream/promises')

const ws = fs.createWriteStream(DST)
let count = 0
ws.on('drain', () => console.log(`第 ${++count} 次背压（pipeline 内部自动 pause/resume）`))

await pipeline(fs.createReadStream(SRC), ws)
```

### 实测输出

三个版本复制同一个 `src/source.txt`（约 1MB、16 块；`npm run copy-manual` / `copy-pipe` / `copy-pipeline`，输出行数随 source.txt 的大小变化）：

```
[copy-manual]
第 1 次背压：write() 返回 false（写侧积压 64KB ≥ 上限 16KB）→ pause() 暂停读侧
第 2 次背压：write() 返回 false（写侧积压 64KB ≥ 上限 16KB）→ pause() 暂停读侧
……（共 16 次，每块刹车一次）

[copy-pipe]
第 1 次背压（pipe 自动 pause/resume，无需手写）
第 2 次背压（pipe 自动 pause/resume，无需手写）
……（共 16 次）

[copy-pipeline]
第 1 次背压（pipeline 内部自动 pause/resume）
第 2 次背压（pipeline 内部自动 pause/resume）
……（共 16 次）
```

三个版本观察到的背压次数一致——每 64KB 一块、写侧缓冲只有 16KB，几乎每块都要"刹车一次"。整个过程中内存里始终只有两块缓冲：读侧的 64KB 和写侧的 16KB，占用与文件大小无关，10GB 的视频这样复制也不会撑爆内存。

背压的触发点由 `highWaterMark` 决定——"缓冲到多大算到顶"。两侧默认值并不相同：`fs.createReadStream()` 是 **64KB**，`fs.createWriteStream()` 是 **16KB**（通用默认值可用 `stream.getDefaultHighWaterMark()` 查看）。阈值越小，内存越省但搬运次数越多（系统调用更多）；阈值越大则相反。

三个版本怎么选：版本一是用来**学机制**的，看清背压闭环里每一步；版本二、三是生产写法——`pipe` 够用，`pipeline` 更推荐（`await` 收尾、出错统一销毁）。

## 配套代码

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/Buffer 与 Stream/src/buffer.js` | Buffer 到底是什么：固定长度的字节序列 · 十六进制与字符串互转：从 hello 看字节 · Buffer.alloc 与 Buffer.from 的区别 · 字符长度 ≠ 字节长度：Content-Length 的坑 | Buffer 的创建与 `Uint8Array` 子类身份、三种解读视角（十六进制 / utf8 / base64）、`alloc` 清零 vs `from` 编码、字符长度与字节长度之差（`'你好'` 2 vs 6、`'中文abc'` 5 vs 9） |
| `./code/Buffer 与 Stream/src/stream-types.js` | Stream 是什么：一块一块地流动 · Stream 与 Buffer 的关系：水桶与水管 · 四种 Stream：一张表看明白 | 四种流各一个最小理解 demo：Readable `push` + `data`/`end`、Writable `write` + `finish`、Duplex 写侧转手进读侧、Transform 转大写 + `flush` 补收尾 |
| `./code/Buffer 与 Stream/src/source.txt` | 实战：复制大文件（背压版） | 三个版本共享的复制源文件（约 1MB），内容可自行修改——写大一点背压就多；复制产物保留在版本目录里、已 gitignore |
| `./code/Buffer 与 Stream/src/copy-manual/copy-manual.js` | 实战：复制大文件（背压版）· 版本一 | 完全手动背压复制：`write()` 返回 `false` 就 `pause()`，`drain` 后 `resume()`，每次背压打印一行，全程内存只有两块缓冲（读侧 64KB + 写侧 16KB） |
| `./code/Buffer 与 Stream/src/copy-pipe/copy-pipe.js` | 实战：复制大文件（背压版）· 版本二 | `rs.pipe(ws)` 复制：背压由 pipe 自动协调（自动 pause/resume），监听 `drain` 打印背压次数 |
| `./code/Buffer 与 Stream/src/copy-pipeline/copy-pipeline.js` | 实战：复制大文件（背压版）· 版本三 | `await pipeline(rs, ws)` 复制：`await` 一次收尾，背压与错误兜底全自动，监听 `drain` 打印背压次数 |

运行方式（`code/Buffer 与 Stream` 目录下）：`npm run buffer` / `npm run types` / `npm run copy-manual` / `npm run copy-pipe` / `npm run copy-pipeline`。copy 三版本的源文件是 `src/source.txt`（内容可自行修改，复制产物保留在版本目录里、已 gitignore）。
