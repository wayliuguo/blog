const obj1 = {
    a: 1,
    b: { f: { g: 1 } },
    c: [1, 2, 3]
}
// JSON.stringfy
const obj2 = JSON.parse(JSON.stringify(obj1))
obj2.b.e = 2
console.log(obj1) // { a: 1, b: { f: { g: 1 } }, c: [ 1, 2, 3 ] }
console.log(obj2) // { a: 1, b: { f: { g: 1 }, e: 2 }, c: [ 1, 2, 3 ] }

// 深拷贝的实现
function deepCopy(object) {
    // 只拷贝对象
    if (!object || typeof object !== 'object') return
    // 根据object 的类型判断新建的是数组还是对象
    let newObject = Array.isArray(object) ? [] : {}
    // 遍历 object
    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            newObject[key] = typeof object[key] === 'object' ? deepCopy(object[key]) : object[key]
        }
    }
    return newObject
}
const obj3 = deepCopy(obj1)
obj3.b.f.g = 5
console.log(obj1) // { a: 1, b: { f: { g: 1 } }, c: [ 1, 2, 3 ] }
console.log(obj3) // { a: 1, b: { f: { g: 5 } }, c: [ 1, 2, 3 ] }
