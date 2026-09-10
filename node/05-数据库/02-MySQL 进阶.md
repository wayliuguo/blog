# MySQL 进阶

> 承上：[MySQL 基础](./01-MySQL%20基础) —— 先会写基础 SQL，再学索引与执行计划来优化慢查询
> 启下：[MySQL 高级实战](./03-MySQL%20高级实战) —— 配置 MySQL 主从复制与读写分离，并用连接池参数与慢查询日志排查生产性能问题

---

## 索引原理

索引的作用是**加快查询速度**，类似于书的目录。

### 聚簇索引 vs 非聚簇索引

```sql
-- 聚簇索引（InnoDB 主键索引）
-- 数据本身按主键顺序物理存储，一个表只能有一个
-- 主键就是聚簇索引

-- 非聚簇索引（普通索引）
-- 单独维护索引结构，叶子节点存主键值
-- 查询时先找索引，再回表查数据
CREATE INDEX idx_name ON users(name);
```

### 联合索引最左前缀原则

```sql
-- 创建联合索引
CREATE INDEX idx_name_age ON users(name, age);

-- 能用到索引的查询
SELECT * FROM users WHERE name = '张三';                 -- 用到了（最左列）
SELECT * FROM users WHERE name = '张三' AND age = 25;    -- 用到了
SELECT * FROM users WHERE age = 25;                      -- 用不到（没有 name）

-- 联合索引相当于先按 name 排序，name 相同的再按 age 排序
```

### EXPLAIN 分析慢查询

```sql
EXPLAIN SELECT * FROM users WHERE name = '张三'\G
```

重点关注：

| 字段 | 说明 |
|------|------|
| `type` | ALL（全表扫描）、ref（索引查找）、eq_ref（唯一索引） |
| `rows` | 预估扫描行数，越小越好 |
| `Extra` | Using index（覆盖索引）、Using filesort（需要排序） |

## MySQL 执行顺序

### SQL 语句的完整执行顺序

```sql
SELECT   DISTINCT  列名       -- 5. 选择需要的列，去重
  FROM  表名                  -- 1. 确定数据来源
  JOIN  其他表   ON 条件       -- 2. 关联其他表
 WHERE  条件                  -- 3. 过滤行
 GROUP BY  列名               -- 4. 分组
HAVING  分组条件              -- 6. 过滤分组
 ORDER BY  列名               -- 7. 排序
 LIMIT  数量 OFFSET 偏移       -- 8. 分页
```

**记忆口诀**：FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT

### 生产场景：订单统计报表

#### 表结构

**users 表（用户）**

| id | name | email | created_at |
|:---|:---|:---|:---|
| `INT` 主键自增 | `VARCHAR(50)` 非空 | `VARCHAR(100)` 非空 | `DATETIME` 默认当前时间 |

**orders 表（订单）**

| id | user_id | amount | status | created_at |
|:---|:---|:---|:---|:---|
| `INT` 主键自增 | `INT` 非空→users.id | `DECIMAL(10,2)` 非空 | `VARCHAR(20)` 非空 | `DATETIME` 默认当前时间 |

#### 示例数据
```sql
INSERT INTO users (id, name, email) VALUES
  (1, '张三', 'zhangsan@example.com'),
  (2, '李四', 'lisi@example.com'),
  (3, '王五', 'wangwu@example.com');

INSERT INTO orders (user_id, amount, status, created_at) VALUES
  (1, 99.9, 'completed', '2024-01-15 10:00:00'),
  (1, 199.0, 'completed', '2024-02-20 14:30:00'),
  (1, 299.5, 'completed', '2024-03-10 09:15:00'),
  (2, 59.9, 'completed', '2024-01-25 16:00:00'),
  (2, 129.0, 'completed', '2024-02-18 11:00:00'),
  (3, 499.0, 'completed', '2024-03-05 08:00:00');
```

#### 查询语句
```sql
-- 需求：统计每个用户的订单总额，只显示总金额超过 500 的用户，按金额降序 Top 10
SELECT
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.amount) AS total_amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'completed'          -- 只统计已完成的订单
  AND o.created_at >= '2024-01-01'    -- 统计今年的数据
GROUP BY u.id, u.name                 -- 按用户分组
HAVING total_amount > 500             -- 过滤总金额 > 500 的用户
ORDER BY total_amount DESC            -- 降序排列
LIMIT 10;                             -- 取前 10 名
```

