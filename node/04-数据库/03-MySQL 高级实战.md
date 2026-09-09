# MySQL 高级实战

> 本章定位为 MySQL 高级实战内容，从前面的 MySQL 进阶延伸到生产环境中的 MySQL 高可用、分布式、运维和深层次调优。

---

## [高级] 主从复制与读写分离

### 主从复制原理

```
                          ┌─────────────┐
        写入             │  主库 Master │
     ──────────────────→ │  Binlog     │
                          └──────┬──────┘
                                 │ 二进制日志
                                 │ dump 线程
                                 ▼
               ┌─────────────────┴────────────────┐
               │                                  │
        ┌──────┴──────┐                   ┌──────┴──────┐
        │ 从库 Slave1 │                   │ 从库 Slave2 │
        │ Relay Log   │                   │ Relay Log   │
        │ SQL 线程重放 │                   │ SQL 线程重放 │
        └─────────────┘                   └─────────────┘
               │                                  │
               ▼                                  ▼
           只读服务                             报表分析
```

**复制流程**：
1. 主库将变更写入 Binlog（二进制日志）
2. 主库的 dump 线程将 Binlog 发送给从库
3. 从库的 I/O 线程将接收到的日志写入 Relay Log（中继日志）
4. 从库的 SQL 线程重放 Relay Log，完成数据同步

### Binlog 三种格式

| 格式 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| `STATEMENT` | 记录 SQL 语句 | 日志量小 | 非确定性函数（如 UUID()、NOW()）可能导致主从不一致 |
| `ROW`（推荐） | 记录每行数据的变更 | 最精确，主从完全一致 | 日志量大（批量更新时尤其明显） |
| `MIXED` | 混合模式 | 默认用 STATEMENT，不确定时自动切 ROW | 偶有边界问题 |

### 生产场景：读写分离配置

```sql
-- my.cnf 主库配置
server_id = 1                    -- 主从 server_id 必须不同
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW              -- 生产推荐 ROW 格式
expire_logs_days = 7             -- Binlog 保留 7 天
sync_binlog = 1                  -- 每次事务提交都同步写入磁盘

-- my.cnf 从库配置
server_id = 2
relay_log = /var/log/mysql/mysql-relay-bin.log
read_only = 1                    -- 从库只读，防止误写入
log_slave_updates = 1            -- 级联复制时开启
```

### 生产场景：主从延迟排查

**主从延迟的常见原因**：

```
1. 从库硬件性能（CPU/IOPS）低于主库
2. 主库有大事务（如 DELETE 百万行数据）
3. 从库有慢查询或锁等待
4. 从库同时提供读服务，负载过高
5. 网络延迟（跨机房部署）
```

**监控延迟**：

```sql
-- 在主库查看所有从库的延迟状态
SHOW SLAVE HOSTS;

-- 在从库查看复制状态
SHOW SLAVE STATUS\G
-- 重点关注：
--   Seconds_Behind_Master: 0           ← 延迟秒数，0 表示正常
--   Slave_IO_Running: Yes              ← I/O 线程正常
--   Slave_SQL_Running: Yes             ← SQL 线程正常
--   Last_IO_Error:                     ← I/O 线程错误
--   Last_SQL_Error:                    ← SQL 线程错误

-- 如果延迟持续增加，查看是否有大事务
SELECT * FROM information_schema.INNODB_TRX
WHERE trx_id = (SELECT trx_id FROM performance_schema.events_transactions_current ORDER BY thread_id LIMIT 1)\G
```

**延迟解决方案**：

```
1. 优化从库硬件（SSD、更多 CPU）
2. 拆分大事务为小批量（每次 DELETE 1000 行）
3. 从库关闭 sync_binlog 和 innodb_flush_log_at_trx_commit（性能优先时）
4. 使用并行复制（MySQL 5.7+ 支持）
5. 关键业务强制读主库（缓存标记，延迟敏感走主库）
```

### 并行复制配置

```sql
-- MySQL 5.7+ 配置并行复制（从库）
slave_parallel_workers = 4        -- 4 个 SQL 线程并行重放
slave_parallel_type = LOGICAL_CLOCK  -- 基于逻辑时钟的并行
```

## [高级] 分库分表实战

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

### 生产场景：分片键选型

