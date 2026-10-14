# Nuxt

Nuxt 把 Vue 的 SSR 工程化拆成了三层声明：**页面范式用 `routeRules` 按路径声明、服务端能力用 `server/` 目录承载、取数用 `useFetch` 自动分流**。本篇与 Next.js 篇同一套四层结构、同一个订单中心业务场景，配套实战工程 `code/nuxt-app`（Nuxt 3 混合渲染）与最小实现 `code/mini-nuxt`（手写 Vue SSR + SFC 双遍编译）。

## 一、定位与心智模型迁移

### 1.1 Nuxt 在解决什么：Vue SSR 的整套交付管线

Vue 自己只提供 `createSSRApp` 与 `@vue/server-renderer`——离「能上线的 SSR 应用」还差路由、数据预取、构建双产物、服务端部署这四件事。Nuxt 的价值是把这四件事全部约定化：文件路由、`useAsyncData`/`useFetch`、SSR/CSR 双构建、Nitro 统一服务端。

对 React/Next 背景的读者，反向对照表（与 Next.js 篇 1.1 同一张表的两读法）：

```
| 你已会（React / Next）        | Nuxt 对应物                     | 本质            |
|-------------------------------|---------------------------------|-----------------|
| app/ 目录 + page.tsx          | pages/ 目录 .vue 文件           | 构建期生成路由表|
| 'use client' 显式切客户端     | 默认客户端组件（RSC 是 Next 特有）| 求值位置缺省相反|
| dynamic / revalidate 导出常量 | routeRules 按路径声明           | 渲染范式配置化  |
| Server Action                 | server/api/ 文件即接口          | 服务端写操作    |
| useSearchParams / await params| useRoute() / route.params       | 动态段取参      |
| useState                      | ref / reactive                  | 客户端响应性    |
```

两个**不对应**：① Nuxt 没有 RSC——所有组件默认客户端组件，SSR 只是「服务端先渲染一遍 HTML」，代码包照发，这是与 Next 最本质的架构差异；② Nuxt 的自动导入（composables/、server/utils/、组件、API 全局可用）是 Next 没有的隐式约定，找得到来源才敢依赖。

### 1.2 上手：最小可跑应用

`code/nuxt-app` 与 `code/next-app` 是**同一个订单中心业务的两种框架实现**，方便逐页横向对比。混合渲染的核心声明只有一段 `nuxt.config.ts`：

> 摘自 `./code/nuxt-app/nuxt.config.ts`

```ts
export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-11-01',
  routeRules: {
    // 混合渲染演示：同一份工程里按路径声明渲染模式
    '/client-only': { ssr: false }, // 纯 CSR：不服务端渲染
    '/orders/**': { swr: 10 }, // SWR：等价 ISR，10 秒后台重建
  },
})
```

跑起来（cmd，仓库根）：

```cmd
chcp 65001
cd frontend\进阶\渲染架构\code\nuxt-app
npm install
npm run build
npm run preview
```

`routeRules` 把渲染架构篇对比表里的 CSR / SSR / SWR(ISR) 三种取值变成了**路径级配置**——Next 是「每页一行导出」，Nuxt 是「中心化一张规则表」，粒度相同、组织方式不同，团队按目录自治时后者更好收敛。

## 二、页面与取数：SSR 下的数据流

### 2.1 useFetch：服务端取数、响应随 HTML 下发、客户端不重复请求

> 摘自 `./code/nuxt-app/pages/index.vue`

```vue
<script setup lang="ts">
// 首页：useFetch 在服务端取数（SSR），响应随 HTML 下发，客户端不再重复请求
const { data: summary } = await useFetch('/api/orders/summary')
</script>

<template>
  <main>
    <h1>订单中心（Nuxt）</h1>
    <p>共 {{ summary?.total }} 笔订单，累计 ¥{{ summary?.amount }}</p>
    <ul>
      <li v-for="o in summary?.orders" :key="o.id">
        <NuxtLink :to="`/orders/${o.id}`">#{{ o.id }} {{ o.title }}</NuxtLink>
      </li>
    </ul>
  </main>
</template>
```

`await useFetch(...)` 顶部直接等——这在 Next 里对应 RSC 的 `await fetch`，在传统 Vue SSR 里对应「beforeMounted 前手动预取 + 注水对齐」的整套手工程序。**Nuxt 把「数据先于渲染就位」做成了默认行为**：payload 随 HTML 下发，客户端 hydration 时直接认领，不再发第二次请求。

