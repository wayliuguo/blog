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