**执行顺序拆解**：
1. `FROM users u LEFT JOIN orders o` → 确定数据源，做关联
2. `WHERE o.status = 'completed' AND o.created_at >= '2024-01-01'` → 过滤行
3. `GROUP BY u.id, u.name` → 分组
4. `SELECT` 中的聚合函数 `COUNT(o.id)`、`SUM(o.amount)` → 逐组计算
5. `HAVING total_amount > 500` → 过滤分组（注意：HAVING 在 GROUP BY 之后，WHERE 在之前）
6. `ORDER BY total_amount DESC` → 排序
7. `LIMIT 10` → 截取前 10 条

> **WHERE 和 HAVING 的区别**：WHERE 在分组前过滤行，不能使用聚合函数；HAVING 在分组后过滤组，只能使用聚合函数或 GROUP BY 中的列。

### 生产场景：按月份统计销售额

#### 表结构
（复用上方 `orders` 表，无需额外建表）

#### 示例数据
```sql
INSERT INTO orders (user_id, amount, status, created_at) VALUES
  (1, 599.0, 'completed', '2024-01-05 10:00:00'),
  (2, 320.0, 'completed', '2024-01-15 14:30:00'),
  (3, 780.0, 'completed', '2024-02-10 09:00:00'),
  (1, 450.0, 'completed', '2024-02-20 11:00:00'),
  (2, 1200.0, 'completed', '2024-03-05 08:30:00'),
  (3, 650.0, 'completed', '2024-03-18 16:00:00');
```

#### 查询语句
```sql
-- 需求：按月统计 2024 年各月销售额，并计算环比增长
SELECT
    DATE_FORMAT(o.created_at, '%Y-%m') AS month,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(o.amount) AS revenue,
    LAG(SUM(o.amount)) OVER (ORDER BY DATE_FORMAT(o.created_at, '%Y-%m')) AS prev_revenue,
    ROUND(
        (SUM(o.amount) - LAG(SUM(o.amount)) OVER (ORDER BY DATE_FORMAT(o.created_at, '%Y-%m')))
        / LAG(SUM(o.amount)) OVER (ORDER BY DATE_FORMAT(o.created_at, '%Y-%m')) * 100, 2
    ) AS growth_rate
FROM orders o
WHERE o.created_at >= '2024-01-01'
  AND o.created_at < '2025-01-01'
  AND o.status = 'completed'
GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
ORDER BY month;
```

## 子查询实战

### EXISTS 与 IN

```sql
-- 查询：找出所有下过订单的用户（使用 EXISTS）
-- 生产场景：运营需要给有消费记录的用户发优惠券
SELECT id, name, email
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
      AND o.status = 'completed'
);

-- 与 IN 的对比
SELECT id, name, email
FROM users u
WHERE u.id IN (
    SELECT DISTINCT user_id
    FROM orders
    WHERE status = 'completed'
);
```

### EXISTS vs IN 性能对比

| 场景 | 推荐 | 原因 |
|------|------|------|
| 外层表小，子查询结果集大 | `EXISTS` | 外层表逐行判断，子查询找到第一条就返回 |
| 外层表大，子查询结果集小 | `IN` | 子查询结果集缓存，外层表走索引匹配 |
| 关联子查询（子查询依赖外层列） | `EXISTS` | IN 无法处理关联子查询 |

### 关联子查询

```sql
-- 查询：每个用户的最新一笔订单
-- 生产场景：用户中心展示订单列表，每个用户只显示最近一单
SELECT u.name, o.id, o.amount, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.created_at = (
    SELECT MAX(o2.created_at)
    FROM orders o2
    WHERE o2.user_id = o.user_id
);

-- 现代表达式写法（MySQL 8.0+）
SELECT u.name, o.id, o.amount, o.created_at
FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM orders
) o
JOIN users u ON u.id = o.user_id
WHERE o.rn = 1;
```

### 生产案例：商品推荐

#### 表结构

**products 表（商品）**

| id | name | price | category |
|:---|:---|:---|:---|
| `INT` 主键自增 | `VARCHAR(100)` 非空 | `DECIMAL(10,2)` 非空 | `VARCHAR(50)` 可空 |

**order_items 表（订单明细）**

| id | order_id | product_id | quantity | price |
|:---|:---|:---|:---|:---|
| `INT` 主键自增 | `INT` 非空→orders.id | `INT` 非空→products.id | `INT` 非空 默认1 | `DECIMAL(10,2)` 非空 |

