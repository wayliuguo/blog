# MySQL 进阶

---

## [中级] 索引原理

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
SELECT * FROM users WHERE name = '张三';           -- 用到了（最左列）
SELECT * FROM users WHERE name = '张三' AND age = 25; -- 用到了
SELECT * FROM users WHERE age = 25;                -- 用不到（没有 name）

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

## [中级] 事务与锁

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

## [中级] 查询优化实战

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

## [高级] 分库分表

### 垂直拆分

按业务拆分：用户表放在一个库，订单表放在另一个库。

```
一个库：users, orders, products
           ↓
用户库：users
订单库：orders
商品库：products
```

### 水平拆分

按某个字段拆分到多个表/库：

```sql
-- 按用户 ID 取模分表
-- 用户 ID % 4 = 0 → users_0
-- 用户 ID % 4 = 1 → users_1
-- 用户 ID % 4 = 2 → users_2
-- 用户 ID % 4 = 3 → users_3
```

### 分片键选择

- 选查询频率最高的字段（如 user_id）
- 避免跨分片查询
- 考虑数据分布均匀

---

## 面试题

### Q1: 什么是索引的最左前缀原则？

联合索引 `(a, b, c)` 相当于按 a → b → c 排序，查询条件必须从最左列开始才能用到索引。`where a = 1` 和 `where a = 1 and b = 2` 能用索引，`where b = 2` 用不到。

### Q2: 事务隔离级别中，MySQL 默认的是哪个？解决了什么问题？

MySQL InnoDB 默认是可重复读（Repeatable Read），解决了脏读和不可重复读，但可能出现幻读。InnoDB 通过间隙锁（Gap Lock）在可重复读级别下部分解决了幻读问题。

---

## 参考

- 上一篇：[MySQL 基础](./01-MySQL%20基础)
- 下一篇：[Node.js 操作 MySQL](./03-Node.js%20操作%20MySQL)