# 参考答案-初级

> 对应 [quiz-basic.md](./quiz-basic.md) 的 44 道初级题目，逐题给出简洁正确的要点答案。

---

## 一、HTML / CSS

### 1. src 和 href 的区别
- `src`（source）：指向外部资源并**嵌入当前元素**，加载时会**阻塞/暂停**其他资源下载，如 `script`、`img`。
- `href`（hypertext reference）：**建立当前文档与目标资源之间的链接，不替换内容**，可**并行下载不阻塞**，如 `link`、`a`。
- 这也是 script 建议放底部、CSS 建议用 link（而非 @import）的原因。

### 2. HTML 语义化
- 用**有意义的标签**（header/nav/main/section/article/aside/footer 等）描述内容结构。
- 好处：利于 **SEO**（搜索引擎爬虫）、增强**可读性与可维护性**、提升**无障碍/屏幕阅读器体验**。

### 3. DOCTYPE 的作用
- 告诉浏览器以**标准模式（Standards）还是怪异模式（Quirks)** 解析文档。
- 标准模式：遵循 CSS 规范盒模型；怪异模式：使用旧版 IE 的盒模型与 bug 行为。
- 声明 `<!DOCTYPE html>` 可避免怪异模式。

### 4. img 的 alt 和 title
- `alt`：图片**加载失败或无法显示时的替代文本**，并利于 SEO/无障碍。
- `title`：**鼠标悬停时的提示文本**，不一定是图片的替代描述。

### 5. CSS 盒模型
- 标准盒模型：`width/height` 只包含 **content**，总宽 = content + padding + border。
- 怪异盒模型（IE）：`width/height` 包含 **content + padding + border**。
- 通过 `box-sizing: border-box` 使用怪异模型。

### 6. 水平垂直居中（至少 3 种）
1. flex：父 `display:flex; justify-content:center; align-items:center`。
2. grid：父 `display:grid; place-items:center`。
3. 绝对定位 + 负 margin：`position:absolute; left:50%; top:50%; margin-left:-w/2; margin-top:-h/2`。
4. 绝对定位 + transform：`left:50%; top:50%; transform:translate(-50%,-50%)`。
5. margin:auto 方案（已知宽度）：`position:absolute; inset:0; margin:auto`。

### 7. display:none 和 visibility:hidden
- `display:none`：**不占据布局空间**，元素从文档流中移除，不可交互，触发 reflow。
- `visibility:hidden`：**占据空间但不可见**，元素仍在文档流中，不可交互，会 repaint。
- 补充：`opacity:0` 占据空间但可交互。

### 8. position 取值
- `static`（默认）、`relative`（相对自身原位置）、`absolute`（相对最近的非 static 祖先定位）、`fixed`（相对浏览器视口）、`sticky`（相对滚动容器在某一范围内吸顶）。

### 9. CSS 选择器优先级
- 权重：`!important` > 行内样式 > ID(100) > 类/伪类/属性(10) > 元素/伪元素(1) > 通配符(0)。
- 相同权重时，**后面的样式覆盖前面的**；`!important` 最高（除非又有更高优先级 !important）。

### 10. 什么是 BFC
- BFC（块格式化上下文）是一个**独立的渲染区域**，内部布局与外界隔离。
- 作用：**清除浮动、阻止 margin 合并（外边距折叠）、防止元素被浮动覆盖**。
- 触发方式：`overflow` 非 visible、`display: flex/inline-block`、`float` 非 none、`position: absolute/fixed` 等。

### 11. flex: 1 的含义
- `flex: 1` = `flex: 1 1 0%`，即 `flex-grow:1; flex-shrink:1; flex-basis:0%`。
- 让项目能**等比例放大、可缩小，并以 0 为基础均分剩余空间**。

### 12. rem、em、px 的区别
- `px`：绝对像素单位。
- `em`：相对**当前元素 font-size**，基准随父级变化（级联）。
- `rem`：相对**根元素 html 的 font-size**，统一基准。
- 响应式：配合媒体查询或 `vw/vh`，或直接使用 `vw/vh` 做流式布局。

## 二、JavaScript

### 13. var、let、const 的区别
- `var`：函数作用域、可重复声明、**有变量提升（值 undefined）**。
- `let/const`：**块级作用域**、不可重复声明、存在**暂时性死区（TDZ）**。
- `const` 在声明时必须赋值，且**引用不可变**（对象内部可改）。

