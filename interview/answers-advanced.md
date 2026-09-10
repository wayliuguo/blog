# 参考答案-高级

> 对应 [quiz-advanced.md](./quiz-advanced.md) 的 36 道高级题目，逐题给出有深度的要点答案。

---

## 一、原理内功

### 1. 事件循环机制
- 单线程模型下，执行栈 + 任务队列（宏/微）驱动。
- 每轮事件循环：先执行同步任务 → 清空**整个微任务队列**（不断出队直到空）→ 取出**一个**宏任务执行 → 再清空微任务，如此往复。
- 微任务优先级高于宏任务，Promise/`queueMicrotask` 在下个宏任务前全部执行。
- 结合浏览器渲染时机：宏任务之间会做一次渲染/绘制（所以动画应结合 rAF）。

### 2. this 绑定优先级与 call/apply/bind
- 优先级：new 绑定 > 显式绑定(call/apply/bind) > 隐式绑定（对象方法）> 默认绑定。
- 箭头函数无 own this，向外层词法作用域查找，不可改变。
- 实现 call：在 target 上临时挂方法（用 `Symbol`），调用后删除；用 `Array.prototype.slice.call(arguments, 1)` 展开参数，返回结果。
- bind 实现需组合 apply + 柯里化预绑定参数。

### 3. V8 编译执行过程
- 源码 → 解析(Parse，生成 AST) → 解释器 Ignition 生成字节码运行。
- 高频代码被 TurboFan 等 **JIT 编译器优化为机器码**，并做隐藏类、内联缓存（IC）等优化。
- 配合即时编译监控热点函数，退化反优化（deopt）。

### 4. 防抖与节流实现及场景
- 防抖：`clearTimeout` + `setTimeout` 重新计时；适用输入搜索、resize 结束。
- 节流：时间戳/定时器实现，间隔内最多一次；适用滚动、上传进度、按钮防重复提交。
- 进阶：支持 `leading/trailing`、`cancel` 方法的完整实现；以及带返回值场景（用 Promise 包裹）。

### 5. 函数柯里化
- 将一个多参数函数转化为多个单参数函数的链式，支持**分批传参、延迟计算、提前固定部分参数**。
- 实现需维护累积参数数组，判断参数个数是否满足原函数形参（借助 `fn.length`），满足则执行否则返回新函数。
- 应用：参数复用、链式养成配置、配合函数式组合。

### 6. 手写 Promise（含常用方法）
- 核心状态机 Pending→Fulfilled/Rejected，不可逆；`then` 返回新 Promise 支持链式，用微任务（queueMicrotask）执行回调。
- `all`：计数 + 结果数组，全部 resolve 才 resolve，一个 reject 立即 reject；`allSettled`：等全部 settle 返回结果数组；`race`：谁先定态谁胜；`finally`：无论成败都执行且不改变结果（透传）。
- 关注：then 异常捕获、递归处理 thenable、一次性消费。

### 7. 完善的事件总线
- 设计：`on(event, fn, {once, context, namespace})`、`off`（精确移除/全局移除/通配）、`emit`（异步 or 同步、带参数）、`once`、清空。
- 支持通配匹配、异步队列、防重复、错误隔离（try/catch）、销毁清理 `_listeners` 防内存泄漏。

### 8. 深拷贝边界
- 需按类型走：原始值直接返回；`Object`/`Array` 递归；`Date`/`RegExp`/`Map`/`Set` 重建；`Symbol`/函数 选择拷贝引用或保留。
- 用 `WeakMap` 记录已拷贝对象以**解决循环引用**。
- 局限对比：`JSON.parse(JSON.stringify())` 会丢函数/undefined/Symbol、Date 变字符串、循环引用报错、不支持 BigInt 等。

### 9. 异步编程演进
- 回调（回调地狱）→ Promise（链式、错误捕获）→ Generator（手动 next）→ async/await（语义化同步写法）。
- 各阶段权衡：可读性、错误处理、取消能力、并发控制。

### 10. 微前端 / Monorepo / DDD
- 微前端：将大应用拆成可独立开发/部署的子应用，通过主应用调度（window.applicationCache、沙箱、路由分发），常见 qiankun/single-spa/module federation。
- Monorepo：多个包在单一仓库管理，共享配置/依赖/CI，配合 pnpm workspace、turborepo。
- DDD：以领域为核心建模，聚合、限界上下文、事件驱动，提高复杂业务可维护性。

## 二、架构与设计

### 11. 组件库设计
- 组件划分（基础/业务）、props/事件设计、受控与非受控、样式方案（BEM/CSS-in-JS/原子化）、主题（design token 变量）、国际化、文档与演示（Storybook）、规范（TS 类型、命名）、按需加载与构建发布（ESM/UMD）、单元测试。

