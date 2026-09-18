# Node.js 操作 Redis


---

## 安装与连接

### 安装 ioredis

```bash
npm install ioredis
```

### 基本使用

本篇的代码块均取自配套脚本 `redis-demo`，采用 CommonJS 写法（`require(...)`），与正文示例里的 `import ... from 'ioredis'` 风格不同——连接、序列化等细节都收在 `src/client.js` 里。

先看连接。`src/client.js` 把 `host` / `port` / `db` 与断线重连策略收成一份配置，并挂上连接与错误日志：

> 摘自 `./code/redis-demo/src/client.js`

```javascript
const options = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    db: Number(process.env.REDIS_DB) || 0,
    // 连接断开时按指数退避重连，最多每 2 秒一次
    retryStrategy: times => Math.min(times * 200, 2000)
}
// …
const redis = new Redis(options)
// …
redis.on('connect', () => {
    console.log('[client] 已连接到 Redis')
})
// …
redis.on('error', err => {
    console.error('[client] Redis 连接出错：', err.message)
})
```

密码为空时不要传 `password`（`client.js` 里做了判断），否则 ioredis 会向无密码的 Redis 发起 `AUTH` 而报错。

拿到这个 `redis` 实例后，业务侧直接用它的命令方法读写：

> 摘自 `./code/redis-demo/src/01-data-types.js`（运行：`npm run types`）

```javascript
    const userKey = PREFIX + 'user:1001'
    await redis.set(userKey, JSON.stringify({ id: 1001, name: '张三', age: 28 }), 'EX', 60)
    const user = await redis.get(userKey)
    console.log('从缓存读取的用户信息：', user)
```

这里用 `SET key value EX 60` 写缓存——与 `SETEX key 60 value` 等价，只是把过期时间写在同一条命令里；读回来拿到的还是字符串，要自己 `JSON.parse`。

（本机无 Redis 服务、`redis-demo` 依赖也未安装，以上脚本均未实跑。）

### 连接池

ioredis 内置连接池管理——同一进程里复用连接、不需要自己维护连接池，并支持自动重连（就是上面 `client.js` 里的 `retryStrategy`）。集群模式则要传节点列表：

> 示意片段（无配套脚本）

```typescript
// 集群模式连接池
const cluster = new Redis.Cluster([
    { host: '127.0.0.1', port: 6379 },
    { host: '127.0.0.1', port: 6380 },
], {
    redisOptions: {
        password: 'optional'
    }
})
```

---

## 数据类型操作

### String

String 既能存 JSON（缓存），也能当计数器。缓存 JSON 的写法见上一节；计数器用 `INCR` / `INCRBY`，在服务端原子自增：

> 摘自 `./code/redis-demo/src/01-data-types.js`（运行：`npm run types`）

```javascript
    const counterKey = PREFIX + 'view:article:42'
    await redis.set(counterKey, 0)
    const c1 = await redis.incr(counterKey)
    const c2 = await redis.incrBy(counterKey, 5)
    console.log('INCR 后：', c1, ' INCRBY 5 后：', c2, '（原子自增，无需先读再写）')
```

`incr` 一次加 1（页面浏览量），`incrBy` 一次加指定值，两者都不需要先读再写。

### Hash

Hash 适合存「字段会被单独更新」的对象：

> 摘自 `./code/redis-demo/src/01-data-types.js`（运行：`npm run types`）

```javascript
    const hashKey = PREFIX + 'profile:1001'
    await redis.hset(hashKey, 'name', '张三', 'age', '28', 'city', '北京')
    const profile = await redis.hgetall(hashKey)
    console.log('HGETALL 结果：', profile)
    console.log('对比：Hash 可只更新单个字段（如 HSET age 29），而用 String 存 JSON 必须整体覆盖重写。')
    console.log('适用：字段会被单独更新的对象（用户资料、商品属性）。')
```

要取单个字段用 `hget(key, 'name')`，整对象用 `hgetall`。

