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

```
var fourSum = function (nums, target) {
    if (nums.length < 4) {
        return [];
    }
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 3; i++) {
        // 过滤和前一个重复
        if (i > 0 && nums[i] === nums[i - 1]) {
            continue;
        }
        // 如果按照顺序大于target则终止
        if (nums[i] + nums[i + 1] + nums[i + 2] + nums[i + 3] > target) {
            break;
        }
        // 第二个是下标 i+1
        for (let j = i + 1; j < nums.length - 2; j++) {
            // 过滤和前一个重复
            if (j > i + 1 && nums[j] === nums[j - 1]) {
                continue;
            }
            // 前后指针
            let left = j + 1,
                right = nums.length - 1;
            // 前后指针不重叠
            while (left < right) {
                const sum = nums[i] + nums[j] + nums[left] + nums[right];
                if (sum === target) {
                    result.push([nums[i], nums[j], nums[left], nums[right]]);
                    // 前指针去重
                    while(left < right && nums[left] === nums[left+1]) left++
                    // 后指针去重
                    while(left<right && nums[right] === nums[right-1]) right--
                }
                if (sum < target) {
                    left++
                } else {
                    right--
                }
            }
        }
    }
    return result;
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

