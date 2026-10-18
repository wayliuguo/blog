# 面试题 · JS

## 一、数据类型与类型检测

### 1. JS 有哪些数据类型？存储上有什么区别？

**结论：7 种原始类型 + Object 引用类型；原始类型存栈、按值访问，引用类型存堆、按引用访问。**

- 原始类型（7 种）
  - `Undefined` / `Null` / `Boolean` / `Number` / `String` / `Symbol` / `BigInt`
- 引用类型
  - `Object`（含 Array、Function、Date、RegExp 等都是 Object 的子类型）
- 存储差异
  - 原始类型：栈中直接存值，大小固定，按值访问
  - 引用类型：栈中存引用地址，实体在堆中，赋值/传参传递的是地址
- 追问：为什么这样设计？
  - 栈内存由引擎管理、分配回收快，适合小而频繁的数据；堆适合大小不定的大对象，由 GC 管理
- 高频追问：**为什么 `0.1 + 0.2 !== 0.3`？怎么解决？**
  - JS 数字用 IEEE 754 双精度（64 位）存储：0.1、0.2 的二进制是无限循环小数，尾数 52 位处截断，两边各带误差，相加后误差显现
  - 判断相等：`Math.abs(a - b) < Number.EPSILON`
  - 计算：小数先乘 10 的幂转整数再算（`Math.round((0.1*10 + 0.2*10)) / 10`）；大数用 `BigInt`；金额计算用 decimal 类库，不要拿 `toFixed` 当精度方案（它有舍入坑）

### 2. 类型检测的方式有哪些？各自的问题？

**结论：首选 `typeof` 判原始 + `Object.prototype.toString.call()` 判引用，两件套覆盖全部场景。**

| 方式 | 能判什么 | 问题 |
| --- | --- | --- |
| `typeof` | 原始类型 + `function` | `typeof null` → `'object'`；数组/对象都返回 `'object'` |
| `instanceof` | 引用类型的具体类别（沿原型链找 `prototype`） | 判不了原始类型；跨 iframe 失效；`2 instanceof Number` 为 false |
| `constructor` | 基本能判全 | 改过 `prototype` 后失真；`null`/`undefined` 没有 constructor |
| `Object.prototype.toString.call()` | 全类型最准（`[object Array]`） | 写法繁琐，只能读不能扩展 |

- 高频追问：**为什么 `typeof null` 是 `'object'`？**
  - JS 第一版值存储在 32 位单元，低位是类型标签，对象的标签是 `000`
  - null 是全 0 的机器码 NULL 指针，标签同为 `000`，被误判为 object
  - 历史遗留 bug，提案修过但会破坏存量代码，永远不修了
- 高频追问：`typeof NaN`？
  - `'number'`——NaN 是数值类型的特殊值，判断 NaN 用 `Number.isNaN()`（`isNaN` 会先转数字，不可靠）
- 手写 instanceof（高频）：沿 `Object.getPrototypeOf(left)` 向上走，逐级与 `right.prototype` 比较

### 3. 判断数组的方式？

**结论：项目里用 `Array.isArray()`，其他方式知道即可。**

- `Array.isArray([])` ——**首选**，跨 iframe/realm 也可靠
- `Object.prototype.toString.call([]) === '[object Array]'` ——同样可靠
- `[] instanceof Array` ——同 realm 下可用
- `Array.prototype.isPrototypeOf([])`、`[].constructor === Array` ——原型可被改，可靠性差
- 追问：为什么 instanceof 跨 iframe 失效？
  - iframe 有独立的全局对象，`Array` 构造函数不同，原型链对不上

### 4. 浅拷贝与深拷贝的区别？深拷贝怎么做？

**结论：浅拷贝只复制一层，嵌套引用共享；深拷贝递归复制全部层级。**

- 浅拷贝方式
  - `Object.assign({}, obj)`、`{ ...obj }`、`Array.prototype.slice()/concat()`
  - 注意：`Object.assign` 和扩展运算符都是**浅拷贝**——只复制第一层，嵌套对象仍是共享引用
- 深拷贝方式对比

| 方案 | 优点 | 缺陷 |
| --- | --- | --- |
| `JSON.parse(JSON.stringify())` | 简单 | 丢 function/undefined/Symbol；Date 变字符串；不支持循环引用；BigInt 报错 |
| `structuredClone()` | 原生、支持循环引用、Date/Map/Set | 不支持函数、DOM 节点、原型链不保留 |
| 递归手写 | 可控、面试必会 | 要处理循环引用、特殊对象 |
| lodash `cloneDeep` | 生产首选 | 依赖库 |

