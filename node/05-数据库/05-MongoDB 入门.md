# MongoDB 入门

> 承上：[Node.js 操作 MySQL](./04-Node.js%20操作%20MySQL) —— 先掌握关系型数据库的 Node 访问模式，再学文档型数据库的异同
> 启下：[MongoDB 进阶](./06-MongoDB%20进阶) —— 用聚合管道做分组统计与 `$lookup` 关联，并给频繁查询字段建出命中 IXSCAN 的索引

---

## 什么是 NoSQL 与文档型数据库

MongoDB 是一个**文档型数据库**，数据以 JSON 格式存储。

### 与 MySQL 的类比

| MySQL | MongoDB |
|-------|---------|
| 数据库（Database） | 数据库（Database） |
| 表（Table） | 集合（Collection） |
| 行（Row） | 文档（Document） |
| 列（Column） | 字段（Field） |
| 主键（Primary Key） | `_id` 自动生成 |

### 文档示例

```json
{
    "_id": ObjectId("..."),
    "name": "张三",
    "age": 25,
    "hobbies": ["篮球", "阅读"],
    "address": {
        "city": "北京",
        "street": "长安街"
    }
}
```

MongoDB 的文档是 **BSON（Binary JSON）** 格式，支持嵌套对象和数组。

## 基本 CRUD

### 查询

```javascript
// 查询所有
db.users.find()

// 条件查询
db.users.find({ age: { $gt: 18 } })  // age > 18
db.users.find({ name: /张/ })          // 名字包含"张"
db.users.find({ age: { $in: [18, 20] } })  // age 是 18 或 20
```

### 插入

```javascript
db.users.insertOne({
    name: "张三",
    age: 25,
    city: "北京"
})

db.users.insertMany([
    { name: "李四", age: 30 },
    { name: "王五", age: 28 }
])
```

### 更新

```javascript
db.users.updateOne(
    { name: "张三" },           // 条件
    { $set: { age: 26 } }      // 更新操作
)

db.users.updateMany(
    { age: { $lt: 18 } },
    { $set: { status: "未成年" } }
)
```

### 删除

```javascript
db.users.deleteOne({ name: "张三" })
db.users.deleteMany({ age: { $lt: 18 } })
```

## Mongoose 在 Node.js 中使用

Mongoose 是 Node.js 操作 MongoDB 最流行的 ODM（对象文档映射）库。

### 安装

```bash
npm install mongoose
```

### 连接数据库

```javascript
const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/myapp')
    .then(() => console.log('MongoDB 连接成功'))
    .catch(err => console.error('连接失败', err))
```

### Schema 定义

```javascript
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
    email: { type: String, unique: true },
    hobbies: [String],
    createdAt: { type: Date, default: Date.now }
})

// 创建 Model
const User = mongoose.model('User', userSchema)
```

### CRUD 操作

```javascript
// 创建
const user = await User.create({ name: '张三', age: 25 })

// 查询
const users = await User.find({ age: { $gt: 18 } })
const user = await User.findById('64a1b2c3...')

// 更新
await User.updateOne({ _id: userId }, { $set: { age: 26 } })

// 删除
await User.deleteOne({ _id: userId })
```

## 文档关系设计

### 嵌入（Embedding）

```javascript
// 将地址直接嵌入用户文档
const userSchema = new mongoose.Schema({
    name: String,
    address: {
        city: String,
        street: String,
        zip: String
    }
})
```

**适用场景**：数据总是一起查询、不单独变化、数据量不大。

### 引用（Reference）

```javascript
// 订单引用用户 ID
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    total: Number,
    items: [String]
})

// 查询时 populate
const orders = await Order.find().populate('userId')
```

**适用场景**：数据独立变化、数据量大、需要单独查询。

### 嵌入 vs 引用

| 维度 | 嵌入 | 引用 |
|------|------|------|
| 查询速度 | 快（一次查询） | 慢（需要 JOIN） |
| 数据冗余 | 有 | 无 |
| 数据一致性 | 需要自行维护 | 引用保证一致性 |
| 文档大小限制 | 16MB | 不受限 |

