# Vue Router 原理

> 本篇所有 `摘自` 代码块来自配套的可断点实现 `code/vue3/mini-router.html`（零依赖，浏览器直接打开，F12 断点调试）——正文每讲一个机制，就落到对应源码分区上解析一次；断点建议与 demo 对照见篇末「配套代码」。应用层的用法（`createRouter` 配置、守卫怎么写、懒加载）见《Vue 路由与状态》，本篇回答"它内部是怎么做到的"。

## 一、路由在解决什么

单页应用只有一个 HTML，"换页面"其实是**换组件**：URL 变了 → 找到该 URL 对应的组件 → 换掉渲染区里的组件，整个过程不重新加载文档。vue-router 要解决的就是这条链路的三个问题：

1. **URL → 组件**：`/user/42` 该渲染谁？动态参数、嵌套路由怎么表达？（matcher）
2. **URL 怎么变**：改地址栏但不刷新页面，前进/后退还能跟上？（history 抽象）
3. **跳转怎么管**：没登录不让进、跳转前确认、跳转后埋点——在哪个时机拦？（守卫流程）

配套实现里，这三件事各归一个分区：

```
code/vue3/mini-router.html 内的分区（自上而下）
├── ① reactivity  问题0：最小 ref + effect，撑起 currentRoute → 视图重跑
├── ② matcher     问题1：路径 → matched 组件链 + params/query
├── ③ history     问题2：URL 在哪 / 怎么改 / 变了通知谁（memory / hash / web 三模式同接口）
└── ④ router      问题3：守卫流程 → 改 URL → 改 currentRoute → 视图 effect 重跑
```

## 二、matcher：路径怎么变成组件链

### 2.1 routes 配置编译成 record 表

`createRouterMatcher` 把嵌套的 routes 配置**扁平化**成一张 `path → record` 的 Map，每个 record 上带着自己的路径正则与 `matched` 链（祖先 record + 自身）：

> 摘自 `./code/vue3/mini-router.html`

```js
function insert(routeList, parentPath = '', parentMatched = []) {
    for (const route of routeList) {
        const path = joinPaths(parentPath, route.path)
        const { regex, keys } = compilePath(path)
        const record = {
            path,
            regex,
            keys,
            component: route.component,
            name: route.name,
            meta: route.meta || {},
            beforeEnter: route.beforeEnter,
            matched: [...parentMatched, null], // 占位，下一行补上自身
        }
        record.matched[record.matched.length - 1] = record
        records.set(path, record)
        if (route.children?.length) insert(route.children, path, record.matched)
    }
}
```

`matched` 链在这里成形：子路由的 `matched` 是**父的链再 push 自己**。这条链就是后面嵌套 `RouterView` 渲染的依据——按"渲染深度"取第几层组件。

### 2.2 动态段与 query

动态段在编译期被转成捕获组：`/user/:id` → `/^\/user\/([^/]+)\/?$/` + 参数名表。`resolve` 先查精确表，未命中再逐条跑正则，捕获组填进 `params`：

> 摘自 `./code/vue3/mini-router.html`

```js
function compilePath(path) {
    // '/user/:id' → { regex: /^\/user\/([^/]+)\/?$/, keys: ['id'] }
    const keys = []
    const pattern = path.replace(/\/:([^/]+)/g, (_, key) => {
        keys.push(key)
        return '/([^/]+)'
    })
    return { regex: new RegExp(`^${pattern}\\/?$`), keys }
}
```

> 摘自 `./code/vue3/mini-router.html`

```js
        const exact = records.get(normalize(rawPath))
        let record = exact
        let params = {}
        if (!record) {
            // 精确表未命中 → 逐条正则，捕获动态段参数
            for (const r of records.values()) {
                const m = normalize(rawPath).match(r.regex)
                if (m) {
                    record = r
                    r.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])))
                    break
                }
            }
        }
```

query 直接交给 `URLSearchParams` 解析。实测一条动态路由：

```
resolve("/user/42?tab=posts")
params = { id: '42' } | query = { tab: 'posts' } | name = user
fullPath = /user/42?tab=posts
```

### 2.3 嵌套路由与未匹配

嵌套路由 resolve 出的 `matched` 是一条链，`RouterView` 按深度取组件；未匹配时 `matched` 为空数组，视图渲染为空——这正是"路由配置里没有的路径显示空白/404 组件"的机制：

```
resolve("/settings/notifications")
matched 链 = Settings → Notifications
depth 0 组件（父 RouterView）= Settings
depth 1 组件（子 RouterView）= Notifications

resolve("/nope")
matched = []   <- RouterView 渲染为空
```

