// update.js：更新（UPDATE）
// 给 1 号用户（seed.sql 保证存在）充值 100
// 运行： npm run update
const { pool } = require('./db')

;(async () => {
    console.log('=== 更新：给 1 号用户充值 100 ===')
    const [upd] = await pool.query('UPDATE users SET balance = balance + 100 WHERE id = ?', [1])
    console.log('更新影响行数 affectedRows =', upd.affectedRows)
    console.log('注意：UPDATE 一定要带 WHERE，否则全表都会被更新；')
    console.log('affectedRows 命中 0 行常意味着「目标数据不存在」，可用来判断更新是否真的生效。')

    await pool.end()
    process.exit(0)
})().catch(e => {
    console.error('运行出错：', e)
    process.exit(1)
})
