// 04 async/await 只是“看起来”同步，底层仍是非阻塞 I/O
function later(ms, value) {
    return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

console.log('0: 调用前（同步代码）')
;(async () => {
    console.log('1: 进入 async 函数')
    const r = await later(30, '结果')
    console.log('3: 拿到 await 结果：', r)
})()
console.log('2: async 函数之后的同步代码（先跑完，不会被 await 阻塞）')