### List

List 用 `LPUSH` + `RPOP` 就能做出 FIFO 队列：

> 摘自 `./code/redis-demo/src/01-data-types.js`（运行：`npm run types`）

```javascript
    const queueKey = PREFIX + 'queue:tasks'
    await redis.del(queueKey)
    await redis.lpush(queueKey, 'task-3', 'task-2', 'task-1') // 依次入队
    const pop1 = await redis.rpop(queueKey) // 队头取出（先进先出）
    const pop2 = await redis.rpop(queueKey)
    console.log('按入队顺序取出：', pop1, pop2, '（LPUSH+RPOP 实现 FIFO 队列）')
```

入队时整条消息在脚本里是 `JSON.stringify({ id: 1, type: 'email' })` 这样的字符串，取出后再 `JSON.parse`。

### Set

Set 用来去重与做标签：

> 摘自 `./code/redis-demo/src/01-data-types.js`（运行：`npm run types`）

```javascript
    const onlineKey = PREFIX + 'online'
    await redis.del(onlineKey)
    await redis.sadd(onlineKey, 'u1', 'u2', 'u1', 'u3')
    const online = await redis.smembers(onlineKey)
    console.log('在线用户（自动去重）：', online, ' 数量 SCARD =', await redis.scard(onlineKey))
    console.log('说明：重复 SADD 同一个 member 不会增加，适合去重集合。')
```

判断某个标签在不在用 `sismember(key, member)`（对应上面的「标签系统」写法），取全部成员用 `smembers`。

### ZSet

ZSet 的成员带分数、按分数排序，是排行榜的标准做法：

> 摘自 `./code/redis-demo/src/01-data-types.js`（运行：`npm run types`）

```javascript
    const rankKey = PREFIX + 'scores'
    await redis.del(rankKey)
    await redis.zadd(rankKey, 90, 'playerA', 70, 'playerB', 85, 'playerC')
    const top = await redis.zrevrange(rankKey, 0, 2, 'WITHSCORES')
    console.log('Top3（高到低）：', top)
```

`zrevrange(key, 0, 9, 'WITHSCORES')` 就是取前 10 名并带上分数。

---

## NestJS 集成

### 创建 Redis 模块

用 `@Global()` 模块的 `useFactory` 造出连接、以 `'REDIS'` 为 token 提供并 exports，其它模块就不必重复导入。这段是 NestJS 的框架接线（装饰器 + 依赖注入容器），离开 NestJS 运行不了，所以没有配套脚本：

> 示意片段（无配套脚本）

```typescript
// redis.module.ts
import { Module, Global } from '@nestjs/common'
import Redis from 'ioredis'

@Global()  // 全局模块，无需在每个模块导入
@Module({
    providers: [
        {
            provide: 'REDIS',
            useFactory: () => {
                return new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD,
                    retryStrategy: (times) => Math.min(times * 50, 2000)
                })
            }
        }
    ],
    exports: ['REDIS']
})
export class RedisModule {}
```

### 使用 Redis

Service 通过 `constructor(@Inject('REDIS') private redis: Redis) {}` 拿到连接之后，业务方法本身就是标准的 Cache-Aside：先查缓存，命中就返回；没有再查库并回写。配套脚本 `03-cache.js` 里的 `getProduct` 就是这段逻辑的最小可运行版本：

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

`slowQuery` 是脚本里用来模拟数据库的 ~100ms 慢查询；回写 TTL 这里取 60 秒，换成 3600 就是上面那段「过期时间 1 小时」。

（本机无 Redis 服务，以上脚本未实跑。）

### 封装 Redis 服务

业务侧不该到处手写 `JSON.parse` / `JSON.stringify`，把序列化、TTL 分支和分布式锁收进一个「缓存服务」更清爽。配套脚本 `09-cache-service.js` 用普通对象给出了等价封装——搬到 NestJS 里就是加 `@Injectable()`、把 `redis` 换成 `@Inject('REDIS')` 注入的连接：

