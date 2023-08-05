Function.prototype.myBind = function (context, ...args) {
    context = context || window
    const fn = this
    return function Fn() {
        // 根据调用方式，传入不同绑定值
        return fn.apply(this instanceof Fn ? this : context, args.concat(...arguments))
    }
}

const foo = {
    a: 1,
    log(x, y) {
        console.log(this.a, x, y)
    }
}
const obj = {
    a: 10
}
foo.log.myBind(obj, 5, 6)() // 10, 5, 6
