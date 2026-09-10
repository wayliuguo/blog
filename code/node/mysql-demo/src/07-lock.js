// 07-lock.js：乐观锁 vs 悲观锁
// 运行： npm run lock
const { pool, query } = require('./db');

// ---------- 乐观锁：基于 version 的 CAS 更新 ----------
// 思路：更新时带上“我读到的版本号”，若期间被别人改过，version 对不上，affectedRows=0，则重试
async function optimisticBuy(pid) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const [rows] = await query('SELECT stock, version FROM products WHERE id = ?', [pid]);
    const { stock, version } = rows[0];
    if (stock <= 0) return { ok: false, reason: '库存不足' };
    // 关键：WHERE 同时卡 stock>0 和 version 不变，保证“读到即写到”的原子性
    const [r] = await pool.query(
      'UPDATE products SET stock = stock - 1, version = version + 1 WHERE id = ? AND version = ?',
      [pid, version]
    );
    if (r.affectedRows === 1) return { ok: true, attempt };
    console.log('乐观锁冲突，第 ' + attempt + ' 次重试');
  }
  return { ok: false, reason: '重试 3 次仍失败' };
}

(async () => {
  const pid = 1;

  // 演示乐观锁
  await query('UPDATE products SET stock = 10, version = 1 WHERE id = ?', [pid]);
  console.log('=== 乐观锁：基于 version 字段的 CAS 更新 ===');
  const res = await optimisticBuy(pid);
  const [op] = await query('SELECT stock, version FROM products WHERE id = ?', [pid]);
  console.log('扣减结果：', JSON.stringify(res), '，当前 stock =', op[0].stock, '，version =', op[0].version);
  console.log('解读：version 每成功一次 +1；冲突时 affectedRows=0，自动重试，最多 3 次。');

  // 演示悲观锁
  console.log('');
  console.log('=== 悲观锁：事务内 SELECT ... FOR UPDATE 锁住行 ===');
  console.log('解读：在事务提交前，这行被独占，其它事务对该行的写会被阻塞，直到本事务提交');
  let conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // FOR UPDATE 对命中行加排他锁，期间他人无法修改也无法加锁
    const [rows] = await conn.query('SELECT stock FROM products WHERE id = ? FOR UPDATE', [pid]);
    console.log('已对商品 ' + pid + ' 加行锁，当前库存 ' + rows[0].stock);
    await conn.query('UPDATE products SET stock = stock - 1 WHERE id = ?', [pid]);
    await conn.commit(); // 提交即释放锁
    console.log('扣减 1 件并提交，锁已释放');
  } catch (e) {
    await conn.rollback();
    console.error('悲观锁演示出错，已回滚：', e.message);
  } finally {
    conn.release();
  }

  console.log('');
  console.log('对比：乐观锁适合冲突少（靠重试），悲观锁适合冲突多（靠阻塞），都解决并发安全。');

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