> 摘自 `./code/redis-demo/src/09-cache-service.js`（运行：`npm run service`）

```javascript
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
// …
    // 加锁：SET key value NX EX 一条命令完成「不存在才写入 + 带过期时间」
    async lock(key, ttl = 10) {
        const result = await redis.set(PREFIX + 'lock:' + key, '1', 'NX', 'EX', ttl)
        return result === 'OK'
    },
// …
    // 解锁：业务执行完就释放
    async unlock(key) {
        await redis.del(PREFIX + 'lock:' + key)
    }
}
```

`lock` 的返回值是布尔值，业务侧 `if (await cache.lock(key)) { ... }` 就能判断有没有抢到锁；注意这套 `unlock` 是不校验持有者的简化版，真正生产要用下一节那样「Lua 比对 value 再删」。

（本机无 Redis 服务，以上脚本未实跑。）

---
## 管道与批量操作

管道把多条命令攒在一起、一次网络往返发出去，省掉逐条命令的 RTT：

> 摘自 `./code/redis-demo/src/08-pipeline.js`（运行：`npm run pipeline`）

```javascript
    const pipeline = redis.pipeline()
    pipeline.set(PREFIX + 'key1', 'value1')
    pipeline.set(PREFIX + 'key2', 'value2')
    pipeline.get(PREFIX + 'key1')
    pipeline.incr(PREFIX + 'counter')
    const results = await pipeline.exec()
    console.log('exec() 返回：', JSON.stringify(results))
```

`exec()` 返回 `[[err, result], ...]`，与命令顺序一一对应——上面这段就是 `[[null, 'OK'], [null, 'OK'], [null, 'value1'], [null, 1]]`。注意 `pipeline` 只是本地队列，`exec()` 才真正把命令发出去。

（本机无 Redis 服务，以上脚本未实跑。）

## Lua 脚本

Lua 脚本在 Redis 中原子执行，适用于需要保证多个命令原子性的场景。配套脚本用「判断库存 + 扣减」演示：

> 摘自 `./code/redis-demo/src/12-lua-stock.js`（运行：`npm run lua`）

```javascript
// 扣减库存并检查：库存不足返回 0，扣减成功返回 1
const stockScript = `
    local stock = redis.call('GET', KEYS[1])
    if not stock or tonumber(stock) <= 0 then
        return 0
    end
    redis.call('DECR', KEYS[1])
    return 1
`
// …
    for (let i = 1; i <= 3; i++) {
        const result = await redis.eval(stockScript, 1, stockKey)
        console.log(`第 ${i} 次扣减：result = ${result}`, result === 1 ? '（扣减成功）' : '（库存不足，未扣减）')
    }
```

`eval(script, 1, stockKey)` 里的 `1` 是 KEYS 的个数，后面的 `stockKey` 就是脚本里 `KEYS[1]` 指向的库存 key。`result === 1` 表示扣减成功，`result === 0` 表示库存不足——判断与扣减之间插不进别的命令，所以并发下不会超卖。

（本机无 Redis 服务，以上脚本未实跑。）

## 生产场景：连接池监控

生产环境要盯住连接状态：定时 `PING` 探活，把 `INFO` 的文本解析成结构化字段，再对「连接数过千 / 内存超 1GB / 出现淘汰」三类情况告警：

> 摘自 `./code/redis-demo/src/11-monitor.js`（运行：`npm run monitor`）

```javascript
// 把 INFO 返回的多行文本按字段名解析成结构化数据
function parseInfo(info) {
    const lines = info.split('\n')
    return {
        connectedClients: parseInt(lines.find(l => l.startsWith('connected_clients:'))?.split(':')[1] || '0'),
        usedMemory: parseInt(lines.find(l => l.startsWith('used_memory:'))?.split(':')[1] || '0'),
        evictedKeys: parseInt(lines.find(l => l.startsWith('evicted_keys:'))?.split(':')[1] || '0')
    }
}
// …
const THRESHOLD = {
    connectedClients: 1000,          // 连接数超过 1000 条告警
    usedMemory: 1024 * 1024 * 1024,  // 内存超过 1GB 告警
    evictedKeys: 0                   // 一旦出现淘汰就告警
}
// …
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
```

