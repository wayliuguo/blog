# Vue Router 原理

> 本篇所有 `摘自` 代码块来自配套的可断点实现 `code/vue3/mini-router/lib/`——按 vue-router 源码结构拆分（`shared.js` → `reactivity.js` / `matcher.js` → `history.js` → `router.js` → `index.js`，纯 JS 零依赖，`<script>` 按序加载后经 `window.MiniRouter` 统一使用）。正文每讲一个机制，就落到对应文件的函数上解析一次；交互式 demo 见 `code/vue3/mini-router/demo/demo-router.html`，章节对照与断点建议见篇末「配套代码」。应用层的用法（`createRouter` 配置、守卫怎么写、懒加载）见《Vue 路由与状态》，本篇回答"它内部是怎么做到的"。

## 一、路由在解决什么

单页应用只有一个 HTML，"换页面"其实是**换组件**：URL 变了 → 找到该 URL 对应的组件 → 换掉渲染区里的组件，整个过程不重新加载文档。vue-router 要解决的就是这条链路的三个问题：

1. **URL → 组件**：`/user/42` 该渲染谁？动态参数、嵌套路由怎么表达？（matcher）
2. **URL 怎么变**：改地址栏但不刷新页面，前进/后退还能跟上？（history 抽象）
3. **跳转怎么管**：没登录不让进、跳转前确认、跳转后埋点——在哪个时机拦？（守卫流程）

配套实现里，这三件事各归一个 lib 文件：

```
code/vue3/mini-router/lib/ 内的文件（按依赖顺序加载，index.js 聚合成 window.MiniRouter）
├── shared.js      工具层：normalize 路径规范化 / joinPaths 父子拼接 / query 编解码
│                  ★ 断点：normalize（'/user//42/' → '/user/42'）
├── reactivity.js  问题0：最小 ref + effect，撑起 currentRoute → 视图重跑
│                  ★ 断点：ref 的 set（Object.is 拦重复赋值 + trigger）
├── matcher.js     问题1：路径 → matched 组件链 + params/query
│                  ★ 断点：compilePath（:id → 正则）/ insert（matched 链成形）/ resolve
├── history.js     问题2：URL 在哪 / 怎么改 / 变了通知谁（memory / hash / web 三模式同接口）
│                  ★ 断点：memory 的 push（静默）/ go（fire 通知）
└── router.js      问题3：守卫流程 → 改 URL → 改 currentRoute → 视图 effect 重跑
                   ★ 断点：navigate（守卫主干）/ resolveView（按深度取组件）
```

## 二、matcher：路径怎么变成组件链

### 2.1 routes 配置编译成 record 表

`createRouterMatcher` 把嵌套的 routes 配置**扁平化**成一张 `path → record` 的 Map，每个 record 上带着自己的路径正则与 `matched` 链（祖先 record + 自身）：

> 摘自 `./code/vue3/mini-router/lib/matcher.js`

```js
    /**
     * 递归扁平化：把任意深度的 routeList 登记进 records，同时给每条 record 挂上
     * matched 链（祖先 record + 自身）——嵌套 RouterView 按 depth 取组件就靠它。
     * @param {Array} routeList 当前层的路由配置（顶层传 routes，子层传 route.children）
     * @param {string} [parentPath=''] 父级的完整路径，顶层为空串
     * @param {Array} [parentMatched=[]] 父级的 matched 链，顶层为空数组
     * @returns {void}
     * @example insert([{ path: '/settings', children: [{ path: 'notifications' }] }])
     *          → records 里出现 '/settings'（matched = [settings]）与 '/settings/notifications'（matched = [settings, notifications]）
     */
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

> 摘自 `./code/vue3/mini-router/lib/matcher.js`

```js
/**
 * 把路由路径里的动态段编译成正则与参数名表。
 * 过程：用正则逐个把 '/:xxx' 段替换成捕获组 '/([^/]+)'，同时把参数名按出现顺序
 * 收进 keys；最后包上 ^...$ 并允许一个可选的尾斜杠。
 * 不支持重复参数、通配符（/:pathMatch(.*)*）与可选段（教学省略）。
 * @param {string} path 路由配置里的路径，可含动态段，如 '/user/:id'
 * @returns {{ regex: RegExp, keys: string[] }} 匹配正则与参数名表（顺序与捕获组一一对应）
 * @example compilePath('/user/:id') → { regex: /^\/user\/([^/]+)\/?$/, keys: ['id'] }
 * @example compilePath('/')         → { regex: /^\/\/?$/, keys: [] }
 */
