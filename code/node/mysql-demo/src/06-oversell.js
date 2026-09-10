// 06-oversell.js：防超卖（对应博客「防超卖」一节，本项目重点）
// 错误做法：先 SELECT 再判断再 UPDATE（读-改-写非原子，并发会超卖）
// 正确做法：UPDATE ... WHERE stock >= 1，用 affectedRows 判断是否真的扣到
// 运行： npm run oversell
const { pool, query } = require('./db');

(async () => {
  const pid = 1; // 用商品 1 做实验

  // ===== 错误做法 =====
  // 先把库存重置为 100（让实验可重复、可对比）
  await query('UPDATE products SET stock = 100 WHERE id = ?', [pid]);
  console.log('=== 错误做法：先 SELECT 再 UPDATE（并发 200 次，初始库存 100） ===');
  console.log('原理：两个请求同时读到 stock=100，都通过 >0 判断，各自 -1，最终实际卖出超过 100 件');
  let wrongSuccess = 0;
  await Promise.all(Array.from({ length: 200 }, async () => {
    // 注意：这里 SELECT 和 UPDATE 之间没有任何原子保证
    const [rows] = await query('SELECT stock FROM products WHERE id = ?', [pid]);
    if (rows[0].stock > 0) {
      await query('UPDATE products SET stock = stock - 1 WHERE id = ?', [pid]);
      wrongSuccess++;
    }
  }));
  const [w] = await query('SELECT stock FROM products WHERE id = ?', [pid]);
  console.log('错误做法结果：声称成功 ' + wrongSuccess + ' 次，库存剩余 ' + w[0].stock);
  console.log('解读：剩余库存不是 0（可能为负），成功次数却 >100，说明已经超卖。');

  // ===== 正确做法 =====
  // 同样重置库存为 100
  await query('UPDATE products SET stock = 100 WHERE id = ?', [pid]);
  console.log('');
  console.log('=== 正确做法：UPDATE ... WHERE stock >= 1（并发 200 次，初始库存 100） ===');
  console.log('原理：扣减与判断在同一个原子语句里完成，数据库保证不会把库存扣成负数');
  let rightSuccess = 0;
  await Promise.all(Array.from({ length: 200 }, async () => {
    // affectedRows=1 表示“确实有库存且成功扣了 1 件”，否则说明已售罄
    const [r] = await pool.query(
      'UPDATE products SET stock = stock - 1 WHERE id = ? AND stock >= 1',
      [pid]
    );
    if (r.affectedRows === 1) rightSuccess++;
  }));
  const [r2] = await query('SELECT stock FROM products WHERE id = ?', [pid]);
  console.log('正确做法结果：成功 ' + rightSuccess + ' 次，库存剩余 ' + r2[0].stock);
  console.log('解读：成功次数应恰好 =100，库存剩余应恰好 =0，数字自洽，未超卖。');

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
