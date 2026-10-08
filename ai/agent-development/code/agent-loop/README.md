# agent-loop

《Agent 开发》第 3 篇《Agent Loop：手写会循环的 Agent 运行时》的配套演示脚本（mock LLM 演示循环机制）。

## 运行

```bash
npm install
npm run agent-loop   # 第一版 Agent Loop：while/for、Stop Condition、回填
npm run registry     # Tool Registry：Zod 校验、一源两用、错误即 Observation
```

`agent-tool.ts` 被 `agent-loop.ts` 引用（统一 AgentTool 协议四要素：name / description / schema / execute）。