- 手写要点（高频追问）

  ```js
  function deepClone(obj, map = new WeakMap()) {
    if (obj === null || typeof obj !== 'object') return obj
    if (map.has(obj)) return map.get(obj)   // 循环引用
    const res = Array.isArray(obj) ? [] : {}
    map.set(obj, res)
    for (const key of Reflect.ownKeys(obj)) {
      res[key] = deepClone(obj[key], map)
    }
    return res
  }
  ```

  - 循环引用：用 `WeakMap` 缓存已拷贝对象
  - 追问为什么用 WeakMap：弱引用，拷贝完成后不阻止原对象被 GC
  - Date/RegExp、Symbol 键等边界按需补

### 5. 隐式类型转换的规则是什么？`==` 发生什么？为什么推荐 `===`？

**结论：`==` 触发抽象相等算法（ToPrimitive → 转数字比较），规则复杂难预测；`===` 不转换、类型不同直接 false，生产一律 `===`，`==` 唯一合理用法是 `x == null`。**

- 转换核心规则
  - 对象参与比较先走 ToPrimitive：`Symbol.toPrimitive` 优先，再 `valueOf`，最后 `toString`
  - 布尔参与比较先转数字（`true → 1`、`false → 0`）
  - 数字与字符串比较：字符串转数字
  - `NaN` 与任何值都不相等（包括自身）
  - `null == undefined` 为 true（规范特例），但它们与其他任何值比较都是 false
- 必会输出题

  ```js
  [] == false          // true：[] → '' → 0，false → 0
  '1' == true          // true：'1' → 1，true → 1
  null == 0            // false：null 只与 undefined 宽松相等
  [] + {}              // '[object Object]'：[] → ''，{} → '[object Object]'
  {} + []              // 0：语句开头的 {} 被解析为块，剩 +[] → 0
  ```

- 为什么推荐 `===`
  - 不触发隐式转换，行为可预测；`==` 的规则链几乎没有人在 review 时能心算全
  - `x == null` 是唯一惯用例外（同时判 null 和 undefined）
- 追问：`[] == ![]` 为什么是 true？
  - `![]` 先求值为 false → 0；`[]` → `''` → 0；0 == 0

## 二、作用域、闭包与内存

### 6. let、const、var 的区别？

**结论：var 函数作用域 + 变量提升 + 可重复声明；let/const 块级作用域 + 暂时性死区；const 锁绑定不锁值。**

| 维度 | var | let | const |
| --- | --- | --- | --- |
| 作用域 | 函数作用域 | 块级作用域 | 块级作用域 |
| 提升 | 提升并初始化为 undefined | 提升但不初始化（TDZ） | 提升但不初始化（TDZ） |
| 重复声明 | 允许 | 报错 | 报错 |
| 重新赋值 | 允许 | 允许 | 禁止 |

- 追问：**什么是暂时性死区（TDZ）？**
  - 块内 `let/const` 声明前访问直接抛 ReferenceError（var 是 undefined）
  - 设计目的：让「先声明后使用」成为强制约束，减少运行期隐患
- 追问：**const 对象的属性能改吗？**
  - 能。const 锁的是变量指向的内存地址（引用），对象内部内容不受控
  - 要不可变用 `Object.freeze()`（浅冻结；深层需递归）
- 实践：默认 const，需要重赋值才 let，禁用 var

### 7. 对作用域与作用域链的理解？

**结论：作用域在「定义时」确定（词法作用域），查找变量沿作用域链由内向外。**

- 三种作用域
  - 全局作用域：污染全局命名空间，尽量少用
  - 函数作用域
  - 块级作用域（ES6）
- 作用域链
  - 函数定义时就保存了 [[Environment]]（外层词法环境引用）
  - 查变量：当前作用域 → 外层 → … → 全局，找不到报 ReferenceError
- 高频追问：**作用域是定义时确定还是调用时确定？**
  - 定义时（静态/词法作用域）——闭包能访问定义处变量的根源

### 8. 对执行上下文的理解？

**结论：执行上下文是代码运行前的准备工作（变量环境 + this + 作用域链），用栈管理。**

- 三类
  - 全局执行上下文：程序启动创建，仅一个
  - 函数执行上下文：每次调用创建
  - eval 执行上下文：不用 eval，知道即可
- 生命周期两阶段
  - 创建阶段：确定 this、建立作用域链、变量提升/TDZ 登记
  - 执行阶段：逐行执行、赋值
- 调用栈
  - 压栈 → 执行 → 弹栈；栈溢出即递归过深（`Maximum call stack size exceeded`）

### 9. 对闭包的理解？有什么应用与风险？

**结论：闭包 = 函数 + 其定义时的词法作用域；本质是内层函数持有外层变量的引用，使外层变量 escaping 后无法回收。**