### 2.2 composables/ 自动导入：抽公共取数逻辑

> 摘自 `./code/nuxt-app/composables/useOrders.ts`

```ts
export function useOrders() {
  return useFetch('/api/orders')
}
```

`composables/` 目录下的导出**免 import 全局可用**，列表页里直接 `const { data } = await useOrders()`。自动导入的收益是少写样板，代价是来源不可见——评审时看到一个函数先确认它在 composables/ 还是组件内部，避免「魔法名」失控。

### 2.3 动态路由取参与 404 处理

> 摘自 `./code/nuxt-app/pages/orders/[id].vue`

```vue
<script setup lang="ts">
// 详情页：useRoute() 自动导入拿动态段参数
const route = useRoute()
const id = route.params.id as string
const { data: order, error } = await useFetch(`/api/orders/${id}`)
</script>

<template>
  <main>
    <template v-if="order">
      <h1>订单 {{ order.id }}（SWR 10s）</h1>
      <p>{{ order.title }} · ¥{{ order.amount }} · {{ order.status }}</p>
    </template>
    <template v-else-if="error">
      <h1>404</h1>
      <p>订单不存在</p>
    </template>
    <NuxtLink to="/orders">返回列表</NuxtLink>
  </main>
</template>
```

取数失败走 `error` 分支渲染 404 视图。注意这与 Next 的 `notFound()` 是两种形态：Nuxt 把「失败态」当数据交给组件，由模板决定怎么呈现。

## 三、服务端能力与混合渲染边界

### 3.1 server/api：文件即接口，与页面同一份工程

> 摘自 `./code/nuxt-app/server/api/orders/[id].get.ts`

```ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const order = getOrder(id!)
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'order not found' })
  }
  return order
})
```

`defineEventHandler` / `getRouterParam` / `createError` 全部自动导入——这是 **Nitro**（Nuxt 的服务端引擎）的统一运行时。写接口的 POST 版本在 `server/api/orders.post.ts`，读校验与创建逻辑；`server/utils/store.ts` 里的订单存储被所有接口共享。**「同一份工程里前后端同构部署」是 Nuxt 的核心卖点**，Next 需要用 route.ts + Server Action 两套形态才能凑齐。

### 3.2 ssr: false 的边界：整页文案都不在 HTML 里

> 摘自 `./code/nuxt-app/pages/client-only.vue`

```vue
<script setup lang="ts">
// 纯 CSR 页：routeRules 里 ssr: false——服务端只发壳，内容全靠客户端渲染
const now = ref('')
onMounted(() => {
  // onMounted 只在浏览器跑：这里故意用 document，服务端渲染会直接报错
  now.value = new Date().toLocaleString()
})
</script>

<template>
  <main>
    <h1>纯 CSR 页（ssr: false）</h1>
    <p>本页 HTML 里没有这段内容，curl 看不到「当前时间」四个字。</p>
    <p>当前时间：{{ now || '（客户端挂载后出现）' }}</p>
  </main>
</template>
```

实测（2026-10-13，生产构建 + `.output` 启动）：

```
GET /api/orders   -> 200，含 1001/机械键盘
GET /             -> 200，HTML 含「订单中心（Nuxt）」（SSR）
GET /orders/1001  -> 200，HTML 含「订单 1001」「机械键盘」（SWR 页首请求回源）
GET /client-only  -> 200，HTML 不含「纯 CSR 页」（ssr:false，只有布局壳）
```

最后一条比预期更彻底：`ssr: false` 下**连页面标题文案都不在 HTML 里**，curl 拿到的只有 `app.vue` 布局壳——「不服务端渲染」不是「服务端少渲染一段」，是整个页面组件都不参与。这正是渲染架构篇「CSR 首屏由网络与解析决定」在框架层的直接体现。

## 四、实战：订单中心与横向对比

### 4.1 实战层补齐：写操作走 Nitro 接口

新建订单（`pages/orders/new.vue`）用 `$fetch` 直调 `server/api/orders.post.ts`，服务端校验失败抛 400、成功返回新 id 后 `navigateTo` 跳详情。完整链路与 next-app 的 Server Action 等价：**表单 → 服务端校验 → 落库 → 跳转**，一个不用手写 API（Next），一个把 API 写在同工程里（Nuxt）。

