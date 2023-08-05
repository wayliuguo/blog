// 参数长度固定
function curry(func) {
    return function curriedFn(...args) {
        // 使用剩余参数接收实参
        //  如果实参小于形参，递归执行(func.length: 传入函数的参数长度)
        if (args.length < func.length) {
            return function () {
                // argument 是再次调用的实参，需转换为数组然后拼接之前转为参数
                return curriedFn(...[...args, ...arguments])
            }
        }
        // 如果实参等于形参直接执行
        return func(...args)
    }
}

function getSum(a, b, c) {
    return a + b + c
}
const curried = curry(getSum)
console.log(curried(1, 2, 3)) // 6
console.log(curried(1)(2)(3)) // 6
console.log(curried(1, 2)(3)) // 6
