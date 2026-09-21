# JSBridge 设计与演进

上一篇解决了「容器从哪来、资源从哪来」，这一篇解决容器里最核心的基础设施：**JSBridge**——H5 与 Native 之间那座桥。所有跨端容器（Hybrid 壳、小程序逻辑层与渲染层之间）的本质都是它：一边是 WebView 里的 JS，一边是原生系统能力，桥的通信机制、协议设计与安全边界决定了整个 Hybrid 体系的上限。本篇用 `cross-lab/bridge.cjs` 把桥的四个关键设计逐个实测。

## 一、桥的三代通信机制

> 示意片段（无配套脚本）

```
一代：URL Scheme 拦截    location.href = 'jsbridge://...'，WebView 拦截请求解析
二代：原生注入 API        addJavascriptInterface / WKScriptMessageHandler 直接双向
三代：注入 API + 协议化   统一 postMessage + 调用协议 + 回调表 + 白名单（今天主流）
```

| 代际 | 通信方式 | 主要缺陷 |
| --- | --- | --- |
| 一代：URL Scheme | 伪造请求让 WebView 拦截 | URL 有长度限制；连续调用会**合并排队**丢并发；只能单向 |
| 二代：注入 API | JS 直接调 Native 注入对象 | 老 Android `addJavascriptInterface` 有反射攻击漏洞（可执行任意命令） |
| 三代：协议化 | 注入对象收发消息，协议与安全层独立设计 | 复杂度最高——但复杂度换来的是可控性 |

三代共同的核心问题没变：**JS 的调用是同步语法，Native 的执行是异步过程**——中间必须有协议把「调用」编码成「消息」，再用回调表把「回复」关联回「调用者」。

## 二、调用协议：把调用编码成一条消息

一代桥的遗产恰恰是今天协议的雏形：把 `{ module, method, params, callbackId }` 编码进一条字符串。`encodeURIComponent` 保证 JSON 能安全放进 URL 参数：

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

编解码必须**严格对称**——探针里 `encodeCall` 产出的 URL 经 `decodeCall` 还原后与原始调用逐字段相等。协议设计的三条实践军规：

1. **带命名空间**：`module/method` 两级，避免几百个 API 平铺在一个对象上（也方便按模块做权限）；
2. **带版本或能力位**：老容器遇到新协议字段要能忽略而不是报错；
3. **callbackId 由发起方生成并保证唯一**：它是异步回复的唯一关联凭证。

## 三、回调表：异步回复的关联与清理

Native 执行完如何把结果送回正确的调用者？靠 Native 侧维护一张 **callbackId → callback 的映射表**。这张表有一个容易被忽略的纪律——**回调是一次性的，用后必须即清**：

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

探针验证了两条硬约束：回复送达后表项已清除；**重复触发同一 callbackId 必须报错**——二次触发不是「静默无效」，而是协议被破坏的信号。

## 四、Promise 化与超时兜底

回调风格的桥用起来是嵌套地狱，业务侧普遍包一层 Promise。这一层里藏着桥设计最重要的兜底逻辑：**超时**。Native 侧可能崩溃、可能不回复，没有超时的桥会让回调表只进不出——这正是上一篇泄漏专题里「全局缓存只进不出」的桥上版本：

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

两条路径都实测过（`node ./code/cross-lab/bridge.cjs`）：及时回复的调用 resolve 出结果；超时的调用 reject 出 `bridge timeout`，且**回调表被清空**（`callbacks.size === 0`）。超时时间按 API 类别分级：读配置类几百 ms，支付类可放宽到数十秒。

## 五、批量合并：高频调用的通道经济学

埋点、日志、性能上报这类高频调用，如果每次都独占一次过桥，通道很快拥堵——思路与小程序「同 tick 多次 setData 合并成一帧」完全一致：**先入队，统一 flush**：

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

实测：同 tick 三次调用合并成一条消息；空队列 flush 不产生空消息。工程上再叠加两层：**队列长度阈值**（满 N 条不等 tick 立即 flush）与**页面隐藏时机**（`visibilitychange` 时强制 flush，防丢尾部数据）。

## 六、安全：白名单是桥的第一道门

桥是原生能力对 WebView 的授权通道——**谁能过桥**比「怎么过桥」更重要：

> 摘自 `./code/cross-lab/bridge.cjs`

```js
// H5 → Native：先校验 origin 白名单，再进队列
postMessage(origin, module, method, params) {
  if (!this.allowOrigins.includes(origin)) return { ok: false, reason: 'origin denied' }
  this.queue.push({ module, method, params, id: this.nextId++ })
  return { ok: true }
}
```

实测：白名单 origin 正常通过，`https://evil.example` 的调用被拒。完整的桥安全清单还有四条：

1. **域名白名单**按模块细分（支付类 API 只允许收银台域名）；
2. **参数校验**在 Native 侧重做——不信任 WebView 传来的任何数据；
3. **敏感 API 二次确认**：支付、登录类调用弹原生确认框，而非静默执行；
4. **注入方式选 postMessage 型**（WKScriptMessageHandler / `@JavascriptInterface` 白名单方法），杜绝老 Android 的反射攻击面。

## 工程含义清单

| 设计点 | 原理（对应实测） |
| --- | --- |
| 协议带命名空间与 callbackId | 异步回复的唯一关联凭证（§二、§三） |
| 回调一次性用后即清 | 重复触发同 id 必须报错（§三） |
| 每个 API 设超时并清理回调表 | 回调表只进不出 = 桥上泄漏（§四） |
| 高频调用入队批量 flush | 同 tick 合并 + 阈值 + 隐藏时强制（§五） |
| Native 侧校验 origin 白名单 | 任意页面可过桥 = 攻击面（§六） |
| 敏感 API 走原生二次确认 | WebView 内 JS 环境不可信（§六） |

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/cross-lab/bridge.cjs` | 协议编解码 / 回调表 / Promise+超时 / 批量 / 白名单 | 二~六 |
| `./code/cross-lab/jsi.cjs` | 通信开销基准（跨端框架篇） | — |
| `./code/cross-lab/twin.cjs` | 双线程 setData（跨端框架篇） | — |
| `./code/cross-lab/webview.cjs` | 预热池 / 离线包（Hybrid 篇） | — |
| `./code/cross-lab/electron.cjs` | IPC / contextBridge / 更新状态机（Electron 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行五探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[Hybrid 与 WebView 深度优化](./Hybrid%20与%20WebView%20深度优化.md)
- 下一篇：[Electron 与桌面端](./Electron%20与桌面端.md)
- 参考：[WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler) · [`addJavascriptInterface` 安全公告](https://developer.android.com/reference/android/webkit/JavascriptInterface) · [JSBridge 实现原理浅析](https://github.com/yanhaijing/jsbridge)
