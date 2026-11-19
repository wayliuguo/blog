// counter.mjs —— 被导入方：一个最朴素的 ES Module
// 这一段在演示：export 导出的是「活绑定」，count 与模块内部是同一个绑定。
export let count = 0

export function inc() {
    count += 1
    return count
}
