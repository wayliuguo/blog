# Buffer 与 Stream：字节、背压与流式数据

## Buffer 到底是什么：固定长度的字节序列

Node.js 做服务端，面对的数据很多时候并不是字符串——而是图片、音频、视频、TCP 数据包、文件、压缩数据、加密数据。计算机底层真正处理的永远是 `byte`，Node.js 用 `Buffer` 来表示这些二进制字节数据。

官方定义里，Buffer 是一个**固定长度的字节序列**：创建时容量就定死了，不能无限往里加东西。现在（Node 4+）的 `Buffer` 已经是 JavaScript `Uint8Array` 的子类，所以它能和整个 TypedArray 体系互操作——`Buffer` 可以直接传给操作 `Uint8Array` 的 API，也能用 `ArrayBuffer` 的视图方法。

```javascript
const buf = Buffer.from('hello');

// Buffer 是 Uint8Array 的子类，能与 TypedArray 体系互操作
console.log(buf instanceof Uint8Array); // true
console.log(buf.length);                // 5（5 个字节）
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

```javascript
const buf = Buffer.from('hello');

console.log(buf);                 // <Buffer 68 65 6c 6c 6f>
console.log(buf.toString());      // 还原成字符串：hello
console.log(buf.toString('hex')); // 十六进制视角：68656c6c6f
console.log(buf.toString('base64')); // Base64 视角：aGVsbG8=
```

关键点：**字节本身没有编码，编码只是解读视角**。同一段字节，用 `'utf8'` 解读就是字符串，用 `'hex'` 解读就是十六进制串，用 `'base64'` 解读就是 Base64 串。这正是 `Buffer.from(str)` 与 `buf.toString()` 成对出现的原因。

### Buffer.alloc 与 Buffer.from 的区别

两者都能造出 Buffer，但语义不同：

- `Buffer.alloc(n)`：分配 **n 个字节并清零**，拿到的是一段干净的、全 0 的内存，适合作为"待填充的缓冲区"。
- `Buffer.from(x)`：从**已有的数据**构造——可以是字符串、数组、`ArrayBuffer` 等，不会清零，而是把现有内容编码进去。

```javascript
const zeroed = Buffer.alloc(5);
console.log(zeroed); // <Buffer 00 00 00 00 00>（已清零）

const fromStr = Buffer.from('hello');
console.log(fromStr); // <Buffer 68 65 6c 6c 6f>（从字符串编码而来）
```

安全提示：不要用 `Buffer(size)` 这种未清零的构造函数（旧写法），它残留的是堆上随机旧数据，可能泄漏敏感信息。需要空白缓冲就用 `Buffer.alloc`。

## 字符长度 ≠ 字节长度：Content-Length 的坑

这是 Buffer 与 String 最容易踩、也最该记住的区别：

```javascript
console.log('你好'.length);            // 2（字符数）
console.log(Buffer.from('你好').length); // 6（字节数，UTF-8 下每个汉字 3 字节）
```

`'你好'` 作为字符串只有 2 个字符，但按 UTF-8 编码成字节后占 6 个字节。**字符长度 ≠ 字节长度**。

结论很直接：当你要算 HTTP 响应头里的 `Content-Length`、要切分二进制协议帧、要限制上传体积时，必须用 `Buffer.length`（字节数），而不能用 `string.length`（字符数）。如果用字符长度去算内容长度——尤其是混入了中文、emoji 等占多字节的字符——`Content-Length` 会被算小，下游按错误长度截断，数据就乱了。

| 写法 | 含义 | 中英文混合时 |
|------|------|--------------|
| `'中文abc'.length` | 字符数 | 5（中2+英3） |
| `Buffer.from('中文abc').length` | 字节数 | 9（中3×2+英1×3） |

## Buffer 的五个应用场景

1. **文件读取**：`fs.readFile` 不指定 encoding 时，回调拿到的 `data` 就是 `Buffer`。
   ```javascript
   import fs from 'node:fs';

   fs.readFile('./avatar.png', (err, data) => {
     console.log(Buffer.isBuffer(data)); // true（未指定编码即返回 Buffer）
   });
   ```
2. **TCP Socket 的 `data` 事件**：网络收到的原始字节，回调里的 `chunk` 通常就是 `Buffer`。
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
   ```javascript
   const buf = Buffer.from('hello');
   console.log(buf.toString('base64')); // aGVsbG8=
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

