-- ============================================================
-- 02-seed.sql  造测试数据（纯 SQL，不依赖任何外部工具）
-- 运行： mysql -u root -p mysql_demo < sql/02-seed.sql
-- 量级： users 10 万行 / products 1000 行 / orders 1 万行 / order_items 2 万行
-- ============================================================

USE mysql_demo;

-- 提高递归 CTE 深度上限（MySQL 8 默认只允许 1000 层递归）
SET SESSION cte_max_recursion_depth = 1000000;

-- 1) 10 万普通用户：email/user_ 序号自增，status 在 1/2/3 间循环，balance 随机
INSERT INTO users (email, username, status, balance, version, created_at)
WITH RECURSIVE nums(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 100000
)
SELECT
  CONCAT('user', n, '@example.com'),
  CONCAT('user_', n),
  CASE n % 3 WHEN 0 THEN 1 WHEN 1 THEN 2 ELSE 3 END,
  ROUND(RAND() * 1000, 2),
  1,
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
FROM nums;

-- 2) 1000 个商品：price 10~1000，stock 100~999
INSERT INTO products (name, price, stock, version, created_at)
WITH RECURSIVE nums(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 1000
)
SELECT
  CONCAT('商品_', n),
  ROUND(10 + RAND() * 990, 2),
  100 + FLOOR(RAND() * 900),
  1,
  NOW()
FROM nums;

-- 3) 1 万个订单：user_id 落在已存在的 1~100000 区间内
INSERT INTO orders (user_id, amount, status, created_at)
WITH RECURSIVE nums(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 10000
)
SELECT
  1 + (n MOD 100000),
  ROUND(20 + RAND() * 480, 2),
  1,
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 180) DAY)
FROM nums;

-- 4) 2 万条订单明细：order_id 落在 1~10000，product_id 落在 1~1000
INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
WITH RECURSIVE nums(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 20000
)
SELECT
  1 + (n MOD 10000),
  1 + (n MOD 1000),
  1 + (n MOD 3),
  ROUND(10 + RAND() * 990, 2),
  NOW()
FROM nums;

-- 校验：逐表 COUNT，确认数据已写入
SELECT 'users'       AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'products',    COUNT(*) FROM products
UNION ALL SELECT 'orders',      COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items;