```sql
-- 错误的分片键：按时间分片
-- 问题：数据倾斜，写入热点全在最新分片，历史分片几乎无写入
-- 按月份分片，每月 1 亿数据，但 90% 写入集中在当月

-- 正确的分片键：按用户 ID 哈希分片
-- 数据均匀分布，写入分散到所有分片
-- user_id % 16 → 16 个分片，每次写入随机分布
```

**常见分片键选型方案**：

| 业务场景 | 分片键 | 分片算法 | 优势 |
|---------|--------|---------|------|
| 用户系统 | user_id | 哈希取模 | 数据均匀，查询友好 |
| 订单系统 | order_id | 哈希取模 | 天然分散，避免热点 |
| 消息系统 | 时间 + user_id | 范围 + 哈希 | 冷热数据分离 |
| 地理位置 | 区域 ID | 范围分片 | 数据本地化 |

### 生产场景：跨分片查询与全局 ID

**跨分片聚合查询**：

```sql
-- 问题：分片后，count(1) 需要聚合所有分片的结果
-- 方案：汇总层（如 ShardingSphere、MyCat）自动聚合

-- 分页查询跨分片
-- 方案：每个分片查 N 条，汇总后排序取前 N 条
-- 弊端：分片越多，总数据量越大（N × 分片数）
-- 优化：对于高频分页，约定指定分片键（如 user_id 范围限定）
```

**全局唯一 ID 生成方案**：

| 方案 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **雪花算法（Snowflake）** | 时间戳 + 机器 ID + 序列号 | 高性能、趋势递增 | 依赖时钟 |
| **Redis INCR** | Redis 自增 | 简单可靠 | 依赖 Redis |
| **数据库号段** | 批量取号 `UPDATE id_generator SET max_id += 1000` | 不依赖外部组件 | 需要维护号段表 |
| **UUID** | 32 位字符串 | 本地生成，无需协调 | 无序、太长、影响索引性能 |

### 生产场景：分库分表后的 SQL 限制

```sql
-- 不支持的操作
-- 1. 跨分片的 JOIN
SELECT * FROM users u JOIN orders o ON u.id = o.user_id;  -- 不能跨分片 JOIN

-- 2. 跨分片的事务
-- 分布式事务（XA/Seata）性能差，尽量避免

-- 3. 无分片键的查询（全分片扫描）
SELECT * FROM orders WHERE status = 'pending';  -- 没有 order_id，所有分片都要查

-- 可行的方案
-- 1. 建立"索引表"：用 ES 维护全文索引，先查 ES 获取分片键
-- 2. 广播表：少量的配置表，在所有分片都存一份（如省份字典）
-- 3. ER 分片：有父子关系的表按相同分片键分片（用户和订单都用 user_id 分片）
```

## [高级] 数据库迁移

### 生产场景：Online DDL（在线修改表结构）

```sql
-- 问题：MySQL 的 ALTER TABLE 会锁表，大表操作可能导致服务中断
-- 比如给 1000 万行的表加索引，MySQL 5.6 之前会锁住整个表

-- MySQL 5.6+ 的 Online DDL
-- 支持 INPLACE 算法，大部分 DDL 操作不阻塞读写
ALTER TABLE orders ADD INDEX idx_user_id (user_id), ALGORITHM=INPLACE, LOCK=NONE;

-- 常用 DDL 操作是否在线
-- 操作                    | 是否锁表 | 是否允许并发 DML
-- 添加索引                | 否      | 是
-- 添加列                  | 否      | 是（MySQL 5.6+）
-- 修改列类型              | 是      | 否（需要重建表）
-- 删除列                  | 否      | 是
-- 修改列默认值            | 否      | 是
-- 主键修改                | 是      | 否
```

### 生产场景：大表 DDL 工具

```sql
-- 对于大表（千万级以上），即使 Online DDL 也可能影响性能
-- 推荐使用 gh-ost（GitHub 开源的 Online DDL 工具）

-- gh-ost 工作原理：
-- 1. 创建一张影子表（_orders_gho）
-- 2. 同步 binlog 变更到影子表（监听实时变更）
-- 3. 逐步将原表数据复制到影子表（分批）
-- 4. 复制完成后，切换表名（原子操作，毫秒级）

-- 使用 gh-ost 给大表加索引
gh-ost \
  --host=127.0.0.1 \
  --user=admin \
  --password=**** \
  --database=myapp \
  --table=orders \
  --alter="ADD INDEX idx_user_id (user_id)" \
  --execute
```

### 生产场景：零停机迁移方案