### 12. 无状态 Token 刷新机制
- 双 Token：`access_token`（短期）+ `refresh_token`（长期）。
- 拦截 http 401 → 用 refresh_token 换新 access_token → 重放失败请求；并发 401 需用**单例刷新 + 请求队列排队**避免风暴。
- refresh_token 也失效则强制重新登录；可结合滑动过期、指纹校验，Redis 黑名单兜底。

### 13. MVVM
- MVVM：Model（数据）+ View（界面）+ ViewModel（绑定与状态映射）。
- Vue：Mutable + 响应式，数据变更驱动视图，v-model 做双向绑定。
- React：单向数据流，UI = f(state)，通过 setState 触发重渲染，强调不可变状态。
- 两者都用虚拟 DOM 层做视图更新解耦。

### 14. 权限系统设计
- 路由权限：登录后根据角色返回动态路由，`addRoutes`/Vue3 `addRoute` 动态注册。
- 按钮级权限：指令/权限函数（Vue 自定义指令、React 用 component wrapper）按权限码控制显示。
- 数据 + 详情：后端接口校验；前端做展示层控制（权限校验尽量以后端为准）。
- 角色-权限映射（RBAC），本地存 token/权限码，路由守卫统一拦截。

### 15. 状态管理设计取舍
- Vuex：集中式单一状态树 + mutation（可追踪）+ action 异步。
- Pinia：去 mutation、TS 友好、模块化、基于 Composition API。
- Redux：单一 store + reducer 纯函数 + action，单向、可预测、利于调试与测试（配 middleware）。
- 取舍：项目规模、TS、开发者体验、是否需要时间旅行调试、是否服务端状态分离（用 React Query/SWR 缓存）。

### 16. axios 请求层封装
- 实例化：`axios.create({baseURL, timeout})`。
- 请求拦截器：注入 token、加时间戳防缓存、幂等、加载态（队列控制，避免并发 loading 异常）。
- 响应拦截器：统一解包、错误码映射、401 携 refresh 重试、错误提示、取消请求（AbortController/CancelToken）、重试（指数退避）。
- 统一泛型类型，暴露各服务 API。

### 17. 组件通信设计
- 父子：props + 事件回调。
- 跨层级：provide/inject（Context）在组件树内共享。
- 全局：集中状态库（Vuex/Pinia/Redux/Zustand）或事件总线（限制使用，标记来源防内存泄漏）。
- 设计取舍：就近优先、限制全局，明确数据流与可追踪性。

### 18. 可测试架构与 TDD
- 分层依赖注入（DI），纯逻辑与副作用分离（如把 api 注入 service），组件可测（render 测试 + 交互测试）。
- 工具：Vitest/Jest、Testing Library、Playwright（E2E）。
- TDD：先写失败测试 → 实现 → 重构（红-绿-重构），提高回归保障与设计质量。

## 三、性能优化

### 19. 完整性能优化方案
- 加载：资源压缩、CDN、缓存、HTTP/2、拆分 bundle、懒加载、按路由分割、图片优化。
- 渲染：减少重排重绘、骨架屏、SSR/预渲染、关键路径优化。
- 运行：长任务分割（rAF/worker）、虚拟列表、对象池。
- 监控：Lighthouse/Web Vitals（LCP/FID/CLS/TTI），性能预算机制，据此持续迭代。

### 20. 首屏慢排查
- 用 Network 看资源大小/数量/时序，Performance 看加载与渲染阶段，Lighthouse 出报告，web-vitals 埋点。
- 定位：DNS/TCP/排队、大 bundle（分析 tools）、未压缩、同步脚本阻塞、慢接口、图片过大。
- 对策：按需/懒加载、代码分割、SSR、CDN、接口优化、骨架屏。

### 21. 图片优化
- 格式：WebP/AVIF 优于 JPEG/PNG；压缩（tinyPNG/工具）；雪碧图减少请求；base64 小图内联。
- 延迟加载：`loading="lazy"`、IntersectionObserver；响应式 srcset/sizes。
- 存储：CDN 分发、适当尺寸裁剪、Service Worker 缓存。

### 22. 代码分割与懒加载
- 动态 import 拆 chunk，仅路由命中/交互时加载。
- 配合 `React.lazy`/Vue 异步组件、预加载 `prefetch/preload`。
- 避免白屏：首屏关键包放主 chunk，加载期间用骨架屏/loading；拆分粒度要平衡（避免过多小请求）。

### 23. Webpack 打包体积分析
- 用 `webpack-bundle-analyzer`/`BundleAnalyzerPlugin` 查看各 chunk 构成。
- 定位重复依赖、未 tree-shake 的库、体积大的第三方；通过 splitChunks、externals（公有 CDN）、动态导入、减少 polyfill 等方式瘦身。
- 结合 `gzip/brotli` 与缓存策略评估收益。

