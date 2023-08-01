function selectionSort(arr) {
    for (let i = 0; i < arr.length; i++) {
        let index = i
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[index] > arr[j]) {
                index = j
            }
        }
        if (index !== i) {
            ;[arr[index], arr[i]] = [arr[i], arr[index]]
        }
    }
    return arr
}

let arr = [1, 3, 2, 5, 4]
console.log(selectionSort(arr)) // [1, 2, 3, 4, 5]
