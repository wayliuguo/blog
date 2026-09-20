# Buffer 与 Stream：字节、背压与流式数据

## Buffer 到底是什么：固定长度的字节序列

Node.js 做服务端，面对的数据很多时候并不是字符串——而是图片、音频、视频、TCP 数据包、文件、压缩数据、加密数据。计算机底层真正处理的永远是 `byte`，Node.js 用 `Buffer` 来表示这些二进制字节数据。

官方定义里，Buffer 是一个**固定长度的字节序列**：创建时容量就定死了，不能无限往里加东西。现在（Node 4+）的 `Buffer` 已经是 JavaScript `Uint8Array` 的子类，所以它能和整个 TypedArray 体系互操作——`Buffer` 可以直接传给操作 `Uint8Array` 的 API，也能用 `ArrayBuffer` 的视图方法。

> 本节（及全篇）的代码块均取自配套脚本，采用 CommonJS 写法（`require(...)`），与正文示例里的 `import ... from 'node:...'` 风格不同——`node-basics` 零依赖，直接用 `node` 运行即可。

> 摘自 `./code/node-basics/src/05-buffer.js`（运行：`npm run 05buffer`）

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

> 摘自 `./code/node-basics/src/05-buffer.js`（运行：`npm run 05buffer`）

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

> 摘自 `./code/node-basics/src/05-buffer.js`（运行：`npm run 05buffer`）

```javascript
const zeroed = Buffer.alloc(5)
console.log('  Buffer.alloc(5)     →', zeroed, '（已清零，适合当待填充的缓冲区）')
console.log("  Buffer.from('hello') →", Buffer.from('hello'), '（从已有数据编码而来，不清零）')
```

安全提示：不要用 `Buffer(size)` 这种未清零的构造函数（旧写法），它残留的是堆上随机旧数据，可能泄漏敏感信息。需要空白缓冲就用 `Buffer.alloc`。

## 字符长度 ≠ 字节长度：Content-Length 的坑

这是 Buffer 与 String 最容易踩、也最该记住的区别：

> 摘自 `./code/node-basics/src/05-buffer.js`（运行：`npm run 05buffer`）

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
   > 摘自 `./code/node-basics/src/05-buffer.js`（运行：`npm run 05buffer`）

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

- **Readable（只读）**：只生产数据。例如 `fs.createReadStream('./a.txt')`、HTTP 请求体。
- **Writable（只写）**：只消费数据。例如 `fs.createWriteStream('./b.txt')`、HTTP 响应。
- **Duplex（双向）**：同时可读可写，**典型是 TCP Socket**——既能收也能发。
- **Transform（双向 + 转换）**：Duplex 的一种，输入经过"转换"再输出，例如 `gzip` 压缩、加解密、数据格式转换。

### Readable：方法、属性与事件

| 你想做的事 | 方法 | 说明 |
|------------|------|------|
| 一块块拿数据 | `readable.on('data', chunk => {})` | 注册 `data` 监听就把流切进**流动模式**，数据自动推来 |
| 主动去拉 | `readable.read(size?)` | **暂停模式**下按需拉；返回 `null` 表示暂时没数据 |
| 用循环读 | `for await (const chunk of readable)` | 语法最干净，每次迭代自动等上一块消费完（天然配合背压） |
| 接上目的地 | `readable.pipe(writable)` | 返回**目标流本身**，所以可以直接 `.pipe().pipe()` 串下去 |
| 暂停 / 恢复 | `pause()` / `resume()` | 对应 `readableFlowing` 由 `true` 变 `false`、再变回 `true` |
| 按字符读 | `setEncoding('utf8')` | 之后 `data` 给的是字符串，且不会把一个多字节字符从中间切断 |
| 从现成数据造流 | `Readable.from(iterable)` | 数组、生成器、异步生成器都能变成可读流，造数据源的捷径 |
| 自己产数据 | `this.push(chunk)` | 写在自定义流的 `read()` 里；`push(null)` 表示数据源结束 |
| 提前收工 | `readable.destroy(err?)` | 触发 `close`，`destroyed` 变为 `true` |

