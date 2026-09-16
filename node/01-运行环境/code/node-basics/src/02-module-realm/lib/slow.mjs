// lib/slow.mjs —— 与 slow.cjs 对应：同样在顶层忙等 300ms，但它是 ESM
// 这一段在演示：import() 发起加载之后，调用方不必停在原地等；
// 不过要注意，模块顶层代码一旦开始执行，依然同步占用主线程（见 10-sync-vs-async.mjs 的结论）。
const start = Date.now();
while (Date.now() - start < 300) {
    // 空转：持续占用 CPU，模拟一个昂贵的模块初始化
}
console.log('[slow.mjs] 顶层求值完成，忙等了约', Date.now() - start, 'ms');

export const tag = 'slow-esm';
