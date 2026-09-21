# Hybrid 与 WebView 深度优化

同一个 H5 页面，浏览器里打开很快，嵌进 App 里却白屏一秒起步——慢的不是页面，是**页面打开前的三笔账**：容器创建、网络往返、首屏渲染。这一篇把白屏时间线拆开，用 `cross-lab/webview.cjs` 的探针逐笔对账：预热把容器成本挪到空闲期，离线包把网络请求拦截在本地，预渲染把首屏提前到页面打开之前。

## 一、白屏时间线：点下按钮到首屏可见

> 示意片段（无配套脚本）

```
点击入口 ──► 创建 WebView 容器 ──► 加载 HTML ──► 拉取静态资源 ──► 执行 JS ──► 请求接口数据 ──► 渲染首屏
            ├──── 容器成本 ────┤ ├────────────── 网络成本 ──────────────┤ ├── 渲染成本 ──┤
            （冷启动 200~500ms）  （DNS/TCP/TLS + HTML + JS/CSS + API）    （解析 + 布局 + 绘制）
```

三段成本对应三件武器，且**互相独立、可叠加**：

| 成本段 | 典型耗时 | 优化手段 |
| --- | --- | --- |
| 容器创建 | 200~500ms（冷启动） | 容器预热 / 复用池 |
| 网络往返 | 数百 ms~数 s（弱网更糟） | 离线包 / 接口预取 |
| 首屏渲染 | 100~300ms | 预渲染 / 壳直出 |

## 二、容器预热：把创建成本挪到空闲期

WebView 冷启动要在 Native 侧完成一整套初始化：内核进程拉起、JSBridge 注入、壳页面加载。这些工作与用户要看的业务页面毫无关系，却占掉白屏期的大头。预热池的思路是**在 App 空闲时（启动完成后、用户点击前）就把容器造好**，点击瞬间直接取用：

> 摘自 `./code/cross-lab/webview.cjs`

```js
// 冷启动一个容器要付三笔成本（此处用确定性计数模拟真实毫秒）：
// 进程/内核初始化(2) + bridge 注入(1) + 壳 HTML 加载(1) = 4 个成本单位
function createWebView() {
  units += 2 // 进程与内核初始化
  const wv = { ready: false, url: null }
  units += 1 // 注入 JSBridge
  units += 1 // 加载壳 HTML
  wv.ready = true
  alive++
  return wv
}

// 预热池：App 启动后在空闲期预创建容器，用户点击时直接取用
class WebViewPool {
  constructor(size) {
    this.idle = Array.from({ length: size }, () => createWebView())
    this.reuse = 0
  }
  acquire() {
    if (this.idle.length > 0) { this.reuse++ return this.idle.pop() } // 0 创建成本
    return createWebView() // 池被用光 → 冷启动兜底
  }
  release(wv) { wv.url = null this.idle.push(wv) }
}
```

探针把三种情形都断言了一遍：

> 摘自 `./code/cross-lab/webview.cjs`

```js
const pool = new WebViewPool(2) // 空闲期预创建 2 个 —— 成本在这里付出
const warmCost = units
assert.equal(alive, 2, '预热已产出 2 个就绪容器')
units = 0
const wv = pool.acquire() // 用户点击：直接取用
assert.ok(wv.ready)
assert.equal(units, 0, '命中预热池：0 创建成本')
assert.equal(pool.reuse, 1)
pool.acquire()
units = 0
pool.acquire() // 池已空 → 冷启动兜底
assert.equal(units, 4, '池空后冷启动照常付全部成本')
```

实测（`node ./code/cross-lab/webview.cjs`）：

> 摘自 `./code/cross-lab/webview.cjs`

```js
console.log(`探针一  : 预热付 ${warmCost} 单位 · 取用 0 单位 · 池空冷启动兜底 ✓`)
```

实测输出：预热付 8 单位 · 取用 0 单位 · 池空冷启动兜底。工程上的三个要点：

1. **预热时机**：App 首帧渲染完成后（不能抢启动）+ 网络空闲，用 `postDelay`/空闲回调触发；
2. **池大小**：2~3 个足够，WebView 每个都占独立进程内存（Android 上一个空 WebView 30~50MB），多了反而拖累整机；
3. **复用而非销毁**：页面关闭时 `release` 回池、清空 URL 与 JS 状态，下一个页面直接复用——比「销毁再预热」省一半成本。

## 三、离线包：把网络请求拦截在本地

白屏时间线里最不可控的是网络。离线包的思路：把 H5 页的**静态资源（HTML/JS/CSS/图片）提前打包下发到本地**，容器里拦截请求——URL 命中本地包就直接返回文件，网络请求根本不发生：

> 摘自 `./code/cross-lab/webview.cjs`

