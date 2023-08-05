function composeRight(...args) {
    return function (value) {
        let res = value
        for (let i = args.length - 1; i >= 0; i--) {
            res = args[i](res)
        }
        return res
    }
}
function composeRightReduce(...args) {
    return function (value) {
        // reduce:对数组中的每一个元素执行提供的函数，并汇总成单个结果
        return args.reverse().reduce(function (acc, fn) {
            return fn(acc)
        }, value) // 把value作为acc的初始值
    }
}

const reverse = arr => arr.reverse()
const first = arr => arr[0]
const toUpper = s => s.toUpperCase()

const f = composeRight(toUpper, first, reverse)
const fReduce = composeRightReduce(toUpper, first, reverse)
console.log(f(['one', 'two', 'three'])) // THREE
console.log(fReduce(['one', 'two', 'three'])) // THREE
