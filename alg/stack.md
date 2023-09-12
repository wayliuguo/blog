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

## 简化路径（中等）
### 题目
给你一个字符串 path ，表示指向某一文件或目录的 Unix 风格 绝对路径 （以 '/' 开头），请你将其转化为更加简洁的规范路径。

在 Unix 风格的文件系统中，一个点（.）表示当前目录本身；此外，两个点 （..） 表示将目录切换到上一级（指向父目录）；两者都可以是复杂相对路径的组成部分。任意多个连续的斜杠（即，'//'）都被视为单个斜杠 '/' 。 对于此问题，任何其他格式的点（例如，'...'）均被视为文件/目录名称。

请注意，返回的 规范路径 必须遵循下述格式：

始终以斜杠 '/' 开头。
两个目录名之间必须只有一个斜杠 '/' 。
最后一个目录名（如果存在）不能 以 '/' 结尾。
此外，路径仅包含从根目录到目标文件或目录的路径上的目录（即，不含 '.' 或 '..'）。
返回简化后得到的 规范路径 。
```
输入：path = "/home/"
输出："/home"
解释：注意，最后一个目录名后面没有斜杠。 

输入：path = "/../"
输出："/"
解释：从根目录向上一级是不可行的，因为根目录是你可以到达的最高级。

输入：path = "/home//foo/"
输出："/home/foo"
解释：在规范路径中，多个连续斜杠需要用一个斜杠替换。

输入：path = "/a/./b/../../c/"
输出："/c"
```
### 思想
- 以 / 分隔为数组 "/home/".split('/') => ['', 'home', '']
- 当匹配到`..`时，出栈
- 当不为空且非`.`时，入栈
```
var simplifyPath = function(path) {
    // 以 / 分隔为数组 "/home/".split('/') => ['', 'home', '']
    names = path.split('/')
    const stack = []
    for (const name of names) {
        if (name === '..') {
            // 出栈
            if (stack.length) {
                stack.pop()
            }
        } else if (name.length && name !== '.') {
            // 如果非空且不是当前目录，入栈
            stack.push(name)
        }
    }
    return "/" + stack.join("/")
};
```

## 最小栈（中等）
### 题目
设计一个支持 push ，pop ，top 操作，并能在常数时间内检索到最小元素的栈。

实现 MinStack 类:

MinStack() 初始化堆栈对象。
void push(int val) 将元素val推入堆栈。
void pop() 删除堆栈顶部的元素。
int top() 获取堆栈顶部的元素。
int getMin() 获取堆栈中的最小元素。
```
输入：
["MinStack","push","push","push","getMin","pop","top","getMin"]
[[],[-2],[0],[-3],[],[],[],[]]

输出：
[null,null,null,null,-3,null,0,-2]

解释：
MinStack minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
minStack.getMin();   --> 返回 -3.
minStack.pop();
minStack.top();      --> 返回 0.
minStack.getMin();   --> 返回 -2.
```
- -231 <= val <= 231 - 1
- pop、top 和 getMin 操作总是在 **非空栈** 上调用
- push, pop, top, and getMin最多被调用 3 * 104 次

### 思想
```
var MinStack = function() {
    this.stack = []
};

/** 
 * @param {number} val
 * @return {void}
 */
MinStack.prototype.push = function(val) {
    this.stack.push(val)
};

/**
 * @return {void}
 */
MinStack.prototype.pop = function() {
    this.stack.pop()
};

/**
 * @return {number}
 */
MinStack.prototype.top = function() {
    return this.stack[this.stack.length-1]
};

/**
 * @return {number}
 */
MinStack.prototype.getMin = function() {
    let min = this.stack[0]
    for(const item of this.stack) {
        min = Math.min(min, item)
    }
    return min
};
```

## 逆波兰表达式求值（中等）
### 题目
给你一个字符串数组 tokens ，表示一个根据 逆波兰表示法 表示的算术表达式。

请你计算该表达式。返回一个表示表达式值的整数。
- 有效的算符为 '+'、'-'、'*' 和 '/' 。
- 每个操作数（运算对象）都可以是一个整数或者另一个表达式。
- 两个整数之间的除法总是 向零截断 。
- 表达式中不含除零运算。
- 输入是一个根据逆波兰表示法表示的算术表达式。
- 答案及所有中间计算结果可以用 32 位 整数表示。

```
输入：tokens = ["2","1","+","3","*"]
输出：9
解释：该算式转化为常见的中缀算术表达式为：((2 + 1) * 3) = 9

输入：tokens = ["4","13","5","/","+"]
输出：6
解释：该算式转化为常见的中缀算术表达式为：(4 + (13 / 5)) = 6

输入：tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]
输出：22
解释：该算式转化为常见的中缀算术表达式为：
  ((10 * (6 / ((9 + 3) * -11))) + 17) + 5
= ((10 * (6 / (12 * -11))) + 17) + 5
= ((10 * (6 / -132)) + 17) + 5
= ((10 * 0) + 17) + 5
= (0 + 17) + 5
= 17 + 5
= 22
```

### 思想
- 利用一个栈，当遇见操作符号的时候，就出栈前两个数字进行操作
- 特殊处理除法的时候的处理
```
var evalRPN = function (tokens) {
    let stack = []
    let first, second
    for (const token of tokens) {
        if (token === '+' || token === '-' || token === '*' || token === '/') {
            first = Number(stack.pop())
            second = Number(stack.pop())
        }
        switch (token) {
            case '+':
                stack.push(second + first)
                break
            case '-':
                stack.push(second - first)
                break
            case '*':
                stack.push(second * first)
                break
            case '/':
                stack.push(second/first > 0 ? Math.floor(second/first) : Math.ceil(second / first))
                break
            default:
                stack.push(token)
                break
        }
    }
    return stack[0]
}
```