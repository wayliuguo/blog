Array.prototype.myPush = function (...args) {
    for (let i = 0; i < args.length; i++) {
        this[this.length] = args[i]
    }
    return this.length
}
const arr = [1, 2, 3]
const ret = arr.push(4, 5, 6)
console.log(ret) // 6
console.log(arr) // [ 1, 2, 3, 4, 5, 6 ]
