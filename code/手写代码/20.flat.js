function _flat(arr, depth) {
    if (!Array.isArray(arr) || depth <= 0) {
        return arr
    }
    return arr.reduce((previousVal, currentVal) => {
        if (Array.isArray(currentVal)) {
            return previousVal.concat(_flat(currentVal, depth - 1))
        } else {
            return previousVal.concat(currentVal)
        }
    }, [])
}

let arr = [1, [2, [3, 4, 5]]]
console.log(_flat(arr, 1)) // [ 1, 2, [ 3, 4, 5 ] ]
console.log(arr.flat(1)) // [ 1, 2, [ 3, 4, 5 ] ]
