# 前端网络知识体系重构方案（HTTP 与 HTTPS 篇）

## Context

用户对 `frontend\基础\网络与浏览器\HTTP 与 HTTPS.md` 提出四点不满：开头讲 HTTP"建立在 TCP 之上"但传输层 TCP/UDP 却排在文档末尾（逻辑倒挂）；HTTP/2 的头部压缩(HPACK)只留名词；强/协商缓存没有可运行代码；HTTPS 原理的三大致命问题、对称/非对称加密、TLS 握手只有文字缺过程演示。目标是"清晰的知识体系，知识点不留名词"。

已确认三个约束：
- 配图一律用 **0 依赖 ASCII 图解**（延续现有「> 示意片段」代码框风格，不引入 mermaid/图片资产）
- **分层模型重构进本篇文章内部**（不改文件名、不改导航、不新建独立文档）
- 缓存演示做成**可运行页面 demo**（code/ 下，`npm start` 即可访问）

好处：不破坏现有导航 `frontend.js` 与相关链接，纯单文件重排 + 补两段配套代码。

## 目标章节大纲

| 章 | 标题 | 来源/动作 |
|---|---|---|
| 一 | 网络分层模型与传输层 | **新增**：OSI/TCP-IP 概念 + ASCII 分层图，末尾放"HTTP 在分层中的位置"衔接 |
| 二 | TCP 与 UDP | **前移**（原第八节） |
| 三 | HTTP 基础认识 | 原一节，「特点」并入此处，去掉过长的传输层/HTTPS 重复解释 |
| 四 | 请求方法 | 原二节 |
| 五 | 状态码 | 原三节 |
| 六 | HTTP 缓存 | 原四节，新增配套代码引用 |
| 七 | HTTP 版本演进 | 原五节，**HPACK 头部压缩展开** |
| 八 | HTTPS 原理 | 原六节，**补三大致命问题/加密/TLS 握手过程演示** |
| 九 | DNS 解析流程 | 原七节 |
| 十 | WebSocket | 原九节 |
| 十一 | 同源策略与 CORS | 原十节 |

## 实施要点

### 1. 章节重排（HTTP 与 HTTPS.md）
- 新增「一、网络分层模型与传输层」：用 ASCII 画出 TCP/IP 分层（应用/传输/网络/链路）与 OSI 七层对照，标注 HTTP=TLS=TCP=IP 的位置；末尾用一句"HTTP 只是应用层协议，真正搬运数据的是下层 TCP"承上启下。
- 把原第八节「TCP 与 UDP」整体前移为第二节（对比表、不粘包、选型）。
- 原一节「HTTP 特点」收窄，只保留无状态/请求-响应/明文，明文与 HTTPS 的关系留到第八节再讲。
- 正文末尾「小结」树按新章节号重排顺序。

### 2. HPACK 头部压缩（第七章 HTTP/2 内）——ASCII 展开三个机制
- 静态表省字节：`:method: GET → 索引2 → 1字节`（vs 原文文本 10+ 字节）
- 动态表增量：第一次请求把大 Header（如 UA）新增到动态表索引 62；第二次同连接请求引用该索引 → 头部从 60+ 字节降到 ~7 字节
- 哈夫曼编码：一句带过（高频字符短码），融入动态表一行
- 落点：量级对比"引用索引 1B vs 重发全文"

### 3. HTTPS 原理补过程（第八章）
- 三大致命问题各配 ASCII：窃听（明文被中间人截获）、篡改（100元→10000元）、冒充（假 Bob 冒充）
- 对称 vs 非对称 + 混合加密：一张分段 ASCII（对称同钥、非对称公/私钥、混合=先非对称协商会话钥再对称加密正文）
- TLS 1.2 握手：保留现有序列图，但每步补「关键动作 + 目的」两栏式列表（如 `①ClientHello：发版本与随机数A —— 表明能力，A 参与会话密钥生成`）

### 4. 缓存配套代码
**`code/server.js`**：在 `createServer` 回调顶部、静态文件分流前拦截 `/api/`。用全局计数器 `hits = {maxage, nocache, etag, lastmod}`。四类 `GET /api/resource?mode=X`：
- `maxage` → `Cache-Control: max-age=60`，返回 times 计数（第二次点击不发请求 → 计数不增）
- `nocache` → `Cache-Control: no-cache` + ETag，每次都带条件头协商
- `etag` → `ETag: "v"+n`，`If-None-Match` 相等返回 304 空体，否则 200
- `lastmod` → `Last-Modified`（每请求变化），`If-Modified-Since` 同秒返回 304
- `GET /api/hits` → `Cache-Control: no-store`，返回 hits（页面用计数增量证明是否真正发请求）
统一 `Access-Control-Allow-Origin: *`。

**`code/site/cache-demo.html`**（新建）：仿 `fetch-status.html` 零依赖内联脚本。四个按钮 + 日志 `<pre>`。每按钮：
1. 读 `/api/hits` 记基线 → 2. `fetch('/api/resource?mode=X')` 记 status/times/耗时 → 3. 再读 hits，比较计数增量（maxage 计数不变 = 命中证明；etag/lastmod 连点两下看 200→304）。底部注明"等缓存过期或换 URL 才 revalidate"。

**`code/site/index.html`**：目录列表加一个缓存 demo 的 `<li>` 链接。
**文档「## 配套代码」表**：登记 `cache-demo.html` 与 server.js `/api/resource` 两行，注明运行方式与本篇无 5178 依赖。

### 5. 引言/主线
- 现引言第 2 段"从 HTTP 的基础认识讲起"改写为"先讲网络分层定位 HTTP，再按 传输层→HTTP→HTTPS→DNS→WebSocket 推进"。
- 不动的文件：`总结.md`、`模块总结-核心`（扁平知识点清单不分先后，覆盖点不变即一致）。

## 涉及文件
- `frontend\基础\网络与浏览器\HTTP 与 HTTPS.md`（主要改造）
- `frontend\基础\网络与浏览器\code\server.js`（加缓存端点）
- `frontend\基础\网络与浏览器\code\site\cache-demo.html`（新建）
- `frontend\基础\网络与浏览器\code\site\index.html`（加目录项）

## 验证
1. `cd frontend/基础/网络与浏览器/code && npm start`，打开 `http://localhost:5177/cache-demo.html`，四类策略分别点击，观察日志：maxage 二次点击 count 不增、etag/lastmod 二次连点出现 304。
2. 文档构建无死链：`node node_modules/vitepress/bin/vitepress.js build .`（在 `e:\working\blog` 根部，`$env:NODE_OPTIONS=''`），确认 `HTTP 与 HTTPS` 页正常、无 dead link。
3. 通读改后正文，确认章节顺序、小结、引言三处与大纲一致。