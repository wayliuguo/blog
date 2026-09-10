// 02-join.js：JOIN 实战
// 对应博客「为什么 JOIN 必须真正学会」一节：会 ORM 不等于会关联查询
// 运行： npm run join
const { query, pool } = require('./db');

(async () => {
  // 1. INNER JOIN：用户名 + 其订单金额（两表的交集）
  console.log('=== 1. INNER JOIN：用户名 + 订单金额（取前 10 条） ===');
  console.log('说明：只有“下过单的用户”才会出现，无订单的用户被过滤掉');
  const rows = await query(`
    SELECT u.id, u.username, o.id AS order_id, o.amount
    FROM users u
    INNER JOIN orders o ON o.user_id = u.id
    ORDER BY o.id
    LIMIT 10
  `);
  console.table(rows);

  // 2. LEFT JOIN + IS NULL：找出“从没下过单”的用户
  console.log('=== 2. LEFT JOIN + IS NULL：没有下过单的用户（取前 10 条） ===');
  console.log('说明：LEFT JOIN 保留左表全部用户，右表无匹配时 o.id 为 NULL');
  const noOrders = await query(`
    SELECT u.id, u.username
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE o.id IS NULL
    LIMIT 10
  `);
  console.table(noOrders);

  // 3. 关联聚合：每个用户的下单总数与总金额
  console.log('=== 3. 关联 + 聚合：按用户统计订单数与总金额（取前 10 条） ===');
  console.log('说明：GROUP BY 必须出现在 SELECT 里的非聚合列；COUNT/DSUM 是聚合函数');
  const stat = await query(`
    SELECT u.id, u.username, COUNT(o.id) AS order_cnt, SUM(o.amount) AS total_amount
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id, u.username
    HAVING order_cnt > 0
    ORDER BY order_cnt DESC
    LIMIT 10
  `);
  console.table(stat);

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
