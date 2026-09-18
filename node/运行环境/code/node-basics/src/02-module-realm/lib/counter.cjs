// lib/counter.cjs —— CommonJS 风格的计数器（给 03-cjs-value-vs-esm-binding.mjs 做对照用）
// 这一段在演示：CommonJS 导出的是「值的拷贝」。
// 注意 count 是模块内部的局部变量，module.exports 里写的 count 只是导出那一刻的快照。
// 之后 increase() 改的是内部的那个 count，外界通过 require 拿到的 count 永远停在 0。
console.log('[counter.cjs] 模块体被执行（同一个进程里只会看到一次，除非手动清缓存）')

let count = 0

module.exports = {
    count, // 快照：导出时就把 0 拷进了 exports 对象
    increase() {
        count += 1 // 改的是模块内部的局部变量
        return count
    },
    peek() {
        // 对外暴露一个「读内部真实值」的口子，用来证明内部确实变了，只是外部看不到
        return count
    }
}
