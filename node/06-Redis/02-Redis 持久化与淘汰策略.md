# Redis 持久化与淘汰策略

> 承上：[Redis 基础与数据类型](./01-Redis%20基础与数据类型) —— 先认识数据结构，再学持久化与淘汰如何保障数据安全与内存可控
> 启下：[Node.js 操作 Redis](./03-Node.js%20操作%20Redis) —— 用 ioredis 完成各数据类型的读写，并封装一个支持过期时间与分布式锁的 Redis 服务

---

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

## 小结

- **三种持久化方式（RDB / AOF / 混合）**
  1. **RDB 快照**：靠 `save 900 1` 这类规则或 `BGSAVE` 定期落盘；文件紧凑、恢复快，但可能丢最后一次快照之后的数据
  2. **AOF 日志**：每个写命令追加落盘，`appendfsync everysec` 是默认且推荐的折中，最多丢 1 秒数据，代价是文件更大、恢复更慢
  3. **AOF 重写**：`auto-aof-rewrite-percentage 100` 加 `auto-aof-rewrite-min-size 64mb` 触发，或手动 `BGREWRITEAOF`，去掉冗余命令压小文件
  4. **混合持久化**：`aof-use-rdb-preamble yes` 让 RDB 快照充当 AOF 前缀，同时拿到 RDB 的恢复速度与 AOF 的高安全性
- **过期策略与内存淘汰**
  - **惰性删除 + 定期删除**：访问时才判断过期并删除；另外每 100ms 随机抽一批带 TTL 的 key 检查，`hz` 控制每秒检查次数（默认 10）
  - **八种内存淘汰策略**：默认 `noeviction` 写操作直接报错；纯缓存场景用 `allkeys-lru`，只想淘汰带 TTL 的 key 用 `volatile-*`，`maxmemory` 划定内存上限
- **生产场景：内存监控与热点排查**
  - **内存监控指标**：`used_memory` 与 `maxmemory` 看水位、内存碎片率超过 1.5 要告警、`evicted_keys` 持续增长说明容量不足
  - **Big Key 的判定与危害**：String 超过 10KB 或集合类超过 5000 元素；会阻塞 Redis、造成集群数据倾斜与网络开销
  - **Big Key 怎么处理**：拆成多个子 Hash、压缩大 JSON、用 `UNLINK` 异步删除，List 可用 `LTRIM` 分批清理
  - **Hot Key 的判定与处理**：单 key QPS 过万、某节点 CPU 明显偏高即是热点；用本地缓存、读写分离、副本分片、限流四种手段分散
- **Redis 事务**
  - **打包执行但不回滚**：`MULTI` / `EXEC` 只保证把命令打包执行、不支持回滚，`WATCH` 做乐观锁；语法错误整批不执行，运行时错误只影响出错那条

---

## 配套代码

本篇的可运行示例在仓库 `node/06-Redis/code/redis-demo`。

| 文件 | 演示什么 |
| --- | --- |
| `02-expire.js` | TTL、过期行为观察与淘汰策略 |

运行方式见 `redis-demo/README.md`。

---

## 参考

- 本模块总结：[总结](../05-数据库/总结.md)
- 本模块面试题：[面试题](../05-数据库/面试题.md)
- 上一篇：[Redis 基础与数据类型](./01-Redis%20基础与数据类型)
- 下一篇：[Node.js 操作 Redis](./03-Node.js%20操作%20Redis)