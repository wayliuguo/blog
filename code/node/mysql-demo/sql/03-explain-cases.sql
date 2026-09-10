-- ============================================================
-- 03-explain-cases.sql  10 条典型 SQL，配套博客「看到一条 SQL 脑子里能想到什么」
-- 用法：在 MySQL 客户端里对每条 SQL 手工加 EXPLAIN 执行，例如：
--        EXPLAIN SELECT * FROM users WHERE email = 'user50000@example.com';
-- 每条注释说明：验证什么 / 预期是否走索引 / 预期 type
-- ============================================================

-- ① 等值查询（唯一索引）：验证 email 唯一索引命中
--    预期：走 uq_email，type = const（唯一索引等值，最多一行）
EXPLAIN SELECT * FROM users WHERE email = 'user50000@example.com';

-- ② 范围查询（主键）：验证主键范围扫描
--    预期：走 PRIMARY，type = range
EXPLAIN SELECT * FROM users WHERE id BETWEEN 1000 AND 2000;

-- ③ 联合索引最左前缀【命中】：user_id 等值 + created_at 范围
--    预期：走 idx_user_created，type = range（等值+范围都能用上联合索引）
EXPLAIN SELECT * FROM orders WHERE user_id = 50000 AND created_at > '2024-01-01';

-- ④ 联合索引最左前缀【不命中】：跳过 user_id，只用 created_at
--    预期：idx_user_created 无法用于第二列，type = ALL（全表扫描）
EXPLAIN SELECT * FROM orders WHERE created_at > '2024-01-01';

-- ⑤ 覆盖索引：只查联合索引包含的列，无需回表
--    预期：走 idx_user_created，Extra = Using index（覆盖索引，不回表）
EXPLAIN SELECT user_id, created_at FROM orders WHERE user_id = 50000;

-- ⑥ SELECT * 破坏覆盖：同样的等值条件，但查全部列必须回表
--    预期：走 idx_user_created，Extra 不再是纯 Using index（需要回表取其它列）
EXPLAIN SELECT * FROM orders WHERE user_id = 50000;

-- ⑦ 函数作用在索引列上导致失效：UPPER(email) 让 uq_email 不可用
--    预期：type = ALL（对索引列套函数，优化器无法用索引）
EXPLAIN SELECT * FROM users WHERE UPPER(email) = 'USER50000@EXAMPLE.COM';

-- ⑧ 前缀模糊 like '%x' 失效：左模糊无法利用索引有序性
--    预期：type = ALL（'%example.com' 左模糊，索引失效）
EXPLAIN SELECT * FROM users WHERE email LIKE '%example.com';

-- ⑨ 前缀模糊的反例：'x%' 右模糊能走索引（范围扫描）
--    预期：走 uq_email，type = range（右模糊可用索引）
EXPLAIN SELECT * FROM users WHERE email LIKE 'user5%';

-- ⑩ 低区分度字段不单独建索引：status 只有 3 个值，没建索引
--    预期：type = ALL（全表扫描，说明低区分度字段单列索引收益极低）
EXPLAIN SELECT * FROM users WHERE status = 1;
