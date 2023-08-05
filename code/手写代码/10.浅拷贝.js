// Object.assign()
let target = { a: 1 }
let object2 = { b: 2 }
let object3 = { c: 3 }
Object.assign(target, object2, object3)
console.log(target) // {a: 1, b: 2, c: 3}

// 扩展运算符
let obj4 = { a: 1, b: { c: 1 } }
let obj5 = { ...obj4 } // { a: 1, b: { c: 1 } }
console.log(obj5)

// 数组方法实现数组浅拷贝
// Array.prototype.slice
let arr = [1, 2, 3, 4]
console.log(arr.slice()) // [1,2,3,4]
console.log(arr.slice() === arr) //false
// Array.prototype.concat
let arr2 = [1, 2, 3, 4]
console.log(arr2.concat()) // [1,2,3,4]
console.log(arr2.concat() === arr) //false

// 浅拷贝的实现
function shallowCopy(object) {
    // 只拷贝对象
    if (!object || typeof object !== 'object') return
    // 根据object 的类型判断新建的是数组还是对象
    let newObject = Array.isArray(object) ? [] : {}
    // 遍历object，判断是object的属性才拷贝
    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            newObject[key] = object[key]
        }
    }
    return newObject
}
const myObject = [1, 2, 3, 4, 5]
const newShallowObject = shallowCopy(myObject)
console.log(newShallowObject) // [ 1, 2, 3, 4, 5 ]
