# AI 前端工程 · 配套代码

《frontend/进阶/AI 前端工程》模块的配套代码，一章一个项目、目录名对齐章节主题。

| 篇 | 项目 | 内容 |
| --- | --- | --- |
| LLM 应用前端形态 | `chat-ui/` | 流式对话 UI：SSE 转发 + 换行分帧 + 半开 fence 守卫 + rAF 合帧 + AbortController（端口 3121） |
| AI 与前端工程结合 | `fn-calling/` | Function Calling 接线：工具白名单 schema + 执行循环 + 结构化错误回喂（node 直跑） |
| 端侧推理与 WASM | `wasm-infer/` | wat 手写推理内核 + wabt 编译 + softmax 后处理（node 直跑） |
| （探针） | `ai-lab/` | sse/gen/wasm/perf 四探针 + `run.cjs` 总入口 |

**LLM Key 约定**（同 ai/agent-development）：`chat-ui` 与 `fn-calling` 的 `.env` 写 `DEEPSEEK_API_KEY` 即走真实接口（默认优先）；key 缺失自动回退本地 mock/剧本，不出网可跑。`wasm-infer` 不需要 key。
