# Redis 基础与数据类型

---

## [初级] Redis 是什么

Redis（Remote Dictionary Server）是一个**基于内存**的键值数据库，常用于缓存、会话管理、消息队列、排行榜等场景。

### 核心特点

| 特性 | 说明 |
|------|------|
| 内存存储 | 读写速度可达微秒级 |
| 多种数据结构 | String、Hash、List、Set、ZSet 等 |
| 持久化 | 支持 RDB（快照）和 AOF（日志）两种持久化方式 |
| 高可用 | 主从复制、哨兵、集群 |
| 单线程模型 | 所有命令串行执行，天然无并发问题 |

### 与 MySQL 的对比

| 维度 | MySQL | Redis |
|------|-------|-------|
| 存储位置 | 磁盘 | 内存 |
| 读写速度 | 慢（毫秒级） | 快（微秒级） |
| 数据结构 | 表 | 多种数据结构 |
| 持久化 | 默认持久化 | 可选（RDB/AOF） |
| 容量 | 大 | 受内存限制 |
| 主要用途 | 数据持久化存储 | 缓存、加速、临时数据 |

### 应用场景

- **缓存**：热点数据缓存，减少数据库压力
- **会话管理**：分布式 Session 共享
- **排行榜**：ZSet 实现实时排行榜
- **计数器**：String 自增实现访问量统计
- **消息队列**：List 或 Stream 实现简单的消息队列
- **分布式锁**：SET NX 实现互斥锁
- **限流**：INCR + 过期时间实现滑动窗口限流

---

## [初级] 五种基本数据结构

### String（字符串）

最基本的类型，可存储字符串、数字、二进制数据。

```bash
SET name "张三"          # 设置值
GET name                 # 获取值
SET age 25
INCR age                 # 自增 → 26
INCRBY age 5             # 自增指定值 → 31
DECR age                 # 自减
EXPIRE name 60           # 60 秒后过期
TTL name                 # 查看剩余过期时间
SETEX key 60 "value"     # 设置值的同时设置过期时间
MSET a 1 b 2 c 3         # 批量设置
MGET a b c               # 批量获取
```

**适用场景**：缓存 JSON 字符串、计数器（访问量、点赞数）、分布式 ID 生成

### Hash（哈希）

类似于对象，可以存储字段-值对。

```bash
HSET user:1 name "张三" age 25
HGET user:1 name          # 获取单个字段
HGETALL user:1            # 获取所有字段
HMSET user:2 name "李四" age 30  # 批量设置
HINCRBY user:1 age 1      # 字段自增
HDEL user:1 age           # 删除字段
HEXISTS user:1 name       # 判断字段是否存在
HLEN user:1               # 获取字段数量
```

**适用场景**：存储对象（用户信息、商品详情），可以单独操作某个字段而不影响其他字段

### List（列表）

有序可重复的字符串列表，基于双向链表实现。

```bash
LPUSH messages "消息1"    # 从左侧插入
RPUSH messages "消息2"    # 从右侧插入
LRANGE messages 0 -1      # 获取所有
LPOP messages             # 从左侧弹出
RPOP messages             # 从右侧弹出
LLEN messages             # 获取列表长度
LINDEX messages 0         # 获取指定索引的元素
```

**适用场景**：消息队列、时间线列表、最新消息

### Set（集合）

无序不重复的字符串集合。

```bash
SADD tags "javascript" "node" "typescript"
SMEMBERS tags             # 获取所有成员
SISMEMBER tags "java"     # 判断是否存在
SCARD tags                # 获取成员数量
SREM tags "java"          # 删除成员
SINTER set1 set2          # 交集
SUNION set1 set2          # 并集
SDIFF set1 set2           # 差集
```

**适用场景**：标签系统、共同好友、去重统计

### ZSet（有序集合）

每个成员关联一个分数，按分数排序。

```bash
ZADD leaderboard 100 "张三" 200 "李四"
ZRANGE leaderboard 0 -1           # 按分数升序
ZREVRANGE leaderboard 0 -1        # 按分数降序
ZINCRBY leaderboard 50 "张三"     # 加分
ZSCORE leaderboard "张三"         # 获取分数
ZRANK leaderboard "张三"          # 获取排名
ZREM leaderboard "张三"           # 删除成员
ZRANGEBYSCORE leaderboard 100 200 # 按分数范围获取
```

**适用场景**：排行榜、延时队列、优先级队列

---

## [初级] Redis 为什么快

1. **基于内存**：数据存储在内存中，读写速度远快于磁盘
2. **单线程模型**：避免上下文切换和锁竞争，所有命令串行执行
3. **IO 多路复用**：使用 epoll 处理大量客户端连接
4. **高效数据结构**：SDS、跳表、压缩列表等优化设计

---

## 面试题

### Q1: Redis 的 String 和 Hash 分别适合什么场景？

String 适合简单键值对（如缓存 JSON 字符串）、计数器（如访问量）。Hash 适合存储对象（如用户信息），可以单独操作某个字段而不影响其他字段。

### Q2: Redis 为什么是单线程的，单线程如何保证高性能？

单线程避免上下文切换和锁竞争，所有命令串行执行天然无并发问题。高性能来源于内存存储 + IO 多路复用 + 高效数据结构。

---

## 参考

- 上一篇：MongoDB 进阶
- 下一篇：[Redis 持久化与淘汰策略](./02-Redis%20持久化与淘汰策略)