- 定义与成因
  - 内层函数引用了外层函数的变量，且内层函数被返回或传递到外部
- 应用场景
  - 私有变量 / 模块模式（IIFE + 闭包）
  - 防抖节流的 timer、缓存 memoize 的 cache
  - 柯里化、 once 函数
- 经典陷阱：循环中的 var

  ```js
  for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i)) // 3 3 3
  }
  // 改 let：每次迭代产生新绑定，输出 0 1 2
  // var 不动：包一层 IIFE 传值
  ```

- 风险与追问
  - 闭包引用的变量常驻内存 → 不再使用的闭包置 null 释放
  - 无脑说「闭包导致内存泄漏」不准确：是闭包延长了生命周期，泄漏指「不再需要却回收不掉」

### 10. JS 的垃圾回收机制？常见内存泄漏有哪些？

**结论：V8 分代回收——新生代 Scavenge 复制算法、老生代标记清除 + 标记整理；泄漏几乎都是「该断的引用没断」。**

- 新生代（Survivor 空间小、回收频繁）
  - Scavenge：From/To 两个空间，存活对象复制到 To，牺牲空间换速度
  - 晋升：存活过一轮或 To 空间使用超限 → 进老生代
- 老生代
  - 标记清除（Mark-Sweep）：从根（全局对象、调用栈）出发标记可达，清除不可达
  - 标记整理（Mark-Compact）：清除后内存碎片多时整理移动对象
  - 增量标记与并发标记：把长停顿拆小，避免卡顿
- 常见泄漏场景（4 类，面试背这个）
  - 意外的全局变量（未声明赋值挂到 window）
  - 被遗忘的定时器/回调（setInterval 持有外部引用）
  - 闭包滥用
  - 脱离 DOM 的引用（JS 变量还存着已从页面移除的节点）
- 排查手段：Performance 面板录制 + Memory 堆快照对比（Shallow/Retained Size）
- 加分项：`WeakMap`/`WeakSet` 弱引用不阻止回收，适合给 DOM/对象挂元数据

## 三、this 与函数

### 11. this 的绑定规则？

**结论：this 由「调用方式」决定，不是定义位置；优先级 new > 显式 > 隐式 > 默认。**

| 规则 | 触发方式 | this 指向 |
| --- | --- | --- |
| 默认绑定 | 独立函数调用 | window（严格模式 undefined） |
| 隐式绑定 | `obj.fn()` | 点号前的 obj |
| 显式绑定 | call/apply/bind | 指定对象 |
| new 绑定 | `new Fn()` | 新创建的实例 |

- 高频陷阱
  - 隐式丢失：`const f = obj.fn; f()` → 默认绑定
  - 回调传参丢失：`setTimeout(obj.fn)` → 默认绑定
  - 显式绑 null/undefined → 实际指向 window（bind 传 null 常用于只借参数）
- 追问：箭头函数呢？——没有自己的 this，沿用词法外层，不受四条规则影响

### 12. call、apply、bind 的区别？手写思路？

**结论：call/apply 立即调用（仅传参形式不同），bind 返回绑定了 this 的新函数。**

- 对比

| | 调用时机 | 参数形式 | 返回 |
| --- | --- | --- | --- |
| `fn.call(ctx, a, b)` | 立即执行 | 逐个传 | 函数返回值 |
| `fn.apply(ctx, [a, b])` | 立即执行 | 数组/类数组 | 函数返回值 |
| `fn.bind(ctx, a)` | 不执行 | 可预设参数（偏函数） | 新函数 |

- 手写 call（核心思路：把函数临时挂到 ctx 上转成隐式绑定）

  ```js
  Function.prototype.myCall = function (ctx, ...args) {
    ctx = ctx == null ? globalThis : Object(ctx)
    const key = Symbol('fn')
    ctx[key] = this            // 把函数挂到 ctx 上 → 隐式绑定
    const bound = ctx[key]
    const res = bound(...args) // 此时 this 即 ctx
    delete ctx[key]
    return res
  }
  ```

- 手写 apply（与 call 唯一差别：第二参是数组，做容错）

  ```js
  Function.prototype.myApply = function (ctx, args = []) {
    ctx = ctx == null ? globalThis : Object(ctx)
    const key = Symbol('fn')
    ctx[key] = this
    const bound = ctx[key]
    const res = bound(...Array.from(args))  // 容错类数组/非数组入参
    delete ctx[key]
    return res
  }
  ```

- 手写 bind（三个考点：返回新函数、预设参数、new 时 this 失效）

  ```js
  Function.prototype.myBind = function (ctx, ...preset) {
    const fn = this
    function bound(...args) {
      // new 调用时 this 指向新实例，此时绑定的 ctx 失效（new 优先级更高）
      return fn.apply(this instanceof bound ? this : ctx, [...preset, ...args])
    }
    // 保住原型链：new 出来的实例仍能访问原函数原型方法
    bound.prototype = Object.create(fn.prototype)
    return bound
  }
  ```

