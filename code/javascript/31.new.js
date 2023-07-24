function objectFactory () {
    // 声明要创建的对象
    let newObject = null
    // 取出构造函数
    let constructor = Array.prototype.shift.call(arguments)
    console.log('constructor>>>', constructor) // constructor>>> [Function: Person]
    let result = null
    // 判断参数是否是函数
    if (typeof constructor !== 'function') {
        throw TypeError('error')
    }
    // 新建一个空对象，对象的原型为构造函数的 prototype 对象
    newObject = Object.create(constructor.prototype)
    console.log('newObject>>>', newObject) // newObject>>> Person {}
    // 将 this 指向新建对象，并指向函数
    result = constructor.apply(newObject, arguments)
    console.log('result>>>', result)
    console.log('newObject>>>', newObject) // newObject>>> Person { name: 'well', age: 18 }
    // 判断返回对象
    let flag = result && (typeof result === 'object' || typeof result === 'function')
    // 判断返回结果
    return flag ? result : newObject
}

function Person (name, age) {
    this.name = name
    this.age = age
}
const well = objectFactory(Person, 'well', 18)
console.log(well.name)