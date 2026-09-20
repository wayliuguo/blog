# MongoDB 入门


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

> 示意片段（无配套脚本）

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

`_id` 不用自己生成：驱动在插入前用 `ObjectId` 造好。它一共只有 12 个字节，前 4 字节是创建时间戳，所以**按 `_id` 排序 ≈ 按插入时间排序**（这也是后面游标分页敢拿 `_id` 当游标的原因）。这段不连库就能跑：

> 摘自 `./code/mongo-demo/src/03-objectid.js`（运行：`npm run objectid`）

```javascript
const { ObjectId } = require('mongodb')
// …
const id = new ObjectId()
// …
const hex = id.toString()
console.log('  十六进制长度 =', hex.length, '位 =', hex.length / 2, '字节')
console.log('  前 4 字节 =', hex.slice(0, 8), '→ 时间戳', id.getTimestamp().toISOString())
```

实测输出（`npm run objectid`）：

```
=== 1. 新生成一个 _id ===
  ObjectId = 6aab89b26e27b72f52ac4242
  类型 = ObjectId （BSON 类型，不是字符串）
=== 2. 12 个字节里装了什么 ===
  十六进制长度 = 24 位 = 12 字节
  前 4 字节 = 6aab89b2 → 时间戳 2026-09-17T06:33:22.000Z
  时间戳只精确到秒，同一秒内的并发插入靠后 8 字节区分
  所以按 _id 排序 ≈ 按插入时间排序（这也是游标分页敢用 _id 当游标的原因）
=== 3. 字符串与 ObjectId 互转 ===
  用字符串还原后 equals() = true
  存进 JSON 会变成字符串，取出来必须再 new ObjectId() 才能当 _id 用
=== 4. 校验一个 _id 字符串 ===
  ObjectId.isValid(24 位十六进制) = true
  只认 24 位十六进制：/^[0-9a-f]{24}$/.test(hex) = true
  new ObjectId("abc") 直接抛错 → BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer
```

注意最后一个报错：**字符串长度不对会直接抛 `BSONError`**，所以接口入参里的 `_id` 要先校验（`/^[0-9a-f]{24}$/`），否则错误会以 500 的形式冒到用户面前。

## 基本 CRUD

> 本篇的代码块都逐字摘自配套工程 `mongo-demo`（官方 `mongodb` 驱动 + Mongoose，见 `./code/mongo-demo/README.md`）。`mongosh` 里的 `db.users.find()` 在驱动里就是 `users.find()`——**方法同名**，只是 `db.users` 换成了 collection 对象。脚本按「插入 → 查询 → 更新 → 删除」的顺序跑，下面按知识点拆开看。**本机没有 MongoDB 服务，需要连库的脚本均未实跑**（不连库的两段例外，下方给出实测输出）。

### 查询

> 摘自 `./code/mongo-demo/src/02-crud.js`（运行：`npm run crud`）

```javascript
const users = db.collection('users')
// …
const all = await users.find().toArray()
const adults = await users.find({ age: { $gt: 18 } }).toArray()
const zhang = await users.find({ name: /张/ }).toArray()
const inList = await users.find({ age: { $in: [18, 20] } }).toArray()
```

三种条件写法对应 mongosh 里的同一件事：`$gt` 是比较操作符、`/张/` 是正则、`$in` 是"取其中一个"。驱动返回的是**游标**，`.toArray()` 才会真的把文档取回来。

（本机无 MongoDB 服务，以上脚本未实跑）

### 插入

> 摘自 `./code/mongo-demo/src/02-crud.js`（运行：`npm run crud`）

```javascript
const one = await users.insertOne({ name: '张三', age: 25, city: '北京' })
const many = await users.insertMany([
    { name: '李四', age: 30, city: '上海' },
    { name: '王五', age: 28, city: '广州' },
    { name: '张伟', age: 17, city: '深圳' }
])
```

`insertOne` 返回 `insertedId`——`_id` 是**驱动在客户端生成**的（见后面 `_id` 与 ObjectId）；`insertMany` 返回 `insertedCount` 与一个按位置排列的 `insertedIds`。

（本机无 MongoDB 服务，以上脚本未实跑）

### 更新

> 摘自 `./code/mongo-demo/src/02-crud.js`（运行：`npm run crud`）

```javascript
const upd = await users.updateOne({ name: '张三' }, { $set: { age: 26 } })
const updMany = await users.updateMany({ age: { $lt: 18 } }, { $set: { status: '未成年' } })
```

