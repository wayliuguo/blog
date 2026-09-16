// 01-crud.js：最基础的增删改查（CRUD）
// 用 mysql2 原生 driver，每条 SQL 都看得见、改得动
// 运行： npm run crud
const { query, pool } = require('./db');

(async () => {
  // 1. 查询：条件 + 排序 + 限制，这是日常最高频的读操作
  console.log('=== 1. 条件查询：status = 1 的前 5 个用户 ===');
  const users = await query(
    'SELECT id, username, email, balance FROM users WHERE status = 1 ORDER BY id LIMIT 5'
  );
  console.table(users);

  // 2. 插入：用时间戳拼 email，保证可重复运行不违反唯一约束
  console.log('=== 2. 插入：新增一个演示用户 ===');
  const email = 'demo_' + Date.now() + '@example.com';
  const [ins] = await pool.query(
    'INSERT INTO users (email, username, status, balance, version, created_at) VALUES (?, ?, 1, 0, 1, NOW())',
    [email, 'demo_user']
  );
  console.log('插入成功，insertId =', ins.insertId, '，affectedRows =', ins.affectedRows);

  // 3. 更新：余额 += 100
  console.log('=== 3. 更新：给演示用户充值 100 ===');
  const [upd] = await pool.query(
    'UPDATE users SET balance = balance + 100 WHERE id = ?',
    [ins.insertId]
  );
  console.log('更新影响行数 affectedRows =', upd.affectedRows);

  // 4. 删除：清理演示数据
  console.log('=== 4. 删除：删除刚才的演示用户 ===');
  const [del] = await pool.query('DELETE FROM users WHERE id = ?', [ins.insertId]);
  console.log('删除影响行数 affectedRows =', del.affectedRows);

  // 5. 概念小结
  console.log('=== 5. affectedRows 是什么 ===');
  console.log('affectedRows 表示“这条语句实际匹配/改动的行数”。');
  console.log('UPDATE/DELETE 命中 0 行时 affectedRows = 0，常用来判断“目标数据是否存在”。');
  console.log('INSERT 的 affectedRows 通常为 1，insertId 是自增主键值，后续关联要用到。');

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
