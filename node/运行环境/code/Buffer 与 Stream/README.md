# Buffer 与 Stream

《Buffer 与 Stream》配套实验代码：Buffer 字节视角、四种 Stream 理解 demo、复制大文件三版本（手动背压 / pipe / pipeline）。

对应博客：`node/运行环境/Buffer 与 Stream.md`。

## 环境要求

- Node.js 18+
- 本目录 `package.json` 设了 `"type": "commonjs"`，`.js` 文件按 CommonJS 解析
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `src/buffer.js` | Buffer 是什么、三种解读视角、`alloc` vs `from`、字节 vs 字符 | `npm run buffer` | `'你好'.length=2` 但字节长度=6（UTF-8 每字 3 字节）；`<Buffer 68 65 6c 6c 6f>` vs `toString('hex')` / `'base64'`；`alloc(5)` 是全 0、`from('hello')` 是原内容；`Buffer.isBuffer('你好')` 为 `false` |
| `src/stream-types.js` | 四种 Stream 各一个最小理解 demo：Readable / Writable / Duplex / Transform | `npm run types` | Readable：`push` 出块0/块1/块2 后 `[end]`；Writable：消费 2 块后 `[finish]`（`writableFinished=true`）；Duplex：写侧 `write('ping')`、读侧收到 `echo:ping`；Transform：`hello + world` → `HELLOWORLD\|END`（`transform` 转大写、`flush` 补收尾） |
| `src/copy-manual/copy-manual.js` | 复制大文件版本一：完全手动，亲手实现背压闭环 | `npm run copy-manual` | 读取共享源文件 `src/source.txt`，复制为 `copy-manual/copy-manual.txt`；**只打印背压**：每触发一次打一行 `第 N 次背压：write() 返回 false（写侧积压 64KB ≥ 上限 16KB）→ pause()`；文件太小会提示未触发 |
| `src/copy-pipe/copy-pipe.js` | 复制大文件版本二：pipe，背压自动协调 | `npm run copy-pipe` | `rs.pipe(ws)` 复制，监听 `drain` 打印背压：每行 `第 N 次背压（pipe 自动 pause/resume，无需手写）`；次数与源文件块数一致 |
| `src/copy-pipeline/copy-pipeline.js` | 复制大文件版本三：pipeline，await 一次收尾 | `npm run copy-pipeline` | `await pipeline(rs, ws)` 复制，监听 `drain` 打印背压：每行 `第 N 次背压（pipeline 内部自动 pause/resume）` |

## 源文件与产物

- `src/source.txt` 是 copy 三版本**共享的复制源文件**，内容可自行修改——写大一点背压就多（每 64KB 一块，写侧缓冲上限 16KB，约 1MB 会触发 16 次背压；文件太小可能一次都不触发，脚本会提示）。
- 复制产物 `copy-manual/copy-manual.txt`、`copy-pipe/copy-pipe.txt`、`copy-pipeline/copy-pipeline.txt` 保留不删除，已通过 `.gitignore` 排除入库。

## 为什么值得跑一遍

- `buffer` 的“2 个字符 6 个字节”会直接纠正“字符串长度 = 字节长度”的错觉，这是写分包协议的根；
- `stream-types` 一份文件把四种流各摆一个最小 demo，十几行看清每种流“是什么形状”；
- `copy-manual` 亲手跑一遍「`write()` 返回 `false` → `pause()` → `drain` → `resume()`」的背压闭环；再跑 `copy-pipe` / `copy-pipeline`，看清同样的复制在 pipe / pipeline 里如何"全自动"。

## 注意事项

- copy 三版本不建临时文件，直接读写 `src/source.txt` 与各自产物。