- 关键属性：`readableFlowing`（`null` 未定 / `true` 流动 / `false` 暂停）、`readableHighWaterMark`（读侧缓冲上限）、`readableLength`（缓冲里还压着多少字节）、`readableEnded`、`destroyed`。
- 关键事件：`data`、`end`、`readable`、`pause`、`resume`、`error`、`close`。

### Writable：方法、属性与事件

| 你想做的事 | 方法 | 说明 |
|------------|------|------|
| 写一块 | `writable.write(chunk)` | 返回值是关键：`true` 可以继续写，`false` 表示内部缓冲已满、**应当暂停上游** |
| 写完收尾 | `writable.end(chunk?)` | 之后不能再 `write()`，否则报 `ERR_STREAM_WRITE_AFTER_END`（错误走 `error` 事件，不是同步抛出） |
| 合并小写入 | `cork()` / `uncork()` | 攒着一起交给底层；若该流实现了 `writev`，多次小写会合并成一次系统调用 |
| 判断是否在刹车 | `writableNeedDrain` | 等价于"上次 `write()` 返回了 `false` 且还没等到 `drain`" |
| 立刻释放资源 | `writable.destroy(err?)` | 不等缓冲排空，直接销毁 |

- 关键属性：`writableHighWaterMark`（写侧缓冲上限）、`writableLength`（缓冲里积压的字节数）、`writableNeedDrain`、`writableEnded`（`end()` 已调用）、`writableFinished`（数据已全部交付）。
- 关键事件：`drain`（缓冲排空，可以继续写）、`finish`（全部写完）、`pipe` / `unpipe`（被 `pipe` 接上 / 摘掉）、`error`、`close`。

### Duplex：读侧和写侧各有一套

Duplex 就是 `Readable` 与 `Writable` 的能力叠加，**两边的 API、属性、事件各有一套、互不干扰**：读侧有 `read()` / `push()` / `readableLength` / `readableFlowing` 与 `data` / `end`，写侧有 `write()` / `end()` / `writableLength` / `writableNeedDrain` 与 `drain` / `finish`。

它还有一个自己的选项 `allowHalfOpen`：为 `true` 时读侧收到 EOF **不会**自动关掉写侧（这就是 TCP 半关闭语义）。注意默认值并不统一——`new Duplex()` 默认 `true`，而 `net.createServer` 产出的 socket 默认 `false`。真实世界的 Duplex 就是 `net.Socket`：同一个对象上既能 `on('data')` 收，也能 `write()` 发。

### Transform：在 Duplex 之上加一层转换

除了继承两边的 API，你只需要实现三个钩子：

| 钩子 | 何时被调用 | 要做的事 |
|------|------------|----------|
| `transform(chunk, encoding, callback)` | 每收到一块输入 | 用 `this.push(改好的数据)` 送出去，再 `callback()` 说明这块处理完了 |
| `flush(callback)` | 所有输入都处理完 | 补发收尾数据（可以不实现） |
| `final(callback)` | 写侧结束 | 释放资源（用得较少） |

- 送数据只能 `this.push()`——`transform` 里的 `this` 就是这个流本身。
- `objectMode: true` 时 chunk 不再是 `Buffer`，可以是任意 JS 值（`readableObjectMode` / `writableObjectMode` 会同时变成 `true`），适合在流水线上传对象。
- `PassThrough` 是 Transform 的最简实现：不做任何改动、原样透传，常用来"插一脚"观测数据。

> 摘自 `./code/node-basics/src/05-stream-types.js`（运行：`npm run 05types`）

```javascript
const { Readable, Writable, Duplex, Transform, PassThrough } = require('node:stream')
// …
const upper = new Transform({
    // transform() 每收到一块调一次：用 this.push() 送改好的，再 callback() 说"这块处理完了"
    transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase())
        callback()
    },
    // flush() 在所有输入处理完后调一次，用来补发收尾数据
    flush(callback) {
        this.push('|收尾')
        callback()
    }
})
```

## 实战：复制大文件

先给一个"炸内存"版本——把整个文件读进来再写出去：

