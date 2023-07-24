global.name = 'liuguowei'
global.age = 18

// 函数调用模式
const sayName = function () {
    return this.name
}
console.log('函数调用模式:', sayName()) // 函数调用模式: liuguowei

// 方法调用模式
const nameObj = {
    name: 'well',
    sayName () {
        return this.name
    }
}
console.log('方法调用模式:', nameObj.sayName()) // 方法调用模式: well

// 构造器调用模式 
function AgeFun (age) {
    this.age = age
    this.sayAge = function () {
        return this.age
    }
} 
const ageInstance = new AgeFun(25)
console.log('构造器调用模式:', ageInstance.sayAge()) // 构造器调用模式: 25