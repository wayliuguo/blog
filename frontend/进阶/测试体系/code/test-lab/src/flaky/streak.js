// 被测源码：跨天判断 + 一个共享的模块级集合（用来复现"用例之间串味"）

export function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

// 同一件事的另一种写法：只认 UTC，不受运行环境的时区影响
export function isSameDayUtc(a, b) {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate()
    )
}

export function signInStreak(lastSignIn, now) {
    if (!lastSignIn) return 1
    if (isSameDay(lastSignIn, now)) return 0 // 今天已签到
    const diffDays = (now - lastSignIn) / 86400000
    return diffDays < 2 ? 1 : 0 // 断签则重新开始
}

const visited = []

export function markVisited(path) {
    visited.push(path)
    return visited.length
}

export function visitCount() {
    return visited.length
}
