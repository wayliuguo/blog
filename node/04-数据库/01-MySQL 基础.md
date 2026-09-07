# MySQL 基础

---

## [初级] 什么是关系型数据库

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

## [初级] SQL 基础

### 查询（SELECT）

```sql
-- 查询所有列
SELECT * FROM users;

-- 查询指定列
SELECT id, name, age FROM users;

-- 条件过滤
SELECT * FROM users WHERE age > 18;

-- 排序
SELECT * FROM users ORDER BY age DESC;  -- 降序
SELECT * FROM users ORDER BY age ASC;   -- 升序

-- 限制数量
SELECT * FROM users LIMIT 10;           -- 取前 10 条
SELECT * FROM users LIMIT 10 OFFSET 20; -- 第 21-30 条（分页）
```

### 插入（INSERT）

```sql
INSERT INTO users (name, age, city) VALUES ('张三', 25, '北京');
```

### 更新（UPDATE）

```sql
UPDATE users SET age = 26 WHERE id = 1;
-- 注意：一定要加 WHERE，否则更新所有行！
```

### 删除（DELETE）

```sql
DELETE FROM users WHERE id = 1;
-- 注意：一定要加 WHERE，否则删除所有行！
```

## [初级] 表设计基础

### 数据类型

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,  -- 整数，主键，自增
    name VARCHAR(50) NOT NULL,           -- 变长字符串，非空
    age INT DEFAULT 0,                   -- 整数，默认 0
    email VARCHAR(100) UNIQUE,           -- 唯一约束
    created_at DATETIME DEFAULT NOW()    -- 创建时间
);
```

### 表关系

```
一对一（1:1）：用户 ↔ 身份证
一对多（1:N）：用户 ↔ 订单（一个用户有多个订单）
多对多（N:N）：学生 ↔ 课程（需要中间表）
```

### 外键关联

```sql
-- 订单表，每个订单属于一个用户
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## [初级] 连接查询

### INNER JOIN（内连接）

只返回两个表中匹配的数据：

```sql
-- 查询每个订单对应的用户信息
SELECT orders.id, orders.total, users.name
FROM orders
INNER JOIN users ON orders.user_id = users.id;
```

### LEFT JOIN（左连接）

返回左表所有数据，右表没有匹配的显示 NULL：

```sql
-- 查询所有用户及其订单（包括没有订单的用户）
SELECT users.name, orders.total
FROM users
LEFT JOIN orders ON users.id = orders.user_id;
```

## [中级] 范式与反范式

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

---

## 面试题

### Q1: INNER JOIN 和 LEFT JOIN 的区别？

INNER JOIN 只返回两个表都匹配的行；LEFT JOIN 返回左表所有行，右表没有匹配的显示 NULL。

### Q2: 什么是主键和外键？

主键是唯一标识一行数据的字段（通常为自增 ID），外键是关联到其他表主键的字段，用于建立表间关系。

---

## 参考

- 上一篇：[Koa 快速入门](../03-Express%20与%20Koa/02-Koa%20快速入门)
- 下一篇：[MySQL 进阶](./02-MySQL%20进阶)