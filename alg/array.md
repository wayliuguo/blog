## 两数之和
### 题目
给定一个整数数组 `nums` 和一个整数目标值 `target`，请你在该数组中找出 **和为目标值** *`target`* 的那 **两个** 整数，并返回它们的数组下标。
```
输入：nums = [2,7,11,15], target = 9
输出：[0,1]
解释：因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。
```

### 思路

构造一个`map`, 将遍历的数字作为key，下标作为值

```
var twoSum = function(nums, target) {
    const map = new Map()
    for (let i=0; i<nums.length; i++) {
        if (map.has(target - nums[i])) {
            return [map.get(target - nums[i]), i]
        } else {
            map.set(nums[i], i)
        }
    }
};
```

## 三数之和

### 题目

给定一个包含 `n` 个整数的数组`nums`，判断 `nums` 中是否存在三个元素`a，b，c` ，使得 `a + b + c = 0 ？`找出所有满足条件且不重复的三元组。

注意：答案中不可以包含重复的三元组。

```js
例如, 给定数组 nums = [-1, 0, 1, 2, -1, -4]，

满足要求的三元组集合为：
[
  [-1, 0, 1],
  [-1, -1, 2]
]
```

### 思路

- 利用排序+双指针
- 先固定一个，剩余的前后作为前指针和后指针向中间移动

```
var threeSum = function(nums) {
    let result = []
    nums = nums.sort((a,b) => a - b)
    for (let i=0; i<nums.length-2; i++) {
        // 如果全部大于0则结束
        if (nums[i] > 0) break
        // 过滤当前和前一个一样
        if (i>0 && nums[i] === nums[i-1]) continue
        // 前指针
        let L = i+1
        // 后指针
        let R = nums.length -1
        while(L<R) {
            const sum = nums[i] + nums[L] + nums[R]
            if (sum === 0) {
                result.push([nums[i], nums[L], nums[R]])
                // 前指针去重
                while(L<R && nums[L] === nums[L+1]) L++
                // 后指针去重
                while(L<R && nums[R] === nums[R-1]) R--
                L++
                R--
            } else if (sum < 0) {
                L++
            } else {
                R--
            }
        }
    }
    return result
};
```

## 四数之和

### 题目

给定一个包含 `n` 个整数的数组`nums`，判断 `nums` 中是否存在四个元素`a，b，c，d` ，使得 `a + b + c + d = 0 ？`找出所有满足条件且不重复的四元组。

注意：答案中不可以包含重复的四元组。

```js
给定数组 nums = [1, 0, -1, 0, -2, 2]，和 target = 0。

满足要求的四元组集合为：
[
  [-1,  0, 0, 1],
  [-2, -1, 1, 2],
  [-2,  0, 0, 2]
]
```

### 思路

通过大小指针降低复杂度
- 过滤和前一个相同的
- 前后指针记得去重

```
var fourSum = function(nums, target) {
    nums = nums.sort((a, b) => a - b)
    const result = []
    for (let i=0; i<nums.length-3; i++) {
        // 过滤和前一个重复
        if (i>0 & nums[i] === nums[i-1]) continue
        for (let j=i+1; j<nums.length-2; j++) {
            // 过滤和前一个重复
            if (j>i+1 && nums[j] === nums[j-1]) continue
             // 前后指针
            let left = j+1
            let right = nums.length-1
            while(left<right) {
                const sum = nums[i] + nums[j] + nums[left] + nums[right]
                if (sum === target) {
                    result.push([nums[i], nums[j], nums[left], nums[right]])
                    // 前指针去重
                    while (left<right && nums[left] === nums[left+1]) left++
                    // 后指针去重
                    while (left<right && nums[right] === nums[right-1]) right--
                    left++
                    right--
                } else if (sum < target) {
                    left++
                } else {
                    right--
                }
            }
        }
    }
    return result
};

```

## 把数组排成最小的数

### 题目

输入一个非负整数数组，把数组里所有数字拼接起来排成一个数，打印能拼接出的所有数字中最小的一个。

```
输入: [10,2]
输出: "102

输入: [3,30,34,5,9]
输出: "3033459"
```

### 思路

- 若拼接字符串 `x+y>y+x`,则x>y,否则y>=x
- 在拼接的时候只需要做一个排序（升序）即可

```
var minNumber = function(nums) {
    for (let i=0; i<nums.length; i++) {
        for (let j=0; j<nums.length-i-1; j++) {
            if (`${nums[j]}${nums[j+1]}` > `${nums[j+1]}${nums[j]}`) {
                [nums[j], nums[j+1]] = [nums[j+1], nums[j]]
            }
        }
    }
    return nums.join('')
};
```

## 第一个只出现一次的字符