> 摘自 `./code/node-basics/src/05-stream-vs-buffered.js`（运行：`npm run 05vsbuffered`）

```javascript
const data = await fs.promises.readFile(SRC)
// …
await fs.promises.writeFile(OUT_ALL, data)
```

再给 Stream 版本，内存占用恒定：

> 摘自 `./code/node-basics/src/05-stream-vs-buffered.js`（运行：`npm run 05vsbuffered`）

```javascript
const rs = fs.createReadStream(SRC)
const ws = fs.createWriteStream(OUT_STREAM)
const held = peakOf(() => rs.readableLength + ws.writableLength, 1)
rs.pipe(ws)
await once(ws, 'finish')
```

数据流是这样走的：

```
Disk ──▶ Buffer ──▶ Readable Stream ──▶ Writable Stream ──▶ Disk
```

`pipe` 把可读端和可写端接起来，数据从磁盘的一块 Buffer 流进可读流，再流进可写流写回磁盘，全程不把整文件搬进内存。

两者到底差多少？用 64MB 文件实测一次（`npm run 05vsbuffered`；两种方式各起一个独立子进程，否则前一次实验残留的内存会让后一次测不准）：

| 复制方式 | 同时握在手里的数据 | 峰值 RSS |
|----------|--------------------|----------|
| `readFile` + `writeFile` | **64.0MB**（≈ 整个文件） | 约 121MB |
| `createReadStream().pipe()` | **128KB**（读侧 64KB + 写侧 16KB 两块缓冲） | 约 76MB |

前者的占用**随文件大小线性增长**，后者的占用**只与两侧的高水位有关**。文件越大差距越悬殊——10GB 的视频走 `readFile`，进程当场就被撑爆。

实测输出（`npm run 05vsbuffered`，两种复制方式各起独立子进程，避免内存互相污染）：

```
  ── 子进程 readfile（独立进程，内存基数干净）──
     耗时 104ms
     同时握在手里的数据：64.0MB —— 整份数据都在 data 变量里，文件多大就占多大
     峰值 RSS：119.5MB

  ── 子进程 pipe（独立进程，内存基数干净）──
     耗时 224ms
     同时握在手里的数据：128KB —— 读侧缓冲（上限 64KB） + 写侧缓冲（上限 16KB）
     峰值 RSS：73.0MB

  两种方式结果一致：true（67108864 / 67108864 字节）
  readFile 的占用 ≈ 整个文件大小；pipe 的占用只与两侧的高水位有关
  所以文件越大差距越悬殊：10GB 视频走 readFile 会直接把进程撑爆
```

## 背压：Stream 真正高级的地方

分块只是 Stream 的表象，真正高级的是**背压（Backpressure）**。设想一个速度不匹配的场景：

```
磁盘读取速度：500MB/s
网络发送速度： 10MB/s
```

如果生产者不管不顾地疯狂读取，而消费者（网络）每秒只能发 10MB，多出来的数据只能堆进内存：

```
Memory
Memory
Memory
...
OOM  ← 内存一路涨，最终被打爆
```

Stream 必须能告诉上游："你慢一点，我处理不过来了。"这就是背压。机制就藏在 `writable.write(chunk)` 的返回值里：

- 返回 `true`：内部缓冲还没到阈值，可以继续写。
- 返回 `false`：**内部缓冲已达上限，调用方应当暂停读取**，否则内存照样暴涨。

背压发生时，流上有三个数字能让你确认"它真的在刹车"（`npm run 05flow` 实测）：

| 属性 | 含义 | 实测值 |
|------|------|--------|
| `writableLength` | 写侧缓冲里积压了多少字节 | 返回 `false` 那一刻是 `56B`，而 `highWaterMark` 只有 `50B` |
| `writableNeedDrain` | 是否处于"刹车中"（上次返回 `false` 且还没等到 `drain`） | 刹车时为 `true`，`drain` 之后变回 `false` |
| `readableLength` | 读侧缓冲里还压着多少字节 | 交给 `pipe` 自动协调时，它会在 `write()` 返回 `false` 那一刻 `pause()` 上游，所以这个值始终只有一两块 |

