// 11-aggregate.js：聚合管道——$match / $group / $sort / $project / $limit / $lookup / $unwind
// 聚合管道 ≈ MySQL 的 GROUP BY + JOIN + 子查询，只是把每一步写成一个阶段，按顺序流过去
// 运行： npm run aggregate
const { withDb, fail } = require('./lib')

;(async () => {
    await withDb(async db => {
        const users = db.collection('users')
        const orders = db.collection('orders')
        await Promise.all([users.deleteMany({}), orders.deleteMany({})])

        // 3 个用户 + 8 张订单：金额、状态、时间都造得能看出分组与关联的效果
        const inserted = await users.insertMany([{ name: '张三' }, { name: '李四' }, { name: '王五' }])
        const [zhang, li, wang] = Object.values(inserted.insertedIds)
        await orders.insertMany([
            { userId: zhang, amount: 120, status: 'completed', createdAt: new Date('2024-01-05') },
            { userId: zhang, amount: 80, status: 'completed', createdAt: new Date('2024-02-11') },
            { userId: li, amount: 300, status: 'completed', createdAt: new Date('2024-01-20') },
            { userId: li, amount: 50, status: 'pending', createdAt: new Date('2024-02-02') },
            { userId: wang, amount: 200, status: 'completed', createdAt: new Date('2024-01-28') },
            { userId: wang, amount: 60, status: 'pending', createdAt: new Date('2024-02-15') }
        ])

        // ---------- 1. 常用阶段 ----------
        console.log('=== 1. 常用阶段：$match → $group → $sort → $project → $limit ===')
        const topBuyers = await orders
            .aggregate([
                { $match: { status: 'completed' } }, // 过滤
                {
                    $group: {
                        // 分组聚合
                        _id: '$userId',
                        totalAmount: { $sum: '$amount' },
                        orderCount: { $sum: 1 }
                    }
                },
                { $sort: { totalAmount: -1 } }, // 排序
                {
                    $project: {
                        // 选择字段
                        userId: '$_id',
                        totalAmount: 1,
                        orderCount: 1,
                        _id: 0
                    }
                },
                { $limit: 10 } // 限制数量
            ])
            .toArray()
        console.log('  已完成订单的用户消费排行：')
        for (const row of topBuyers) {
            console.log(
                '    userId =',
                row.userId.toString(),
                '，总金额 =',
                row.totalAmount,
                '，订单数 =',
                row.orderCount
            )
        }

        // ---------- 2. 按月分组 ----------
        console.log('=== 2. 按月统计订单总额（$month）===')
        // 按月份统计订单总额
        const byMonth = await orders
            .aggregate([
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
            .toArray()
        console.log('  ', JSON.stringify(byMonth), '（_id 是月份数字，1 = 一月）')

        // ---------- 3. $lookup：文档型数据库里的 LEFT JOIN ----------
        console.log('=== 3. $lookup 关联用户信息 ===')
        // 用户总消费统计（关联用户信息）
        const spent = await orders
            .aggregate([
                {
                    $group: {
                        _id: '$userId',
                        totalSpent: { $sum: '$amount' }
                    }
                },
                {
                    $lookup: {
                        // 类似 LEFT JOIN
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        userName: '$user.name',
                        totalSpent: 1
                    }
                }
            ])
            .toArray()
        for (const row of spent) {
            console.log('  ', row.userName, '累计消费', row.totalSpent)
        }
        console.log('  $unwind 会把 $lookup 产生的数组摊平：$lookup 后 user 是数组，$unwind 后才是对象')

        console.log('')
        console.log('阶段顺序很关键：$match 越靠前，后面要处理的数据越少（先用索引过滤，再分组）')

        // 顺带说明 $sort + $limit 的顺序：先排序能吃掉大量内存，$limit 放到 $sort 前会改变语义
        const withoutUnwind = await orders
            .aggregate([
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                { $match: { 'user.0.name': '张三' } },
                { $count: 'cnt' }
            ])
            .toArray()
        console.log('  不 $unwind 也能过滤：用 user.0.name 这种点号路径 → 张三的订单数 =', withoutUnwind[0]?.cnt)
    })
})().catch(fail)