- bind 追问
  - 返回的函数再 new：this 失效、指向新实例（new 优先级更高）
  - 要保留原型：中间桥接 `function F(){}; F.prototype = this.prototype`

### 13. 箭头函数与普通函数的区别？

**结论：箭头函数没有自己的 this/arguments/prototype，不可 new，this 沿词法继承且永不可改。**

- 区别清单
  - this：定义时继承外层词法作用域，call/apply/bind 改不动
  - 无 `arguments`（可用 rest 参数 `...args` 替代）
  - 无 `prototype`，**不能作为构造函数**（new 报错）
  - 不能用 `yield`（不能作 Generator）
- 经典示例

  ```js
  var id = 'GLOBAL'
  const obj = {
    id: 'OBJ',
    a() { console.log(this.id) },   // 'OBJ'
    b: () => console.log(this.id),  // 'GLOBAL'：对象字面量不创建作用域
  }
  ```

- 追问：什么场景该用/不该用？
  - 适合：回调、需要沿用外层 this 的场景（定时器、数组方法）
  - 不适合：对象方法（this 会指向全局）、原型方法、需要动态 this 的 DOM 回调

### 14. 什么是柯里化与偏函数？手写 curry？

**结论：柯里化把多参函数转成逐个收参的函数链，偏函数一次预设部分参数；实现核心都是闭包缓存参数，凑够原函数参数个数才执行。**

- 手写 curry（高频）

  ```js
  function curry(fn) {
    return function curried(...args) {
      if (args.length >= fn.length) return fn.apply(this, args)
      return (...rest) => curried.apply(this, [...args, ...rest])
    }
  }
  const add3 = (a, b, c) => a + b + c
  curry(add3)(1)(2)(3)  // 6
  curry(add3)(1, 2)(3)  // 6，支持一次传多个
  ```

  - 判据：`fn.length` 决定「收够没有」；不够就返回继续收参的新函数
  - 追问：`fn.length` 的坑——有默认参数/剩余参数的形参不计入 length
- 偏函数
  - 固定一部分参数、留一部分待传，`bind` 的预设参数就是典型偏函数
  - 柯里化是「逐个收」，偏函数是「一次收一部分」，不必凑满
- 使用场景
  - 参数复用：用柯里化定制不同前缀的日志函数、不同正则的校验函数
  - 延迟执行与函数组合（配合 compose/pipe）
- 子层级：**纯函数与副作用**
  - 纯函数：相同输入恒得相同输出，且不修改外部状态——可缓存（memoize）、可测试、并发安全
  - 副作用：修改外部变量、IO 操作、原地改入参；对照：`map/filter` 是纯的，`sort/splice` 原地改数组就不是

## 四、原型与继承

### 15. 对原型与原型链的理解？

**结论：函数有 prototype，对象有隐式原型 __proto__ 指向构造函数的 prototype；属性查找沿链向上，终点是 null。**

- 三角关系
  - `构造函数.prototype === 实例.__proto__`
  - `构造函数.prototype.constructor === 构造函数`
  - 实例共享 prototype 上的属性方法
- 原型链查找
  - 读属性：自身 → `__proto__` 一路向上 → `Object.prototype.__proto__ === null` 终止
  - 写属性：只在自身上创建/修改（不修改原型）
- 高频追问：`Function.__proto__ === Object.prototype`？
  - 错。`Function.__proto__ === Function.prototype`（Function 是自身的实例）
  - `Object.__proto__ === Function.prototype`（Object 是 Function 的实例）
  - 所有函数的 `__proto__` 都指向 `Function.prototype`
- 追问：为什么用原型？
  - 方法共享一份，省内存；class 本质就是原型链的语法糖

### 16. new 操作符做了什么？手写实现？

**结论：建空对象挂原型 → 绑 this 执行构造函数 → 返回值为对象则用它，否则返回新对象。**

- 四步
  - 创建空对象，`__proto__` 指向构造函数的 `prototype`
  - this 指向该对象并执行函数体
  - 若构造函数显式返回**对象**，则用它替换；返回原始值忽略
  - 否则返回新对象
- 手写（压缩版）

  ```js
  function myNew(Ctor, ...args) {
    const obj = Object.create(Ctor.prototype)
    const res = Ctor.apply(obj, args)
    return res instanceof Object ? res : obj
  }
  ```

- 追问：ES6 `new.target`？
  - 构造函数内拿到被 new 的类，可用于防误调用（直接调用时 new.target 为 undefined）

