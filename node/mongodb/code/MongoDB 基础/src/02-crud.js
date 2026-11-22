// 02-crud.js：基本 CRUD——插入 / 查询 / 更新 / 删除
// mongosh 里的 db.users.find(...)，在驱动里就是 users.find(...)：方法同名，只是把 db.users 换成 collection 对象
// 运行： npm run crud
const { withDb, fail } = require('./lib')

;(async () => {
    await withDb(async db => {
        const users = db.collection('users')
        await users.deleteMany({}) // 每次跑都从干净集合开始，输出才可复现

        // ---------- 1. 插入 ----------
        console.log('=== 1. 插入：insertOne / insertMany ===')
        const one = await users.insertOne({ name: '张三', age: 25, city: '北京' })
        const many = await users.insertMany([
            { name: '李四', age: 30, city: '上海' },
            { name: '王五', age: 28, city: '广州' },
            { name: '张伟', age: 17, city: '深圳' }
        ])
        console.log('  insertOne → insertedId =', one.insertedId.toString(), '（驱动在客户端生成 _id）')
        console.log(
            '  insertMany → insertedCount =',
            many.insertedCount,
            '，返回的 _id：',
            Object.values(many.insertedIds).join('、')
        )

        // ---------- 2. 查询 ----------
        console.log('=== 2. 查询：find() 与查询操作符 ===')
        const all = await users.find().toArray()
        const adults = await users.find({ age: { $gt: 18 } }).toArray()
        const zhang = await users.find({ name: /张/ }).toArray()
        const inList = await users.find({ age: { $in: [18, 20] } }).toArray()
        console.log('  find() 全部 →', all.length, '条：', all.map(u => u.name).join('、'))
        console.log('  find({ age: { $gt: 18 } }) →', adults.map(u => u.name).join('、'), '（age > 18）')
        console.log('  find({ name: /张/ }) →', zhang.map(u => u.name).join('、'), '（名字含「张」）')
        console.log('  find({ age: { $in: [18, 20] } }) →', inList.length, '条（age 是 18 或 20）')

        // 投影：第二个参数只取需要的字段，_id 也要显式排掉
        const brief = await users.find({}, { projection: { name: 1, age: 1, _id: 0 } }).toArray()
        console.log('  投影 { name: 1, age: 1, _id: 0 } 的第一条 →', JSON.stringify(brief[0]))
        // 单条查询：findOne 返回文档本身，找不到返回 null
        const single = await users.findOne({ name: '李四' })
        console.log('  findOne({ name: "李四" }) →', JSON.stringify(single))

        // ---------- 3. 更新 ----------
        console.log('=== 3. 更新：updateOne / updateMany ===')
        const upd = await users.updateOne({ name: '张三' }, { $set: { age: 26 } })
        const updMany = await users.updateMany({ age: { $lt: 18 } }, { $set: { status: '未成年' } })
        console.log('  updateOne → matchedCount =', upd.matchedCount, '，modifiedCount =', upd.modifiedCount)
        console.log('  updateMany → matchedCount =', updMany.matchedCount, '，modifiedCount =', updMany.modifiedCount)

        // ---------- 4. 删除 ----------
        console.log('=== 4. 删除：deleteOne / deleteMany ===')
        const del = await users.deleteOne({ name: '张三' })
        const delMany = await users.deleteMany({ age: { $lt: 18 } })
        console.log('  deleteOne → deletedCount =', del.deletedCount)
        console.log('  deleteMany → deletedCount =', delMany.deletedCount, '（把所有未成年文档一次删掉）')

        // ---------- 5. 结果怎么读 ----------
        console.log('=== 5. 写操作的返回值怎么看 ===')
        console.log('  insertOne   → acknowledged / insertedId')
        console.log('  updateXxx   → matchedCount（匹配到几行）与 modifiedCount（真正改动了几行）')
        console.log('  deleteXxx   → deletedCount；命中 0 条时就是 0，可用来判断"目标文档是否存在"')
        console.log('  剩余文档数 =', await users.countDocuments())
    })
})().catch(fail)
