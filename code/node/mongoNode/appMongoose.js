/* eslint-disable @typescript-eslint/no-var-requires */
const mongoose = require('mongoose')
mongoose.connect('mongodb://127.0.0.1:27017/myDB')

// 使用mongoose连接数据库
const db = mongoose.connection
// 当连接失败的时候
db.on('error', err => {
    console.log('MongoDB 数据库连接失败', err)
})
// 当连接成功的时候
db.once('open', function () {
    console.log('MongoDB 数据库连接成功')
    start()
})

// 定义 Schema
const userSchema = new mongoose.Schema({
    name: String,
    age: Number,
    info: {
        job: String,
        sport: Array
    }
})

// 创建数据模型
const users = mongoose.model('users', userSchema)

const start = async () => {
    try {
        // const user = new users({
        //     name: 'mike',
        //     age: 18,
        //     info: {
        //         job: 'player',
        //         sport: ['basketball']
        //     }
        // })
        // await user.save()
        const result = await users.find()
        console.log(result)
    } catch (error) {
        console.error(error.message)
    }
}




