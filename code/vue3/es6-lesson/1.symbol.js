let s1 = Symbol('well')
let s2 = Symbol('well')
let obj = {
    name: 'liuguowei',
    age: 18,
    [s1]: 'ok'
}

// symbol 是唯一的
console.log(s1 === s2) // false

// 如果一个对象的key的 symbol 的，只能使用Reflect.ownKeys 才能获取
console.log(Object.keys(obj)) // [ 'name', 'age' ]
console.log(Reflect.ownKeys(obj)) // [ 'name', 'age', Symbol(well) ]

const fn = (a, b) => {
    console.log('fn', a, b)
}
fn.apply = function () {
    console.log('apply')
}
// 调用函数本身的apply方法如何调用？
fn.apply() // apply
// 让apply方法中的this指向fn，并让apply方法执行 fn.apply(null, [1,2])
Function.prototype.apply.call(fn, null, [1, 2])
// 使用 Reflect
Reflect.apply(fn, null, [1, 2])

// Symbol.for 定义取值
let s3 = Symbol.for('liuguowei') // 声明全新的
let s4 = Symbol.for('liuguowei') // 把之前声明的拿过来用
console.log(s3 === s4) // true
