// 04-mongoose-connect.js：Mongoose 连接数据库
// 原生驱动要自己 new MongoClient() 再 close()，Mongoose 帮我们管住这一个全局连接
// 运行： npm run mconnect
require('dotenv').config()
const mongoose = require('mongoose')

// 本地默认连 myapp 库；生产把连接串放到 .env 的 MONGO_URI 里
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/myapp'

mongoose
    .connect(uri)
    .then(() => console.log('MongoDB 连接成功'))
    .catch(err => console.error('连接失败', err))
    .finally(async () => {
        // connect() 是全局单例连接，脚本跑完要自己断开，否则进程不会退出
        console.log('')
        console.log('=== 连接状态 ===')
        console.log('  mongoose.connection.readyState =', mongoose.connection.readyState, '（1 = 已连接）')
        await mongoose.disconnect()
        console.log('  disconnect() 之后 readyState =', mongoose.connection.readyState, '（0 = 已断开）')
    })
