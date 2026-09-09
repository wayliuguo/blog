# MongoDB 进阶

---

## [中级] 索引与查询优化

### 创建索引

```javascript
// 单字段索引
db.users.createIndex({ name: 1 })  // 1 升序，-1 降序

// 复合索引
db.users.createIndex({ age: 1, name: 1 })

// 唯一索引
db.users.createIndex({ email: 1 }, { unique: true })
```

### 使用 explain() 分析查询

```javascript
db.users.find({ age: { $gt: 18 } }).explain('executionStats')
```

重点关注：

| 字段 | 说明 |
|------|------|
| `totalDocsExamined` | 扫描的文档数（越小越好） |
| `nReturned` | 返回的文档数 |
| `executionTimeMillis` | 执行时间 |
| `IXSCAN` | 使用了索引扫描 |
| `COLLSCAN` | 全集合扫描（需要优化） |

### 慢查询优化

```javascript
// 启用慢查询日志
db.setProfilingLevel(1, { slowms: 100 })
```

## [中级] 聚合管道

聚合管道（Aggregation Pipeline）是 MongoDB 强大的数据处理工具，**类似 MySQL 的 GROUP BY**。

### 常用阶段

```javascript
db.orders.aggregate([
    { $match: { status: 'completed' } },     // 过滤
    { $group: {                               // 分组聚合
        _id: '$userId',
        totalAmount: { $sum: '$amount' },
        orderCount: { $sum: 1 }
    }},
    { $sort: { totalAmount: -1 } },           // 排序
    { $project: {                             // 选择字段
        userId: '$_id',
        totalAmount: 1,
        orderCount: 1,
        _id: 0
    }},
    { $limit: 10 }                            // 限制数量
])
```

### 常见聚合场景

```javascript
// 按月份统计订单总额
db.orders.aggregate([
    { $group: {
        _id: { $month: '$createdAt' },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
])

// 用户总消费统计（关联用户信息）
db.orders.aggregate([
    { $group: {
        _id: '$userId',
        totalSpent: { $sum: '$amount' }
    }},
    { $lookup: {                              // 类似 LEFT JOIN
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
    }},
    { $unwind: '$user' },
    { $project: {
        userName: '$user.name',
        totalSpent: 1
    }}
])
```

## [中级] 事务与原子性

### 多文档事务

```javascript
const session = await mongoose.startSession()
session.startTransaction()

try {
    // 扣减库存
    await Product.updateOne(
        { _id: productId },
        { $inc: { stock: -1 } },
        { session }
    )
    // 创建订单
    await Order.create([{ userId, productId, amount }], { session })

    await session.commitTransaction()
} catch (err) {
    await session.abortTransaction()
    throw err
} finally {
    session.endSession()
}
```

> MongoDB 4.0+ 支持多文档事务，但性能低于 MySQL 事务，建议只在必要时使用。

## [高级] 副本集与高可用

### 副本集架构

```
Primary（主节点）→ 读写
    ↓ 异步复制 opLog
Secondary（从节点）→ 只读
Secondary（仲裁节点）→ 参与选举，不存储数据
```

**核心角色**：
- **Primary**：唯一可写节点，处理所有写请求
- **Secondary**：异步复制数据，可处理读请求
- **Arbiter**：只参与选举，不存储数据（节省资源）

### 选举流程

1. 主节点宕机，超时未响应心跳（默认 10 秒）
2. 剩余从节点检测到主节点下线，发起选举
3. 获得多数票的从节点成为新主节点
4. 新主节点开始接受写入

**大多数原则**：需要超过半数节点同意才能当选。因此副本集建议奇数个节点（3、5、7...）

### 生产场景：读写分离配置

```javascript
// Node.js Mongoose 配置读写分离
const mongoose = require('mongoose')

// 副本集连接串
const uri = 'mongodb://primary:27017,secondary1:27017,secondary2:27017/myapp?' +
    'replicaSet=rs0&readPreference=secondaryPreferred'

// readPreference=secondaryPreferred → 优先读从节点，从节点不可用时读主节点
// readPreference=primaryPreferred → 优先读主节点
// readPreference=secondaryOnly → 只读从节点

mongoose.connect(uri)
```

**读请求路由**：
- 一致性要求高 → 读主节点
- 可以容忍轻微延迟 → 读从节点
- 分析报表 → 读从节点

### 生产场景：故障转移测试

**模拟主节点宕机**：

```bash
# 主节点进程退出
kill -9 <primary-pid>

# 查看选举结果
mongo --host <secondary-host>
rs.status()  # 查看当前哪个节点是 primary

# 通常选举完成时间在 10-30 秒
```

---

## [高级] 分片集群与水平扩展

### 什么时候需要分片？

- 数据总量超过单机内存（300GB+）
- 写入 QPS 超过单机瓶颈（1 万+/秒）
- 需要持续增长，无法垂直扩展（加 CPU/内存不够）

### 分片键常见坑点

