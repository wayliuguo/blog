// 13-read-preference.js：副本集与读写分离——readPreference 到底有几个合法值
// 第 1、2 节是配置写法；第 3 节不需要服务端：驱动在构造 MongoClient 时就会校验 readPreference 枚举
// 运行： npm run readpref
require('dotenv').config()
const { MongoClient } = require('mongodb')
const mongoose = require('mongoose')

// ---------- 1. 副本集连接串 ----------
// Node.js Mongoose 配置读写分离
const base = 'mongodb://primary:27017,secondary1:27017,secondary2:27017/myapp?' + 'replicaSet=rs0'
const uri = base + '&readPreference=secondaryPreferred'

// readPreference=secondaryPreferred → 优先读从节点，从节点不可用时读主节点
// readPreference=primaryPreferred → 优先读主节点
// readPreference=secondary         → 只读从节点（枚举里没有 secondaryOnly，见第 3 节）

console.log('=== 1. 连接串 ===')
console.log('  副本集连接串 =', uri)
console.log('  连接串里必须带 replicaSet=，否则驱动只当它是单个节点，读写分离不生效')

// ---------- 2. 交给 Mongoose ----------
console.log('=== 2. mongoose.connect ===')
// serverSelectionTimeoutMS 设小一点：本机没有这个副本集时快速失败，不至于卡住 30 秒
mongoose
    .connect(uri, { serverSelectionTimeoutMS: 3000 })
    .then(() => console.log('  副本集连接成功（本机若没起这个副本集，走的是失败分支）'))
    .catch(err => console.log('  连接失败：', err.message))
    .finally(async () => {
        // ---------- 3. 枚举校验：这一段不需要服务端 ----------
        console.log('=== 3. readPreference 的五个合法值 ===')
        const modes = [
            ['primary', '只读主节点（默认）'],
            ['primaryPreferred', '优先主节点，主不可用才读从'],
            ['secondary', '只读从节点'],
            ['secondaryPreferred', '优先从节点，从不可用才读主'],
            ['nearest', '读网络延迟最低的节点（可能是主，也可能是从）']
        ]
        for (const [mode, meaning] of modes) {
            const client = new MongoClient(base + '&readPreference=' + mode)
            console.log(
                '  ' + mode.padEnd(19),
                '→ 驱动接受，解析成',
                JSON.stringify(client.options.readPreference.mode),
                '：' + meaning
            )
            await client.close()
        }
        try {
            new MongoClient(base + '&readPreference=secondaryOnly')
        } catch (err) {
            console.log('  ' + 'secondaryOnly'.padEnd(19), '→ 抛错', err.name + ':', err.message)
            console.log('  所以"只读从节点"要写 secondary，不是 secondaryOnly')
        }

        console.log('')
        console.log('读请求路由：一致性要求高 → 读主；能容忍轻微延迟 / 分析报表 → 读从')
        await mongoose.disconnect()
    })
