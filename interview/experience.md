# 快手一面
## http 与 https 区别
## 闭包、闭包应用、debounce实现
- 闭包：有权访问另一个函数作用域中变量的函数
- 闭包应用
  - 模仿块级作用域
    ```
    for (var i = 0; i < 10; i++) {
        (function (j) {
            setTimeout(function () {
                console.log(j);
            }, 1000 * j)
        })(i)
    }
    ```
  - debounce、throttle、柯里化等
## 事件循环输出题
```
setTimeout(() => {
    console.log(1)
}, 0)

console.log(2)

new Promise(resolve => {
    console.log(3)
    resolve()
}).then(() => {
    console.log(4)
}).then(() => {
    console.log(6)
}).then(() => {
    console.log(7)
})

console.log(5)

// 2 =>3 =>5 =>4 =>6 =>7 =>1
```
## 实现一个eventBus，具备on、off、emit
## 洋葱模型
## 不含重复字符的最长子字符串
## 从浏览器输入url到显示页面的步骤？