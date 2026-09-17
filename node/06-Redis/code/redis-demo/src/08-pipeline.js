'use strict'

// 管道（Pipeline）：一次网络往返发送多条命令，用于批量写入与缓存预热
require('dotenv').config()
const redis = require('./client')

const PREFIX = 'demo:pipeline:'

// 模拟从数据库查出来的热点商品（真实场景换成 repository.find(...)）
function fakeHotProducts(count) {
    const list = []
    for (let i = 1; i <= count; i++) {
        list.push({ id: i, name: '商品' + i, price: 10 + i })
    }
    return list
}

// 缓存预热：用 Pipeline 把热点数据批量灌入 Redis
async function warmUpCache(products) {
    const pipeline = redis.pipeline() // 先攒在本地队列里，exec() 时才一次性发出
    for (const product of products) {
        const key = PREFIX + 'product:' + product.id
        const ttl = 3600 + Math.floor(Math.random() * 300) // 随机过期时间，避免大量 key 在同一刻集体失效
        pipeline.setex(key, ttl, JSON.stringify(product))
    }
    return pipeline.exec() // 返回 [[err, result], ...]，与命令顺序一一对应
}

async function main() {
    // ===== Pipeline：多条命令一次网络往返 =====
    console.log('\n===== Pipeline：批量发送命令，减少网络往返 =====')
    const pipeline = redis.pipeline()
    pipeline.set(PREFIX + 'key1', 'value1')
    pipeline.set(PREFIX + 'key2', 'value2')
    pipeline.get(PREFIX + 'key1')
    pipeline.incr(PREFIX + 'counter')
    const results = await pipeline.exec()
    console.log('exec() 返回：', JSON.stringify(results))

    // ===== 缓存预热：批量写入 + TTL 抖动 =====
    console.log('\n===== 缓存预热：Pipeline 批量写入 + TTL 抖动 =====')
    const products = fakeHotProducts(100)
    const t0 = Date.now()
    const warm = await warmUpCache(products)
    console.log(`预热完成：写入 ${warm.length} 条，耗时 ${Date.now() - t0}ms`)
    console.log('对比：逐条 await setex 要 100 次网络往返，Pipeline 只需 1 次。')

    // 抽样看几条 key 的 TTL，确认抖动生效
    const ttlSamples = []
    for (let i = 1; i <= 5; i++) {
        ttlSamples.push(await redis.ttl(PREFIX + 'product:' + i))
    }
    const spread = Math.max(...ttlSamples) - Math.min(...ttlSamples)
    console.log('抽样 TTL（5 条）：', ttlSamples.join('s, ') + 's')
    console.log('抖动跨度 =', spread, 's（若统一 TTL，跨度就是 0，会集体过期形成雪崩）')
}

main()
    .then(async () => {
        const keys = await redis.keys(PREFIX + '*')
        if (keys.length) await redis.del(keys)
        console.log('\n已清理预热 key。')
        await redis.quit()
    })
    .catch(async e => {
        console.error('执行出错：', e)
        await redis.quit()
        process.exit(1)
    })
