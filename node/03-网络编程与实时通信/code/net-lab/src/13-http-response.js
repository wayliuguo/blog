// 13 三种响应写法对比：一次性带 Content-Length、分多次 write、流式 chunked
// 运行方式：`npm run 13`，单文件自包含，内部用 fetch 各请求一次后退出
const http = require('node:http')

const server = http.createServer((req, res) => {
    if (req.url === '/once') {
        // 响应体一次性算出来：可以提前给出 Content-Length
        const data = JSON.stringify({ users: [] })
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(data) // 必须是字节长度
        })
        res.end(data)
        return
    }

    if (req.url === '/chunks') {
        // 分多次 write，最后用 end() 收尾；没给 Content-Length，Node 改用 chunked
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.write('hello ')
        res.write('world')
        res.end() // 结束响应
        return
    }

    if (req.url === '/stream') {
        // 流式产生：开头算不出总长度，只能交给 Transfer-Encoding: chunked
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        let n = 0
        const timer = setInterval(() => {
            n += 1
            res.write(`第 ${n} 片\n`)
            if (n >= 3) {
                clearInterval(timer)
                res.end()
            }
        }, 40)
        return
    }

    res.writeHead(404)
    res.end('404 Not Found')
})

async function show(pathname) {
    const resp = await fetch(`http://127.0.0.1:3100${pathname}`)
    const text = await resp.text()
    console.log(`${pathname}`)
    console.log(`  Content-Length    : ${resp.headers.get('content-length')}`)
    console.log(`  Transfer-Encoding : ${resp.headers.get('transfer-encoding')}`)
    console.log(`  body              : ${JSON.stringify(text)}\n`)
}

server.listen(3100, async () => {
    console.log('响应写法对比服务已启动(3100)\n')
    await show('/once')
    await show('/chunks')
    await show('/stream')
    console.log(`'你好' 的字符长度 = ${'你好'.length}，字节长度 = ${Buffer.from('你好').length}`)
    server.close()
    process.exit(0)
})
