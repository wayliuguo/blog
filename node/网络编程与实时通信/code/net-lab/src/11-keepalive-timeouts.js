// 11 HTTP Keep-Alive 三个超时配置演示
// 关键硬约束：headersTimeout 必须 > keepAliveTimeout，否则会出现竞态导致 ECONNRESET / socket hang up
const http = require('node:http')

const server = http.createServer((req, res) => res.end('ok'))
server.keepAliveTimeout = 5000 // 5s 空闲后关连接
server.headersTimeout = 60000 // 必须 > keepAliveTimeout
server.requestTimeout = 30000 // 单请求最多 30s
server.listen(5001, () => {
    console.log('keepAliveTimeout  =', server.keepAliveTimeout)
    console.log('headersTimeout    =', server.headersTimeout)
    console.log('requestTimeout     =', server.requestTimeout)
    console.log('headersTimeout > keepAliveTimeout ?', server.headersTimeout > server.keepAliveTimeout)
    server.close()
    process.exit(0)
})