`$set` 是"只改这几个字段"，不写操作符直接传文档会**整条替换**。返回里 `matchedCount` 是匹配到几条、`modifiedCount` 是真正改了几条——两者不相等，说明文档本来就是这个值。

（本机无 MongoDB 服务，以上脚本未实跑）

### 删除

> 摘自 `./code/mongo-demo/src/02-crud.js`（运行：`npm run crud`）

```javascript
const del = await users.deleteOne({ name: '张三' })
const delMany = await users.deleteMany({ age: { $lt: 18 } })
```

`deleteOne` / `deleteMany` 的 `deletedCount` 命中 0 条时就是 0，常用来判断"目标文档到底存不存在"。

（本机无 MongoDB 服务，以上脚本未实跑）

## Mongoose 在 Node.js 中使用

Mongoose 是 Node.js 操作 MongoDB 最流行的 ODM（对象文档映射）库。

### 安装

```bash
npm install mongoose
```

### 连接数据库

> 摘自 `./code/mongo-demo/src/04-mongoose-connect.js`（运行：`npm run mconnect`）

```javascript
const mongoose = require('mongoose')

// 本地默认连 myapp 库；生产把连接串放到 .env 的 MONGO_URI 里
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/myapp'

mongoose.connect(uri)
    .then(() => console.log('MongoDB 连接成功'))
    .catch(err => console.error('连接失败', err))
```

和原生驱动不同，`mongoose.connect()` 建的是**全局单例连接**，脚本跑完要自己 `mongoose.disconnect()`，否则进程不会退出；`mongoose.connection.readyState` 是它的状态位（0 断开 / 1 已连接）。

（本机无 MongoDB 服务，以上脚本未实跑）

### Schema 定义

> 摘自 `./code/mongo-demo/src/05-model.js`（运行：`npm run model`）

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

`required` / `default` 是**客户端校验**，写入前就能拦住；而 `unique: true` 只是让 Mongoose 去建一个唯一索引，真正拦住重复的是**服务端的索引**——所以脚本里要 `await User.init()` 等索引建好，再去插重复数据。

（本机无 MongoDB 服务，以上脚本未实跑）

### CRUD 操作

> 摘自 `./code/mongo-demo/src/05-model.js`（运行：`npm run model`）

```javascript
// 创建
const created = await User.create({ name: '张三', age: 25 })
// …
// 查询
const found = await User.find({ age: { $gt: 18 } })
const byId = await User.findById(created._id)
// …
// 更新
await User.updateOne({ _id: created._id }, { $set: { age: 26 } })
// …
// 删除
await User.deleteOne({ _id: created._id })
```

`create` / `find` / `findById` 这些方法与原生驱动的 collection 方法一一对应，多出来的是**文档实例**：`findById` 拿到的是 `User` 实例，能直接读 `.name`，`updateOne` 则绕过实例、也不走 Schema 校验。

（本机无 MongoDB 服务，以上脚本未实跑）

## 文档关系设计

### 嵌入（Embedding）

> 摘自 `./code/mongo-demo/src/06-embed-vs-ref.js`（运行：`npm run embed`）

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

（本机无 MongoDB 服务，以上脚本未实跑）

### 引用（Reference）

> 摘自 `./code/mongo-demo/src/06-embed-vs-ref.js`（运行：`npm run embed`）

```javascript
// 订单引用用户 ID
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    total: Number,
    items: [String]
})
// …
// 查询时 populate
const orders = await Order.find().populate('userId')
```

`ref: 'User'` 只是**告诉 Mongoose 这个 ObjectId 指向哪个 Model**，库里存的仍然是一个普通 ObjectId——所以不 `populate` 就只能拿到 id，`populate` 的本质是"再发一次查询"。

（本机无 MongoDB 服务，以上脚本未实跑）

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

> 摘自 `./code/mongo-demo/src/07-logs.js`（运行：`npm run logs`）

```javascript
const accessLogs = db.collection('access_logs')
// 访问日志集合，数据自动过期
await accessLogs.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400 * 30 }  // 30 天后自动删除
)
// 写入日志
await accessLogs.insertOne({
    userId: 12345,
    action: 'login',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date()
})
```

**TTL 索引原理**：MongoDB 后台每 60 秒扫描一次，删除过期文档。适合日志、会话、临时数据等场景。`expireAfterSeconds` 必须建在**日期或带时间的数组字段**上，普通字段上建了不会生效。

