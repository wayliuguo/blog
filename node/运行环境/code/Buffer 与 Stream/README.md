# Buffer 与 Stream

《Buffer 与 Stream》配套实验代码：Buffer 字节视角、四种 Stream 最小实现、流式 vs 缓冲对比、背压与 pipeline、fs 目录遍历。

对应博客：`node/运行环境/Buffer 与 Stream.md`。

## 环境要求

- Node.js 18+
- 本目录 `package.json` 设了 `"type": "commonjs"`，`.js` 文件按 CommonJS 解析
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `05-buffer.js` | Buffer 是什么、三种解读视角、`alloc` vs `from`、字节 vs 字符 | `npm run 05buffer` | `'你好'.length=2` 但字节长度=6（UTF-8 每字 3 字节）；`<Buffer 68 65 6c 6c 6f>` vs `toString('hex')` / `'base64'`；`alloc(5)` 是全 0、`from('hello')` 是原内容 |
| `05-stream-types.js` | 四种 Stream 的最小实现：Readable / Writable / Duplex / Transform | `npm run 05types` | `readableFlowing` 走 `null → true → false`；`cork()` 攒住 3 条小写入、`uncork()` 合并成一次 `writev`；真实 TCP 两端各自 `readable=true writable=true`；`Transform` 转大写 + `flush()` 补发；`end()` 后再 `write()` 报 `ERR_STREAM_WRITE_AFTER_END` |
| `05-stream-vs-buffered.js` | 一次性读完 vs 流式：磁盘复制 + HTTP 推送 | `npm run 05vsbuffered` | 磁盘段两种复制各起一个子进程测：`readFile` 同时握着 64MB，`pipe` 只有 128KB（读侧 64KB + 写侧 16KB 缓冲）；网络段 `/all` 首字节约 750ms、`/stream` 只有几毫秒；跑完自动清临时目录 |
| `05-stream-flow-control.js` | 背压 + `pipe` vs `pipeline` 的错误语义 | `npm run 05flow` | 背压段打印 `write()` 返回 `false` 时的 `writableLength` / `writableNeedDrain` 与 `drain` 恢复，100 条共刹车 16 次；`pipe` 出错时上下游都 `destroyed=false`，`pipeline` 出错时都 `destroyed=true`；末尾 `read → gzip → write` 多级链路 |
| `05-fs-dir.js` | 目录遍历 + 批量读 .md 文件 | `npm run 05fs` | 扫描 3 个 .md，逐文件打印「字节数 + 首行」，汇总总数/总字节；跑完自动清理临时目录 |

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `05-buffer.js` | `npm run 05buffer` | 四段：`buf.length=5` 且 `instanceof Uint8Array` 为 `true`；同一段字节三种视角分别得到 `<Buffer 68 65 6c 6c 6f>` / `68656c6c6f` / `hello` / `aGVsbG8=`；`Buffer.alloc(5)` 输出全 0、`Buffer.from('hello')` 输出原内容；`'你好'` 2 字符 vs 6 字节、`'中文abc'` 5 vs 9，`Buffer.isBuffer('你好')` 为 `false` |
| `05-stream-types.js` | `npm run 05types` | 四段：① Readable —— `readableFlowing` 依次为 `null` / `true`（注册 data 后）/ `false`（`pause()`），`[end]` 时 `readableEnded=true`、`[close]` 时 `destroyed=true`；② Writable —— 写 2 条后 `writableLength=8`，`cork()` 期间底层调用不增加、`uncork()` 后合并为一次 `writev(3B，3 块合一)`，`end()` 后再 `write()` 报 `ERR_STREAM_WRITE_AFTER_END`；③ Duplex —— 合成 Duplex 的 `allowHalfOpen` 默认 `true`，`net.createServer` 产出的 socket 是 `false`，客户端发 `ping` 收到回声；④ Transform —— 转大写得到 `HELLO WORLD\|收尾`，`objectMode` 下 chunk 是对象 |
| `05-stream-vs-buffered.js` | `npm run 05vsbuffered` | 磁盘段：`readFile+writeFile` 同时在手 64.0MB / 峰值 RSS 约 121MB，`createReadStream().pipe()` 同时在手 128KB / 峰值 RSS 约 76MB，两个副本字节数一致；网络段（15 块、每块间隔 40ms）：`/all` 首字节约 750ms ≈ 总耗时，`/stream` 首字节约 4ms、总耗时约 705ms；跑完删除 `os.tmpdir()` 下临时目录 |
| `05-stream-flow-control.js` | `npm run 05flow` | 背压段：第 7 条后 `write()` 返回 `false`（`writableLength=56B ≥ highWaterMark=50B`、`writableNeedDrain=true`），`drain` 后 `writableLength=0B`，100 条共 16 次背压/16 次 drain；对照段：`pipe` 出错后上下游 `destroyed=false`，`pipeline` 出错后上下游 `destroyed=true` 并抛出异常；末尾 `8.00MB → gzip → 8.0KB`；跑完删除临时目录 |
| `05-fs-dir.js` | `npm run 05fs` | 扫描出 3 个 `.md`，逐文件打印「字节数 + 首行」，末尾汇总「文件总数：3 / 总字节数：167」，跑完自动删临时目录 |

## 为什么值得跑一遍

- `05buffer` 的“2 个字符 6 个字节”会直接纠正“字符串长度 = 字节长度”的错觉，这是写分包协议的根；
- `05types` 一份文件把四种流摆在一起，`05vsbuffered` 用真实字节数（64MB vs 128KB）和真实首字节时间（750ms vs 4ms）证明「流式为什么省内存、为什么不用等」，`05flow` 把「背压怎么刹车、pipeline 为什么比 pipe 安全」变成可观测的输出。

## 注意事项

- `05-stream-vs-buffered.js` 会临时生成一个 64MB 文件并复制两份，运行结束后自动删除，不会污染仓库；内存对比之所以各起一个子进程，是因为同一进程里前一次实验留下的内存（以及还没回收的 Buffer）会让后一次测不准。
- `05-fs-dir.js` 在 `os.tmpdir()` 下自建示例目录并写入文件，不依赖仓库内任何文件；传 `keep` 参数可保留临时目录：`node src/05-fs-dir.js keep`。
- `05-stream-flow-control.js` 会在 `os.tmpdir()` 下自建 8MB 源文件（用于 `pipe` / `pipeline` 的出错对照与 gzip 链路），演示完自动删除；背压那一段不需要任何文件，纯内存演示。
