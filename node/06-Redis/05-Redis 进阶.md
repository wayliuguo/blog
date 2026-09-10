# Redis 进阶

> 承上：[Redis 缓存实战](./04-Redis%20缓存实战) —— 先掌握缓存用法，再学哨兵/Cluster 高可用与高级数据类型
> 启下：[学习地图与边界：NestJS 该学到什么程度](../07-NestJS%20入门/00-NestJS%20学习地图与边界) —— 对照模块体系画出 NestJS 在 Express 之上的四层封装，并说清哪些能力必须掌握、哪些点到为止

---

## 主从复制

### 基本原理

主节点（Master）负责写操作，从节点（Slave）负责读操作，实现读写分离。

```bash
# 从节点配置（redis.conf）
replicaof 127.0.0.1 6379  # 设置主节点地址
```

### 复制流程

1. 从节点发送 `SYNC` 命令
2. 主节点执行 `BGSAVE` 生成 RDB 快照
3. 主节点将 RDB 文件发送给从节点
4. 从节点加载 RDB 文件
5. 后续主节点将写命令同步给从节点

### 主从复制的作用

- **读写分离**：主节点写，从节点读，分担读压力
- **数据备份**：从节点作为数据备份
- **高可用基础**：主节点故障时，从节点可升级为主节点

---

## 哨兵模式（Sentinel）

### 什么是哨兵

哨兵是一个分布式系统，用于监控 Redis 主从集群，自动故障转移。

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2  # 2 表示至少 2 个哨兵同意才判定主节点下线
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

### 哨兵的作用

- **监控**：周期性检查主从节点是否正常
- **自动故障转移**：主节点故障时，选举新主节点
- **通知**：通知客户端新的主节点地址

### 故障转移流程

1. 哨兵检测到主节点下线（主观下线）
2. 多个哨兵协商，确认主节点客观下线
3. 选举新主节点（从从节点中选一个）
4. 将从节点指向新主节点
5. 通知客户端

---

## Redis Cluster 集群

### 集群架构

Redis Cluster 是 Redis 官方提供的分布式解决方案，自动分片，支持水平扩展。

```bash
# 创建集群
redis-cli --cluster create \
    127.0.0.1:6379 127.0.0.1:6380 \
    127.0.0.1:6381 127.0.0.1:6382 \
    127.0.0.1:6383 127.0.0.1:6384 \
    --cluster-replicas 1
```

### 哈希槽（Hash Slot）

Redis Cluster 将数据分为 16384 个哈希槽，每个节点负责一部分槽位。

```bash
# 计算 key 对应的槽位
HASH_SLOT = CRC16(key) % 16384
```

### 集群特性

- **自动分片**：数据均匀分布到多个节点
- **高可用**：每个分片有主从节点
- **线性扩展**：增加节点即可扩展容量和性能
- **去中心化**：节点间通过 Gossip 协议通信

### 与哨兵模式对比

| 特性 | 哨兵模式 | Cluster 集群 |
|------|---------|-------------|
| 数据分片 | 不支持 | 支持（16384 个槽位） |
| 扩展性 | 垂直扩展 | 水平扩展 |
| 读写分离 | 支持 | 支持 |
| 自动故障转移 | 支持 | 支持 |
| 适用场景 | 数据量小、高可用 | 数据量大、需要水平扩展 |

---

## 高级数据类型

### Bitmap（位图）

```bash
# 日活用户统计
SETBIT user:2024-01-01 100 1  # 用户 ID 100 在 2024-01-01 访问
SETBIT user:2024-01-01 101 1
BITCOUNT user:2024-01-01      # 统计当天访问用户数
```

### HyperLogLog（基数统计）

```bash
# UV 统计，占用 12KB 内存，误差约 0.81%
PFADD uv:2024-01-01 user1 user2 user3
PFCOUNT uv:2024-01-01          # 统计独立用户数
PFMERGE uv:2024-01 uv:2024-01-01 uv:2024-01-02  # 合并
```

### GEO（地理位置）

```bash
# 存储地理位置
GEOADD locations 116.397128 39.916527 "天安门"
GEOADD locations 121.473701 31.230416 "上海东方明珠"
GEODIST locations "天安门" "上海东方明珠" km  # 计算距离
GEORADIUS locations 116.397128 39.916527 100 km  # 半径 100km 内的位置
```

### Stream（消息队列）

Redis 5.0+ 提供，支持消息持久化、消费组、ACK 机制。

```bash
# 生产者
XADD mystream * name "张三" age 25

# 消费者
XREAD COUNT 10 BLOCK 5000 STREAMS mystream 0

# 消费组
XGROUP CREATE mystream mygroup $
XREADGROUP GROUP mygroup consumer1 COUNT 1 BLOCK 5000 STREAMS mystream >
```

