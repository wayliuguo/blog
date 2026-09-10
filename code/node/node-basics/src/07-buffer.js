// 07 Buffer：Node 处理二进制数据的桥梁（JS 字符串是 UTF-16，网络/文件里是字节）
const buf1 = Buffer.from('hello');
const buf2 = Buffer.from('你好');

console.log('Buffer.from("hello"):');
console.log('  字符长度 "hello".length =', 'hello'.length);
console.log('  字节长度 =', buf1.length, '（英文 1 字符 = 1 字节）');
console.log('  toString("base64") =', buf1.toString('base64'));

console.log('\nBuffer.from("你好"):');
console.log('  字符长度 "你好".length =', '你好'.length, '（JS 认为只有 2 个字符）');
console.log('  字节长度 =', buf2.length, '（UTF-8 下每个汉字 3 字节，共 6 字节）');
console.log('  toString("utf8")    =', buf2.toString('utf8'));
console.log('  toString("base64")  =', buf2.toString('base64'));

console.log('\nBuffer.isBuffer 判断:');
console.log('  Buffer.isBuffer(buf2)  =', Buffer.isBuffer(buf2));
console.log('  Buffer.isBuffer("你好") =', Buffer.isBuffer('你好'));

// 打水桶类比：字符是“几桶水”，字节是“实际容量”。
// “你好”看起来是 2 桶水（2 个字符），但 UTF-8 倒进桶后每桶有 3 升，一共 6 升（6 字节）。
// 做分包协议、解析长度时，永远按「字节长度」算，别按字符串 length 算。
