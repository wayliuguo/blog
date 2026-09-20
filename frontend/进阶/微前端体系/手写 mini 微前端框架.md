# 手写 mini 微前端框架

前四篇讲了选型、沙箱、通信、加载，本篇把它们**拼成一台能跑的机器**：一个 200 行左右的 mini 微前端框架（`mini-micro`），实现路由命中 → HTML entry 解析 → 沙箱执行子应用代码 → 生命周期调度 → 样式隔离 → 卸载清账 → 预加载。全部零依赖，`node run.cjs` 四个场景自检全绿——每一行都能在本地复现。

## 一、总体设计

> 示意片段（无配套脚本）

```
run.cjs（模拟浏览器：假 CDN + 共享全局 + 日志）
        │ register({ name, entry, activeRule, props })
        ▼
scheduler.cjs（MiniMicro 调度器）
   matchRoute 命中 → load(entry) → parseHtmlEntry
        │                                    │
        ▼ scripts                            ▼ styles
   new Function + with(proxy) 执行        scopeStyle 加前缀
        │                                    │
        ▼                                    ▼
   sandbox.cjs（Proxy 沙箱 + 副作用记账）   container.styles
        │
        ▼ bootstrap() → mount(ctx) ⇄ unmount() → cleanup()
```

四个文件各管一层：`sandbox.cjs` 管隔离，`entry.cjs` 管解析与样式，`scheduler.cjs` 管调度，`run.cjs` 用假 CDN 把整机跑起来。

## 二、沙箱：多例 Proxy + 副作用记账

沙箱是第 2 篇的多例方案再加**副作用记账**：`get` 陷阱拦截 `setInterval`/`addEventListener`，调用照常生效但先记一笔；`set` 陷阱保证写入落在自己的 `fakeWindow`：

> 摘自 `./code/mini-micro/sandbox.cjs`

```js
function createAppSandbox(name, sharedGlobal) {
  const fakeWindow = Object.create(sharedGlobal)
  fakeWindow.__MICRO_APP_NAME__ = name
  const sideEffects = { timers: [], listeners: [] }

  const proxy = new Proxy(fakeWindow, {
    get(target, key) {
      // 拦截副作用 API：调用照常生效，但先记一笔账
      if (key === 'setInterval') {
        return (fn, ms) => {
          const id = setInterval(fn, ms)
          sideEffects.timers.push(id)
          return id
        }
      }
      if (key === 'addEventListener') {
        return (type, fn) => {
          sideEffects.listeners.push({ type, fn })
        }
      }
      return target[key]
    },
    set(target, key, value) {
      // 写永远落在自己的 fakeWindow，共享全局不动
      target[key] = value
      return true
    },
  })
```

卸载时 `cleanup` 统一清账：定时器逐个 `clearInterval`，写在沙箱上的属性逐个撤销（只保留应用名标记）：

> 摘自 `./code/mini-micro/sandbox.cjs`

```js
  function cleanup() {
    for (const id of sideEffects.timers) clearInterval(id)
    for (const { type, fn } of sideEffects.listeners) {
      // 真实浏览器里这里是 window.removeEventListener，模拟环境记清理即可
      void type
      void fn
    }
    sideEffects.timers = []
    sideEffects.listeners = []
    // 撤销子应用写在沙箱上的属性，保留应用名标记
    for (const k of Object.keys(fakeWindow)) {
      if (k !== '__MICRO_APP_NAME__') delete fakeWindow[k]
    }
  }
```

## 三、HTML entry 解析与样式隔离

入口 HTML 用正则摘出脚本地址与内联样式，样式再走第 2 篇的 scoped 前缀：

> 摘自 `./code/mini-micro/entry.cjs`

```js
function parseHtmlEntry(html) {
  const scripts = []
  const re = /<script src="([^"]+)"><\/script>/g
  let m
  while ((m = re.exec(html))) scripts.push(m[1])
  const styles = []
  const sre = /<style>([\s\S]*?)<\/style>/g
  while ((m = sre.exec(html))) styles.push(m[1])
  return { scripts, styles }
}

function scopeStyle(css, attr) {
  return css.replace(/([^{}]+)\{/g, (raw, sel) => {
    const s = sel.trim()
    if (s.startsWith('@')) return raw        // @media / @keyframes 不加前缀
    return s.split(',').map((p) => `${attr} ${p.trim()}`).join(', ') + ' {'
  })
}
```

## 四、调度器：注册、命中、启动、卸载

调度器持有 url 级缓存（预加载与去重的落点），`start` 把第 2~4 篇的所有机制串起来：

> 摘自 `./code/mini-micro/scheduler.cjs`

