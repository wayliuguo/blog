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
1. 检查缓存
2. 解析URL 获取协议、域名、端口
3. 获取ip地址
4. 建立连接，三次握手
5. 服务器处理
6. 接收响应，检查状态码，检查是否进行缓存，是否关闭四次握手
7. 解析HTML,遇到js的处理

# 乐信一面
- 为什么换工作？
- pc 与 移动端哪部分负责比例？
- 跨端开发比较（混合开发、uniApp、reactnative、小程序）
- 小程序性能比较
- 小程序性能与其他比较
- 小程序跳h5如何做身份验证？
- webpack与vite的区别？vite为什么会快？
- vite 替换 webpack 无法兼容 loader 和 plugin 怎么处理？
- webpack 打包流程能说一下么？
- nextTick 为什么能保证在Dom更新后执行？
- 同步任务、dom更新、微任务三者执行顺序？
- 同步代码执行超过1s，dom是不是等待完1s再进行更新？如何解决？
- 性能优化指标，如何获取这些指标？
- 做过哪些技术分享？
- 工作强度如何？
- 自己的缺点？自己的优点？
- 加入团队后公司有
- 公司业务情况？

# 乐信二面
- 缓存
- vue2、vue3、react 的区别
- A跳转B页面，如果回填A页面的手机号
- B页面输入信息，如何防止攻击
- XSS 攻击如何防止
- localstorage、sessionStorage、cookie
- 获取手机验证码的流程
- 如何防止获取验证码接口被刷
- 说一个项目中做的工程如何体现你的价值
- 团队规模、晋升机制
