// 05 四种 Stream 的最小实现：看清「读 / 写 / 双向 / 转换」各自有哪些 API
// 对应文档《Buffer 与 Stream》→「Stream 是什么」「Stream 与 Buffer 的关系」「四种 Stream」
// 四段演示：
//  1) Readable：只生产数据 —— read()/push()，data→end→close 事件，readableFlowing 三种取值
//  2) Writable：只消费数据 —— write()/end()/cork()，writableLength、finish 事件
//  3) Duplex：既读又写 —— 真实世界的 Duplex 就是 TCP Socket（两端各有一套收发能力）
//  4) Transform：边过边改 —— transform()/this.push()/flush()，以及 objectMode
// 运行命令：node src/05-stream-types.js

const { Readable, Writable, Duplex, Transform, PassThrough } = require('node:stream')
const net = require('node:net')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const title = t => console.log(`\n=== ${t} ===`)

// ---------- 1) Readable：只生产数据 ----------
async function part1Readable() {
    title('1) Readable（只读）：自己 push，消费者拿 data')
    let n = 0
    let ended
    const done = new Promise(r => (ended = r))

    const source = new Readable({
        // read() 是「消费者来要货」时被调用的地方：往里 push 一块，块与块之间可以异步
        read() {
            if (n < 3) {
                this.push(Buffer.from(`块${n};`))
                n += 1
            } else {
                this.push(null) // push(null) = 数据源结束，之后触发 'end'
            }
        }
    })

    // 关键属性：刚创建时 readableFlowing = null，表示"还没决定用哪种方式读"
    console.log(`  创建后 readableFlowing = ${source.readableFlowing}（null：未定）`)
    console.log(`  readableHighWaterMark = ${source.readableHighWaterMark}（读侧内部缓冲上限，通用默认 16KB）`)

    const chunks = []
    source.on('data', c => chunks.push(c))
    console.log(`  注册 data 后 readableFlowing = ${source.readableFlowing}（true：流动模式，自动读）`)

    source.on('end', () => {
        console.log(
            `  [end] readableEnded=${source.readableEnded}，收到 ${chunks.length} 个 chunk：${chunks
                .map(String)
                .join('')}`
        )
        source.pause()
        console.log(`  pause() 后 readableFlowing = ${source.readableFlowing}（false：暂停模式，resume() 可切回）`)
        ended()
    })
    source.on('close', () => console.log(`  [close] destroyed=${source.destroyed}`))
    await done
}

// ---------- 2) Writable：只消费数据 ----------
async function part2Writable() {
    title('2) Writable（只写）：自己 write，底层负责落盘/发网')
    const calls = []
    const sink = new Writable({
        highWaterMark: 32,
        // write() 是「这条数据拿去处理」的地方，处理完必须 callback() 通知流可以继续
        write(chunk, encoding, callback) {
            calls.push(`write(${chunk.length}B)`)
            setTimeout(callback, 20) // 模拟真实的异步落盘
        },
        // 实现了 writev 的流（net.Socket、fs.WriteStream 都有），cork 期间攒下的小块能合并成一次系统调用
        writev(chunks, callback) {
            calls.push(`writev(${chunks.reduce((a, c) => a + c.chunk.length, 0)}B，${chunks.length} 块合一)`)
            setTimeout(callback, 20)
        }
    })

    sink.write('aaaa') // 4 字节，没有 cork 时每条各自触发一次底层 write
    sink.write('bbbb')
    console.log(`  未 cork 时写入 2 条，writableLength = ${sink.writableLength}（还在内部缓冲里没落盘）`)
    await sleep(60)
    console.log(`  底层实际被调用：${calls.join(' → ')}`)

    const before = calls.length
    sink.cork() // 攒着：接下来的小写入先不交给底层
    sink.write('c')
    sink.write('d')
    sink.write('e')
    console.log(`  cork() 期间写入 3 条，底层新增调用 = ${calls.length - before}（攒在内存里）`)
    sink.uncork() // 一次性交给底层
    await sleep(60)
    console.log(`  uncork() 后底层新增调用 = ${calls.length - before} → ${calls.slice(before).join('')}`)

    await new Promise(r => {
        sink.on('finish', () => {
            console.log(
                `  [finish] 缓冲全部落盘，writableFinished=${sink.writableFinished}、writableEnded=${sink.writableEnded}`
            )
            r()
        })
        sink.end()
    })

    // end() 之后不能再写：错误是通过 'error' 事件异步抛出的
    const w2 = new Writable({
        write(c, e, cb) {
            cb()
        }
    })
    w2.on('error', e => console.log(`  end() 后再 write() → ${e.code}：${e.message}`))
    w2.end()
    w2.write('x')
    await sleep(30)
}

