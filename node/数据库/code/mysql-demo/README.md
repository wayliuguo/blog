# mysql-demo

《Node.js 后端知识体系》模块四「数据与缓存 / 数据库」7 篇文章的配套代码，对应博客目录
`node/05-数据库/01-MySQL 基础` 到 `node/05-数据库/07-PostgreSQL 与 pgvector`。

一句话定位：**刻意不用 ORM**，直接用 `mysql2` 原生驱动，让每一条 SQL 都可见、可改、可观察。
主线理念是「会用 ORM ≠ 会数据库」——看到一条 SQL，脑子里能想到：走没走索引？回表了吗？
是不是覆盖索引？`type` / `rows` 怎么样？

---

## 环境要求

- Node.js 18+（用到了 `mysql2/promise` 与递归 CTE 之外的常见特性）
- MySQL 8.0+（建库脚本用到 `utf8mb4`、递归 CTE，索引演示依赖 8.0 的执行计划）

---

## 3 步跑起来

第一步：建库 + 建表

```bash
mysql -u root -p < sql/01-schema.sql
```

第二步：造测试数据（10 万用户 / 1000 商品 / 1 万订单 / 2 万明细，纯 SQL，无需外部工具）

```bash
mysql -u root -p mysql_demo < sql/02-seed.sql
```

第三步：配置并安装依赖，然后挑一个脚本运行

```bash
cp .env.example .env      # 改成你自己的数据库账号密码
# 编辑 .env，把 DB_PASSWORD 改成真实密码
npm install
npm run crud              # 或 npm run join / index / explain / tx / oversell / lock
```

想手动看执行计划，可把 `sql/03-explain-cases.sql` 里任意一条 SQL 前加 `EXPLAIN` 在 MySQL 客户端执行。

---

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 你该观察到什么 |
| --- | --- | --- | --- |
| `src/01-crud.js` | SELECT / INSERT / UPDATE / DELETE 基础增删改查 | `npm run crud` | 控制台打印 4 段操作与结果；插入 `affectedRows=1`、拿到 `insertId`；文末解释 `affectedRows` 含义 |
| `src/02-join.js` | INNER JOIN、LEFT JOIN + IS NULL、关联聚合 | `npm run join` | 第 1 段只出现下过单的用户；第 2 段能捞出“从没下过单”的用户；第 3 段按用户汇总订单数与金额 |
| `src/03-index.js` | 无索引 vs 有索引的等值查询性能对照 | `npm run index` | 10 万行上 100 次查询：无索引平均约几十 ms、有索引平均约 1 ms 以内，提速数十倍（具体数值随机器浮动） |
| `src/04-explain.js` | 逐条 EXPLAIN，读执行计划 6 列 | `npm run explain` | 9 条用例打印 `type/possible_keys/key/rows/filtered/Extra`；唯一索引 `const`、范围 `range`、跳过最左前缀和左模糊 `ALL` |
| `src/05-transaction.js` | 事务：扣余额+建订单+写流水，提交与回滚两分支 | `npm run tx` | 分支一余额减少对应金额并提交；分支二余额不足整体回滚，余额不变，证明原子性 |
| `src/06-oversell.js` | 防超卖：错误 SELECT 再 UPDATE vs 正确 UPDATE 带条件 | `npm run oversell` | 错误做法库存剩余非 0、成功次数 >100（超卖）；正确做法成功 100 次、库存剩余 0，数字自洽 |
| `src/07-lock.js` | 乐观锁（version + CAS + 重试）vs 悲观锁（FOR UPDATE） | `npm run lock` | 乐观锁 version 自增、冲突时重试；悲观锁在事务内锁行，提交后释放 |

---

## 表结构说明

所有表字符集均为 `utf8mb4`，引擎 `InnoDB`。

### users（用户表）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| email | VARCHAR(191) | 登录账号，全局唯一 | **UNIQUE KEY uq_email**（高频等值查询，必须唯一） |
| username | VARCHAR(64) | 昵称 | - |
| status | TINYINT | 1 正常 / 2 冻结 / 3 注销 | -（低区分度，故意不建单列索引） |
| balance | DECIMAL(10,2) | 账户余额 | - |
| version | INT | 乐观锁版本号 | - |
| created_at | DATETIME | 注册时间 | - |