### 4.2 跑起来验证

生产模式起服务后（cmd）：

```cmd
curl -s http://localhost:3022/api/orders | findstr "1001"
curl -s http://localhost:3022/ | findstr "订单中心"
curl -s http://localhost:3022/client-only | findstr "纯 CSR 页"
```

第三条**应该 findstr 不到任何东西**——这就是 ssr:false 的实测证据，留在终端里比讲十遍概念直观。

## 五、最小实现：mini-nuxt，手写 Vue SSR 与 SFC 双遍编译

Nuxt 拆开是四件事：SFC 编译、文件路由、SSR 渲染、hydration。`code/mini-nuxt` 用 vue + esbuild 全部手写一遍，最核心的是那个 46 行的 esbuild 插件——**它就是 mini 版的 vite vue 插件**。

### 5.1 SFC 双遍编译：server 出 ssrRender，client 出 render

> 摘自 `./code/mini-nuxt/src/vue-plugin.ts`

```ts
export function vuePlugin(mode) {
    return {
        name: 'vue-sfc',
        setup(build) {
            build.onLoad({ filter: /\.vue$/ }, (args) => {
                const source = readFileSync(args.path, 'utf8')
                const { descriptor, errors } = parse(source, { filename: args.path })
                if (errors.length) {
                    return { errors: errors.map((e) => ({ text: String(e) })) }
                }
                // ① script：export default 改名捕获，交给 esbuild 转译掉 TS
                let scriptCode = 'const __default__ = {}'
                if (descriptor.script) {
                    const raw = descriptor.script.content.replace(/export\s+default/, 'const __default__ =')
                    scriptCode = transformSync(raw, { loader: 'ts' }).code
                }
                // ② template：按当前模式编译——server 编出 ssrRender，client 编出 render
                const id = createHash('md5').update(args.path).digest('hex').slice(0, 8)
                const tpl = compileTemplate({
                    source: descriptor.template.content,
                    filename: args.path,
                    id,
                    ssr: mode === 'server',
                    cssVars: [],
                })
                const tplCode = tpl.code.replace(
                    /export (function|const) (ssrRender|render)/,
                    'function $2',
                )
                const binding = mode === 'server' ? 'ssrRender' : 'render'
                // ③ 合成组件：默认导出 + 编译出的渲染函数，交给 Vue 运行时
                const contents = `${scriptCode}\n${tplCode}\nexport default Object.assign(__default__, { ${binding} })\n`
                return { contents, loader: 'js' }
            })
        },
    }
}
```

关键认知一句：**SSR 构建不是「同一份产物跑两端」，是同一个 SFC 编译两遍**——server 遍 `compileTemplate({ ssr: true })` 产出直拼字符串的 `ssrRender`（不建 vdom），client 遍产出标准 `render`（建 vdom + 挂事件）。Nuxt 的双产物构建就是这段逻辑的工业版。

### 5.2 SSR 管线：每请求新建应用实例

> 摘自 `./code/mini-nuxt/src/server-entry.ts`

```ts
export async function renderPage(pathname: string) {
    const matched = matchRoute(routes, pathname)
    if (!matched) return null
    // asyncData 挂在组件对象上（default 导出），不在模块命名空间上
    const comp = matched.page.default
    // 数据先于渲染就位：asyncData 跑完才渲染组件
    const props = comp.asyncData ? await comp.asyncData({ params: matched.params }) : {}
    const app = createSSRApp({ render: () => h(comp, props) })
    const html = await renderToString(app)
    return { html, props }
}
```

三个细节都踩过实坑：① `asyncData` 挂在组件对象（default 导出）上而不是模块命名空间上，取错位置拿到 undefined，页面白屏；② **每请求新建 `createSSRApp`**——应用实例持有状态，跨请求复用会串单；③ `h(comp, props)` 传的 props 要在组件里声明 `props: ['orders']` 才进实例，否则落进 `$attrs`，模板里取不到（实测报 `Property "orders" was accessed during render but is not defined`）。

### 5.3 hydration：createSSRApp 的 mount 先复用再补事件

> 摘自 `./code/mini-nuxt/src/client-entry.ts`

```ts
const matched = matchRoute(routes as any, location.pathname)
if (matched) {
    const props = (window.__PROPS__ ?? {}) as any
    const app = createSSRApp({ render: () => h((matched.page as any).default, props) })
    // 用 createApp 的话 mount 会整棵重建；createSSRApp 的 mount 会先尝试复用已有 DOM
    app.mount('#root')
}
```