---

## 安全配置

```bash
# 设置密码
requirepass your_strong_password

# 绑定 IP（只允许内网访问）
bind 127.0.0.1 192.168.1.100

# 禁用危险命令
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""

# 端口修改（默认 6379）
port 6380
```

## 生产场景：Redis 慢查询与延迟诊断

```bash
# 慢查询日志
# 配置（redis.conf）
slowlog-log-slower-than 10000    # 记录超过 10ms 的命令
slowlog-max-len 128              # 最多保留 128 条

# 查看慢查询
SLOWLOG GET 10                   # 查看最近 10 条慢查询
SLOWLOG LEN                      # 查看慢查询数量
SLOWLOG RESET                    # 清空慢查询日志

# 慢查询结果示例
# 1) 1) (integer) 1              ← 唯一 ID
#    2) (integer) 1735689600     ← 时间戳
#    3) (integer) 15000          ← 执行耗时（微秒）= 15ms
#    4) 1) "KEYS"                ← 命令
#       2) "user:*"              ← 参数（KEYS 导致慢查询）
#    5) "127.0.0.1:6379"         ← 客户端地址
```

## 生产场景：Redis 6.0+ 多线程 IO

Redis 6.0 引入了多线程 IO，但仍然是单线程处理命令执行。

```bash
# 配置（redis.conf）
io-threads 4          # IO 线程数（建议不超过 CPU 核心数）
io-threads-do-reads yes  # 读请求也使用多线程

# 注意：多线程只用于 IO 读写，命令执行仍然是单线程
# 适合场景：网络 IO 密集型，如大量并发连接
# 通常单线程已经足够，大部分场景不需要开启
```

### 生产场景：Redis 监控与告警

```bash
# 关键监控指标
# 1. 连接数
INFO clients
# connected_clients: 50          ← 当前连接数
# blocked_clients: 0             ← 阻塞的客户端（B* 命令导致）

# 2. 内存
INFO memory
# used_memory: 1.5G
# mem_fragmentation_ratio: 1.3   ← 碎片率

# 3. 命中率
INFO stats
# keyspace_hits: 1000000          ← 缓存命中次数
# keyspace_misses: 10000          ← 缓存未命中次数
# 命中率 = hits / (hits + misses) = 99%

# 4. 命令统计
INFO commandstats
# cmdstat_get:calls=500000,usec=3000000,usec_per_call=6.00
# cmdstat_set:calls=200000,usec=1000000,usec_per_call=5.00

# 5. 复制延迟
# 从节点执行
INFO replication
# master_last_io_seconds_ago: 0  ← 距上次同步秒数，> 30 表示延迟严重
```

---

## 面试题

### Q11: 哨兵模式和 Cluster 集群的区别？

哨兵模式解决高可用问题（自动故障转移），但不解决数据分片。Cluster 集群解决分布式存储问题（自动分片 + 高可用）。数据量小用哨兵，数据量大用 Cluster。

### Q12: Stream 和 List 做消息队列的区别？

List 简单但不支持消费组和 ACK，消息可能丢失。Stream 支持消费组、ACK 机制、消息持久化，功能更完善，适合生产环境。

### Q13: Redis 如何实现附近的人？

使用 GEO 数据结构存储地理位置，通过 GEORADIUS 命令查询指定半径内的位置。

### Q14: Redis 6.0 的多线程 IO 是怎么回事？

Redis 6.0 引入了多线程 IO，但命令执行仍然是单线程。多线程只用于网络 IO 读写处理，适合大量并发连接场景。CPU 密集场景或命令执行慢的场景，多线程 IO 没有帮助。

### Q15: Redis 缓存命中率多少算正常？如何提升？

一般缓存命中率应该在 90% 以上，低于 80% 需要优化。提升方法：增大缓存容量、延长过期时间、缓存预热、优化缓存策略（如 LFU 替代 LRU）。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/redis-demo`。

| 文件 | 演示什么 |
| --- | --- |
| `04-lock.js` | 分布式锁与 Lua 安全释放 |
| `05-rate-limit.js` | 固定窗口 / 滑动窗口 / 令牌桶 |
| `06-rank.js` | ZSet 排行榜 |
| `07-pubsub.js` | Pub/Sub 发布订阅 |

运行方式见 `redis-demo/README.md`。

---

## 参考

- 上一篇：[Redis 缓存实战](./04-Redis%20缓存实战)
- 下一篇：[学习地图与边界：NestJS 该学到什么程度](../07-NestJS%20入门/00-NestJS%20学习地图与边界)