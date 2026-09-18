'use strict'

// Lua 脚本：把「判断库存 + 扣减」这类多条命令打包，在 Redis 内原子执行
require('dotenv').config()
const redis = require('./client')

const PREFIX = 'demo:lua:'

// 扣减库存并检查：库存不足返回 0，扣减成功返回 1
const stockScript = `
    local stock = redis.call('GET', KEYS[1])
    if not stock or tonumber(stock) <= 0 then
        return 0
    end
    redis.call('DECR', KEYS[1])
    return 1
`

async function main() {
    const stockKey = PREFIX + 'product:1001:stock'
    await redis.set(stockKey, 2)

    console.log('\n===== Lua 脚本：判断 + 扣减库存的原子性 =====')
    console.log('初始库存 =', await redis.get(stockKey))
    for (let i = 1; i <= 3; i++) {
        const result = await redis.eval(stockScript, 1, stockKey)
        console.log(`第 ${i} 次扣减：result = ${result}`, result === 1 ? '（扣减成功）' : '（库存不足，未扣减）')
    }
    console.log('剩余库存 =', await redis.get(stockKey))
    console.log('说明：判断与扣减之间不会被其它命令插入，多实例并发下也不会超卖。')
}

main()
    .then(async () => {
        const keys = await redis.keys(PREFIX + '*')
        if (keys.length) await redis.del(keys)
        console.log('\n已清理库存 key。')
        await redis.quit()
    })
    .catch(async e => {
        console.error('执行出错：', e)
        await redis.quit()
        process.exit(1)
    })
