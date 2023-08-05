Function.prototype.MyApply = function (context, ...args) {
    context = context || window
    context.fn = this
    const result = context.fn(...args)
    delete context.fn
    return result
}

const Person = {
    name: 'well'
}
function sayName(age) {
    return `name:${this.name},age:${age}`
}
console.log(sayName.MyApply(Person, [18]))
