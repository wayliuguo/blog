Object.prototype.MyCreate = function (obj) {
    function F() {}
    F.prototype = obj
    return new F()
}

const personPrototype = {
    greeting() {
        console.log(`Hello, my name is ${this.name}.`)
    }
}
const john = Object.MyCreate(personPrototype)
john.name = 'John Doe'
john.greeting()
