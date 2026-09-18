# Redis 缓存实战


---

## 缓存场景实战

本篇的代码块均取自配套脚本 `redis-demo`，采用 CommonJS 写法（`require(...)`）。

### 缓存热点数据

热点数据就是「查缓存 → 未命中查库 → 回写并设短 TTL」这套读写。配套脚本 `03-cache.js` 用一个约 100ms 的 `slowQuery` 模拟数据库，把命中前后的耗时都打了出来：

> 摘自 `./code/redis-demo/src/03-cache.js`（运行：`npm run cache`）

```javascript
    async function getProduct(id) {
        const cacheKey = PREFIX + 'product:' + id
        const cached = await redis.get(cacheKey)
        if (cached) return { data: JSON.parse(cached), hit: true }
        const db = await slowQuery(id)
        if (db) await redis.set(cacheKey, JSON.stringify(db), 'EX', 60) // 回写并设 TTL
        return { data: db, hit: false }
    }
```

热点列表这类数据给 5 分钟这种短 TTL（脚本里是 60 秒）即可，避免脏数据长期留在缓存里。

（本机无 Redis 服务、`redis-demo` 依赖也未安装，本篇脚本均未实跑。）

### 缓存过期策略

过期有两个来源：定时过期（写入时或事后设 TTL）与惰性/定期删除都由 Redis 负责，**数据变更时删缓存则是应用层的责任**。配套脚本 `02-expire.js` 把 `EXPIRE` / `TTL` / `PERSIST` / `SET ... EX` 的返回值都打了出来：

> 摘自 `./code/redis-demo/src/02-expire.js`（运行：`npm run expire`）

```javascript
    const k1 = PREFIX + 'a'
    await redis.set(k1, 'hello')
    await redis.expire(k1, 100) // 设置 100 秒过期
    console.log('EXPIRE 100 后 TTL =', await redis.ttl(k1), '(秒)')
// …
    await redis.persist(k1) // 取消过期
    console.log('PERSIST 后 TTL =', await redis.ttl(k1), '（-1 表示永不过期）')
// …
    const k2 = PREFIX + 'b'
    await redis.set(k2, 'world', 'EX', 200) // 写入时直接带过期
    console.log('SET ... EX 200 后 TTL =', await redis.ttl(k2), '(秒)')
```

惰性过期（访问到过期 key 才删）与定期过期（后台随机抽样一批检查）都是 Redis 自己的策略；业务侧要做的是「数据变更时 `del` 缓存，下次查询重新加载」——也就是下面 Cache Aside 的写路径。

（本机无 Redis 服务，以上脚本未实跑。）

---

## 缓存三大问题

### 缓存穿透

**问题**：查询一个不存在的数据，缓存没有，每次都穿透到数据库。

配套脚本 `03-cache.js` 里的做法是**缓存空值**：

> 摘自 `./code/redis-demo/src/03-cache.js`（运行：`npm run cache`）

```javascript
    const missKey = PREFIX + 'product:999'
    const cachedMiss = await redis.get(missKey)
    if (cachedMiss === null) {
        const db = await slowQuery(999) // 数据库也查不到
        if (db === null) {
            // 缓存空值（短 TTL），让后续相同请求直接命中空值，不再打到数据库
            await redis.set(missKey, JSON.stringify(null), 'EX', 60)
            console.log('查不存在的 id，回源为空，缓存空值 60s')
            console.log('补充：更彻底的方案是在入口用布隆过滤器拦截非法 id，永远不查库。')
        }
    } else {
        console.log('命中缓存空值，直接返回，不再访问数据库')
    }
```

注意存进去的是字符串 `'null'`（`JSON.stringify(null)`），所以下一次 `get` 拿到的是 `'null'` 而不是 `null`——`cachedMiss === null` 就自然区分了「没缓存」和「缓存了空值」。空值 TTL 要短（这里 60 秒），否则真数据出现后还要等它过期。

另一种更彻底的方案是**布隆过滤器**：在入口先判断 key 是否可能存在，不可能的 id 直接挡掉，永远不查库（可用 Redisson 的 `RBloomFilter` 或自定义实现）。

（本机无 Redis 服务，以上脚本未实跑。）

### 缓存击穿

**问题**：缓存过期瞬间，大量请求同时访问同一个热点 key，直接打到数据库。

解决方案是**互斥锁**：用 `SET NX EX` 只放一个请求去查库重建缓存，其余请求等待后重试。配套脚本 `03-cache.js` 把「抢到锁」和「没抢到锁」两条路径都跑了一遍：