```javascript
// ❌ 错误：时间戳分片
// 问题：热点写入——所有新写入都在最新分片，导致单分片压力大
sh.shardCollection('myapp.orders', { created_at: 1 })

// ❌ 错误：自增 ID 哈希分片
// 问题：虽然分布均匀，但范围查询需要跨分片
sh.shardCollection('myapp.users', { _id: 'hashed' })

// ✅ 推荐：user_id 哈希分片（用户系统）
// 优势：分布均匀，每个用户的数据都在一个分片
sh.shardCollection('myapp.orders', { user_id: 'hashed' })

// ✅ 推荐：区域 + 时间（电商物流）
// 优势：区域查询可以路由到单个分片
sh.shardCollection('myapp.orders', { region: 1, created_at: 1 })
```

### 生产场景：跨分片分页查询

```javascript
// 问题：分页需要每个分片返回 N 条，客户端聚合再排序取前 N 条
// 分片越多，数据量越大，性能越差

// 优化方案 1：指定分片键范围
// 如果查询条件包含分片键，可以只查询单个分片
db.orders.find({ user_id: 12345 }).sort({ created_at: -1 }).skip(0).limit(10)

// 优化方案 2：游标分页
// 使用 last_id 替代 OFFSET
const lastId = lastResult[lastResult.length - 1]._id
db.orders.find({ _id: { $gt: lastId } }).sort({ _id: 1 }).limit(10)

// 优化方案 3：聚合查询结果缓存
// 统计报表结果不频繁变化，缓存到 Redis
```

---

## [中级] 生产场景：MongoDB 索引优化

### 常见索引失效场景

```javascript
// 复合索引最左前缀原则和 MySQL 一样
// 索引：{ user_id: 1, created_at: -1 }

// ✅ 能用到索引：find({ user_id: 123 })
// ✅ 能用到索引：find({ user_id: 123, created_at: { $gt: ... } })
// ❌ 用不到索引：find({ created_at: { $gt: ... } })

// 索引失效：正则前缀模糊
db.users.find({ name: /^张/ })  // 前缀匹配可以用到索引
db.users.find({ name: /张三/ })   // 包含匹配，不走索引

// 索引失效：对索引列使用函数
db.orders.find({ year(created_at) = 2024 })  // 不走索引

// 正确写法
db.orders.find({
  created_at: {
    $gte: ISODate('2024-01-01'),
    $lt: ISODate('2025-01-01')
  }
})  // 走索引
```

### 覆盖索引优化

```javascript
// 如果查询只需要索引中包含的字段，不需要回表
// 例如：只需要 count，不需要完整文档
db.orders.count({ user_id: 123 })
// 索引 { user_id: 1 } 就能覆盖，不需要回表到磁盘

// 检查：explain() 结果中 stage: IXSCAN，没有 FETCH → 覆盖索引命中
```

### 生产场景：慢查询排查

```javascript
// 开启 profiling
db.setProfilingLevel(1, { slowms: 100 })  // 记录 > 100ms 的查询

// 查看慢查询
db.system.profile.find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)

// 分析：explain('executionStats')
db.orders.find({ status: 'pending' }).explain('executionStats')

// 看什么：
//   executionStats.totalDocsExamined → 扫描文档数
//   executionStats.nReturned → 返回文档数
//   如果 totalDocsExamined >> nReturned → 需要优化
```

---

## 面试题

### Q1: MongoDB 聚合管道中的 `$lookup` 和 MySQL 的 JOIN 有什么区别？

`$lookup` 在功能上类似 LEFT JOIN，但 MongoDB 的聚合管道是分阶段处理的，每个阶段产生新的文档集合。`$lookup` 性能不如 MySQL 的 JOIN，不建议在频繁查询中使用。

### Q2: 什么时候应该使用 MongoDB 的副本集？

当需要高可用和数据冗余时使用副本集。副本集至少需要 3 个节点，主节点故障时自动选举新主节点，从节点可提供读服务。

### Q3: 副本集为什么建议奇数个节点？

因为选举需要"大多数"同意才能当选。偶数个节点可能出现票数相同，无法选出新主节点，导致脑裂。奇数个节点（3、5）可以避免这种情况。如果总共有 4 个节点，建议加一个仲裁节点，变成 5 个。

### Q4: 如何选择合适的分片键？

1. 数据分布均匀（避免热点分片）
2. 大多数查询包含分片键（避免全分片扫描）
3. 分片键不可变（选定后无法修改）
4. 避免单调递增字段导致热点写入（时间戳分片是常见坑）

### Q5: MongoDB 如何处理事务？

MongoDB 4.0+ 支持多文档事务，但是性能比 MySQL 差。事务开销大，不适合高频写入场景。一般单文档操作是原子的，不需要事务；只有需要多个文档原子性时才使用事务。

---

## 参考

- 上一篇：[MongoDB 入门](./05-MongoDB%20入门)
- 下一篇：[Redis 基础与数据类型](../05-Redis/01-Redis%20基础与数据类型)