#### 示例数据
```sql
INSERT INTO products (id, name, price, category) VALUES
  (1001, '无线蓝牙耳机', 199.0, '数码'),
  (1002, '机械键盘', 399.0, '数码'),
  (1003, 'USB-C 充电线', 29.9, '配件'),
  (1004, '笔记本电脑支架', 89.0, '配件'),
  (1005, '鼠标垫', 19.9, '配件');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  (1, 1001, 1, 199.0),   -- 张三买了耳机
  (1, 1003, 2, 29.9),    -- 也买了充电线
  (2, 1002, 1, 399.0),   -- 李四买了键盘
  (3, 1004, 1, 89.0),    -- 王五买了支架
  (3, 1005, 1, 19.9),    -- 也买了鼠标垫
  (4, 1001, 1, 199.0),   -- 张三又买了耳机
  (5, 1002, 1, 399.0);   -- 李四又买了键盘
```

#### 查询语句
```sql
-- 查询：购买了商品 1001（无线蓝牙耳机）的用户还买了什么
-- 生产场景：电商详情页"看了又看"推荐模块
SELECT DISTINCT p.name, COUNT(*) AS buy_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.user_id IN (
    -- 找到买过商品 1001 的用户
    SELECT DISTINCT o2.user_id
    FROM orders o2
    JOIN order_items oi2 ON oi2.order_id = o2.id
    WHERE oi2.product_id = 1001
)
AND oi.product_id != 1001           -- 排除商品 A 本身
GROUP BY p.id, p.name
ORDER BY buy_count DESC
LIMIT 10;
```

## 事务与锁

### ACID 特性

| 特性 | 说明 | 例子 |
|------|------|------|
| 原子性（Atomicity） | 要么全部成功，要么全部失败 | 转账：A 扣钱 + B 加钱，一起成功或一起失败 |
| 一致性（Consistency） | 操作前后数据都符合约束 | 转账后总金额不变 |
| 隔离性（Isolation） | 并发事务互不干扰 | 两个用户同时转账不会互相影响 |
| 持久性（Durability） | 提交后数据永久保存 | 系统崩溃后不丢失已提交的数据 |

### 四种隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
|----------|------|-----------|------|------|
| 读未提交（Read Uncommitted） | 可能 | 可能 | 可能 | 最高 |
| 读已提交（Read Committed） | 不会 | 可能 | 可能 | ↓ |
| 可重复读（Repeatable Read） | 不会 | 不会 | 可能 | ↓ |
| 串行化（Serializable） | 不会 | 不会 | 不会 | 最低 |

**MySQL InnoDB 默认隔离级别：可重复读（Repeatable Read）**

### MVCC（Multi-Version Concurrency Control）

MVCC 是 InnoDB 实现隔离级别的核心机制：

- 每行数据有多个版本（Undo Log 版本链）
- 每个事务有一个 Read View（可见性视图）
- 事务只能看到创建时间早于自己的数据版本

**简单理解**：MVCC 让"读"不阻塞"写"，"写"不阻塞"读"。

### 锁类型详解

```sql
-- 行锁（Record Lock）：锁住索引记录
-- 在 WHERE 条件走索引时生效
SELECT * FROM users WHERE id = 1 FOR UPDATE;  -- 锁住 id=1 的行

-- 表锁：锁住整张表
-- 不走索引时，InnoDB 会锁住所有行（等价于表锁）
SELECT * FROM users WHERE name = '张三' FOR UPDATE;  -- name 无索引 → 锁全表

-- 间隙锁（Gap Lock）：锁住索引记录之间的间隙，防止幻读
-- 只在可重复读（RR）级别生效
-- 锁住 id > 10 AND id < 20 的间隙，不允许插入 id=15 的记录
SELECT * FROM users WHERE id BETWEEN 10 AND 20 FOR UPDATE;

-- Next-Key Lock：行锁 + 间隙锁，InnoDB 默认的锁机制
-- 锁住 id=10 的行，以及 (5, 10] 的间隙
SELECT * FROM users WHERE id > 5 AND id <= 10 FOR UPDATE;
```

### 生产场景：库存扣减（行锁）

#### 表结构

**products 表（商品，含库存）**

| id | name | price | stock |
|:---|:---|:---|:---|
| `INT` 主键自增 | `VARCHAR(100)` 非空 | `DECIMAL(10,2)` 非空 | `INT` 非空 默认0 |