> 摘自 `./code/redis-demo/src/03-cache.js`（运行：`npm run cache`）

```javascript
    async function getHotWithLock(requester) {
        const cached = await redis.get(hotKey)
        if (cached) {
            console.log(`  [${requester}] 命中缓存，直接返回`)
            return
        }
        // 抢锁：只有一个请求能拿到锁去查库重建
        const locked = await redis.set(lockKey, requester, 'NX', 'EX', 5)
        if (!locked) {
            console.log(`  [${requester}] 未获取到锁，稍后重试`)
            await new Promise(r => setTimeout(r, 50))
            return getHotWithLock(requester)
        }
        console.log(`  [${requester}] 抢到锁，开始重建缓存`)
        const db = await slowQuery(1)
        await redis.set(hotKey, JSON.stringify(db), 'EX', 60)
        await redis.del(lockKey)
    }
```

脚本把请求方标识写进锁的 value（方便排查「锁在谁手上」），TTL 取 5 秒；没抢到锁的请求等 50ms 再重试。值得注意的是：**锁的 TTL 必须大于重建缓存的最大耗时**，否则锁先过期、缓存又被并发重建。

（本机无 Redis 服务，以上脚本未实跑。）

### 缓存雪崩

**问题**：大量缓存同时过期，导致数据库压力暴增。

最直接的解法是给 TTL 加随机值。配套脚本 `03-cache.js` 用 10 个 key 对比了「统一 TTL」和「抖动 TTL」的过期时刻分布：

> 摘自 `./code/redis-demo/src/03-cache.js`（运行：`npm run cache`）

```javascript
    const baseTTL = 60
    const uniform = []
    const jittered = []
    for (let i = 0; i < 10; i++) {
        uniform.push(baseTTL) // 统一 TTL
        jittered.push(baseTTL + Math.floor(Math.random() * 60)) // 加 0~60s 抖动
    }
    const uSpread = Math.max(...uniform) - Math.min(...uniform)
    const jSpread = Math.max(...jittered) - Math.min(...jittered)
    console.log('统一 TTL 分布跨度 =', uSpread, 's（同一时刻集体过期 => 雪崩）')
    console.log('抖动 TTL 分布跨度 =', jSpread, 's（过期时刻分散，避免集中失效）')
    console.log('结论：给 TTL 加随机抖动，可把过期冲击打散到不同时间点。')
```

除了加随机值，还有三种常见解法：

- **缓存预热**：系统上线前提前把热点数据加载进缓存（见后面「生产场景：缓存预热」）。
- **多级缓存**：本地缓存（如 `node-cache`）+ Redis 两级，本地先挡住一部分请求。
- **限流降级**：缓存大面积失效时，对打到数据库的请求限流。

（本机无 Redis 服务，以上脚本未实跑。）

---

## 缓存更新策略

| 策略 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| Cache Aside | 读缓存，没有则查 DB 并回写；写 DB 后删缓存 | 简单，最常用 | 有短暂不一致 |
| Read/Write Through | 缓存层代理 DB 读写 | 一致性较好 | 实现复杂 |
| Write Behind | 异步批量写入 DB | 性能好 | 可能丢数据 |

### Cache Aside 模式（推荐）

配套脚本 `09-cache-service.js` 把读、写两条路径写成了两个函数：

> 摘自 `./code/redis-demo/src/09-cache-service.js`（运行：`npm run service`）

```javascript
// ===== Cache-Aside 读：查缓存 → 未命中查库并回写 =====
async function read(key, ttl) {
    const cached = await cache.get(key)
    if (cached) return cached
    const data = await dbQuery(key)
    if (data) await cache.set(key, data, ttl)
    return data
}
// …
// ===== Cache-Aside 写：先写库，再删缓存（而不是更新缓存） =====
async function write(key, value) {
    await dbUpdate(key, value)
    await cache.del(key) // 删除缓存，而不是更新缓存：懒加载，下次读取时再回写
}
```

**为什么是删缓存而不是更新缓存？** 更新缓存是写操作，可能被多次无效更新浪费资源。删除缓存是懒加载，等下次读取时再回写。

（本机无 Redis 服务，以上脚本未实跑。）

---

## 生产场景：缓存预热

系统上线前或大促前，提前将热点数据加载到缓存，避免请求直接打到数据库。配套脚本 `08-pipeline.js` 用一个 `fakeHotProducts(100)` 顶替数据库查询，剩下的就是 Pipeline 批量写入：

> 摘自 `./code/redis-demo/src/08-pipeline.js`（运行：`npm run pipeline`）

