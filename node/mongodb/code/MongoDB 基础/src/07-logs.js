// 07-logs.js：日志系统的两种生产做法——TTL 索引自动过期 + 按日期分集合
// TTL 索引：在时间字段上声明过期秒数，后台线程定期扫描删除
// 分集合：一天一个集合，历史数据整体 drop()，比逐条 DELETE 快得多也不产生碎片
// 运行： npm run logs
const { withDb, fail } = require('./lib')

;(async () => {
    await withDb(async db => {
        // 造一条「2024-01-01 那天」的历史日志，下面演示按集合查历史
        await db.collection('logs_20240101').deleteMany({})
        await db.collection('logs_20240101').insertOne({
            level: 'ERROR',
            message: '历史日志示例',
            timestamp: new Date('2024-01-01T08:00:00Z')
        })

        // ---------- 1. TTL 索引：到点自动删，不用写清理任务 ----------
        console.log('=== 1. TTL 索引 ===')
        await db.collection('access_logs').deleteMany({})
        const accessLogs = db.collection('access_logs')
        // 访问日志集合，数据自动过期
        await accessLogs.createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 86400 * 30 } // 30 天后自动删除
        )
        // 写入日志
        await accessLogs.insertOne({
            userId: 12345,
            action: 'login',
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            createdAt: new Date()
        })
        console.log('  TTL 秒数 =', 86400 * 30, '秒 =', (86400 * 30) / 86400, '天')
        const idx = await accessLogs.indexes()
        console.log(
            '  access_logs 上的索引 →',
            JSON.stringify(idx.map(i => ({ name: i.name, expireAfterSeconds: i.expireAfterSeconds })))
        )
        console.log('  后台每 60 秒扫描一次（这是扫描周期，不是精确到秒的删除时刻）')
        console.log('  文档数 =', await accessLogs.countDocuments())

        // ---------- 2. 按日期分集合 ----------
        console.log('=== 2. 按日期分集合 ===')
        // 按日期分集合存储日志
        // 每天一个集合，方便管理
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const collectionName = `logs_${today}` // 如 logs_20240101

        // 写入当天日志
        await db.collection(collectionName).insertOne({
            level: 'ERROR',
            message: '数据库连接超时',
            stack: '...',
            timestamp: new Date()
        })

        // 查询某天日志
        const errors = await db.collection('logs_20240101').find({ level: 'ERROR' }).sort({ timestamp: -1 }).toArray()
        console.log('  今天写进集合 =', collectionName)
        console.log('  查历史集合 logs_20240101 的 ERROR →', errors.length, '条：', errors[0]?.message)
        console.log('  注意：查历史不会扫到今天的集合，这就是分表"查询要带日期"的代价')

        // ---------- 3. 历史集合整体删除 ----------
        console.log('=== 3. 清理历史：drop() vs deleteMany() ===')
        await db.collection('logs_20240101').drop()
        console.log(
            '  drop(logs_20240101) 之后，该集合还在吗 →',
            (await db.listCollections().toArray()).some(c => c.name === 'logs_20240101')
        )
        console.log('  drop 直接回收整个集合（连索引一起），deleteMany 要逐条标记删除、留下空洞')
    })
})().catch(fail)
