function binarySearch(arr, target) {
    let left = 0
    let right = arr.length - 1
    while (left <= right) {
        let middle = Math.floor((left + right) / 2)
        if (arr[middle] === target) {
            return middle
        } else if (arr[middle] < target) {
            left = middle++
        } else {
            right = middle--
        }
    }
    return -1
}

const array = [2, 4, 6, 8, 10]
const targetElement = 2
console.log(binarySearch(array, targetElement))
