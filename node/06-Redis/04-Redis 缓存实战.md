# Redis 缓存实战

> 承上：[Redis 基础与数据类型](./01-Redis%20基础与数据类型) 与 [Node.js 操作 Redis](./03-Node.js%20操作%20Redis) —— 先懂数据类型与会用 ioredis，才能落地缓存模式与问题排查
> 启下：[Redis 进阶](./05-Redis%20进阶) —— 基于哨兵或 Cluster 搭建高可用 Redis，并用 Bitmap/HyperLogLog/Stream 实现统计与消息队列

---

## 缓存场景实战

### 缓存热点数据

```typescript
async getHotProducts() {
    const cacheKey = 'hot:products'
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const products = await this.productRepository.find({
        where: { isHot: true },
        order: { sales: 'DESC' },
        take: 10
    })

    await this.redis.setex(cacheKey, 300, JSON.stringify(products))  // 5分钟过期
    return products
}
```

### 缓存过期策略

```typescript
// 定时过期：设置 TTL
await redis.setex('key', 3600, 'value')

// 惰性过期：访问时检查是否过期，过期则删除
// 定期过期：Redis 每隔 100ms 随机检查一批过期 key

// 主动更新：数据变更时删除缓存
async updateUser(id: number, data: Partial<User>) {
    await this.userRepository.update(id, data)
    await this.redis.del(`user:${id}`)  // 删除缓存，下次查询重新加载
}
```

---

## 缓存三大问题

### 缓存穿透

**问题**：查询一个不存在的数据，缓存没有，每次都穿透到数据库。

```typescript
// 解决方案 1：缓存空值
async getUser(id: number) {
    const cached = await this.redis.get(`user:${id}`)
    if (cached !== null) return JSON.parse(cached)  // 缓存了 null 值

    const user = await this.userRepository.findOneBy({ id })
    await this.redis.setex(`user:${id}`, 60, JSON.stringify(user || null))  // 空值也缓存
    return user
}

// 解决方案 2：布隆过滤器
// 在查询前先判断 key 是否可能存在
// 使用 Redisson 的 RBloomFilter 或自定义实现
```

### 缓存击穿

**问题**：缓存过期瞬间，大量请求同时访问同一个热点 key，直接打到数据库。

```typescript
// 解决方案：互斥锁
async getHotProduct(id: number) {
    const cacheKey = `product:${id}`
    let product = await this.redis.get(cacheKey)
    if (product) return JSON.parse(product)

    // 尝试获取锁
    const lockKey = `lock:${cacheKey}`
    const lock = await this.redis.set(lockKey, '1', 'NX', 'EX', 10)
    if (!lock) {
        // 没获取到锁，等待重试
        await new Promise(resolve => setTimeout(resolve, 100))
        return this.getHotProduct(id)
    }

    // 获取到锁，查询数据库
    product = await this.productRepository.findOneBy({ id })
    await this.redis.setex(cacheKey, 3600, JSON.stringify(product))
    await this.redis.del(lockKey)  // 释放锁
    return product
}
```

### 缓存雪崩

**问题**：大量缓存同时过期，导致数据库压力暴增。

```typescript
// 解决方案 1：过期时间加随机值
await this.redis.setex(cacheKey, 3600 + Math.random() * 300, JSON.stringify(data))

// 解决方案 2：缓存预热
// 系统上线前，提前将热点数据加载到缓存

// 解决方案 3：多级缓存
// 本地缓存（如 node-cache）+ Redis 多级缓存

// 解决方案 4：限流降级
// 当缓存大面积失效时，对数据库请求进行限流
```

---

## 缓存更新策略

| 策略 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| Cache Aside | 读缓存，没有则查 DB 并回写；写 DB 后删缓存 | 简单，最常用 | 有短暂不一致 |
| Read/Write Through | 缓存层代理 DB 读写 | 一致性较好 | 实现复杂 |
| Write Behind | 异步批量写入 DB | 性能好 | 可能丢数据 |

### Cache Aside 模式（推荐）

```typescript
// 读
async read(key: string) {
    let data = await cache.get(key)
    if (!data) {
        data = await db.query(key)
        await cache.set(key, data, ttl)
    }
    return data
}

// 写（先写 DB，再删缓存）
async write(key: string, value: any) {
    await db.update(key, value)
    await cache.del(key)  // 删除缓存，而不是更新缓存
}
```

**为什么是删缓存而不是更新缓存？** 更新缓存是写操作，可能被多次无效更新浪费资源。删除缓存是懒加载，等下次读取时再回写。

---

## 生产场景：缓存预热

系统上线前或大促前，提前将热点数据加载到缓存，避免请求直接打到数据库。

```typescript
// 缓存预热脚本
async function warmUpCache() {
    // 1. 从数据库查询热点数据
    const hotProducts = await productRepository.find({
        where: { isHot: true },
        order: { sales: 'DESC' },
        take: 1000
    })

    // 2. 批量写入 Redis（使用 Pipeline 提高效率）
    const pipeline = redis.pipeline()
    for (const product of hotProducts) {
        const key = `product:${product.id}`
        const ttl = 3600 + Math.floor(Math.random() * 300)  // 随机过期时间
        pipeline.setex(key, ttl, JSON.stringify(product))
    }
    await pipeline.exec()

    console.log(`缓存预热完成，共加载 ${hotProducts.length} 条数据`)
}

// 大促前执行
// 预热时间：大促前 30 分钟
// 预热频率：每 5 分钟刷新一次热门数据
// 定时任务：cron 表达式
```

