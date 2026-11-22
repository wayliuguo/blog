# Redis 进阶

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


## 持久化机制

Redis 是内存数据库，但支持将数据持久化到磁盘，防止数据丢失。

### RDB（快照）

将内存中的数据定期保存到磁盘的二进制快照文件（dump.rdb）。

```bash
# 配置示例（redis.conf）
save 900 1       # 900 秒内至少有 1 个 key 被修改，触发快照
save 300 10      # 300 秒内至少有 10 个 key 被修改，触发快照
save 60 10000    # 60 秒内至少有 10000 个 key 被修改，触发快照

# 手动触发
BGSAVE           # 后台异步保存
SAVE             # 前台同步保存（阻塞）
```

**RDB 优点**：文件紧凑，适合备份和灾难恢复；恢复速度快
**RDB 缺点**：可能丢失最后一次快照之后的数据；数据量大时 fork 子进程可能耗时

### AOF（Append Only File）

将每个写操作以日志形式追加到文件中。

```bash
# 配置示例（redis.conf）
appendonly yes
appendfsync always     # 每次写操作都同步（最安全，最慢）
appendfsync everysec   # 每秒同步一次（默认，推荐）
appendfsync no         # 由操作系统决定何时同步（最快，最不安全）
```

**AOF 优点**：数据安全性高（最多丢失 1 秒数据）；可读性好
**AOF 缺点**：文件体积比 RDB 大；恢复速度比 RDB 慢

### AOF 重写

AOF 文件会不断增长，Redis 支持自动重写 AOF 文件，去除冗余命令。

```bash
# 配置示例（redis.conf）
auto-aof-rewrite-percentage 100   # 文件增长比例达到 100% 时触发重写
auto-aof-rewrite-min-size 64mb    # 文件至少达到 64MB 才触发重写

# 手动触发
BGREWRITEAOF
```

### 混合持久化（Redis 4.0+）

```bash
# 配置示例（redis.conf）
aof-use-rdb-preamble yes
```

RDB 快照作为 AOF 文件的前缀，结合 RDB 的快速恢复和 AOF 的高数据安全性。

| 持久化方式 | 数据安全性 | 恢复速度 | 文件大小 |
|-----------|-----------|---------|---------|
| RDB | 低（可能丢数据） | 快 | 小 |
| AOF | 高（最多丢 1s） | 慢 | 大 |
| 混合 | 高 | 快 | 中等 |

---

## 过期策略

Redis 使用**惰性删除 + 定期删除**两种策略。

### 惰性删除

当访问一个 key 时，检查是否过期，如果过期则删除。

```bash
# 原理
GET mykey
# 如果 mykey 已过期，Redis 返回 nil 并删除该 key
```

### 定期删除

Redis 每隔 100ms 随机抽取一批设置了过期时间的 key，检查是否过期，过期则删除。

```bash
# 配置（redis.conf）
hz 10  # 每秒执行多少次定期检查（默认 10）
```

### 内存淘汰策略

当内存不足时，Redis 根据配置的策略淘汰 key。

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `noeviction` | 不淘汰，写操作返回错误（默认） | 严格数据不丢失 |
| `allkeys-lru` | 淘汰最近最少使用的 key | 缓存场景（最常用） |
| `allkeys-lfu` | 淘汰最不经常使用的 key | 缓存场景 |
| `volatile-lru` | 淘汰设置了过期时间中最近最少使用的 key | 有混合数据 |
| `volatile-lfu` | 淘汰设置了过期时间中最不经常使用的 key | 有混合数据 |
| `volatile-ttl` | 淘汰即将过期的 key | 有混合数据 |
| `allkeys-random` | 随机淘汰 | 不常用 |
| `volatile-random` | 在设置了过期时间的 key 中随机淘汰 | 不常用 |

```bash
# 配置（redis.conf）
maxmemory 1gb           # 最大内存限制
maxmemory-policy allkeys-lru  # 淘汰策略
```

