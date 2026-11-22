# Node.js 操作 MongoDB

前两篇把 MongoDB 本身讲完了（基础：文档模型与 CRUD；进阶：索引与聚合）。这一篇专门讲「在 Node.js 里怎么用」：连接怎么管、Mongoose 的坑在哪、聚合和事务在代码里怎么落地，以及分页这种天天要写的场景。

## 连接管理：原生驱动 vs Mongoose

两种客户端并存是 MongoDB 生态的常态，先看同一件事的两种写法。

**原生驱动**：每个进程自己 `new MongoClient()`，用完 `close()`。项目里的封装思路是「连上 → 把 db 交给回调 → 无论如何都关掉」：

> 摘自 `./code/MongoDB 基础/src/lib.js`

```js
require('dotenv').config()
const { MongoClient } = require('mongodb')

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mongo_demo'
const DB_NAME = process.env.MONGO_DB || 'mongo_demo'
// 选了 3 秒：本机没起 mongod 时立刻报错，不用等默认的 30 秒
const TIMEOUT = Number(process.env.MONGO_TIMEOUT_MS || 3000)

async function withDb(fn) {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: TIMEOUT })
    try {
        await client.connect()
        return await fn(client.db(DB_NAME), client)
    } finally {
        await client.close()
    }
}
```

两个要点：

- `serverSelectionTimeoutMS` 默认 30 秒——连不上的服务会卡 30 秒才报错。本地开发/健康检查场景把它调小，失败时能第一时间暴露
- 驱动内部维护连接池，`close()` 是进程退出前的兜底；Web 服务里应该是「启动时 connect 一次，进程退出时 close」，不要每请求都开新连接

**Mongoose**：把连接做成全局单例，一个进程一份：

> 摘自 `./code/MongoDB 基础/src/04-mongoose-connect.js`

```js
mongoose
    .connect(uri)
    .then(() => console.log('MongoDB 连接成功'))
    .catch(err => console.error('连接失败', err))
    .finally(async () => {
        // connect() 是全局单例连接，脚本跑完要自己断开，否则进程不会退出
        console.log('  mongoose.connection.readyState =', mongoose.connection.readyState, '（1 = 已连接）')
        await mongoose.disconnect()
    })
```

`mongoose.connection.readyState` 是排查连接问题的快捷通道：0 = 断开、1 = 已连接、2 = 连接中、3 = 断开中。脚本里忘写 `disconnect()` 进程会挂住不退——这是 mongoose 脚本最常见的「为什么跑完不退出」。

**怎么选**：Web 服务、有数据模型约束的 → Mongoose；脚本、报表、不需要模型约束的快速操作 → 原生驱动。一个项目里两者并存完全正常（本 demo 就是这么做的）。

## 副本集连接与读写分离

单机 `mongod` 连接串就一个地址；上了副本集，连接串要写全所有节点并声明 `replicaSet`：

> 摘自 `./code/MongoDB 基础/src/13-read-preference.js`

```js
const base = 'mongodb://primary:27017,secondary1:27017,secondary2:27017/myapp?' + 'replicaSet=rs0'
const uri = base + '&readPreference=secondaryPreferred'
```

关键点：连接串里必须带 `replicaSet=`，否则驱动只当它是单个节点，读写分离不生效。

`readPreference` 只有五个合法值：

| 值 | 行为 |
| --- | --- |
| `primary` | 只读主节点（默认） |
| `primaryPreferred` | 优先主节点，主不可用才读从 |
| `secondary` | 只读从节点 |
| `secondaryPreferred` | 优先从节点，从不可用才读主 |
| `nearest` | 读网络延迟最低的节点 |

路由原则：一致性要求高（写后立刻读）→ 读主；能容忍轻微延迟的分析报表 → 读从。没有 `secondaryOnly` 这个值——想「只读从节点」写 `secondary`。

## Mongoose Schema 的几个易错点

Schema 基础（字段类型、required、unique）在基础篇讲过了，这里补三个实际会踩的坑：

**1. `unique` 不是校验，是索引**。它靠唯一索引实现，而索引是异步建的——`mongoose.connect()` 之后立刻插入重复数据可能拦不住，要先等索引建好：

> 摘自 `./code/MongoDB 基础/src/05-model.js`

```js
await mongoose.connect(uri)
await User.init() // 等 unique 索引真正建好，否则下面重复 email 拦不住
```

**2. `updateOne` 不走 Schema 校验**。`create()` 时 `required`/`default` 会生效，但 `updateOne` 是绕过 Schema 直接下发更新命令的，默认值不会补、required 也不查。需要校验的更新走 `doc.save()`。

**3. 校验错误长什么样**。必填字段缺失抛的是 `ValidationError`，具体字段错误在 `err.errors.<field>.message`——事务示例里就靠这个判断回滚分支：

```js
console.log('  被校验拦住 →', err.name + '：' + (err.errors?.amount?.message || err.message))
```

## 聚合管道在代码里的落地

聚合管道的完整语法在进阶篇；这里看 Node 侧的写法和两个容易忽略的细节：

> 摘自 `./code/MongoDB 基础/src/11-aggregate.js`

```js
const topBuyers = await orders
    .aggregate([
        { $match: { status: 'completed' } }, // 过滤
        {
            $group: {
                // 分组聚合
                _id: '$userId',
                totalAmount: { $sum: '$amount' },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { totalAmount: -1 } }, // 排序
        {
            $project: {
                // 选择字段
                userId: '$_id',
                totalAmount: 1,
                orderCount: 1,
                _id: 0
            }
        },
        { $limit: 10 } // 限制数量
    ])
    .toArray()
```

