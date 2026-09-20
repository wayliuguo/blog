export function calc(a, b) {
    return a + b
}

// 顶层副作用：模块被求值就会打印
console.log('lib 被求值')
