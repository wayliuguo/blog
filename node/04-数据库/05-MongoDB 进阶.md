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

## [高级] 副本集与分片

### 副本集（Replica Set）

主从复制架构：

```
Primary（主节点）→ 读写
    ↓ 异步复制
Secondary（从节点）→ 只读

Secondary（从节点）→ 只读
```

**作用**：
- 高可用：主节点宕机，自动选举新主节点
- 数据冗余：数据有多个副本
- 读写分离：读请求可以分发到从节点

### 分片集群（Sharding）

水平扩展架构：

```
            应用
             ↓
        mongos（路由）
         ↙      ↘
    shard1      shard2      shard3
    (0-10000)  (10001-20000) (20001-30000)
```

**分片键选择**：

```javascript
// 选择分片键的原则
// 1. 数据分布均匀
// 2. 查询效率高
// 3. 不可变（分片键一旦选定不能修改）

sh.shardCollection('myapp.users', { _id: 'hashed' })
```

---

## 面试题

### Q1: MongoDB 聚合管道中的 `$lookup` 和 MySQL 的 JOIN 有什么区别？

`$lookup` 在功能上类似 LEFT JOIN，但 MongoDB 的聚合管道是分阶段处理的，每个阶段产生新的文档集合。`$lookup` 性能不如 MySQL 的 JOIN，不建议在频繁查询中使用。

### Q2: 什么时候应该使用 MongoDB 的副本集？

当需要高可用和数据冗余时使用副本集。副本集至少需要 3 个节点，主节点故障时自动选举新主节点，从节点可提供读服务。

---

## 参考

- 上一篇：[MongoDB 入门](./04-MongoDB%20入门)
- 下一篇：[Redis 基础与数据类型](../05-Redis/01-Redis%20基础与数据类型)