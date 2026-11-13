// 输入：节流时间窗（ms）
// 输出：指纹放行判定函数（同指纹窗口内只放第一条）
// 过程：Map 记录指纹上次放行时刻，窗口内命中直接拒绝；每 10s 清一次过期指纹防泄漏
export function createThrottle(windowMs) {
    const seen = new Map()
    let lastSweep = 0
    return fingerprint => {
        const now = Date.now()
        const prev = seen.get(fingerprint)
        if (prev !== undefined && now - prev < windowMs) return false
        seen.set(fingerprint, now)
        // 定期清理过期指纹：Map 不清理就是内存泄漏，一页几百个指纹足够撑很久
        if (now - lastSweep > 10000) {
            for (const [key, at] of seen) {
                if (now - at > windowMs) seen.delete(key)
            }
            lastSweep = now
        }
        return true
    }
}