**细节一：阶段顺序直接决定性能**。`$match` 越靠前，后面阶段处理的数据越少——而且靠前的 `$match` 能用上索引。先 `group` 再 `match` 和先 `match` 再 `group`，在数据量上去之后是几个数量级的差距。

**细节二：`$lookup` 之后是数组，`$unwind` 之后才是对象**。想关联后直接取字段（`$user.name`），需要 `$unwind` 摊平；不摊平也能过滤，用点号路径 `user.0.name` 取数组第一项。

**按月分组**这类时间统计用日期运算符：

```js
{
    $group: {
        _id: { $month: '$createdAt' },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
    }
}
```

## 多文档事务：扣库存与建订单同生共死

MongoDB 4.0+ 支持多文档事务（要求副本集或分片集群，单机 `mongod` 会直接拒绝）。核心模式是 `startSession` → 事务内每个操作都带 `{ session }` → commit 或 abort：

> 摘自 `./code/MongoDB 基础/src/12-transaction.js`

```js
async function buy(userId, productId, amount) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        // 扣减库存
        await Product.updateOne({ _id: productId }, { $inc: { stock: -1 } }, { session })
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

三个必须记住的点：

- **事务里每个操作都要带 `{ session }`**——漏带的那个操作不参与事务，回滚时不会恢复
- 中间任一步抛错就 `abortTransaction()`，整笔撤销（demo 里故意传 `undefined` 让校验失败，验证库存没有被多扣）
- 单机跑不了事务是环境限制不是代码问题；本地开发要么装副本集，要么这段跳过

另外很多「要事务」的场景其实单文档原子操作就够了：`$inc` 扣减 + 条件更新（`findOneAndUpdate({ stock: { $gte: 1 } }, ...)`）本身就是原子的，不需要 session。真需要跨多个文档、跨多个集合才上事务。

## 分页：skip/limit 的代价与游标分页

`skip(4000).limit(10)` 这类传统分页在数据量上去后会越来越慢，分片集群下更是每个分片都要数一遍再汇总。看实测：

> 摘自 `./code/MongoDB 基础/src/14-pagination.js`

```js
// skip 越大，服务端要先"数着跳过"的记录越多
for (const skip of [0, 1000, 4000]) {
    const rows = await orders.find().sort({ _id: 1 }).skip(skip).limit(10).toArray()
}
```

**优化一：条件里带分片键/查询键**。`find({ user_id }).sort({ created_at: -1 })` 能把查询路由到单个分片，skip 也只在那一个分片里数。

**优化二：游标分页**——用上一页最后一条的 `_id` 代替 OFFSET：

> 摘自 `./code/MongoDB 基础/src/14-pagination.js`

```js
// 上一页最后一条 _id
const lastPage = await orders.find().sort({ _id: 1 }).limit(3).toArray()
const lastId = lastPage[lastPage.length - 1]._id

// 下一页：范围查询代替 skip
const next = await orders
    .find({ _id: { $gt: lastId } })
    .sort({ _id: 1 })
    .limit(10)
    .toArray()
```

游标分页翻第 100 页和翻第 1 页一样快，代价是**没有页码**（只有「下一页/上一页」）——信息流类产品全用这个，后台管理需要页码的地方数据量通常不大，skip/limit 够用。

顺带一提：`count()`（`countDocuments`）在分片集群下同样要全分片汇总，列表页的总条数统计结果不常变时，缓存到 Redis 比每次现算划算。

## ODM 还是原生驱动：一张决策表

| 场景 | 选择 | 理由 |
| --- | --- | --- |
| NestJS/Express 业务服务，模型固定 | Mongoose | 校验、钩子、类型提示，少写大量样板代码 |
| 一次性脚本、数据修复 | 原生驱动 | 不用定义 Schema，`withDb` 封装十行搞定 |
| 聚合报表、BI 查询 | 原生驱动 | 聚合结果形状和业务模型无关，Schema 帮不上忙 |
| 强约束的写入路径 | Mongoose + 事务 | Schema 校验 + session 事务双保险 |
| 动态字段、日志类写入 | 原生驱动 | 文档形状本来就自由，Schema 是负担 |

## 配套代码

本篇的可运行示例在仓库 `node/mongodb/code/MongoDB 基础`。

| 文件 | 演示什么 |
| --- | --- |
| `src/lib.js` | 原生驱动的连接封装（`serverSelectionTimeoutMS`、`withDb`、统一失败出口） |
| `src/04-mongoose-connect.js` | Mongoose 全局连接与 `readyState` |
| `src/05-model.js` | Schema/Model CRUD、`User.init()` 等 unique 索引、updateOne 不走校验 |
| `src/11-aggregate.js` | 聚合管道：常用阶段、按月分组、`$lookup` + `$unwind` |
| `src/12-transaction.js` | Mongoose 多文档事务：commit / abort 分支（需副本集） |
| `src/13-read-preference.js` | 副本集连接串与 `readPreference` 五个合法值 |
| `src/14-pagination.js` | skip/limit 代价实测、分片键定位、游标分页 |

运行方式见 `MongoDB 基础/README.md`；除 `12-transaction.js` 需要副本集外，其余脚本单机 `mongod` 即可运行。

---
