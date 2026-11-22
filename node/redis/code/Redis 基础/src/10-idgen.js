'use strict'

// 全局 ID 生成器：用 Redis INCR 生成「前缀 + 日期 + 自增序列」，首次自增时设置过期
require('dotenv').config()
const redis = require('./client')

const PREFIX = 'demo:idgen:'

// 生成 ID：前缀 + 日期 + 6 位自增序列，例如 ORDER20240101000001
async function nextId(bizType) {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const key = PREFIX + bizType + ':' + dateStr

    const seq = await redis.incr(key) // 每天从 1 开始自增
    if (seq === 1) {
        await redis.expire(key, 86400 * 2) // 首次自增时设 2 天过期，防止 key 无限堆积
    }

    return bizType + dateStr + String(seq).padStart(6, '0')
}

async function main() {
    console.log('\n===== 全局 ID 生成器：INCR + 日期 + 补零 =====')
    const ids = []
    for (let i = 0; i < 3; i++) {
        ids.push(await nextId('ORDER'))
    }
    console.log('连续生成 3 个订单号：', ids)

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const key = PREFIX + 'ORDER:' + dateStr
    console.log('计数器 key =', key, '，TTL =', await redis.ttl(key), 's')
    console.log('说明：INCR 是原子自增，多实例并发也不会拿到重复序号；首次自增设 TTL 可避免 key 堆积。')
}

main()
    .then(async () => {
        const keys = await redis.keys(PREFIX + '*')
        if (keys.length) await redis.del(keys)
        console.log('\n已清理 ID 计数器。')
        await redis.quit()
    })
    .catch(async e => {
        console.error('执行出错：', e)
        await redis.quit()
        process.exit(1)
    })
