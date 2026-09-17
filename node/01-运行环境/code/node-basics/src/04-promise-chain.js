// 04 Promise：把嵌套拍平成链
function getUser() {
    return Promise.resolve({ id: 1, name: 'Alice' })
}
function getOrders(user) {
    return Promise.resolve([`order-${user.id}`])
}
function getProducts(orders) {
    return Promise.resolve(['p1', 'p2'])
}

// 链式调用：每个 .then 回传的 Promise 被自动展开
getUser()
    .then(user => getOrders(user)) // 返回新 Promise，自动往下传
    .then(orders => getProducts(orders))
    .then(products => {
        console.log('最终结果：', products)
    })
    .catch(error => {
        console.error('任一环节出错都会落到这里：', error.message)
    })
    .finally(() => {
        console.log('无论成功失败都执行（释放资源等）')
    })

// 错误传播：在 .then 里 throw 会被自动转成 rejected，catch 一定能接住
getUser()
    .then(() => {
        throw new Error('第 2 步炸了')
    })
    .then(() => console.log('这行不会执行'))
    .catch(error => console.error('接住错误：', error.message))
