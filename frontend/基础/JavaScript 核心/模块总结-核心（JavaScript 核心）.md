# 模块总结-核心（JavaScript 核心）

> 精简核心版：按篇分组、抽出高频/重要的知识点——成员丰富的主题展开明细，要点型知识点列清单、点到为止。选点按「面试命中度 / 日常复用度」等维度（见[文档组织规范](../../../文档组织规范.md)）。详细知识树见[《模块总结 · JavaScript 核心》](./总结.md)。

## 知识主线（一句话）

JS 的轴线是**对象与机制**：01 的值/引用定存储，02 的作用域与闭包定"变量怎么被看见与持有"，03 的原型链定"对象怎么沿链复用、new/instanceof 怎么在上面工作"，04 用事件循环让单线程并发，05 的 GC 用可达性判生死，06 把语言接到宿主（DOM/事件/观察者/fetch），07 把 this/原型/拷贝/异步全部手写验证——回答"对象世界从创建到回收、再到驱动页面"。

## 高频核心点

### 01 数据类型与变量

- **值 vs 引用**：基本类型值存栈、赋值拷贝值互不影响；引用类型栈存地址、堆存对象、赋值共享同一对象；`===` 基本类型比值、引用类型比地址（`{} === {}` 为 false）
- **假值清单**：`false/0/-0/0n/""/null/undefined/NaN`；空数组 `[]`、空对象 `{}`、`"0"` 都是真值
- **声明三兄弟**：默认 `const`、必要时 `let`、基本不用 `var`；`const` 锁的是绑定不是值
- **类型检测四法**：`typeof` 判基本类型（`typeof null === 'object'` 历史 Bug）；`instanceof` 判原型链关系；`Object.prototype.toString.call(x)` 最可靠、封装成 `getType`
- **隐式转换坑**：`+` 优先拼接（`'1'+2='12'`）；`==` 触发转换（`null==undefined` 为 true）；工程几乎总用 `===`，只留 `x == null`
- **NaN 与精度**：`NaN` 永不等于自身、判断用 `Number.isNaN`；`0.1+0.2!==0.3` 用整数运算 / `Number.EPSILON` 解决

### 02 作用域与闭包

- **词法作用域**：嵌套关系由书写位置决定、与调用位置无关——理解闭包的关键前提
- **var/let/const**：`var` 提升为 undefined、无块级作用域；`let`/`const` 有 TDZ、块级、不可重复声明；`for(let i)` 每次迭代独立绑定
- **闭包本质**：内层函数 + 外层词法环境；外层函数执行完变量因被引用而不回收
- **闭包三应用**：私有变量（银行账户）、柯里化（分步收参）、记忆缓存
- **闭包三陷阱**：大对象常驻泄漏（置 null）、循环 `var` 捕获同一变量（`let`/IIFE/bind 修复）、`this` 丢失（箭头函数修复）
- **this 四规则**：普通调用 → 方法调用 → `call/apply/bind` → `new`（优先级递增）；箭头函数捕获外层 `this`、不能 `new`、没有 `arguments`
- **常见陷阱**：`obj.fn` 单独取出调用 `this` 变回普通调用；用箭头函数或显式 bind 修复

### 03 原型与继承

- **三件套**：`prototype` 函数独有、`__proto__` 对象独有（`p.__proto__ === Ctor.prototype`）、`constructor` 指回函数形成闭环
- **原型链查找**：先查自身再沿 `__proto__` 向上直到 `Object.prototype → null`；`hasOwnProperty` 区分自身/继承
- **new 四步**：建对象 → `Object.create(Ctor.prototype)` 接原型 → 以新对象为 this 执行 → 返回引用类型则用之、否则返回新对象
- **继承演进**：原型链继承（引用共享）→ 借用构造（无法复用方法）→ 组合继承（父构造调用两次）→ 寄生组合继承（`Object.create(Parent.prototype)` 最优、class 的底层）
- **class 是语法糖**：内部严格模式、方法不可枚举、声明有 TDZ 且必须 new；`extends + super` 本质是 `Object.setPrototypeOf` 接线 + 执行父构造
- **instanceof**：判断 `B.prototype` 是否在 `a` 的原型链上；基本类型无原型链、`1 instanceof Number` 为 false

### 04 异步编程与事件循环

