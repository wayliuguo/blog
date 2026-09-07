# Node.js 操作 Redis

---

## [初级] 安装与连接

### 安装 ioredis

```bash
npm install ioredis
```

### 基本使用

```typescript
import Redis from 'ioredis'

const redis = new Redis({
    host: 'localhost',
    port: 6379,
    password: 'optional',
    db: 0,              // 默认数据库编号
    retryStrategy: (times) => {
        // 断线重连策略
        return Math.min(times * 50, 2000)
    }
})

// 基本操作
await redis.set('key', 'value')
await redis.get('key')
await redis.setex('key', 60, 'value')  // 设置过期时间（秒）
await redis.del('key')

// 检查连接状态
redis.on('connect', () => console.log('Redis connected'))
redis.on('error', (err) => console.error('Redis error', err))
```

### 连接池

ioredis 内置连接池管理，支持自动重连。

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

## [中级] 数据类型操作

### String

```typescript
// 缓存 JSON
await redis.setex('user:1', 3600, JSON.stringify({ name: '张三', age: 25 }))
const user = JSON.parse(await redis.get('user:1') || 'null')

// 计数器
await redis.incr('page:views')
await redis.incrby('page:views', 10)
```

### Hash

```typescript
// 存储对象（推荐）
await redis.hset('user:1', { name: '张三', age: 25 })
const user = await redis.hgetall('user:1')
const name = await redis.hget('user:1', 'name')
```

### List

```typescript
// 消息队列
await redis.lpush('queue:tasks', JSON.stringify({ id: 1, type: 'email' }))
const task = await redis.rpop('queue:tasks')
```

### Set

```typescript
// 标签系统
await redis.sadd('user:1:tags', 'javascript', 'node', 'typescript')
const isMember = await redis.sismember('user:1:tags', 'javascript')
const tags = await redis.smembers('user:1:tags')
```

### ZSet

```typescript
// 排行榜
await redis.zadd('leaderboard', 100, 'user:1', 200, 'user:2')
const top10 = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES')
```

---

## [中级] NestJS 集成

### 创建 Redis 模块

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

```typescript
// user.service.ts
import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class UserService {
    constructor(@Inject('REDIS') private redis: Redis) {}

    async getUser(id: number) {
        // 先从缓存查询
        const cached = await this.redis.get(`user:${id}`)
        if (cached) return JSON.parse(cached)

        // 缓存没有，查询数据库
        const user = await this.userRepository.findOneBy({ id })

        // 写入缓存，过期时间 1 小时
        if (user) {
            await this.redis.setex(`user:${id}`, 3600, JSON.stringify(user))
        }

        return user
    }
}
```

### 封装 Redis 服务

```typescript
// redis.service.ts
import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService {
    constructor(@Inject('REDIS') private redis: Redis) {}

    // 缓存装饰：自动处理序列化/反序列化
    async get<T>(key: string): Promise<T | null> {
        const data = await this.redis.get(key)
        return data ? JSON.parse(data) : null
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        const data = JSON.stringify(value)
        if (ttl) {
            await this.redis.setex(key, ttl, data)
        } else {
            await this.redis.set(key, data)
        }
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key)
    }

    // 分布式锁
    async lock(key: string, ttl: number = 10): Promise<boolean> {
        const result = await this.redis.set(
            `lock:${key}`, '1', 'NX', 'EX', ttl
        )
        return result === 'OK'
    }

    async unlock(key: string): Promise<void> {
        await this.redis.del(`lock:${key}`)
    }
}
```

---

## [中级] 管道与批量操作

```typescript
// 管道：批量发送命令，减少网络往返
const pipeline = redis.pipeline()
pipeline.set('key1', 'value1')
pipeline.set('key2', 'value2')
pipeline.get('key1')
pipeline.incr('counter')
const results = await pipeline.exec()
// results 是 [[null, 'OK'], [null, 'OK'], [null, 'value1'], [null, 1]]
```

---

## 面试题

### Q6: ioredis 和 node-redis 的区别？

ioredis 更流行，支持 Promise、集群、哨兵、Pipeline、Lua 脚本等特性，API 更现代化。node-redis 是官方客户端，但功能相对较少。

### Q7: Pipeline 的作用是什么？

将多个命令批量发送到 Redis 服务器，减少网络往返次数，提高吞吐量。适合需要批量操作的场景。

---

## 参考

- 上一篇：[Redis 持久化与淘汰策略](./02-Redis%20持久化与淘汰策略)
- 下一篇：[Redis 缓存实战](./04-Redis%20缓存实战)