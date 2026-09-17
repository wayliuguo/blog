// 12 背压对比：手写 on('data') + write（不检查返回值）与 pipe（自动协调）
// 同一份 2MB 数据、同一个慢速客户端，看「服务端发送缓冲峰值积压」差多少
// 运行方式：`npm run 12`，单文件自包含，跑完自动退出
const net = require('node:net')
const fs = require('node:fs')
const path = require('node:path')

const FILE = path.join(__dirname, 'pipe-vs-manual.tmp')
fs.writeFileSync(FILE, Buffer.alloc(4 * 1024 * 1024, 'x')) // 造一份 4MB 待发送数据

// 慢速客户端：先"不读" 800ms 让发送侧彻底堆起来，之后每收到一片再停 25ms
function slowClient(port, done) {
    const client = net.connect(port, '127.0.0.1')
    let bytes = 0
    client.on('data', chunk => {
        bytes += chunk.length
        client.pause()
        setTimeout(() => client.resume(), 25)
    })
    client.pause() // 立刻停读：内核接收缓冲与发送缓冲会先后填满
    setTimeout(() => client.resume(), 800)
    client.on('end', () => {
        client.end()
        done(bytes)
    })
    client.on('error', () => done(bytes))
}

function run(mode, next) {
    const server = net.createServer(socket => {
        socket.on('error', () => {})
        let peak = 0
        // 高频采样 socket.writableLength，记录发送缓冲积压的最高水位
        const watch = setInterval(() => {
            if (socket.writableLength > peak) peak = socket.writableLength
        }, 1)

        const rs = fs.createReadStream(FILE)
        if (mode === 'manual') {
            // 反例：write 返回 false 也不管，照样把下一片写进去
            rs.on('data', chunk => socket.write(chunk))
            rs.on('end', () => socket.end())
        } else {
            // 推荐写法：pipe 内部自动协调背压，无需手动管 write 返回值与 drain
            rs.pipe(socket)
        }

        socket.on('close', () => {
            clearInterval(watch)
            console.log(
                `  [${mode}] 发送缓冲峰值积压 ${(peak / 1024).toFixed(1)}KB` +
                    `（socket.writableHighWaterMark = ${(socket.writableHighWaterMark / 1024).toFixed(0)}KB）`
            )
            server.close()
            next()
        })
    })

    server.listen(0, '127.0.0.1', () => {
        const { port } = server.address()
        const t0 = Date.now()
        slowClient(port, bytes => {
            console.log(`  [${mode}] 客户端收全 ${bytes} 字节，耗时 ${Date.now() - t0}ms`)
        })
    })
}

// 兜底：万一某个环节没退出，30 秒后强制收尾，避免脚本挂住
setTimeout(() => {
    console.log('（兜底）30 秒超时，强制退出')
    fs.unlinkSync(FILE)
    process.exit(0)
}, 30000).unref()

console.log('同一份 4MB 数据，同一个「先停 800ms、之后每片歇 25ms」的慢速客户端：\n')
run('manual', () =>
    run('pipe', () => {
        console.log('\n结论：不检查 write 返回值的写法，积压随发送总量一路涨；')
        console.log('      pipe 只积压当前正在写的那一块，不随发送总量增长。')
        fs.unlinkSync(FILE)
        process.exit(0)
    })
)