### 2.4 动态路由：addRoute

运行时往 record 表里再 `insert` 一条，就是权限路由的底层机制——登录后根据角色"补登记"路由，而不是一开始就全量注册：

> 摘自 `./code/vue3/mini-router.html`

```js
    // 动态路由：运行时追加（权限路由的底层机制）
    function addRoute(route) {
        insert([route])
    }
```

```
addRoute({ path: '/docs/:slug', ... }) 后
resolve("/docs/mini-router") = { slug: 'mini-router' }
```

## 三、history 抽象：三种模式的同一套接口

### 3.1 memory / hash / web 的分工

三种模式的差异只在"URL 存在哪、怎么改"，对外是同一个接口：`location` / `push` / `replace` / `go` / `listen`。路由器只依赖这个接口：

> 摘自 `./code/vue3/mini-router.html`

```js
function createMemoryHistory() {
    let stack = ['/']
    let index = 0
    const listeners = new Set()
    const fire = () => listeners.forEach((fn) => fn(stack[index]))

    return {
        mode: 'memory',
        get location() {
            return stack[index]
        },
        push(loc) {
            stack = stack.slice(0, index + 1) // 中途后退过再 push，截断前进分支（与浏览器行为一致）
            stack.push(loc)
            index++
        },
        replace(loc) {
            stack[index] = loc
        },
        go(delta) {
            const next = index + delta
            if (next < 0 || next >= stack.length) return
            index = next
            fire() // 只有前进/后退通知 router
        },
        listen(fn) {
            listeners.add(fn)
            return () => listeners.delete(fn)
        },
    }
}
```

web 模式把栈换成 History API：`push` 是 `history.pushState`（**不触发 popstate**，所以 router 要自己同步状态），`popstate` 监听负责前进/后退；hash 模式改 `location.hash`，靠 `hashchange` 事件。三种模式选型与应用层对照见《Vue 路由与状态》。

### 3.2 程序化跳转静默，前进后退走监听

一个容易踩混的设计：**push/replace 是程序化跳转，保持静默**——router 在守卫通过后统一同步状态，保证"一次导航视图恰好重跑一次"；`listen` 只为**非程序跳转**的 URL 变化服务（back/forward、popstate、hashchange）。这个约定在四.2 的实测里能数出来。

## 四、路由器主体：守卫流程与视图更新

### 4.1 currentRoute 是唯一状态源

路由器内部只有一个响应式状态 `currentRoute`（一个 ref），存的是 `resolve` 后的完整路由对象（含 `matched` 链）。视图层的 `RouterView` 订阅它——**currentRoute 一变，视图 effect 重跑**，这就是"路由切换 = 组件切换"的全部：

> 摘自 `./code/vue3/mini-router.html`

```js
function createRouter({ history, routes }) {
    const matcher = createRouterMatcher(routes)
    const currentRoute = ref(matcher.resolve(history.location))

    // 浏览器前进/后退：URL 变了 → 直接同步内部状态，不经过守卫（与真实 vue-router 一致）
    history.listen((loc) => {
        currentRoute.value = matcher.resolve(loc)
    })
```

注意这条与三.2 呼应：**前进/后退不经过守卫**——用户按返回键是"回到已确认过的路由"，重新拦一遍反而违反直觉。

### 4.2 守卫流程

`navigate` 是路由器的主干，守卫按"全局 → 记录级"的顺序执行，每种守卫都有三种表态：通过（返回 undefined）、取消（返回 false）、重定向（返回新地址，递归重新走一遍流程）：

> 摘自 `./code/vue3/mini-router.html`

```js
    function navigate(to, method) {
        const target = matcher.resolve(to)
        const from = currentRoute.value
        if (target.fullPath === from.fullPath) return Promise.resolve(false) // 重复导航忽略

        // ① 全局 beforeEach：返回 false 取消、返回对象重定向
        for (const guard of beforeEachGuards) {
            const verdict = guard(target, from)
            if (verdict === false) return Promise.resolve(false)
            if (typeof verdict === 'object') return navigate(verdict, method)
        }
        // ② 路由记录自己的 beforeEnter（嵌套路由从外到内逐层执行）
        for (const record of target.matched) {
            if (typeof record.beforeEnter !== 'function') continue
            const verdict = record.beforeEnter(target, from)
            if (verdict === false) return Promise.resolve(false)
            if (typeof verdict === 'object') return navigate(verdict, method)
        }

        // ③ 守卫全过 → 先改 URL，再改状态：订阅 currentRoute 的视图 effect 重跑
        history[method](target.fullPath)
        currentRoute.value = target

        // ④ afterEach 只在成功导航后调用
        afterEachHooks.forEach((hook) => hook(target, from))
        return Promise.resolve(true)
    }
```