Vue 把「SSR 还是 CSR」编码在**创建应用的 API**上：`createApp().mount()` 直接重建，`createSSRApp().mount()` 先尝试复用已有 DOM——与 React 把这个区别编码在 `render`/`hydrateRoot` 两个 API 上异曲同工。注水数据同样走 `window.__PROPS__`。

### 5.4 实测读数与两端对照

```
npm run build  -> routes = , /order/:id
GET /            -> 200，SSR HTML 含「订单中心（Vue SSR）」+ window.__PROPS__，X-Render-Ms: 8.8
GET /order/1001  -> 200，含「订单 1001」「机械键盘」
GET /order/9999  -> 200，页面内渲染 404 视图（props.order = null）
Vue warn         -> 0（两端 props 对齐，无失配告警）
```

与 mini-next 的对照读数：React 的 SSR 字符串用 `<!-- -->` 分隔文本节点，Vue 的用 `<!--[-->`/`<!--]-->` 包住列表段——**两家框架都在为 hydration 对齐埋锚点，只是锚点形态不同**；渲染架构篇「对齐单位是 childNodes 下标」的结论，在两家真实框架里都能找到对应的实现痕迹。

## 六、对比与适用边界

```
| 维度           | Nuxt 3                        | Next.js                      | 纯 Vue SPA             |
|----------------|-------------------------------|------------------------------|------------------------|
| 组件模型       | 默认客户端组件，SSR 全树预渲染| 默认 Server Component        | 默认客户端组件         |
| 渲染范式声明   | routeRules 中心化路径表       | 页面文件内导出常量           | 无（只有 CSR）         |
| 服务端代码     | server/ 目录 + Nitro 运行时   | route.ts / Server Action     | 独立后端               |
| 代码下发量     | 全量（无 RSC）                | 服务端组件代码不下发         | 全量                   |
| 适用           | Vue 团队的内容+交易混合产品   | React 团队同场景             | 后台工作台、壳内页     |
```

选 Nuxt 的时机与 Next 一致：**需要 SEO 或首屏内容性能**。偏向 Nuxt 的信号：团队 Vue 栈、前后端想同工程同部署（Nitro）、想要中心化的渲染规则表；偏向 Next 的信号：页面树深、注水数据占比高（RSC 砍客户端代码）。**Nuxt 没有 RSC 这件事在选型时要当架构差异看**——内容型大站里，服务端组件省下的客户端代码量是真实收益。

**三条边界**：① 自动导入是隐式依赖，评审要核对来源；② `ssr: false` 是整页级开关，只有布局壳，没有「页面内局部 CSR」（那用 `<ClientOnly>` 组件）；③ SWR 规则（`swr: 10`）作用于**页面级**渲染产物，接口本身的缓存要另在 Nitro 层配——别把页面规则误当接口缓存。

## 配套代码

| 路径 | 说明 |
| --- | --- |
| `./code/nuxt-app/nuxt.config.ts` | routeRules 混合渲染声明 |
| `./code/nuxt-app/pages/index.vue` | 首页：useFetch 服务端取数 |
| `./code/nuxt-app/composables/useOrders.ts` | 自动导入的公共取数 |
| `./code/nuxt-app/pages/orders/[id].vue` | 动态路由取参 + 失败态 |
| `./code/nuxt-app/pages/client-only.vue` | ssr:false 纯 CSR 页 |
| `./code/nuxt-app/server/api/orders/[id].get.ts` | Nitro 文件即接口 |
| `./code/nuxt-app/server/api/orders.post.ts` | 服务端写操作 |
| `./code/nuxt-app/server/utils/store.ts` | 订单存储（server/utils 自动导入） |
| `./code/mini-nuxt/src/vue-plugin.ts` | 最小实现：SFC 双遍编译 esbuild 插件 |
| `./code/mini-nuxt/src/server-entry.ts` | 最小实现：SSR 渲染管线 |
| `./code/mini-nuxt/src/client-entry.ts` | 最小实现：createSSRApp hydration |
| `./code/mini-nuxt/build.mjs` | 最小实现：路由表生成 + 双产物构建 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上游概念：[全景](./全景.md)
- React 侧对照：[Next.js](./Next.js.md)
