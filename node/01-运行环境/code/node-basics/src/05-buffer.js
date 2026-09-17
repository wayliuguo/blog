// 05 Buffer：Node 处理二进制数据的桥梁（JS 字符串是 UTF-16，网络/文件里是字节）
// 对应文档《Buffer 与 Stream》→「Buffer 到底是什么」「十六进制与字符串互转」
//   「Buffer.alloc 与 Buffer.from 的区别」「字符长度 ≠ 字节长度：Content-Length 的坑」

// 1) Buffer 就是固定长度的字节序列，且是 Uint8Array 的子类
const buf1 = Buffer.from('hello')
console.log('=== 1) Buffer 是什么 ===')
console.log('  buf1.length =', buf1.length, '（创建时容量就定死，不能往后追加）')
console.log('  buf1 instanceof Uint8Array =', buf1 instanceof Uint8Array, '（能与 TypedArray 体系互操作）')

// 2) 同一段字节，换个"解读视角"得到不同结果；它是给人看的字符串，它是给机器搬的字节
console.log('\n=== 2) 十六进制与字符串互转 ===')
console.log('  console.log(buf1)            →', buf1, '（默认打印十六进制：68 65 6c 6c 6f 正好是 ASCII 的 h e l l o）')
console.log("  buf1.toString('hex')         →", buf1.toString('hex'))
console.log("  buf1.toString('utf8')        →", buf1.toString('utf8'))
console.log("  buf1.toString('base64')      →", buf1.toString('base64'), '（把二进制安全地塞进只认文本的协议）')

// 3) alloc 分配"清零的空白缓冲"，from 从"已有数据"编码而来
console.log('\n=== 3) Buffer.alloc 与 Buffer.from 的区别 ===')
const zeroed = Buffer.alloc(5)
console.log('  Buffer.alloc(5)     →', zeroed, '（已清零，适合当待填充的缓冲区）')
console.log("  Buffer.from('hello') →", Buffer.from('hello'), '（从已有数据编码而来，不清零）')
console.log('  安全提示：别用未清零的 new Buffer(size) 旧写法，它残留堆上的随机旧数据')

// 4) 字符长度 ≠ 字节长度：算 Content-Length 必须用字节数
console.log('\n=== 4) 字符长度 ≠ 字节长度 ===')
const buf2 = Buffer.from('你好')
console.log('  "你好".length        =', '你好'.length, '（JS 认为只有 2 个字符）')
console.log('  Buffer.from("你好").length =', buf2.length, '（UTF-8 下每个汉字 3 字节）')
console.log(
    '  字节长度 =',
    buf2.length,
    '，toString("utf8") =',
    buf2.toString('utf8'),
    '，toString("base64") =',
    buf2.toString('base64')
)
console.log('  中英混合："中文abc".length =', '中文abc'.length, '，字节数 =', Buffer.from('中文abc').length)
console.log('  Buffer.isBuffer(buf2) =', Buffer.isBuffer(buf2), '，Buffer.isBuffer("你好") =', Buffer.isBuffer('你好'))

// 打水桶类比：字符是“几桶水”，字节是“实际容量”。
// “你好”看起来是 2 桶水（2 个字符），但 UTF-8 倒进桶后每桶有 3 升，一共 6 升（6 字节）。
// 做分包协议、解析长度时，永远按「字节长度」算，别按字符串 length 算。