生产里把 `checkOnce()` 挂到 `setInterval`（比如 30 秒一次）上、进程退出时 `clearInterval`，并把告警接到通知通道即可。

（本机无 Redis 服务，以上脚本未实跑。）

## 小结

- **连接与重连（ioredis）**
  - 连接配置：`new Redis({ host, port, retryStrategy })`，重连策略返回 `Math.min(times * 50, 2000)` 做指数退避
  - 内置连接池与集群：ioredis 自带连接管理与自动重连；集群模式用 `new Redis.Cluster([...])` 传节点列表
- **各数据类型的 Node 写法**
  1. String：用 `setex` 缓存 JSON、用 `incr` / `incrby` 做计数器
  2. Hash：用 `hset` / `hgetall` / `hget` 存对象
  3. List：用 `lpush` / `rpop` 做消息队列
  4. Set：用 `sadd` / `sismember` 做标签系统
  5. ZSet：用 `zadd` / `zrevrange` 做排行榜
- **NestJS 集成与 RedisService 封装**
  - 全局 Redis 模块：用 `@Global()` 的 `useFactory` 提供 `'REDIS'` token 并 exports，Service 用 `@Inject('REDIS')` 取
  - RedisService 封装：把 JSON 序列化反序列化、`set` 的 TTL 分支、`del`、`lock` / `unlock` 收进一个服务，业务侧不碰连接细节
- **管道与 Lua 脚本**
  - 管道 Pipeline：`redis.pipeline()` 批量发送命令减少网络往返，`exec()` 返回 `[[err, result], ...]`
  - Lua 脚本的原子性：`redis.eval(script, 1, key)` 在 Redis 内原子执行，适合"判断 + 扣减库存"这类跨多条命令的逻辑
- **连接健康监控**
  - 定时 `ping()` 与 `info()`，对连接数过千、内存超 1GB、`evicted_keys` 增长三类情况告警

---

## 配套代码

本篇的可运行示例在仓库 `node/Redis/code/redis-demo`。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/redis-demo/src/client.js` | 安装与连接 · 基本使用 | ioredis 连接封装 |
| `./code/redis-demo/src/01-data-types.js` | 数据类型操作（String / Hash / List / Set / ZSet） | 五种数据类型的后端用例 |
| `./code/redis-demo/src/03-cache.js` | NestJS 集成 · 使用 Redis | Cache-Aside 读写与命中率 |
| `./code/redis-demo/src/09-cache-service.js` | NestJS 集成 · 封装 Redis 服务 | 缓存服务封装：JSON 序列化读写、TTL 分支、`SET NX EX` 加锁与解锁 |
| `./code/redis-demo/src/08-pipeline.js` | 管道与批量操作 | `pipeline()` 攒命令 + `exec()` 一次往返，以及缓存预热（`setex` + TTL 抖动） |
| `./code/redis-demo/src/12-lua-stock.js` | Lua 脚本 | 用 `eval` 执行「判断库存 + 扣减」脚本，验证原子性 |
| `./code/redis-demo/src/11-monitor.js` | 生产场景：连接池监控 | PING 探活 + `INFO` 解析 + 连接数 / 内存 / 淘汰三类阈值告警 |

运行方式见 `redis-demo/README.md`。

---

## 参考

- 本模块总结：[总结](../数据库/总结.md)
- 本模块面试题：[面试题](../数据库/面试题.md)
- 上一篇：[Redis 持久化与淘汰策略](./Redis%20持久化与淘汰策略)
- 下一篇：[Redis 缓存实战](./Redis%20缓存实战)