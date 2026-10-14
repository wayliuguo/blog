# Hybrid 与 JSBridge

> 本篇由原「Hybrid 与 WebView 深度优化」「JSBridge 设计与演进」两篇合并：容器侧优化与桥协议本就是一体两面——**桥是 Hybrid 的发动机，优化是它的变速箱**。

## 一、白屏时间线：Hybrid 优化的总纲

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

WebView 冷启动要在 Native 侧完成内核进程拉起、JSBridge 注入、壳页面加载——这些与业务页面毫无关系，却占掉白屏期大头。预热池的思路是**App 空闲时把容器造好，点击瞬间直接取用**。探针（`node ./code/cross-lab/webview.cjs`）：

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
        if (this.idle.length > 0) {
            this.reuse++
            return this.idle.pop()
        } // 0 创建成本
        return createWebView() // 池被用光 → 冷启动兜底
    }
    release(wv) {
        wv.url = null
        this.idle.push(wv)
    }
}
```

实测输出：预热付 8 单位 · 取用 0 单位 · 池空冷启动兜底。工程三要点：

1. **预热时机**：App 首帧渲染完成后（不能抢启动）+ 网络空闲；
2. **池大小**：2~3 个足够（Android 上一个空 WebView 占 30~50MB）；
3. **复用而非销毁**：页面关闭 `release` 回池、清空 URL 与 JS 状态，比「销毁再预热」省一半成本。

## 三、离线包：把网络请求拦截在本地

把 H5 静态资源**提前打包下发到本地**，容器里拦截请求——URL 命中本地包直接返回文件，网络请求根本不发生：

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

实测：命中 0 网络 · 未命中在线兜底 · **篡改内容签名对不上时拒用回退**。三条铁律：

1. **离线包必须有在线兜底**——版本未下发、包损坏、URL 没收录都要能平滑回退，而不是白屏；
2. **签名校验**：本地包被篡改或下载损坏，签名对不上就拒用；
3. **差量更新**：服务端下发 diff（通常只有全量的 10%~20%），App 侧合成后校验整体 hash 再切换。

拦截点：Android `shouldInterceptRequest`，iOS `WKURLSchemeHandler`。再往前一步是**预渲染**（点击前壳页面与首屏接口已在后台容器完成）——只对高概率入口做并设超时回收，预取数据带时效。

## 四、JSBridge：桥的三代机制与调用协议

### 4.1 三代通信机制

> 示意片段（无配套脚本）

```
一代：URL Scheme 拦截    location.href = 'jsbridge://...'，WebView 拦截请求解析
二代：原生注入 API        addJavascriptInterface / WKScriptMessageHandler 直接双向
三代：注入 API + 协议化   统一 postMessage + 调用协议 + 回调表 + 白名单（今天主流）
```

| 代际 | 主要缺陷 |
| --- | --- |
| URL Scheme | URL 有长度限制；连续调用合并排队丢并发；只能单向 |
| 注入 API | 老 Android `addJavascriptInterface` 反射攻击漏洞 |
| 协议化 | 复杂度最高——但复杂度换来可控性 |

三代共同的核心问题没变：**JS 的调用是同步语法，Native 的执行是异步过程**——中间必须有协议把「调用」编码成「消息」，再用回调表把「回复」关联回「调用者」。

### 4.2 调用协议：把调用编码成一条消息

> 摘自 `./code/cross-lab/bridge.cjs`

```js
function encodeCall(module, method, params, callbackId) {
    return `jsbridge://${module}/${method}?id=${callbackId}&data=${encodeURIComponent(JSON.stringify(params))}`
}
function decodeCall(url) {
    const m = url.match(/^jsbridge:\/\/(\w+)\/(\w+)\?id=(\d+)&data=(.*)$/)
    assert.ok(m, '协议不合法')
    const [, module, method, id, data] = m
    return { module, method, callbackId: Number(id), params: JSON.parse(decodeURIComponent(data)) }
}
```

编解码**严格对称**——探针里 encode 产出经 decode 还原后与原始调用逐字段相等。协议三军规：`module/method` 两级命名空间；带版本或能力位（老容器忽略新字段而非报错）；callbackId 由发起方生成并保证唯一。

### 4.3 回调表：用后即清 + 超时兜底

Native 侧维护 `callbackId → callback` 映射表，两条纪律缺一不可：

> 摘自 `./code/cross-lab/bridge.cjs`

```js
register(id, cb) { this.callbacks.set(id, cb) }
// Native 执行完回调用一次性回调（用后即清，防重复触发与泄漏）
invokeCallback(id, result) {
    const cb = this.callbacks.get(id)
    assert.ok(cb, '回调必须已注册')
    this.callbacks.delete(id)
    cb(result)
}
```

> 摘自 `./code/cross-lab/bridge.cjs`

```js
return function invoke(module, method, params) {
    return new Promise((resolve, reject) => {
        const id = seq++
        const timer = setTimeout(() => {
            nb.callbacks.delete(id) // 超时清理，防回调表泄漏
            reject(new Error('bridge timeout'))
        }, timeoutMs)
        nb.register(id, result => {
            clearTimeout(timer)
            resolve(result)
        })
        // 真实实现这里把调用发过桥；测试由用例手动触发回复
    })
}
```

实测（`node ./code/cross-lab/bridge.cjs`）：重复触发同一 callbackId **报错**（协议被破坏的信号）；超时调用 reject 且**回调表被清空**（`callbacks.size === 0`）。回调表只进不出 = 桥上泄漏。超时按 API 类别分级：读配置几百 ms，支付类放宽到数十秒。

### 4.4 批量合并与白名单

高频调用（埋点/日志）先入队统一 flush——与小程序「同 tick 多次 setData 合并成一帧」完全同思路：

> 摘自 `./code/cross-lab/bridge.cjs`

```js
nb2.postMessage('https://app.demo', 'log', 'pageview', { page: 'a' })
nb2.postMessage('https://app.demo', 'log', 'click', { id: 'btn' })
nb2.postMessage('https://app.demo', 'log', 'click', { id: 'btn2' })
nb2.flush()
assert.equal(nb2.messages.length, 1, '同 tick 三次调用合并成一条消息')
assert.equal(nb2.messages[0].length, 3)
nb2.flush()
assert.equal(nb2.messages.length, 1, '空队列 flush 不产生空消息')
```

> 摘自 `./code/cross-lab/bridge.cjs`

```js
// H5 → Native：先校验 origin 白名单，再进队列
postMessage(origin, module, method, params) {
    if (!this.allowOrigins.includes(origin)) return { ok: false, reason: 'origin denied' }
    this.queue.push({ module, method, params, id: this.nextId++ })
    return { ok: true }
}
```

实测：同 tick 三次调用合并一条消息；`https://evil.example` 被白名单拒绝。安全清单补全：白名单按模块细分（支付 API 只允许收银台域名）；参数校验 Native 侧重做；敏感 API 弹原生二次确认；注入方式选 postMessage 型，杜绝老 Android 反射攻击面。

