# 面试题 · JS 与 TS 基础（全覆盖版）

> 前端面试最高频的基础题合集，与简历结合点标【项目】。

## 一、数据类型与内存

**Q1：JS 数据类型？怎么准确判断？**
- 原始类型 7 种（number/string/boolean/undefined/null/symbol/bigint）+ 对象类型
- typeof（原始类型/函数，typeof null === 'object' 历史 bug）、instanceof（原型链，可跨 iframe 失效）
- 万能：Object.prototype.toString.call()；判断数组 Array.isArray()

**Q2：深拷贝怎么实现？**
- JSON.parse(JSON.stringify)：丢函数/undefined/Date 变字符串/循环引用报错——只适合纯数据
- structuredClone：原生、支持循环引用、不支持函数
- 手写递归：WeakMap 缓存已拷贝对象解决循环引用，按类型分别处理 Date/RegExp/Map/Set

**Q3：垃圾回收与内存泄漏？**
- V8：分代回收（新生代 Scavenge / 老生代标记清除+整理）
- 常见泄漏：意外的全局变量、被遗忘的定时器与事件监听、闭包持有大对象、脱离 DOM 的引用
- 排查：Performance 内存曲线 + heap snapshot 对比

## 二、作用域、this、闭包

**Q4：闭包是什么？应用与风险？**
- 函数记住定义时的词法作用域，即使在外部执行
- 应用：封装私有变量、柯里化、组合式函数（useXxx 本质是闭包）；风险：大对象被长期持有 → 泄漏

**Q5：this 指向规则？**
- 优先级：new > 显式（call/apply/bind）> 隐式（调用者）> 默认（window/undefined 严格模式）
- 箭头函数无 this，沿用词法作用域——回调里保 this 的常用解
- 【项目】类组件时代的回调保 this 问题在 Vue3 组合式 API 中消失，函数闭包替代 this

**Q6：原型与原型链？class 的本质？**
- 对象有 __proto__ 指向构造函数的 prototype；属性查找沿链上溯到 null
- 继承 = 原型链 + 构造函数借用组合；class 是语法糖（本质仍是原型），super/静态方法/私有字段
- instanceof 原理：沿原型链查找构造函数的 prototype

## 三、异步（最高频）

**Q7：浏览器事件循环？宏任务与微任务？**
- 每轮：取一个宏任务 → 清空全部微任务 → 渲染检查 → 下一轮
- 宏任务：setTimeout/setInterval/IO/事件；微任务：Promise.then、queueMicrotask、MutationObserver
- 经典顺序题：同步代码 → 微任务 → 宏任务，注意 await 后的代码是微任务

**Q8：Promise 核心？**
- 三状态不可逆（pending/fulfilled/rejected）；then 返回新 Promise 形成链式，值穿透
- 静态方法：all（全成才成，一败即败）、allSettled（全落定）、race（首个落定）、any（首个成功）
- 错误处理：链尾 catch 统一兜；注意 then 里抛错会被后续 catch 捕获

**Q9：async/await 原理？**
- 语法糖：generator + promise 的自动执行器；await 暂停函数，后续逻辑注册为微任务
- 并发陷阱：连续 await 串行等待——无依赖的请求先 Promise.all 再 await
- try-catch 捕获 rejected，替代链式 catch

**Q10：手写题高频清单（思路级）**
- 防抖节流（时间戳/定时器两版节流）；深拷贝（WeakMap 防循环）
- Promise.all（计数+结果占位保持顺序）、Promise.race
- call/apply/bind（bind 要处理 new 调用）；instanceof（原型链遍历）；柯里化（参数收集 + 递归）
- 数组去重/扁平化、Promise 并发限制（池子 + 队列）

## 四、ES6+ 关键点

**Q11：let/const 与 var 的区别？**
- 块级作用域、暂时性死区、不挂 window；const 声明后引用不可变（对象内容可变）
- 循环中的 var 闭包问题：let 每轮创建新的块级绑定

**Q12：解构 / 展开运算符 / 可选链等实战语法？**
- 默认值 + 重命名解构函数参数；展开做浅拷贝与合并（注意浅）
- ?. 与 ??：nullish 判断只认 null/undefined（区别 ||）；Object.entries/fromEntries 转换

**Q13：Map/Set/WeakMap 的应用场景？**
- Map：任意类型 key、有序、size；Set：去重、集合运算
- WeakMap/WeakSet：弱引用不阻止 GC——DOM 元素附加元数据、闭包缓存（深拷贝循环引用缓存）

## 五、TypeScript

**Q14：TS 解决什么问题？interface 和 type 区别？**
- 类型即文档 + 编译期排错 + 重构保障；成本是类型编写与维护，渐进落地
- interface：可声明合并、只描述对象；type：联合/交叉/条件/映射等类型运算全能
- 都能扩展（extends / 交叉）——团队统一选一种为主

**Q15：泛型怎么用？常用工具类型？**
- 泛型保持类型关联（入参与出参一致）；约束 extends 限定范围
- Partial/Required/Pick/Omit/Record/ReturnType/Parameters 原理（都是映射类型 + keyof/索引访问）
- 【项目】试算等资金核心模块强类型：入参出参类型化，改签名全链路编译期暴露

**Q16：any / unknown / never 的区别？**
- any 放弃检查（慎用）；unknown 安全顶类型——用前必须收窄；never 底类型——穷尽检查（switch 联合类型漏分支报错）
- 类型收窄手段：typeof/instanceof/in、判别联合（kind 字段）
