## 长度最小的子数组
### 题目
给定一个含有 n 个正整数的数组和一个正整数 target 。

找出该数组中满足其总和大于等于 target 的长度最小的 连续子数组 [numsl, numsl+1, ..., numsr-1, numsr] ，并返回其长度。如果不存在符合条件的子数组，返回 0 。
```
输入：target = 7, nums = [2,3,1,2,4,3]
输出：2
解释：子数组 [4,3] 是该条件下的长度最小的子数组。

输入：target = 4, nums = [1,4,4]
输出：1

输入：target = 11, nums = [1,1,1,1,1,1,1,1]
输出：0
```
### 思想
1. 暴力法
   - 枚举确定开始下标 i，从下标开始往后查找找到从i-j中大于等于 target的下标，得到 j-i+1 即为长度
   - 取这些长度的最小值即可
    ```
    var minSubArrayLen = function(target, nums) {
        let result = 0
        for (let i=0; i<nums.length; i++) {
            let sum = 0
            for (let j=i; j<nums.length; j++) {
                sum += nums[j]
                if (sum >= target) {
                    result = result ? Math.min(result, j - i + 1) : j - i + 1
                }
            }
        }
        return result
    };
    ```
2. 前缀和 + 二分查找
3. 滑动窗口（重点）