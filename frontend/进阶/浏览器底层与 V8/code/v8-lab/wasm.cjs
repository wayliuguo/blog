// 探针三：手写字节码组装一个 wasm 模块，与 JS 实现做正确性与性能对比
// 模块源（wat）：(func (export "sum") (param i32) (result i32)
//   (local i32)  block  loop  …n 不为 0 就累加并自减…  end end  local.get 1)
const assert = require('node:assert')

// 手工组装的 wasm 二进制（魔数 00 61 73 6d + 版本 1 + 类型/函数/导出/代码四节）
const bytes = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // 魔数 + 版本
  0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f, // 类型节：(i32)->(i32)
  0x03, 0x02, 0x01, 0x00, // 函数节：1 个函数，用类型 0
  0x07, 0x07, 0x01, 0x03, 0x73, 0x75, 0x6d, 0x00, 0x00, // 导出节："sum"
  0x0a, 0x23, 0x01, 0x21, // 代码节：1 个函数体，33 字节
  0x01, 0x01, 0x7f, // 局部变量：1 个 i32（累加器 s）
  0x02, 0x40, // block
  0x03, 0x40, //   loop
  0x20, 0x00, 0x45, 0x0d, 0x01, //   local.get 0 · i32.eqz · br_if 1（n==0 退出）
  0x20, 0x01, 0x20, 0x00, 0x6a, 0x21, 0x01, //   s += n
  0x20, 0x00, 0x41, 0x01, 0x6b, 0x21, 0x00, //   n -= 1
  0x0c, 0x00, //   br 0（回到 loop）
  0x0b, 0x0b, // end loop · end block
  0x20, 0x01, 0x0b, // local.get 1 · end（返回 s）
])
const { sum } = new WebAssembly.Instance(new WebAssembly.Module(bytes)).exports

// 正确性：wasm 是 i32 语义——50000*60001/2=18 亿内不回绕
function jsSum(n) {
  let s = 0
  while (n > 0) { s += n; n-- }
  return s
}
assert.equal(sum(10), 55)
assert.equal(sum(60000), 1800030000) // n(n+1)/2，未超 i32 上限
assert.equal(sum(60000), jsSum(60000))
assert.equal(sum(1e6), 1784293664) // 超 2^31-1 → i32 回绕（JS 数字不会）
assert.notEqual(sum(1e6), jsSum(1e6)) // 这正是两种数字语义的分界线

// 性能对比（同机同任务，仅打印参考值；1e8 时 wasm i32 回绕，只比耗时）
const N = 1e8
let t0 = process.hrtime.bigint()
const a = sum(N)
let t1 = process.hrtime.bigint()
const b = jsSum(N)
let t2 = process.hrtime.bigint()
console.log(`wasm sum(1e8) : ${Number(t1 - t0) / 1e6} ms → ${a}(i32 回绕)`)
console.log(`JS   sum(1e8) : ${Number(t2 - t1) / 1e6} ms → ${b}(double 精确)`)
console.log('\n探针三通过 ✓')
