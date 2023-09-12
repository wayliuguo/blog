## 有效的括号
### 题目
给定一个只包括 '('，')'，'{'，'}'，'['，']' 的字符串 s ，判断字符串是否有效。

有效字符串需满足：

左括号必须用相同类型的右括号闭合。
左括号必须以正确的顺序闭合。
每个右括号都有一个对应的相同类型的左括号。

```
输入：s = "()"
输出：true

输入：s = "()[]{}"
输出：true

输入：s = "(("
输出：false
```
### 思想
- 需要两两对应，可以判断单双数
- 利用栈，如果是左括号则入栈，如果是右括号则判断是否可以闭合
- 判断方法是取出栈顶与当前值判断是否可以闭合即可
```
var isValid = function (s) {
    if (s.length % 2 !== 0) return false
    const stack = []
    const map = new Map([
        [')', '('],
        [']', '['],
        ['}', '{']
    ])
    for (const item of s) {
        const last = stack[stack.length - 1]
        if (map.has(item)) {
            if (last !== map.get(item)) {
                return false
            }
            stack.pop()
        } else {
            stack.push(item)
        }
    }
    return !stack.length
}
```

## 