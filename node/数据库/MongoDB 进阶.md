# MongoDB 进阶


---

## 索引与查询优化

> 本篇示例几乎都逐字摘自配套工程 `mongo-demo`（官方 `mongodb` 驱动 + Mongoose，见 `./code/mongo-demo/README.md`）。**本机没有 MongoDB 服务，需要连库的脚本均未实跑**；`readpref` 一段的枚举校验不连库，下方给出实测输出。唯一例外是「分片键常见坑点」——`sh.shardCollection(...)` 是 `mongosh` 的分片集群管理命令，驱动里没有对应 API，只能标为示意片段。

### 创建索引

> 摘自 `./code/mongo-demo/src/09-index.js`（运行：`npm run index`）

```javascript
// 单字段索引
await users.createIndex({ name: 1 })  // 1 升序，-1 降序

// 复合索引
await users.createIndex({ age: 1, name: 1 })

// 唯一索引
await users.createIndex({ email: 1 }, { unique: true })
```

`createIndex` 是**幂等**的：索引已存在时不会报错，直接返回索引名。索引不是白建的——每个索引都会拖慢写入、占内存，要按真实查询建。

（本机无 MongoDB 服务，以上脚本未实跑）

### 使用 explain() 分析查询

> 摘自 `./code/mongo-demo/src/10-explain.js`（运行：`npm run explain`）

```javascript
const plan = await users.find({ age: { $gt: 18 } }).explain('executionStats')
console.log('  winningPlan.stage                    =', plan.queryPlanner.winningPlan.stage, '（IXSCAN = 走了索引，COLLSCAN = 全集合扫描）')
console.log('  executionStats.totalDocsExamined     =', plan.executionStats.totalDocsExamined, '（扫描的文档数，越小越好）')
console.log('  executionStats.nReturned             =', plan.executionStats.nReturned, '（返回的文档数）')
console.log('  executionStats.executionTimeMillis   =', plan.executionStats.executionTimeMillis, 'ms（执行时间）')
```

`explain('executionStats')` 会**真跑一遍**查询再给你统计，所以它本身也有开销，别在线上对着大集合随手跑。

（本机无 MongoDB 服务，以上脚本未实跑）

重点关注：

| 字段 | 说明 |
|------|------|
| `totalDocsExamined` | 扫描的文档数（越小越好） |
| `nReturned` | 返回的文档数 |
| `executionTimeMillis` | 执行时间 |
| `IXSCAN` | 使用了索引扫描 |
| `COLLSCAN` | 全集合扫描（需要优化） |

### 慢查询优化

> 摘自 `./code/mongo-demo/src/10-explain.js`（运行：`npm run explain`）

```javascript
// 启用慢查询日志
await db.setProfilingLevel(1, { slowms: 100 })
const level = await db.command({ profile: -1 })
```

级别 1 = 只记录慢查询、2 = 记录全部，`0` 则关闭；**关掉时 `system.profile` 这个集合会被一起删掉**，想留档要先把它导出来。

（本机无 MongoDB 服务，以上脚本未实跑）

## 聚合管道

聚合管道（Aggregation Pipeline）是 MongoDB 强大的数据处理工具，**类似 MySQL 的 GROUP BY**。

### 常用阶段

> 摘自 `./code/mongo-demo/src/11-aggregate.js`（运行：`npm run aggregate`）

```javascript
const topBuyers = await orders.aggregate([
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
]).toArray()
```

阶段顺序很关键：`$match` 越靠前，后面要处理的数据越少（先用索引过滤，再分组）。

（本机无 MongoDB 服务，以上脚本未实跑）

### 常见聚合场景

> 摘自 `./code/mongo-demo/src/11-aggregate.js`（运行：`npm run aggregate`）

```javascript
// 按月份统计订单总额
const byMonth = await orders.aggregate([
    { $group: {
        _id: { $month: '$createdAt' },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
]).toArray()
// …
// 用户总消费统计（关联用户信息）
const spent = await orders.aggregate([
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
]).toArray()
```

`$unwind` 会把 `$lookup` 产生的数组摊平：`$lookup` 后 `user` 是数组，`$unwind` 后才是对象。

（本机无 MongoDB 服务，以上脚本未实跑）

## 事务与原子性

### 多文档事务

> 摘自 `./code/mongo-demo/src/12-transaction.js`（运行：`npm run tx`）

```javascript
// 一次下单要改两个文档：扣库存 + 建订单，中途失败必须整笔撤销
async function buy(userId, productId, amount) {
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
}
```

会话把「扣库存 + 建订单」绑成一笔事务，中间任一步抛错就整体回滚。

（本机无 MongoDB 服务，以上脚本未实跑）