### 24. 长列表优化与虚拟列表
- 只渲染**可视区**内的行，用占位总高度撑开滚动条，滚动时动态计算起始索引与 translateY 偏移。
- 实现要点：估算每行高度（定高简单，变高用预估+校正）、前后缓冲区（overscan）、惰性缓存位置、防抖。
- 库：react-window/react-virtualized；配合骨架与分页。

### 25. 前端监控体系
- 错误监控：全局捕获 window.onerror、Promise unhandledrejection，采集堆栈、URL、用户信息 → 聚合上报；SourceMap 还原源码定位。
- 性能监控：PerformanceObserver 采集 Web Vitals（LCP/CLS/FID/INP）等指标。
- 埋点：手动埋点（统一上报函数）、无痕/自动埋点（监听点击、路由变化）、可视化埋点平台。
- 上报策略：`navigator.sendBeacon`、图片打点、批量/限流，防阻塞主线程。

## 四、安全

### 26. XSS
- 类型：存储型（存到数据库）、反射型（URL 参数）、DOM 型（前端 JS 直接注入）。
- 危害：盗 cookie/token、篡改页面、钓鱼、敏感信息窃取。
- 防御：**转义输出**（对 <>&"' 编码）、富文本白名单过滤、`CSP`（Content-Security-Policy）、HttpOnly Cookie、避免 `innerHTML`/`eval`、用安全库（DOMPurify）。

### 27. CSRF
- 攻击者伪造跨站请求在受害者已登录状态下提交（利用浏览器自动携带 Cookie），来源是站外。
- 防御：关键操作校验 CSRF token（请求头携带）、`SameSite` Cookie、校验 `Origin/Referer`、二次验证（图形/验证码）。

### 28. 中间人攻击（MITM）
- 攻击者在通信链路中窃听/篡改数据（地址伪造、DNS 劫持、公共 Wi-Fi 欺骗）。
- HTTPS 通过证书验证身份 + 加密防窃听/篡改能有效抵御；前提是没有被植入伪造证书或禁用校验。

### 29. 前端加密、签名、防重放、SQL 注入
- 加密：传输层用 HTTPS；业务敏感字段可用对称/非对称加密（公钥在前端）。
- 签名：追加签名参数，服务端验签保证参数未被篡改。
- 防重放：用**时间戳 + nonce（一次性随机数)**，服务端限时+去重。
- SQL 注入：主要由**后端**处理（参数化查询/预编译），前端注意转义与输入校验，避免拼接。

### 30. 前端敏感信息保护
- 不在前端存储重要秘钥（仅存短期 token，HttpOnly + 短时有效）。
- 代码托管注意 `.env` 不提交、构建注入、子域隔离；日志不打印 token。
- 用 CSP、防 XSS、Referrer Policy、水印，必要时配合后端对敏感接口做频率限制与审计。

## 五、工程与协作

### 31. 棘手 Bug 排查
- 典型方法：先复现 → 缩小范围（二分/最小复现）→ 用 DevTools 断点/Performance/Network → 结合日志与回归测试定位 → 修复并补用例。
- 示例：内存泄漏（重复监听）、竞态（异步旧响应覆盖新响应，需 AbortController 或序列号）、跨端差异。
- 复盘与沉淀到文档，避免复发。

### 32. 代码质量保障
- 规范：ESLint/Prettier/TS 严格模式、Commit 规范（Commitlint）。
- 协作：Code Review、单元测试/覆盖率、CI/CD（流水线：lint → test → build → 部署）。
- 可加：变更审计、PR 模板、知识沉淀、pair programming。

### 33. 低代码/无代码平台
- 通过拖拽、可视化配置生成应用，降低开发门槛。
- 架构：schema 驱动（组件 + 数据源 + 逻辑 JSON）、DSL、运行时渲染引擎、可视化设计器、版本管理与发布。
- 权衡：定制性、可维护性、学习成本 vs 交付效率；通常结合特定领域（表单、报表、后台 CRUD）。

### 34. 前端工程化与构建演进趋势
- 从 Webpack 走向更快、更简单：Vite/ESBuild/Rolldown、原生 ESM、Biome、Turbopack。
- 更多：微前端收敛为模块联邦、产物质量（构建分析与演练）、Monorepo、AI 辅助编码、声明式/低代码、重视性能预算与可观测性。

### 35. 技术选型维度
- 维度：业务匹配度、团队熟练度与学习成本、生态与社区活跃度、长期维护性、性能/体积、可测试性、可扩展性、License/供应商风险、构建体积影响。
- 方法：先 POC 验证关键场景，做横向对比，结合团队实际情况决策并记录理由。

### 36. 浏览器兼容与标准演进
- 兼容要点：特性检测（而非浏览器 UA）、polyfill、`browserslist` + autoprefixer、和后端约定合理的降级。
- 关注标准演进：ES Next（TC39）、Web Components、View Transitions、CSS 容器查询、WebGPU、SES、新 API 的逐步铺开，用 caniuse 评估使用范围。