**场景**：将 MySQL 从 5.7 迁移到 8.0，或从自建迁移到云数据库

```
迁移步骤：

1. 搭建主从复制（旧库 → 新库）
   旧库（MySQL 5.7）──── 从库复制 ────→ 新库（MySQL 8.0）

2. 数据校验
   用 pt-table-checksum 或自定义脚本，确认数据一致

3. 灰度切换读流量
   10% 读流量 → 新库
   50% 读流量 → 新库
   100% 读流量 → 新库

4. 切换写流量（停机窗口最小化）
   停止旧库写入 → 等待从库同步完成 → 切换到新库写入
   整个过程控制在 1-5 分钟内

5. 观察回滚
   保留旧库 3-7 天，发现异常可快速回滚
```

**回滚方案**：

```
1. 保留旧库的只读权限
2. 如发现新库异常，DNS 切回旧库
3. 利用 binlog 补偿切换期间的数据差异
```

## [高级] 连接池深度调优

### 连接池参数详解

```typescript
// Node.js 生产级连接池配置（mysql2）
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'myapp',

    // 核心参数
    connectionLimit: 10,           // 最大连接数（默认 10）
    queueLimit: 0,                 // 等待队列上限（0 表示不限制）
    waitForConnections: true,      // 无可用连接时是否排队等待

    // 超时配置
    acquireTimeout: 10000,         // 获取连接的超时时间（ms）
    connectTimeout: 10000,         // 连接数据库的超时时间（ms）
    idleTimeout: 600000,           // 连接空闲多久后释放（ms，默认 10 分钟）

    // 健康检查
    enableKeepAlive: true,         // 开启心跳保活
    keepAliveInitialDelay: 0,     // 心跳延迟

    // 高级配置
    charset: 'UTF8MB4_GENERAL_CI', // 字符集（支持 emoji）
    timezone: '+08:00'             // 时区
})
```

### 连接数估算

```typescript
// 连接数估算公式
// 最大连接数 = (CPU 核心数 × 2) + 有效磁盘数
// 或者按业务估算：QPS × 平均查询时间

// 生产实践
// 4 核 8G 服务器：建议 20-50 个连接
// 8 核 16G 服务器：建议 50-100 个连接
// 16 核 32G 服务器：建议 100-200 个连接

// 注意：连接数不是越多越好
// 连接过多 → MySQL 上下文切换开销大 → 性能反而下降
```

### 生产场景：连接池监控

```typescript
// 监控连接池状态
class DatabaseMonitor {
    private pool: mysql.Pool

    getPoolStatus() {
        return {
            totalConnections: this.pool.totalConnectionCount,      // 总连接数
            activeConnections: this.pool.activeConnectionCount,    // 活跃连接数
            idleConnections: this.pool.idleConnectionCount,        // 空闲连接数
            pendingRequests: this.pool.pendingRequestCount         // 等待队列长度
        }
    }

    // 设置告警阈值
    checkHealth() {
        const status = this.getPoolStatus()

        // 告警：活跃连接超过 80%
        if (status.activeConnections / status.totalConnections > 0.8) {
            console.error('连接池告警：活跃连接数超过 80%')
            // 触发扩容或告警通知
        }

        // 告警：等待队列有积压
        if (status.pendingRequests > 100) {
            console.error('连接池告警：等待队列积压')
            // 可能原因：数据库慢查询导致连接被长时间占用
        }
    }
}
```

### 生产场景：连接池常见问题排查

```
问题 1：连接池溢出（ETIMEDOUT 或 ER_CON_COUNT_ERROR）
  现象：应用报错 "Cannot get connection from pool"
  原因：连接数不够 / 慢查询占用了大量连接不释放
  解决：
    1. 检查慢查询，优化 SQL
    2. 适当增大 connectionLimit
    3. 检查是否有连接泄漏（获取后未 release）

问题 2：连接泄漏
  现象：连接池连接数持续增长，不释放
  原因：获取连接后忘记 release
  解决：
    1. 使用 connection.execute 替代 getConnection + release
    2. 确保 finally 块中释放连接
    3. 设置 idleTimeout 让空闲连接自动回收

问题 3：数据库连接超时
  现象：应用报错 "connect ETIMEDOUT"
  原因：MySQL 的 wait_timeout 默认 8 小时，空闲连接被断开
  解决：
    1. 开启 enableKeepAlive
    2. 设置 idleTimeout 小于 MySQL 的 wait_timeout
```

