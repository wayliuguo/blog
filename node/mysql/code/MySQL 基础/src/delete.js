// delete.js：删除（DELETE）
// 清理演示用户（insert.js 留下的、email 以 demo 开头的账号）
// 运行： npm run delete
const { pool, query } = require('./db')

;(async () => {
    const rows = await query("SELECT id, email FROM users WHERE email LIKE 'demo%' ORDER BY id DESC LIMIT 1")
    if (rows.length === 0) {
        console.log('没有演示用户可删（可先跑 npm run insert）；这种“没命中”就是 affectedRows = 0 的场景')
    } else {
        console.log('=== 删除：删除演示用户 id =', rows[0].id, '===')
        const [del] = await pool.query('DELETE FROM users WHERE id = ?', [rows[0].id])
        console.log('删除影响行数 affectedRows =', del.affectedRows)
    }

    await pool.end()
    process.exit(0)
})().catch(e => {
    console.error('运行出错：', e)
    process.exit(1)
})
