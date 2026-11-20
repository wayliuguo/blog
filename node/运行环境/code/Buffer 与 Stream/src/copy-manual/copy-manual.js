// 实战：复制大文件 —— 版本一：完全手动，亲手实现背压闭环
// 对应文档《Buffer 与 Stream》→「实战：复制大文件（背压版）· 版本一」
// 源文件 src/source.txt 是现成的（内容你来写，足够大即可触发背压），复制为 copy-manual.txt
// 读侧每块 64KB，写侧缓冲上限 16KB：ws.write() 返回 false → rs.pause()，缓冲排空触发 drain → rs.resume()
// 只打印背压，不做其他输出。运行命令：npm run copy-manual

const fs = require('node:fs')
const path = require('node:path')
const { once } = require('node:events')

const SRC = path.join(__dirname, '..', 'source.txt') // 源文件：内容你来写，足够大即可触发背压
const DST = path.join(__dirname, 'copy-manual.txt') // 复制产物：保留，不入库（见 .gitignore）

const kb = n => `${(n / 1024).toFixed(0)}KB`

async function main() {
    const rs = fs.createReadStream(SRC) // 每块 64KB（readableHighWaterMark 默认值）
    const ws = fs.createWriteStream(DST) // 写侧缓冲上限 16KB（writableHighWaterMark 默认值）
    let count = 0

    rs.on('data', chunk => {
        if (!ws.write(chunk)) {
            count += 1
            // write() 返回 false 的瞬间就是背压发生的瞬间，只打印这个
            console.log(
                `第 ${count} 次背压：write() 返回 false（写侧积压 ${kb(ws.writableLength)} ≥ 上限 ${kb(
                    ws.writableHighWaterMark
                )}）→ pause() 暂停读侧`
            )
            rs.pause() // 上游刹车，数据不再推过来
            ws.once('drain', () => rs.resume()) // 缓冲排空，恢复搬运
        }
    })
    rs.on('end', () => ws.end()) // 读侧数据全部交付后，关闭写侧（否则 finish 永远不会触发）
    await once(ws, 'finish')

    if (count === 0) {
        console.log('文件太小，未触发背压（读侧每块 64KB，写侧缓冲上限 16KB）——把 source.txt 写大一点再试')
    }
}

main()
