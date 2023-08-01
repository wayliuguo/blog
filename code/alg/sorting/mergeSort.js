function mergeSort(arr) {
    if (arr.length === 1) return arr
    const middle = Math.floor(arr.length / 2)
    const left = []
    const right = []
    for (let i = 0; i < arr.length; i++) {
        if (i < middle) {
            left.push(arr[i])
        } else {
            right.push(arr[i])
        }
    }
    return merge(mergeSort(left), mergeSort(right))
}

function merge(left, right) {
    let l = 0
    let r = 0
    const result = []
    while (l < left.length && r < right.length) {
        if (left[l] < right[r]) {
            result.push(left[l])
            l++
        } else {
            result.push(right[r])
            r++
        }
    }
    while (l < left.length) {
        result.push(left[l])
        l++
    }
    while (r < right.length) {
        result.push(right[r])
        r++
    }
    return result
}

let arr = [1, 3, 2, 5, 4]
console.log(mergeSort(arr)) // [1, 2, 3, 4, 5]