### 题目

在字符串 s 中找出第一个只出现一次的字符。如果没有，返回一个单空格。 s 只包含小写字母。

```
输入：s = "abaccdeff"
输出：'b'

输入：s = "" 
输出：' '
```

### 思想

1. 遍历维护一个map记录存在状态（多次-1），遍历返回不为-1的第一个
2. 遍历维护一个map记录存在状态（多次-1），同时维护一个队列记录数值和状态（多次-1），当map存在的时候，如果对头中存在key映射到map为-1的，则出队

```
var firstUniqChar = function(s) {
    const map = new Map()
    for (let i=0; i<s.length; i++) {
        if (map.has(s[i])) {
            map.set(s[i], -1)
        } else {
            map.set(s[i], i)
        }
    }
    for (let i=0; i<s.length; i++) {
        if (map.get(s[i]) !== -1) return s[i]
    }
    return ' '
};
```

```
var firstUniqChar = function(s) {
    const map = new Map()
    const queue = []
    for (let i=0; i<s.length; i++) {
        if (map.has(s[i])) {
            // 如果多次状态为-1
            map.set(s[i], -1)
            // 只要队头存在映射到map为-1 的，则出队
            while(queue.length && map.get(queue[0][0]) === -1) {
                queue.shift()
            }
        } else {
            map.set(s[i], i)
            queue.push([s[i], i])
        }
    }
    return queue.length ? queue[0][0] : ' '
};
```

## 调整数组顺序使奇数位于偶数前面

### 题目

```
输入：nums = [1,2,3,4]
输出：[1,3,2,4] 
注：[3,1,2,4] 也是正确的答案之一。
```

### 思想

双指针 + 一次遍历，首尾往中间

```
var exchange = function(nums) {
    let left = 0
    let right = nums.length-1
    while(left<right) {
        while(left<right && nums[left] % 2 === 1) {
            left++
        }
        while(left<right && nums[right] % 2 === 0) {
            right--
        }
        if (left<right) {
            [nums[left], nums[right]] = [nums[right], nums[left]]
            left++
            right--
        }
    }
    return nums
};
```

## 下一个队列
### 题目
整数数组的一个 排列  就是将其所有成员以序列或线性顺序排列。
例如，arr = [1,2,3] ，以下这些都可以视作 arr 的排列：[1,2,3]、[1,3,2]、[3,1,2]、[2,3,1] 。
必须 **原地** 修改，只允许使用额外常数空间。

```
输入：nums = [1,2,3]
输出：[1,3,2]

输入：nums = [3,2,1]
输出：[1,2,3]
```
### 思想

- 希望下一个数比当前大，只需要将后面的【大数】与前面的【小数】交换
- 希望下一个数增加的幅度尽可能小
  - 在尽可能靠右的低位进行交换，需要从后往前查找
  - 将一个尽可能小的【大数】和前面的【小数】交换，比如123465，将5和4交换
  - 将【大数】换到前面后，对【大数】后面的所有数升序排序得到最小的排列

```
var nextPermutation = function(nums) {
    if (nums.length <= 1) {
        return;
    }

    let i = nums.length - 2;
    let j = nums.length - 1;
    let k = nums.length - 1;

    // find: A[i] < A[j]
    while (i >= 0 && nums[i] >= nums[j]) {
        i--;
        j--;
    }

    if (i >= 0) { // not the last permutation
        // find: A[i] < A[k]
        while (nums[i] >= nums[k]) {
            k--;
        }
        // swap A[i], A[k]
        [nums[i], nums[k]] = [nums[k], nums[i]];
    }

    // reverse A[j:end]
    for (let m = j, n = nums.length - 1; m < n; m++, n--) {
        [nums[m], nums[n]] = [nums[n], nums[m]];
    }
};
```

## 搜索螺旋排序数组
### 题目
整数数组 nums 按升序排列，数组中的值 互不相同 。

在传递给函数之前，nums 在预先未知的某个下标 k（0 <= k < nums.length）上进行了 旋转，使数组变为 [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]（下标 从 0 开始 计数）。例如， [0,1,2,4,5,6,7] 在下标 3 处经旋转后可能变为 [4,5,6,7,0,1,2] 。

给你 旋转后 的数组 nums 和一个整数 target ，如果 nums 中存在这个目标值 target ，则返回它的下标，否则返回 -1 。

你必须设计一个时间复杂度为 O(log n) 的算法解决此问题。

```
输入：nums = [4,5,6,7,0,1,2], target = 0
输出：4

输入：nums = [4,5,6,7,0,1,2], target = 3
输出：-1
```

### 思想
- 利用二分查找的方法，确认哪一部分是有序的，从有序的之中再次进行查找
```
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
```