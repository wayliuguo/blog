// 参数长度不固定
function currying(fn) {
    let args = []
    return function temp(...newArgs) {
        if (newArgs.length) {
            args = [...args, ...newArgs]
            return temp
        } else {
            let val = fn.apply(this, args)
            args = [] //保证再次调用时清空
            return val
        }
    }
}

function add(...args) {
    //求和
    return args.reduce((a, b) => a + b)
}
function getSum(a, b, c) {
    return a + b + c
}
let addCurry = currying(add)
let getSumCurry = currying(getSum)
console.log(addCurry(1)(2)(3)(4, 5)()) //15
console.log(addCurry(1)(2)(3, 4, 5)()) //15
console.log(addCurry(1)(2, 3, 4, 5)()) //15

console.log(getSumCurry(1, 2, 3)()) // 6
console.log(getSumCurry(1)(2)(3)()) // 6
console.log(getSumCurry(1, 2)(3)()) // 6
