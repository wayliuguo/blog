// 12-transaction.js：多文档事务——扣库存与建订单必须同生共死
// 注意：多文档事务要求副本集（或分片集群），单机 mongod 起不来事务
// 运行： npm run tx
require('dotenv').config()
const mongoose = require('mongoose')

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mongo_demo'

const productSchema = new mongoose.Schema({ name: String, stock: Number, price: Number })
const orderSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    productId: mongoose.Schema.Types.ObjectId,
    amount: { type: Number, required: true } // 故意设成必填，用来演示事务回滚
})
const Product = mongoose.model('Product', productSchema)
const Order = mongoose.model('Order', orderSchema)

// 一次下单要改两个文档：扣库存 + 建订单，中途失败必须整笔撤销
async function buy(userId, productId, amount) {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        // 扣减库存
        await Product.updateOne({ _id: productId }, { $inc: { stock: -1 } }, { session })
        // 创建订单
        await Order.create([{ userId, productId, amount }], { session })

        await session.commitTransaction()
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
}

;(async () => {
    await mongoose.connect(uri)
    await Promise.all([Product.deleteMany({}), Order.deleteMany({})])

    const product = await Product.create({ name: '机械键盘', stock: 5, price: 399 })
    console.log('=== 初始状态 ===')
    console.log('  库存 =', product.stock, '，订单数 =', await Order.countDocuments())

    console.log('=== 分支一：正常下单（应 commit）===')
    await buy(new mongoose.Types.ObjectId(), product._id, 399)
    console.log('  库存 =', (await Product.findById(product._id)).stock, '，订单数 =', await Order.countDocuments())

    console.log('=== 分支二：订单缺金额（应 rollback）===')
    try {
        await buy(new mongoose.Types.ObjectId(), product._id, undefined)
    } catch (err) {
        console.log('  被校验拦住 →', err.name + '：' + (err.errors?.amount?.message || err.message))
    }
    console.log('  库存 =', (await Product.findById(product._id)).stock, '（没被多扣 1）')
    console.log('  订单数 =', await Order.countDocuments(), '（没多出一条脏订单）')
    console.log('')
    console.log('结论：会话把「扣库存 + 建订单」绑成一笔事务，中间任一步抛错就整体回滚')

    await mongoose.disconnect()
})().catch(async err => {
    console.error('运行失败：', err.message)
    console.error('（多文档事务需要副本集；单机 mongod 会直接拒绝事务，这是环境限制不是脚本问题）')
    await mongoose.disconnect()
    process.exit(1)
})
