// 实战：复制大文件 —— 版本三：pipeline，await 一次收尾
// 对应文档《Buffer 与 Stream》→「实战：复制大文件（背压版）· 版本三」
// await pipeline(...) 结束即整条链路完成，背压自动协调、出错统一销毁整条链路。
// 同样监听写流的 drain：每次 drain 都代表 pipeline 内部自动消化了一次背压。
// 只打印背压，不做其他输出。运行命令：npm run copy-pipeline

const fs = require('node:fs')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const { once } = require('node:events')

const SRC = path.join(__dirname, '..', 'source.txt')
const DST = path.join(__dirname, 'copy-pipeline.txt') // 复制产物：保留，不入库（见 .gitignore）

async function main() {
    const ws = fs.createWriteStream(DST)
    let count = 0

    ws.on('drain', () => {
        count += 1
        console.log(`第 ${count} 次背压（pipeline 内部自动 pause/resume）`)
    })

    await pipeline(fs.createReadStream(SRC), ws)

    if (count === 0) {
        console.log('文件太小，未触发背压——把 source.txt 写大一点再试')
    }
}

main()
