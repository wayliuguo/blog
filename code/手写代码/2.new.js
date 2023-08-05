function objectFactory(constructor, ...args) {
    // 设置原型，将对象的原型设置为函数的 prototype 对象
    const obj = Object.create(constructor.prototype)
    // 将 this 指向新建对象，并执行函数
    const result = constructor.apply(obj, args)
    return typeof result === 'object' && result !== null ? result : obj
}

function Person(name) {
    this.name = name
}
const well = objectFactory(Person, 'well')
console.log(well.name)