（本机无 MongoDB 服务，以上脚本未实跑）

### 生产场景：日志分表策略

> 摘自 `./code/mongo-demo/src/07-logs.js`（运行：`npm run logs`）

```javascript
// 按日期分集合存储日志
// 每天一个集合，方便管理
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const collectionName = `logs_${today}`  // 如 logs_20240101

// 写入当天日志
await db.collection(collectionName).insertOne({
    level: 'ERROR',
    message: '数据库连接超时',
    stack: '...',
    timestamp: new Date()
})

// 查询某天日志
const errors = await db.collection('logs_20240101').find({ level: 'ERROR' }).sort({ timestamp: -1 }).toArray()
```

**优势**：历史日志集合可整体删除（`drop()`），比 DELETE 快得多，且不产生碎片。代价是**查询必须带日期**——`logs_20240101` 和今天的集合是两个完全独立的集合，跨天统计要在应用层汇总。

（本机无 MongoDB 服务，以上脚本未实跑）

---

## 生产场景：评论/回复系统

MongoDB 的嵌套文档非常适合存储评论和回复。

### 嵌入式评论设计

> 摘自 `./code/mongo-demo/src/08-comments.js`（运行：`npm run comments`）

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
// …
// 添加评论
await Post.updateOne(
    { _id: postId },
    { $push: { comments: { userId, userName, content } } }
)
// …
// 添加回复
await Post.updateOne(
    { _id: postId, 'comments._id': commentId },
    { $push: { 'comments.$.replies': { userId, userName, content } } }
)
```

`$push` 只管追加，**定位到"哪一条评论"靠条件里的 `comments._id`**：少了它，`comments.$` 里的 `$` 就没有落点，更新会静默落空（脚本里单独演示了这一点）。

**适用判断**：每条评论数据量小（< 1KB），一篇文档内的评论数通常不超过 100 条，适合嵌入。

（本机无 MongoDB 服务，以上脚本未实跑）

## 配套代码

本篇的示例在仓库 `node/数据库/code/mongo-demo`（官方 `mongodb` 驱动 + Mongoose）。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/mongo-demo/src/01-connect.js` | 连接、`ping` 与集合操作（`listCollections` / `createCollection` / `drop`） | 什么是 NoSQL 与文档型数据库 |
| `./code/mongo-demo/src/02-crud.js` | 插入（`insertOne` / `insertMany`）、查询（`$gt` / 正则 / `$in`）、更新（`$set`）、删除 | 基本 CRUD（查询 / 插入 / 更新 / 删除） |
| `./code/mongo-demo/src/03-objectid.js` | `_id` 与 `ObjectId`：12 字节结构、时间戳、字符串互转、非法值报错 | 文档示例 |
| `./code/mongo-demo/src/04-mongoose-connect.js` | `mongoose.connect()`、`readyState` 与 `disconnect()` | Mongoose 在 Node.js 中使用 · 连接数据库 |
| `./code/mongo-demo/src/05-model.js` | Schema 与 `mongoose.model()`、Model 上的 CRUD、`required` / `unique` / `default` 何时生效 | Schema 定义 · CRUD 操作 |
| `./code/mongo-demo/src/06-embed-vs-ref.js` | 嵌入 vs 引用：一次查询拿全 vs 两次查询、`populate` 的本质 | 文档关系设计（嵌入 / 引用） |
| `./code/mongo-demo/src/07-logs.js` | TTL 索引自动过期、按日期分集合、历史集合整体 `drop()` | 生产场景：日志系统（TTL 索引自动过期 / 日志分表策略） |
| `./code/mongo-demo/src/08-comments.js` | 嵌套评论与回复：`$push` 追加、`comments.$` 定位、条件漏写时的落空 | 生产场景：评论/回复系统 |
| `./code/mongo-demo/src/lib.js` | 公共工具：从 `.env` 读连接串、`withDb()` 统一开关连接 | -- |

运行方式（在 `code/mongo-demo` 目录下，先 `cp .env.example .env` 再 `npm install`）：`npm run connect` / `crud` / `objectid` / `mconnect` / `model` / `embed` / `logs` / `comments`；其中 `objectid` 不需要 MongoDB 服务。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Node.js 操作 MySQL](./Node.js%20操作%20MySQL)
- 下一篇：[MongoDB 进阶](./MongoDB%20进阶)