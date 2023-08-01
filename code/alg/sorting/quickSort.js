function quickSort(arr) {
    // 如果长度小于等于1直接返回数组
    if (arr.length <= 1) return arr
    const left = []
    const right = []
    const middleIndex = Math.floor(arr.length / 2)
    const middleValue = arr[middleIndex]
    for (let i = 0; i < arr.length; i++) {
        // 跳过中间下标
        if (i === middleIndex) continue
        if (arr[i] < middleValue) {
            left.push(arr[i])
        } else {
            right.push(arr[i])
        }
    }
    return quickSort(left).concat(middleValue, quickSort(right))
}

let arr = [1, 3, 2, 5, 4]
console.log(quickSort(arr)) // [1, 2, 3, 4, 5]