#### 示例数据
```sql
INSERT INTO products (id, name, price, stock) VALUES
  (1001, '无线蓝牙耳机', 199.0, 10),    -- 初始库存 10 件
  (1002, '机械键盘', 399.0, 5);
```

#### 事务流程
```sql
-- 正确的库存扣减方式（加行锁防止超卖）
BEGIN;

-- 1. 先锁住商品行（for update 加排他行锁）
SELECT stock FROM products WHERE id = 1001 FOR UPDATE;
-- 返回：stock = 10

-- 2. 检查库存是否充足
-- 业务逻辑校验

-- 3. 扣减库存
UPDATE products SET stock = stock - 1 WHERE id = 1001 AND stock > 0;

-- 4. 插入订单记录
INSERT INTO orders (user_id, product_id, amount, status)
VALUES (1, 1001, 199.0, 'pending');

COMMIT;
```

### 生产场景：死锁案例分析

#### 表结构

**users 表（用户，含余额）**

| id | name | balance |
|:---|:---|:---|
| `INT` 主键自增 | `VARCHAR(50)` 非空 | `DECIMAL(10,2)` 非空 默认0 |

#### 示例数据
```sql
INSERT INTO users (id, name, balance) VALUES
  (1, '张三', 1000.0),
  (2, '李四', 500.0);
```

**AB-BA 死锁**：

```sql
-- 事务 A
BEGIN;
UPDATE users SET balance = balance - 100 WHERE id = 1;  -- 锁住 id=1
UPDATE users SET balance = balance + 100 WHERE id = 2;  -- 等待锁 id=2
COMMIT;

-- 事务 B（同时执行）
BEGIN;
UPDATE users SET balance = balance - 100 WHERE id = 2;  -- 锁住 id=2
UPDATE users SET balance = balance + 100 WHERE id = 1;  -- 等待锁 id=1 → 死锁！
COMMIT;
```

**生产环境死锁排查**：

```sql
-- 查看当前正在执行的事务
SELECT * FROM INFORMATION_SCHEMA.INNODB_TRX\G

-- 查看锁等待
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCK_WAITS\G

-- 查看最近死锁记录（最有价值的信息）
SHOW ENGINE INNODB STATUS\G
-- 搜索 "LATEST DETECTED DEADLOCK" 段落
```

**死锁日志示例**（简化版）：

```
------------------------
LATEST DETECTED DEADLOCK
------------------------
*** (1) TRANSACTION:               -- 事务 A
TRANSACTION 12345, ACTIVE 1 sec
UPDATE users SET balance = ... WHERE id = 1  -- 持有 id=1 锁，等待 id=2

*** (2) TRANSACTION:               -- 事务 B
TRANSACTION 12346, ACTIVE 1 sec
UPDATE users SET balance = ... WHERE id = 2  -- 持有 id=2 锁，等待 id=1

*** WE ROLL BACK TRANSACTION (2)   -- InnoDB 自动回滚事务 B
```

**预防死锁的最佳实践**：
1. **所有事务按相同顺序访问资源**（如都按 id 从小到大更新）
2. 保持事务简短，减少锁的持有时间
3. 避免在事务中有用户交互（等待输入）
4. 使用 `SELECT ... FOR UPDATE NOWAIT` 避免等待（MySQL 8.0+）

## 快照读与当前读

InnoDB 的 MVCC 带来一个容易踩坑的区别：同样是 `SELECT`，读到的数据版本可能完全不同。理解它，是写对并发控制逻辑的前提。

```sql
-- 会话 A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 改了但没提交

-- 会话 B（RR 隔离级别）
SELECT balance FROM accounts WHERE id = 1;  -- 读到旧值 1000（快照读，不受 A 影响）
```

两类读的区别：

| 类型 | 语句 | 读取的版本 | 是否加锁 |
|------|------|-----------|----------|
| 快照读（Snapshot Read） | 普通 `SELECT` | 事务开始时的快照（MVCC 多版本） | 不加锁，读不阻塞写 |
| 当前读（Current Read） | `SELECT ... FOR UPDATE` / `UPDATE` / `DELETE` / `SELECT ... LOCK IN SHARE MODE` | 最新已提交版本 | 加锁，保证读到最新 |