### 17. JS 有哪几种继承方式？哪种最好？

**结论：寄生组合式继承是 ES5 的最优解；ES6 的 class extends 本质就是它。**

| 方式 | 思路 | 缺陷 |
| --- | --- | --- |
| 原型链继承 | `Child.prototype = new Parent()` | 引用类型属性被所有实例共享；创建 Child 实例时无法向 Parent 传参 |
| 构造函数继承 | `Parent.call(this)` | 只继承实例属性，拿不到原型方法 |
| 组合继承 | 上两者结合 | Parent 构造函数被调两次（一次设实例、一次设原型） |
| **寄生组合式** | `Child.prototype = Object.create(Parent.prototype)` + 修正 constructor + `Parent.call(this)` | 无明显缺陷，最优 |
| class extends | 语法糖，内部即寄生组合式 | —— |

- 寄生组合式核心三行

  ```js
  Child.prototype = Object.create(Parent.prototype)
  Child.prototype.constructor = Child
  function Child(...args) { Parent.call(this, ...args) }
  ```

- 追问：class 与构造函数的差异？
  - class 内部严格模式、方法不可枚举、必须 new 调用、有 `new.target`、 extends 能继承静态属性（原生构造函数也能继承）

## 五、ES6+ 核心

### 18. Proxy 与 Reflect 的作用？和 defineProperty 的区别？

**结论：Proxy 代理整个对象的所有底层操作（13 种 trap），Reflect 收拢语言内部方法保持操作原子性。**

- Proxy 能力
  - get/set/has/deleteProperty/apply/construct 等 trap
  - 可拦截新增属性（defineProperty 做不到，Vue2 为此要 `$set`）
- 与 `Object.defineProperty` 对比

| | Proxy | defineProperty |
| --- | --- | --- |
| 监听范围 | 整个对象操作（含新增/删除属性、索引） | 单个属性读写 |
| 数组 | 天然支持 | 需重写数组方法 |
| 兼容性 | ES6，不可 polyfill | ES5 |
| 性能 | 初始化快，运行期有代理开销 | 初始化递归深 |

- Reflect
  - 与 trap 一一对应的默认行为，替代散落的静态方法
  - 返回布尔/结果值，配合 Proxy 避免手动 try/catch
- 关联：Vue3 响应式 = Proxy + Reflect（lazy 依赖收集）；追问可延伸到「Proxy 嵌套对象要递归代理、访问时才代理」

### 19. Map/Set 与 WeakMap/WeakSet 的区别？

**结论：Map/Set 强引用可遍历；Weak 系列键/值必须是对象且弱引用、不可遍历，用于不阻止 GC 的关联存储。**

- Map vs Object（高频）

| | Map | Object |
| --- | --- | --- |
| 键类型 | 任意值（对象/函数/原始值） | string / Symbol |
| 顺序 | 插入序，可迭代 | 键序有规则但语义弱 |
| 大小 | `size` | 手动算 |
| 频繁增删 | 更优 | —— |

- Set：去重首选（`[...new Set(arr)]`），NaN 也能去
- WeakMap/WeakSet
  - 键（WeakMap）必须是对象，弱引用，对象无其他引用即可被 GC
  - 不可遍历、无 size、无 clear（因为内容随时可能被回收）
- 应用
  - 给 DOM/组件实例挂元数据不防回收
  - 深拷贝处理循环引用（Q4）
  - 私有属性（早期 class 私有字段方案）
- 追问：WeakMap 怎么「遍历」？——不能用，需要遍历就说明该用 Map

### 20. ES Module 与 CommonJS 的区别？

**结论：ESM 静态（编译期确定依赖、可 tree-shaking、值引用），CJS 动态（运行时加载、值拷贝）。**

| | ESM | CommonJS |
| --- | --- | --- |
| 加载时机 | 编译期静态分析 | 运行时同步 require |
| 输出 | 值的**引用**（live binding，导出变化随取随新） | 值的**拷贝**（导出后与内部脱钩） |
| this | undefined | 指向当前模块 |
| 加载方式 | 异步（可顶层 await） | 同步阻塞 |
| Tree-shaking | 支持 | 不支持 |
| 浏览器 | 原生 `<script type="module">` | 不支持 |

- 高频追问：循环引用两者的表现？
  - CJS：先加载的部分拿到未完成 exports（部分导出）
  - ESM：靠 live binding，声明提升 + 引用未求值时访问会 TDZ 报错
- 追问：为什么打包器只对 ESM 做 tree-shaking？——静态结构在编译期可知，CJS 的 require 是运行时表达式

## 六、数组与对象

### 21. 数组去重与扁平化怎么做？

