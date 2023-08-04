var firstMissingPositive = function (nums) {
    let arr = []
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] > 0) {
            arr[nums[i]] = nums[i]
        }
    }
    for (let j = 1; j < arr.length; j++) {
        if (!arr[j]) {
            return j
        }
    }
    return arr.length ? arr[arr.length - 1] + 1 : 1
}
const array = [0]
console.log(firstMissingPositive(array))