三个时序细节：

- **URL 与状态的更新顺序**：先 `history.push`（改地址栏）再 `currentRoute.value = target`（触发视图）——顺序反过来会出现"地址栏还是旧的、界面已经换了"。
- **取消 = 什么都不动**：返回 false 时 URL 与 `currentRoute` 都保持原样。
- **afterEach 只记"落地"的路由**：重定向链上没走完的中间目标不会有 afterEach。

实测三个场景：

```
---- 场景1：未登录访问 /admin/profile → beforeEach 重定向 ----
  [1] beforeEach / → /admin/profile
      ↳ 未登录，重定向到 /login
  [1] beforeEach / → /login          <- 重定向重新走一遍守卫
  [4] afterEach / → /login           <- 只记最终落地
最终 location = /login

---- 场景2：beforeEach 返回 false → 导航取消 ----
  [1] beforeEach /login → /forbidden
location 是否未变 = true | currentRoute 是否未变 = true

---- 场景3：登录后 → 守卫顺序 beforeEach → beforeEnter → afterEach ----
  [1] beforeEach /login → /admin/profile
  [3] beforeEnter（记录级守卫）
  [4] afterEach /login → /admin/profile
最终 matched = Admin → Profile
```

### 4.3 RouterView 的选择逻辑

`RouterView` 的本质是一个"按渲染深度查 matched 链"的纯函数——第几层 `RouterView` 就取 `matched[depth]` 的组件，渲染交给宿主框架：

> 摘自 `./code/vue3/mini-router.html`

```js
    // RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）
    function resolveView(depth = 0) {
        return currentRoute.value.matched[depth]?.component ?? null
    }
```

配套实现用最小 ref + effect 验证了这条链路——**一次导航，视图恰好重跑一次**：

```
---- 模拟 RouterView：订阅 currentRoute 的 effect ----
初始渲染 = Home | effect 执行次数 = 1

---- push 三次（第三次与当前路由相同）----
location = /about | 视图重跑次数 = 3 / 3 次 push（重复导航被忽略）

---- back 后 ----
back 后 location = /user/7?tab=info | 视图重跑次数 = 4
```

### 4.4 与真实 vue-router 的差距

- **没有 `install()`**：真实 vue-router 在这里 provide、注册 `RouterView` / `RouterLink` 组件；本实现只提供 `resolveView` 纯函数
- **没有组件内守卫**：`beforeRouteUpdate` / `beforeRouteLeave` 是"在 matched 链上再多挂两类钩子按序执行"
- **没有异步组件解析**：懒加载路由在"守卫全过"与"更新状态"之间多一步 resolve
- **matcher 不支持**重复参数、通配符（`/:pathMatch(.*)*`）、可选段；守卫是同步约定，没有 Promise 队列与导航重试

这些都是在同一套骨架上加的一层，核心三件事——**路径怎么匹配、URL 怎么同步、守卫按什么顺序拦**——都在上面的代码里。

## 配套代码

本篇配套是一个自包含的调试入口 `./code/vue3/mini-router.html`：零依赖，浏览器直接打开，F12 断点调试；打开时控制台自动跑完 3 个 demo，页面顶部列了建议断点位置。文件内按分区组织：

| 文件 / 分区 | 内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-router.html` | 自包含调试入口：全部实现 + 3 个控制台 demo，浏览器打开即断点 | 全篇 |
| ↳ ① 最小响应式 | 最小 ref + effect（撑起 currentRoute → 视图重跑） | 4.1 · 4.3 |
| ↳ ② matcher | `compilePath`（:id → 正则）/ 嵌套路由扁平化（matched 链）/ `resolve` / `addRoute` | 二、matcher |
| ↳ ③ history | memory / hash / web 三模式统一接口 | 三、history 抽象 |
| ↳ ④ router | `createRouter`：守卫流程 → 改 URL → 改 `currentRoute` / `resolveView` | 四、路由器主体 |
| ↳ demo 1 | 静态/动态/嵌套路由、未匹配、动态追加 | 二、matcher |
| ↳ demo 2 | 内存栈前进后退、重复导航忽略、视图 effect 重跑计数 | 3.2 · 4.3 |
| ↳ demo 3 | 守卫三场景：重定向、取消、顺序 | 4.2 守卫流程 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[Vue3 状态管理原理与实现](./Vue3%20状态管理原理与实现.md)
- 应用层用法：[Vue 路由与状态](./Vue%20路由与状态.md)