**结论：去重首选 Set；扁平化首选 flat(Infinity)，手写用递归或 reduce。**

- 去重

  ```js
  ;[...new Set(arr)]                       // 最简，NaN 也可
  arr.filter((v, i) => arr.indexOf(v) === i) // 不支持 NaN（indexOf 判不了）
  ```

  - 对象数组去重：Map 按唯一键过滤
- 扁平化

  ```js
  arr.flat(Infinity)               // 原生
  function flatten(arr) {
    return arr.reduce((acc, v) =>
      acc.concat(Array.isArray(v) ? flatten(v) : v), [])
  }
  ```

  - 追问：`flat` 不传参只展一层；Generator + `yield*` 也可实现惰性扁平

## 七、异步编程

### 22. 事件循环（Event Loop）是什么？宏任务与微任务？

**结论：单线程 + 任务队列；每轮循环先清空全部微任务，再取一个宏任务；微任务优先级恒高于宏任务。**

- 任务分类
  - 宏任务：`setTimeout/setInterval`、I/O、UI 渲染、`script`（整体代码）
  - 微任务：`Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`、`await` 后续
- 执行模型
  - 同步代码（一轮宏任务）→ 清空微任务队列 → 渲染时机 → 下一个宏任务 → 循环
- 必会输出题

  ```js
  console.log('start')
  setTimeout(() => console.log('timeout'), 0)
  Promise.resolve().then(() => console.log('then1'))
    .then(() => console.log('then2'))
  console.log('end')
  // start → end → then1 → then2 → timeout
  ```

- 进阶追问：嵌套输出题（宏任务里再产生微任务）

  ```js
  setTimeout(() => {
    console.log('t1')
    Promise.resolve().then(() => console.log('p1'))
  }, 0)
  Promise.resolve().then(() => {
    console.log('p2')
    setTimeout(() => console.log('t2'), 0)
  })
  // p2 → t1 → p1 → t2（微任务在当前宏任务后立刻清空）
  ```

- 追问：为什么微任务要在渲染前清空？——微任务属于当前任务的一部分，保证状态一致后才到渲染机会
- 提醒：浏览器与 Node 的事件循环阶段不同（Node 有阶段+process.nextTick），被问 Node 再展开

### 23. Promise 的状态与静态方法？

**结论：三种状态单向不可逆；四个静态方法按「何时落定、失败如何传播」记。**

- 状态
  - `pending → fulfilled / rejected`，一旦落定不可变更
  - then 返回**新 Promise**，支撑链式；值穿透：then 传非函数时透传上一结果
  - 背景：链式调用解决的就是回调地狱——嵌套回调的横向缩进、每层各自处理错误，改为纵向链式 + 末端统一 catch
- 静态方法对比

| 方法 | 落定时机 | 失败行为 |
| --- | --- | --- |
| `all` | 全部成功 | **一个失败即失败**（快速失败） |
| `allSettled` | 全部落定 | 不会失败，逐项给 status |
| `race` | 第一个落定（无论成败） | —— |
| `any` | 第一个成功 | 全失败才 reject（AggregateError） |

- 选型话术
  - 并行且都要成功 → all；容错聚合 → allSettled；超时控制 → race；多源任一可用 → any
- 缺点（追问）
  - 无法取消、pending 时无进度信息、错误要显式捕获（未处理的 rejection 静默）

### 24. async/await 的原理与执行顺序？

**结论：async 函数是 Generator + Promise 自动执行的语法糖；await 把后面的代码挂成微任务，函数在此暂停让出线程。**

- 基本规则
  - async 函数**始终返回 Promise**，return 值被包装
  - await 等非 Promise 值：立即得到该值（但后续代码仍进微任务）
  - await 等 Promise：等其落定，得到 resolve 值；reject 则抛异常（try/catch 捕获）
- 执行顺序铁律
  - 遇到 await：**先执行 await 右侧表达式 → 让出线程跑外面的同步/微任务 → 函数剩余部分作为微任务排队**
- 必会输出题

  ```js
  async function a() {
    console.log('a-1')
    await b()
    console.log('a-2')       // 微任务
  }
  async function b() { console.log('b') }
  setTimeout(() => console.log('timeout'), 0)
  a()
  console.log('sync')
  // a-1 → b → sync → a-2 → timeout
  ```

- 高频追问：多个 await 是串行还是并行？
  - 书写顺序串行，但相互无依赖时是**伪串行**（白等）——应先 `Promise.all` 或先拿 promise 再 await
- 原理追问：Generator 怎么变成 async？
  - 手动反复调 `next()` + 把 Promise 结果传回（co 库的老思路），现在由引擎自动化

### 25. Promise 的错误处理与并发控制怎么做？