## MySQL vs MongoDB 选型对比

| 场景 | 推荐 | 理由 |
|------|------|------|
| 用户、订单、财务等结构化数据 | MySQL | 强 ACID、事务支持 |
| 日志、评论、配置等灵活数据 | MongoDB | 无 Schema 限制、写性能高 |
| 复杂报表、多表关联查询 | MySQL | JOIN 成熟 |
| 快速迭代、数据结构频繁变化 | MongoDB | 无需迁移 |

---

## 生产场景：日志系统

MongoDB 的文档结构和无 Schema 特性，使其非常适合存储日志数据。

### TTL 索引自动过期

```javascript
// 访问日志集合，数据自动过期
db.access_logs.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400 * 30 }  // 30 天后自动删除
)

// 写入日志
db.access_logs.insertOne({
    userId: 12345,
    action: 'login',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date()
})
```

**TTL 索引原理**：MongoDB 后台每 60 秒扫描一次，删除过期文档。适合日志、会话、临时数据等场景。

### 生产场景：日志分表策略

```javascript
// 按日期分集合存储日志
// 每天一个集合，方便管理
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const collectionName = `logs_${today}`  // 如 logs_20240101

// 写入当天日志
db.getCollection(collectionName).insertOne({
    level: 'ERROR',
    message: '数据库连接超时',
    stack: '...',
    timestamp: new Date()
})

// 查询某天日志
db.getCollection('logs_20240101').find({ level: 'ERROR' }).sort({ timestamp: -1 })
```

**优势**：历史日志集合可整体删除（`drop()`），比 DELETE 快得多，且不产生碎片。

---

## 生产场景：评论/回复系统

MongoDB 的嵌套文档非常适合存储评论和回复。

### 嵌入式评论设计

```javascript
// 文章评论，直接将回复嵌入
const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        content: String,
        createdAt: { type: Date, default: Date.now },
        likes: { type: Number, default: 0 },
        replies: [{                          // 嵌套回复
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            userName: String,
            content: String,
            createdAt: { type: Date, default: Date.now }
        }]
    }]
})

// 添加评论
await Post.updateOne(
    { _id: postId },
    { $push: { comments: { userId, userName, content } } }
)

// 添加回复
await Post.updateOne(
    { _id: postId, 'comments._id': commentId },
    { $push: { 'comments.$.replies': { userId, userName, content } } }
)
```

**适用判断**：每条评论数据量小（< 1KB），一篇文档内的评论数通常不超过 100 条，适合嵌入。

---

## 面试题

### Q1: 嵌入（Embedding）和引用（Referencing）的区别？

嵌入将子文档存放在父文档中，一次查询即可获取全部数据；引用通过 ID 关联，需要 `populate` 或二次查询。嵌入适合"总是一起查"的数据，引用适合独立变化的数据。

### Q2: MongoDB 和关系型数据库（如 MySQL）的适用场景？

MongoDB 适合数据结构灵活、写操作频繁、不需要复杂 JOIN 的场景；MySQL 适合数据结构固定、需要复杂关联查询和强事务保证的场景。

### Q3: ObjectId 由哪些部分组成？有什么优势？

ObjectId 是 12 字节的 BSON 类型，由 4 字节时间戳 + 5 字节机器标识 + 2 字节 PID + 3 字节计数器组成。优势：客户端生成（无需访问数据库）、有序递增（可作为排序字段）、唯一性保证。

### Q4: TTL 索引的原理和适用场景？

TTL 索引让 MongoDB 在指定时间后自动删除文档。MongoDB 后台每 60 秒扫描一次并删除过期数据。适用场景：会话数据、日志、验证码、临时缓存等有时效性的数据。

---

## 参考

- 上一篇：[Node.js 操作 MySQL](./04-Node.js%20操作%20MySQL)
- 下一篇：[MongoDB 进阶](./06-MongoDB%20进阶)