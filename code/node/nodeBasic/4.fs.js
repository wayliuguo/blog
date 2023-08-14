/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')

/* fs.readFile(path.resolve('data.txt'), { encoding: 'utf-8' }, (err, data) => {
    console.log(data) // 我是一只程序猿
}) */

/* const options = {
    flag: 'a'
}
fs.writeFile(path.resolve('data.txt'), '我不是一只程序员', options, (err, data) => {
    if (!err) {
        console.log('操作成功')
    }
}) */

/* fs.appendFile(path.resolve('data.txt'), 'hello world', (err, data) => {
    console.log('追加成功')
}) */

/* fs.copyFile(path.resolve('data.txt'), 'test.txt', () => {
    console.log('拷贝成功')
}) */

/* fs.watchFile('data.txt', { interval: 20 }, (curr, prev) => {
    console.log(curr)
    console.log(prev)
    if (curr.mtime !== prev.mtime) {
        console.log('文件被修改了')
        fs.unwatchFile('data.txt')
    }
}) */

fs.open(path.resolve('bigFile.txt'), 'r', (err, fd) => {
    console.log(fd)
    fs.close(fd, () => {
        console.log('关闭成功')
    })
})
