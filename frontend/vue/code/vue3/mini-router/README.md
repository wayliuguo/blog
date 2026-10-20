# mini-router

vue-router 的同一份最小实现：matcher（动态段 / 嵌套 matched 链）+ history 抽象 + 守卫流程，零依赖、可运行、可计数。

```
matcher（routes → record 表，回答「路径 → 哪些组件」）
    ↓
history 抽象（URL 在哪 / 怎么改 / 变了通知谁，memory-hash-web 三模式同接口）
    ↓
createRouter（守卫流程 → 改 URL → 改 currentRoute → 视图 effect 重跑）
```

目标不是"复刻 vue-router"，而是回答三个能数出来的问题：**路径怎么变成组件链（matched）、跳一次视图重跑几次（恰好 1 次）、守卫按什么顺序拦截（beforeEach → beforeEnter → afterEach）**。

## 运行

```bash
npm run step:matcher  # 静态/动态/嵌套路由如何变成 matched 链 + 参数
npm run step:history  # 内存栈前进后退、重复导航忽略、视图 effect 恰好重跑一次
npm run step:guard    # 守卫三场景：重定向、取消（URL 与状态都不动）、顺序
npm test              # 12 个单测（node:test，零依赖）
```

## 脚本 × 篇目对照

| 命令 | 覆盖现象 | 关键实测 |
| ---- | ---- | ---- |
| `step:matcher` | 动态段捕获、query 解析、嵌套路由的 matched 链、`addRoute` 动态追加 | `/settings/notifications` 的 matched 链 = `Settings → Notifications`；未匹配 matched = `[]` |
| `step:history` | 内存栈 push/back/forward/replace、栈截断、视图 effect 订阅 | 3 次 push（1 次重复）→ 视图恰好重跑 3 次；后退后再 push，前进分支被截断 |
| `step:guard` | 全局 beforeEach、记录级 beforeEnter、afterEach 的顺序与拦截 | 重定向落到 /login 且 afterEach 只记最终落地；返回 false 时 URL 与状态都不动 |
| `npm test` | 上述行为固化成 12 条断言 | 12 passed |

## 目录

```
src/
├── reactivity.js  最小 ref + effect（只为撑起 currentRoute → 视图重跑这根线，完整机制见 ../mini-vue）
├── matcher.js     compilePath（:id → 正则）/ 嵌套路由扁平化（matched 链）/ resolve / addRoute
├── history.js     createMemoryHistory（Node 实测）/ createWebHashHistory / createWebHistory（浏览器）
└── router.js      createRouter：守卫流程 → history[method] → currentRoute 更新 → afterEach / resolveView
steps/             三个可单跑的观察脚本
test/              matcher / router / guard 三份单测
```

## 与真实 vue-router 的差距（有意省略）

- 没有 `install()`：不 provide、不注册真正的 `RouterView` / `RouterLink` 组件，只提供 `resolveView(depth)` 纯函数——「matched 链第几层渲染哪个组件」的**选择逻辑**在这里，真实渲染交给宿主框架
- 没有 `beforeRouteUpdate` / `beforeRouteLeave`（组件内守卫）、异步组件解析、`scrollBehavior`、`keep-alive` 与插槽联动、路由懒加载的加载态
- matcher 不支持重复参数（`/:a/:a`）、通配符（`/:pathMatch(.*)*`）与可选段；query 只读不序列化回 URL
- 守卫是同步约定（返回 false / 对象），没有 Promise 异步守卫队列与导航重试

省略的这些都是在同一套骨架上加的一层：组件内守卫是"在 matched 链上再多挂两类钩子按序执行"，异步组件是"确认后先 resolve 再渲染"，`scrollBehavior` 是"确认后读 savedPosition 滚一下"。核心那三件事——**路径怎么匹配、URL 怎么同步、守卫按什么顺序拦**——都在上面的代码里。

## 已知取舍

- **程序化 push/replace 静默，back/forward 走 listen**：router 在守卫通过后统一同步 `currentRoute`，保证"一次导航视图恰好重跑一次"；只有内存栈的 `go`（浏览器对应 popstate / hashchange）才触发监听同步。
- **hash / web 模式未在 Node 实测**：`location` / `history.pushState` 只存在于浏览器；接口与 memory 一致，行为差异（hashchange 异步触发）已在注释标注。
- **重定向是重新走一遍守卫流程**（`navigate` 递归），与真实 vue-router 的"新导航入队"语义简化为直接递归。
- **`ref` 同值不触发**：`Object.is` 比较的是对象引用，`resolve` 每次返回新对象，因此"回到同一路由"通过 navigate 的 fullPath 判重兜底。
