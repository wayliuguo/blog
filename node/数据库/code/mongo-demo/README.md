# mongo-demo

《Node.js 后端知识体系》模块 数据库里 MongoDB 两篇（`05-MongoDB 入门`、`06-MongoDB 进阶`）的配套代码。

一句话定位：**用官方 `mongodb` 驱动 + Mongoose 各写一遍**——`mongosh` 里的 `db.users.find()` 在驱动里就是 `users.find()`，
把 Shell 与 Node 代码的对应关系摆在一起，顺便回答"什么时候该用 ODM、什么时候直接上驱动"。

正文里每个 JS 代码块上方都标了 `> 摘自 ./code/mongo-demo/src/xx.js`，可以逐块对照。

---

## 环境要求

- Node.js 18+
- MongoDB 6.0+（`mongod` 单机即可；只有 `12-transaction.js` 需要副本集，单机跑会直接报错，属预期）

---

## 3 步跑起来

第一步：起一个本地 mongod（或用已有的连接串）

```bash
mongod --dbpath /your/data/dir        # 默认监听 127.0.0.1:27017
```

第二步：配置连接信息

```bash
cp .env.example .env                 # 需要改端口/库名时编辑它
```

第三步：安装依赖并运行任意一个脚本

```bash
npm install
npm run crud                         # 或 connect / objectid / mconnect / model / embed / logs / comments / index / explain / aggregate / tx / readpref / pagination
```

不需要数据库也能跑的脚本：`npm run objectid`、`npm run readpref`（前者只用 `bson`，后者只在本地校验 `readPreference` 枚举）。

---

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 正文对应小节 |
| --- | --- | --- | --- |
| `src/01-connect.js` | 连接、`ping`、集合操作（`listCollections` / `createCollection` / `drop`） | `npm run connect` | 什么是 NoSQL 与文档型数据库 · 基本 CRUD |
| `src/02-crud.js` | `insertOne` / `insertMany`、`find` 与 `$gt` / 正则 / `$in`、`updateOne` / `updateMany`、`deleteOne` / `deleteMany` | `npm run crud` | 基本 CRUD（查询 / 插入 / 更新 / 删除） |
| `src/03-objectid.js` | `_id` 与 `ObjectId`：12 字节结构、时间戳、字符串互转、非法值报错 | `npm run objectid` | 文档示例 |
| `src/04-mongoose-connect.js` | `mongoose.connect()` 与 `readyState` / `disconnect()` | `npm run mconnect` | Mongoose 在 Node.js 中使用 · 连接数据库 |
| `src/05-model.js` | Schema 定义、`mongoose.model()`、Model 上的 CRUD、`required` / `unique` / `default` 何时生效 | `npm run model` | Schema 定义 · CRUD 操作 |
| `src/06-embed-vs-ref.js` | 嵌入 vs 引用：一次查询拿全 vs 两次查询、`populate` 的本质 | `npm run embed` | 文档关系设计（嵌入 / 引用） |
| `src/07-logs.js` | TTL 索引自动过期、按日期分集合、历史集合 `drop()` | `npm run logs` | 生产场景：日志系统 |
| `src/08-comments.js` | 嵌套评论/回复：`$push` 追加、`comments.$` 定位、条件漏写时的落空 | `npm run comments` | 生产场景：评论/回复系统 |
| `src/09-index.js` | 单字段/复合/唯一索引、最左前缀与正则/函数索引失效、覆盖索引（`IXSCAN` vs `FETCH`） | `npm run index` | 索引与查询优化 · 生产场景：MongoDB 索引优化 |
| `src/10-explain.js` | `explain('executionStats')` 三个关键数字、`setProfilingLevel` 与 `system.profile` 慢查询排查 | `npm run explain` | 使用 explain() 分析查询 · 慢查询优化 |
| `src/11-aggregate.js` | `$match → $group → $sort → $project → $limit`、`$month` 按月分组、`$lookup` + `$unwind` | `npm run aggregate` | 聚合管道（常用阶段 / 常见聚合场景） |
| `src/12-transaction.js` | 多文档事务：`startSession` / `startTransaction` / `commit` / `abort` / `endSession`（需副本集） | `npm run tx` | 事务与原子性 |
| `src/13-read-preference.js` | 副本集连接串、`readPreference` 五个合法值、`secondaryOnly` 会被驱动拒绝 | `npm run readpref` | 副本集与高可用 · 生产场景：读写分离配置 |
| `src/14-pagination.js` | `skip/limit` 的代价、带上分片键只查一个分片、游标分页（`_id: { $gt: lastId }`） | `npm run pagination` | 分片集群与水平扩展 · 生产场景：跨分片分页查询 |
| `src/lib.js` | 公共连接工具：从 `.env` 读连接串、`withDb()` 统一开关连接 | -- | -- |

---

## 预期输出

- 前置：本地 `mongod` 已启动、`.env` 里的 `MONGO_URI` 可用、已 `npm install`。
- `npm run objectid` / `npm run readpref` 不连库，任何环境下都能跑出结果；`readpref` 第 3 节会打印
  `MongoInvalidArgumentError: Invalid read preference mode "secondaryOnly"`，这是驱动在构造阶段就做的枚举校验（真实报错，不是脚本 bug）。
- `npm run tx` 需要副本集：单机 `mongod` 上 `startTransaction()` 会直接抛错，脚本会打印该错误并提示"环境限制不是脚本问题"。
- 其余脚本都会先清空自己用到的集合再造数，输出里的条数/金额/耗时按数据生成，每次运行一致（耗时随机器浮动）。
- 若未启动 mongod：脚本会在 3 秒内以
  `运行失败：connect ECONNREFUSED 127.0.0.1:27017` 退出，`serverSelectionTimeoutMS` 就是在控制这个等待。

---

## 与 `mongosh` 的对应关系

| mongosh | 官方驱动 | 说明 |
| --- | --- | --- |
| `db.users.find()` | `db.collection('users').find()` | 方法同名，`db.users` 换成 collection 对象 |
| `db.getCollection('logs_2024')` | `db.collection('logs_2024')` | 名字要动态拼时用 `collection()` 传变量 |
| `db.users.createIndex({...})` | `users.createIndex({...})` | 返回值是索引名字符串 |
| `db.orders.aggregate([...])` | `orders.aggregate([...])` | 驱动返回游标，记得 `.toArray()` |
| `db.setProfilingLevel(1, {...})` | `db.setProfilingLevel(1, {...})` | 驱动的 `Db` 上也有同名方法 |
| `sh.shardCollection(...)` | 无对应 API | 分片管理命令只在 `mongosh` 里可用，驱动连不上 `sh` 助手 |
