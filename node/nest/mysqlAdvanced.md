## 事务&隔离级别

### 基础语法

| 命令                          | 作用                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `START TRANSACTION` / `BEGIN` | 开启事务（二者等价，推荐 `START TRANSACTION`）。             |
| `COMMIT`                      | 提交事务：将事务中所有操作永久写入数据库。                   |
| `ROLLBACK`                    | 回滚事务：撤销事务中所有未提交的操作，恢复到事务开始前的状态。 |
| `SAVEPOINT 名称`              | 设置保存点：允许回滚到事务中的指定位置（而非整个事务）。     |
| `ROLLBACK TO 保存点`          | 回滚到指定保存点。                                           |
| `SET AUTOCOMMIT = 0`          | 关闭自动提交（默认 1 是开启），需手动 `COMMIT`/`ROLLBACK`。  |

### 事物

```
// 订单表（orders）
id customer_id order_date total_amount
3	2	2022-01-03	300.00

// 订单项表（order_items）
id order_id product_name quantity price
5	3	新百伦运动鞋	5	100.00
6	3	彪马休闲鞋	6	50.00
12	3	苹果手机	4	50.00

```

- 需求

  - 把3 号订单的三个商品，数量改为1
  - 把3号订单的总金额改为200

- 基础示例（ROLLBACK）

  假设改错了，则 ROLLBACK

  ```
  START TRANSACTION;
  
  UPDATE order_items SET quantity=1 WHERE order_id=3;
  
  UPDATE orders SET total_amount=200 WHERE id=3;
  
  ROLLBACK;
  ```

- 基础示例（COMMIT）

  数据对了，则提交

  ```
  START TRANSACTION;
  
  UPDATE order_items SET quantity=1 WHERE order_id=3;
  
  UPDATE orders SET total_amount=200 WHERE id=3;
  
  COMMIT;
  ```

- 保存点

  ```
  START TRANSACTION;
  
  SAVEPOINT aaa;
  
  UPDATE order_items SET quantity=1 WHERE order_id=3;
  
  SAVEPOINT bbb;
  
  UPDATE orders SET total_amount=200 WHERE id=3;
  
  SAVEPOINT ccc;
  
  ROLLBACK TO SAVEPOINT bbb;
  ```

  这时候可以回滚到更改金额前。



### 隔离级别

#### 4种隔离级别

| 隔离级别         | 英文             | 解决的问题       | 允许的问题                         |
| ---------------- | ---------------- | ---------------- | ---------------------------------- |
| 读未提交         | READ UNCOMMITTED | 无               | 脏读、不可重复读、幻读             |
| 读已提交         | READ COMMITTED   | 脏读             | 不可重复读、幻读                   |
| 可重复读（默认） | REPEATABLE READ  | 脏读、不可重复读 | 幻读（MySQL 用 MVCC 已解决幻读）   |
| 串行化           | SERIALIZABLE     | 所有问题         | 无（但并发性能极差，相当于单线程） |

- **READ UNCOMMITTED**：可以读到别的事务尚未提交的数据。
  - 这就有个问题，你这个事务内第一次读的数据是 aaa，下次读可能就是 bbb 了，这个问题叫做**不可重复读**。
  - 而且，万一你读到的数据人家又回滚了，那你读到的就是临时数据，这个问题叫做**脏读**。

- **READ COMMITTED**：只读取别的事务已提交的数据。
  - 这样是没有脏读问题了，读到的不会是临时数据。
  - 但是还是有可能你这个事务内第一次读的数据是 aaa，下次读可能是 bbb ，也就是不可重复读的问题依然存在。

不只是数据不一样，可能你两次读取到的记录行数也不一样，这叫做**幻读**。

- **REPEATABLE READ**：在同一事务内，多次读取数据将保证结果相同。
  - 这个级别保证了读取到的数据一样，但是不保证行数一样，也就是说解决了不可重复读的问题，但仍然存在幻读的问题。

- **SERIALIZABLE**：在同一时间只允许一个事务修改数据。
  - 事务一个个执行，各种问题都没有了。
  - 但是负面影响就是性能很差，只能一个个的事务执行。

#### 操作命令

```
-- 1. 查看当前隔离级别（全局/会话）
SELECT @@GLOBAL.transaction_isolation;  -- 全局级别（所有新会话）
SELECT @@SESSION.transaction_isolation; -- 会话级别（当前连接）

-- 2. 设置隔离级别（会话级别）
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 3. 设置全局隔离级别（需重启会话生效）
SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

