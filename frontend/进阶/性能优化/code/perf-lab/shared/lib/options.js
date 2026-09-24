/**
 * 实验台开关
 * 总开关写在 HTML 入口里：index.html 设 window.__PERF_OPT = true（优化后），raw.html 设 false（优化前）
 * 单项开关可以单独覆盖总开关，用来做「只改一项」的对照：
 *   ?virtual=0      → 优化后入口里只关掉虚拟滚动
 *   ?split=1        → 优化前入口里单独打开路由级分割（看它一项能拿多少）
 */
export const q = new URLSearchParams(location.search)
export const OPTIMIZED = window.__PERF_OPT === true

/** 没显式写这个开关时，跟着入口的总开关走 */
export function flag(key, whenOptimized) {
    if (q.has(key)) return q.get(key) !== '0'
    return OPTIMIZED ? whenOptimized : false
}

/** 列表条数，默认 2000 条 */
export const N = Number(q.get('n') || 2000)

/** 行高，虚拟滚动按它算偏移 */
export const ROW_H = 36
