# MongoDB 进阶

> 承上：[MongoDB 入门](./05-MongoDB%20入门) —— 先会基础 CRUD 与 Mongoose，再学聚合管道与索引优化
> 启下：[PostgreSQL 与 pgvector](./07-PostgreSQL%20与%20pgvector) —— 在 PostgreSQL 中用 JSONB + GIN 存半结构化业务元数据，并用 pgvector 跑通一次向量相似度检索的 TopK 召回

---

## 索引与查询优化

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

## 聚合管道

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

## 事务与原子性

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

## 副本集与高可用

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

## 分片集群与水平扩展

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

## 生产场景：MongoDB 索引优化

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

## 小结

- **索引创建**：`createIndex({ name: 1 })` 单字段、`{ age: 1, name: 1 }` 复合、`{ unique: true }` 唯一索引，`1` 升序 `-1` 降序
- **explain 关键指标**：`totalDocsExamined` 是扫描文档数、`nReturned` 是返回数、`IXSCAN` 走索引、`COLLSCAN` 是全集合扫描
- **聚合管道常用阶段**：`$match` → `$group` → `$sort` → `$project` → `$limit`；`$lookup` 相当于 LEFT JOIN，`$unwind` 展开数组
- **多文档事务**：`startSession` 加 `startTransaction`，出错 `abortTransaction`；MongoDB 4.0+ 支持但性能低于 MySQL 事务
- **副本集三种角色**：Primary 唯一可写、Secondary 异步复制且可读、Arbiter 只参与选举不存数据
- **选举与大多数原则**：主节点心跳超时（默认 10 秒）触发选举，需过半数票，所以节点数取奇数 3 / 5 / 7
- **读写分离配置**：连接串带 `replicaSet` 与 `readPreference`，`secondaryPreferred` 优先读从；故障转移一般 10-30 秒完成
- **什么时候才分片**：数据超单机内存（300GB 以上）、写入超 1 万 QPS、垂直扩展到头，三者满足其一才考虑
- **分片键常见坑**：时间戳分片造成写入热点，自增 ID 哈希分片让范围查询跨全部分片；user_id 哈希或"区域 + 时间"更稳
- **跨分片分页与索引失效**：分页要各分片返回 N 条再聚合排序；正则包含匹配、对索引列用函数都会退化为 COLLSCAN，范围条件才走索引

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[MongoDB 入门](./05-MongoDB%20入门)
- 下一篇：[PostgreSQL 与 pgvector](./07-PostgreSQL%20与%20pgvector)