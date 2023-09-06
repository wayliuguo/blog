/* // 原型继承
function Parent() {
    this.info = {
        balance: 10000
    }
}
Parent.prototype.useMoney = function (number) {
    this.info.balance -= number
    console.log(`花了${number}块`)
    console.log(`余额${this.info.balance}块`)
}
function Child() {}

Child.prototype = new Parent()
const child1 = new Child()
const child2 = new Child()
console.log(child1.info.balance) // 10000
child1.useMoney(500)
// child1 花了500块
// child1 余额9500块
console.log(child2.info.balance) // child2 也只剩9500 */

// 盗用构造函数继承
/* function Parent() {
    this.info = {
        balance: 10000
    }
}
Parent.prototype.useMoney = function (number) {
    this.info.balance -= number
    console.log(`花了${number}块`)
    console.log(`余额${this.info.balance}块`)
}
function Child() {
    Parent.call(this)
}

const child1 = new Child()
console.log(child1.info.balance) // 10000
child1.useMoney(500) // 报错 */

// 组合继承
function Parent() {
    this.info = {
        balance: 10000
    }
}
Parent.prototype.useMoney = function (number) {
    this.info.balance -= number
    console.log(`花了${number}块`)
    console.log(`余额${this.info.balance}块`)
}
function Child() {
    Parent.call(this)
}
Child.prototype = new Parent()
// 更正 Child 原型对象的构造函数，不加则为 Parent
Child.prototype.constructor = Child

Child.prototype = new Parent()
const child1 = new Child()
const child2 = new Child()
console.log(child1.info.balance) // 10000
child1.useMoney(500)
// child1 花了500块
// child1 余额9500块
console.log(child2.info.balance) // 10000
