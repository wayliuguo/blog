// fork：spawn('node', [子模块]) 的语法糖，额外自动建立 IPC 通道，专门创建 Node 子进程
const { fork } = require('node:child_process')
const path = require('node:path')

// fork(modulePath)：子进程侧用 process.on('message') 收、process.send 回
const child = fork(path.join(__dirname, 'fork-child.js'))
child.on('message', msg => {
    console.log('父进程收到子进程消息:', msg)
    child.send({ from: 'parent', text: '收到你的问候' }) // 回一句让子进程退出
})
child.on('exit', code => {
    console.log('fork 子进程退出码:', code)
})
child.send({ from: 'parent', text: '你好，子进程' })
