// 04 Callback：error-first 约定与回调地狱
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

// —— 片段一：error-first 约定（回调第一个参数永远是 error）——
const tmpFile = path.join(os.tmpdir(), '04-callback-hell-tmp.txt')
fs.writeFileSync(tmpFile, 'Hello from callback demo')

fs.readFile(tmpFile, 'utf8', (err, data) => {
    // 约定：err 为 null 表示成功，非 null 表示出错
    if (err) {
        console.error('读取失败：', err.message)
        return
    }
    console.log('读取成功，内容：', data)
})

// —— 片段二：回调地狱（每一步都依赖上一步，层层向右嵌套）——
function getUser(cb) {
    setTimeout(() => cb(null, { id: 1, name: 'Alice' }), 50)
}
function getOrders(user, cb) {
    setTimeout(() => cb(null, [`order-${user.id}`]), 50)
}
function getProducts(orders, cb) {
    setTimeout(() => cb(null, ['p1', 'p2']), 50)
}
function saveResult(products, cb) {
    setTimeout(() => cb(null, 'saved'), 50)
}

getUser((err, user) => {
    if (err) return console.error(err)
    getOrders(user, (err, orders) => {
        if (err) return console.error(err)
        getProducts(orders, (err, products) => {
            if (err) return console.error(err)
            saveResult(products, err => {
                if (err) return console.error(err)
                console.log('回调地狱：业务结果被挤到最右列，', products)
            })
        })
    })
})
