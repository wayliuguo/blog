Array.prototype.myFilter = function (fn) {
    if (typeof fn !== 'function') {
        throw TypeError('参数必须是一个函数')
    }
    let res = []
    for (let i = 0; i < this.length; i++) {
        fn(this[i]) && res.push(this[i])
    }
    return res
}

const arr = [1, 2, 3, 4, 5, 6]
console.log(arr.myFilter(item => item > 3)) // [ 4, 5, 6 ]
