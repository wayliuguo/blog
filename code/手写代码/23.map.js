Array.prototype.myMap = function (fn) {
    if (typeof fn !== 'function') {
        throw TypeError('参数必须是一个函数')
    }
    const res = []
    for (let i = 0; i < this.length; i++) {
        res.push(fn(this[i]))
    }
    return res
}

const arr = [1, 2, 3, 4, 5, 6]
console.log(arr.myMap(item => item * item)) // [ 1, 4, 9, 16, 25, 36 ]