实测输出（`npm run 05flow`，自定义一个消费很慢的 Writable，`highWaterMark` 故意设成 50 字节）：

```
  向慢速流写入 100 条数据（每条消费 10ms）...
  第 7 条之后 write() 返回 false：
    writableLength=56B ≥ highWaterMark=50B，writableNeedDrain=true
    → 上游应当暂停，否则内存照样被写爆
  drain 事件（第 1 次）：缓冲已排空 writableLength=0B，writableNeedDrain=false → 恢复写入
  第 13 条之后 write() 返回 false：
    writableLength=51B ≥ highWaterMark=50B，writableNeedDrain=true
    → 上游应当暂停，否则内存照样被写爆
  drain 事件（第 2 次）：缓冲已排空 writableLength=0B，writableNeedDrain=false → 恢复写入

  全部写完：共触发背压 16 次、drain 16 次
  每条数据 8~10 字节，50B 的缓冲每轮装得下约 6 条，所以大约每 6 条就刹车一次。
  write() 的返回值 + drain 事件，就是 Node 给"生产快于消费"准备的刹车。
```

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

`highWaterMark` 参数决定了"缓冲到多大算到顶"——也就是背压的触发点。两侧的默认值并不相同，这点很容易记错：

| 流 | 默认 `highWaterMark` |
|----|----------------------|
| `fs.createReadStream()` | **64KB**（"流每次搬一小块"的印象就来自这里） |
| `fs.createWriteStream()` | **16KB** |
| 通用默认值（`new Readable()` / `new Writable()` / `new Duplex()` 等） | **16KB**，可用 `stream.getDefaultHighWaterMark()` 查看 |

阈值越小，内存越省但搬运次数越多（系统调用更多）；阈值越大则相反。

> 摘自 `./code/node-basics/src/05-stream-flow-control.js`（运行：`npm run 05flow`）

```javascript
const slow = new Writable({
    highWaterMark: 50, // 写侧内部缓冲上限 50 字节
    write(chunk, encoding, callback) {
        setTimeout(() => callback(), DELAY) // 10ms 后才通知"这条处理完了"
    }
})
```

手写 `pause/resume` 很容易出错，绝大多数场景直接用 `pipe` 或 `pipeline`——它们内部已经自动协调了背压。

## pipe 为什么重要，以及为什么更推荐 pipeline

`readable.pipe(writable)` 不只是"把 A 的数据丢给 B"：它内部会自动协调读取速度、写入速度、缓存和背压。比起自己写 `on('data', chunk => socket.write(chunk))`，`pipe` 不会让你手滑写出内存泄漏，所以生产代码里通常优先用它。

`pipe()` 还有几个容易忽略的细节：它**返回目标流本身**，所以能一路 `.pipe().pipe()` 串下去；第二个参数 `{ end: false }` 可以让它不自动结束下游（同一个可写流还要接别的来源时用得上）；接上 / 摘掉会触发源流的 `pipe` / `unpipe` 事件，`reader.unpipe(writer)` 能中途拆开；但下游流的 `error` **不会**自动传回上游。

但 `pipe()` 有个短板：**下游出错时，它不会自动销毁上游**。如果中间某个流抛错，上游流可能还挂着，文件描述符、Socket 都没释放，留下一堆悬挂的流。

因此更推荐 `pipeline()`（来自 `node:stream/promises`）。它会在任意一环出错时**统一销毁所有流并抛出错误**，还能顺序串联多个 Transform（比如"读 → 压缩 → 加密 → 写"）。生产代码里它比 `pipe` 更安全：

> 摘自 `./code/node-basics/src/05-stream-flow-control.js`（运行：`npm run 05flow`）

```javascript
const { pipeline } = require('node:stream/promises')
// …
const dst = path.join(TMP, 'pipeline.gz')
await pipeline(fs.createReadStream(SRC), zlib.createGzip(), fs.createWriteStream(dst))
```

两者出错时的差别可以直接观察（`npm run 05flow` 用同一个"第 2 块故意抛错"的 Transform，分别接在 `pipe` 和 `pipeline` 上跑一遍）：

