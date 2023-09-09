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

## 同构字符串
### 题目
给定两个字符串 s 和 t ，判断它们是否是同构的。

如果 s 中的字符可以按某种映射关系替换得到 t ，那么这两个字符串是同构的。

每个出现的字符都应当映射到另一个字符，同时不改变字符的顺序。不同字符不能映射到同一个字符上，相同字符只能映射到同一个字符上，字符可以映射到自己本身。
```
输入：s = "egg", t = "add"
输出：true

输入：s = "foo", t = "bar"
输出：false

输入：s = "paper", t = "title"
输出：true
```

### 思想
- 成立条件
  - s 中任意一个字符被 t 中唯一字符对应
  - t 中任意一个字符被 s 中唯一字符对应
```
var isIsomorphic = function(s, t) {
    const s2t = {}
    const t2s = {}
    const len = s.length
    for (let i=0; i<len; i++) {
        const S = s[i]
        const T = t[i]
        // 先判断是否存在再判断是否一致
        if ((s2t[S] && s2t[S] !== T) || (t2s[T] && t2s[T] !== S)) {
            return false
        }
        s2t[S] = T
        t2s[T] = S
    }
    return true
};
```

## 单词规律
### 题目
给定一种规律 pattern 和一个字符串 s ，判断 s 是否遵循相同的规律。

这里的 遵循 指完全匹配，例如， pattern 里的每个字母和字符串 s 中的每个非空单词之间存在着双向连接的对应规律。

```
输入: pattern = "abba", s = "dog cat cat dog"
输出: true

输入:pattern = "abba", s = "dog cat cat fish"
输出: false

输入: pattern = "aaaa", s = "dog cat cat dog"
输出: false
```
### 思想
注意不仅 pattern 的任意唯一字符与 t 中单词对应，t中任意单词也要跟 pattern 中任意字符对应，所以需要两个 map
```
var wordPattern = function(pattern, s) {
    s = s.split(' ')
    let index = 0
    if (pattern.length !== s.length) return false
    length = pattern.length
    const p2sMap = new Map()
    const s2pMap = new Map()
    while(index < length) {
        const P = pattern[index]
        const S = s[index]
        if ((p2sMap.has(P) && p2sMap.get(P) !== S) || (s2pMap.has(S) && s2pMap.get(S) !== P)) {
            return false
        }
        p2sMap.set(P, S)
        s2pMap.set(S, P)
        index++
    }
    return true
};
```

