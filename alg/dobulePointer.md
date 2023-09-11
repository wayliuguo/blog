## 验证回文串
### 题目
如果在将所有大写字符转换为小写字符、并移除所有非字母数字字符之后，短语正着读和反着读都一样。则可以认为该短语是一个 回文串 。

字母和数字都属于字母数字字符。

给你一个字符串 s，如果它是 回文串 ，返回 true ；否则，返回 false 。
```
输入: s = "A man, a plan, a canal: Panama"
输出：true
解释："amanaplanacanalpanama" 是回文串。

输入：s = "race a car"
输出：false
解释："raceacar" 不是回文串。

输入：s = " "
输出：true
解释：在移除非字母数字字符之后，s 是一个空字符串 "" 。
由于空字符串正着反着读都一样，所以是回文串。
```
### 思想
- 使用双指针，头指针start 从头开始，尾指针从尾开始
- 如果是属于需要的字符就进行比较判断
- 否则对应指针进行移动直到字符正确
```
var isPalindrome = function(s) {
    let start = 0
    let end = s.length-1
    // 判断是否是需要的字符
    const list = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9']
    while(start < end) {
        let S = s[start].toLowerCase()
        let E = s[end].toLowerCase()
        while (!list.includes(S) && start < end) {
            start++
            S = s[start].toLowerCase()
        }
        while (!list.includes(E) && start < end) {
            end--
            E = s[end].toLowerCase()
        }
        if (start > end) return false
        if (S !== E) return false
        start++
        end--
    }
    return true
};
```

## 判断子序列
### 题目
给定字符串 s 和 t ，判断 s 是否为 t 的子序列。

字符串的一个子序列是原始字符串删除一些（也可以不删除）字符而不改变剩余字符相对位置形成的新字符串。（例如，"ace"是"abcde"的一个子序列，而"aec"不是）。
```
输入：s = "abc", t = "ahbgdc"
输出：true

输入：s = "axc", t = "ahbgdc"
输出：false
```

### 思想
- 利用双指针`l`指向子序列`s`的位置，`r`指向字符串`t`的位置
- 然后指针`r`向右移动匹配到等于子序列`s`的值，则子序列`s`指针`l`向右移动
- 当子序列`s`的指针`l`能移动到末尾，则代表能匹配上
```
var isSubsequence = function(s, t) {
    let l = 0
    let r = 0
    // 当双指针没有超出时
    while(l<s.length && r<t.length) {
        const T = t[r]
        const S = s[l]
        // 当子序列值===字符串值，则子序列向右移动
        if (T === S) {
            l++
        }
        // 字符串向右移动
        r++
    }
    return l === s.length
};
```

## 两数之和 II - 输入有序数组（中等）
### 题目
给你一个下标从 1 开始的整数数组 numbers ，该数组已按 **非递减顺序排列**  ，请你从数组中找出满足相加之和等于目标数 target 的两个数。如果设这两个数分别是 numbers[index1] 和 numbers[index2] ，则 1 <= index1 < index2 <= numbers.length 。

以长度为 2 的整数数组 [index1, index2] 的形式返回这两个整数的下标 index1 和 index2。

你可以假设每个输入**只对应唯一的答案** ，而且你不**可以重复使用相同的元素**。

你所设计的解决方案必须**只使用常量级的额外空间**。
## 思想
已经是非递减了，则右边>=左边
1. 哈希
2. 双指针
3. 二分法
- 哈希（不考虑其他限制条件）
  - 常规的两数之和加个1即可
```
var twoSum = function(numbers, target) {
    const map = new Map()
    for (let i=0; i<numbers.length; i++) {
        const cur = numbers[i]
        if (map.has(target - cur)) {
            return [map.get(target-cur), i+1]
        } else {
            map.set(cur, i+1)
        }
    }
};
```
- 双指针
  - 使用头尾指针，当尾指针遍历完后，头指针右移重置尾指针
  - 如果尾指针没有遍历完
    - 结果小于 target，尾指针右移
    - 结果大于 target，头指针右移，重置头指针
    - 结果相等，得到结果
```
var twoSum = function (numbers, target) {
    // 头指针
    let start = 0
    // 尾指针
    let end = start + 1
    let length = numbers.length
    // 头指针需要给后面尾指针留一个位置
    while (start < length - 1) {
        // 当尾指针到末尾了，头指针右移，重置尾指针
        if (end === length) {
            start++
            end = start + 1
        }
        const sum = numbers[start] + numbers[end]
        // 结果小于 target，尾指针右移
        // 结果大于 target，头指针右移，重置头指针
        // 结果相等，得到结果
        if (sum < target) {
            end++
        } else if (sum > target) {
            start++
            end = start + 1
        } else {
            return [start + 1, end + 1]
        }
    }
}
```
- 二分法
```
var twoSum = function (numbers, target) {
    // 遍历取得第一项，然后使用二分法取得第二项
    for (let i = 0; i < numbers.length; i++) {
        // 二分法左下标
        let left = i + 1
        // 二分法右下表
        let right = numbers.length - 1
        while (left <= right) {
            // 中间值
            let middle = Math.floor((left + right) / 2)
            const sum = numbers[i] + numbers[middle]
            // 根据结果调整左右下标与中间值
            if (sum < target) {
                left = middle + 1
            } else if (sum > target) {
                right = middle - 1
            } else {
                return [i + 1, middle + 1]
            }
        }
    }
}
```