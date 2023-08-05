let arr = [1, [2, [3, 4, 5]]]
// 递归实现
function flatten(arr) {
    let result = []
    for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
            result = result.concat(flatten(arr[i]))
        } else {
            result.push(arr[i])
        }
    }
    return result
}
console.log(flatten(arr)) // [ 1, 2, 3, 4, 5 ]

// 迭代实现
function flattenReduce(arr) {
    return arr.reduce((previousValue, currentValue) => {
        return previousValue.concat(Array.isArray(currentValue) ? flattenReduce(currentValue) : currentValue)
    }, [])
}
console.log(flattenReduce(arr)) // [ 1, 2, 3, 4, 5 ]

// 扩展运算符实现
function flattenExtension(arr) {
    while (arr.some(item => Array.isArray(item))) {
        arr = [].concat(...arr)
    }
    return arr
}
console.log(flattenExtension(arr)) // [ 1, 2, 3, 4, 5 ]

// split 和 toString
function flattenByString(arr) {
    return arr.toString().split(',')
}
console.log(flattenByString(arr)) // [ '1', '2', '3', '4', '5' ]

// ES6 flat
console.log(arr.flat(Infinity)) // [ 1, 2, 3, 4, 5 ]