```javascript
// Transform 最常用于"边过边改"：读进来转大写，再写出去
import { Transform } from 'node:stream';
import fs from 'node:fs';

const upper = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase()); // chunk 是 Buffer
    callback();
  },
});

fs.createReadStream('a.txt').pipe(upper).pipe(fs.createWriteStream('a.upper.txt'));
```

## 实战：复制大文件

先给一个"炸内存"版本——把整个文件读进来再写出去：

```javascript
import fs from 'node:fs/promises';

// 危险：大文件会整体进入内存
const data = await fs.readFile('./big.mp4');
await fs.writeFile('./copy.mp4', data);
```

再给 Stream 版本，内存占用恒定：

```javascript
import fs from 'node:fs';

const reader = fs.createReadStream('./big.mp4');
const writer = fs.createWriteStream('./copy.mp4');

reader.pipe(writer); // 一边读一边写，内存始终是几 KB 到几 MB
```

数据流是这样走的：

```
Disk ──▶ Buffer ──▶ Readable Stream ──▶ Writable Stream ──▶ Disk
```

`pipe` 把可读端和可写端接起来，数据从磁盘的一块 Buffer 流进可读流，再流进可写流写回磁盘，全程不把整文件搬进内存。

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

`createReadStream` 的 `highWaterMark` 参数（默认 64KB）决定了"缓冲到多大算到顶"——也就是背压的触发点。阈值越小，内存越省但搬运次数越多；阈值越大则相反。

```javascript
// highWaterMark 决定每次读的块大小，也决定背压触发点
const reader = fs.createReadStream('./big.iso', { highWaterMark: 64 * 1024 });
```

手写 `pause/resume` 很容易出错，绝大多数场景直接用 `pipe` 或 `pipeline`——它们内部已经自动协调了背压。

## pipe 为什么重要，以及为什么更推荐 pipeline

`readable.pipe(writable)` 不只是"把 A 的数据丢给 B"：它内部会自动协调读取速度、写入速度、缓存和背压。比起自己写 `on('data', chunk => socket.write(chunk))`，`pipe` 不会让你手滑写出内存泄漏，所以生产代码里通常优先用它。

但 `pipe()` 有个短板：**下游出错时，它不会自动销毁上游**。如果中间某个流抛错，上游流可能还挂着，文件描述符、Socket 都没释放，留下一堆悬挂的流。

因此更推荐 `pipeline()`（来自 `node:stream/promises`）。它会在任意一环出错时**统一销毁所有流并抛出错误**，还能顺序串联多个 Transform（比如"读 → 压缩 → 加密 → 写"）。生产代码里它比 `pipe` 更安全：

```javascript
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

// 任意一环出错都会统一销毁整条链路；还能顺序串多个 Transform
await pipeline(
  fs.createReadStream('./input.mp4'),
  createGzip(),
  fs.createWriteStream('./output.mp4.gz'),
);
```

一句话选型：**简单搬运用 `pipe` 即可；链路更长、需要错误兜底、或要串联多个转换时，用 `pipeline`**。

## 流式推送为什么必须用 Stream

服务端要把一段**持续产生**的数据推给客户端时——比如日志流、进度百分比、大文件传输、实时监控数据——如果用 `readFile` 或先拼成一个大字符串再一次性返回，就会又慢又占内存：客户端要等全部数据生成完才开始收到，期间服务端内存还被撑着。

正确做法是把数据源做成 Readable Stream，**边产生边推**：

```javascript
import fs from 'node:fs';

// 大文件边读边推，客户端立刻开始下载，服务端内存恒定
app.get('/download/:file', (req, res) => {
  const stream = fs.createReadStream(`./files/${req.params.file}`);
  stream.pipe(res); // res 本身就是一个 Writable Stream
});
```

把"日志 / 进度 / 大文件 / 监控数据"看成不断产出的 chunk，客户端每收到一段就能立刻消费一段，而不是干等。理解 Stream 与背压，是写出"不卡内存的流式接口"的前提。

## 落地到 fs：读、写、目录与遍历

Buffer 和 Stream 讲完，把它们落到最常用的 `fs` 模块上。`fs` 提供文件读写、目录操作等能力，常用 API 如下：

