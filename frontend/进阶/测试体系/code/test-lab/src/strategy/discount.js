// 被测源码：购物车折扣计算
// 刻意拆成两个文件，方便演示「mock 掉内部依赖」这种测实现细节的写法

export const VIP = { normal: 1, gold: 2, platinum: 3 }

export function discountRate(level, amount) {
    if (level === VIP.platinum) return 0.8
    if (level === VIP.gold && amount >= 200) return 0.85
    if (level === VIP.gold) return 0.9
    return 1
}
