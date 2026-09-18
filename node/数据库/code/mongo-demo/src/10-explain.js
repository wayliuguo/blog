// 10-explain.js：读执行计划（explain）+ 慢查询排查（profiling）
// explain('executionStats') 会真跑一遍查询，把「扫了多少文档 / 返回多少 / 耗时」摊开给你看
// 运行： npm run explain
const { withDb, fail } = require('./lib')

// 把最该看的三个数字抽出来，方便逐条对照
async function show(label, cursor) {
    const p = await cursor.explain('executionStats')
    const st = p.queryPlanner.winningPlan
    const inner = st.inputStage ? st.inputStage.stage : ''
    const s = p.executionStats
    console.log(
        '  ' + label.padEnd(26),
        'stage =',
        (st.stage + (inner ? '/' + inner : '')).padEnd(12),
        'docsExamined =',
        String(s.totalDocsExamined).padEnd(5),
        'nReturned =',
        s.nReturned,
        '（' + (s.totalDocsExamined > s.nReturned ? '扫得比返回多 → 还有优化空间' : '基本贴住命中行数') + '）'
    )
}

;(async () => {
    await withDb(async db => {
        const users = db.collection('users')
        const orders = db.collection('orders')
        await Promise.all([users.deleteMany({}), orders.deleteMany({})])
        await users.createIndex({ age: 1 })
        await orders.createIndex({ status: 1, created_at: -1 })

        // 造 200 个用户 + 200 张订单
        await users.insertMany(
            Array.from({ length: 200 }, (_, i) => ({ name: 'user' + i, age: i % 60, email: `user${i}@test.com` }))
        )
        await orders.insertMany(
            Array.from({ length: 200 }, (_, i) => ({
                amount: (i + 1) * 10,
                status: i % 2 ? 'pending' : 'completed',
                created_at: new Date(2024, i % 12, (i % 27) + 1)
            }))
        )

        // ---------- 1. explain：一条查询的执行计划 ----------
        console.log('=== 1. explain(executionStats) ===')
        const plan = await users.find({ age: { $gt: 18 } }).explain('executionStats')
        console.log(
            '  winningPlan.stage                    =',
            plan.queryPlanner.winningPlan.stage,
            '（IXSCAN = 走了索引，COLLSCAN = 全集合扫描）'
        )
        console.log(
            '  executionStats.totalDocsExamined     =',
            plan.executionStats.totalDocsExamined,
            '（扫描的文档数，越小越好）'
        )
        console.log('  executionStats.nReturned             =', plan.executionStats.nReturned, '（返回的文档数）')
        console.log(
            '  executionStats.executionTimeMillis   =',
            plan.executionStats.executionTimeMillis,
            'ms（执行时间）'
        )

        // 把上面结论逐条对照：扫了多少、返回多少
        await show('age 等值（有索引）', users.find({ age: 30 }))
        await show('age 范围（有索引）', users.find({ age: { $gt: 18 } }))
        await show('name 等值（无索引）', users.find({ name: 'user10' }))
        await show('status 等值（有索引）', orders.find({ status: 'pending' }))

        // ---------- 2. 慢查询日志（profiling） ----------
        console.log('=== 2. 慢查询排查 ===')
        // 启用慢查询日志
        await db.setProfilingLevel(1, { slowms: 100 })
        const level = await db.command({ profile: -1 })
        console.log(
            '  当前 profiling 级别 =',
            level.was,
            '（0 关闭 / 1 只记慢查询 / 2 记全部），slowms =',
            level.slowms
        )
        console.log('  profiling 结果写在 system.profile 这个固定集合里，级别为 0 时它会被删掉')

        // 查看慢查询
        const slow = await db
            .collection('system.profile')
            .find({ millis: { $gt: 100 } })
            .sort({ ts: -1 })
            .limit(10)
            .toArray()
        console.log('  millis > 100 的记录条数 =', slow.length, '（本脚本没特意造慢查询，通常是 0 条）')

        // 分析：explain('executionStats')
        const pendingPlan = await orders.find({ status: 'pending' }).explain('executionStats')
        console.log(
            '  orders.find({ status: "pending" }) → docsExamined =',
            pendingPlan.executionStats.totalDocsExamined,
            '，nReturned =',
            pendingPlan.executionStats.nReturned
        )

        console.log('  排查顺序：system.profile 找慢查询 → explain 看 stage/rows → 再决定是补索引还是改写法')
        await db.setProfilingLevel(0)
        console.log('  已把 profiling 关回 0 级')
    })
})().catch(fail)
