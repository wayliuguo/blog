function getType(value) {
    // 如果是null则返回
    if (value === null) {
        return value + ''
    }
    // 如果是数组、对象
    if (typeof value === 'object') {
        // [object Array]
        let valueClass = Object.prototype.toString.call(value)
        let type = valueClass.split(' ')[1].split('')
        type.pop()
        // ['A', 'r', 'r', 'a', 'y']
        return type.join('').toLowerCase()
    } else {
        return typeof value
    }
}

console.log(getType([])) // array
console.log(getType(2)) // number
