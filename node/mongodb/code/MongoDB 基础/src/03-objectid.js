// 03-objectid.js：_id 与 ObjectId——主键为什么不用自增数字
// 本脚本不需要数据库：ObjectId 完全在客户端生成，插库只是把它存下来
// 运行： npm run objectid
const { ObjectId } = require('mongodb')

console.log('=== 1. 新生成一个 _id ===')
const id = new ObjectId()
console.log('  ObjectId =', id.toString())
console.log('  类型 =', id.constructor.name, '（BSON 类型，不是字符串）')

console.log('=== 2. 12 个字节里装了什么 ===')
const hex = id.toString()
console.log('  十六进制长度 =', hex.length, '位 =', hex.length / 2, '字节')
console.log('  前 4 字节 =', hex.slice(0, 8), '→ 时间戳', id.getTimestamp().toISOString())
console.log('  时间戳只精确到秒，同一秒内的并发插入靠后 8 字节区分')
console.log('  所以按 _id 排序 ≈ 按插入时间排序（这也是游标分页敢用 _id 当游标的原因）')

console.log('=== 3. 字符串与 ObjectId 互转 ===')
const restored = new ObjectId(id.toString())
console.log('  用字符串还原后 equals() =', restored.equals(id))
console.log('  存进 JSON 会变成字符串，取出来必须再 new ObjectId() 才能当 _id 用')

console.log('=== 4. 校验一个 _id 字符串 ===')
console.log('  ObjectId.isValid(24 位十六进制) =', ObjectId.isValid(hex))
console.log('  只认 24 位十六进制：/^[0-9a-f]{24}$/.test(hex) =', /^[0-9a-f]{24}$/.test(hex))
try {
    new ObjectId('abc')
} catch (err) {
    console.log('  new ObjectId("abc") 直接抛错 →', err.name + ':', err.message)
}