## [高级] 备份与恢复策略

### 备份方案对比

| 方案 | 说明 | 恢复速度 | 适用场景 |
|------|------|---------|---------|
| **mysqldump** | 逻辑备份，导出 SQL | 慢（大表几小时） | 小库（< 50GB）、迁移 |
| **XtraBackup** | 物理备份，文件级复制 | 快（1TB 约 30 分钟） | 大库生产环境 |
| **Binlog** | 增量备份，记录变更 | 按需回放 | 时间点恢复（PITR） |

### 生产场景：备份策略

```bash
# 备份策略示例（电商系统，每天 100GB 数据）

# 1. 每周日凌晨 2:00 全量备份（XtraBackup）
0 2 * * 0 /usr/bin/xtrabackup --backup --target-dir=/backup/full/$(date +%Y%m%d)

# 2. 每天凌晨 3:00 增量备份（基于上次全量或增量）
0 3 * * 1-6 /usr/bin/xtrabackup --backup --incremental-basedir=/backup/full/$(date +%Y%m%d -d 'last-sunday')

# 3. 实时备份 Binlog（用于时间点恢复）
# 配置 my.cnf
max_binlog_size = 500M           # 每个 Binlog 文件大小
expire_logs_days = 7             # 保留 7 天
# 定时将 Binlog 同步到备份服务器
*/5 * * * * rsync -av /var/log/mysql/mysql-bin.* backup-server:/backup/binlog/

# 4. 备份验证（每周自动恢复测试）
0 6 * * 0 /usr/local/bin/restore_test.sh
```

### 生产场景：时间点恢复（PITR）

```bash
# 场景：凌晨 3:15 误删了 orders 表，需要恢复到 3:14:59 的状态

# 1. 恢复最近的完整备份
xtrabackup --prepare --target-dir=/backup/full/20240101
xtrabackup --copy-back --target-dir=/backup/full/20240101

# 2. 回放 Binlog 到误操作前一刻
mysqlbinlog \
    --start-datetime="2024-01-01 03:00:00" \
    --stop-datetime="2024-01-01 03:14:59" \
    /backup/binlog/mysql-bin.000123 \
    /backup/binlog/mysql-bin.000124 \
    | mysql -u root -p

# 3. 验证数据完整性
# 检查关键表的行数
# 检查业务逻辑（如：用户余额、订单状态）
```

### 备份检查清单

```
□ 全量备份：每周至少 1 次，保存 30 天
□ 增量备份：每天至少 1 次
□ Binlog：保留 7 天以上
□ 异地备份：备份文件不能和数据库在同一台机器
□ 备份验证：每周至少 1 次恢复测试（确保备份文件可用）
□ 恢复演练：每季度 1 次完整恢复演练（限时 4 小时恢复）
□ 监控告警：备份失败 5 分钟内通知值班人员
```

---

## 面试题

### Q1: 主从复制的原理是什么？Binlog 有哪几种格式？

主库将变更写入 Binlog，从库的 I/O 线程拉取并写入 Relay Log，SQL 线程重放。Binlog 有三种格式：STATEMENT（记录 SQL）、ROW（记录行变更，推荐）、MIXED（混合）。

### Q2: 主从延迟怎么排查和解决？

排查：`SHOW SLAVE STATUS` 查看 `Seconds_Behind_Master`。常见原因：从库硬件差、主库大事务、从库慢查询。解决：优化从库硬件、拆分大事务、开启并行复制、关键业务读主库。

### Q3: 分库分表后，全局唯一 ID 怎么生成？

常用方案：雪花算法（Snowflake，高性能趋势递增）、Redis INCR（简单可靠）、数据库号段（不依赖外部组件）、UUID（不推荐，太长且无序）。

### Q4: 大表 DDL 有哪些方案？

MySQL 5.6+ 的 Online DDL（INPLACE 算法，部分操作不锁表）；大表推荐 gh-ost（GitHub 开源工具，通过 Binlog 同步，零停机修改表结构）。

### Q5: 数据库备份策略怎么设计？

每周全量（XtraBackup）+ 每天增量 + 实时 Binlog 备份。关键：异地备份、定期恢复测试、监控告警。

---

## 参考

- 上一篇：[MySQL 进阶](./02-MySQL%20进阶)
- 下一篇：[Node.js 操作 MySQL](./04-Node.js%20操作%20MySQL)