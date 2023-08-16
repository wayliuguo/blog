const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://127.0.0.1:27017', {
    useUnifiedTopology: true
})

async function run() {
    try {
        // 开始连接
        await client.connect()
        const personDB = client.db('myDB')
        const usersCollection = personDB.collection('users')
        const ret = await usersCollection.find()
        console.log(await ret.toArray())
    } catch (err) {
        // 连接失败
        console.log('连接失败', err)
    } finally {
        // 关闭连接
        await client.close()
    }
}

run()
