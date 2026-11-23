# MySQL 基础

## 什么是关系型数据库

关系型数据库将数据存储在**表（Table）**中，表之间通过**外键（Foreign Key）**建立关联。

### 类比 Excel

```
Excel 工作表                  MySQL 表
┌────────┬────────┬──────┐   ┌────┬──────┬──────┐
│ 姓名   │ 年龄   │ 城市 │   │ id │ name │ age  │
├────────┼────────┼──────┤   ├────┼──────┼──────┤
│ 张三   │ 25     │ 北京 │   │ 1  │ 张三 │ 25   │
│ 李四   │ 30     │ 上海 │   │ 2  │ 李四 │ 30   │
└────────┴────────┴──────┘   └────┴──────┴──────┘
                              行（Row） 列（Column）
```

## SQL 基础

### 查询（SELECT）

日常最高频的读操作——条件 + 排序 + 限制一条龙，逐字来自配套脚本：

> 摘自 `code/MySQL 基础/src/select.js`（运行：`npm run select`）

```sql
SELECT id, username, email, balance FROM users WHERE status = 1 ORDER BY id LIMIT 5
```

其余常用语法变体（示意片段，无配套脚本）：

```sql
-- 查询所有列
SELECT * FROM users;

-- 条件过滤
SELECT * FROM users WHERE balance > 500;

-- 排序
SELECT id, username, created_at FROM users ORDER BY created_at DESC;  -- 降序
SELECT id, username, created_at FROM users ORDER BY created_at ASC;   -- 升序

-- 限制数量
SELECT * FROM users LIMIT 10;           -- 取前 10 条
SELECT * FROM users LIMIT 10 OFFSET 20; -- 第 21-30 条（分页）
```

### 插入（INSERT）

配套脚本插入一个演示用户，值用 `?` 占位符交给驱动转义（为什么不把变量拼进 SQL，见第 3 篇）：

> 摘自 `code/MySQL 基础/src/insert.js`（运行：`npm run insert`）

```sql
INSERT INTO users (email, username, status, balance, version, created_at) VALUES (?, ?, 1, 0, 1, NOW())
```

不带占位符的最朴素写法（示意片段，无配套脚本）：

```sql
INSERT INTO users (email, username, status) VALUES ('zhangsan@example.com', '张三', 1);
```

### 更新（UPDATE）

给演示用户充值 100，就一句 `UPDATE`：

> 摘自 `code/MySQL 基础/src/update.js`（运行：`npm run update`）

```sql
UPDATE users SET balance = balance + 100 WHERE id = ?
```

**注意：一定要加 WHERE，否则更新所有行！** `affectedRows` 告诉你实际改到了几行——命中 0 行常意味着「目标数据不存在」。

### 删除（DELETE）

> 摘自 `code/MySQL 基础/src/delete.js`（运行：`npm run delete`）

```sql
DELETE FROM users WHERE id = ?
```

同样**一定要加 WHERE，否则删除所有行**！

## 表设计基础

### 数据类型

建表语句逐字来自配套库的 `schema.sql`，字段注释把「为什么这么设计」写在了行内：

> 摘自 `code/MySQL 基础/sql/schema.sql`（运行：`mysql -u root -p < sql/schema.sql`）

```sql
CREATE TABLE users (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(191)    NOT NULL,                 -- 登录账号
  username    VARCHAR(64)     NOT NULL,
  status      TINYINT         NOT NULL DEFAULT 1,        -- 1=正常 2=冻结 3=注销（低区分度，故意不建单列索引）
  balance     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,    -- 账户余额
  version     INT             NOT NULL DEFAULT 1,        -- 乐观锁版本号
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- 为什么建唯一索引：email 是登录查询的高频等值条件，且必须全局唯一
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

几个类型选择的惯例：

- 主键用 `BIGINT UNSIGNED AUTO_INCREMENT`，别省
- 金额一律 `DECIMAL`，不用 `FLOAT/DOUBLE`（浮点误差在钱上不可接受）
- 少量枚举值用 `TINYINT`（如 `status`），省空间
- 字符集统一 `utf8mb4`——旧 `utf8` 只有 3 字节，存不了 emoji

### 表关系

```
一对一（1:1）：用户 ↔ 身份证
一对多（1:N）：用户 ↔ 订单（一个用户有多个订单）
多对多（N:N）：学生 ↔ 课程（需要中间表）
```

### 外键与逻辑关联

一对多关系落到表上，就是「多的一方存对方的主键」。配套库的订单表就是这样关联用户表的：

> 摘自 `code/MySQL 基础/sql/schema.sql`（运行：`mysql -u root -p < sql/schema.sql`）

```sql
CREATE TABLE orders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,                 -- 下单用户
  amount      DECIMAL(10,2)   NOT NULL DEFAULT 0.00,    -- 订单金额
  status      TINYINT         NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- 为什么建联合索引 (user_id, created_at)：
  -- “某用户的历史订单”几乎总是“按 user_id 等值 + 按 created_at 排序/范围”，
  -- 联合索引能一次性命中等值并避免额外排序，还能覆盖只查这两列的查询。
  KEY idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

两点设计意图（都写在 `schema.sql` 的注释里）：

- `user_id` 只是普通列 + 联合索引，**没有声明 FOREIGN KEY**——示例库刻意用逻辑关联，把注意力放在索引与查询本身；要不要物理外键属于团队约定（取舍见下方范式与反范式）
- 关联列类型必须一致：`orders.user_id` 与 `users.id` 同为 `BIGINT UNSIGNED`，类型或字符集不一致是加外键报 `errno 150` 的最常见原因

