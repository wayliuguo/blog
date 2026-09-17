// 04 事件驱动：用事件总线把“执行”与“观测”解耦
const { EventEmitter } = require('node:events')

const task = new EventEmitter()

// 观测层：各自 on 监听，互不影响（业务主流程不 import 它们）
task.on('task:start', ({ jobId }) => console.log(`[日志] 任务开始 jobId=${jobId}`))
task.on('task:dispatch', ({ name }) => console.log(`[监控] 调用外部服务：${name}`))
task.on('task:finish', ({ summary }) => console.log(`[状态] 完成：${summary}`))

function callPartnerApi(input) {
    return new Promise(resolve => setTimeout(() => resolve(`result-of-${input.jobId}`), 50))
}

async function runTask(input) {
    task.emit('task:start', { jobId: input.jobId })
    const result = await callPartnerApi(input) // 调用外部服务
    task.emit('task:dispatch', { name: 'callPartnerApi' })
    task.emit('task:finish', { summary: result })
}

;(async () => {
    await runTask({ jobId: 42 })
})()