function compilePath(path) {
    // '/user/:id' → { regex: /^\/user\/([^/]+)\/?$/, keys: ['id'] }
    // 不支持重复参数、通配符与可选段（见 README 省略清单）
    const keys = []
    // /\/:([^/]+)/ 逐个匹配「斜杠 + 冒号参数名」，捕获组 1 是参数名本身
    const pattern = path.replace(/\/:([^/]+)/g, (_, key) => {
        keys.push(key)
        // 替换成捕获组：一个动态段 = 一段不以 / 开头的字符
        return '/([^/]+)'
    })
    return { regex: new RegExp(`^${pattern}\\/?$`), keys }
}
```

> 摘自 `./code/vue3/mini-router/lib/matcher.js`

```js
    /**
     * 解析：任意形式的「目标地址」→ 完整路由对象（含 params / query / matched 链）。
     * 过程：拆出裸路径与查询串 → 先查精确表（静态路由一步命中）→ 未命中再逐条跑
     * 正则，把捕获组按 keys 顺序 decodeURIComponent 后填进 params。
     * @param {string|{ path: string, query?: object }} to 地址字符串（可带 ?query）或 { path, query } 对象
     * @returns {{ path: string, fullPath: string, params: Object<string, string>, query: Object<string, string>, name: (string|undefined), meta: object, matched: Array }}
     *   完整路由对象；未匹配任何 record 时 matched 为空数组（RouterView 渲染为空）
     * @example resolve('/user/42?tab=posts') → { path: '/user/42', fullPath: '/user/42?tab=posts', params: { id: '42' }, query: { tab: 'posts' }, name: 'user', matched: [userRecord] }
     * @example resolve('/nope') → { matched: [], ... }（空链）
     */
    function resolve(to) {
        // to 可以是「/user/42?tab=posts」字符串，也可以是 { path, query } 对象
        let rawPath = typeof to === 'string' ? to : to.path
        let rawQuery = typeof to === 'string' ? to.split('?')[1] : objectToQuery(to.query)
        rawPath = rawPath.split('?')[0]

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

        return {
            path: normalize(rawPath),
            fullPath: normalize(rawPath) + (rawQuery ? `?${rawQuery}` : ''),
            params,
            query: parseQuery(rawQuery),
            name: record?.name,
            meta: record?.meta || {},
            matched: record ? record.matched : [], // 未匹配 → 空链，RouterView 渲染为空
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

> 摘自 `./code/vue3/mini-router/lib/matcher.js`

```js
    /**
     * 动态路由：运行时往 record 表里追加一条（权限路由的底层机制）。
     * @param {{ path: string, name?: string, component: *, children?: Array }} route 单条路由配置（可带 children）
     * @returns {void}
     * @example addRoute({ path: '/docs/:slug', component: Docs }) 后 resolve('/docs/mini-router').params → { slug: 'mini-router' }
     */
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

> 摘自 `./code/vue3/mini-router/lib/history.js`

```js
/**
 * 创建 memory 模式的 history：URL 存在内存数组里，不碰地址栏（demo / 测试用）。
 * 过程：维护 stack + index 两个变量模拟浏览器会话历史；push 截断前进分支、
 * replace 原位覆盖、go 移动下标并 fire 通知；push / replace 静默（不通知），
 * 只有 go（前进 / 后退）通过 fire 通知所有 listen 回调。
 * @returns {{ mode: 'memory', location: string, push: Function, replace: Function, go: Function, listen: Function }}
 *   三模式统一接口（location 为 getter，返回当前栈顶地址）
 * @example const h = createMemoryHistory(); h.location → '/'；h.push('/about') 后 h.location → '/about'
 * @example h.push('/user/7'); h.go(-1) → location 回到 '/about'，且 listen 回调被触发一次（push 则不会）
 */
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

> 摘自 `./code/vue3/mini-router/lib/router.js`

```js
/**
 * 创建路由器：组合 matcher 与 history，暴露导航、守卫注册与 currentRoute。
 * 过程：建 matcher；把 resolve(history.location) 的结果作为 currentRoute 初始值；
 * 向 history 注册 listen —— 浏览器前进 / 后退（非程序化跳转）时直接同步
 * currentRoute，不经过守卫；push / replace 则走完整守卫流程 navigate。
 * @param {{ history: { location: string, push: Function, replace: Function, go: Function, listen: Function }, routes: Array }} options
 *   history 是三种模式 history 之一；routes 是嵌套路由配置表
 * @returns {{ currentRoute: { value: object }, resolve: Function, push: Function, replace: Function, back: Function, beforeEach: Function, afterEach: Function, resolveView: Function }}
 *   路由器接口；真实 vue-router 的 install() 还会 provide('router') 并注册
 *   RouterView / RouterLink 组件，本实现以 resolveView 纯函数代替
 * @example const router = createRouter({ history: createMemoryHistory(), routes }) → router.currentRoute.value 即初始路由
 * @example router.push('/about') → 守卫通过后 currentRoute.value.name 变为 'about'，Promise resolve true
 */
function createRouter({ history, routes }) {
    const matcher = createRouterMatcher(routes)
    const currentRoute = ref(matcher.resolve(history.location))

    // 浏览器前进/后退：URL 变了 → 直接同步内部状态，不经过守卫（与真实 vue-router 一致）
    history.listen((loc) => {
        currentRoute.value = matcher.resolve(loc)
    })

    const beforeEachGuards = []
    const afterEachHooks = []

    /**
     * 导航主干：守卫流程 → 改 URL → 改 currentRoute。
     * 过程：resolve 目标 → 与当前路由 fullPath 相同则忽略（重复导航）→ 依次跑
     * 全局 beforeEach、matched 链上每个 record 的 beforeEnter（嵌套路由从外到内）
     * → 全过则先 history[method] 改 URL、再给 currentRoute 赋值（订阅它的视图
     * effect 重跑）→ 最后跑 afterEach（只在成功落地后）。
     * 守卫三种表态：undefined / 无返回值 = 通过；false = 取消（URL 与状态都不动）；
     * 对象 = 重定向（递归 navigate 重新走一遍流程，中间目标不记 afterEach）。
     * @param {string|{ path: string, query?: object }} to 目标地址
     * @param {'push'|'replace'} method 落地时调用的 history 方法名
     * @returns {Promise<boolean>} 成功落地 true；重复导航或被取消 false
     * @example push('/user/7') → Promise resolve true，currentRoute.value.params = { id: '7' }
     * @example push 与当前路由相同的地址 → Promise resolve false，视图 effect 不重跑
     * @example beforeEach 返回 { path: '/login' } → 递归导航到 /login，最终只记一次 afterEach
     */
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

    /**
     * RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）。
     * @param {number} [depth=0] RouterView 的嵌套深度：0 = 最外层，1 = 它内部的子 RouterView
     * @returns {*|null} 该深度的组件定义；matched 链没有这一层（未匹配或超出深度）时为 null
     * @example matched = [Settings, Notifications] 时 resolveView(0) → Settings 组件、resolveView(1) → Notifications 组件
     * @example matched = []（未匹配）时 resolveView(0) → null（视图渲染为空）
     */
    // RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）
    function resolveView(depth = 0) {
        return currentRoute.value.matched[depth]?.component ?? null
    }

    return {
        currentRoute,
        resolve: (to) => matcher.resolve(to),
        push: (to) => navigate(to, 'push'),
        replace: (to) => navigate(to, 'replace'),
        back: () => history.go(-1),
        beforeEach: (fn) => beforeEachGuards.push(fn),
        afterEach: (fn) => afterEachHooks.push(fn),
        resolveView,
        // 真实 vue-router 的 install() 在这里 provide('router') 并注册 RouterView / RouterLink，
        // 见 README「与真实库的差距」
    }
}
```

注意这条与三.2 呼应：**前进/后退不经过守卫**——用户按返回键是"回到已确认过的路由"，重新拦一遍反而违反直觉。

### 4.2 守卫流程

`navigate` 是路由器的主干，守卫按"全局 → 记录级"的顺序执行，每种守卫都有三种表态：通过（返回 undefined）、取消（返回 false）、重定向（返回新地址，递归重新走一遍流程）：

> 摘自 `./code/vue3/mini-router/lib/router.js`

```js
    /**
     * 导航主干：守卫流程 → 改 URL → 改 currentRoute。
     * 过程：resolve 目标 → 与当前路由 fullPath 相同则忽略（重复导航）→ 依次跑
     * 全局 beforeEach、matched 链上每个 record 的 beforeEnter（嵌套路由从外到内）
     * → 全过则先 history[method] 改 URL、再给 currentRoute 赋值（订阅它的视图
     * effect 重跑）→ 最后跑 afterEach（只在成功落地后）。
     * 守卫三种表态：undefined / 无返回值 = 通过；false = 取消（URL 与状态都不动）；
     * 对象 = 重定向（递归 navigate 重新走一遍流程，中间目标不记 afterEach）。
     * @param {string|{ path: string, query?: object }} to 目标地址
     * @param {'push'|'replace'} method 落地时调用的 history 方法名
     * @returns {Promise<boolean>} 成功落地 true；重复导航或被取消 false
     * @example push('/user/7') → Promise resolve true，currentRoute.value.params = { id: '7' }
     * @example push 与当前路由相同的地址 → Promise resolve false，视图 effect 不重跑
     * @example beforeEach 返回 { path: '/login' } → 递归导航到 /login，最终只记一次 afterEach
     */
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

> 摘自 `./code/vue3/mini-router/lib/router.js`

```js
    /**
     * RouterView 的选择逻辑：按渲染深度取 matched 链上的组件（真实渲染交给宿主框架）。
     * @param {number} [depth=0] RouterView 的嵌套深度：0 = 最外层，1 = 它内部的子 RouterView
     * @returns {*|null} 该深度的组件定义；matched 链没有这一层（未匹配或超出深度）时为 null
     * @example matched = [Settings, Notifications] 时 resolveView(0) → Settings 组件、resolveView(1) → Notifications 组件
     * @example matched = []（未匹配）时 resolveView(0) → null（视图渲染为空）
     */
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

本篇配套在 `./code/vue3/` 下分成两层：`mini-router/lib/` 是按 vue-router 源码结构拆分的纯 JS 实现（零依赖、`<script>` 按序加载，全局暴露 `window.MiniRouter`，文件头注释标了覆盖机制与建议断点），`mini-router/demo/` 是交互式页面（浏览器直接打开或起静态服务器访问，`F12 → Sources` 可随时断点）。

| 文件 | 内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-router/lib/shared.js` | 路径规范化 `normalize` / 父子拼接 `joinPaths`、query 解析 `parseQuery` / 序列化 `objectToQuery` | 2.1 · 2.2 |
| `./code/vue3/mini-router/lib/reactivity.js` | 最小 `ref` + `effect` + `track` / `trigger`（撑起 currentRoute → 视图重跑） | 4.1 · 4.3 |
| `./code/vue3/mini-router/lib/matcher.js` | `compilePath`（:id → 正则）/ 嵌套路由扁平化（matched 链）/ `resolve` / `addRoute` | 二、matcher |
| `./code/vue3/mini-router/lib/history.js` | memory / hash / web 三模式统一接口 | 三、history 抽象 |
| `./code/vue3/mini-router/lib/router.js` | `createRouter`：守卫流程 → 改 URL → 改 `currentRoute` / `resolveView` | 四、路由器主体 |
| `./code/vue3/mini-router/lib/index.js` | `window.MiniRouter` 聚合入口（无逻辑） | 全篇入口 |
| `./code/vue3/mini-router/demo/demo-router.html` | 交互式 demo：matcher 面板（resolve / addRoute）、路由器主体面板（push / back / 视图重跑计数）、守卫三场景面板 | 全篇 |

demo 的三个面板分别对应原单文件版的 3 个控制台 demo（matcher / 路由器主体 / 守卫流程），每个面板自带断点提示条（lib 文件 → 函数名 → 断住看什么 → 放行后发生什么），页面顶部有一条全链路断点导览。

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[Vue3 状态管理原理与实现](./Vue3%20状态管理原理与实现.md)
- 应用层用法：[Vue 路由与状态](./Vue%20路由与状态.md)
