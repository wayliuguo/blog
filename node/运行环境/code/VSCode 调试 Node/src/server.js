// 四种调试入口共用的调试目标：一个最小 HTTP 服务。
// 启动：node src/server.js（普通启动）
//   或  node --inspect src/server.js（开 inspect 端口，供 attach）
// 触发断点：另开终端 curl http://127.0.0.1:3000/sum —— 调试器在场时，reduce 里打的断点会停住
const http = require('node:http')

const orders = [
    { id: 1, amount: 120 },
    { id: 2, amount: 80 },
    { id: 3, amount: 300 }
]

const server = http.createServer((req, res) => {
    // 调试时把断点打在这一行（调试器在场时，请求进来会停住）
    const total = orders.reduce((sum, o) => {
        return sum + o.amount
    }, 0)
    console.log('[req]', req.url, '→ total =', total)
    res.end(`total = ${total}\n`)
})

server.listen(3000, () => console.log('listening on http://127.0.0.1:3000'))