```js
// 离线包：URL → 本地文件（内容 + 签名 + 版本），包由服务端下发
function makePackage(version, files) {
  const signed = {}
  for (const [url, body] of Object.entries(files)) {
    signed[url] = { body, hash: sign(body), ver: version }
  }
  return signed
}
// 拦截层：命中且签名校验通过走本地；否则回退在线
function request(pkg, url) {
  const entry = pkg[url]
  if (entry && sign(entry.body) === entry.hash) return { body: entry.body, offline: true }
  return { body: fetchOnline(url), offline: false }
}
```

命中与兜底两条路径都实测过：

> 摘自 `./code/cross-lab/webview.cjs`

```js
const r1 = request(pkg, 'https://app.demo/js/app.js')
assert.equal(r1.offline, true, '离线包命中')
assert.equal(networkHits, 0, '命中不发网络请求')
const r2 = request(pkg, 'https://app.demo/js/miss.js')
assert.equal(r2.offline, false, '未命中回退在线')
```

实测输出：命中 0 网络 · 未命中在线兜底。**离线包必须有在线兜底**——版本未下发、包损坏、URL 没收录，任何一种情况都要能平滑回退在线请求，而不是白屏。

安全性靠**签名校验**：本地包内容一旦被篡改（或下载损坏），签名对不上就拒用：

> 摘自 `./code/cross-lab/webview.cjs`

```js
pkg['https://app.demo/js/app.js'].body = 'evil()' // 篡改内容但不改签名
const r = request(pkg, 'https://app.demo/js/app.js')
assert.equal(r.offline, false, '签名校验失败回退在线')
```

工程落地的三件配套：

1. **拦截点**：Android 用 `shouldInterceptRequest`，iOS 用 `WKURLSchemeHandler`（或自定义 scheme + `NSURLProtocol`）；
2. **版本与差量**：包按版本号管理，服务端下发 diff（差量包通常只有全量的 10%~20%），App 侧合成后校验整体 hash 再切换生效；
3. **推送时机**：启动时静默拉取 + 推送触发强更，保证用户点击前包已在本地。

## 四、预渲染：把首屏提前到「打开之前」

预热解决容器成本、离线包解决静态资源，剩下接口数据与首次渲染。再往前走一步就是**预渲染**：在用户点击前，容器里已经把壳页面加载好、甚至已经请求了首屏接口并完成首次渲染——点击只是把已渲染好的容器「亮」出来。

> 示意片段（无配套脚本）

```
离线包   ：静态资源 0 网络
接口预取 ：点击前预请求首屏 API，结果随容器注入
预渲染   ：壳 HTML + 首屏渲染在后台容器完成，点击时直接展示
```

代价与边界同样明确：预渲染的容器**占着内存与 CPU**，且用户可能永远不点它——所以只对高概率入口做（如首页第一个运营位），并设置超时回收；预取的接口数据要带时效（过期即弃），避免展示了陈旧数据。

配套地，Hybrid 页要建立自己的白屏监控：以容器创建起点为 t0、首屏内容可见（FMP）为终点上报耗时，按「容器 / 网络 / 渲染」三段拆分归因——没有分段数据，优化就是在猜。

## 五、Hybrid 优化清单

| 手段 | 解决的成本段 | 关键约束 |
| --- | --- | --- |
| 容器预热 + 复用池 | 容器创建 | 池 2~3 个；空闲期执行；内存换时间 |
| 离线包 + 差量更新 | 静态资源网络 | 必须在线兜底；签名校验；版本管理 |
| 接口预取 | 接口数据网络 | 数据有时效，过期即弃 |
| 预渲染 | 首次渲染 | 只做高概率入口；超时回收 |
| 白屏分段监控 | 一切优化的前提 | t0 取容器创建起点，分段上报归因 |

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/cross-lab/webview.cjs` | 预热池成本模型 + 离线包命中/兜底/签名拦截 | 二、三 |
| `./code/cross-lab/jsi.cjs` | Bridge 与 JSI 通信模型（跨端框架篇引用） | — |
| `./code/cross-lab/twin.cjs` | 双线程 setData 模拟（跨端框架篇引用） | — |
| `./code/cross-lab/bridge.cjs` | 桥协议 / 回调表 / 批量 / 白名单（JSBridge 篇引用） | — |
| `./code/cross-lab/electron.cjs` | IPC / contextBridge / 更新状态机（Electron 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行五探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[跨端框架原理](./跨端框架原理.md)
- 下一篇：[JSBridge 设计与演进](./JSBridge%20设计与演进.md)
- 参考：[Android `shouldInterceptRequest` 文档](https://developer.android.com/reference/android/webkit/WebViewClient#shouldInterceptRequest(android.webkit.WebView,%20android.webkit.WebResourceRequest)) · [WKURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkurlschemehandler) · [美团 Hybrid 容器建设实践](https://tech.meituan.com/2016/03/14/hybrid-solution.html)
