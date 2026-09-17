// 05 一次性读完 vs 流式搬运：同一个道理在磁盘和网络上的两种战场
// 对应文档《Buffer 与 Stream》→「实战：复制大文件」「流式推送为什么必须用 Stream」
// 两段演示：
//  1) 磁盘：复制 64MB 文件 —— readFile+writeFile（整文件进内存）对比 createReadStream().pipe()（分块，内存恒定）
//     两种方式各起一个子进程来测，保证内存指标不被上一次实验污染
//  2) 网络：HTTP 推送 —— 先拼完再 end（客户端干等）对比边产生边 res.write（首字节立刻到）
// 运行命令：node src/05-stream-vs-buffered.js

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { once } = require('node:events')
const { spawnSync } = require('node:child_process')

const SIZE = 64 * 1024 * 1024 // 64MB
const CHUNK = 1024 * 1024 // 1MB 一块
const TMP = path.join(os.tmpdir(), 'node-basics-05-stream')
const SRC = path.join(TMP, 'source.bin')
const OUT_ALL = path.join(TMP, 'out-readfile.bin')
const OUT_STREAM = path.join(TMP, 'out-pipe.bin')

// 子进程模式：只做一次复制并汇报自己的内存指标
const COPY_MODE = (process.argv.find(a => a.startsWith('--copy=')) || '').split('=')[1]

const sleep = ms => new Promise(r => setTimeout(r, ms))
const mb = n => `${(n / 1024 / 1024).toFixed(1)}MB`
const kb = n => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)}KB` : mb(n))

// 采样器：每 intervalMs 调一次 getValue()，stop() 返回期间峰值
function peakOf(getValue, intervalMs = 2) {
    let peak = getValue()
    const id = setInterval(() => {
        peak = Math.max(peak, getValue())
    }, intervalMs)
    return {
        stop: () => {
            clearInterval(id)
            return peak
        }
    }
}

// 造一个 64MB 的临时文件：自己也是分块写的，否则"造数据"这个动作先把内存顶满了
async function makeSource() {
    const ws = fs.createWriteStream(SRC)
    const buf = Buffer.alloc(CHUNK, 1)
    let written = 0
    while (written < SIZE) {
        if (!ws.write(buf)) await once(ws, 'drain') // 写侧也有背压，缓冲满了就等 drain
        written += CHUNK
    }
    ws.end()
    await once(ws, 'finish')
}

// ---------- 子进程：真正的复制动作 ----------
async function copyOnce(mode) {
    console.log(`\n  ── 子进程 ${mode}（独立进程，内存基数干净）──`)
    const memPeak = peakOf(() => process.memoryUsage().rss)
    const t0 = Date.now()
    let heldDescription

    if (mode === 'readfile') {
        // 反例：整文件读进内存。从 readFile 返回那一刻起，这 64MB 被 data 引用着、一直在手里
        const data = await fs.promises.readFile(SRC)
        const held = peakOf(() => data.length)
        await fs.promises.writeFile(OUT_ALL, data)
        heldDescription = `${mb(held.stop())} —— 整份数据都在 data 变量里，文件多大就占多大`
    } else {
        // 正例：pipe 分块搬。流自己记着内部缓冲里压着多少字节，这就是"同时握在手里的数据量"
        const rs = fs.createReadStream(SRC)
        const ws = fs.createWriteStream(OUT_STREAM)
        const held = peakOf(() => rs.readableLength + ws.writableLength, 1)
        rs.pipe(ws)
        await once(ws, 'finish')
        heldDescription =
            `${kb(held.stop())} —— 读侧缓冲（上限 ${kb(rs.readableHighWaterMark)}）` +
            ` + 写侧缓冲（上限 ${kb(ws.writableHighWaterMark)}）`
    }

    console.log(`     耗时 ${Date.now() - t0}ms`)
    console.log(`     同时握在手里的数据：${heldDescription}`)
    console.log(`     峰值 RSS：${mb(memPeak.stop())}`)
}

// ---------- 1) 磁盘：复制大文件 ----------
async function diskCopy() {
    console.log('\n=== 1) 磁盘：复制大文件（一次性 vs 流式）===\n')
    console.log(`源文件 ${mb(SIZE)} @ ${SRC}`)

    // 每种方式单独起进程，否则前一次留下的 64MB 会让第二次的峰值失真
    for (const mode of ['readfile', 'pipe']) {
        const r = spawnSync(process.execPath, [__filename, `--copy=${mode}`], { stdio: 'inherit' })
        if (r.status !== 0) throw new Error(`子进程 ${mode} 退出码 ${r.status}`)
    }

    const a = (await fs.promises.stat(OUT_ALL)).size
    const b = (await fs.promises.stat(OUT_STREAM)).size
    console.log(`\n  两种方式结果一致：${a === SIZE && b === SIZE}（${a} / ${b} 字节）`)
    console.log('  readFile 的占用 ≈ 整个文件大小；pipe 的占用只与两侧的高水位有关')
    console.log('  所以文件越大差距越悬殊：10GB 视频走 readFile 会直接把进程撑爆')
}

// ---------- 2) 网络：一次性返回 vs 流式推送 ----------
async function httpPush() {
    console.log('\n=== 2) 网络：HTTP 推送（拼完再发 vs 边产生边发）===\n')
    const BLOCKS = 15
    const GAP = 40 // 每块数据"产生"耗时 40ms，总计约 600ms
    const piece = i => `第 ${i} 块日志：${'x'.repeat(64)}\n`

    const server = http.createServer(async (req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')

        if (req.url === '/all') {
            // 反例：先把全部数据在内存里拼完，再一次性 res.end
            const parts = []
            for (let i = 0; i < BLOCKS; i++) {
                parts.push(piece(i))
                await sleep(GAP)
            }
            const body = parts.join('')
            console.log(`  [/all] 服务端攒够 ${Buffer.byteLength(body)} 字节才发出第一枪`)
            res.end(body)
            return
        }

        // 正例：每产生一块就立刻 write 出去；res 本身就是 Writable Stream，同样受背压保护
        for (let i = 0; i < BLOCKS; i++) {
            if (!res.write(piece(i))) await once(res, 'drain') // write 返回 false 就等 drain
            await sleep(GAP)
        }
        res.end()
    })

    await new Promise(r => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${server.address().port}`

    for (const url of ['/all', '/stream']) {
        const t0 = Date.now()
        const resp = await fetch(base + url) // 收到响应头的那一刻
        const ttfb = Date.now() - t0
        await resp.text() // 再把响应体读完
        const total = Date.now() - t0
        console.log(`  [${url}] 首字节 ${ttfb}ms，全部读完 ${total}ms`)
    }

    console.log('\n  同一份数据、同样的产生节奏：')
    console.log(`  /all    要等数据全部产生完（约 ${BLOCKS * GAP}ms）客户端才拿到第一个字节`)
    console.log('  /stream 首字节几乎瞬间到达，客户端能边收边渲染（日志、进度、大文件下载都靠它）')
    server.close()
}

;(async () => {
    if (COPY_MODE) {
        await copyOnce(COPY_MODE)
        return
    }
    await fs.promises.mkdir(TMP, { recursive: true })
    try {
        await makeSource()
        await diskCopy()
        await httpPush()
    } finally {
        await fs.promises.rm(TMP, { recursive: true, force: true })
        console.log(`\n已清理临时目录：${TMP}`)
    }
})()
