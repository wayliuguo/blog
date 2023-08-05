const array = [1, 2, 3, 5, 1, 5, 9, 1, 2, 8]

// Array.from(new Set(arr))
console.log(Array.from(new Set(array))) // [ 1, 2, 3, 5, 9, 8 ]

// map
function uniqueArray(arr) {
    let map = new Map()
    let res = []
    for (let i = 0; i < arr.length; i++) {
        if (!map.has(arr[i])) {
            map.set(arr[i], 1)
            res.push(arr[i])
        }
    }
    return res
}
console.log(uniqueArray(array)) // [ 1, 2, 3, 5, 9, 8 ]