## 五、参照系：小程序双线程为什么也疼在通信上

小程序走了第四条路：**逻辑层与渲染层物理分离**（逻辑层独立 JS 引擎，渲染层多个 WebView，Native 转发）。动机是安全管控，代价同样落在通信——过桥数据必须可序列化：

> 摘自 `./code/cross-lab/twin.cjs`

```js
// 渲染层收到的是 flush 出来的「一帧」消息；过桥必须序列化，
// 所以 flush 里做一次 JSON 往返——这正是双线程通信的硬约束。
class NativeBridge {
  constructor() { this.sent = [] }
  flush(pending) {
    if (pending.size === 0) return
    const data = JSON.parse(JSON.stringify(Object.fromEntries(pending)))
    this.sent.push({ from: 'logic', data })
    pending.clear()
  }
}
```

`setData` 两条铁律实测（`node ./code/cross-lab/twin.cjs`）：**同 tick 多次 setData 合并一帧**、同 key 取最后一次；**路径写法只传变化**——`setData({ 'user.name': 'wu' })` 时未变化的 `list` 不通信。这就是「少传数据、只传变化」这条小程序性能军规的由来：每次 setData = 一次序列化 + 一次跨线程转发 + 一次渲染层 diff。

## 六、Hybrid 优化清单与选型边界

| 手段 | 解决的成本段 | 关键约束 |
| --- | --- | --- |
| 容器预热 + 复用池 | 容器创建 | 池 2~3 个；空闲期执行；内存换时间 |
| 离线包 + 差量更新 | 静态资源网络 | 必须在线兜底；签名校验；版本管理 |
| 接口预取 | 接口数据网络 | 数据有时效，过期即弃 |
| 预渲染 | 首次渲染 | 只做高概率入口；超时回收 |
| 白屏分段监控 | 一切优化的前提 | t0 取容器创建起点，按容器/网络/渲染分段上报 |

边界：Hybrid 的体验上限就是 WebView 的上限——重交互页面（复杂手势、长列表、动效）留给 [React Native](./React%20Native.md) / [Flutter](./Flutter.md)；Hybrid 的价值在**成本最低**（一套 Web 代码直接进 App）与**动态化最强**（页面就是 URL，随时换）。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/cross-lab/webview.cjs` | 预热池成本模型 + 离线包命中/兜底/签名拦截 | 二、三 |
| `./code/cross-lab/bridge.cjs` | 协议编解码 / 回调表 / Promise+超时 / 批量 / 白名单 | 四 |
| `./code/cross-lab/twin.cjs` | 双线程 setData 合并 / 增量通信 / 序列化约束 | 五 |
| `./code/cross-lab/jsi.cjs` | 通信模型基准（RN 篇引用） | — |
| `./code/cross-lab/mapper.cjs` | 原生映射器（RN 篇引用） | — |
| `./code/cross-lab/three-trees.cjs` | 三棵树（Flutter 篇引用） | — |
| `./code/cross-lab/electron.cjs` | IPC / contextBridge（Electron 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行七探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[Electron](./Electron.md)
- 参考：[Android `shouldInterceptRequest`](https://developer.android.com/reference/android/webkit/WebViewClient#shouldInterceptRequest(android.webkit.WebView,%20android.webkit.WebResourceRequest)) · [WKURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkurlschemehandler) · [WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler) · [美团 Hybrid 容器建设实践](https://tech.meituan.com/2016/03/14/hybrid-solution.html)