### 14. 作用域链与闭包
- 作用域链：变量查找时逐级向上查找的链式结构（内层→外层→全局）。
- 闭包：函数有权**访问其外部作用域变量**的机制，即便外部函数已返回。
- 应用：私有变量、防抖/节流、模块化、柯里化。注意**内存泄漏**。

### 15. JavaScript 数据类型
- 基础（原始）类型：`string、number、boolean、null、undefined、symbol、bigint`。
- 引用类型：`object（含 array、function、date 等）`。
- 判断数组：`Array.isArray()`、`Object.prototype.toString.call(arr) === '[object Array]'`、`arr instanceof Array`。

### 16. == 与 ===
- `===` 严格相等：需**类型和值都相同**。
- `==` 宽松相等：会做**隐式类型转换**后比较。
- `0 == '0'`：→ `true`（字符串 '0' 转数字 0）；而 `0 === '0'` 为 false。

### 17. 事件冒泡 / 捕获
- 捕获：从**顶层向目标元素**传播；冒泡：从**目标元素向顶层**传播。
- 阻止冒泡：`e.stopPropagation()`。
- 阻止默认行为：`e.preventDefault()`。
- 注册于 `addEventListener` 的第三个参数 `useCapture`（true 为捕获阶段）。

### 18. 事件委托
- 将子元素的事件**绑定到其公共父元素**，通过冒泡机制统一处理。
- 好处：减少内存、动态添加的子元素自动生效，性能更优。

### 19. this 指向规则
- 默认绑定（非严格模式 window / 严格模式 undefined）、隐式绑定（对象方法调用）、显式绑定（call/apply/bind）、new 绑定、箭头函数（继承外层 this）。
- 优先级：new > 显式 > 隐式 > 默认。

### 20. 防抖与节流
- **防抖（debounce）**：事件触发后延迟执行，若在间隔内再次触发则重新计时（适合输入搜索）。
- **节流（throttle）**：规定时间间隔内**最多执行一次**（适合滚动、resize）。

### 21. ES6 新增特性
- `let/const`、箭头函数、模板字符串、解构赋值、默认参数、`class`、`Promise`、模块化 `import/export`、`Map/Set`、`Symbol`、`Symbol.iterator`、扩展运算符、`async/await`（ES7）等。

### 22. Promise 的理解
- Promise 表示**异步操作的最终完成或失败**，有三种状态：`pending/fulfilled/rejected`，状态一经改变不可逆。
- 解决了**回调地狱**，支持链式调用 `.then/.catch/.finally`。
- 相关 API：`Promise.all/race/allSettled/any`。

### 23. 数组遍历的 map、forEach、filter
- `map`：对每项处理并**返回新数组**。
- `forEach`：仅遍历执行，**无返回值**，不改变原数组。
- `filter`：**过滤**满足条件的项，返回新数组。
- 其他：`reduce`（累加）、`some/every`（逻辑判断）。

### 24. 深拷贝与浅拷贝
- 浅拷贝：只复制**第一层**引用（如 `Object.assign`、展开运算符、`slice`）。
- 深拷贝：**递归复制所有层**，常用 `JSON.parse(JSON.stringify())`（但有局限：丢函数、undefined、Date 变成字符串、循环引用报错）；或使用 `structuredClone` / 手动递归 / lodash。

### 25. DOM 事件监听方式
- `onclick`（属性赋值，**只能绑定一个**，可覆盖）。
- `addEventListener`（可绑定**多个**，可选捕获/冒泡，可移除 `removeEventListener`）。
- 内联 `onclick="..."` 属性（不推荐）。

## 三、网络与浏览器

### 26. HTTP 与 HTTPS
- HTTPS 在 HTTP 外加了 **SSL/TLS 加密层**，数据加密传输、身份校验。
- HTTPS 更安全，但多一次握手、更耗时、需证书。

### 27. TCP 三次握手 / 四次挥手
- 三次握手：SYN → SYN+ACK → ACK，确认双方收发能力建立连接。
- 四次挥手：FIN → ACK → FIN → ACK，安全断开连接。

### 28. GET 与 POST
- GET：用于**获取资源**，参数在 URL 中、可缓存、有长度限制。
- POST：用于**提交数据**（创建/更新），参数在请求体、默认不缓存、相对安全。
- 语义上的不同，而非本质传输差异。

