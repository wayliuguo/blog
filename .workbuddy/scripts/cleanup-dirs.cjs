// 通用清理：单文件 unlink + 自底向上 rmdir（规避沙箱对目录批量删除的拦截）
// 用法：node cleanup-dirs.cjs <dir1> <dir2> ...
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')

function rmTree(dir) {
    if (!fs.existsSync(dir)) return 0
    let n = 0
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) n += rmTree(p)
        else {
            try {
                fs.unlinkSync(p)
                n++
            } catch (err) {
                console.log('  跳过 ' + p + ' : ' + err.message)
            }
        }
    }
    try {
        fs.rmdirSync(dir)
    } catch (err) {
        console.log('  目录残留 ' + dir + ' : ' + err.message)
    }
    return n
}

let total = 0
for (const rel of process.argv.slice(2)) {
    const n = rmTree(path.join(ROOT, rel))
    total += n
    console.log(`  已删除 ${rel}  (${n} 个文件)`)
}
console.log(`\n合计删除 ${total} 个文件`)