```sql
-- 当前读：读到 A 已修改、但被行锁阻塞，等 A 提交后才能拿到最新值
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;  -- 当前读 + 排他锁
```

常见误区：

1. 以为"我刚 UPDATE 了，别人 SELECT 一定能看到"——普通 SELECT 是快照读，RR 下别的事务看不到你的未提交改动。
2. 以为"FOR UPDATE 只是加锁"——它同时把读升级成当前读，读到的是最新已提交数据，这是实现"防超卖"的基石。
3. 在 RR 下，同一事务内两次普通 SELECT 结果一致（可重复读），但 `UPDATE` 用的是当前读，可能基于别人改过的版本计算，要小心。

> 心智模型：SELECT 默认"看旧版本"，FOR UPDATE / UPDATE / DELETE 才"看最新版本并加锁"。写并发控制逻辑时，务必用当前读，别依赖快照读。

## 后端实战：库存/额度扣减防超卖

业务系统常给用户发"调用额度"（如每月 1000 次接口调用），或电商秒杀扣库存。核心问题只有一个：高并发下不能扣成负数。

反面做法：先 SELECT 再判断再 UPDATE（经典超卖）

```sql
-- 错误示范：两步之间别的请求插进来，会超卖
BEGIN;
SELECT balance FROM quotas WHERE user_id = 1;   -- 读到 1
-- 此时另一个请求也读到 1，两个都通过判断
UPDATE quotas SET balance = balance - 1 WHERE user_id = 1;  -- 两个都 -1，变成 -1
COMMIT;
```

正确做法：把"判断"下推到 UPDATE 的 WHERE，用 affectedRows 决定是否成功

```sql
-- 一条语句原子完成"判断 + 扣减"
UPDATE quotas
SET balance = balance - 1
WHERE user_id = 1 AND balance >= 1;

-- 应用层检查受影响行数
-- affectedRows = 1 → 扣减成功
-- affectedRows = 0 → 余额不足，无需再查
```

为什么对：UPDATE 是当前读 + 行锁，多个并发请求串行化执行，`balance >= 1` 在数据库内部原子判断，不会出现两个请求都通过。

乐观锁 vs 悲观锁的取舍：

| 方案 | 做法 | 优点 | 缺点 | 适用 |
|------|------|------|------|------|
| 原子 UPDATE（推荐） | `SET balance = balance - 1 WHERE ... AND balance >= 1` | 简单、无锁等待、天然防超卖 | 只能表达"够不够" | 额度/库存扣减 |
| 乐观锁 version | `UPDATE ... SET balance=..., version=version+1 WHERE version=?` | 无锁、适合多字段冲突 | 冲突要重试，高冲突下自旋多 | 偶发并发更新 |
| 悲观锁 FOR UPDATE | 先 `SELECT ... FOR UPDATE` 锁住行再 UPDATE | 逻辑直观、强一致 | 锁持有期间阻塞别人，易拖慢 | 扣减前需跨表校验 |

> 决策模型：纯"扣减且不能超"用原子 UPDATE 最省事；扣减前还要跨表校验、或要读后做复杂分支，才上 `FOR UPDATE` 悲观锁；version 乐观锁适合"偶尔冲突、冲突即重试"的多字段更新。

## 索引失效实战

### 生产场景 1：隐式类型转换

```sql
-- 假设 phone 字段是 VARCHAR 类型，有索引
CREATE INDEX idx_phone ON users(phone);

-- 索引失效：传入数字类型，MySQL 会隐式转换
SELECT * FROM users WHERE phone = 13800138000;  -- 索引失效！全表扫描

-- 正确写法：保持类型一致
SELECT * FROM users WHERE phone = '13800138000';  -- 走索引

-- 反过来也一样：字符串条件查数字列也会失效
SELECT * FROM orders WHERE amount = '99.9';  -- amount 是 DECIMAL → 索引失效
```

### 生产场景 2：函数包裹索引列

```sql
-- 索引失效：对索引列使用函数
SELECT * FROM users WHERE DATE(created_at) = '2024-01-01';  -- 不走索引

-- 正确写法：范围查询
SELECT * FROM users WHERE created_at >= '2024-01-01'
    AND created_at < '2024-01-02';  -- 走索引

-- 另一个常见例子：字符串函数
SELECT * FROM users WHERE LEFT(name, 1) = '张';  -- 不走索引

-- 正确写法：LIKE 后缀模糊（走索引）
SELECT * FROM users WHERE name LIKE '张%';  -- 走索引（前缀匹配）
```