## 连接查询

### INNER JOIN（内连接）

只返回两个表中匹配的数据——只有下过单的用户才出现：

> 摘自 `code/MySQL 基础/src/join.js`（运行：`npm run join`）

```sql
SELECT u.id, u.username, o.id AS order_id, o.amount
FROM users u
INNER JOIN orders o ON o.user_id = u.id
ORDER BY o.id
LIMIT 10
```

### LEFT JOIN（左连接）

返回左表所有数据，右表没有匹配的显示 NULL。配合 `IS NULL` 就能捞出「从没下过单」的用户：

> 摘自 `code/MySQL 基础/src/join.js`（运行：`npm run join`）

```sql
SELECT u.id, u.username
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL
LIMIT 10
```

### 关联聚合（JOIN + GROUP BY）

JOIN 之后接聚合，按用户汇总订单数与总金额：

> 摘自 `code/MySQL 基础/src/join.js`（运行：`npm run join`）

```sql
SELECT u.id, u.username, COUNT(o.id) AS order_cnt, SUM(o.amount) AS total_amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.username
HAVING order_cnt > 0
ORDER BY order_cnt DESC
LIMIT 10
```

`GROUP BY` 必须包含 SELECT 里的非聚合列；`HAVING` 在分组后过滤，`order_cnt > 0` 把没下过单的用户滤掉。

## 范式与反范式

### 三大范式（简化版）

| 范式 | 规则 | 反例 |
|------|------|------|
| 第一范式（1NF） | 每列不可再分 | 一个字段存多个电话号码 |
| 第二范式（2NF） | 非主键列完全依赖主键 | 订单表里存了用户姓名（只依赖用户 ID） |
| 第三范式（3NF） | 非主键列不依赖其他非主键列 | 订单表里存了用户的城市（城市依赖于用户） |

### 实际项目中的取舍

- 严格遵循范式 → 减少数据冗余，但查询需要更多 JOIN
- 适当反范式 → 查询更快，但更新时需要维护冗余数据

> 实际项目中，**大多数情况下适当反范式是可接受的**，以查询性能换取数据一致性。

配套库就是这个取舍的实例：`orders` 只存 `user_id`，要用户名得 JOIN 回 `users`，不冗余存用户名（守住了范式）；同时刻意不建物理外键，把一致性交给应用层与约定（性能与灵活优先）。

## 把配套库跑起来：建库、建表、造数

配套脚本共用同一个演示库 `mysql_demo`，跑任何脚本前先完成一次初始化。本机有没有 mysql 客户端，对应两条路：

### 方式一：本机装了 mysql 客户端

```bash
mysql -u root -p < sql/schema.sql           # 建库 + 建表（含索引设计）
mysql -u root -p mysql_demo < sql/seed.sql  # 造数：10 万用户 / 1000 商品 / 1 万订单 / 2 万明细
```

### 方式二：Docker（本机没装 mysql 客户端）

```bash
# 启动一个演示库（已建好容器的跳过这步）
docker run -d --name mysql-demo -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=mysql_demo mysql:8.0

# 等首次初始化完成（约半分钟）：docker logs mysql-demo 看到 "ready for connections" 再继续；
# 太早连会报 PROTOCOL_CONNECTION_LOST——那是临时初始化服务器与正式服务器切换的间隙，不是配置错了

# SQL 文件在宿主机上，PowerShell 不支持 < 重定向，拷进容器再执行
docker cp sql/schema.sql mysql-demo:/tmp/schema.sql
docker cp sql/seed.sql mysql-demo:/tmp/seed.sql
docker exec mysql-demo sh -c "mysql -uroot -proot < /tmp/schema.sql"
docker exec mysql-demo sh -c "mysql -uroot -proot mysql_demo < /tmp/seed.sql"
```

### 连接配置与验证

```bash
cp .env.example .env   # Docker 方式把 DB_PASSWORD 改成 root（root/root 仅限本地实验）
npm install
```

造数是否成功，查一下量级即可：

```sql
SELECT COUNT(*) FROM users;   -- 预期 100000
```

## 配套代码

本篇的可运行示例在仓库 `node/mysql/code/MySQL 基础`（索引 / 事务 / 锁的实验脚本见 `code/MySQL 进阶`，TypeORM 工程见 `code/Node.js 操作 MySQL`）。

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/MySQL 基础/sql/schema.sql` | `mysql -u root -p < sql/schema.sql` | 把配套库跑起来（建库建表与索引设计） |
| `code/MySQL 基础/sql/seed.sql` | `mysql -u root -p mysql_demo < sql/seed.sql` | 把配套库跑起来（10 万行测试数据） |
| `code/MySQL 基础/src/db.js` | `npm run select`（被四个脚本共用） | SQL 基础（连接池封装，账号密码走 `.env`） |
| `code/MySQL 基础/src/select.js` | `npm run select` | SQL 基础：查询（SELECT） |
| `code/MySQL 基础/src/insert.js` | `npm run insert` | SQL 基础：插入（INSERT） |
| `code/MySQL 基础/src/update.js` | `npm run update` | SQL 基础：更新（UPDATE） |
| `code/MySQL 基础/src/delete.js` | `npm run delete` | SQL 基础：删除（DELETE） |
| `code/MySQL 基础/src/join.js` | `npm run join` | 连接查询（INNER / LEFT / 关联聚合） |

运行方式见 `MySQL 基础/README.md`。

---
