// 10 HTTPS 服务演示：把 http 换成 https，并带上 key（私钥）与 cert（证书）
// 证书由 openssl 现场生成（见 README）；生产环境 TLS 通常在网关终止，Node 跑内部明文 HTTP
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // 仅演示：跳过自签证书校验，便于 fetch 连上来

const https = require('node:https')
const fs = require('node:fs')

const server = https.createServer(
    {
        key: fs.readFileSync('./server.key'), // 私钥
        cert: fs.readFileSync('./server.cert') // 证书（含公钥）
    },
    (req, res) => {
        res.end('hello over TLS')
    }
)

server.listen(3443, async () => {
    console.log('HTTPS 服务已启动(3443)，内部用 fetch 走一次 TLS 握手验证...')
    const resp = await fetch('https://localhost:3443/')
    const text = await resp.text()
    console.log('TLS 握手成功，服务端返回：', text)
    server.close()
    process.exit(0)
})