```javascript
import fs from 'node:fs/promises';

await fs.readFile('./a.txt', 'utf8');        // 读文件（指定编码返回字符串）
await fs.writeFile('./b.txt', 'hello', 'utf8'); // 写文件（覆盖）
await fs.mkdir('./logs', { recursive: true });  // 创建多级目录
const names = await fs.readdir('./logs');        // 列目录
const stat = await fs.stat('./b.txt');           // 查元信息（大小/时间/类型）
await fs.rm('./old', { recursive: true });       // 递归删除
```

注意 `fs.stat` 的 `isFile()` / `isDirectory()` 能判断路径类型，配合 `size` 字段可以统计文件体积。

### 同步版本为什么不能上高并发路径

每个 API 都有 `*Sync` 同步版本（如 `readFileSync`）。它们会**阻塞事件循环**直到 I/O 完成——期间整个进程什么异步任务都处理不了。在高并发的服务接口里，一次同步读盘就能让所有请求一起卡住，所以同步版本只适合启动初始化、CLI 工具这类不在请求热路径上的场景。

### fs/promises 与回调版的取舍

`fs` 有两套异步风格：老式**回调版**（`fs.readFile(path, cb)`）和 **Promise 版**（`node:fs/promises`，用 `await`）。

- 回调版在深层嵌套时容易"回调地狱"，新代码基本不写。
- `fs/promises` 配合 `async/await` 可读性最好，还能用 `try/catch` 统一兜底，是现在的主流选择。

```javascript
import fs from 'node:fs/promises';

try {
  const content = await fs.readFile('./a.txt', 'utf8');
  await fs.writeFile('./b.txt', content);
} catch (err) {
  console.error('文件操作失败:', err.message);
}
```

### 综合例子：扫描资源目录并统计大小

目录遍历有两种常见写法。一种是递归（自己处理子目录），另一种更推荐——用 `fs.readdir` 加 `withFileTypes`，拿到 `Dirent` 后判断类型，避免反复 `stat`：

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';

// 扫描一个资源目录，统计每个文件的大小与总字节数
async function scanDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const full = path.join(dir, entry.name); // 永远用 path.join 拼路径
    if (entry.isDirectory()) {
      total += await scanDir(full);          // 递归进子目录
    } else if (entry.isFile()) {
      const stat = await fs.stat(full);
      total += stat.size;
      console.log(`${full}  ${stat.size} 字节`);
    }
  }
  return total;
}

const sum = await scanDir('./public');
console.log(`资源目录总大小：${sum} 字节`);
```

这个例子把 `fs.readdir` + `withFileTypes`、`fs.stat`、`path.join` 串了起来，是文件批处理 / 静态资源扫描里的标准套路。

## 永远用 path.join 拼路径

不同操作系统路径分隔符不同（Linux 用 `/`，Windows 用 `\`）。手写 `'/'` 或 `'\\'` 会在跨平台时出问题，所以**永远用 `path` 模块拼路径**。`path` 还提供一串解析工具：

```javascript
import path from 'node:path';

path.join('users', 'docs', 'file.txt');  // 跨平台拼接 → users/docs/file.txt
path.basename('/users/docs/file.txt');   // 'file.txt'（文件名）
path.dirname('/users/docs/file.txt');    // '/users/docs'（目录）
path.extname('/users/docs/file.txt');    // '.txt'（扩展名）
path.sep;                                // 当前系统的分隔符（/ 或 \）

