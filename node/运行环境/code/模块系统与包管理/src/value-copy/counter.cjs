// counter.cjs —— 被导入方：一个最朴素的 CommonJS 模块
// 这一段在演示：module.exports 里写的 count 只是导出那一刻的快照。
// 之后 inc() 改的是内部的局部变量，外界通过 require 拿到的 count 永远停在 0。
console.log('[counter.cjs] 模块体被执行')

let count = 0

module.exports = {
    count, // 快照：导出时就把 0 拷进了 exports 对象
    inc() {
        count += 1 // 改的是模块内部的局部变量
        return count
    },
    peek() {
        // 对外暴露一个「读内部真实值」的口子，用来证明内部确实变了，只是外部看不到
        return count
    }
}
