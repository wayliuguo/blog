// 03-index.js：索引对比实验（本项目重点之一）
// 同一句等值查询，无索引 vs 有索引，计时 100 次，直观感受“走没走索引”
// 运行： npm run index
const { query, pool } = require('./db');

(async () => {
  const email = 'user50000@example.com'; // 该用户一定存在于 10 万行种子数据中

  // 1. 先尝试删掉 email 的唯一索引，做“无索引”对照
  //    用 try/catch 容错：索引可能本就不存在，删不掉也不影响实验
  console.log('=== 准备：删除 users.email 唯一索引（构造无索引场景） ===');
  try {
    await query('ALTER TABLE users DROP INDEX uq_email');
  } catch (e) {
    console.log('（索引已不存在，跳过删除）');
  }

  // 2. 无索引：对 10 万行做 100 次 email 等值查询，逐行全表扫描
  const startNo = Date.now();
  for (let i = 0; i < 100; i++) {
    await query('SELECT id, email FROM users WHERE email = ?', [email]);
  }
  const noIndexMs = Date.now() - startNo;

  // 3. 重建索引，恢复“有索引”场景
  console.log('=== 准备：重建 users.email 唯一索引 ===');
  await query('ALTER TABLE users ADD UNIQUE KEY uq_email (email)');

  // 4. 有索引：同样 100 次等值查询，走 B+ 树定位到单行
  const startIdx = Date.now();
  for (let i = 0; i < 100; i++) {
    await query('SELECT id, email FROM users WHERE email = ?', [email]);
  }
  const withIndexMs = Date.now() - startIdx;

  // 5. 输出清晰对照表
  console.log('');
  console.log('=== 索引对比实验（10 万行 users，100 次 email 等值查询） ===');
  console.log('无索引：100 次共 ' + noIndexMs + 'ms，平均 ' + (noIndexMs / 100).toFixed(1) + 'ms');
  console.log('有索引：100 次共 ' + withIndexMs + 'ms，平均 ' + (withIndexMs / 100).toFixed(1) + 'ms');
  const speedup = noIndexMs / Math.max(withIndexMs, 1);
  console.log('提速约 ' + speedup.toFixed(0) + ' 倍');
  console.log('');
  console.log('解读：无索引时每次查询都要扫全表（rows≈10 万），有索引时直接定位单行（rows=1）。');
  console.log('索引不是“查询变快”的魔法，而是把“遍历”换成“树查找”。');

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