// path.parse 拆成结构化字段
path.parse('/users/docs/file.txt');
// → { root:'/', dir:'/users/docs', base:'file.txt', ext:'.txt', name:'file' }
```

### path.resolve 与 path.join 的区别

两者都拼路径，但语义不同：

- `path.join`：把若干段**按顺序拼接**成一个相对/绝对路径，只做拼接与规范化，不引入"当前工作目录"。
- `path.resolve`：从右往左拼，**遇到绝对路径就停下来**，并把结果解析成基于"当前工作目录"的绝对路径。相当于对每段依次做 `cd`。

```javascript
path.join('a', 'b', 'c');     // 'a/b/c'（相对路径，纯拼接）
path.resolve('a', 'b', 'c');  // '/当前工作目录/a/b/c'（绝对路径，以 cwd 为基）
path.resolve('/etc', 'x');    // '/etc/x'（遇到绝对路径 /etc 即停止）
```

经验法则：只是拼一段路径用 `path.join`；要得到"从项目根出发的绝对路径"才用 `path.resolve`。

## 小结

- **Buffer 的内存模型与"编码只是视角"**
  - **固定长度的字节序列**：容量在创建时就定死，不能无限追加；Node 4+ 的 `Buffer` 是 `Uint8Array` 的子类，能与整个 TypedArray 体系互操作（`buf instanceof Uint8Array` 为 `true`）
  - **字节本身没有编码**：`Buffer.from('hello')` 打印成 `<Buffer 68 65 6c 6c 6f>`，正好是 ASCII 的 `h e l l o`、每个字母一字节；同一段字节用 `'utf8'` / `'hex'` / `'base64'` 解读分别得到 `hello` / `68656c6c6f` / `aGVsbG8=`，这正是 `Buffer.from(str)` 与 `buf.toString()` 成对出现的原因
  - **`Buffer.alloc(n)` 与 `Buffer.from(x)` 的区别**：`alloc(n)` 分配 n 个字节并清零，适合作为待填充的缓冲区；`from(x)` 从已有数据（字符串、数组、`ArrayBuffer`）编码而来，不清零；不要用未清零的 `Buffer(size)` 旧构造，它残留堆上的随机旧数据、可能泄漏敏感信息
- **字符长度 ≠ 字节长度（`Content-Length` 的坑）**
  - **基本差异**：`'你好'.length` 是 2（字符数），`Buffer.from('你好').length` 是 6（UTF-8 下每个汉字 3 字节）
  - **中英混合**：`'中文abc'.length` 是 5，对应字节数是 9（中 3×2 + 英 1×3）
  - **结论**：算 HTTP 响应头的 `Content-Length`、切分二进制协议帧、限制上传体积时，必须用 `Buffer.length`（字节数）而不是 `string.length`（字符数），否则长度会被算小、下游按错误长度截断导致数据错乱
- **Buffer 的五个应用场景**
  1. **文件读取**：`fs.readFile` 不指定 encoding 时，回调拿到的 `data` 就是 `Buffer`
  2. **TCP Socket 的 `data` 事件**：网络收到的原始字节，`chunk` 通常就是 `Buffer`
  3. **图片 / 音频 / 视频**：JPEG、PNG、MP3、MP4 本质都是二进制字节流
  4. **加密**：明文先变成 `Buffer`，交给 `AES` / `RSA` 处理，产出的密文也是 `Buffer`
  5. **Base64 编解码**：把任意二进制安全地塞进只认文本的协议（邮件、JSON、Data URL）
- **Stream 的本质，以及它与 Buffer 的关系**
  - **一块一块地搬**：`fs.readFile` 读 10GB 视频意味着整个文件进内存、进程直接被撑爆；Stream 一次只搬一小块（通常 64KB），内存占用始终维持在几十 KB 到几 MB
  - **水桶与水管**：`Buffer` 是一块数据（水桶里装的那桶水），`Stream` 是数据的运输方式（水管）；Stream 不断输送一个又一个 Buffer chunk——没有 Buffer 就没东西可运，没有 Stream 就只能整块整块堆在内存里
- **四种 Stream**
  1. **`Readable`（只读）**：只生产数据，如 `fs.createReadStream('./a.txt')`、HTTP 请求体
  2. **`Writable`（只写）**：只消费数据，如 `fs.createWriteStream('./b.txt')`、HTTP 响应
  3. **`Duplex`（双向）**：同时可读可写，**典型是 TCP Socket**
  4. **`Transform`（双向 + 转换）**：`Duplex` 的一种，输入经过"转换"再输出，如 `gzip` 压缩、加解密、数据格式转换
- **Stream 的工程实践：复制、背压与 `pipe` / `pipeline`**
  - **复制大文件必须用 Stream**：`fs.readFile` + `fs.writeFile` 会把整个文件读进内存、大文件直接 OOM；`createReadStream` 配 `pipe` 到 `createWriteStream` 后数据沿 `Disk → Buffer → Readable Stream → Writable Stream → Disk` 流动，内存恒定在几 KB 到几 MB
  - **背压是 Stream 真正高级的地方**：速度不匹配时（磁盘 500MB/s、网络 10MB/s），`writable.write(chunk)` 返回 `true` 表示内部缓冲未到阈值可继续写、返回 `false` 表示**缓冲已达上限、调用方应暂停读取**，否则内存照样涨到 OOM；缓冲降下来后触发 `'drain'` 事件再恢复写入，闭环是 `write() 返回 false → pause → 缓冲下降 → 'drain' → resume`
  - **`highWaterMark` 决定背压触发点**：`createReadStream` 的 `highWaterMark` 默认 64KB，阈值越小内存越省但搬运次数越多；手写 `pause` / `resume` 容易出错，直接用 `pipe` / `pipeline`，它们内部已自动协调背压
  - **`pipe` 与 `pipeline` 的取舍**：`pipe` 会自动协调读取速度、写入速度、缓存与背压，但**下游出错时不会自动销毁上游**，可能留下悬挂的流与未释放的文件描述符、Socket；`pipeline`（`node:stream/promises`）在任意一环出错时统一销毁所有流并抛出错误，还能顺序串联多个 Transform（读 → 压缩 → 加密 → 写）——简单搬运用 `pipe`，链路更长、需要错误兜底或串联多个转换时用 `pipeline`
- **流式推送为什么必须用 Stream**
  - **问题**：日志流、进度百分比、大文件传输、实时监控数据这类**持续产生**的数据，用 `readFile` 或先拼成大字符串再一次性返回，会让客户端干等到全部生成完、服务端内存还被撑着
  - **做法**：把数据源做成 Readable Stream 边产生边推，客户端每收到一段就消费一段；`res` 本身就是 `Writable` Stream，`stream.pipe(res)` 即可
- **落地 `fs` 与 `path`：读写、目录遍历与拼路径**
  - **`fs` 的三种风格**：老式回调版（深层嵌套易成回调地狱）、`fs/promises`（配 `async/await` 与 `try/catch` 统一兜底，现在的主流）、`*Sync` 同步版——同步版会**阻塞事件循环**直到 I/O 完成，只适合启动初始化、CLI 这类不在请求热路径上的场景
  - **常用 API**：`readFile` / `writeFile` / `mkdir({ recursive: true })` / `readdir`（配 `withFileTypes` 拿 `Dirent` 判断类型，避免反复 `stat`）/ `stat`（`isFile()` / `isDirectory()` 与 `size`）/ `rm({ recursive: true })`
  - **拼路径永远用 `path.join`**：手写 `'/'` 或 `'\\'` 在跨平台（Linux `/`、Windows `\`）时必翻车；`basename` / `dirname` / `extname` / `parse` 能把路径拆成结构化字段，`path.sep` 给出当前系统分隔符
  - **`path.resolve` 与 `path.join` 的区别**：`join` 只按顺序拼接并规范化，不引入当前工作目录；`resolve` 从右往左拼、**遇到绝对路径就停下来**，并把结果解析成基于 cwd 的绝对路径（相当于对每段依次 `cd`）——只是拼路径用 `join`，要"从项目根出发的绝对路径"才用 `resolve`

## 配套代码

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/node-basics/src/05-buffer.js` | 字符长度 ≠ 字节长度：Content-Length 的坑 | Buffer 的创建、十六进制输出、与字符串的字节数差异、Base64 |
| `./code/node-basics/src/05-stream-copy.js` | 实战：复制大文件 | 用 Stream 复制大文件：内存占用恒定 |
| `./code/node-basics/src/05-backpressure.js` | 背压：Stream 真正高级的地方 | 背压：下游消费慢时上游自动暂停，`write()` 返回 `false` 与 `drain` |
| `./code/node-basics/src/05-stream-pipeline.js` | pipe 为什么重要，以及为什么更推荐 pipeline | `pipe` 与 `pipeline` 的差别，以及 `pipeline` 如何统一销毁错误链路 |
| `./code/node-basics/src/05-fs-dir.js` | 落地到 fs：读、写、目录与遍历 | `fs` 目录遍历 + `path` 组合路径 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[异步编程与事件驱动](./04-异步编程与事件驱动.md)
- 下一篇：[进程、线程与优雅退出](./06-进程线程与优雅退出.md)
