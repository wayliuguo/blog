// 04-explain.js：逐条 EXPLAIN，读懂执行计划（本项目重点）
// 只突出 6 列：type / possible_keys / key / rows / filtered / Extra
// 运行： npm run explain
const { query, pool } = require('./db');

// 每条用例：[中文目的, SQL]（SQL 用字面量，便于直接 EXPLAIN）
const cases = [
  ['等值查询：按 email 查找（唯一索引应命中）',
   "SELECT * FROM users WHERE email = 'user50000@example.com'"],
  ['范围查询：主键 id 区间（应走 PRIMARY，type=range）',
   'SELECT * FROM users WHERE id BETWEEN 1000 AND 2000'],
  ['联合索引最左前缀【命中】：user_id 等值 + created_at 范围',
   "SELECT * FROM orders WHERE user_id = 50000 AND created_at > '2024-01-01'"],
  ['联合索引最左前缀【不命中】：只用 created_at，跳过 user_id',
   "SELECT * FROM orders WHERE created_at > '2024-01-01'"],
  ['覆盖索引：只查联合索引包含的列，无需回表',
   'SELECT user_id, created_at FROM orders WHERE user_id = 50000'],
  ['SELECT * 破坏覆盖：同样条件但查全列，需回表',
   'SELECT * FROM orders WHERE user_id = 50000'],
  ['函数作用在索引列：UPPER(email) 使 uq_email 失效',
   "SELECT * FROM users WHERE UPPER(email) = 'USER50000@EXAMPLE.COM'"],
  ['左模糊 like \'%x\'：前缀模糊使索引失效',
   "SELECT * FROM users WHERE email LIKE '%example.com'"],
  ['低区分度字段：status 无单列索引，全表扫描',
   'SELECT * FROM users WHERE status = 1'],
];

(async () => {
  for (const [desc, sql] of cases) {
    console.log('');
    console.log('=== ' + desc + ' ===');
    console.log('SQL: ' + sql);

    // EXPLAIN 返回执行计划，而非数据；取 6 个关键列便于对比
    const plan = await query('EXPLAIN ' + sql);
    const simplified = plan.map((p) => ({
      type: p.type,
      possible_keys: p.possible_keys || '',
      key: p.key || '',
      rows: p.rows,
      filtered: p.filtered,
      Extra: p.Extra || '',
    }));
    console.table(simplified);
  }

  console.log('=== 怎么读 EXPLAIN（type 从优到劣） ===');
  console.log('system > const > eq_ref > ref > range > index > ALL');
  console.log('const/eq_ref：唯一索引/主键命中，最多一行，最快');
  console.log('ref：普通索引等值，少量行');
  console.log('range：索引范围扫描（BETWEEN / IN / > / <）');
  console.log('index：全索引扫描（比 ALL 好，因为只扫索引树）');
  console.log('ALL：全表扫描，10 万行数据下要极力避免');
  console.log('Extra 看“Using index”=覆盖索引（无需回表）；“Using where”=回表后再过滤');
  console.log('rows 是估算扫描行数，越接近实际命中行数越好');

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
