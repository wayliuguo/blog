const weakmap = new WeakMap()
const a = {
    a: 1
}
const b = {
    b: 2
}
weakmap.set(a, 1).set(b, 2)
console.log(weakmap) // WeakMap { <items unknown> }
console.log(weakmap.get(a)) // 1
console.log(weakmap.has(a)) // true
weakmap.delete(a)
console.log(weakmap.has(a)) // false
