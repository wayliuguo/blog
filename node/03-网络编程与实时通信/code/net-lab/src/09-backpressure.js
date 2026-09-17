// 09 网络侧背压演示
// 服务端把 2MB 临时文件经 TCP 推给客户端，用来观察两件事：
//   1) pipe 自动协调生产与消费速度（推荐写法，背压由 pipe 托管）
//   2) socket.write() 的返回值（boolean）与 'drain' 事件（手写背压的信号）
// 客户端每收到一片就回传一片，用来演示 write 返回值与 drain；服务端读掉回传以免客户端缓冲被撑爆
const net = require('node:net')
const fs = require('node:fs')
const path = require('path')

const FILE = path.join(__dirname, 'big-file.tmp')
fs.writeFileSync(FILE, Buffer.alloc(2 * 1024 * 1024, 'x')) // 造一个 2MB 临时文件

const server = net.createServer(socket => {
    socket.on('data', () => {}) // 读掉客户端回传，避免其发送缓冲被撑爆
    // 推荐写法：pipe 内部自动协调背压，无需手动管 write 返回值与 drain
    fs.createReadStream(FILE).pipe(socket)
    socket.on('end', () => server.close())
})

server.listen(4100, () => {
    const client = net.connect(4100, '127.0.0.1')
    let bytes = 0
    client.on('drain', () => console.log('drain 事件：缓冲已排空，可继续生产'))
    client.on('data', c => {
        bytes += c.length
        // write 返回 boolean：false 表示内部缓冲已到阈值，应当暂停生产、等 drain
        const canContinue = client.write(c)
        if (!canContinue) console.log('  write 返回 false：内部缓冲到阈值，应等 drain')
    })
    client.on('end', () => {
        console.log(`客户端共收到 ${bytes} 字节（≈ 文件大小，背压下不丢数据）`)
        fs.unlinkSync(FILE)
        process.exit(0)
    })
})
