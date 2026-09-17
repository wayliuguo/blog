'use strict'

// 连接健康监控：PING 探活 + 解析 INFO，对连接数 / 内存 / 淘汰三类指标做阈值告警
require('dotenv').config()
const redis = require('./client')

// 把 INFO 返回的多行文本按字段名解析成结构化数据
function parseInfo(info) {
    const lines = info.split('\n')
    return {
        connectedClients: parseInt(lines.find(l => l.startsWith('connected_clients:'))?.split(':')[1] || '0'),
        usedMemory: parseInt(lines.find(l => l.startsWith('used_memory:'))?.split(':')[1] || '0'),
        evictedKeys: parseInt(lines.find(l => l.startsWith('evicted_keys:'))?.split(':')[1] || '0')
    }
}

// 三类告警阈值
const THRESHOLD = {
    connectedClients: 1000, // 连接数超过 1000 条告警
    usedMemory: 1024 * 1024 * 1024, // 内存超过 1GB 告警
    evictedKeys: 0 // 一旦出现淘汰就告警
}

// 采集一次并判断是否触发告警
async function checkOnce() {
    await redis.ping() // PING 探活，连接异常时会抛错
    const status = parseInfo(await redis.info())
    console.log('connected_clients =', status.connectedClients)
    console.log('used_memory       =', status.usedMemory, 'bytes')
    console.log('evicted_keys      =', status.evictedKeys)

    if (status.connectedClients > THRESHOLD.connectedClients) {
        console.error('告警：Redis 连接数过多:', status.connectedClients)
    }
    if (status.usedMemory > THRESHOLD.usedMemory) {
        console.error('告警：Redis 内存使用超过 1GB')
    }
    if (status.evictedKeys > THRESHOLD.evictedKeys) {
        console.warn('告警：Redis 触发了内存淘汰:', status.evictedKeys)
    }
}

async function main() {
    console.log('\n===== 连接健康监控：PING + INFO 解析 =====')
    await checkOnce()
    console.log('\n说明：生产环境把 checkOnce() 挂到 setInterval（如 30s 一次）上并接入告警通道；')
    console.log('      本脚本只演示单次采集与三类阈值判断。')
}

main()
    .then(async () => {
        await redis.quit()
    })
    .catch(async e => {
        console.error('执行出错：', e)
        await redis.quit()
        process.exit(1)
    })