### 生产场景 3：LIKE 前缀模糊

```sql
-- 索引失效：前缀模糊查询
SELECT * FROM users WHERE name LIKE '%张三%';  -- 不走索引，全表扫描
SELECT * FROM users WHERE name LIKE '%张三';    -- 不走索引，全表扫描

-- 走索引：后缀模糊（前缀匹配）
SELECT * FROM users WHERE name LIKE '张三%';    -- 走索引

-- 前缀模糊的替代方案
-- 方案 1：搜索引擎（ES）—— 全文搜索场景
-- 方案 2：MySQL 全文索引（FULLTEXT）
CREATE FULLTEXT INDEX ft_name ON users(name);
SELECT * FROM users WHERE MATCH(name) AGAINST('张三' IN BOOLEAN MODE);
```

### 生产场景 4：OR 条件

```sql
-- 索引失效：OR 条件中只要有一列没有索引，就不走索引
SELECT * FROM users WHERE name = '张三' OR age = 25;  -- age 无索引 → 全表扫描

-- 正确写法 1：UNION 替代 OR
SELECT * FROM users WHERE name = '张三'
UNION
SELECT * FROM users WHERE age = 25;

-- 正确写法 2：给 age 也加索引
CREATE INDEX idx_age ON users(age);
-- 现在 OR 查询可以走索引（index_merge 优化）
```

### 生产场景 5：不等条件导致索引失效

```sql
-- 不等于条件不走索引（优化器认为扫描全表更快）
SELECT * FROM users WHERE status != 'deleted';  -- 不走索引

-- NOT IN 同理
SELECT * FROM users WHERE id NOT IN (1, 2, 3);  -- 不走索引

-- 优化：如果大部分是 deleted，小部分不是，用等于代替
SELECT * FROM users WHERE status = 'active';  -- 反过来查，走索引
```

## 索引实战：10 个典型场景

把"什么时候该建什么索引"落到具体业务上。核心原则：**等值/范围高频查询列建索引；多列联合时，把区分度高、且最常用于过滤的列放最左。**

| # | 场景 | 建议索引 | 说明 |
|---|------|----------|------|
| 1 | 邮箱唯一登录 | `UNIQUE INDEX idx_email (email)` | 唯一索引顺带保证不重复 |
| 2 | 订单号精确查询 | `UNIQUE INDEX idx_order_no (order_no)` | 订单号天然唯一，走等值 |
| 3 | 用户订单列表 | `INDEX idx_user_created (user_id, created_at)` | 联合索引，先 user_id 再时间，支持"某用户的订单按时间排序" |
| 4 | 聊天记录分页 | `INDEX idx_conv_time (conversation_id, created_at)` | 按会话 + 时间翻页，用游标分页取代 OFFSET |
| 5 | 接口调用用量记录 | `INDEX idx_api_date (api_id, biz_date)` | 按接口 + 日期统计消耗 |
| 6 | 商品类目筛选+排序 | `INDEX idx_cat_price (category, price)` | 类目等值 + 价格排序 |
| 7 | 状态过滤（少数值） | 部分索引 `WHERE status='running'` | 只对热状态建索引，省空间（PG 更典型，MySQL 用前缀/联合替代） |
| 8 | 大小写无关邮箱查 | 表达式索引 `lower(email)` | 对函数结果建索引（PG），MySQL 用生成列 |
| 9 | 标签多值查询 | 数组 + GIN（PG）/ 关联表（MySQL） | MySQL 用关联表更稳 |
| 10 | 全文搜索 | FULLTEXT 或 ES | 前缀模糊 `%x` 走不了 B-Tree |

联合索引字段顺序怎么定（决策模型）：

1. **最左前缀**：把"几乎每次查询都会带"的列放最左（如 user_id）。
2. **区分度优先于范围**：等值条件列（user_id）放范围条件列（created_at）左边，因为范围列后面的索引列会失效。
3. **排序复用索引**：若结果要 `ORDER BY created_at`，把 created_at 放进联合索引末尾可避免 filesort。

```sql
-- 用户维度 + 时间维度的典型订单列表查询
CREATE INDEX idx_user_status_created ON orders (user_id, status, created_at);

SELECT * FROM orders
WHERE user_id = 1 AND status = 'paid'
ORDER BY created_at DESC
LIMIT 20;   -- 命中 (user_id, status) 等值，created_at 复用排序，几乎零 filesort
```

