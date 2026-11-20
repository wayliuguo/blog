// 实战：复制大文件 —— 版本二：pipe，背压自动协调
// 对应文档《Buffer 与 Stream》→「实战：复制大文件（背压版）· 版本二」
// rs.pipe(ws) 接上后：ws.write() 返回 false 时 pipe 自动 pause 上游，drain 后自动 resume。
// 我们无法在 write() 返回 false 的瞬间插手，改为监听写流的 drain——
// 每次 drain 都代表 pipe 自动执行了一次「pause → resume」背压闭环。
// 只打印背压，不做其他输出。运行命令：npm run copy-pipe

const fs = require('node:fs')
const path = require('node:path')
const { once } = require('node:events')

const SRC = path.join(__dirname, '..', 'source.txt')
const DST = path.join(__dirname, 'copy-pipe.txt') // 复制产物：保留，不入库（见 .gitignore）

async function main() {
    const rs = fs.createReadStream(SRC)
    const ws = fs.createWriteStream(DST)
    let count = 0

    ws.on('drain', () => {
        count += 1
        console.log(`第 ${count} 次背压（pipe 自动 pause/resume，无需手写）`)
    })

    rs.pipe(ws) // 接上即自动协调背压，我们只管等 finish
    await once(ws, 'finish')

    if (count === 0) {
        console.log('文件太小，未触发背压——把 source.txt 写大一点再试')
    }
}

main()