| | `pipe()` | `pipeline()` |
|---|----------|--------------|
| 返回值 | 目标流本身，可继续 `.pipe()` | `node:stream` 版收 `callback`，`node:stream/promises` 版返回 Promise，可直接 `await` |
| 出错时对其它流 | **不销毁**：实测上下游 `destroyed` 都是 `false`，得自己逐环 `on('error')` 再 `destroy()` | **统一销毁整条链路**：实测上下游 `destroyed` 都是 `true`，并抛出异常 |
| 多级链路 | 能串，但要一层层接 | 逗号一次列完，层数不限 |
| 何时算结束 | 靠 `finish` / `end` 事件自己判断 | `await` 结束即可；单独一条流要判断收尾可以用 `stream.finished(stream, cb)` |

实测输出（`npm run 05flow`，同一个"第 2 块故意抛错"的 Transform，分别接在 `pipe` 与 `pipeline` 上）：

```
  [pipe] 中间 Transform 抛错：
    捕获到：Transform 第 2 块故意出错
    上游 rs.destroyed = false，下游 ws.destroyed = false
    —— 读写流都没被自动销毁，文件描述符还挂着：这就是 pipe 的短板，得自己补 error 处理

  [pipeline] 同样的错误：
    pipeline 抛出：Transform 第 2 块故意出错
    上游 rs.destroyed = true，下游 ws.destroyed = true
    —— 整条链路被统一销毁，不会留下悬挂的流，所以生产代码优先用它
```

一句话选型：**简单搬运用 `pipe` 即可；链路更长、需要错误兜底、或要串联多个转换时，用 `pipeline`**。

## 流式推送为什么必须用 Stream

服务端要把一段**持续产生**的数据推给客户端时——比如日志流、进度百分比、大文件传输、实时监控数据——如果用 `readFile` 或先拼成一个大字符串再一次性返回，就会又慢又占内存：客户端要等全部数据生成完才开始收到，期间服务端内存还被撑着。

正确做法是把数据源做成 Readable Stream，**边产生边推**：

> 摘自 `./code/node-basics/src/05-stream-vs-buffered.js`（运行：`npm run 05vsbuffered`）

```javascript
for (let i = 0; i < BLOCKS; i++) {
    if (!res.write(piece(i))) await once(res, 'drain') // write 返回 false 就等 drain
    await sleep(GAP)
}
res.end()
```

把"日志 / 进度 / 大文件 / 监控数据"看成不断产出的 chunk，客户端每收到一段就能立刻消费一段，而不是干等。理解 Stream 与背压，是写出"不卡内存的流式接口"的前提。

`res` 是 `http.ServerResponse`，它本身就是 `Writable`，所以前面那套 API 原样成立：`res.write(chunk)` 同样返回布尔值、同样要靠 `drain` 协调，`stream.pipe(res)` 只是把背压转交给了 `pipe`。手写流式响应时注意别提前设 `Content-Length`，交给 Node 用 `Transfer-Encoding: chunked` 分块传即可。

这件事的收益可以直接量出来（`npm run 05vsbuffered` 第二段：同一份数据、每块间隔 40ms，"拼完再发"与"边产生边发"各请求一次）：

| 接口写法 | 首字节到达 | 全部读完 |
|----------|------------|----------|
| 先拼进内存再 `res.end` | **814ms**（几乎等于总耗时） | 816ms |
| 每产生一块就 `res.write` | **4ms** | 733ms |

实测输出（`npm run 05vsbuffered` 第二段，同一份数据、每块间隔 40ms）：

```
  [/all] 服务端攒够 1250 字节才发出第一枪
  [/all] 首字节 814ms，全部读完 816ms
  [/stream] 首字节 4ms，全部读完 733ms

  同一份数据、同样的产生节奏：
  /all    要等数据全部产生完（约 600ms）客户端才拿到第一个字节
  /stream 首字节几乎瞬间到达，客户端能边收边渲染（日志、进度、大文件下载都靠它）
```

两种写法的总耗时差不多，**差的是首字节**：前者客户端要干等近 0.8 秒才见到第一个字，后者几毫秒就开始收到。日志滚动、进度条、大模型流式回复靠的都是这个差别——把"等待"变成"边出边看"。