## 索引常见误区

| 误区 | 错误写法 | 为什么失效 | 正确做法 |
|------|----------|-----------|----------|
| 低区分度字段单独建索引 | `INDEX idx_status (status)`（status 只有几种值） | 优化器认为扫全表更快，索引几乎不被用 | 放进联合索引作左补充列，或用部分索引 |
| `SELECT *` 破坏覆盖索引 | `SELECT * ... WHERE name=?` | 索引只覆盖 (name,id)，要回表取其他列 | 只查需要的列，让 `Using index` 生效 |
| 隐式类型转换 | `WHERE phone = 13800138000`（phone 是 VARCHAR） | MySQL 把列转数字，等价于对列用函数 | 保持类型一致：`phone = '13800138000'` |
| 函数作用在索引列 | `WHERE DATE(created_at)='2024-01-01'` | 对列套函数，索引无法定位 | 改成范围：`created_at >= '2024-01-01' AND < '2024-01-02'` |
| 运算作用在索引列 | `WHERE amount * 1.1 > 100` | 列参与运算，索引失效 | 改成 `WHERE amount > 100 / 1.1` |
| 前缀模糊 `%x` | `WHERE name LIKE '%张'` | 左模糊无法利用 B-Tree 有序性 | 用后缀模糊 `LIKE '张%'`，或 FULLTEXT / ES |

> 关键结论：索引失效的底层原因只有一个——**索引列在 WHERE 里被"改造"了（函数、运算、类型转换、模糊前缀），导致无法按原有序走 B-Tree**。写查询时脑子里要过一遍："这个列是不是原样出现在条件里？"

## COUNT 查询优化

### COUNT(*) vs COUNT(1) vs COUNT(列)

```sql
-- COUNT(*)：统计行数，InnoDB 做了优化，性能最好
SELECT COUNT(*) FROM users;  -- 推荐

-- COUNT(1)：和 COUNT(*) 等价，没有性能差异
SELECT COUNT(1) FROM users;

-- COUNT(列)：统计该列非 NULL 的行数，且需要判断 NULL
SELECT COUNT(email) FROM users;  -- 如果 email 允许 NULL，结果可能不同
```

### 生产场景：大表 COUNT 优化

```sql
-- 问题：千万级表 COUNT 非常慢
SELECT COUNT(*) FROM orders;  -- 可能需要几秒钟

-- 优化方案 1：使用二级索引（InnoDB 二级索引比聚簇索引小，扫描更快）
-- 选择一个最小的非空索引列
SELECT COUNT(*) FROM orders USE INDEX (idx_created_at);

-- 优化方案 2：使用近似值（业务可以接受误差）
SHOW TABLE STATUS LIKE 'orders';  -- 返回 rows 列，InnoDB 的估算值

-- 优化方案 3：缓存计数（Redis 维护总行数）
-- 每次插入/删除时更新 Redis 中的计数
-- 适合对实时性要求不高的场景

-- 优化方案 4：分页场景用游标代替 COUNT
-- 不查总数，而是查 "是否有下一页"
SELECT EXISTS(SELECT 1 FROM orders WHERE id > 1000000);  -- 比 COUNT 快得多
```

## 查询优化实战

### 避免 SELECT *

```sql
-- 不推荐：查询所有列，可能用不到覆盖索引
SELECT * FROM users WHERE name = '张三';

-- 推荐：只查需要的列，可以使用覆盖索引
SELECT id, name FROM users WHERE name = '张三';
```

### 合理使用索引覆盖

当查询的列都在索引中时，不需要回表查询：

```sql
-- 如果 idx_name 索引包含 name 和 id
SELECT id, name FROM users WHERE name = '张三';
-- Extra 中会出现 "Using index"（覆盖索引）
```

### 分页优化

```sql
-- 传统分页：越往后越慢（OFFSET 越大，扫描越多）
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 100000;

-- 游标分页：利用索引，不管第几页都很快
SELECT * FROM users WHERE id > 100000 ORDER BY id LIMIT 10;
```

### 生产场景：慢查询排查实战

#### 表结构

**orders 表**（复用上方定义，追加索引）

| 索引名 | 列 | 说明 |
|:---|:---|:---|
| `idx_orders_created_at` | `created_at` | 加速范围查询 |

