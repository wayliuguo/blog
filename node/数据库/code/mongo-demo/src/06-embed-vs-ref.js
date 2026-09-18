// 06-embed-vs-ref.js：嵌入 vs 引用——两种文档关系建模的取舍
// 嵌入：一次查询就拿全，但有冗余，且受单文档 16MB 上限约束
// 引用：只存对方 _id，省空间、一致性由引用保证，读的时候要 populate（多一次查询）
// 运行： npm run embed
require('dotenv').config()
const mongoose = require('mongoose')

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mongo_demo'

// ---------- 方案一：嵌入（Embedding） ----------
// 将地址直接嵌入用户文档
const userSchema = new mongoose.Schema({
    name: String,
    address: {
        city: String,
        street: String,
        zip: String
    }
})
const User = mongoose.model('User', userSchema)

// ---------- 方案二：引用（Reference） ----------
// 订单引用用户 ID
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    total: Number,
    items: [String]
})
const Order = mongoose.model('Order', orderSchema)

;(async () => {
    await mongoose.connect(uri)
    await Promise.all([User.deleteMany({}), Order.deleteMany({})])

    console.log('=== 1. 嵌入：一次查询拿全 ===')
    const user = await User.create({ name: '张三', address: { city: '北京', street: '长安街', zip: '100000' } })
    const embedded = await User.findOne({ name: '张三' })
    console.log('  查询次数 1：address.city =', embedded.address.city, '（地址和用户在同一条文档里）')

    console.log('=== 2. 引用：先拿订单，再补用户，共 2 次查询 ===')
    const order = await Order.create({ userId: user._id, total: 99, items: ['可乐'] })
    const raw = await Order.findOne({ _id: order._id })
    console.log('  order.userId 只是个 ObjectId：', raw.userId.toString())
    const owner = await User.findById(raw.userId)
    console.log('  再查一次才拿到名字：', owner.name, '（这一步就是文档型数据库里的"JOIN"）')

    console.log('=== 3. populate：让驱动替我们发这第二次查询 ===')
    // 查询时 populate
    const orders = await Order.find().populate('userId')
    console.log('  populate 之后 userId 已经是文档：', orders[0].userId.name, '，total =', orders[0].total)
    console.log('  populate 的本质还是"再查一次"：它省的是代码，不是查询次数')

    console.log('')
    console.log('怎么选：数据总是一起查、不单独变化、量小 → 嵌入；独立变化、量大、需要单独查 → 引用')

    await mongoose.disconnect()
})().catch(async err => {
    console.error('运行失败：', err.message, '（请确认本机 mongod 已启动）')
    await mongoose.disconnect()
    process.exit(1)
})
