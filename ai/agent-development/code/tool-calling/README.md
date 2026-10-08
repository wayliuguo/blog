# tool-calling

《Agent 开发》第 2 篇《Tool Calling：让 LLM 直接选择并调用程序能力》的配套演示脚本（零依赖可跑，mock LLM 演示机制）。

## 运行

```bash
npm install
npm run tool-calling   # Tool Schema：Definition ≠ Implementation
npm run tool-closure   # 单轮 Tool Calling 闭环：选工具 → 执行 → 回灌（tool_call_id）→ 二次调用
```

正文里依赖 DeepSeek Key 的真实调用以「示意片段」呈现，不在此处复现。
