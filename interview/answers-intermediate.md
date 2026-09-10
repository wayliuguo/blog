# 参考答案-中级

> 对应 [quiz-intermediate.md](./quiz-intermediate.md) 的 45 道中级题目，逐题给出要点答案（适当展开原理）。

---

## 一、HTML / CSS

### 1. link 与 @import 的区别
- `link`：HTML 标签，**并行加载不阻塞**，可在 DOM/CSSOM 阶段正常触发，可覆盖（重复引入）。
- `@import`：CSS 内语法，**需等到 CSS 加载完才请求引入的资源，串行、阻塞**，且旧浏览器兼容差。
- 建议用 link，因其加载更高效、不会阻塞渲染。

### 2. 0.5px 线的实现
- 使用 `transform: scaleY(0.5)`（配合 1px 元素）。
- 使用 `box-shadow: 0 0.5px 0 #000`。
- 使用 `border-top/border: 0.5px`（部分环境支持）。
- 使用 `background: linear-gradient` 模拟半像素。
- 用 `viewport` 的 devicePixelRatio 适配。

### 3. CSS 预处理器
- 如 Sass/Less/Stylus，为 CSS 提供**变量、嵌套、混合（mixin）、函数、继承、运算、作用域、模块化**等编程能力。
- 提高可维护性、复用性、书写效率；最终编译为原生 CSS。

### 4. 隐藏元素的方式比较
- `display:none`（脱离文档流，重排）、`visibility:hidden`（占位不可见，重绘）、`opacity:0`（占位但可交互）、`position + left 负值`、`width/height:0 + overflow:hidden`、`clip-path` 等。
- 选择依据：是否占位、是否可交互、是否需要动画性能。

### 5. 阻止父元素冒泡
- 在子元素事件回调里调用 `e.stopPropagation()`，阻止事件继续冒泡到父级。
- 或在父元素使用的委托处理器里判断目标（`e.target`）后再处理。

### 6. flex 主轴与交叉轴
- 由 `flex-direction` 决定主轴（row/column），`justify-content` 控制**主轴**对齐，`align-items` 控制**交叉轴**对齐。
- `align-self` 单独控制单个项目交叉轴；`align-content` 控制多行在交叉轴的分布。

### 7. 常见布局
- 圣杯布局 / 双飞翼布局：三栏，中间自适应 + 两侧固定，中间优先渲染。
- 两栏布局、flex 布局、grid 布局等。
- 用负 margin、flex、grid 等实现。

### 8. transform / transition / animation
- `transform`：元素**变形**（位移/缩放/旋转/斜切）。
- `transition`：**过渡**，属性变化时的平滑动画（需要触发）。
- `animation`：**关键帧动画**，可自主循环、控制次数/方向，更灵活。

### 9. z-index 失效场景
- 元素没有设置 `position` 且不是 flex/grid 子项等创建层叠上下文时，需要配合定位元素。
- 或父元素是 `z-index` 为 auto/负值、有 `filter/transform/opacity` 创建了层叠上下文导致层级被隔离。
- 解决：给目标都设置定位并给合理 `z-index`，或调整同为层叠上下文下的可比较层级。

## 二、JavaScript

### 10. 事件循环 / 宏任务与微任务
- JS 单线程：执行栈为空时从**任务队列**取回调执行。
- 宏任务：script、setTimeout、setInterval、I/O、事件、`requestAnimationFrame`。
- 微任务：Promise.then、`queueMicrotask`、`MutationObserver`、async 后的 await。
- 顺序：先执行**同步代码 → 清空微任务队列 → 取一个宏任务**，循环往复（每执行一个宏任务就清空一次微任务）。

### 11. 手写深拷贝
- 用递归 + 类型判断处理 object/array，为防循环引用使用 `WeakMap` 记录已拷贝对象。
- 处理函数（直接引用/拷贝引用）、Date、RegExp、Symbol、Map、Set 等特殊类型。
- 也可用 `structuredClone`（原生深拷贝，支持循环引用、Date 等，但不支持函数）。

### 12. 防抖 / 节流 / 柯里化
- 防抖：`setTimeout` 延迟执行，`clearTimeout` 重新计时。
- 节流：记录时间戳，间隔内跳过；或 `seTimeout` 标志位，保证一定时间内最多一次。
- 柯里化：把多参数函数转化为**接收单参数并返回新函数**的嵌套结构，延迟求值。

### 13. 原型链与 new
- 每个对象都有 `__proto__`（指向构造函数的 `prototype`），层层向上最终到 `Object.prototype` → `null`，形成原型链。
- `new` 做了四件事：创建新对象 → 将 `__proto__` 指向构造函数的 `prototype` → 执行构造函数绑定 this → 若返回对象则返回该对象，否则返回创建的实例。

### 14. call / apply / bind 区别及实现
- `call`：立即执行，参数逐个传；`apply`：立即执行，第二参数为**数组**；`bind`：**返回新函数不立即执行**，可预绑参数。
- 实现 call 的思路：把函数设为对象临时方法再调用，用 `Symbol` 避免覆盖，传参用 `Array.from`/展开。

