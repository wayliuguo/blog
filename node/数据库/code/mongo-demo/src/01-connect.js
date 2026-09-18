// 01-connect.js：连接、ping 与集合操作
// mongosh 里的 db 对象，在驱动里就是 client.db('库名')；集合也从 db.xxx 变成 db.collection('xxx')
// 运行： npm run connect
const { URI, DB_NAME, withDb, fail } = require('./lib')

;(async () => {
    await withDb(async (db, client) => {
        // 1. 连接：驱动是懒连接，connect() 之后才真正握手
        console.log('=== 1. 连接 ===')
        console.log('  连接串 =', URI, '（库 =', DB_NAME + '）')
        const pong = await db.command({ ping: 1 })
        console.log('  ping 结果 =', JSON.stringify(pong))

        // 2. 集合操作：mongosh 的 db.getCollectionNames() ↔ db.listCollections()
        console.log('=== 2. 集合操作 ===')
        const before = await db.listCollections().toArray()
        console.log('  当前集合数 =', before.length, '→', before.map(c => c.name).join('、') || '（空库）')

        // createCollection：集合已存在会报 NamespaceExists(48)，这也是"集合是否已存在"的判据
        if (!before.some(c => c.name === 'demo_tmp')) {
            await db.createCollection('demo_tmp')
            console.log('  createCollection(demo_tmp) 建好了')
        }
        const after = await db.listCollections().toArray()
        console.log('  建完后集合数 =', after.length)

        // drop：删集合连索引一起删，比逐条 deleteMany 快得多（日志分表靠的就是它）
        await db.collection('demo_tmp').drop()
        console.log('  drop(demo_tmp) 之后集合数 =', (await db.listCollections().toArray()).length)

        // 3. 驱动的数据库对象上还能直接跑命令，相当于 mongosh 的 db.runCommand
        console.log('=== 3. 服务端信息 ===')
        const info = await db.admin().serverInfo()
        console.log('  MongoDB 版本 =', info.version, '，存储引擎 =', info.storageEngine?.name)

        console.log('')
        console.log('关闭连接：client.close()（lib.js 的 withDb 已在 finally 里做掉）')
        console.log('  当前 client 状态 =', client.topology?.isConnected?.() === false ? '已断开' : '仍连着')
    })
})().catch(fail)