**结论：错误用 try/catch 或 .catch 就地捕获；竞态用「标记最新请求」或 AbortController 作废旧请求。**

- 错误处理要点
  - async 函数内 try/catch；调用侧 `.catch`
  - 链上任一环节 reject 会跳到最近的 catch；漏写 catch → unhandledrejection
  - `Promise.all` 一个失败全失败——需要逐项结果时换 `allSettled`
- 竞态防御（项目高频：搜索联想旧结果覆盖新结果）

  ```js
  let latest = 0
  async function search(q) {
    const id = ++latest
    const res = await fetchList(q)
    if (id !== latest) return   // 已有更新的请求，丢弃本次结果
    render(res)
  }
  ```

  - 更标准：`AbortController` 真正取消请求（配合 axios/fetch 的 signal）
- 并发控制（追问：100 个请求限流 5 个怎么发？）
  - 思路：固定大小的工作池——队列 + 完成一个补一个；说清「请求Promise存起来，某个完成时从队列取下一个」

### 26. setTimeout / setInterval 有哪些陷阱？

**结论：定时器不精确（受任务队列阻塞）、this 指向全局、setInterval 可能堆叠执行。**

- setTimeout
  - `delay` 是「最早等待时间」，前面宏任务没跑完就一直排队
  - 嵌套 5 层后 Chrome 对 4ms 以下强制钳制；后台标签页最低 1s
- setInterval 堆叠问题
  - 回调执行时间 > 间隔时会连续触发堆积 → 改用**链式 setTimeout**（执行完再排下一次）
- 替代
  - 动画/帧同步用 `requestAnimationFrame`（跟随渲染帧，标签页隐藏自动暂停）
  - 长任务切片用 `requestIdleCallback` / `scheduler.postTask`

### 27. 手写一个简易 Promise？

**结论：核心是状态机（三态单向不可逆）+ 回调队列（pending 期收集、落定后冲刷）+ then 返回新 Promise 支撑链式。**

- 最小可用实现

  ```js
  class MyPromise {
    constructor(executor) {
      this.state = 'pending'
      this.value = undefined
      this.callbacks = []                       // pending 期收集 {onFulfilled, onRejected}
      const resolve = (value) => {
        if (this.state !== 'pending') return    // 状态单向不可逆
        this.state = 'fulfilled'
        this.value = value
        this.callbacks.forEach(cb => cb.onFulfilled(value))
      }
      const reject = (reason) => {
        if (this.state !== 'pending') return
        this.state = 'rejected'
        this.value = reason
        this.callbacks.forEach(cb => cb.onRejected(reason))
      }
      try { executor(resolve, reject) }         // 执行器同步执行
      catch (e) { reject(e) }                   // 抛错也要转成 reject
    }
    then(onFulfilled, onRejected) {
      // 返回新 Promise → 链式的根基
      return new MyPromise((resolve, reject) => {
        const run = (cb, val) => queueMicrotask(() => {   // 回调必须异步执行
          try {
            const res = cb(val)
            res instanceof MyPromise ? res.then(resolve, reject) : resolve(res)
          } catch (e) { reject(e) }
        })
        if (this.state === 'fulfilled') run(onFulfilled, this.value)
        else if (this.state === 'rejected') run(onRejected, this.value)
        else this.callbacks.push({
          onFulfilled: v => run(onFulfilled, v),
          onRejected: v => run(onRejected, v),
        })
      })
    }
  }
  ```

- 五个得分点（面试官在听什么）
  - 状态机：三态 + 单向不可逆，resolve/reject 里先判 pending
  - executor 同步执行，内部抛错要 `try/catch` 转 reject
  - then **返回新 Promise**——链式调用的根基；返回值是 Promise 要等它落定（解包）
  - 回调异步执行：规范要求，用 `queueMicrotask` 模拟（不能用 setTimeout，那会变成宏任务时序）
  - pending 期回调先进队列、落定后统一冲刷——这就是「then 先于 resolve 注册也能收到结果」的原因
- 追问：catch 怎么实现？——`catch(fn)` 就是 `then(null, fn)` 的语法糖
- 追问：值穿透怎么来的？——then 的参数传非函数时给默认透传回调
- 追问：all/race 怎么加？——all：计数器 + 逐个 resolve、一个 reject 全 reject；race：第一个落定者定胜负

## 八、高频手写与进阶

### 28. 防抖与节流的区别与实现？

**结论：防抖「停手后才执行一次」，节流「按频率均匀执行」；搜索输入用防抖，滚动/按钮用节流。**

| | 触发模型 | 典型场景 |
| --- | --- | --- |
| 防抖 debounce | 停止触发 n 秒后执行，期间再触发则重新计时 | 搜索输入、resize 结束、表单校验 |
| 节流 throttle | 单位时间内最多执行一次 | 滚动加载、按钮防连点、鼠标移动 |

