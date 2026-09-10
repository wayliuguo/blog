# PWA 渐进式网页应用（入门→进阶→实战→最小实现原理）

> 级别：中级
> 本文按本书主线四层推进：入门理解 PWA 三要素与 HTTPS、进阶掌握 Service Worker 生命周期与缓存策略、实战落地离线、安装与推送通知、最小实现到 `code/frontend/18-emerging` 用 `pwa-sw.html` 亲测 SW 注册与生命周期。所有原理自足可懂，localhost 即可本地验证。

渐进式网页应用（Progressive Web App，PWA）是一套让网页拥有"原生 App 体验"的技术组合：离线可用、可安装到桌面、可推送通知。它不是一个新的框架，而是由 Service Worker、Web App Manifest、HTTPS 等标准能力叠加而成的实践方案。本文围绕 PWA 核心三要素、Service Worker 生命周期与缓存策略、离线与安装、推送通知、与原生 App 的对比及安全权限展开。

## 一、PWA 核心三要素

PWA 并不是单一的 API，而是一组技术栈。业界常归结为三根支柱：**Service Worker、Web App Manifest、HTTPS**。

### 1. 三大要素总览

| 要素 | 作用 | 关键技术 |
| ---- | ---- | ---- |
| Service Worker | 网络代理，控制缓存与离线 | fetch/cache/MessageChannel |
| Manifest | 让应用"可安装"并定义图标、名称、主题色 | webmanifest JSON |
| HTTPS | 保证安全性与 Service Worker 可用前提 | 证书、localhost 豁免 |

### 2. 为什么要 HTTPS

- Service Worker 拥有拦截请求、修改响应的能力，等同中间人攻击能力，因此**必须是受信来源**。
- 现代浏览器仅在 `https://`（或 `localhost`）下允许注册 SW。
- 服务端开启 HTTPS 之外，还需要正确设置 CORS，以便 SW 请求跨域资源。

## 二、Service Worker 生命周期与缓存策略

### 1. 什么是 Service Worker

Service Worker 是运行在主线程之外的**独立 Web Worker**，管理页面的网络请求与缓存。它不阻塞页面，页面崩溃后其生命周期仍可被手动触发。

```
浏览器 ──注册──▶ install 事件(预缓存) ──▶ activated 事件(清理旧缓存)
                                              │
                    页面请求 ──▶ 命中 fetch 事件 === 从缓存/网络返回
```

### 2. 注册与生命周期钩子

```js
// main.js —— 页面侧注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('注册成功', reg.scope))
      .catch(console.error);
  });
}
```

```js
// sw.js —— Service Worker 侧
const CACHE_NAME = 'my-app-v1';
const ASSETS = ['/', '/index.html', '/app.js', '/style.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // 立即激活，不等旧版本卸载
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(handleFetch(e));
});
```

### 3. 生命周期状态流转

| 状态 | 说明 | 触发事件 |
| ---- | ---- | ---- |
| installing | 首次安装，进行预缓存 | install |
| waiting | 等待被接管 / 旧版本清理 | 无 |
| activating | 激活中，清理旧缓存 | activate |
| activated | 正式接管控制页面 | fetch 开始拦截 |

> `skipWaiting()` 与 `clients.claim()` 用于打破新版本"等待旧页面"的默认行为，实现平滑更新。

### 4. 常见缓存策略对比

| 策略 | 读取顺序 | 适用场景 | 优点 / 缺点 |
| ---- | ---- | ---- | ---- |
| Cache First | 缓存→网络 | 静态资源、图片 | 快，但更新滞后 |
| Network First | 网络→缓存 | 需要新鲜度的 API | 数据新，弱网慢 |
| Stale-While-Revalidate | 缓存→网络并后台更新 | 列表、壳 | 快且渐次更新 |
| Network Only | 仅网络 | 实时性强、需登录 | 无法离线 |
| Cache Only | 仅缓存 | 完全离线资源 | 更新需改 SW |

```js
// Stale-While-Revalidate 实现
async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const network = fetch(req).then((resp) => {
    if (resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, clone));
    }
    return resp;
  });
  return cached || network;
}
```

## 三、离线能力与安装

### 1. 离线能力如何达成

离线 = Service Worker 预缓存 + 请求拦截 + 兜底页面。当断网时，SW 从 `caches` 返回预存资源，配合一个 `offline.html` 作为兜底：

```js
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }
  // 其他资源按缓存策略处理
});
```

### 2. Manifest：让应用可安装

