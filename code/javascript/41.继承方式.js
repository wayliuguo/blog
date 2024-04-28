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
console.log(child2.info.balance) // 10000 */

// 原型式继承
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

function createObj(Parent) {
    // 接受的式一个实例对象，即Parent的实例对象parent
    function Child() {}
    Child.prototype = Parent
    return new Child()
}
const parent = new Parent()
const child1 = createObj(parent)
const child2 = createObj(parent)
console.log(child1.info.balance) // 10000
child1.useMoney(500)
// child1 花了500块
// child1 余额9500块
console.log(child2.info.balance) // 9500 */

// 寄生式继承
/* function object(Parent) {
    function Child(){}
    Child.prototype = Parent
    return new Child()
}
function createAnother(Parent) {
    let Child = object(Parent)
    Child.sayHi = function() {
        console.log('hi')
    }
    return Child
}
function Parent() {
    this.info = {
        balance: 10000
    }
}
const parent = new Parent()
const child = createAnother(parent)

console.log(child.info.balance) // 10000
child.sayHi() // hi */

// 寄生式组合继承
function Parent() {
    this.balance = 10000
}

Parent.prototype.useMoney = function (number) {
    this.balance -= number
    console.log(`花了${number}块`)
    console.log(`余额${this.balance}块`)
}

function Child() {
    Parent.call(this)
}

function object(o) {
    function F() {}
    F.prototype = o
    return new F()
}

function inheritPrototype(Child, Parent) {
    var prototype = object(Parent.prototype) // 创建一个prototype对象，prototype对象的原型对象为Parent.prototype
    prototype.constructor = Child // prototype对象的constructor指向Child
    Child.prototype = prototype // 将Child的原型对象替换成我们创建好的新的prototype对象
}

inheritPrototype(Child, Parent) // 继承

const child1 = new Child()
const child2 = new Child()
console.log(child1.balance) // 10000
child1.useMoney(500)
// 花了500块
// 余额9500块
console.log(child2.balance) // 10000
