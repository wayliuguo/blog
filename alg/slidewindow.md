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
   - 收集好下标对应的前缀和数组
   - 遍历并找到当前下标对应的endValue,因为从前缀和中取当前下标后加起来的值需大于目标值
    ```
    var minSubArrayLen = function (target, nums) {
        const n = nums.length
        let ans = 0
        // 前缀和, 如sums[i] = nums[i-1]+...nums[0]
        const sums = [0]
        for (let i = 1; i <= n; i++) {
            sums[i] = sums[i - 1] + nums[i - 1]
        }
        // 利用前缀和二分查找
        for (let i = 1; i <= n; i++) {
            // endValue: 当前下标前缀和+target，因为后续取值是从前缀和中取
            let endValue = sums[i - 1] + target
            let bound = binarySearch(sums, i, n, endValue)
            if (bound !== -1) {
                ans = ans ? Math.min(ans, bound - (i - 1)) : bound - (i - 1)
            }
        }
        return ans
    }

    function binarySearch(sums, l, r, target) {
        while (l < r) {
            let mid = Math.floor((l + r) / 2)
            if (sums[mid] < target) {
                l = mid + 1
            } else {
                r = mid
            }
        }
        return sums[l] >= target ? l : -1
    }

    ```
3. 滑动窗口（重点）
   - 定义滑动窗口的开始`start`和结束`end`位置
   - 维护变量`sum`存储`nums[start]`到`nums[end]`的和
   - 初始状态下`start`和`end`的值都是0，`sum`也是0
   - 每一轮迭代，当`sum[end]`小于`sum`，`end`指针右移
   - 每一轮迭代，当`sum[end]`加到大于等于`sum`
     - 更新`end`和`start`的间隔最小值
     - `start` 指针右移，更新 `sum`的值为减去 `nums[start]`
    ```
    var minSubArrayLen = function(target, nums) {
        const n = nums.length
        let ans = 0
        let start = 0
        let end = 0
        let sum = 0
        while(end<n) {
            sum += nums[end]
            while(sum >= target) {
            ans = ans ? Math.min(ans, end-start+1) : end-start+1
            sum -= nums[start]
            start++
            }
            end++
        }
        return ans
    };
    ```
## 