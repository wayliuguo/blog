// fs 关键操作：读、写、追加、目录遍历与清理（fs/promises 主流用法）
// 拼路径的工具用法（path.join）见上一节 path 模块，这里不再展开
const fs = require('node:fs/promises')
const path = require('node:path')

async function main() {
    // 1) 写文件：mkdir recursive 等价 mkdir -p，writeFile 整体写入
    const dir = path.join(__dirname, 'output')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'hello.txt'), '你好，fs！\n第二行\n', 'utf8')
    console.log('[写] hello.txt 已写入')

    // 2) 读文件：readFile 整体读出，传 'utf8' 得到字符串（不传则得到 Buffer）
    const content = await fs.readFile(path.join(dir, 'hello.txt'), 'utf8')
    console.log('[读] 内容:', JSON.stringify(content))

    // 3) 追加：appendFile 不存在则创建、存在则追加
    await fs.appendFile(path.join(dir, 'hello.txt'), '第三行（追加）\n')
    console.log('[追加] appendFile 完成')

    // 4) 目录遍历：readdir + withFileTypes 拿 Dirent，isFile/isDirectory 判断类型，避免反复 stat
    await fs.writeFile(path.join(dir, 'data.json'), '{"ok":true}')
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const ent of entries) {
        console.log(`[遍历] ${ent.isDirectory() ? '[目录] ' : '[文件] '}${ent.name}`)
    }

    // 5) 清理：rm recursive + force
    await fs.rm(dir, { recursive: true, force: true })
    console.log('[清理] output/ 已删除')
}

main()
