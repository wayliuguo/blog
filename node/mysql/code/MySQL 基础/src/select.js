// select.js：查询（SELECT）——日常最高频的读操作
// 运行： npm run select
const { query, pool } = require('./db')

;(async () => {
    console.log('=== 条件查询：status = 1 的前 5 个用户 ===')
    const users = await query('SELECT id, username, email, balance FROM users WHERE status = 1 ORDER BY id LIMIT 5')
    console.table(users)

    await pool.end()
    process.exit(0)
})().catch(e => {
    console.error('运行出错：', e)
    process.exit(1)
})
