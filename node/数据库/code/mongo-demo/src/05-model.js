// 05-model.js：Schema 与 Model，以及 Model 上的 CRUD
// Schema 定义「文档长什么样、有哪些约束」，Model 是「操作这个集合的入口」
// 约束在客户端就可能拦住写入（required / 类型转换），unique 则要等索引建好
// 运行： npm run model
require('dotenv').config()
const mongoose = require('mongoose')

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mongo_demo'

// ---------- Schema 定义 ----------
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
    email: { type: String, unique: true },
    hobbies: [String],
    createdAt: { type: Date, default: Date.now }
})

// 创建 Model
const User = mongoose.model('User', userSchema)

;(async () => {
    await mongoose.connect(uri)
    await User.deleteMany({})
    await User.init() // 等 unique 索引真正建好，否则下面重复 email 拦不住

    // ---------- Model 上的 CRUD ----------
    console.log('=== 1. 创建 ===')
    // 创建
    const created = await User.create({ name: '张三', age: 25 })
    console.log('  create() → _id =', created._id.toString())
    console.log('  createdAt 由 default 填上 =', created.createdAt.toISOString(), '，hobbies 没传就是 undefined')

    console.log('=== 2. 查询 ===')
    // 查询
    const found = await User.find({ age: { $gt: 18 } })
    const byId = await User.findById(created._id)
    console.log('  find({ age: { $gt: 18 } }) →', found.length, '条：', found.map(u => u.name).join('、'))
    console.log('  findById(created._id) →', byId.name, '（拿到的是文档实例，可以直接取属性）')

    console.log('=== 3. 更新 ===')
    // 更新
    await User.updateOne({ _id: created._id }, { $set: { age: 26 } })
    console.log(
        '  更新后 age =',
        (await User.findById(created._id)).age,
        '（updateOne 不走 Schema 校验，默认值也不会补）'
    )

    console.log('=== 4. 删除 ===')
    // 删除
    await User.deleteOne({ _id: created._id })
    console.log('  删除后剩余 =', await User.countDocuments(), '条')

    console.log('=== 5. Schema 约束都在什么时候生效 ===')
    try {
        await User.create({ age: 30 })
    } catch (err) {
        console.log('  少传 required 字段 →', err.name + '：' + err.errors.name.message)
    }
    try {
        await User.create({ name: '李四', email: 'lisi@test.com' })
        await User.create({ name: '王五', email: 'lisi@test.com' })
    } catch (err) {
        console.log('  重复 email（unique）→ 由服务端唯一索引拦住，err.code =', err.code)
    }
    console.log('  age 没传时 default: 0 生效 →', (await User.findOne({ name: '李四' })).age)

    await mongoose.disconnect()
})().catch(async err => {
    console.error('运行失败：', err.message, '（请确认本机 mongod 已启动）')
    await mongoose.disconnect()
    process.exit(1)
})
