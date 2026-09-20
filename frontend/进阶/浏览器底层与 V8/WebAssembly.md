# WebAssembly

WebAssembly（wasm）是浏览器里的第四种「语言运行时」：一种可移植的二进制指令格式，由 V8（以及其他引擎）以接近原生的速度执行。这一篇从**手写字节码组装一个真实模块**开始，把它的能力边界（数字语义）和性能收益都变成可运行的实测。

## 一、wasm 是什么，不是什么

| | 是 | 不是 |
| --- | --- | --- |
| 形态 | 二进制指令格式（.wasm）+ 文本格式（.wat） | 更快的 JS |
| 执行 | 沙箱虚拟机，接近原生速度 | 替代 JS（它是被 JS 调度的协作者） |
| 类型 | i32/i64/f32/f64 等固定宽度数值 | 带垃圾回收的语言运行时（GC 提案进行中） |
| 来源 | C/C++/Rust 编译产物，或手工/工具组装 | —— |

> 提示：wasm 的心智模型是「**一个只能算数字的函数库**」——你把计算密集的内核编译成 wasm，JS 负责拿数据、调函数、收结果。它没有 DOM 访问权，一切与页面交互都要回到 JS。

## 二、手写字节码组装一个模块

wasm 二进制由「节（section）」构成：类型节声明函数签名、函数节声明函数、导出节暴露名字、代码节放指令。下面是一个 `sum(n)`（从 n 累加到 1）的**手工组装模块**——每个字节都有注释：

> 摘自 `./code/v8-lab/wasm.cjs`

```js
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
```

77 个字节，一个真实可调用的 wasm 函数——`WebAssembly.Module` 编译、`Instance` 实例化、`exports.sum` 就是普通 JS 函数。**wasm 与 JS 的互操作门槛比很多人想的低得多**。

## 三、数字语义：wasm 与 JS 的第一条分界线

wasm 里没有「JS 的 number」，只有固定宽度的整数与浮点。实测 `i32` 的溢出回绕：

> 摘自 `./code/v8-lab/wasm.cjs`

```js
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
```

同样算 `sum(1e6)`，JS 得到精确的 `500000500000`，wasm 得到回绕后的 `1784293664`——**跨过 2³¹ 这条线，两边答案就分道扬镳**。大整数要么用 `i64`（JS 侧变 BigInt）、要么在算法层分块。这是把计算交给 wasm 前必须想清楚的第一件事。

## 四、性能实测

同机同任务（累加 1 亿次）：

> 摘自 `./code/v8-lab/wasm.cjs`

```js
// 性能对比（同机同任务，仅打印参考值；1e8 时 wasm i32 回绕，只比耗时）
const N = 1e8
let t0 = process.hrtime.bigint()
const a = sum(N)
let t1 = process.hrtime.bigint()
const b = jsSum(N)
let t2 = process.hrtime.bigint()
console.log(`wasm sum(1e8) : ${Number(t1 - t0) / 1e6} ms → ${a}(i32 回绕)`)
console.log(`JS   sum(1e8) : ${Number(t2 - t1) / 1e6} ms → ${b}(double 精确)`)
```

实测输出：

> 摘自 `./code/v8-lab/wasm.cjs`

```js
console.log('\n探针三通过 ✓')
```

真实运行（Node 22 / V8 12.4）：**wasm 约 39ms，JS 约 145ms——循环密集型计算 3.7 倍差距**。差距来自：wasm 指令静态确定（无需类型反馈护城）、无去优化风险、值在寄存器里是真正的 32 位整数。

> 提示：不要期望 wasm 恒快。**调用边界有成本**——参数与返回值在 JS 数字与 wasm 类型之间转换，跨边界传递对象要复制到线性内存。任务太碎（每次只算几微秒）时，边界开销会吃掉全部收益。**一次跨边界调用要干足够多的活**。

## 五、适用场景与工程现状

| 适合 wasm | 留在 JS |
| --- | --- |
| 现成 C/C++/Rust 库（FFmpeg、SQLite、brotli） | DOM 操作、事件、业务逻辑 |
| 计算密集内核：编解码、图像处理、物理模拟 | 调用频繁但每次极轻的任务 |
| 需要确定性与沙箱的第三方代码 | 依赖 JS 生态/框架的一切 |

前端知名案例：Figma（C++ 渲染内核编译为 wasm）、Photoshop Web、Google Earth。工程路径上，绝大多数团队不手写字节码，而是：**Rust/C++ 源码 → wasm-pack / Emscripten 编译 → npm 包 → JS import**；本文手写字节码只为看清它的本质。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/v8-lab/wasm.cjs` | 手工组装 wasm 模块 + 语义与性能实测 | 二、三、四 |
| `./code/v8-lab/run.cjs` | 总入口（三探针按 flag 分子进程） | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[内存模型与 GC](./内存模型与%20GC.md)
- 官方资料：[WebAssembly 官网](https://webassembly.org/) · [MDN WebAssembly](https://developer.mozilla.org/zh-CN/docs/WebAssembly)
