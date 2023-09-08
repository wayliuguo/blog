## 赎金信
### 题目
给你两个字符串：ransomNote 和 magazine ，判断 ransomNote 能不能由 magazine 里面的字符构成。
如果可以，返回 true ；否则返回 false 。
magazine 中的每个字符只能在 ransomNote 中使用一次。
```
输入：ransomNote = "a", magazine = "b"
输出：false

输入：ransomNote = "aa", magazine = "aab"
输出：true
```
### 思想
- 对 magazine 里的字符使用 map 记录其每个字符的个数
- 遍历 ransomNote，其出现的字符就把对应的map中减1，如果小于1或者没有这个字符则返回false
```
var canConstruct = function(ransomNote, magazine) {
    const map = new Map()
    for (let i=0; i<magazine.length; i++) {
        if (map.has(magazine[i])) {
            map.set(magazine[i], map.get(magazine[i])+1)
        } else {
            map.set(magazine[i], 1)
        }
    }
    for (let j=0; j<ransomNote.length; j++) {
        if (!map.has(ransomNote[j]) || map.get(ransomNote[j]) < 1) {
            return false
        } else {
            map.set(ransomNote[j], map.get(ransomNote[j])-1)
        }
    }
    return true
};
```