### products（商品表）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| name | VARCHAR(128) | 商品名 | - |
| price | DECIMAL(10,2) | 单价 | - |
| stock | INT | 库存 | -（**不**建单列索引：区分度低、更新频繁，收益极低） |
| version | INT | 乐观锁版本号 | - |
| created_at | DATETIME | 创建时间 | - |

### orders（订单表）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| user_id | BIGINT UNSIGNED | 下单用户 | **KEY idx_user_created (user_id, created_at)**（用户订单几乎总是按人+时间，联合索引一次命中并免排序、可覆盖） |
| amount | DECIMAL(10,2) | 订单金额 | - |
| status | TINYINT | 订单状态 | - |
| created_at | DATETIME | 下单时间 | 含于上述联合索引 |

### order_items（订单明细表）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| order_id | BIGINT UNSIGNED | 所属订单 | KEY idx_order |
| product_id | BIGINT UNSIGNED | 商品 | KEY idx_product |
| quantity | INT | 数量 | - |
| price | DECIMAL(10,2) | 成交单价 | - |
| created_at | DATETIME | 时间 | - |

### balance_log（余额流水表，事务演示用）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| user_id | BIGINT UNSIGNED | 用户 | KEY idx_user |
| change_amount | DECIMAL(10,2) | 正负变动额 | - |
| type | VARCHAR(16) | pay 消费 / recharge 充值 | - |
| created_at | DATETIME | 时间 | - |

---

## 常见问题

**连不上数据库**
- 确认 MySQL 已启动，`.env` 的 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD` 正确。
- 本地用 socket 连接的，把 `DB_HOST` 改成 `127.0.0.1` 而非 `localhost`（后者在部分环境走 socket）。
- 报错 `ER_ACCESS_DENIED_ERROR`：账号密码不对；`ECONNREFUSED`：端口/地址不对或没启动。

**中文乱码**
- 库、表、连接三处字符集要一致。本示例库表已用 `utf8mb4`；`db.js` 连接池也设了 `charset: 'utf8mb4'`。
- 若仍乱码，检查 MySQL 服务端 `default-character-set` 与建库语句，切勿用旧 `utf8`（仅 3 字节，存不了 emoji）。

**外键约束报错**
- 本示例为聚焦“索引/事务/锁”刻意**不使用外键约束**，用 `user_id` 等字段逻辑关联。
- 若自行加外键报 `errno 150`，通常是两表字段类型/字符集不一致（如一边 `BIGINT` 一边 `INT`、一边 `utf8` 一边 `utf8mb4`），需对齐后再加。

**造数慢 / 递归 CTE 报错**
- 10 万行用递归 CTE 生成，已 `SET SESSION cte_max_recursion_depth = 1000000`；若仍报递归深度限制，确认 MySQL 8.0+ 且该语句在同一会话执行（整文件一次性导入即可）。

**`npm run index` 删索引后脚本中断**
- 脚本末尾会重建 `uq_email` 索引。若中途异常退出导致索引未恢复，重跑一次本脚本即可，或手动 `ALTER TABLE users ADD UNIQUE KEY uq_email (email);`。

## 预期输出

- 前置：需本地 MySQL 8.0+；先 `mysql -u root -p < sql/01-schema.sql` 建库建表、`< sql/02-seed.sql` 造数据，再 `cp .env.example .env` 填密码并 `npm install`。
- `npm run crud` 打印增删改查四段结果（插入 `affectedRows=1`、拿到 `insertId`），文末解释 `affectedRows` 含义。
- `npm run index` 在 10 万行上对比：无索引查询约几十 ms、有索引约 1ms 以内，提速数十倍（数值随机器浮动）。
- `npm run tx` 分支一回滚、余额不变，证明事务原子性；`npm run oversell` / `lock` 演示并发控制（正确做法库存剩余 0、乐观/悲观锁行为符合预期）。
- 若未连上 MySQL，脚本会报 `ECONNREFUSED` / 认证错误，请先确认库表已建、账号密码正确。
