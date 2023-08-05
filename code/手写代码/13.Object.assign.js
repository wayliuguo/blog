Object.myAssign = function (target, ...source) {
    if (target === null) {
        throw new TypeError('error')
    }
    let ret = Object(target)
    source.forEach(obj => {
        if (obj !== null) {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    ret[key] = obj[key]
                }
            }
        }
    })
    return ret
}

let target = { a: 1 }
let object2 = { b: 2 }
let object3 = { c: 3 }
Object.myAssign(target, object2, object3)
console.log(target) // {a: 1, b: 2, c: 3}
