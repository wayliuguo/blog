# MySQL 基础

《Node.js 后端知识体系》「MySQL 基础」篇的配套代码。

一句话定位：**刻意不用 ORM**，直接用 `mysql2` 原生驱动，把最基础的 CRUD 与 JOIN 落成能跑、能改的脚本——每一条 SQL 都可见、可改、可观察。

> 索引 / EXPLAIN / 事务 / 锁的实验脚本在 `code/MySQL 进阶`；TypeORM 工程在 `code/Node.js 操作 MySQL`。

---

## 环境要求

- Node.js 18+（用到了 `mysql2/promise`）
- MySQL 8.0+（建库脚本用到 `utf8mb4` 与递归 CTE）

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
npm run select            # 查询
npm run insert            # 插入
npm run update            # 更新
npm run delete            # 删除（清理演示用户）
npm run join              # INNER / LEFT JOIN 与关联聚合
```

---

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 你该观察到什么 |
| --- | --- | --- | --- |
| `src/select.js` | 条件 + 排序 + 限制的查询 | `npm run select` | 打印 status = 1 的前 5 个用户表格 |
| `src/insert.js` | 插入一个演示用户 | `npm run insert` | 拿到 `insertId`、`affectedRows=1` |
| `src/update.js` | 给 1 号用户充值 100 | `npm run update` | `affectedRows=1`；顺带说明「命中 0 行 = 目标不存在」 |
| `src/delete.js` | 清理演示用户 | `npm run delete` | 删除时 `affectedRows=1`；无可删时演示 `affectedRows=0` 的含义 |
| `src/join.js` | INNER JOIN、LEFT JOIN + IS NULL、关联聚合 | `npm run join` | 第 1 段只出现下过单的用户；第 2 段能捞出“从没下过单”的用户；第 3 段按用户汇总订单数与金额 |

`src/db.js` 是连接池封装（账号密码走 `.env`），被上面所有脚本共用，不单独运行。

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

### orders（订单表）
| 字段 | 类型 | 说明 | 索引 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | 主键自增 | PRIMARY |
| user_id | BIGINT UNSIGNED | 下单用户 | **KEY idx_user_created (user_id, created_at)**（用户订单几乎总是按人+时间，联合索引一次命中并免排序） |
| amount | DECIMAL(10,2) | 订单金额 | - |
| status | TINYINT | 订单状态 | - |
| created_at | DATETIME | 下单时间 | 含于上述联合索引 |

其余表（products / order_items / balance_log）见 `sql/schema.sql`；索引/事务的实验主要在 `code/MySQL 进阶` 用到它们。

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
- 本示例为聚焦“CRUD/JOIN”刻意**不使用外键约束**，用 `user_id` 等字段逻辑关联。
- 若自行加外键报 `errno 150`，通常是两表字段类型/字符集不一致（如一边 `BIGINT` 一边 `INT`、一边 `utf8` 一边 `utf8mb4`），需对齐后再加。

**造数慢 / 递归 CTE 报错**
- 10 万行用递归 CTE 生成，已 `SET SESSION cte_max_recursion_depth = 1000000`；若仍报递归深度限制，确认 MySQL 8.0+ 且该语句在同一会话执行（整文件一次性导入即可）。

## 预期输出

- 前置：需本地 MySQL 8.0+；先 `mysql -u root -p < sql/schema.sql` 建库建表、`< sql/seed.sql` 造数据，再 `cp .env.example .env` 填密码并 `npm install`。
- `npm run select` / `insert` / `update` / `delete` 各跑一步 CRUD：插入拿到 `insertId` 与 `affectedRows=1`；删除无可删时演示 `affectedRows=0` 的含义。
- `npm run join` 第 1 段只出现下过单的用户，第 2 段捞出没下过单的用户，第 3 段按用户汇总订单数与总金额。
- 若未连上 MySQL，脚本会报 `ECONNREFUSED` / 认证错误，请先确认库表已建、账号密码正确。
