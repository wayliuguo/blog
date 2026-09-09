# Redis 持久化与淘汰策略

---

## [中级] 持久化机制

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

## [中级] 过期策略

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

## [中级] Redis 事务

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

---

## 面试题

### Q3: RDB 和 AOF 的区别，如何选择？

RDB 适合备份和灾难恢复，恢复速度快，但可能丢数据。AOF 数据安全性高，最多丢 1 秒数据，但文件大、恢复慢。生产环境建议同时开启，或使用 Redis 4.0+ 的混合持久化。

### Q4: Redis 的过期键删除策略是什么？

惰性删除 + 定期删除。访问时检查过期删除，同时定期随机抽取一批过期 key 删除。

### Q5: 内存淘汰策略有哪些？生产环境常用哪个？

8 种策略，最常用 `allkeys-lru`（淘汰最近最少使用的 key），适合缓存场景。

### Q6: 什么是 Big Key？有什么危害？如何解决？

Big Key 是指存储了大量数据的 key（如大的 Hash 或 List）。危害：操作耗时阻塞 Redis、内存分布不均、网络开销大。解决：拆分大 key、使用压缩、用 UNLINK 异步删除。

### Q7: 什么是 Hot Key？如何解决？

Hot Key 是某个 key 被大量请求同时访问，导致节点负载过高。解决：本地缓存、读写分离、副本分散、限流保护。

---

## 参考

- 上一篇：[Redis 基础与数据类型](./01-Redis%20基础与数据类型)
- 下一篇：[Node.js 操作 Redis](./03-Node.js%20操作%20Redis)