// ---------- 3) Duplex：既读又写 ----------
async function part3Duplex() {
    title('3) Duplex（双向）：两侧各有一套 API 和缓冲，真实世界典型就是 TCP Socket')
    const d = new Duplex({
        read() {
            this.push(null)
        },
        write(c, e, cb) {
            cb()
        }
    })
    console.log(`  合成一个 Duplex：读侧 hwm=${d.readableHighWaterMark}、写侧 hwm=${d.writableHighWaterMark}`)
    console.log(`  allowHalfOpen 默认 = ${d.allowHalfOpen}（true：读侧 EOF 后写侧不自动关，即 TCP 半关闭语义）`)

    // 真实世界的 Duplex：TCP 连接的两端，同一个 socket 对象上既能 on('data') 收、也能 write() 发
    const server = net.createServer(socket => {
        console.log(
            `  服务端 socket：readable=${socket.readable} writable=${socket.writable} allowHalfOpen=${socket.allowHalfOpen}`
        )
        socket.on('data', chunk => socket.write(`收到「${chunk.toString().trim()}」`))
        socket.on('error', () => {})
    })
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    const client = net.connect(server.address().port, '127.0.0.1')
    const echo = await new Promise(resolve => {
        client.on('data', chunk => resolve(chunk.toString()))
        client.write('ping\n') // 同一个 socket 上写出去，再从它的 data 事件读回来
    })
    console.log(`  客户端 socket 收到回声：${echo}`)
    client.end()
    await new Promise(r => server.close(r))
}

// ---------- 4) Transform：边过边改 ----------
async function part4Transform() {
    title('4) Transform（双向 + 转换）：读进来改一下再送出去')
    const out = []
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
    upper.on('data', c => out.push(c.toString()))
    const upperDone = new Promise(r => upper.on('end', r))
    upper.write('hello ')
    upper.write('world')
    upper.end()
    await upperDone
    console.log(`  transform() 转大写 → 输入 hello/world 得到 "${out.join('')}"`)

    // objectMode：chunk 不再是 Buffer，而是任意 JS 值
    const objT = new Transform({
        objectMode: true,
        transform(o, encoding, callback) {
            callback(null, { n: o.n, doubled: o.n * 2 })
        }
    })
    const seen = []
    objT.on('data', o => seen.push(o))
    const objDone = new Promise(r => objT.on('end', r))
    objT.write({ n: 1 })
    objT.write({ n: 2 })
    objT.end()
    await objDone
    console.log(`  objectMode=true 时 chunk 是对象：${JSON.stringify(seen)}（读写两侧都变成对象流）`)

    // PassThrough 是 Transform 的零转换特例：不做改动，原样透传
    console.log(
        `  PassThrough instanceof Transform = ${
            new PassThrough() instanceof Transform
        }（零转换，常用于"插一脚"观测数据）`
    )
    console.log(`  四种流的关系：Readable / Writable 各自单向，Duplex = 两者叠加，Transform = Duplex + 转换`)
}

;(async () => {
    await part1Readable()
    await part2Writable()
    await part3Duplex()
    await part4Transform()
})()
