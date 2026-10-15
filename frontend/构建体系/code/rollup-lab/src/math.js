export function add(a, b) {
    return a + b
}

export function mul(a, b) {
    return a * b
}

// 这个函数没人用 —— 看它会不会出现在产物里
export function unusedHelper() {
    return '不应该出现在最终产物'
}
