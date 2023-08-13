// alloc
const buf1 = Buffer.alloc(5, 'abc', 'utf-8')
console.log(buf1) // <Buffer 61 62 63 61 62>
// allocUnsafe
const buf2 = Buffer.allocUnsafe(5)
buf2.fill('abc')
console.log(buf2) // <Buffer 61 62 63 61 62>
// from
const buf3 = Buffer.from('abc', 'utf-8')
console.log(buf3) // <Buffer 61 62 63>

// fill
const bufFill = Buffer.alloc(6)
bufFill.fill('abc')
console.log(bufFill) // <Buffer 61 62 63 61 62 63>
// write
const bufWrite = Buffer.alloc(10)
bufWrite.write('hello', 0, 5, 'utf-8')
console.log(bufWrite) // <Buffer 68 65 6c 6c 6f 00 00 00 00 00>
// slice
const bufSlice = Buffer.from('hello', 'utf-8').slice(1, 4)
console.log(bufSlice) // <Buffer 65 6c 6c>
// indexOf
console.log(Buffer.from('hello', 'utf8').indexOf('e')) // 1
// copy
const bufCopy1 = Buffer.alloc(5)
const bufCopy2 = Buffer.from('hello', 'utf-8')
bufCopy2.copy(bufCopy1)
console.log(bufCopy1) // <Buffer 68 65 6c 6c 6f>
// toString
console.log(Buffer.from('liuguowei', 'utf-8').toString()) // liuguowei