> MongoDB 4.0+ 支持多文档事务，但性能低于 MySQL 事务，建议只在必要时使用。**单机 mongod 起不了事务**——多文档事务要求副本集（或分片集群），脚本运行失败时驱动报的是环境限制，不是写法错。

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

> 摘自 `./code/mongo-demo/src/13-read-preference.js`（运行：`npm run readpref`）

```javascript
// Node.js Mongoose 配置读写分离
const base = 'mongodb://primary:27017,secondary1:27017,secondary2:27017/myapp?' +
    'replicaSet=rs0'
const uri = base + '&readPreference=secondaryPreferred'

// readPreference=secondaryPreferred → 优先读从节点，从节点不可用时读主节点
// readPreference=primaryPreferred → 优先读主节点
// readPreference=secondary         → 只读从节点（枚举里没有 secondaryOnly，见第 3 节）
// …
// serverSelectionTimeoutMS 设小一点：本机没有这个副本集时快速失败，不至于卡住 30 秒
mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 })
```

连接串里必须带 `replicaSet=`，否则驱动只当它是单个节点，读写分离不生效。

`readPreference` 的合法值只有 5 个，驱动在构造 `MongoClient` 时就会校验——这一段**不需要服务端**，实测输出如下：

```txt
=== 3. readPreference 的五个合法值 ===
  primary             → 驱动接受，解析成 "primary" ：只读主节点（默认）
  primaryPreferred    → 驱动接受，解析成 "primaryPreferred" ：优先主节点，主不可用才读从
  secondary           → 驱动接受，解析成 "secondary" ：只读从节点
  secondaryPreferred  → 驱动接受，解析成 "secondaryPreferred" ：优先从节点，从不可用才读主
  nearest             → 驱动接受，解析成 "nearest" ：读网络延迟最低的节点（可能是主，也可能是从）
  secondaryOnly       → 抛错 MongoInvalidArgumentError: Invalid read preference mode "secondaryOnly"
  所以"只读从节点"要写 secondary，不是 secondaryOnly
```

上面第 2 节 `mongoose.connect(uri)` 因为本机没有这个副本集而失败（`Server selection timed out after 3000 ms`），这是环境限制，不是脚本问题。

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

> 示意片段（无配套脚本）

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

> 摘自 `./code/mongo-demo/src/14-pagination.js`（运行：`npm run pagination`）

```javascript
// 优化方案 1：查询条件带上分片键，能只查一个分片
await orders.find({ user_id: 12345 }).sort({ created_at: -1 }).skip(0).limit(10).toArray()
// …
// 优化方案 2：游标分页
// 使用上一页最后一条的 _id 代替 OFFSET
const lastPage = await orders.find().sort({ _id: 1 }).limit(3).toArray()
const lastId = lastPage[lastPage.length - 1]._id
await orders.find({ _id: { $gt: lastId } }).sort({ _id: 1 }).limit(10).toArray()
```

问题在于：分页需要每个分片返回 N 条，客户端聚合再排序取前 N 条，分片越多、数据量越大性能越差；`skip` 越大越慢，因为服务端要先「数着跳过」的记录，分片集群下每个分片都得数一遍再汇总。条件里带上 `user_id`（分片键）就只路由到一个分片；不带 `skip` 的游标分页是范围查询，翻第 100 页和翻第 1 页一样快。统计报表结果不常变，第三种方案是直接缓存到 Redis。

（本机无 MongoDB 服务，以上脚本未实跑）

---

## 生产场景：MongoDB 索引优化

### 常见索引失效场景

> 摘自 `./code/mongo-demo/src/09-index.js`（运行：`npm run index`）

```javascript
// 复合索引最左前缀原则和 MySQL 一样
// 索引：{ user_id: 1, created_at: -1 }

// ✅ 能用到索引：find({ user_id: 123 })
await orders.find({ user_id: 123 }).toArray()
// ✅ 能用到索引：等值 + 范围（最左列在，后面的列才能接着用）
await orders.find({ user_id: 123, created_at: { $gt: new Date('2024-01-01') } }).toArray()
// ❌ 用不到索引：跳过了最左列 user_id
await orders.find({ created_at: { $gt: new Date('2024-01-01') } }).toArray()

// 索引失效：正则前缀模糊
await users.find({ name: /^张/ }).toArray()   // 前缀匹配可以用到索引
await users.find({ name: /张三/ }).toArray()   // 包含匹配，不走索引

// 索引失效：把函数作用在索引列上（$expr + $year，等价于 SQL 的 year(created_at) = 2024）
await orders.find({ $expr: { $eq: [{ $year: '$created_at' }, 2024] } }).toArray()

// 正确写法：改写成范围条件才走索引
await orders.find({
    created_at: {
        $gte: new Date('2024-01-01'),
        $lt: new Date('2025-01-01')
    }
}).toArray()
```

