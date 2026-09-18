// 05 流的控速与错误处理：背压怎么触发，pipe 与 pipeline 出错时差在哪
// 对应文档《Buffer 与 Stream》→「背压：Stream 真正高级的地方」「pipe 为什么重要，以及为什么更推荐 pipeline」
// 两段演示：
//  1) 背压：自定义一个消费很慢的 Writable，看 write() 返回 false、writableLength 堆积、drain 抬头的完整闭环
//  2) pipe vs pipeline：同样的错误，pipe 不会销毁上游，pipeline 会把整条链路统一销毁
// 运行命令：node src/05-stream-flow-control.js

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const zlib = require('node:zlib')
const { Writable, Transform } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const { once } = require('node:events')

const TMP = path.join(os.tmpdir(), 'node-basics-05-flow')
const SRC = path.join(TMP, 'source.bin')
const SZ = 8 * 1024 * 1024 // 8MB 源文件，够看清链路行为

const mb = n => `${(n / 1024 / 1024).toFixed(2)}MB`
const kb = n => (n < 1024 * 1024 ? `${(n / 1024).toFixed(1)}KB` : mb(n))

// ---------- 1) 背压 ----------
async function backpressure() {
    console.log('\n=== 1) 背压：生产快、消费慢 ===\n')
    const COUNT = 100
    const DELAY = 10 // 每条数据消费耗时 10ms

    // 消费很慢的自定义 Writable；highWaterMark 故意调得很小，让背压很快出现
    const slow = new Writable({
        highWaterMark: 50, // 写侧内部缓冲上限 50 字节
        write(chunk, encoding, callback) {
            setTimeout(() => callback(), DELAY) // 10ms 后才通知"这条处理完了"
        }
    })

    let i = 0
    let backpressureCount = 0
    let drainCount = 0

    // 规范的生产者写法：write() 返回 false 就停下，等 drain 再继续
    function pump() {
        while (i < COUNT) {
            const ok = slow.write(`第${i}条\n`)
            i += 1
            if (!ok) {
                backpressureCount += 1
                if (backpressureCount <= 2) {
                    console.log(`  第 ${i} 条之后 write() 返回 false：`)
                    console.log(
                        `    writableLength=${slow.writableLength}B ≥ highWaterMark=${slow.writableHighWaterMark}B，writableNeedDrain=${slow.writableNeedDrain}`
                    )
                    console.log('    → 上游应当暂停，否则内存照样被写爆')
                }
                slow.once('drain', () => {
                    drainCount += 1
                    if (drainCount <= 2) {
                        console.log(
                            `  drain 事件（第 ${drainCount} 次）：缓冲已排空 writableLength=${slow.writableLength}B，writableNeedDrain=${slow.writableNeedDrain} → 恢复写入`
                        )
                    }
                    pump()
                })
                return // 必须 return，否则会继续往满缓冲里硬塞
            }
        }
        slow.end()
    }

    const done = once(slow, 'finish')
    console.log(`  向慢速流写入 ${COUNT} 条数据（每条消费 ${DELAY}ms）...`)
    pump()
    await done
    console.log(`\n  全部写完：共触发背压 ${backpressureCount} 次、drain ${drainCount} 次`)
    const perItem = Buffer.byteLength('第0条\n')
    const perRound = Math.floor(slow.writableHighWaterMark / perItem)
    console.log(
        `  每条数据 8~10 字节，${slow.writableHighWaterMark}B 的缓冲每轮装得下约 ${perRound} 条，所以大约每 ${perRound} 条就刹车一次。`
    )
    console.log('  write() 的返回值 + drain 事件，就是 Node 给"生产快于消费"准备的刹车。')
}

// 一个会在第 n 块故意抛错的 Transform
function errorTransform(n) {
    let count = 0
    return new Transform({
        transform(chunk, encoding, callback) {
            count += 1
            if (count === n) return callback(new Error(`Transform 第 ${n} 块故意出错`))
            callback(null, chunk)
        }
    })
}

async function makeSource() {
    const ws = fs.createWriteStream(SRC)
    const buf = Buffer.alloc(64 * 1024, 1)
    for (let w = 0; w < SZ; w += buf.length) {
        if (!ws.write(buf)) await once(ws, 'drain')
    }
    ws.end()
    await once(ws, 'finish')
}

// ---------- 2) pipe 与 pipeline 的错误语义 ----------
async function pipeVsPipeline() {
    console.log('\n=== 2) pipe vs pipeline：出错时谁负责收拾现场 ===\n')

    // a) pipe：错误不会回传，上游读流依旧活着，需要自己监听每一环的 error 并手动销毁
    {
        console.log('  [pipe] 中间 Transform 抛错：')
        const rs = fs.createReadStream(SRC)
        const tr = errorTransform(2)
        const ws = fs.createWriteStream(path.join(TMP, 'pipe-err.bin'))
        rs.on('error', () => {})
        ws.on('error', () => {})
        rs.pipe(tr).pipe(ws) // pipe() 返回目标流，所以可以链式调用
        const err = await once(tr, 'error')
        console.log(`    捕获到：${err[0].message}`)
        await new Promise(r => setImmediate(r))
        console.log(`    上游 rs.destroyed = ${rs.destroyed}，下游 ws.destroyed = ${ws.destroyed}`)
        console.log('    —— 读写流都没被自动销毁，文件描述符还挂着：这就是 pipe 的短板，得自己补 error 处理')
        rs.destroy()
        ws.destroy()
    }

    // b) pipeline：任意一环出错，整条链路统一销毁并抛异常
    {
        console.log('\n  [pipeline] 同样的错误：')
        const rs = fs.createReadStream(SRC)
        const tr = errorTransform(2)
        const ws = fs.createWriteStream(path.join(TMP, 'pipeline-err.bin'))
        try {
            await pipeline(rs, tr, ws)
            console.log('    pipeline 竟未抛错（异常情况）')
        } catch (e) {
            console.log(`    pipeline 抛出：${e.message}`)
        }
        console.log(`    上游 rs.destroyed = ${rs.destroyed}，下游 ws.destroyed = ${ws.destroyed}`)
        console.log('    —— 整条链路被统一销毁，不会留下悬挂的流，所以生产代码优先用它')
    }

    // c) pipeline 串多级 Transform：读 → gzip 压缩 → 写
    {
        const dst = path.join(TMP, 'pipeline.gz')
        await pipeline(fs.createReadStream(SRC), zlib.createGzip(), fs.createWriteStream(dst))
        const size = (await fs.promises.stat(dst)).size
        console.log(`\n  [pipeline 多级链路] ${mb(SZ)} → gzip → ${kb(size)}（Transform 可以按顺序串好几级）`)
    }
}

;(async () => {
    await backpressure()
    await fs.promises.mkdir(TMP, { recursive: true })
    try {
        await makeSource()
        await pipeVsPipeline()
    } finally {
        await fs.promises.rm(TMP, { recursive: true, force: true })
        console.log(`\n已清理临时目录：${TMP}`)
    }
})()