## 落地到 fs：读、写、目录与遍历

Buffer 和 Stream 讲完，把它们落到最常用的 `fs` 模块上。`fs` 提供文件读写、目录操作等能力，常用 API 如下：

> 摘自 `./code/node-basics/src/05-fs-dir.js`（运行：`npm run 05fs`）

```javascript
const fs = require('node:fs/promises')
const path = require('node:path')
// …
async function prepareSamples() {
    await fs.mkdir(SAMPLE_DIR, { recursive: true })
    for (const f of SAMPLE_FILES) {
        await fs.writeFile(path.join(SAMPLE_DIR, f.name), f.content, 'utf8')
    }
}
// …
const entries = await fs.readdir(dir, { withFileTypes: true })
// …
const buf = await fs.readFile(full) // 读成 Buffer，便于同时拿到字节数与首行
// …
await fs.rm(SAMPLE_DIR, { recursive: true, force: true })
```

注意 `fs.stat` 的 `isFile()` / `isDirectory()` 能判断路径类型，配合 `size` 字段可以统计文件体积。

### 同步版本为什么不能上高并发路径

每个 API 都有 `*Sync` 同步版本（如 `readFileSync`）。它们会**阻塞事件循环**直到 I/O 完成——期间整个进程什么异步任务都处理不了。在高并发的服务接口里，一次同步读盘就能让所有请求一起卡住，所以同步版本只适合启动初始化、CLI 工具这类不在请求热路径上的场景。

### fs/promises 与回调版的取舍

`fs` 有两套异步风格：老式**回调版**（`fs.readFile(path, cb)`）和 **Promise 版**（`node:fs/promises`，用 `await`）。

- 回调版在深层嵌套时容易"回调地狱"，新代码基本不写。
- `fs/promises` 配合 `async/await` 可读性最好，还能用 `try/catch` 统一兜底，是现在的主流选择。

> 示意片段（无配套脚本）

```javascript
const fs = require('node:fs/promises')

async function copy(src, dest) {
    try {
        const content = await fs.readFile(src, 'utf8')
        await fs.writeFile(dest, content)
    } catch (err) {
        console.error('文件操作失败:', err.message) // try/catch 能一次性兜住所有 await 的失败
    }
}
```

### 综合例子：扫描资源目录并统计大小

目录遍历有两种常见写法。一种是递归（自己处理子目录），另一种更推荐——用 `fs.readdir` 加 `withFileTypes`，拿到 `Dirent` 后判断类型，避免反复 `stat`：

> 摘自 `./code/node-basics/src/05-fs-dir.js`（运行：`npm run 05fs`）

```javascript
async function scanMarkdown(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    // 只保留普通文件，且后缀为 .md（大小写不敏感）
    const mdFiles = entries
        .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.md'))
        .map(e => e.name)
        .sort()

    let totalBytes = 0
    console.log(`=== 扫描目录：${dir} ===`)
    console.log(`找到 ${mdFiles.length} 个 .md 文件\n`)

    for (const name of mdFiles) {
        const full = path.join(dir, name)
        const buf = await fs.readFile(full) // 读成 Buffer，便于同时拿到字节数与首行
        const firstLine = buf.toString('utf8').split('\n')[0]
        totalBytes += buf.length
        console.log(`文件：${name}`)
        console.log(`  字节数：${buf.length}`)
        console.log(`  首行：${firstLine}\n`)
    }

    console.log('--- 汇总 ---')
    console.log(`文件总数：${mdFiles.length}`)
    console.log(`总字节数：${totalBytes}`)
    return { count: mdFiles.length, totalBytes }
}
// …
await scanMarkdown(SAMPLE_DIR)
```

这个例子把 `fs.readdir` + `withFileTypes`、`fs.stat`、`path.join` 串了起来，是文件批处理 / 静态资源扫描里的标准套路。

## 永远用 path.join 拼路径