### 29. Cookie 与本地存储
- Cookie：**存储在客户端、随请求自动发送到服务端**，大小约 4KB，有有效期，可用于会话保持。
- localStorage：**永久（需手动清除）**，约 5MB，不随请求发送。
- sessionStorage：**会话级**，关闭标签页即清除。
- 适用：Cookie 用于登录态，localStorage 用于持久化大块数据。

### 30. 从输入 URL 到渲染
1. DNS 解析。
2. 建立 TCP 连接（三次握手）。
3. 发送 HTTP 请求，服务器响应返回 HTML。
4. 浏览器解析 HTML → 构建 DOM 树、CSSOM 树 → 合成渲染树 → 布局 → 绘制。
5. 解析到外部资源并行请求，遇到 script 阻塞直至解析执行。

### 31. 重绘与回流
- **回流（Reflow）**：布局/几何变化（尺寸、位置）导致的重新布局计算，代价高。
- **重绘（Repaint）**：仅外观变化（颜色、背景）不需重新布局。
- 避免：减少 DOM 操作、批量修改、`transform/opacity` 做动画（走合成层）、离线操作（documentFragment）。

### 32. script 的 async 和 defer
- `defer`：下载异步，但**在 DOM 解析完成后（DOMContentLoaded 之前）按顺序执行**。
- `async`：下载异步，**下载完立即执行**，不保证顺序。
- 无：同步阻塞解析。

### 33. 浏览器本地存储
- `localStorage`（持久、约 5MB）、`sessionStorage`（会话级）、`Cookie`（会随请求发送、约 4KB）、`IndexedDB`（结构化大容量数据）、`CacheStorage`（API/资源缓存，配合 Service Worker）。

## 四、框架

### 34. Vue 与 React 的区别
- Vue：**模板 + 响应式（mutable）**，数据自动追踪，API 更平缓，学习成本低。
- React：**JSX + 单向数据流（immutable）**，需要手动管理状态更新（setState），生态灵活。
- 两者都基于**虚拟 DOM** 进行更新优化。

### 35. v-if 与 v-show
- `v-if`：**不渲染该节点**（条件渲染），切换开销大，适合初始不显示的场景。
- `v-show`：始终渲染，只切换 `display`，适合频繁切换的场景。

### 36. Vue 响应式原理
- Vue2：`Object.defineProperty` **劫持 data 属性的 getter/setter**，依赖收集（Watcher）实现更新（有数组、新增属性需要 $set 的局限）。
- Vue3：使用 `Proxy` **代理整个对象**，更加灵活、性能更好。

### 37. Vue 中 data 为什么必须是函数
- 组件可被复用，若 `data` 是对象则**多个实例共享同一份引用**，导致数据互相污染。
- 用函数返回新对象，保证**每个组件实例拥有独立的数据**。

### 38. Vue 组件通信方式
- 父→子：`props`。
- 子→父：`$emit` 事件。
- 兄弟/任意：自定义事件（`$on/$emit`）、`Vuex`、`EventBus`、`provide/inject`、`$refs` 等。

### 39. React 的 state 与 props
- `props`：**由父组件传入、不可修改**的数据。
- `state`：**组件内部可改变**、驱动渲染的数据。
- 数据从 state/props 流经组件并决定 UI（单向数据流）。

### 40. React 中 key 的作用
- 帮助 React **识别列表项是否变更**，用于 diff 与复用 DOM。
- 使用**唯一且稳定**的 key（如 id），避免用 index（会导致状态错乱、性能问题）。

## 五、工程化

### 41. Git 常用命令
- 常用：`git init/add/commit/status/log/branch/checkout/merge/pull/push/clone/stash`。
- 团队协作使用分支 + pull request + rebase 等规范。

### 42. 包管理器与 lock 文件
- npm/yarn/pnpm 安装第三方依赖并管理版本。
- `package-lock.json`/`pnpm-lock.yaml` 锁定**精确依赖版本与依赖树**，保证不同环境安装一致，可复现构建。

### 43. Webpack 与 Vite 的区别
- Webpack：配置化、插件生态成熟，打包所有资源；缺点：冷启动/热更新较慢。
- Vite：**基于 ESM 原生 + 按需构建**，开发启动快、HMR 快；生产用 Rollup 打包。

### 44. Babel 的理解
- 将**新语法转译为兼容旧环境的语法**（ES6/TS/JSX → ES5）。
- 核心流程：解析（parse）→ 转换（transform）→ 生成（generate）；依赖 AST 与各种 preset/plugin。