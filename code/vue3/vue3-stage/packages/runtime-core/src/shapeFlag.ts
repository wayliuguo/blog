export const enum ShapeFlags {
    ELEMENT = 1,
    FUNCTIONAL_COMPONENT = 1 << 1, // 2
    STATEFUL_COMPONENT = 1 << 2, // 4
    TEXT_CHILDREN = 1 << 3, // 8
    ARRAY_CHILDREN = 1 << 4,
    SLOTS_CHILDREN = 1 << 5,
    TELEPORT = 1 << 6,
    SUSPENSE = 1 << 7,
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
    COMPONENT_KEPT_ALIVE = 1 << 9,
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}

// 位运算是前人总结出来做权限判断和类型的最佳实践

// 2 进制 一个字节由8个位组成 8个位最大都是1
// 00000001 1 * 2^0 = 1
// 00000010 1 * 2^1 + 0 * 2^0 = 2
// 00000100 1* 2^2 + 0 * 2^1 + 0 * 2^0 = 4

// 用位运算来做标识位
// 00000100 00000010 这两个二进制做 | 运算 (规则，相同位置有一个 1 就是 1，结果00000110), 即4 | 2 = 6， true
// 00000110 = component

// 00000100 & 00000110 这两个数做 & 运算（规则，相同位置全是1才是1，结果 00000100）
