/**
 * SPA 实验页的开关
 * opt=1 表示「这一版是优化后的」，单个开关可以单独覆盖：
 *   ?opt=1                  → 所有优化全开
 *   ?opt=1&virtual=0        → 只关掉虚拟滚动（做单项对照）
 *   ?split=1                → 不开总开关，只开路由级代码分割
 */
export const q = new URLSearchParams(location.search)
export const OPTIMIZED = q.get('opt') === '1'

/** 没显式写这个开关时，跟着 opt 走 */
export function flag(key, whenOptimized) {
    if (q.has(key)) return q.get(key) !== '0'
    return OPTIMIZED ? whenOptimized : false
}

/** 列表条数，默认 2000 条 */
export const N = Number(q.get('n') || 2000)

/** 行高，虚拟滚动按它算偏移 */
export const ROW_H = 36
