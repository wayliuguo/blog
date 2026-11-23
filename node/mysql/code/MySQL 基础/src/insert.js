// insert.js：插入（INSERT）
// 用时间戳拼 email，保证可重复运行不违反唯一约束
// 运行： npm run insert
const { pool } = require('./db')

;(async () => {
    console.log('=== 插入：新增一个演示用户 ===')
    const email = 'demo_' + Date.now() + '@example.com'
    const [ins] = await pool.query(
        'INSERT INTO users (email, username, status, balance, version, created_at) VALUES (?, ?, 1, 0, 1, NOW())',
        [email, 'demo_user']
    )
    console.log('插入成功，insertId =', ins.insertId, '，affectedRows =', ins.affectedRows)

    await pool.end()
    process.exit(0)
})().catch(e => {
    console.error('运行出错：', e)
    process.exit(1)
})