## 生产场景：全局 ID 生成器

```typescript
// 使用 Redis INCR 生成全局唯一 ID
// 适用场景：订单号、流水号、分布式 ID
class IdGenerator {
    private redis: Redis
    private prefix: string

    constructor(redis: Redis, prefix: string = 'idgen') {
        this.redis = redis
        this.prefix = prefix
    }

    // 生成 ID：前缀 + 日期 + 自增序列
    async nextId(bizType: string): Promise<string> {
        const today = new Date()
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
        const key = `${this.prefix}:${bizType}:${dateStr}`

        // 每天从 1 开始自增
        const seq = await this.redis.incr(key)

        // 设置过期时间，防止 key 堆积
        if (seq === 1) {
            await this.redis.expire(key, 86400 * 2)  // 2 天后过期
        }

        // 生成：ORDER20240101000001
        return `${bizType}${dateStr}${String(seq).padStart(6, '0')}`
    }
}

// 使用
const idGen = new IdGenerator(redis)
const orderId = await idGen.nextId('ORDER')  // ORDER20240101000001
```

---

## 分布式锁

### 使用 SET NX 实现

```typescript
async function acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    const result = await redis.set(`lock:${key}`, Date.now().toString(), 'NX', 'EX', ttl)
    return result === 'OK'
}

async function releaseLock(key: string, lockValue: string): Promise<void> {
    // 使用 Lua 脚本保证原子性：只释放自己的锁
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `
    await redis.eval(script, 1, `lock:${key}`, lockValue)
}
```

### 使用 Redlock 算法

Redlock 是 Redis 官方推荐的分布式锁算法，适用于多 Redis 节点的场景。

```typescript
// 需要至少 3 个独立的 Redis 节点
// 客户端依次向所有节点申请锁
// 半数以上节点成功，且总耗时 < TTL，才算获取成功
```

---

## 限流

### 滑动窗口限流

```typescript
// 使用 ZSet 实现滑动窗口限流
async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - windowMs

    // 移除窗口外的记录
    await redis.zremrangebyscore(key, 0, windowStart)

    // 获取当前窗口内的请求数
    const count = await redis.zcard(key)

    if (count >= limit) {
        return true  // 限流
    }

    // 添加当前请求
    await redis.zadd(key, now, `${now}`)
    await redis.expire(key, Math.ceil(windowMs / 1000))

    return false  // 放行
}
```

## 小结

- **热点数据缓存**：查缓存 → 未命中查库 → `setex` 回写；热点列表设 5 分钟这类短 TTL，避免长期存放脏数据
- **缓存过期的两个来源**：定时与惰性过期由 Redis 自己负责；数据变更时由业务主动 `del` 缓存，这是应用层的责任
- **缓存穿透与对策**：查不存在的数据每次都会打到库；要么缓存空值并给短 TTL，要么前置布隆过滤器
- **缓存击穿与对策**：热点 key 过期瞬间大量请求同时回源；用 `SET NX EX` 互斥锁只放一个请求查库，其余等待重试
- **缓存雪崩与对策**：大量 key 同一时刻过期；给 TTL 加随机值、提前缓存预热、本地加 Redis 多级缓存、对库请求限流降级
- **缓存更新策略与删缓存的原因**：Cache Aside 最常用，写路径是"先写库再删缓存"；更新缓存属于无效写操作，删缓存靠懒加载回写；Read/Write Through 一致性好但复杂，Write Behind 性能好但可能丢数据
- **缓存预热**：大促前 30 分钟用 Pipeline 批量灌入热点数据，TTL 带随机值，并按每 5 分钟一次的频率刷新
- **Redis INCR 做全局 ID**：格式为"前缀 + 日期 + 6 位自增"，首次 `incr` 返回 1 时设 2 天过期，防止 key 无限堆积
- **分布式锁与安全释放**：`SET lock:key <value> NX EX 10` 加锁，解锁必须用 Lua 比对 value 再删，否则会误删别人的锁；多节点场景用 Redlock 且要过半数成功
- **ZSet 滑动窗口限流**：`ZREMRANGEBYSCORE` 清掉窗口外记录 → `ZCARD` 判断是否超限 → `ZADD` 记录本次请求并给 key 设过期

---

## 配套代码

本篇的可运行示例在仓库 `node/06-Redis/code/redis-demo`。

| 文件 | 演示什么 |
| --- | --- |
| `03-cache.js` | 穿透 / 击穿 / 雪崩三种防护 |

运行方式见 `redis-demo/README.md`。

---

## 参考

- 本模块总结：[总结](../05-数据库/总结.md)
- 本模块面试题：[面试题](../05-数据库/面试题.md)
- 上一篇：[Node.js 操作 Redis](./03-Node.js%20操作%20Redis)
- 下一篇：[Redis 进阶](./05-Redis%20进阶)