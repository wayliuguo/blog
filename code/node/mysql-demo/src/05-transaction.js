// 05-transaction.js：事务——要么全成功，要么全失败（本项目重点）
// 场景：用户购买服务 -> 扣余额 -> 创建订单 -> 写流水，三步必须原子
// 运行： npm run tx
const { pool } = require('./db');

(async () => {
  const userId = 1;

  // ---------- 分支一：余额充足，正常提交 ----------
  console.log('--- 分支一：正常购买（余额充足，应 commit） ---');
  let conn = await pool.getConnection();
  try {
    await conn.beginTransaction(); // 1. 开启事务

    const [u] = await conn.query('SELECT balance FROM users WHERE id = ?', [userId]);
    const before = u[0].balance;
    console.log('购买前余额：', before);
    const price = 50;

    // 2. 扣余额
    await conn.query('UPDATE users SET balance = balance - ? WHERE id = ?', [price, userId]);
    // 3. 创建订单
    const [r] = await conn.query(
      'INSERT INTO orders (user_id, amount, status, created_at) VALUES (?, ?, 1, NOW())',
      [userId, price]
    );
    const orderId = r.insertId;
    // 4. 写流水（与扣款成对出现，账才平）
    await conn.query(
      'INSERT INTO balance_log (user_id, change_amount, type, created_at) VALUES (?, ?, ?, NOW())',
      [userId, -price, 'pay']
    );

    await conn.commit(); // 5. 全部成功，提交
    console.log('提交成功，order_id =', orderId);

    const [u2] = await conn.query('SELECT balance FROM users WHERE id = ?', [userId]);
    console.log('购买后余额：', u2[0].balance, '（应比购买前少', price, '）');
  } catch (e) {
    await conn.rollback(); // 任一步出错，整体回滚
    console.error('分支一出错，已回滚：', e.message);
  } finally {
    conn.release(); // 无论成败都释放连接，否则连接泄漏
  }

  // ---------- 分支二：余额不足，整体回滚 ----------
  console.log('');
  console.log('--- 分支二：余额不足（应 rollback，余额不变） ---');
  let conn2 = await pool.getConnection();
  try {
    await conn2.beginTransaction();

    const [u] = await conn2.query('SELECT balance FROM users WHERE id = ?', [userId]);
    const balance = u[0].balance;
    const price = balance + 1000; // 故意超过余额，触发异常

    if (balance < price) {
      throw new Error('余额不足'); // 业务校验失败，抛错进入 catch
    }
    await conn2.query('UPDATE users SET balance = balance - ? WHERE id = ?', [price, userId]);
    await conn2.commit();
  } catch (e) {
    await conn2.rollback(); // 回滚后，分支一扣掉的那 50 元也“不存在”于本次操作
    console.log('分支二因「' + e.message + '」已回滚，本次余额未变化');
  } finally {
    conn2.release();
  }

  console.log('');
  console.log('结论：事务保证了“扣款、订单、流水”三步同生共死，不会出现“钱扣了订单没生成”的脏账。');

  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error('运行出错：', e);
  process.exit(1);
});