### 15. Promise 与 async/await
- Promise 是一种异步流程控制结构。
- `async` 函数返回一个 Promise；`await` 让异步以同步写法出现，实质是 Promise 的语法糖。
- 把一个回调封装成 Promise：用 `new Promise((resolve,reject)=>{ 调用异步函数... })`。

### 16. Promise.all / race 手写要点
- `all`：接收数组，用计数器统计完成数量，全部成功才 resolve（结果按顺序），一个失败即 reject。
- `race`：谁先完成谁胜出（resolve 或 reject 都触发）。
- 注意空数组、非 Promise 项要先 `Promise.resolve` 包装。

### 17. 数组扁平化
- `arr.flat(depth)` 原生方法（ES2019）。
- 手写：递归遍历，`Array.isArray` 判断；或用 `reduce` + 递归。
- 深度不定时用 `JSON.stringify` 后替换/parse（不推荐，局限多）或递归（默认压平全部）。

### 18. 纯函数
- 满足：**相同的输入一定得到相同输出**，且**不产生副作用**（不修改外部状态/变量）。
- 优点：可预测、易测试、易复用、利于并发与记忆化。

### 19. 函数式编程
- 强调使用**纯函数、不可变数据、组合、柯里化、高阶函数**，避免共享状态与副作用。
- 好处：逻辑清晰、可测试、可靠；配合 React 的不可变理念等被广泛采用。

### 20. 取消异步请求
- Fetch：使用 `AbortController` + `signal` 中止请求。
- XHR：调用 `xhr.abort()`。
- 自行封装 Promise 时用取消标志（如 `isCanceled`）配合 finally 处理。

### 21. == 隐式类型转换
- 数字与字符串比较：字符串转数字；布尔转数字（true→1）；对象调用 `valueOf`/`toString`；`null == undefined` 为 true（其他类型不等）。
- 与 null 比较时 null/undefined 只彼此相等。理解 `[] == ![]` 这类经典题（注意 `!` 优先级）。

### 22. 数组去重与排序
- 去重：`Set([...arr])`、`filter + indexOf`、`reduce + Map`。
- 排序：`sort((a,b)=>a-b)`；注意 sort 默认按**字符串**比较数字，需传入比较函数。

## 三、网络与浏览器

### 23. HTTP 状态码分类
- 1xx 信息、2xx 成功（200/201/204）、3xx 重定向（301/302/304/307）、4xx 客户端错误（400/401/403/404/422）、5xx 服务端错误（500/502/503/504）。

### 24. HTTP/1.0 → 1.1 → 2 → 3
- 1.1：默认持久连接、管线化、Host 头、更多缓存字段。
- HTTP/2：**多路复用、二进制帧、头部压缩（HPACK）、服务端推送**，解决队头阻塞（应用层）。
- HTTP/3：基于 **QUIC（UDP）**，解决 TCP 传输层队头阻塞，更快的握手与连接迁移。

### 25. 跨域与 CORS
- 跨域：协议/域名/端口任一不同即跨域，浏览器同源策略限制。
- 方案：CORS、JSONP（仅 GET）、代理（dev server / nginx 反向代理）、postMessage、WebSocket、iframe 相关。
- CORS：服务端设置 `Access-Control-Allow-Origin/Methods/Headers` 等，预检请求（OPTIONS）用于非简单请求。

### 26. HTTPS 握手（简化）
- ClientHello（支持算法/随机数）→ ServerHello + 证书 → 客户端校验证书 → 生成预主密钥并加密发送 → 双方计算会话密钥 → 后续对称加密通信。
- 关键：证书验证 + 非对称交换密钥 + 对称加密传输。

### 27. 浏览器缓存
- 强缓存：`Cache-Control`（max-age）/`Expires`，直接读缓存，不发请求。
- 协商缓存：`Last-Modified`/`If-Modified-Since`、`ETag`/`If-None-Match`，向服务器验证返回 304 则用缓存。
- 优先级：Cache-Control > Expires；ETag 比 Last-Modified 更精确。

### 28. WebSocket 与 HTTP
- WS：**全双工**、长连接（连接后双向实时推送）、协议升级（`Upgrade: websocket`）。
- HTTP：请求-响应模型，短连接（半双工）。
- 适用：即时通讯、实时数据、股票行情、协作工具。

### 29. 重排重绘与优化
- 重排(reflow)：布局变化；重绘(repaint)：外观变化。重排必然伴随重绘。
- 优化：批量修改 DOM、`documentFragment`、减少强制同步布局（offsetWidth 读取）、用 `transform/opacity`、分级异步、requestAnimationFrame 合并。

### 30. 垃圾回收（GC）
- 自动回收不再使用的内存。
- 标记清除（mark-sweep）：从根遍历标记存活对象，清除未标记的；配合**分代回收**（新生代/老生代，V8 采用）。
- 引用计数：有循环引用问题，现已少用。
- 注意：闭包、全局变量、遗漏监听器会造成**内存泄漏**。