```javascript
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
// …
    const products = fakeHotProducts(100)
    const t0 = Date.now()
    const warm = await warmUpCache(products)
    console.log(`预热完成：写入 ${warm.length} 条，耗时 ${Date.now() - t0}ms`)
    console.log('对比：逐条 await setex 要 100 次网络往返，Pipeline 只需 1 次。')
```

落到大促场景上，节奏是这样定的：

- **预热时间**：大促前 30 分钟跑一次；
- **预热频率**：每 5 分钟刷新一次热门数据；
- **定时任务**：用 cron 表达式调度上面这个脚本。

（本机无 Redis 服务，以上脚本未实跑。）

## 生产场景：全局 ID 生成器

用 Redis `INCR` 生成全局唯一 ID，适用场景是订单号、流水号、分布式 ID。配套脚本 `10-idgen.js` 把它做成一个函数：

> 摘自 `./code/redis-demo/src/10-idgen.js`（运行：`npm run idgen`）

```javascript
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
// …
    const ids = []
    for (let i = 0; i < 3; i++) {
        ids.push(await nextId('ORDER'))
    }
    console.log('连续生成 3 个订单号：', ids)
```

key 里带日期，所以每天自然从 1 开始；只有 `seq === 1` 那一次才设过期（2 天），既避免每次都 `EXPIRE`，又防止 key 无限堆积。生成出来的形态就是 `ORDER` + `20240101` + `000001`。

（本机无 Redis 服务，以上脚本未实跑。）

---

## 分布式锁

### 使用 SET NX 实现

加锁用 `SET key value NX EX ttl`（脚本里用 `PX` 毫秒粒度，语义相同），解锁**必须用 Lua 比对 value 再删**，否则会误删别人的锁。配套脚本 `04-lock.js` 把加锁、正常释放、以及「拿旧 token 释放」的反例都跑了一遍：

> 摘自 `./code/redis-demo/src/04-lock.js`（运行：`npm run lock`）

```javascript
// 安全释放脚本：只有当前锁的 token 与传入一致才删除，防止误删别人的锁
const releaseScript = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`
// …
    const lockKey = PREFIX + 'order:1001'
// …
    const gotA = await redis.set(lockKey, tokenA, 'NX', 'PX', 30000)
    console.log('客户端A 获取锁：', gotA, '（返回 OK，成功）')
    const gotB = await redis.set(lockKey, tokenB, 'NX', 'PX', 30000)
    console.log('客户端B 获取锁：', gotB, '（返回 null，未获取到锁，稍后重试）')
// …
    const released = await redis.eval(releaseScript, 1, lockKey, tokenA)
    console.log('客户端A 用正确 token 释放，结果 =', released, '（1 表示删除成功）')
// …
    const wrongRelease = await redis.eval(releaseScript, 1, lockKey, tokenA)
    console.log('客户端A 用旧 token 释放：结果 =', wrongRelease, '（0 表示未删除，保护了 B 的锁）')
