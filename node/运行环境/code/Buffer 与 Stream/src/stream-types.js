// 四种 Stream 的最小理解 demo：每种流用十几行看清它「是什么形状」
// 对应文档《Buffer 与 Stream》→「四种 Stream：一张表看明白」
// 运行命令：npm run types

const { Readable, Writable, Duplex, Transform } = require('node:stream')

const title = t => console.log(`\n=== ${t} ===`)

// ---------- 1) Readable：只生产数据 ----------
async function part1() {
    title('1) Readable（只读）：只管生产数据，消费者用 data 事件接')
    let n = 0
    const source = new Readable({
        // 消费者来要货时被调用：push 一块出去；push(null) 表示数据源结束
        read() {
            if (n < 3) {
                this.push(Buffer.from(`块${n} `))
                n += 1
            } else {
                this.push(null)
            }
        }
    })
    source.on('data', chunk => console.log(`  收到：${chunk.toString().trim()}`))
    await new Promise(r => source.on('end', r)) // 全部消费完触发 end
    console.log('  [end] 数据源结束')
}

// ---------- 2) Writable：只消费数据 ----------
async function part2() {
    title('2) Writable（只写）：只管消费数据，write() 进、finish 出')
    const sink = new Writable({
        // 每条数据被拿去"落盘/发网"的地方，处理完必须 callback() 通知流可以继续
        write(chunk, encoding, callback) {
            console.log(`  消费：${chunk.toString().trim()}`)
            setTimeout(callback, 10) // 模拟异步落盘
        }
    })
    sink.write('第一块')
    sink.write('第二块')
    await new Promise(r => {
        sink.on('finish', () => {
            console.log(`  [finish] 全部消费完（writableFinished=${sink.writableFinished}）`)
            r()
        })
        sink.end() // end() 表示不会再写了；之后再 write 会报错
    })
}

// ---------- 3) Duplex：读写两侧各有一套 ----------
async function part3() {
    title('3) Duplex（双向）：同一个对象上，读侧和写侧各有一套 API、互不干扰')
    const echo = new Duplex({
        read() {}, // 读侧的数据全靠写侧处理时 push 过来
        write(chunk, encoding, callback) {
            this.push(`echo:${chunk.toString().trim()}`) // 写侧收到的数据转手放进读侧
            callback()
        }
    })
    echo.on('data', chunk => console.log(`  读侧收到：${chunk.toString()}`))
    echo.write('ping') // 从写侧写入，读侧的 data 事件会收到处理结果
    await new Promise(r => setTimeout(r, 20))
    echo.end()
}

// ---------- 4) Transform：边过边改 ----------
async function part4() {
    title('4) Transform（双向 + 转换）：数据过一遍手，改完再送出去')
    const upper = new Transform({
        // 每收到一块输入调一次：this.push() 送出改好的数据，callback() 说明这块处理完了
        transform(chunk, encoding, callback) {
            this.push(chunk.toString().toUpperCase())
            callback()
        },
        // 所有输入处理完后调一次，用来补发收尾数据（可选实现）
        flush(callback) {
            this.push('|END')
            callback()
        }
    })
    const out = []
    upper.on('data', chunk => out.push(chunk.toString()))
    upper.write('hello')
    upper.write('world')
    upper.end()
    await new Promise(r => upper.on('end', r))
    console.log(`  输入 hello + world → 输出 "${out.join('')}"（transform 逐块转大写，flush 补收尾）`)
}

;(async () => {
    await part1()
    await part2()
    await part3()
    await part4()
})()