#### 示例数据
```sql
-- 插入一批数据模拟慢查询场景
INSERT INTO orders (user_id, amount, status, created_at)
SELECT
    FLOOR(RAND() * 1000) + 1,
    ROUND(RAND() * 1000, 2),
    'completed',
    DATE_ADD('2024-01-01', INTERVAL FLOOR(RAND() * 365) DAY)
FROM information_schema.tables AS t1
CROSS JOIN information_schema.tables AS t2
LIMIT 50000;  -- 插入 5 万行模拟数据
```

**完整排查流程**：发现慢查询 → 定位语句 → EXPLAIN 分析 → 优化 → 验证

```sql
-- 1. 开启慢查询日志
-- my.cnf 配置
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1          -- 超过 1 秒的查询记录到慢查询日志
log_queries_not_using_indexes = ON  -- 没走索引的查询也记录

-- 2. 查看慢查询日志（生产常用 pt-query-digest 分析）
-- 用 MySQL 直接查看最近 5 条慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 5\G

-- 3. 发现一条慢查询
-- # Query_time: 3.2s  Lock_time: 0.1s  Rows_examined: 500000
-- SELECT * FROM orders WHERE DATE(created_at) = '2024-01-01';

-- 4. EXPLAIN 分析
EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2024-01-01'\G
-- type: ALL（全表扫描！）
-- rows: 500000（扫描 50 万行）

-- 5. 优化：改为范围查询，走索引
EXPLAIN SELECT * FROM orders WHERE created_at >= '2024-01-01'
    AND created_at < '2024-01-02'\G
-- type: range（索引范围扫描）
-- rows: 1200（扫描 1200 行）
-- Extra: Using index condition（走了索引下推 ICP）

-- 6. 验证优化效果
-- 再次执行，查询时间从 3.2s 降到 0.02s
```

**慢查询排查清单**（生产环境 SOP）：

```
□ 开启慢查询日志（生产始终开启，long_query_time 设 1-2 秒）
□ 定期用 pt-query-digest 或 MySQL 官方工具分析慢查询
□ 重点关注：全表扫描（type=ALL）、大排序（Using filesort）、
  临时表（Using temporary）
□ 每个慢查询都要：EXPLAIN → 确认是否走索引 → 优化 SQL 或加索引
□ 优化后验证：rows 是否明显减少，Extra 是否更优
```

---

## 面试题

### Q1: 什么是索引的最左前缀原则？

联合索引 `(a, b, c)` 相当于按 a → b → c 排序，查询条件必须从最左列开始才能用到索引。`where a = 1` 和 `where a = 1 and b = 2` 能用索引，`where b = 2` 用不到。

### Q2: 事务隔离级别中，MySQL 默认的是哪个？解决了什么问题？

MySQL InnoDB 默认是可重复读（Repeatable Read），解决了脏读和不可重复读，但可能出现幻读。InnoDB 通过间隙锁（Gap Lock）在可重复读级别下部分解决了幻读问题。

### Q3: 什么是死锁？如何排查和预防？

死锁是两个事务互相等待对方持有的锁，导致无法继续执行。排查：`SHOW ENGINE INNODB STATUS` 查看死锁日志。预防：所有事务按相同顺序访问资源、保持事务简短、使用 `NOWAIT` 跳过等待。

### Q4: 索引失效的常见场景有哪些？

1. 隐式类型转换（`phone = 13800138000`，phone 是 VARCHAR）
2. 函数包裹索引列（`DATE(created_at) = '2024-01-01'`）
3. LIKE 前缀模糊（`'%张三'`）
4. OR 条件中有未索引列
5. 不等于条件（`!=`, `NOT IN`）

### Q5: WHERE 和 HAVING 有什么区别？

WHERE 在 GROUP BY 之前过滤行，不能使用聚合函数；HAVING 在 GROUP BY 之后过滤组，只能使用聚合函数或 GROUP BY 中的列。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/mysql-demo`。

| 文件 | 演示什么 |
| --- | --- |
| `03-index.js` | 无索引 vs 有索引的耗时对比（10 万行） |
| `04-explain.js` | EXPLAIN 六列读法 |
| `03-explain-cases.sql` | 10 条典型 SQL 的索引验证清单 |

运行方式见 `mysql-demo/README.md`。

---

## 参考

- 上一篇：[MySQL 基础](./01-MySQL%20基础)
- 下一篇：[MySQL 高级实战](./03-MySQL%20高级实战)