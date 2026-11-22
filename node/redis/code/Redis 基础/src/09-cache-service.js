'use strict'

// 缓存服务封装：JSON 序列化读写 + SET NX EX 分布式锁 + Cache-Aside 读写套路
require('dotenv').config()
const redis = require('./client')

const PREFIX = 'demo:service:'

// 模拟数据库（真实场景换成 repository / ORM）
const fakeDb = {
    'user:1': { id: 1, name: '张三', age: 28 }
}

// 模拟一次数据库查询
async function dbQuery(key) {
    return fakeDb[key] || null
}

// 模拟一次数据库更新
async function dbUpdate(key, value) {
    fakeDb[key] = value
}

// ===== 封装：业务侧只调这几个方法，不碰连接与序列化细节 =====
const cache = {
    // 读：自动反序列化，缓存里没有则返回 null
    async get(key) {
        const data = await redis.get(PREFIX + key)
        return data ? JSON.parse(data) : null
    },

    // 写：自动序列化；传了 ttl 用 SETEX，否则永久有效
    async set(key, value, ttl) {
        const data = JSON.stringify(value)
        if (ttl) {
            await redis.setex(PREFIX + key, ttl, data)
        } else {
            await redis.set(PREFIX + key, data)
        }
    },

    // 删：数据变更后让缓存失效，下次读取时再回源重建
    async del(key) {
        await redis.del(PREFIX + key)
    },

    // 加锁：SET key value NX EX 一条命令完成「不存在才写入 + 带过期时间」
    async lock(key, ttl = 10) {
        const result = await redis.set(PREFIX + 'lock:' + key, '1', 'NX', 'EX', ttl)
        return result === 'OK'
    },

    // 解锁：业务执行完就释放
    async unlock(key) {
        await redis.del(PREFIX + 'lock:' + key)
    }
}

// ===== Cache-Aside 读：查缓存 → 未命中查库并回写 =====
async function read(key, ttl) {
    const cached = await cache.get(key)
    if (cached) return cached
    const data = await dbQuery(key)
    if (data) await cache.set(key, data, ttl)
    return data
}

// ===== Cache-Aside 写：先写库，再删缓存（而不是更新缓存） =====
async function write(key, value) {
    await dbUpdate(key, value)
    await cache.del(key) // 删除缓存，而不是更新缓存：懒加载，下次读取时再回写
}

async function main() {
    console.log('\n===== 封装：JSON 读写与分布式锁 =====')
    await cache.set('user:1', { id: 1, name: '张三', age: 28 }, 60)
    console.log('写入后读回：', await cache.get('user:1'))

    const locked = await cache.lock('order:1001', 10)
    console.log('第一次加锁：', locked, '（返回 true，抢占成功）')
    const lockedAgain = await cache.lock('order:1001', 10)
    console.log('第二次加锁：', lockedAgain, '（返回 false，锁已被占用）')
    await cache.unlock('order:1001')

    console.log('\n===== Cache-Aside：读透与写失效 =====')
    console.log('第一次读（缓存未命中，查库并回写）：', await read('user:1', 60))
    console.log('第二次读（直接命中缓存）：', await read('user:1', 60))
    await write('user:1', { id: 1, name: '张三', age: 29 })
    console.log('先写库再删缓存，此时再读：', await read('user:1', 60), '（已回源到最新数据 age:29）')
}

main()
    .then(async () => {
        const keys = await redis.keys(PREFIX + '*')
        if (keys.length) await redis.del(keys)
        console.log('\n已清理缓存 key。')
        await redis.quit()
    })
    .catch(async e => {
        console.error('执行出错：', e)
        await redis.quit()
        process.exit(1)
    })