脚本里紧跟着一批 `explain('executionStats')`，把上面每条结论逐个验证一遍——`$expr + $year` 那条会退化成 `COLLSCAN`，范围条件那条才回到 `IXSCAN`。

（本机无 MongoDB 服务，以上脚本未实跑）

### 覆盖索引优化

> 摘自 `./code/mongo-demo/src/09-index.js`（运行：`npm run index`）

```javascript
// 如果查询只需要索引中包含的字段，不需要回表
// 只需要计数时，{ user_id: 1 } 这一个索引就能覆盖，不必回表取整条文档
const total = await orders.countDocuments({ user_id: 123 })
// 检查：explain() 里 winningPlan 只有 IXSCAN、没有 FETCH → 覆盖索引命中
const coveredPlan = await orders
    .find({ user_id: 123 }, { projection: { user_id: 1, created_at: 1, _id: 0 } })
    .explain('executionStats')
```

脚本把「只查索引里的两列」与「同条件查全列」两种写法各跑一次 `explain`：前者 `totalDocsExamined = 0`（没回表读文档），后者带 `FETCH` 阶段、`totalDocsExamined` 等于命中行数。

（本机无 MongoDB 服务，以上脚本未实跑）

### 生产场景：慢查询排查

> 摘自 `./code/mongo-demo/src/10-explain.js`（运行：`npm run explain`）

```javascript
// 启用慢查询日志
await db.setProfilingLevel(1, { slowms: 100 })
const level = await db.command({ profile: -1 })
// …
// 查看慢查询
const slow = await db.collection('system.profile').find({ millis: { $gt: 100 } })
    .sort({ ts: -1 })
    .limit(10)
    .toArray()
// …
// 分析：explain('executionStats')
const pendingPlan = await orders.find({ status: 'pending' }).explain('executionStats')
```

排查顺序是：`system.profile` 找慢查询 → `explain` 看 `stage` / `rows` → 再决定是补索引还是改写法。`totalDocsExamined >> nReturned` 就说明扫描远多于返回，需要优化。

（本机无 MongoDB 服务，以上脚本未实跑）

## 配套代码

本篇的示例在仓库 `node/数据库/code/mongo-demo`（官方 `mongodb` 驱动 + Mongoose，与上篇 [MongoDB 入门](./MongoDB%20入门) 共用同一个工程）。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/mongo-demo/src/09-index.js` | 索引创建、最左前缀与索引失效场景、覆盖索引（一串 `explain` 逐条验结论） | 索引与查询优化 · 常见索引失效场景 · 覆盖索引优化 |
| `./code/mongo-demo/src/10-explain.js` | `explain('executionStats')` 三列读法、profiling 慢查询日志与 `system.profile` | 索引与查询优化 · 生产场景：慢查询排查 |
| `./code/mongo-demo/src/11-aggregate.js` | 聚合管道：`$match` / `$group` / `$sort` / `$project` / `$limit`、`$month` 按月分组、`$lookup` + `$unwind` | 聚合管道（常用阶段 / 常见聚合场景） |
| `./code/mongo-demo/src/12-transaction.js` | 多文档事务：`startSession` / `startTransaction` / `commit` / `abort` / `endSession` 与回滚验证 | 事务与原子性 · 多文档事务 |
| `./code/mongo-demo/src/13-read-preference.js` | 副本集连接串、`mongoose.connect` 读写分离；`readPreference` 五个合法值的枚举校验（不需要服务端） | 副本集与高可用 · 生产场景：读写分离配置 |
| `./code/mongo-demo/src/14-pagination.js` | `skip/limit` 的代价、分片键路由、游标分页 | 分片集群与水平扩展 · 生产场景：跨分片分页查询 |
| `./code/mongo-demo/src/lib.js` | 公共工具：从 `.env` 读连接串、`withDb()` 统一开关连接 | -- |
| `./code/mongo-demo/README.md` | 工程说明与命令清单 | -- |

运行方式（在 `code/mongo-demo` 目录下，先 `cp .env.example .env` 再 `npm install`）：`npm run index` / `explain` / `aggregate` / `tx` / `readpref` / `pagination`；其中 `readpref` 的第 3 节不需要 MongoDB 服务。**本机没有 MongoDB 服务，需要连库的部分均未实跑**，`readpref` 的实测输出已贴在上面「读写分离配置」小节。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[MongoDB 入门](./MongoDB%20入门)
- 下一篇：[PostgreSQL 与 pgvector](./PostgreSQL%20与%20pgvector)