### 生产场景：内存监控与告警

```bash
# 查看内存使用情况
INFO memory
# 重点关注：
# used_memory_human: 1.5G      ← 当前使用内存
# used_memory_rss_human: 2.0G  ← 操作系统看到的内存（含碎片）
# maxmemory_human: 4.0G        ← 配置的最大内存
# mem_fragmentation_ratio: 1.3 ← 内存碎片率（>1.5 表示碎片严重）

# 查看 key 数量
INFO keyspace
# db0: keys=1000000, expires=800000, avg_ttl=3600000

# 设置告警阈值
# 内存使用超过 80% maxmemory → 告警
# 内存碎片率超过 1.5 → 告警
# 淘汰 key 数量（evicted_keys）持续增加 → 告警
```

### 生产场景：Big Key 问题

Big Key 是指某个 key 存储了大量数据，导致操作耗时。

```
Big Key 的判定标准：
  String 类型：> 10KB
  Hash/List/Set/ZSet 类型：> 5000 个元素

Big Key 的危害：
  1. 操作耗时：读取、删除 Big Key 会阻塞 Redis
  2. 内存不均：集群模式下数据倾斜
  3. 网络开销：传输大数据包占用带宽

Big Key 的排查：
  redis-cli --bigkeys  # 扫描大 key（生产环境谨慎使用，有性能影响）
```

**Big Key 解决方案**：

```bash
# 1. 拆分大 Hash
# 原：HMSET user:10000 name "张三" orders:100 order:200 ... (含 10000 条订单)
# 改为：拆分为多个 Hash
HMSET user:10000:basic name "张三" age 25
HMSET user:10000:orders:202401 order:100 order:200
HMSET user:10000:orders:202402 order:300

# 2. 使用压缩
# 对大 JSON 字符串用 ZSTD 或 Snappy 压缩后再存储

# 3. 限流删除（避免阻塞）
# 删除大 List 时，用 LTRIM 分批删除
LTRIM biglist 0 999999  # 保留前 100 万条，删除后面的
# 或者用 UNLINK（异步删除，非阻塞）
UNLINK biglist  # 4.0+ 异步删除，不阻塞主线程
```

### 生产场景：Hot Key 问题

Hot Key 是指某个 key 被大量请求同时访问，导致某个 Redis 节点负载过高。

```
Hot Key 的判定标准：
  单个 key 的 QPS 超过 1万+
  某个节点的 CPU 比其他节点高很多

Hot Key 的解决方案：
  1. 本地缓存：在应用层缓存热点 key，减少 Redis 访问
  2. 读写分离：将读请求分散到从节点
  3. 数据分片：将 hot key 的副本分散到多个分片
  4. 限流：对热点 key 的访问进行限流保护
```

---

## Redis 事务

Redis 事务提供了一种将多个命令打包执行的机制，但不支持回滚。

```bash
MULTI              # 开启事务
SET key1 "value1"  # 命令入队
SET key2 "value2"
EXEC               # 执行事务
# 或
DISCARD            # 取消事务
```

### WATCH 乐观锁

```bash
WATCH key          # 监视 key，如果 key 被修改，事务取消
MULTI
SET key "value"
EXEC
```

**注意**：Redis 事务不保证原子性——语法错误时全部不执行，运行时错误只影响错误命令。

## 配套代码

本篇的可运行示例在仓库 `node/redis/code/Redis 基础`。

| 文件 | 演示什么 |
| --- | --- |
| `02-expire.js` | TTL、过期行为观察与淘汰策略 |
| `04-lock.js` | 分布式锁与 Lua 安全释放 |
| `05-rate-limit.js` | 固定窗口 / 滑动窗口 / 令牌桶 |
| `06-rank.js` | ZSet 排行榜 |
| `07-pubsub.js` | Pub/Sub 发布订阅 |

运行方式见 `Redis 基础/README.md`。

---
