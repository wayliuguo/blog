// 04 EventEmitter：事件驱动的骨架
const { EventEmitter } = require('node:events')
const { spawnSync } = require('node:child_process')

// —— 片段一：基本用法 on / emit ——
const emitter = new EventEmitter()

emitter.on('message', msg => {
    console.log('收到消息：', msg)
})

emitter.emit('message', 'Hello Node')

// —— 片段二：error 事件没有监听器会崩溃；挂上监听器就能接住 ——
emitter.on('error', err => {
    console.error('捕获到错误，进程不会崩：', err.message)
})

emitter.emit('error', new Error('出事了')) // 被上面的监听器接住

// 下面用独立子进程演示“没有监听器”时会怎样（避免主进程真的崩溃）
const crashSrc = `
const { EventEmitter } = require('node:events')
const e = new EventEmitter()
e.emit('error', new Error('出事了'))   // 没有监听器 → 进程直接崩溃
`
const crash = spawnSync(process.execPath, ['-e', crashSrc])
console.log('无监听器时子进程退出码：', crash.status)
console.log('崩溃首行信息：', String(crash.stderr).split('\n')[0])

// —— 片段三：监听器泄漏（on 了不 off）——
function handle(chunk, id) {
    // 真实业务里这里会引用 id 对应的上下文对象
}

function bad(emitter, id) {
    emitter.on('data', chunk => handle(chunk, id))
}

function good(emitter, id) {
    const fn = chunk => handle(chunk, id)
    emitter.once('data', fn) // 触发一次后自动清理
}

const leak = new EventEmitter()
for (let i = 0; i < 15; i++) bad(leak, i)
console.log('反复 on 不 off 后 listenerCount：', leak.listenerCount('data'))

const clean = new EventEmitter()
good(clean, 1)
good(clean, 2)
console.log('用 once 后 listenerCount：', clean.listenerCount('data'))
