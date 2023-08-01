var search = function (nums, target) {
    let left = 0
    let right = nums.length - 1
    while (left <= right) {
        let middle = Math.floor((left + right) / 2)
        if (nums[middle] === target) {
            return middle
        }
        // middle 在数组的左段
        if (nums[0] <= nums[middle]) {
            if (nums[0] <= target && target < nums[middle]) {
                right = middle - 1
            } else {
                left = middle + 1
            }
        } else {
            // middle 在数组的右段
            if (nums[middle] < target && target <= nums[nums.length - 1]) {
                left = middle + 1
            } else {
                right = middle - 1
            }
        }
    }
    return -1
}

const array = [6, 8, 10, 0, 1, 2, 3, 4, 5]
console.log(search(array, 6))