```js
  load(url) {
    // 同一个 url 全生命周期只走一次"网络"，命中缓存 0 开销
    if (this.cache.has(url)) return this.cache.get(url)
    this.fetchCount++
    const content = this.fetch(url)
    this.cache.set(url, content)
    return content
  }

  preload(appName) {
    // 预加载：只抓资源不执行，路由命中时全部命中缓存
    const def = this.apps.get(appName)
    const { scripts } = parseHtmlEntry(this.load(def.entry))
    for (const url of scripts) this.load(url)
  }

  start(appName, container) {
    const def = this.apps.get(appName)
    const html = this.load(def.entry)
    const { scripts, styles } = parseHtmlEntry(html)
    const sandbox = createAppSandbox(appName, this.sharedGlobal)
    for (const css of styles) container.styles.push(scopeStyle(css, `[data-app=${appName}]`))
    for (const url of scripts) {
      // 子应用代码在沙箱里执行；with(window) 让裸标识符也走 Proxy（micro-app 同款）
      new Function('window', 'with(window){' + this.load(url) + '}')(sandbox.proxy)
    }
    sandbox.proxy.bootstrap()
    sandbox.proxy.mount({ container, props: def.props || {} })
    this.active = { name: appName, sandbox, container }
    return this.active
  }

  stop() {
    const { name, sandbox } = this.active
    sandbox.proxy.unmount()
    sandbox.cleanup()          // 副作用清账 + 撤销沙箱属性
    this.active = null
    return name
  }
```

注意 `with(window)` 这一行：没有它，子应用代码里的裸标识符（如直接调 `log()`）不会经过 Proxy，会逃逸到真实全局——micro-app 的沙箱正是用 `with(proxyWindow)` 实现这一层的。

## 五、跑起来：四个场景

实验台用字符串模拟子应用源码（真实 JS，稍后被 `new Function` 在沙箱里执行），四个场景覆盖主流程。场景一验证路由匹配与启动顺序、写入落沙箱且不污染共享全局：

> 摘自 `./code/mini-micro/run.cjs`

```js
assert.equal(matchRoute('/orders', '/orders/list/42'), true)
assert.equal(matchRoute('/orders', '/report'), false)
const container = { styles: [] }
const app = micro.start('orders', container)
console.log(logs.slice(-2).join(' | '))
assert.deepEqual(logs.slice(-2), ['orders: bootstrap', 'orders: mount user=li'])
assert.equal(app.sandbox.proxy.__ORDERS__, 'mine')        // 子应用写进了自己的沙箱
assert.ok(!('__ORDERS__' in sharedGlobal))                // 共享全局没被污染
```

场景三验证卸载清账与切换，场景四验证预加载：

> 摘自 `./code/mini-micro/run.cjs`

```js
const timersBefore = app.sandbox.sideEffects.timers.length
assert.equal(timersBefore, 1)      // mount 时申请的定时器记了账
micro.stop()
console.log(logs.slice(-2).join(' | '))
assert.equal(app.sandbox.sideEffects.timers.length, 0)    // 定时器已清
assert.deepEqual(Object.keys(app.sandbox.proxy), ['__MICRO_APP_NAME__'])  // 属性已撤销，仅留应用名
```

> 摘自 `./code/mini-micro/run.cjs`

```js
const before = fresh.fetchCount
fresh.preload('orders')
const afterPreload = fresh.fetchCount
fresh.start('orders', { styles: [] })
const afterStart = fresh.fetchCount
console.log(`preload 抓取 ${afterPreload - before} 次 · start 阶段再抓 ${afterStart - afterPreload} 次`)
assert.ok(afterPreload - before >= 2)      // html + js 已进缓存
assert.equal(afterStart - afterPreload, 0) // 启动零网络
fresh.stop()                               // 清掉 mount 申请的定时器，进程才能正常退出
```

`node run.cjs` 实测输出：

```
场景一 · 路由命中与启动
orders: bootstrap | orders: mount user=li
  ✓ bootstrap→mount 按序调度，写入落沙箱

场景二 · 样式随行与隔离
[data-app=orders] .card { color: red }
  ✓ HTML entry 带出的样式已加应用前缀

场景三 · 卸载清账与切换
orders: mount user=li | orders: unmount
  ✓ unmount→cleanup 清账，切换后新应用干净启动

场景四 · 预加载
preload 抓取 2 次 · start 阶段再抓 0 次
  ✓ 预加载后路由命中零网络开销

mini-micro 全部场景通过 ✓
```

## 六、从 mini 到生产还差什么

> 示意片段（无配套脚本）

```
mini-micro 已实现            生产级框架（qiankun/micro-app）还要补
├── HTML entry 正则解析      →  完整 HTML 解析 + link/style 收集 + 资源路径补全
├── 多例 Proxy 沙箱          →  document/location 代理白名单、跨应用边界逃逸防护
├── 副作用记账清理           →  覆盖 setInterval/fetch劫持/事件委托/定时弹窗全量副作用
├── scoped 样式前缀          →  Shadow DOM 隔离、运行时样式表切换、动态弹层处理
├── 手动 start/stop          →  路由变化自动 mount/unmount、keep-alive 保活
└── url 级缓存预加载         →  预加载优先级策略、MF shared 依赖协商组合
```

最重要的跃迁是**从手动调度到路由驱动**：生产框架监听 popstate/hashchange，把 `start/stop` 变成路由变化后的自动副作用——但内部执行的仍是本篇这几步。

## 配套代码

| 文件 | 作用 | 对应小节 |
|---|---|---|
| `./code/mini-micro/sandbox.cjs` | 多例 Proxy 沙箱 + 副作用记账 + cleanup | 二 |
| `./code/mini-micro/entry.cjs` | HTML entry 解析 + scoped 样式隔离 | 三 |
| `./code/mini-micro/scheduler.cjs` | MiniMicro 调度器：缓存/预加载/启动/卸载 | 四 |
| `./code/mini-micro/run.cjs` | 假 CDN + 四场景自检实验台 | 五 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[资源加载与依赖共享](./资源加载与依赖共享.md)
