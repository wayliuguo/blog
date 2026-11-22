// 09-index.js：索引的创建、失效与覆盖
// 索引把「遍历整集合」换成「B 树查找」；复合索引同样遵守最左前缀
// 运行： npm run index
const { withDb, fail } = require('./lib')

// 打印执行计划里最该看的三个数字：走没走索引（stage）、扫了多少文档、返回多少
async function probe(label, cursor) {
    const plan = await cursor.explain('executionStats')
    const win = plan.queryPlanner.winningPlan
    const inner = win.inputStage ? win.inputStage.stage : ''
    console.log(
        '  ' + label.padEnd(30),
        'stage =',
        win.stage + (inner ? ' / ' + inner : ''),
        '，docsExamined =',
        plan.executionStats.totalDocsExamined,
        '，nReturned =',
        plan.executionStats.nReturned
    )
}

;(async () => {
    await withDb(async db => {
        const users = db.collection('users')
        const orders = db.collection('orders')
        await Promise.all([users.deleteMany({}), orders.deleteMany({})])

        // ---------- 1. 创建索引 ----------
        console.log('=== 1. 创建索引 ===')
        // 单字段索引
        await users.createIndex({ name: 1 }) // 1 升序，-1 降序

        // 复合索引
        await users.createIndex({ age: 1, name: 1 })

        // 唯一索引
        await users.createIndex({ email: 1 }, { unique: true })
        console.log('  users 上的索引 →', (await users.indexes()).map(i => i.name).join('、'))

        // 订单上用「等值列 + 排序列」的复合索引，下面反复引用
        await orders.createIndex({ user_id: 1, created_at: -1 })

        // ---------- 2. 造点数据 ----------
        await users.insertMany([
            { name: '张三', age: 25, email: 'zhangsan@test.com' },
            { name: '李四', age: 30, email: 'lisi@test.com' },
            { name: '张伟', age: 17, email: 'zhangwei@test.com' }
        ])
        await orders.insertMany(
            Array.from({ length: 50 }, (_, i) => ({
                user_id: i % 5,
                amount: (i + 1) * 10,
                status: i % 3 === 0 ? 'completed' : 'pending',
                created_at: new Date(2024, i % 12, (i % 27) + 1)
            }))
        )
        console.log(
            '=== 2. 造数完成：users =',
            await users.countDocuments(),
            '，orders =',
            await orders.countDocuments(),
            '==='
        )

        // ---------- 3. 索引失效场景 ----------
        console.log('=== 3. 索引失效场景 ===')
        // 复合索引最左前缀原则和 MySQL 一样
        // 索引：{ user_id: 1, created_at: -1 }

        // ✅ 能用到索引：find({ user_id: 123 })
        await orders.find({ user_id: 123 }).toArray()
        // ✅ 能用到索引：等值 + 范围（最左列在，后面的列才能接着用）
        await orders.find({ user_id: 123, created_at: { $gt: new Date('2024-01-01') } }).toArray()
        // ❌ 用不到索引：跳过了最左列 user_id
        await orders.find({ created_at: { $gt: new Date('2024-01-01') } }).toArray()

        // 索引失效：正则前缀模糊
        await users.find({ name: /^张/ }).toArray() // 前缀匹配可以用到索引
        await users.find({ name: /张三/ }).toArray() // 包含匹配，不走索引

        // 索引失效：把函数作用在索引列上（$expr + $year，等价于 SQL 的 year(created_at) = 2024）
        await orders.find({ $expr: { $eq: [{ $year: '$created_at' }, 2024] } }).toArray()

        // 正确写法：改写成范围条件才走索引
        await orders
            .find({
                created_at: {
                    $gte: new Date('2024-01-01'),
                    $lt: new Date('2025-01-01')
                }
            })
            .toArray()

        // 用 explain 把上面的结论逐条验一遍
        await probe('user_id 等值', orders.find({ user_id: 123 }))
        await probe(
            'user_id + created_at 范围',
            orders.find({ user_id: 123, created_at: { $gt: new Date('2024-01-01') } })
        )
        await probe('只有 created_at（跳过最左列）', orders.find({ created_at: { $gt: new Date('2024-01-01') } }))
        await probe('name 前缀 /^张/', users.find({ name: /^张/ }))
        await probe('name 包含 /张三/', users.find({ name: /张三/ }))
        await probe('created_at 上套 $year', orders.find({ $expr: { $eq: [{ $year: '$created_at' }, 2024] } }))
        await probe(
            'created_at 范围条件',
            orders.find({ created_at: { $gte: new Date('2024-01-01'), $lt: new Date('2025-01-01') } })
        )

        // ---------- 4. 覆盖索引 ----------
        console.log('=== 4. 覆盖索引 ===')
        // 如果查询只需要索引中包含的字段，不需要回表
        // 只需要计数时，{ user_id: 1 } 这一个索引就能覆盖，不必回表取整条文档
        const total = await orders.countDocuments({ user_id: 123 })
        // 检查：explain() 里 winningPlan 只有 IXSCAN、没有 FETCH → 覆盖索引命中
        const coveredPlan = await orders
            .find({ user_id: 123 }, { projection: { user_id: 1, created_at: 1, _id: 0 } })
            .explain('executionStats')
        console.log('  countDocuments({ user_id: 123 }) =', total)
        console.log(
            '  只查索引里的两列 → stage =',
            coveredPlan.queryPlanner.winningPlan.stage,
            coveredPlan.queryPlanner.winningPlan.inputStage
                ? '/ ' + coveredPlan.queryPlanner.winningPlan.inputStage.stage
                : '',
            '，totalDocsExamined =',
            coveredPlan.executionStats.totalDocsExamined,
            '（0 = 没回表读文档）'
        )
        const fetchPlan = await orders.find({ user_id: 123 }).explain('executionStats')
        console.log(
            '  同条件查全列     → stage =',
            fetchPlan.queryPlanner.winningPlan.stage,
            fetchPlan.queryPlanner.winningPlan.inputStage
                ? '/ ' + fetchPlan.queryPlanner.winningPlan.inputStage.stage
                : '',
            '，totalDocsExamined =',
            fetchPlan.executionStats.totalDocsExamined,
            '（FETCH 就是回表）'
        )
    })
})().catch(fail)