```

锁的 value 应该是一条唯一标识（脚本用的是 `token-A-` + 随机串），而不是固定的 `'1'`——否则没法判断「这把锁是不是我加的」。加锁成功返回 `'OK'`，key 已存在时返回 `null`。

（本机无 Redis 服务，以上脚本未实跑。）

### 使用 Redlock 算法

Redlock 是 Redis 官方推荐的分布式锁算法，适用于多 Redis 节点的场景。它是一套跨节点的加锁流程，没有单个脚本能独立跑起来，所以这里只用文字说明：

> 示意片段（无配套脚本）

```typescript
// 需要至少 3 个独立的 Redis 节点
// 客户端依次向所有节点申请锁
// 半数以上节点成功，且总耗时 < TTL，才算获取成功
```

---

## 限流

### 滑动窗口限流

用 ZSet 记录每次请求的时间戳，先把窗口外的记录裁掉，再看窗口内的数量是否超限。配套脚本 `05-rate-limit.js` 在 1 秒内模拟 200 次请求、阈值 50：

> 摘自 `./code/redis-demo/src/05-rate-limit.js`（运行：`npm run limit`）

```javascript
// 滑动窗口：用 ZSet 记录每次请求时间戳，裁剪 1s 外的记录后看数量
async function slidingWindow(key, limit, total) {
    let passed = 0
    let rejected = 0
    for (let i = 0; i < total; i++) {
        const t = Date.now()
        await redis.zadd(key, t, t + '-' + i)
        await redis.zremrangebyscore(key, 0, t - 1000) // 删除 1s 前的记录
        const size = await redis.zcard(key)
        if (size <= limit) passed++
        else {
            await redis.zrem(key, t + '-' + i)
            rejected++
        }
    }
    return { passed, rejected }
}
```

成员用一个「时间戳 + 序号」的唯一串（`t + '-' + i`），所以同一毫秒内的多次请求也不会互相覆盖。生产里还应该给限流 key 设过期（`expire(key, 窗口秒数)`），否则这些 key 会一直留在 Redis 里。

（本机无 Redis 服务，以上脚本未实跑。）

## 小结

- **缓存读写的基本套路**
  - 热点数据缓存：查缓存 → 未命中查库 → `setex` 回写；热点列表设 5 分钟这类短 TTL，避免长期存脏数据
  - 缓存过期来源：定时与惰性过期由 Redis 负责；数据变更时由业务主动 `del` 缓存，是应用层责任
  - 三种更新策略：Cache Aside 最常用、简单但有短暂不一致；Read/Write Through 由缓存层代理读写、一致性好但复杂；Write Behind 异步批量写库、性能好但可能丢数据
  - 删缓存而非更新缓存：写路径"先写库再删缓存"；更新缓存可能被多次无效更新，删缓存是懒加载、下次读时再回写
- **缓存三大问题（穿透 / 击穿 / 雪崩）**
  1. 缓存穿透：查不存在的数据每次打到库；要么缓存空值并给短 TTL，要么前置布隆过滤器
  2. 缓存击穿：热点 key 过期瞬间大量请求同时回源；用 `SET NX EX` 互斥锁只放一个请求查库，其余等待重试
  3. 缓存雪崩：大量 key 同一时刻过期；给 TTL 加随机值、提前缓存预热、本地 + Redis 多级缓存、对库请求限流降级
- **生产场景：预热与全局 ID**
  - 缓存预热：大促前 30 分钟用 Pipeline 批量灌入热点数据、TTL 带随机值，并按每 5 分钟一次频率刷新
  - Redis INCR 全局 ID：格式"前缀 + 日期 + 6 位自增"，首次 `incr` 返回 1 时设 2 天过期，防 key 无限堆积
- **分布式锁**
  - 加锁与安全释放：`SET lock:key <value> NX EX 10` 加锁，解锁必须用 Lua 比对 value 再删，否则误删别人的锁
  - Redlock 算法：多节点场景，需至少 3 个独立 Redis 节点、半数以上加锁成功且总耗时小于 TTL 才算获取成功
- **限流**
  - ZSet 滑动窗口：`ZREMRANGEBYSCORE` 清窗口外记录 → `ZCARD` 判断是否超限 → `ZADD` 记录本次请求并给 key 设过期

---

## 配套代码

本篇的可运行示例在仓库 `node/Redis/code/redis-demo`。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/redis-demo/src/03-cache.js` | 缓存场景实战 · 缓存三大问题（穿透 / 击穿 / 雪崩） | 穿透 / 击穿 / 雪崩三种防护 |
| `./code/redis-demo/src/02-expire.js` | 缓存场景实战 · 缓存过期策略 | `EXPIRE` / `TTL` / `PERSIST` / `SET ... EX` 的返回值，以及惰性删除与定期删除的观察 |
| `./code/redis-demo/src/09-cache-service.js` | 缓存更新策略 · Cache Aside 模式（推荐） | Cache-Aside 的读透与写失效（先写库、再删缓存） |
| `./code/redis-demo/src/08-pipeline.js` | 生产场景：缓存预热 | 用 Pipeline 批量 `setex` 灌入热点数据，TTL 带随机抖动 |
| `./code/redis-demo/src/10-idgen.js` | 生产场景：全局 ID 生成器 | `INCR` 生成「前缀 + 日期 + 6 位自增」，首次自增时设 2 天过期 |
| `./code/redis-demo/src/04-lock.js` | 分布式锁 · 使用 SET NX 实现 | `SET NX PX` 加锁、Lua 比对 token 安全释放、旧 token 释放返回 0 |
| `./code/redis-demo/src/05-rate-limit.js` | 限流 · 滑动窗口限流 | 固定窗口 / 滑动窗口 / 令牌桶三种限流对比 |

运行方式见 `redis-demo/README.md`。

---

## 参考

- 本模块总结：[总结](../数据库/总结.md)
- 本模块面试题：[面试题](../数据库/面试题.md)
- 上一篇：[Node.js 操作 Redis](./Node.js%20操作%20Redis)
- 下一篇：[Redis 进阶](./Redis%20进阶)