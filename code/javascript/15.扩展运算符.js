// 对象的扩展运算符
let bar = {
    a: 1,
    b: 2
}
console.log({...bar}) // { a: 1, b: 2 }

// 数组的扩展运算符
const arr = [1,2,3]
console.log(...arr) // 1,2,3
// 作用——复制数组
const arrCopy = [...arr]
console.log(arrCopy) // [ 1, 2, 3 ]
// 作用——合并数组
const arr1 = ['one', 'two', ...arr]
console.log(arr1) // [ 'one', 'two', 1, 2, 3 ]
// 与解构赋值结合，用于生成数组
const [first, ...rest] = arr1
console.log(first) // one
console.log(rest) // [ 'two', 1, 2, 3 ]
