// 04 并行错误处理：Promise.all（快速失败）vs Promise.allSettled（各自独立）
function getUser(id) {
    return Promise.resolve({ id, name: 'Alice' })
}
function getReport(id) {
    return Promise.reject(new Error(`report ${id} 挂了`))
}
function queryInventory(id) {
    return Promise.resolve([{ sku: 'A' }])
}

// 片段一：Promise.all —— 任一 reject，整体立刻 reject，其余结果被丢弃
Promise.all([getUser(1), getReport(1), queryInventory(1)])
    .then(values => console.log('all 成功：', values))
    .catch(error => console.error('all 快速失败：', error.message))

// 片段二：Promise.allSettled —— 永不因失败而整体失败，逐项返回状态
Promise.allSettled([getUser(2), getReport(2), queryInventory(2)]).then(results => {
    console.log('allSettled：')
    for (const r of results) {
        if (r.status === 'fulfilled') console.log('  ✓', r.value)
        else console.log('  ✗', r.reason.message)
    }
})
