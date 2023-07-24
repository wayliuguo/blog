/**
 * obj: 源对象
 * setBind: set回调
 * getLogger: get 回调
 */
let onWatch = (obj, setBind, getLogger) => {
    let handler = {
        set (target, property, value, receiver) {
            setBind(target, property, value, receiver)
            return Reflect.set(target, property, value)
        },
        get (target, property, receiver) {
            getLogger(target, property, receiver)
            return Reflect.get(target, property, receiver)
        }
    }
    return new Proxy(obj, handler)
}

let obj = {
    a: 1
}
let p = onWatch(
    obj,
    (target, property, value, receiver) => {
        console.log(target, property, value, receiver) // { a: 1 } a 2 { a: 1 }
    },
    (target, property, receiver) => {
       console.log(target, property, receiver) // { a: 2 } a { a: 2 }
    }
)

p.a = 2
p.a