```json
{
  "name": "我的待办",
  "short_name": "待办",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

在 HTML 中引入：

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#4f46e5" />
```

### 3. 触发安装提示（beforeinstallprompt）

```js
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();           // 阻止默认最小化提示条
  deferredPrompt = e;           // 保存，稍后手动弹
  showInstallButton();          // 显示自定义「安装」按钮
});

async function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();            // 弹出原生安装框
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
}
```

### 4. 安装判定条件

- 有 Service Worker 且能控制页面
- 有 Manifest（含 name、icons、start_url、display）
- 通过 HTTPS 访问
- （移动端）用户已访问过并满足交互阈值（Chrome 会触发 `beforeinstallprompt`）

## 四、推送通知

### 1. 架构：Web Push + 订阅

推送通知由三部分组成：**浏览器订阅生成 push 订阅对象 → 服务端通过 Push Service 下发消息 → SW 收到后展示 Notification**。

```
浏览器 ─订阅─▶ 生成 subscription(含 endpoint/p256dh/auth)
                      ▼
服务端 ─保存 endpoint─ ▶ 调用 Push Service(如 FCM)─▶ 浏览器 SW push 事件 ─▶ 显示通知
```

### 2. 订阅并发送推送

```js
// 订阅
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});
// sub 内容应 POST 给服务端保存
```

```js
// SW 中接收并展示
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: '新消息' };
  e.waitUntil(
    self.registration.showNotification(data.title, { body: data.body })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/')); // 点击跳转
});
```

### 3. 关键说明

- 需要 **VAPID** 密钥对来鉴权 Web Push 服务。
- 通知展示只能在 **Service Worker** 中完成（即使用户关闭页面也可靠）。
- `userVisibleOnly: true` 是强制项，防止不可见推送被滥用。

## 五、与原生 App 对比

### 1. PWA vs 原生 App

| 维度 | PWA | 原生 App |
| ---- | ---- | ---- |
| 安装 | 一键加到主屏，无应用商店 | 需应用商店分发 |
| 离线 | Service Worker 缓存 | 完整本地能力 |
| 能力访问 | 受限于 Web 标准（部分硬件不可用） | 全部系统 API |
| 更新 | 后台自动更新 | 需要用户升级 |
| 分发成本 | 一个 URL 即可 | 双平台 + 审核 |
| 性能 | 中小应用可接受 | 极致流畅 |
| 兼容 | 依赖浏览器 | 依赖系统版本 |

### 2. 适用判断

PWA 更适合**内容型、工具型、轻交互**的产品（新闻、电商、文档、待办）。重度性能或深度硬件需求（游戏、AR、蓝牙外设）仍优先原生或跨端框架。

### 3. 小程序/跨端的关系

PWA、小程序、React Native 从不同角度扩展"网页能力"。PWA 强调**标准化 Web 能力**，小程序强调**平台内闭环**。它们不是替代关系，而是针对不同分发渠道的选择。

## 六、权限与安全

### 1. 权限模型

| 能力 | 是否需要权限 | 触发方式 |
| ---- | ---- | ---- |
| 推送通知 | 是 | 用户点击允许后 |
| 离线缓存 | 否 | SW 自动 |
| 添加到主屏 | 否 | 用户主动 |

与原生 App 相比，Web 权限**临用临问**，即使用户首次拒绝，Chrome 等浏览器仍允许通过交互重新申请，不会永久封禁，体验相对友好。

### 2. 安全要点

- 一切建立在 HTTPS 之上。
- SW 篡改响应的能力意味着**存储与请求必须校验来源**。
- `Cache-Control`、`Service-Worker-Allowed` 头要配置正确。
- 敏感数据不要写入 SW 缓存或 IndexedDB 明文存储。

## 最小实现：用 Demo 验证原理

到 `code/frontend/18-emerging` 启动后打开 `pwa-sw.html`：点击按钮注册同目录的精简 `sw.js`，页面会给出 `install → activate → fetch` 的注册结果与当前生命周期状态，并看到四种缓存策略对照表，还能一键注销观察变化。

> 原理一句话：SW 是运行在主线程之外的网络代理，`install` 预缓存、`activate` 接管页面、`fetch` 走缓存策略，这正是"离线可用、接近原生"的最小形态。

## 面试衔接

本节对应 `90-附录-面试体系` 的「游戏与新兴方向（129-135）」板块：PWA 是什么、Service Worker 如何实现离线缓存及其生命周期、缓存策略对比。做真题自测后，进入下一节 `03-AI前端-LLM交互页面`。