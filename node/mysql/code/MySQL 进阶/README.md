# MySQL 进阶

《Node.js 后端知识体系》「MySQL 进阶」篇的配套代码（实验台）。

一句话定位：**刻意不用 ORM**，直接用 `mysql2` 原生驱动，把索引、EXPLAIN、事务、锁、防超卖落成能跑出**真实数字**的实验脚本——文章里的结论都能在这里复现。

> CRUD / JOIN 等基础脚本在 `code/MySQL 基础`；TypeORM 工程在 `code/Node.js 操作 MySQL`。

---

## 环境要求

- Node.js 18+（用到了 `mysql2/promise` 与 `Promise.all` 并发）
- MySQL 8.0+（建库脚本用到 `utf8mb4`、递归 CTE，索引演示依赖 8.0 的执行计划）

---

## 3 步跑起来

第一步：建库 + 建表

```bash
mysql -u root -p < sql/schema.sql
```

第二步：造测试数据（10 万用户 / 1000 商品 / 1 万订单 / 2 万明细，纯 SQL，无需外部工具）

```bash
mysql -u root -p mysql_demo < sql/seed.sql
```

第三步：配置并安装依赖，然后挑一个脚本运行

```bash
cp .env.example .env      # 改成你自己的数据库账号密码
# 编辑 .env，把 DB_PASSWORD 改成真实密码
npm install
npm run index             # 或 npm run explain / tx / oversell / lock
```

想手动看执行计划，可把 `sql/explain-cases.sql` 里任意一条 SQL 前加 `EXPLAIN` 在 MySQL 客户端执行。

---

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 你该观察到什么 |
| --- | --- | --- | --- |
| `src/index.js` | 无索引 vs 有索引的等值查询性能对照 | `npm run index` | 10 万行上 100 次查询：无索引平均约几十 ms、有索引平均约 1 ms 以内，提速数十倍（具体数值随机器浮动） |
| `src/explain.js` | 逐条 EXPLAIN，读执行计划 6 列 | `npm run explain` | 9 条用例打印 `type/possible_keys/key/rows/filtered/Extra`；唯一索引 `const`、范围 `range`、跳过最左前缀和左模糊 `ALL` |
| `src/transaction.js` | 事务：扣余额+建订单+写流水，提交与回滚两分支 | `npm run tx` | 分支一余额减少对应金额并提交；分支二余额不足整体回滚，余额不变，证明原子性 |
| `src/oversell.js` | 防超卖：错误 SELECT 再 UPDATE vs 正确 UPDATE 带条件 | `npm run oversell` | 错误做法库存剩余非 0、成功次数 >100（超卖）；正确做法成功 100 次、库存剩余 0，数字自洽 |
| `src/lock.js` | 乐观锁（version + CAS + 重试）vs 悲观锁（FOR UPDATE） | `npm run lock` | 乐观锁 version 自增、冲突时重试；悲观锁在事务内锁行，提交后释放 |

`src/db.js` 是连接池封装（账号密码走 `.env`），被上面所有脚本共用，不单独运行。

`sql/explain-cases.sql` 不对应 npm script：它是手工验证清单，在 MySQL 客户端里逐条执行即可。

---

## 表结构说明

所有表字符集均为 `utf8mb4`，引擎 `InnoDB`。完整建表语句见 `sql/schema.sql`，每条索引都写了「为什么建」的注释。

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
| created_at | DATETIME | 时间 | - |

### orders（订单表）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| user_id | BIGINT UNSIGNED | 下单用户 | **KEY idx_user_created (user_id, created_at)**（联合索引一次命中并免排序、可覆盖） |
| amount | DECIMAL(10,2) | 订单金额 | - |
| status | TINYINT | 订单状态 | - |
| created_at | DATETIME | 下单时间 | 含于上述联合索引 |

### order_items（订单明细表）与 balance_log（余额流水表）

见 `sql/schema.sql`；balance_log 是事务演示里记录每一笔扣款/充值的流水表。

---

## 常见问题

**连不上数据库**
- 确认 MySQL 已启动，`.env` 的 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD` 正确。
- 本地用 socket 连接的，把 `DB_HOST` 改成 `127.0.0.1` 而非 `localhost`（后者在部分环境走 socket）。
- 报错 `ER_ACCESS_DENIED_ERROR`：账号密码不对；`ECONNREFUSED`：端口/地址不对或没启动。

**中文乱码**
- 库、表、连接三处字符集要一致。本示例库表已用 `utf8mb4`；`db.js` 连接池也设了 `charset: 'utf8mb4'`。

**外键约束报错**
- 本示例为聚焦“索引/事务/锁”刻意**不使用外键约束**，用 `user_id` 等字段逻辑关联。

**造数慢 / 递归 CTE 报错**
- 10 万行用递归 CTE 生成，已 `SET SESSION cte_max_recursion_depth = 1000000`；若仍报递归深度限制，确认 MySQL 8.0+ 且该语句在同一会话执行（整文件一次性导入即可）。

**`npm run index` 删索引后脚本中断**
- 脚本末尾会重建 `uq_email` 索引。若中途异常退出导致索引未恢复，重跑一次本脚本即可，或手动 `ALTER TABLE users ADD UNIQUE KEY uq_email (email);`。

## 预期输出

- 前置：需本地 MySQL 8.0+；先 `mysql -u root -p < sql/schema.sql` 建库建表、`< sql/seed.sql` 造数据，再 `cp .env.example .env` 填密码并 `npm install`。
- `npm run index` 在 10 万行上对比：无索引查询约几十 ms、有索引约 1ms 以内，提速数十倍（数值随机器浮动）。
- `npm run tx` 分支二余额不足整体回滚、余额不变，证明事务原子性。
- `npm run oversell` 错误做法超卖（成功次数 >100、库存不为 0），正确做法恰好成功 100 次、库存剩余 0。
- `npm run lock` 乐观锁 version 自增、冲突自动重试；悲观锁事务内锁行、提交后释放。
- 若未连上 MySQL，脚本会报 `ECONNREFUSED` / 认证错误，请先确认库表已建、账号密码正确。
