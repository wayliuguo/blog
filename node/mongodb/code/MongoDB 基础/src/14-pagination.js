// 14-pagination.js：分页——skip/limit 的代价与游标分页
// 分页在分片集群上格外贵：每个分片都要返回 N 条，客户端聚合再排序取前 N 条
// 运行： npm run pagination
const { withDb, fail } = require('./lib')

;(async () => {
    await withDb(async db => {
        const orders = db.collection('orders')
        await orders.deleteMany({})
        await orders.insertMany(
            Array.from({ length: 5000 }, (_, i) => ({
                user_id: i % 50,
                amount: i + 1,
                created_at: new Date(2024, i % 12, (i % 27) + 1)
            }))
        )
        await orders.createIndex({ user_id: 1, created_at: -1 })

        console.log('=== 1. skip/limit：翻到后面越来越慢 ===')
        for (const skip of [0, 1000, 4000]) {
            const started = Date.now()
            const rows = await orders.find().sort({ _id: 1 }).skip(skip).limit(10).toArray()
            console.log(
                '  skip =',
                String(skip).padEnd(5),
                '→',
                String(Date.now() - started).padStart(4),
                'ms，第一条 amount =',
                rows[0].amount
            )
        }
        console.log('  skip 越大，服务端要先"数着跳过"的记录越多；分片集群下每个分片都得数一遍再汇总')

        console.log('=== 2. 分片键 + 范围 ===')
        // 优化方案 1：查询条件带上分片键，能只查一个分片
        await orders.find({ user_id: 12345 }).sort({ created_at: -1 }).skip(0).limit(10).toArray()
        console.log('  条件里带 user_id（分片键）→ 只路由到一个分片，skip 也只在那个分片里数')

        console.log('=== 3. 游标分页 ===')
        // 优化方案 2：游标分页
        // 使用上一页最后一条的 _id 代替 OFFSET
        const lastPage = await orders.find().sort({ _id: 1 }).limit(3).toArray()
        const lastId = lastPage[lastPage.length - 1]._id
        await orders
            .find({ _id: { $gt: lastId } })
            .sort({ _id: 1 })
            .limit(10)
            .toArray()
        console.log('  上一页最后一条 _id =', lastId.toString())
        const next = await orders
            .find({ _id: { $gt: lastId } })
            .sort({ _id: 1 })
            .limit(10)
            .toArray()
        console.log('  下一页沿用同一条件 → _id 从', next[0]._id.toString(), '到', next[9]._id.toString())
        console.log('  不带 skip 的条件是范围查询，翻第 100 页和翻第 1 页一样快')

        console.log('')
        console.log('小结：分片集群下 skip / count 都要"全分片汇总"；能靠分片键定位就别跨分片，')
        console.log('      需要页码时就改用游标；统计报表结果不常变，直接缓存到 Redis')
    })
})().catch(fail)
