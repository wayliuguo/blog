# chat-ui — 流式对话 UI 最小实现（AI 前端工程 · LLM 应用前端形态篇实战）

零依赖 Node + 原生浏览器页。**优先真实 DeepSeek**：把 key 写进本目录 `.env`（格式见 `.env.example`，变量名 `DEEPSEEK_API_KEY`），服务端转发 `api.deepseek.com` 的流式接口；没有 key 自动回退本地 mock（逐 token 推固定回复，含代码块，用于验证半开 fence 守卫）。

## 跑起来

```cmd
cd code\chat-ui
copy .env.example .env   :: 然后把 DEEPSEEK_API_KEY= 后面粘上真实 key（留空则 mock）
npm start                :: http://127.0.0.1:3121
```

无 npm 依赖，`npm start` 即 `node server.cjs`。端口可 `set PORT=xxxx` 覆盖。

## 实验 ↔ 篇目对照表

| 实验点 | 代码位置 | 对应篇目小节 |
| --- | --- | --- |
| SSE 转发与透传（服务端） | `server.cjs` deepseekStream | LLM 应用前端形态 · 传输选型 |
| fetch + ReadableStream 手工消费 SSE（POST + 可中断） | `public/index.html` send() | 同上 |
| 换行分帧解析器（残行留 buffer、[DONE] 独立终止） | `public/index.html` reader 循环 | SSE 解析器 |
| 半开代码块守卫（fence 奇偶性） | `public/index.html` createFenceGuard | 流式渲染 |
| rAF 合帧渲染 | `public/index.html` scheduleRender | 流式渲染 |
| AbortController 中断保留已收内容 | 停止按钮 | 中断与重试 |
| mock 流（无 key 兜底） | `server.cjs` mockStream | — |

## 验证记录（2026-10-14）

- 真实模式：key 就位后 `npm start` 起 3121，curl POST /api/chat 收到真实 DeepSeek SSE 流；headless Chrome 打开 `?q=…` 自动发送，流式收全，DOM 最终文本完整。