## 四、框架

### 31. Vue2 与 Vue3 响应式
- Vue2：`Object.defineProperty` 劫持，需递归、无法监听新增属性/删除、数组索引有缺陷，需 `$set`。
- Vue3：`Proxy` 直接代理对象，可监听到增删属性、数组变化，基于依赖追踪 + `Reflect`，性能更好；配合 Composition API 更灵活。

### 32. computed 与 watch
- `computed`：**基于依赖缓存**的计算属性，依赖不变不重新计算，适合派生数据。
- `watch`：**侦听某个数据的变化**执行副作用/异步操作，适合监控变化做处理。
- 选择：能 computed 就用 computed（更高效），需要时序/异步才 watch。

### 33. $nextTick 原理
- 在**下一次 DOM 更新循环结束之后**执行回调。
- 原理：基于浏览器微任务（Promise.then / MutationObserver）/宏任务（setTimeout）在数据变更后 DOM 更新完成时调用回调，保证拿到最新 DOM。

### 34. slot 插槽
- 具名插槽：`<slot name="xxx">` 传递特定位置内容。
- 作用域插槽：父组件在插槽内能访问子组件传入的数据（`:定义 data` + `<template #default="slotProps">`）。
- 用于组件内容分发、复用与自定义。

### 35. Vue Router 模式
- `hash` 模式：URL 带 `#`，**无需服务端配置**，通过 hashchange 监听。
- `history` 模式：使用 History API（pushState/replaceState），URL 更干净，**需服务端配置**返回 index.html（否则刷新 404）。
- 另有用 `memory`/abstract 模式用于非浏览器环境。

### 36. Vuex 状态管理
- 5 个核心：`state、getters、mutations、actions、modules`。
- 流程：组件 `dispatch action` → action `commit mutation` → mutation（唯一修改 state）同步更新 → 组件通过 getters/state 响应式渲染。
- `pinia` 是新一代方案（去掉了 mutation，直接用函数改 state）。

### 37. React Hooks 规则
- **只能在组件函数顶层调用** Hooks，不能在条件/循环/嵌套函数中调用。
- 原因：React 依赖 Hooks 的**调用顺序**来关联状态，若顺序变化会错乱；必须在每次渲染保持一致的调用顺序。

### 38. 虚拟 DOM 与 diff
- vdom：用 JS 对象描述真实 DOM 结构，更新时先改 vdom 再 diff 出差异批量更新真实 DOM，提升性能。
- diff：同层对比 key + type，复用可复用节点，最小化更新操作（协调 reconciliation）。

### 39. 受控组件与非受控组件
- 受控：**值由 React state 控制**，通过 `value + onChange` 管理，每次输入都会触发渲染更新，可校验。
- 非受控：**值由 DOM 自身管理**，用 `ref` 读取当前值（defaultValue），性能略好但不便校验。
- 建议多用受控组件。

### 40. React 生命周期
- 挂载：`constructor → getDerivedStateFromProps → render → componentDidMount`。
- 更新：props/state 变化 → `getDerivedStateFromProps → shouldComponentUpdate → render → getSnapshotBeforeUpdate → componentDidUpdate`。
- 卸载：`componentWillUnmount`。
- 函数组件用 Hooks 等价，如 `useEffect`。

## 五、工程化

### 41. Webpack 核心概念
- `entry`（入口）、`output`(出口)、`loader`（转换模块）、`plugin`（扩展功能）、`mode`、`optimization`（压缩/代码分割）、`resolve`、`devServer` 等。
- 围绕模块图递归打包静态资源。

### 42. loader 与 plugin 的区别
- loader：**处理单个模块文件**的转换（如 babel-loader、css-loader、file-loader），工作在模块解析阶段。
- plugin：**扩展编译器整个生命周期**，能做更广泛的事（如 HtmlWebpackPlugin、MiniCssExtractPlugin、DefinePlugin），钩子机制。

### 43. Vite 优势与 HMR
- 基于 ESM 原生，**开发时按需编译**，冷启动/热更新极快；生产用 Rollup 打包并可 Tree-shaking。
- HMR 原理：监听文件变化，通过 WebSocket 通知浏览器，仅更新变化模块，保留应用状态。

### 44. Tree-shaking
- 消除未使用代码（dead code）。基于 **ESM 静态分析**（import/export 结构在编译期可解析），依赖 `sideEffects` 字段与 babel 不要转成 CommonJS 等前提。
- 打包时标记未使用导出为剪除。仅语法静态导入可 tree-shake，动态（require）不行。

### 45. 模块化方案
- CommonJS（require/module.exports，Node 同步加载）、ES Module（import/export，静态、可 tree-shaking、异步）、AMD（浏览器 requirejs 异步）、CMD（seajs）。
- 演变趋势：浏览器端主流是 ESM，Node 新版本也支持 ESM。