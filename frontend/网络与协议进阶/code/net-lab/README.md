# net-lab · 网络与协议进阶配套实验台

零依赖，只要有 Node 22 就能跑，不需要 `npm install`、不需要 Docker、不需要外网。

## 怎么跑

```bash
cd frontend/进阶/网络与协议进阶/code/net-lab
npm run list        # 看有哪些场景
npm run http2       # HTTP/2 多路复用与队头阻塞
npm run cache       # 缓存决策
npm run retry       # 重试、超时、重试风暴、幂等
npm run security    # SRI、CSP 判定、安全响应头
npm run all         # 一次跑完
```

场景脚本自己起临时服务器（端口用 0 让系统分配），跑完自动退出，不会和 `npm start` 的手动服务抢端口。

手动浏览页面：

```bash
npm start           # http://localhost:5190/site/index.html（端口被占自动 +1）
```

## npm script 与场景对照

| script | 文件 | 做什么 | 篇目 |
| ------ | ---- | ------ | ---- |
| `npm run http2` | `scenarios/http2.mjs` | 6 个 200ms 请求：HTTP/1.1 单连接 / 六连接 / HTTP/2 单连接的耗时对比；慢请求后面的快请求何时完成 | HTTP2 与 HTTP3 |
| `npm run cache` | `scenarios/cache.mjs` | 强缓存 / 协商缓存 / `no-store` 的两次请求对照；RFC 9111 新鲜度判定；swr 三个年龄区间 | CDN 与缓存体系 |
| `npm run retry` | `scenarios/retry.mjs` | 四种重试策略；超时与取消；20 客户端重试风暴的时间分布；幂等键与重复下单 | 网络可靠性与弱网 |
| `npm run security` | `scenarios/security.mjs` | SRI 哈希计算与篡改检测；拿真实 CSP 策略跑判定；安全响应头体检 | 前端安全进阶 |
| `npm start` | `server.js` | 手动浏览 `site/` 下的三个页面，端口 5190 | 全模块 |

## 端点

| 端点 | 响应头 / 行为 | 用途 |
| ---- | ------------- | ---- |
| `/api/slow?ms=200` | 延迟 `ms` 后返回 10 字节 | 多路复用、队头阻塞、超时对照 |
| `/api/cache/immutable/app.js` | `public, max-age=31536000, immutable` | 强缓存 |
| `/api/cache/etag/doc.json` | `no-cache` + ETag，带 `If-None-Match` 回 304 | 协商缓存 |
| `/api/cache/swr/feed.json?age=300` | `max-age=60, stale-while-revalidate=600` | 过期可用 |
| `/api/cache/html` | `no-store` | 完全不缓存 |
| `/api/flaky?key=a&fail=2` | 前 `fail` 次 503 + `Retry-After: 1` | 重试策略 |
| `/api/flaky-order` (POST) | 落库后断连，带 `Idempotency-Key` 时回放上次结果 | 幂等 |
| `/api/order` (POST) | 下单计数 | 幂等对照 |
| `/api/reset` | 清空尝试计数 / 幂等表 / 订单号 | 场景之间隔离 |
| `/site/security.html` | 带 CSP（每次换 nonce）、HSTS、`nosniff` 等 | 安全演示 |

## 页面

| 页面 | 看什么 |
| ---- | ------ |
| `site/index.html` | 目录：页面、端点、命令 |
| `site/cache.html` | 点一下按钮连发两次请求，直接看到状态码与字节数差异；配合 DevTools Network 看「强缓存命中时请求根本不出现」 |
| `site/security.html` | 带 nonce 的内联脚本能跑、没有 nonce 的会被拦（Console 有违规报错）；`vendor.js` 带 `integrity`，改一个字节就会加载失败 |

## 已知边界

- HTTP/2 用的是**明文 h2c**（`http2.createServer`），没走 TLS/ALPN。目的是对比协议行为，与真实线上部署的差异只在协商阶段。
- **HTTP/3 / QUIC 测不了**：本机没有 QUIC 服务端，文档里这一部分只讲原理与取舍，不给实测数字。
- `AbortSignal.timeout` 只取消客户端这一侧的等待，服务端该算完还是算完——这正是需要幂等键的原因，场景里用订单数验证了这一点。
- 缓存场景里的 `fetch` 是普通 HTTP 客户端，不带缓存，所以「第二次请求」反映的是**服务端行为**；浏览器会不会真的发这次请求，由脚本里的 RFC 9111 判定规则给出。
- 重试风暴场景的时间分布依赖本机调度，绝对值有抖动，看的是**无抖动与有抖动的相对差异**。