不同操作系统路径分隔符不同（Linux 用 `/`，Windows 用 `\`）。手写 `'/'` 或 `'\\'` 会在跨平台时出问题，所以**永远用 `path` 模块拼路径**。`path` 还提供一串解析工具：

> 示意片段（无配套脚本）

```javascript
const path = require('node:path')

path.join('users', 'docs', 'file.txt')  // 跨平台拼接 → users/docs/file.txt
path.basename('/users/docs/file.txt')   // 'file.txt'（文件名）
path.dirname('/users/docs/file.txt')    // '/users/docs'（目录）
path.extname('/users/docs/file.txt')    // '.txt'（扩展名）
path.sep                                // 当前系统的分隔符（/ 或 \）

// path.parse 拆成结构化字段
path.parse('/users/docs/file.txt')
// → { root:'/', dir:'/users/docs', base:'file.txt', ext:'.txt', name:'file' }
```

### path.resolve 与 path.join 的区别

两者都拼路径，但语义不同：

- `path.join`：把若干段**按顺序拼接**成一个相对/绝对路径，只做拼接与规范化，不引入"当前工作目录"。
- `path.resolve`：从右往左拼，**遇到绝对路径就停下来**，并把结果解析成基于"当前工作目录"的绝对路径。相当于对每段依次做 `cd`。

> 示意片段（无配套脚本）

```javascript
path.join('a', 'b', 'c');     // 'a/b/c'（相对路径，纯拼接）
path.resolve('a', 'b', 'c');  // '/当前工作目录/a/b/c'（绝对路径，以 cwd 为基）
path.resolve('/etc', 'x');    // '/etc/x'（遇到绝对路径 /etc 即停止）
```

经验法则：只是拼一段路径用 `path.join`；要得到"从项目根出发的绝对路径"才用 `path.resolve`。

## 配套代码

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/node-basics/src/05-buffer.js` | Buffer 到底是什么：固定长度的字节序列 · 十六进制与字符串互转：从 hello 看字节 · Buffer.alloc 与 Buffer.from 的区别 · 字符长度 ≠ 字节长度：Content-Length 的坑 | Buffer 的创建与 `Uint8Array` 子类身份、三种解读视角（十六进制 / utf8 / base64）、`alloc` 清零 vs `from` 编码、字符长度与字节长度之差（`'你好'` 2 vs 6、`'中文abc'` 5 vs 9） |
| `./code/node-basics/src/05-stream-types.js` | Stream 是什么：一块一块地流动 · Stream 与 Buffer 的关系：水桶与水管 · 四种 Stream：一张表看明白 | 手写四种流的最小实现：`readableFlowing` 从 `null` 到 `true` 再到 `false`、`cork()` / `uncork()` 与 `writev` 合并、真实 TCP 两端的 Duplex、`transform()` / `flush()` / `objectMode`、`end()` 后再 `write()` 的报错码 |
| `./code/node-basics/src/05-stream-vs-buffered.js` | 实战：复制大文件 · 流式推送为什么必须用 Stream | 磁盘：`readFile` 同时在手 64MB vs `pipe` 只有 128KB（两种方式各起独立子进程，避免内存互相污染）；网络：`/all` 首字节 752ms vs `/stream` 4ms |
| `./code/node-basics/src/05-stream-flow-control.js` | 背压：Stream 真正高级的地方 · pipe 为什么重要，以及为什么更推荐 pipeline | 背压：`write()` 返回 `false` 时的 `writableLength` / `writableNeedDrain` 与 `drain` 恢复；`pipe` 出错不销毁链路 vs `pipeline` 统一销毁；`read → gzip → write` 多级链路 |
| `./code/node-basics/src/05-fs-dir.js` | 落地到 fs：读、写、目录与遍历 | `fs` 目录遍历 + `path` 组合路径 |

运行方式（`code/node-basics` 目录下）：`npm run 05types` / `npm run 05vsbuffered` / `npm run 05flow` / `npm run 05buffer` / `npm run 05fs`，脚本各自建临时文件并在结束时清理。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[异步编程与事件驱动](./异步编程与事件驱动.md)
- 下一篇：[进程、线程与优雅退出](./进程线程与优雅退出.md)

