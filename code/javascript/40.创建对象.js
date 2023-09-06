// Object 构造函数
/* const Person = new Object()
Person.type = 1 */

// 字面量
/* const Person = {}
Person.type = 2 */

// 工厂模式
/* function createPerson(name, age, job) {
    var o = new Object()
    o.name = name
    o.age = age
    o.job = job
    o.sayName = function () {
        alert(this.name)
    }
    return o
}
const person = createPerson('Nike', 29, 'teacher')
console.log(person.age) */

// 构造函数
/* function Person(name, age, job) {
    this.name = name
    this.age = age
    this.job = job
}
const person = new Person('Nike', 29, 'teacher')
console.log(person.age) */

// 原型模式
/* function Person() {}
Person.prototype.name = 'Nike'
Person.prototype.age = 20
Person.prototype.job = 'teacher'
const person = new Person('Nike', 29, 'teacher')
console.log(person.age) */

// 构造函数与原型组合
function Person (name) {
    this.name = name
}
Person.prototype.sayName = function() {
    console.log(this.name)
}
const mike = new Person('mike')
mike.sayName()