- 实现（时间戳版节流 + 定时器版防抖）

  ```js
  function debounce(fn, wait) {
    let timer
    return function (...args) {
      clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), wait)
    }
  }
  function throttle(fn, wait) {
    let last = 0
    return function (...args) {
      const now = Date.now()
      if (now - last >= wait) { last = now; fn.apply(this, args) }
    }
  }
  ```

- 追问：防抖要不要「立即执行」版本？——要，首次点击立即响应（按钮防重复提交场景），实现上加 firstCall 分支
- 追问：`this` 和参数怎么保住？——返回函数里 `fn.apply(this, args)`，不能写成箭头函数丢 this

### 29. DOM 事件流是什么？事件委托的原理与优缺点？

**结论：事件流三阶段 = 捕获 → 目标 → 冒泡；事件委托利用冒泡把子元素的监听收拢到父级，一次注册管一片。**

- 三阶段
  - 捕获：window → document → … → 目标父级（由外向内）
  - 目标：到达 target，按**注册顺序**执行（此阶段不分捕获/冒泡）
  - 冒泡：由内向外逐层上抛
- `addEventListener` 第三个参数
  - 布尔：`true` 挂捕获阶段，`false`（默认）挂冒泡阶段
  - 对象形式：`{ capture, once, passive }`
    - `once`：触发一次后自动移除
    - `passive`：承诺不调 `preventDefault`——滚动类事件加它能解锁合成器线程滚动，Chrome 对 document 级 wheel/touch 默认 passive
- 事件委托

  ```js
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (!btn) return
    handle(btn.dataset.id)
  })
  ```

- 委托的优点
  - 监听器数量骤减（100 个 item → 1 个监听）
  - **动态子元素自动生效**——新增节点无需重新绑定
- 委托的缺点/边界
  - `e.target`（实际点击的）与 `e.currentTarget`（挂监听的）要分清，需 `closest` 向上找
  - 不冒泡的事件不可委托：`focus/blur`（用 `focusin/focusout` 替代）、`scroll`（可在捕获阶段委托）
- 追问：`stopPropagation` 与 `stopImmediatePropagation` 区别？
  - 前者阻止继续传播；后者连**同一元素上后注册的监听**也一起停
- 追问：`preventDefault` 会阻止冒泡吗？——不会，它只取消默认行为（如链接跳转），传播照常

### 30. 什么是 JS 沙箱？实现思路有哪些？

**结论：沙箱 = 给不可信代码一个受控的全局执行环境，写不出去、读可控制；从 with+Proxy 到快照到 iframe/Worker，隔离强度递增。**

- 为什么需要
  - 微前端子应用共用一个 window（qiankun 的核心问题）
  - 在线代码运行器（playground / 低代码表达式）
  - 第三方脚本 / 插件系统
- 方案梯度

| 方案 | 思路 | 局限 |
| --- | --- | --- |
| `with` + `Proxy` 假 window | 标识符解析进沙箱对象 | 需要 `new Function`，逃逸口多 |
| Proxy 单/多实例沙箱 | 拦截读写、记录增量、卸载还原 | 同上；qiankun proxySandbox 主方案 |
| 快照沙箱 | 激活时拍 window 快照、卸载时 diff 还原 | 不支持 Proxy 的降级方案；全量 diff 慢 |
| iframe | 真 window，天然隔离 | 通信/路由/样式割裂，成本高 |
| Web Worker | 独立线程，无 DOM | 通信要序列化，场景受限 |

- Proxy 沙箱核心（面试写出这段就够）

  ```js
  function createSandbox() {
    const fakeWindow = new Proxy({}, {
      has: () => true,                              // 让 with 认为所有标识符都在沙箱内
      get: (t, k) => (k in t ? t[k] : window[k]),   // 沙箱没有的读，受控回退真 window
      set: (t, k, v) => { t[k] = v; return true },  // 写只进沙箱，不污染全局
    })
    return (code) =>
      new Function('window', `with (window) { ${code} }`)(fakeWindow)
  }
  ```

- 关键点（追问区）
  - `has` 恒返回 true 是 `with` 生效的前提：所有裸标识符都先查 fakeWindow
  - 多实例沙箱：每个子应用一份 fakeWindow 互不可见；卸载时把增量改动还原，再激活时恢复
  - 逃逸口要心里有数：`setTimeout`、事件回调、`Date`、动态 script——严格沙箱要连这些一起代理
  - 加分：`ShadowRealm` 提案是未来的语言级隔离方案；真正安全级的不可信代码只信 iframe/Worker/服务端
