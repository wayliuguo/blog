function bubbleSort(arr) {
    for (let i = 0; i < arr.length; i++) {
        // 提前退出冒泡循环的标识位
        let flag = false
        for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
                flag = true
            }
        }
        if (!flag) break
    }
}

let arr = [1, 3, 2, 5, 4]
console.log(bubbleSort(arr)) // [1, 2, 3, 4, 5]
