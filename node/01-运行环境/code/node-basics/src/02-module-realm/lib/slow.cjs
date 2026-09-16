// lib/slow.cjs —— 故意在模块顶层"忙等"300ms，模拟一个加载很慢的 CommonJS 模块
// 这一段在演示：CommonJS 的 require 是同步的，对方模块的顶层代码没跑完，require 就不会返回，
// 这期间主线程被彻底占住（不是"等待 I/O"那种可以让出执行权的等待）。
const start = Date.now();
while (Date.now() - start < 300) {
    // 空转：持续占用 CPU，模拟一个昂贵的模块初始化
}
console.log('[slow.cjs] 顶层求值完成，忙等了约', Date.now() - start, 'ms');

module.exports = { tag: 'slow-cjs' };