- **异步本质**：单线程 JS 把耗时操作交给宿主（Web API / libuv），结果就绪再回调压回主线程，不阻塞
- **Promise 三态不可逆**：pending → fulfilled/rejected 锁死；`then` 返回新 Promise 摊平回调地狱
- **静态方法分工**：`all` 一败俱败、`allSettled` 等全部落定永不 reject、`race` 取首个落定（超时控制）、`any` 取首个成功
- **async/await**：总返回 Promise；`await` 暂停当前 async 函数；互不依赖任务用 `Promise.all` 并发（别顺序 await）
- **事件循环口诀**：同步 → 当前宏任务结束一次性清空全部微任务（含新增）→ UI 渲染/rAF → 下一个宏任务；微任务能饿死渲染
- **浏览器 vs Node**：Node 有 timers/poll/check 等六阶段、`process.nextTick` 比 Promise 微任务还高
- **定时器 API 分工**：setTimeout 非精确计时；动画用 `requestAnimationFrame`（后台自动暂停）；闲时任务用 `requestIdleCallback` 分片

### 05 内存管理与垃圾回收

- **栈与堆**：栈存值/引用地址、函数结束自动弹出；堆存对象本体、生命周期比函数作用域长、交给 GC
- **两大策略**：标记清除从根出发判可达性、能处理循环引用（现代基石）；引用计数无法处理循环引用
- **V8 分代**：新生代 Scavenge 半空间复制、多次存活晋升老生代（标记清除 + 标记整理）
- **降低停顿**：增量标记、并发标记（后台线程）、惰性/并发清理——"拆小、挪后台"
- **五类泄漏**：意外全局变量（`use strict` 拦截）、闭包固化大对象（最小捕获+置空）、事件监听未移除（removeEventListener/AbortController）、定时器未清理、分离 DOM（置空引用）
- **检测**：DevTools Memory 三招——Performance 看曲线、Heap Snapshot 按 Retained Size 找大对象、分配采样找持续分配者
- **WeakMap/WeakSet**：弱引用不阻止回收、键必须为对象、不可迭代——缓存/私有数据用它不泄漏

### 06 DOM 与浏览器 API

- **查询节点**：`querySelectorAll` 返回静态 NodeList、`getElementsByTagName/ClassName` 返回**活**集合（插入 li 后 length 跟着变）；拿到集合先 `Array.from()` 再遍历
- **改动节点**：逐条 appendChild / DocumentFragment / innerHTML 实测同量级（都只标脏、布局攒到渲染做）；`innerHTML` 的代价是重建整棵子树（丢输入值/焦点/监听器）
- **强制同步布局**：读写交替让每次读强制一次布局（差 40~115 倍）；会强制的是 `offset*/getBoundingClientRect/getComputedStyle`；对策—读写分离 + 写合批到 rAF；动画只用 `transform/opacity`
- **事件流**：捕获→目标→冒泡，默认冒泡；`target` 真实目标不变、`currentTarget` 是绑定的元素、**回调结束置 null**
- **事件委托**：容器挂 1 个监听器 + `e.target.closest(sel)`，动态节点不重绑也命中；focus/blur 不冒泡改用 focusin/focusout
- **解绑三招**：`removeEventListener(type, fn, capture)` 匹配严格容易解不掉；`{ once:true }` 一次即摘；`{ signal }` + `AbortController` 一段管一组
- **三个观察者**：IO 配 `rootMargin` 扩大判定边界做懒加载提前量；RO 盯自身内容盒、回调里改尺寸会循环告警；MO 回调走微任务、任何环境都收到
- **fetch**：4xx/5xx 不 reject，必须判 `res.ok`；响应体只能读一次；超时 `AbortSignal.timeout`、取消 `AbortController.abort`，两者都是"我方取消"不能当故障上报；竞态优先序号守卫

### 07 手写实现与源码

- **call/apply/bind**：临时把函数挂到 `thisArg` 上调用（Symbol 做 key、用完 delete）；`null/undefined` 指全局、基本类型用 `Object()` 包装；`bind` 闭包固化 this
- **myNew**：`Object.create(Ctor.prototype)` + 以新对象为 this 执行 + 返回引用类型才覆盖
- **深拷贝**：`WeakMap` 防循环引用；`Date/RegExp` 特判；`Symbol` 键用 `Reflect.ownKeys`
- **手写 Promise**：状态单向不可逆；`then` 返回新 Promise、回调放 `queueMicrotask` 保证永远异步；值穿透要补默认回调；`all` 用下标存结果保证顺序
- **防抖 vs 节流**：防抖 `clearTimeout` 重置（末次生效）；节流时间戳版首触执行/定时器版末次也执行；都要保存 `this` 与 `...args`
- **EventBus/柯里化/compose**：对象按 callbackId 精确取消；`once` 用 `one` 前缀标记；柯里化用 `fn.length` 判参齐、`compose` 用 `reduceRight`

> 答题框架见面试题页；此页只做知识锚点清单。
> 参考：完整版 [总结.md](./总结.md) · 面试题 [面试题.md](./面试题.md)